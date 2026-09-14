import 'dart:ui';
import 'dart:math' as math;

import 'package:flutter/material.dart';
import 'package:go_router/go_router.dart';
import 'package:supabase_flutter/supabase_flutter.dart';

import '../../routes/app_routes.dart';
import '../../theme/app_theme.dart';
import '../../widgets/custom_icon_widget.dart';
import '../../services/supabase_service.dart';
import '../../services/activity_log_service.dart';

class SignUpScreen extends StatefulWidget {
  const SignUpScreen({super.key});

  @override
  State<SignUpScreen> createState() => _SignUpScreenState();
}

enum _UserRole { fieldStaff, supervisor, manager }

class _SignUpScreenState extends State<SignUpScreen>
    with TickerProviderStateMixin {
  final _formKey = GlobalKey<FormState>();
  final _fullNameController = TextEditingController();
  final _emailController = TextEditingController();
  final _phoneController = TextEditingController();
  final _passwordController = TextEditingController();
  final _confirmPasswordController = TextEditingController();

  bool _isPasswordVisible = false;
  bool _isConfirmPasswordVisible = false;
  bool _isLoading = false;
  _UserRole _selectedRole = _UserRole.fieldStaff;
  String? _errorMessage;

  // Real-time validation state
  String? _nameError;
  String? _emailError;
  String? _passwordError;
  String? _confirmPasswordError;
  bool _nameTouched = false;
  bool _emailTouched = false;
  bool _passwordTouched = false;
  bool _confirmPasswordTouched = false;

  bool get _isFormValid {
    return _fullNameController.text.trim().isNotEmpty &&
        _emailController.text.trim().isNotEmpty &&
        _emailController.text.contains('@') &&
        _passwordController.text.length >= 8 &&
        _confirmPasswordController.text == _passwordController.text;
  }

  void _validateName() {
    final v = _fullNameController.text;
    setState(() {
      _nameError = v.trim().isEmpty ? 'Full name is required' : null;
    });
  }

  void _validateEmail() {
    final v = _emailController.text;
    if (v.trim().isEmpty) {
      setState(() => _emailError = 'Email is required');
    } else if (!v.contains('@') || !v.contains('.')) {
      setState(() => _emailError = 'Enter a valid email address');
    } else {
      setState(() => _emailError = null);
    }
  }

  void _validatePassword() {
    final v = _passwordController.text;
    if (v.isEmpty) {
      setState(() => _passwordError = 'Password is required');
    } else if (v.length < 8) {
      setState(() => _passwordError = 'Password must be at least 8 characters');
    } else {
      setState(() => _passwordError = null);
    }
    // Re-validate confirm if already touched
    if (_confirmPasswordTouched) _validateConfirmPassword();
  }

  void _validateConfirmPassword() {
    final v = _confirmPasswordController.text;
    setState(() {
      _confirmPasswordError = v != _passwordController.text
          ? 'Passwords do not match'
          : null;
    });
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
    _fullNameController.addListener(() {
      if (_nameTouched) _validateName();
      setState(() {});
    });
    _emailController.addListener(() {
      if (_emailTouched) _validateEmail();
      setState(() {});
    });
    _passwordController.addListener(() {
      if (_passwordTouched) _validatePassword();
      setState(() {});
    });
    _confirmPasswordController.addListener(() {
      if (_confirmPasswordTouched) _validateConfirmPassword();
      setState(() {});
    });
  }

  @override
  void dispose() {
    _entranceController.dispose();
    _fullNameController.dispose();
    _emailController.dispose();
    _phoneController.dispose();
    _passwordController.dispose();
    _confirmPasswordController.dispose();
    super.dispose();
  }

  String _roleToString(_UserRole role) {
    switch (role) {
      case _UserRole.fieldStaff:
        return 'field_staff';
      case _UserRole.supervisor:
        return 'supervisor';
      case _UserRole.manager:
        return 'manager';
    }
  }

  String _roleLabel(_UserRole role) {
    switch (role) {
      case _UserRole.fieldStaff:
        return 'Field Staff';
      case _UserRole.supervisor:
        return 'Supervisor';
      case _UserRole.manager:
        return 'Manager';
    }
  }

  Future<void> _handleSignUp() async {
    // Mark all fields as touched and validate
    setState(() {
      _nameTouched = true;
      _emailTouched = true;
      _passwordTouched = true;
      _confirmPasswordTouched = true;
    });
    _validateName();
    _validateEmail();
    _validatePassword();
    _validateConfirmPassword();

    if (!_isFormValid) return;
    setState(() {
      _isLoading = true;
      _errorMessage = null;
    });

    try {
      final client = SupabaseService.instance.client;
      final response = await client.auth.signUp(
        email: _emailController.text.trim(),
        password: _passwordController.text,
        data: {
          'full_name': _fullNameController.text.trim(),
          'role': _roleToString(_selectedRole),
          'phone': _phoneController.text.trim(),
        },
      );

      if (!mounted) return;

      if (response.user != null) {
        await ActivityLogService.instance.log(
          userId: response.user!.id,
          userName: _fullNameController.text.trim(),
          userRole: _roleToString(_selectedRole),
          action: 'user_signup',
          description:
              '${_fullNameController.text.trim()} signed up as ${_roleLabel(_selectedRole)}',
        );
        context.go(AppRoutes.homeScreen);
      } else {
        setState(() {
          _errorMessage = 'Sign up failed. Please try again.';
        });
      }
    } on AuthException catch (e) {
      setState(() {
        _errorMessage = e.message;
      });
    } catch (e) {
      setState(() {
        _errorMessage = 'An unexpected error occurred. Please try again.';
      });
    } finally {
      if (mounted) setState(() => _isLoading = false);
    }
  }

  @override
  Widget build(BuildContext context) {
    final size = MediaQuery.of(context).size;
    final isTablet = size.width >= 600;

    return Scaffold(
      backgroundColor: AppTheme.backgroundDark,
      body: Stack(
        children: [
          Positioned.fill(
            child: Container(
              decoration: const BoxDecoration(
                gradient: RadialGradient(
                  center: Alignment(0.3, -0.5),
                  radius: 1.2,
                  colors: [Color(0xFF1A3A5C), Color(0xFF0F1923)],
                ),
              ),
            ),
          ),
          const Positioned.fill(child: _ParticleBackground()),
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
                      FadeTransition(
                        opacity: _logoFade,
                        child: Column(
                          children: [
                            _ZamZamLogo(),
                            const SizedBox(height: 8),
                            const Text(
                              'ZamZam Field',
                              style: TextStyle(
                                fontSize: 26,
                                fontWeight: FontWeight.w700,
                                color: Colors.white,
                                letterSpacing: -0.5,
                              ),
                            ),
                            const SizedBox(height: 4),
                            const Text(
                              'Create your account',
                              style: TextStyle(
                                fontSize: 13,
                                color: Color(0xFF8899AA),
                              ),
                            ),
                          ],
                        ),
                      ),
                      const SizedBox(height: 28),
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
                                      const Text(
                                        'Sign Up',
                                        style: TextStyle(
                                          fontSize: 20,
                                          fontWeight: FontWeight.w700,
                                          color: Colors.white,
                                        ),
                                      ),
                                      const SizedBox(height: 4),
                                      const Text(
                                        'Fill in your details to get started',
                                        style: TextStyle(
                                          fontSize: 13,
                                          color: Color(0xFF8899AA),
                                        ),
                                      ),
                                      const SizedBox(height: 24),
                                      // Role selector
                                      _RoleSelector(
                                        selectedRole: _selectedRole,
                                        onChanged: (r) =>
                                            setState(() => _selectedRole = r),
                                      ),
                                      const SizedBox(height: 20),
                                      _GlassField(
                                        controller: _fullNameController,
                                        label: 'Full Name',
                                        hint: 'e.g. Ahmed Al-Rashid',
                                        iconName: 'person_outline',
                                        errorText: _nameTouched
                                            ? _nameError
                                            : null,
                                        onChanged: (_) {
                                          _nameTouched = true;
                                          _validateName();
                                        },
                                        validator: (v) =>
                                            (v == null || v.trim().isEmpty)
                                            ? 'Full name is required'
                                            : null,
                                      ),
                                      const SizedBox(height: 16),
                                      _GlassField(
                                        controller: _emailController,
                                        label: 'Email Address',
                                        hint: 'you@zamzam.com',
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
                                          if (v == null || v.trim().isEmpty) {
                                            return 'Email is required';
                                          }
                                          if (!v.contains('@')) {
                                            return 'Enter a valid email';
                                          }
                                          return null;
                                        },
                                      ),
                                      const SizedBox(height: 16),
                                      _GlassField(
                                        controller: _phoneController,
                                        label: 'Phone (optional)',
                                        hint: '+255 7XX XXX XXX',
                                        iconName: 'phone_outlined',
                                        keyboardType: TextInputType.phone,
                                      ),
                                      const SizedBox(height: 16),
                                      _GlassField(
                                        controller: _passwordController,
                                        label: 'Password',
                                        hint: 'Min. 8 characters',
                                        iconName: 'lock_outline',
                                        obscureText: !_isPasswordVisible,
                                        errorText: _passwordTouched
                                            ? _passwordError
                                            : null,
                                        onChanged: (_) {
                                          _passwordTouched = true;
                                          _validatePassword();
                                        },
                                        suffixIcon: GestureDetector(
                                          onTap: () => setState(
                                            () => _isPasswordVisible =
                                                !_isPasswordVisible,
                                          ),
                                          child: CustomIconWidget(
                                            iconName: _isPasswordVisible
                                                ? 'visibility_off'
                                                : 'visibility',
                                            color: const Color(0xFF8899AA),
                                            size: 20,
                                          ),
                                        ),
                                        validator: (v) {
                                          if (v == null || v.length < 8) {
                                            return 'Password must be at least 8 characters';
                                          }
                                          return null;
                                        },
                                      ),
                                      const SizedBox(height: 16),
                                      _GlassField(
                                        controller: _confirmPasswordController,
                                        label: 'Confirm Password',
                                        hint: 'Re-enter password',
                                        iconName: 'lock_outline',
                                        obscureText: !_isConfirmPasswordVisible,
                                        errorText: _confirmPasswordTouched
                                            ? _confirmPasswordError
                                            : null,
                                        onChanged: (_) {
                                          _confirmPasswordTouched = true;
                                          _validateConfirmPassword();
                                        },
                                        suffixIcon: GestureDetector(
                                          onTap: () => setState(
                                            () => _isConfirmPasswordVisible =
                                                !_isConfirmPasswordVisible,
                                          ),
                                          child: CustomIconWidget(
                                            iconName: _isConfirmPasswordVisible
                                                ? 'visibility_off'
                                                : 'visibility',
                                            color: const Color(0xFF8899AA),
                                            size: 20,
                                          ),
                                        ),
                                        validator: (v) {
                                          if (v != _passwordController.text) {
                                            return 'Passwords do not match';
                                          }
                                          return null;
                                        },
                                      ),
                                      if (_errorMessage != null) ...[
                                        const SizedBox(height: 16),
                                        Container(
                                          padding: const EdgeInsets.symmetric(
                                            horizontal: 12,
                                            vertical: 10,
                                          ),
                                          decoration: BoxDecoration(
                                            color: AppTheme.error.withAlpha(30),
                                            borderRadius: BorderRadius.circular(
                                              10,
                                            ),
                                            border: Border.all(
                                              color: AppTheme.error.withAlpha(
                                                80,
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
                                      ],
                                      const SizedBox(height: 28),
                                      SizedBox(
                                        height: 52,
                                        child: ElevatedButton(
                                          onPressed:
                                              (_isLoading || !_isFormValid)
                                              ? null
                                              : _handleSignUp,
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
                                              : const Text(
                                                  'Create Account',
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
                                          const Text(
                                            'Already have an account? ',
                                            style: TextStyle(
                                              color: Color(0xFF8899AA),
                                              fontSize: 13,
                                            ),
                                          ),
                                          GestureDetector(
                                            onTap: () => context.go(
                                              AppRoutes.signUpLoginScreen,
                                            ),
                                            child: Text(
                                              'Sign In',
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

class _RoleSelector extends StatelessWidget {
  final _UserRole selectedRole;
  final ValueChanged<_UserRole> onChanged;

  const _RoleSelector({required this.selectedRole, required this.onChanged});

  @override
  Widget build(BuildContext context) {
    return Column(
      crossAxisAlignment: CrossAxisAlignment.start,
      children: [
        const Text(
          'Role',
          style: TextStyle(
            fontSize: 12,
            fontWeight: FontWeight.w500,
            color: Color(0xFF8899AA),
          ),
        ),
        const SizedBox(height: 8),
        Row(
          children: _UserRole.values.map((role) {
            final isSelected = selectedRole == role;
            final label = role == _UserRole.fieldStaff
                ? 'Field Staff'
                : role == _UserRole.supervisor
                ? 'Supervisor'
                : 'Manager';
            final icon = role == _UserRole.fieldStaff
                ? 'directions_walk'
                : role == _UserRole.supervisor
                ? 'supervisor_account'
                : 'manage_accounts';
            return Expanded(
              child: GestureDetector(
                onTap: () => onChanged(role),
                child: AnimatedContainer(
                  duration: const Duration(milliseconds: 200),
                  margin: EdgeInsets.only(
                    right: role != _UserRole.manager ? 8 : 0,
                  ),
                  padding: const EdgeInsets.symmetric(vertical: 10),
                  decoration: BoxDecoration(
                    color: isSelected
                        ? AppTheme.accent.withAlpha(40)
                        : AppTheme.surfaceVariantDark.withAlpha(150),
                    borderRadius: BorderRadius.circular(10),
                    border: Border.all(
                      color: isSelected
                          ? AppTheme.accent
                          : const Color(0xFF3A5068),
                      width: isSelected ? 1.5 : 1,
                    ),
                  ),
                  child: Column(
                    children: [
                      CustomIconWidget(
                        iconName: icon,
                        color: isSelected
                            ? AppTheme.accent
                            : const Color(0xFF8899AA),
                        size: 18,
                      ),
                      const SizedBox(height: 4),
                      Text(
                        label,
                        style: TextStyle(
                          fontSize: 10,
                          fontWeight: isSelected
                              ? FontWeight.w600
                              : FontWeight.w400,
                          color: isSelected
                              ? AppTheme.accent
                              : const Color(0xFF8899AA),
                        ),
                        textAlign: TextAlign.center,
                      ),
                    ],
                  ),
                ),
              ),
            );
          }).toList(),
        ),
      ],
    );
  }
}

class _GlassField extends StatefulWidget {
  final TextEditingController controller;
  final String label;
  final String hint;
  final String iconName;
  final bool obscureText;
  final TextInputType keyboardType;
  final Widget? suffixIcon;
  final String? Function(String?)? validator;
  final String? errorText;
  final ValueChanged<String>? onChanged;

  const _GlassField({
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
  });

  @override
  State<_GlassField> createState() => _GlassFieldState();
}

class _GlassFieldState extends State<_GlassField> {
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
                validator: widget.validator,
                onChanged: widget.onChanged,
                style: const TextStyle(
                  fontSize: 15,
                  color: Colors.white,
                  fontWeight: FontWeight.w400,
                ),
                decoration: InputDecoration(
                  hintText: widget.hint,
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
    final rng = math.Random(99);
    for (int i = 0; i < 25; i++) {
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
  final double x, y, size, speed, opacity;
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
