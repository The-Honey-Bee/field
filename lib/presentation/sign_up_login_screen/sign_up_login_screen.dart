import 'dart:math' as math;
import 'dart:ui';

import 'package:flutter/material.dart';
import 'package:go_router/go_router.dart';
import 'package:supabase_flutter/supabase_flutter.dart';

import '../../routes/app_routes.dart';
import '../../services/supabase_service.dart';
import '../../theme/app_theme.dart';
import '../../widgets/custom_icon_widget.dart';
import './widgets/role_selector_widget.dart';
import './widgets/task_card_cluster_widget.dart';

enum UserRole { fieldStaff, supervisor, manager }

class SignUpLoginScreen extends StatefulWidget {
  const SignUpLoginScreen({super.key});

  @override
  State<SignUpLoginScreen> createState() => _SignUpLoginScreenState();
}

class _SignUpLoginScreenState extends State<SignUpLoginScreen>
    with TickerProviderStateMixin {
  // TODO: Replace with [Riverpod/Bloc] for production
  final _formKey = GlobalKey<FormState>();
  final _employeeIdController = TextEditingController();
  final _pinController = TextEditingController();
  bool _isPinVisible = false;
  bool _isLoading = false;
  final bool _isOffline = false;
  UserRole _selectedRole = UserRole.fieldStaff;
  String? _errorMessage;

  // Real-time validation
  String? _emailError;
  String? _passwordError;
  bool _emailTouched = false;
  bool _passwordTouched = false;

  bool get _isFormValid {
    return _employeeIdController.text.trim().isNotEmpty &&
        _employeeIdController.text.contains('@') &&
        _pinController.text.length >= 4;
  }

  void _validateEmail() {
    final v = _employeeIdController.text;
    if (v.trim().isEmpty) {
      setState(() => _emailError = 'Email is required');
    } else if (!v.contains('@')) {
      setState(() => _emailError = 'Enter a valid email address');
    } else {
      setState(() => _emailError = null);
    }
  }

  void _validatePassword() {
    final v = _pinController.text;
    if (v.isEmpty) {
      setState(() => _passwordError = 'Password is required');
    } else if (v.length < 4) {
      setState(() => _passwordError = 'Password must be at least 4 characters');
    } else {
      setState(() => _passwordError = null);
    }
  }

  late AnimationController _entranceController;
  late Animation<double> _logoFade;
  late Animation<Offset> _formSlide;
  late Animation<double> _formFade;

  @override
  void initState() {
    super.initState();
    _entranceController = AnimationController(
      vsync: this,
      duration: const Duration(milliseconds: 900),
    );
    _logoFade = CurvedAnimation(
      parent: _entranceController,
      curve: const Interval(0.0, 0.5, curve: Curves.easeOutCubic),
    );
    _formSlide = Tween<Offset>(begin: const Offset(0, 0.08), end: Offset.zero)
        .animate(
          CurvedAnimation(
            parent: _entranceController,
            curve: const Interval(0.3, 1.0, curve: Curves.easeOutCubic),
          ),
        );
    _formFade = CurvedAnimation(
      parent: _entranceController,
      curve: const Interval(0.3, 1.0, curve: Curves.easeOutCubic),
    );
    _entranceController.forward();

    // Real-time listeners
    _employeeIdController.addListener(() {
      if (_emailTouched) _validateEmail();
      setState(() {});
    });
    _pinController.addListener(() {
      if (_passwordTouched) _validatePassword();
      setState(() {});
    });
  }

  @override
  void dispose() {
    _entranceController.dispose();
    _employeeIdController.dispose();
    _pinController.dispose();
    super.dispose();
  }

  void _handleLogin() async {
    setState(() {
      _emailTouched = true;
      _passwordTouched = true;
    });
    _validateEmail();
    _validatePassword();

    if (!_isFormValid) return;
    setState(() {
      _isLoading = true;
      _errorMessage = null;
    });
    try {
      final client = SupabaseService.instance.client;
      await client.auth.signInWithPassword(
        email: _employeeIdController.text.trim(),
        password: _pinController.text,
      );
      if (!mounted) return;
      context.go(AppRoutes.homeScreen);
    } on AuthException catch (e) {
      setState(() => _errorMessage = e.message);
    } catch (_) {
      setState(() => _errorMessage = 'Login failed. Please try again.');
    } finally {
      if (mounted) setState(() => _isLoading = false);
    }
  }

  void _autofill(String employeeId, String pin) {
    _employeeIdController.text = employeeId;
    _pinController.text = pin;
    setState(() {});
  }

  @override
  Widget build(BuildContext context) {
    final size = MediaQuery.of(context).size;
    final isTablet = size.width >= 600;

    return Scaffold(
      backgroundColor: AppTheme.backgroundDark,
      body: Stack(
        children: [
          // Background gradient
          Positioned.fill(
            child: Container(
              decoration: const BoxDecoration(
                gradient: RadialGradient(
                  center: Alignment(-0.3, -0.6),
                  radius: 1.2,
                  colors: [Color(0xFF1A3A5C), Color(0xFF0F1923)],
                ),
              ),
            ),
          ),
          // Particle dots decorative
          const Positioned.fill(child: _ParticleBackground()),
          // Main content
          SafeArea(
            child: Center(
              child: SingleChildScrollView(
                padding: EdgeInsets.symmetric(
                  horizontal: isTablet ? 0 : 24,
                  vertical: 24,
                ),
                child: SizedBox(
                  width: isTablet ? 480 : double.infinity,
                  child: Column(
                    crossAxisAlignment: CrossAxisAlignment.stretch,
                    children: [
                      // Offline badge
                      if (_isOffline)
                        Container(
                          margin: const EdgeInsets.only(bottom: 16),
                          padding: const EdgeInsets.symmetric(
                            horizontal: 12,
                            vertical: 8,
                          ),
                          decoration: BoxDecoration(
                            color: AppTheme.warning.withAlpha(38),
                            borderRadius: BorderRadius.circular(8),
                            border: Border.all(
                              color: AppTheme.warning.withAlpha(102),
                            ),
                          ),
                          child: Row(
                            mainAxisSize: MainAxisSize.min,
                            children: [
                              CustomIconWidget(
                                iconName: 'wifi_off',
                                color: AppTheme.warning,
                                size: 16,
                              ),
                              const SizedBox(width: 8),
                              Text(
                                'Working Offline — Data will sync when connected',
                                style: TextStyle(
                                  color: AppTheme.warning,
                                  fontSize: 12,
                                  fontWeight: FontWeight.w500,
                                ),
                              ),
                            ],
                          ),
                        ),
                      // Logo + branding
                      FadeTransition(
                        opacity: _logoFade,
                        child: Column(
                          children: [
                            _ZamZamLogo(),
                            const SizedBox(height: 8),
                            Text(
                              'Zamzam APP',
                              style: TextStyle(
                                fontSize: 26,
                                fontWeight: FontWeight.w700,
                                color: Colors.white,
                                letterSpacing: -0.5,
                              ),
                            ),
                            const SizedBox(height: 4),
                            Text(
                              'Field Operations Platform',
                              style: TextStyle(
                                fontSize: 13,
                                color: const Color(0xFF8899AA),
                              ),
                            ),
                          ],
                        ),
                      ),
                      const SizedBox(height: 28),
                      // Decorative task card cluster
                      FadeTransition(
                        opacity: _logoFade,
                        child: SizedBox(
                          height: 120,
                          child: TaskCardClusterWidget(),
                        ),
                      ),
                      const SizedBox(height: 24),
                      // Form card
                      SlideTransition(
                        position: _formSlide,
                        child: FadeTransition(
                          opacity: _formFade,
                          child: ClipRRect(
                            borderRadius: BorderRadius.circular(20),
                            child: BackdropFilter(
                              filter: ImageFilter.blur(sigmaX: 12, sigmaY: 12),
                              child: Container(
                                padding: const EdgeInsets.all(24),
                                decoration: BoxDecoration(
                                  color: AppTheme.surfaceDark.withAlpha(179),
                                  borderRadius: BorderRadius.circular(20),
                                  border: Border.all(
                                    color: const Color(0xFF3A5068),
                                    width: 0.5,
                                  ),
                                ),
                                child: Form(
                                  key: _formKey,
                                  child: Column(
                                    crossAxisAlignment:
                                        CrossAxisAlignment.stretch,
                                    children: [
                                      Text(
                                        'Sign In',
                                        style: TextStyle(
                                          fontSize: 20,
                                          fontWeight: FontWeight.w700,
                                          color: Colors.white,
                                        ),
                                      ),
                                      const SizedBox(height: 4),
                                      Text(
                                        'Enter your credentials to continue',
                                        style: TextStyle(
                                          fontSize: 13,
                                          color: const Color(0xFF8899AA),
                                        ),
                                      ),
                                      const SizedBox(height: 24),
                                      // Role selector
                                      RoleSelectorWidget(
                                        selectedRole: _selectedRole,
                                        onRoleChanged: (role) => setState(
                                          () => _selectedRole = role,
                                        ),
                                      ),
                                      const SizedBox(height: 20),
                                      // Email field
                                      _GlassFormField(
                                        controller: _employeeIdController,
                                        label: 'Email',
                                        hint: 'your@email.com',
                                        iconName: 'email_outlined',
                                        keyboardType:
                                            TextInputType.emailAddress,
                                        errorText: _emailTouched
                                            ? _emailError
                                            : null,
                                        onChanged: (_) {
                                          _emailTouched = true;
                                          _validateEmail();
                                        },
                                        validator: (v) {
                                          if (v == null || v.isEmpty) {
                                            return 'Email is required';
                                          }
                                          return null;
                                        },
                                      ),
                                      const SizedBox(height: 16),
                                      // Password field
                                      _GlassFormField(
                                        controller: _pinController,
                                        label: 'Password',
                                        hint: 'Enter your password',
                                        iconName: 'lock_outlined',
                                        obscureText: !_isPinVisible,
                                        keyboardType:
                                            TextInputType.visiblePassword,
                                        errorText: _passwordTouched
                                            ? _passwordError
                                            : null,
                                        onChanged: (_) {
                                          _passwordTouched = true;
                                          _validatePassword();
                                        },
                                        suffixIcon: GestureDetector(
                                          onTap: () => setState(
                                            () =>
                                                _isPinVisible = !_isPinVisible,
                                          ),
                                          child: CustomIconWidget(
                                            iconName: _isPinVisible
                                                ? 'visibility_off'
                                                : 'visibility',
                                            color: const Color(0xFF8899AA),
                                            size: 20,
                                          ),
                                        ),
                                        validator: (v) {
                                          if (v == null || v.length < 4) {
                                            return 'Password must be at least 4 characters';
                                          }
                                          return null;
                                        },
                                      ),
                                      const SizedBox(height: 28),
                                      // Error message
                                      if (_errorMessage != null) ...[
                                        Container(
                                          padding: const EdgeInsets.symmetric(
                                            horizontal: 12,
                                            vertical: 10,
                                          ),
                                          decoration: BoxDecoration(
                                            color: AppTheme.error.withAlpha(31),
                                            borderRadius: BorderRadius.circular(
                                              10,
                                            ),
                                            border: Border.all(
                                              color: AppTheme.error.withAlpha(
                                                102,
                                              ),
                                            ),
                                          ),
                                          child: Row(
                                            children: [
                                              CustomIconWidget(
                                                iconName: 'error_outline',
                                                color: AppTheme.error,
                                                size: 16,
                                              ),
                                              const SizedBox(width: 8),
                                              Expanded(
                                                child: Text(
                                                  _errorMessage!,
                                                  style: TextStyle(
                                                    color: AppTheme.error,
                                                    fontSize: 12,
                                                  ),
                                                ),
                                              ),
                                            ],
                                          ),
                                        ),
                                        const SizedBox(height: 12),
                                      ],
                                      // Login button
                                      SizedBox(
                                        height: 52,
                                        child: ElevatedButton(
                                          onPressed:
                                              (_isLoading || !_isFormValid)
                                              ? null
                                              : _handleLogin,
                                          style: ElevatedButton.styleFrom(
                                            backgroundColor: _isFormValid
                                                ? AppTheme.accent
                                                : AppTheme.surfaceVariantDark,
                                            foregroundColor: _isFormValid
                                                ? AppTheme.backgroundDark
                                                : const Color(0xFF8899AA),
                                            shape: RoundedRectangleBorder(
                                              borderRadius:
                                                  BorderRadius.circular(14),
                                            ),
                                            elevation: 0,
                                          ),
                                          child: _isLoading
                                              ? SizedBox(
                                                  width: 22,
                                                  height: 22,
                                                  child:
                                                      CircularProgressIndicator(
                                                        strokeWidth: 2,
                                                        color: AppTheme
                                                            .backgroundDark,
                                                      ),
                                                )
                                              : Text(
                                                  'Sign In to ZamZam Field',
                                                  style: TextStyle(
                                                    fontSize: 15,
                                                    fontWeight: FontWeight.w700,
                                                    letterSpacing: 0.2,
                                                  ),
                                                ),
                                        ),
                                      ),
                                      const SizedBox(height: 20),
                                      Row(
                                        mainAxisAlignment:
                                            MainAxisAlignment.center,
                                        children: [
                                          Text(
                                            'New to ZamZam Field? ',
                                            style: TextStyle(
                                              color: Color(0xFF8899AA),
                                              fontSize: 13,
                                            ),
                                          ),
                                          GestureDetector(
                                            onTap: () => context.go(
                                              AppRoutes.signUpScreen,
                                            ),
                                            child: Text(
                                              'Create Account',
                                              style: TextStyle(
                                                color: AppTheme.accent,
                                                fontSize: 13,
                                                fontWeight: FontWeight.w600,
                                              ),
                                            ),
                                          ),
                                        ],
                                      ),
                                    ],
                                  ),
                                ),
                              ),
                            ),
                          ),
                        ),
                      ),
                      const SizedBox(height: 20),
                      // Demo credentials removed for production deployment
                      const SizedBox(height: 24),
                    ],
                  ),
                ),
              ),
            ),
          ),
        ],
      ),
    );
  }
}

class _ZamZamLogo extends StatelessWidget {
  @override
  Widget build(BuildContext context) {
    return Container(
      width: 88,
      height: 88,
      decoration: BoxDecoration(
        borderRadius: BorderRadius.circular(20),
        boxShadow: [
          BoxShadow(
            color: AppTheme.accent.withAlpha(77),
            blurRadius: 20,
            offset: const Offset(0, 8),
          ),
        ],
      ),
      child: ClipRRect(
        borderRadius: BorderRadius.circular(20),
        child: Image.asset(
          'assets/images/Picture1-1789308473747.png',
          fit: BoxFit.cover,
          semanticLabel: 'Zamzam Field Operations logo',
        ),
      ),
    );
  }
}

class _GlassFormField extends StatefulWidget {
  final TextEditingController controller;
  final String label;
  final String hint;
  final String iconName;
  final bool obscureText;
  final TextInputType keyboardType;
  final int? maxLength;
  final Widget? suffixIcon;
  final String? Function(String?)? validator;
  final String? errorText;
  final ValueChanged<String>? onChanged;

  const _GlassFormField({
    required this.controller,
    required this.label,
    required this.hint,
    required this.iconName,
    this.obscureText = false,
    this.keyboardType = TextInputType.text,
    this.suffixIcon,
    this.validator,
    this.errorText,
    this.onChanged,
    this.maxLength,
  });

  @override
  State<_GlassFormField> createState() => _GlassFormFieldState();
}

class _GlassFormFieldState extends State<_GlassFormField> {
  bool _isFocused = false;

  @override
  Widget build(BuildContext context) {
    final hasError = widget.errorText != null && widget.errorText!.isNotEmpty;
    return Column(
      crossAxisAlignment: CrossAxisAlignment.start,
      children: [
        Text(
          widget.label,
          style: TextStyle(
            fontSize: 12,
            fontWeight: FontWeight.w500,
            color: hasError ? AppTheme.error : const Color(0xFF8899AA),
          ),
        ),
        const SizedBox(height: 6),
        Focus(
          onFocusChange: (f) => setState(() => _isFocused = f),
          child: ClipRRect(
            borderRadius: BorderRadius.circular(12),
            child: BackdropFilter(
              filter: ImageFilter.blur(sigmaX: 8, sigmaY: 8),
              child: TextFormField(
                controller: widget.controller,
                obscureText: widget.obscureText,
                keyboardType: widget.keyboardType,
                maxLength: widget.maxLength,
                validator: widget.validator,
                onChanged: widget.onChanged,
                style: const TextStyle(
                  fontSize: 16,
                  color: Colors.white,
                  fontWeight: FontWeight.w400,
                ),
                decoration: InputDecoration(
                  hintText: widget.hint,
                  counterText: '',
                  errorText: widget.errorText,
                  errorStyle: const TextStyle(
                    fontSize: 11,
                    color: AppTheme.error,
                    height: 1.2,
                  ),
                  prefixIcon: Padding(
                    padding: const EdgeInsets.only(left: 12, right: 8),
                    child: CustomIconWidget(
                      iconName: widget.iconName,
                      color: hasError
                          ? AppTheme.error
                          : _isFocused
                          ? AppTheme.accent
                          : const Color(0xFF8899AA),
                      size: 20,
                    ),
                  ),
                  prefixIconConstraints: const BoxConstraints(
                    minWidth: 44,
                    minHeight: 48,
                  ),
                  suffixIcon: widget.suffixIcon != null
                      ? Padding(
                          padding: const EdgeInsets.only(right: 12),
                          child: widget.suffixIcon,
                        )
                      : null,
                  filled: true,
                  fillColor: hasError
                      ? AppTheme.error.withAlpha(15)
                      : AppTheme.surfaceVariantDark.withAlpha(204),
                  border: OutlineInputBorder(
                    borderRadius: BorderRadius.circular(12),
                    borderSide: const BorderSide(
                      color: Color(0xFF3A5068),
                      width: 1,
                    ),
                  ),
                  enabledBorder: OutlineInputBorder(
                    borderRadius: BorderRadius.circular(12),
                    borderSide: BorderSide(
                      color: hasError
                          ? AppTheme.error
                          : const Color(0xFF3A5068),
                      width: hasError ? 1.5 : 1,
                    ),
                  ),
                  focusedBorder: OutlineInputBorder(
                    borderRadius: BorderRadius.circular(12),
                    borderSide: BorderSide(
                      color: hasError ? AppTheme.error : AppTheme.accent,
                      width: 1.5,
                    ),
                  ),
                  errorBorder: OutlineInputBorder(
                    borderRadius: BorderRadius.circular(12),
                    borderSide: const BorderSide(
                      color: AppTheme.error,
                      width: 1.5,
                    ),
                  ),
                  focusedErrorBorder: OutlineInputBorder(
                    borderRadius: BorderRadius.circular(12),
                    borderSide: const BorderSide(
                      color: AppTheme.error,
                      width: 1.5,
                    ),
                  ),
                  contentPadding: const EdgeInsets.symmetric(
                    horizontal: 16,
                    vertical: 14,
                  ),
                ),
              ),
            ),
          ),
        ),
      ],
    );
  }
}

class _ParticleBackground extends StatefulWidget {
  const _ParticleBackground();

  @override
  State<_ParticleBackground> createState() => _ParticleBackgroundState();
}

class _ParticleBackgroundState extends State<_ParticleBackground>
    with TickerProviderStateMixin {
  late AnimationController _controller;
  final List<_Particle> _particles = [];

  @override
  void initState() {
    super.initState();
    final rng = math.Random(42);
    for (int i = 0; i < 30; i++) {
      _particles.add(
        _Particle(
          x: rng.nextDouble(),
          y: rng.nextDouble(),
          size: rng.nextDouble() * 3 + 1,
          speed: rng.nextDouble() * 0.0003 + 0.0001,
          opacity: rng.nextDouble() * 0.4 + 0.1,
        ),
      );
    }
    _controller = AnimationController(
      vsync: this,
      duration: const Duration(seconds: 20),
    )..repeat();
    _controller.addListener(() => setState(() {}));
  }

  @override
  void dispose() {
    _controller.dispose();
    super.dispose();
  }

  @override
  Widget build(BuildContext context) {
    return CustomPaint(
      painter: _ParticlePainter(_particles, _controller.value, AppTheme.accent),
    );
  }
}

class _Particle {
  final double x;
  final double y;
  final double size;
  final double speed;
  final double opacity;
  _Particle({
    required this.x,
    required this.y,
    required this.size,
    required this.speed,
    required this.opacity,
  });
}

class _ParticlePainter extends CustomPainter {
  final List<_Particle> particles;
  final double time;
  final Color color;

  _ParticlePainter(this.particles, this.time, this.color);

  @override
  void paint(Canvas canvas, Size size) {
    for (final p in particles) {
      final dy = (p.y + time * p.speed * 10) % 1.0;
      final paint = Paint()
        ..color = color.withOpacity(p.opacity)
        ..style = PaintingStyle.fill;
      canvas.drawCircle(
        Offset(p.x * size.width, dy * size.height),
        p.size,
        paint,
      );
    }
  }

  @override
  bool shouldRepaint(_ParticlePainter old) => true;
}