import 'dart:ui';
import 'package:flutter/material.dart';
import 'package:google_fonts/google_fonts.dart';
import 'package:shared_preferences/shared_preferences.dart';
import '../../theme/app_theme.dart';
import '../../widgets/custom_icon_widget.dart';

class AccountManagementScreen extends StatefulWidget {
  const AccountManagementScreen({super.key});

  @override
  State<AccountManagementScreen> createState() =>
      _AccountManagementScreenState();
}

class _AccountManagementScreenState extends State<AccountManagementScreen> {
  bool _isLoading = true;
  bool _isSaving = false;

  // Personal info
  final _nameController = TextEditingController();
  final _emailController = TextEditingController();
  final _phoneController = TextEditingController();
  String _employeeId = '';
  String _role = '';

  // Change password
  final _currentPinController = TextEditingController();
  final _newPinController = TextEditingController();
  final _confirmPinController = TextEditingController();
  bool _showCurrentPin = false;
  bool _showNewPin = false;

  // Notification preferences
  bool _notifDeliveryAlerts = true;
  bool _notifSyncAlerts = true;
  bool _notifApprovalAlerts = true;
  bool _notifMessageAlerts = true;
  TimeOfDay _quietStart = const TimeOfDay(hour: 22, minute: 0);
  TimeOfDay _quietEnd = const TimeOfDay(hour: 7, minute: 0);
  bool _quietHoursEnabled = false;

  // Offline storage
  int _offlineStorageLimitMb = 100;

  static const _kName = 'account_name';
  static const _kEmail = 'account_email';
  static const _kPhone = 'account_phone';
  static const _kEmployeeId = 'account_employee_id';
  static const _kRole = 'account_role';
  static const _kNotifDelivery = 'notif_delivery';
  static const _kNotifSync = 'notif_sync';
  static const _kNotifApproval = 'notif_approval';
  static const _kNotifMessage = 'notif_message';
  static const _kQuietEnabled = 'quiet_hours_enabled';
  static const _kQuietStartH = 'quiet_start_hour';
  static const _kQuietStartM = 'quiet_start_min';
  static const _kQuietEndH = 'quiet_end_hour';
  static const _kQuietEndM = 'quiet_end_min';
  static const _kOfflineLimit = 'offline_storage_limit_mb';

  @override
  void initState() {
    super.initState();
    _loadPrefs();
  }

  @override
  void dispose() {
    _nameController.dispose();
    _emailController.dispose();
    _phoneController.dispose();
    _currentPinController.dispose();
    _newPinController.dispose();
    _confirmPinController.dispose();
    super.dispose();
  }

  Future<void> _loadPrefs() async {
    final prefs = await SharedPreferences.getInstance();
    setState(() {
      _nameController.text = prefs.getString(_kName) ?? '';
      _emailController.text = prefs.getString(_kEmail) ?? '';
      _phoneController.text = prefs.getString(_kPhone) ?? '';
      _employeeId = prefs.getString(_kEmployeeId) ?? '';
      _role = prefs.getString(_kRole) ?? 'Field Staff';
      _notifDeliveryAlerts = prefs.getBool(_kNotifDelivery) ?? true;
      _notifSyncAlerts = prefs.getBool(_kNotifSync) ?? true;
      _notifApprovalAlerts = prefs.getBool(_kNotifApproval) ?? true;
      _notifMessageAlerts = prefs.getBool(_kNotifMessage) ?? true;
      _quietHoursEnabled = prefs.getBool(_kQuietEnabled) ?? false;
      _quietStart = TimeOfDay(
        hour: prefs.getInt(_kQuietStartH) ?? 22,
        minute: prefs.getInt(_kQuietStartM) ?? 0,
      );
      _quietEnd = TimeOfDay(
        hour: prefs.getInt(_kQuietEndH) ?? 7,
        minute: prefs.getInt(_kQuietEndM) ?? 0,
      );
      _offlineStorageLimitMb = prefs.getInt(_kOfflineLimit) ?? 100;
      _isLoading = false;
    });
  }

  Future<void> _savePersonalInfo() async {
    setState(() => _isSaving = true);
    final prefs = await SharedPreferences.getInstance();
    await prefs.setString(_kName, _nameController.text.trim());
    await prefs.setString(_kEmail, _emailController.text.trim());
    await prefs.setString(_kPhone, _phoneController.text.trim());
    setState(() => _isSaving = false);
    if (mounted) {
      ScaffoldMessenger.of(context).showSnackBar(
        SnackBar(
          content: Text(
            'Personal info saved',
            style: GoogleFonts.ibmPlexSans(color: Colors.white),
          ),
          backgroundColor: AppTheme.success,
          behavior: SnackBarBehavior.floating,
          shape: RoundedRectangleBorder(
            borderRadius: BorderRadius.circular(10),
          ),
        ),
      );
    }
  }

  Future<void> _changePin() async {
    if (_newPinController.text != _confirmPinController.text) {
      _showError('New PINs do not match');
      return;
    }
    if (_newPinController.text.length < 4) {
      _showError('PIN must be at least 4 digits');
      return;
    }
    setState(() => _isSaving = true);
    await Future.delayed(const Duration(milliseconds: 600));
    setState(() => _isSaving = false);
    _currentPinController.clear();
    _newPinController.clear();
    _confirmPinController.clear();
    if (mounted) {
      ScaffoldMessenger.of(context).showSnackBar(
        SnackBar(
          content: Text(
            'PIN updated successfully',
            style: GoogleFonts.ibmPlexSans(color: Colors.white),
          ),
          backgroundColor: AppTheme.success,
          behavior: SnackBarBehavior.floating,
          shape: RoundedRectangleBorder(
            borderRadius: BorderRadius.circular(10),
          ),
        ),
      );
    }
  }

  void _showError(String msg) {
    ScaffoldMessenger.of(context).showSnackBar(
      SnackBar(
        content: Text(msg, style: GoogleFonts.ibmPlexSans(color: Colors.white)),
        backgroundColor: AppTheme.error,
        behavior: SnackBarBehavior.floating,
        shape: RoundedRectangleBorder(borderRadius: BorderRadius.circular(10)),
      ),
    );
  }

  Future<void> _saveNotificationPrefs() async {
    final prefs = await SharedPreferences.getInstance();
    await prefs.setBool(_kNotifDelivery, _notifDeliveryAlerts);
    await prefs.setBool(_kNotifSync, _notifSyncAlerts);
    await prefs.setBool(_kNotifApproval, _notifApprovalAlerts);
    await prefs.setBool(_kNotifMessage, _notifMessageAlerts);
    await prefs.setBool(_kQuietEnabled, _quietHoursEnabled);
    await prefs.setInt(_kQuietStartH, _quietStart.hour);
    await prefs.setInt(_kQuietStartM, _quietStart.minute);
    await prefs.setInt(_kQuietEndH, _quietEnd.hour);
    await prefs.setInt(_kQuietEndM, _quietEnd.minute);
    if (mounted) {
      ScaffoldMessenger.of(context).showSnackBar(
        SnackBar(
          content: Text(
            'Notification preferences saved',
            style: GoogleFonts.ibmPlexSans(color: Colors.white),
          ),
          backgroundColor: AppTheme.success,
          behavior: SnackBarBehavior.floating,
          shape: RoundedRectangleBorder(
            borderRadius: BorderRadius.circular(10),
          ),
        ),
      );
    }
  }

  Future<void> _saveStorageLimit() async {
    final prefs = await SharedPreferences.getInstance();
    await prefs.setInt(_kOfflineLimit, _offlineStorageLimitMb);
    if (mounted) {
      ScaffoldMessenger.of(context).showSnackBar(
        SnackBar(
          content: Text(
            'Storage limit updated to ${_offlineStorageLimitMb}MB',
            style: GoogleFonts.ibmPlexSans(color: Colors.white),
          ),
          backgroundColor: AppTheme.success,
          behavior: SnackBarBehavior.floating,
          shape: RoundedRectangleBorder(
            borderRadius: BorderRadius.circular(10),
          ),
        ),
      );
    }
  }

  Future<void> _pickTime(bool isStart) async {
    final picked = await showTimePicker(
      context: context,
      initialTime: isStart ? _quietStart : _quietEnd,
      builder: (context, child) => Theme(
        data: ThemeData.dark().copyWith(
          colorScheme: const ColorScheme.dark(
            primary: AppTheme.accent,
            surface: AppTheme.surfaceDark,
          ),
        ),
        child: child!,
      ),
    );
    if (picked != null) {
      setState(() {
        if (isStart) {
          _quietStart = picked;
        } else {
          _quietEnd = picked;
        }
      });
    }
  }

  @override
  Widget build(BuildContext context) {
    return Scaffold(
      backgroundColor: AppTheme.backgroundDark,
      extendBodyBehindAppBar: true,
      appBar: PreferredSize(
        preferredSize: const Size.fromHeight(72),
        child: ClipRect(
          child: BackdropFilter(
            filter: ImageFilter.blur(sigmaX: 16, sigmaY: 16),
            child: Container(
              decoration: BoxDecoration(
                color: AppTheme.backgroundDark.withAlpha(191),
                border: const Border(
                  bottom: BorderSide(color: Color(0xFF243447), width: 0.5),
                ),
              ),
              child: SafeArea(
                bottom: false,
                child: Padding(
                  padding: const EdgeInsets.symmetric(
                    horizontal: 20,
                    vertical: 12,
                  ),
                  child: Row(
                    children: [
                      Expanded(
                        child: Column(
                          crossAxisAlignment: CrossAxisAlignment.start,
                          mainAxisSize: MainAxisSize.min,
                          children: [
                            Text(
                              'Settings',
                              style: GoogleFonts.ibmPlexSans(
                                fontSize: 12,
                                color: const Color(0xFF8899AA),
                              ),
                            ),
                            Text(
                              'My Account',
                              style: GoogleFonts.ibmPlexSans(
                                fontSize: 18,
                                fontWeight: FontWeight.w700,
                                color: Colors.white,
                              ),
                            ),
                          ],
                        ),
                      ),
                    ],
                  ),
                ),
              ),
            ),
          ),
        ),
      ),
      body: _isLoading
          ? const Center(
              child: CircularProgressIndicator(color: AppTheme.accent),
            )
          : CustomScrollView(
              slivers: [
                SliverToBoxAdapter(
                  child: SizedBox(
                    height: MediaQuery.of(context).padding.top + 72,
                  ),
                ),

                // ── Profile Avatar ──────────────────────────────────────
                SliverToBoxAdapter(
                  child: Padding(
                    padding: const EdgeInsets.fromLTRB(20, 24, 20, 0),
                    child: _ProfileHeader(
                      name: _nameController.text.isEmpty
                          ? 'Field Staff'
                          : _nameController.text,
                      employeeId: _employeeId,
                      role: _role,
                    ),
                  ),
                ),

                const SliverToBoxAdapter(child: SizedBox(height: 24)),

                // ── Personal Info ───────────────────────────────────────
                SliverToBoxAdapter(
                  child: Padding(
                    padding: const EdgeInsets.symmetric(horizontal: 20),
                    child: _SectionCard(
                      icon: 'person_outline',
                      title: 'Personal Information',
                      child: Column(
                        children: [
                          _InputField(
                            controller: _nameController,
                            label: 'Full Name',
                            hint: 'Enter your full name',
                            icon: 'badge',
                          ),
                          const SizedBox(height: 12),
                          _InputField(
                            controller: _emailController,
                            label: 'Email Address',
                            hint: 'Enter your email',
                            icon: 'email_outlined',
                            keyboardType: TextInputType.emailAddress,
                          ),
                          const SizedBox(height: 12),
                          _InputField(
                            controller: _phoneController,
                            label: 'Phone Number',
                            hint: 'Enter your phone number',
                            icon: 'phone_outlined',
                            keyboardType: TextInputType.phone,
                          ),
                          const SizedBox(height: 16),
                          SizedBox(
                            width: double.infinity,
                            height: 46,
                            child: ElevatedButton(
                              onPressed: _isSaving ? null : _savePersonalInfo,
                              style: ElevatedButton.styleFrom(
                                backgroundColor: AppTheme.accent,
                                foregroundColor: AppTheme.backgroundDark,
                                shape: RoundedRectangleBorder(
                                  borderRadius: BorderRadius.circular(12),
                                ),
                                elevation: 0,
                              ),
                              child: _isSaving
                                  ? const SizedBox(
                                      width: 18,
                                      height: 18,
                                      child: CircularProgressIndicator(
                                        strokeWidth: 2,
                                        color: AppTheme.backgroundDark,
                                      ),
                                    )
                                  : Text(
                                      'Save Changes',
                                      style: GoogleFonts.ibmPlexSans(
                                        fontSize: 14,
                                        fontWeight: FontWeight.w600,
                                      ),
                                    ),
                            ),
                          ),
                        ],
                      ),
                    ),
                  ),
                ),

                const SliverToBoxAdapter(child: SizedBox(height: 16)),

                // ── Change PIN ──────────────────────────────────────────
                SliverToBoxAdapter(
                  child: Padding(
                    padding: const EdgeInsets.symmetric(horizontal: 20),
                    child: _SectionCard(
                      icon: 'lock_outline',
                      title: 'Change PIN',
                      child: Column(
                        children: [
                          _PinField(
                            controller: _currentPinController,
                            label: 'Current PIN',
                            isVisible: _showCurrentPin,
                            onToggle: () => setState(
                              () => _showCurrentPin = !_showCurrentPin,
                            ),
                          ),
                          const SizedBox(height: 12),
                          _PinField(
                            controller: _newPinController,
                            label: 'New PIN',
                            isVisible: _showNewPin,
                            onToggle: () =>
                                setState(() => _showNewPin = !_showNewPin),
                          ),
                          const SizedBox(height: 12),
                          _PinField(
                            controller: _confirmPinController,
                            label: 'Confirm New PIN',
                            isVisible: _showNewPin,
                            onToggle: () =>
                                setState(() => _showNewPin = !_showNewPin),
                          ),
                          const SizedBox(height: 16),
                          SizedBox(
                            width: double.infinity,
                            height: 46,
                            child: ElevatedButton(
                              onPressed: _isSaving ? null : _changePin,
                              style: ElevatedButton.styleFrom(
                                backgroundColor: AppTheme.surfaceVariantDark,
                                foregroundColor: Colors.white,
                                shape: RoundedRectangleBorder(
                                  borderRadius: BorderRadius.circular(12),
                                  side: const BorderSide(
                                    color: Color(0xFF3A5068),
                                    width: 1,
                                  ),
                                ),
                                elevation: 0,
                              ),
                              child: Text(
                                'Update PIN',
                                style: GoogleFonts.ibmPlexSans(
                                  fontSize: 14,
                                  fontWeight: FontWeight.w600,
                                ),
                              ),
                            ),
                          ),
                        ],
                      ),
                    ),
                  ),
                ),

                const SliverToBoxAdapter(child: SizedBox(height: 16)),

                // ── Notification Preferences ────────────────────────────
                SliverToBoxAdapter(
                  child: Padding(
                    padding: const EdgeInsets.symmetric(horizontal: 20),
                    child: _SectionCard(
                      icon: 'notifications_outlined',
                      title: 'Notification Preferences',
                      child: Column(
                        children: [
                          _NotifToggle(
                            label: 'Delivery Alerts',
                            subtitle: 'New delivery assignments & updates',
                            value: _notifDeliveryAlerts,
                            onChanged: (v) =>
                                setState(() => _notifDeliveryAlerts = v),
                          ),
                          _NotifToggle(
                            label: 'Sync Alerts',
                            subtitle: 'Data sync success & failure',
                            value: _notifSyncAlerts,
                            onChanged: (v) =>
                                setState(() => _notifSyncAlerts = v),
                          ),
                          _NotifToggle(
                            label: 'Approval Alerts',
                            subtitle: 'Order & report approval status',
                            value: _notifApprovalAlerts,
                            onChanged: (v) =>
                                setState(() => _notifApprovalAlerts = v),
                          ),
                          _NotifToggle(
                            label: 'Message Alerts',
                            subtitle: 'New direct messages',
                            value: _notifMessageAlerts,
                            onChanged: (v) =>
                                setState(() => _notifMessageAlerts = v),
                          ),
                          const Divider(color: Color(0xFF3A5068), height: 24),
                          _NotifToggle(
                            label: 'Quiet Hours',
                            subtitle: 'Silence notifications during set hours',
                            value: _quietHoursEnabled,
                            onChanged: (v) =>
                                setState(() => _quietHoursEnabled = v),
                          ),
                          if (_quietHoursEnabled) ...[
                            const SizedBox(height: 10),
                            Row(
                              children: [
                                Expanded(
                                  child: _TimePickerButton(
                                    label: 'From',
                                    time: _quietStart,
                                    onTap: () => _pickTime(true),
                                  ),
                                ),
                                const SizedBox(width: 10),
                                Expanded(
                                  child: _TimePickerButton(
                                    label: 'Until',
                                    time: _quietEnd,
                                    onTap: () => _pickTime(false),
                                  ),
                                ),
                              ],
                            ),
                          ],
                          const SizedBox(height: 16),
                          SizedBox(
                            width: double.infinity,
                            height: 46,
                            child: ElevatedButton(
                              onPressed: _saveNotificationPrefs,
                              style: ElevatedButton.styleFrom(
                                backgroundColor: AppTheme.accent,
                                foregroundColor: AppTheme.backgroundDark,
                                shape: RoundedRectangleBorder(
                                  borderRadius: BorderRadius.circular(12),
                                ),
                                elevation: 0,
                              ),
                              child: Text(
                                'Save Preferences',
                                style: GoogleFonts.ibmPlexSans(
                                  fontSize: 14,
                                  fontWeight: FontWeight.w600,
                                ),
                              ),
                            ),
                          ),
                        ],
                      ),
                    ),
                  ),
                ),

                const SliverToBoxAdapter(child: SizedBox(height: 16)),

                // ── Offline Storage ─────────────────────────────────────
                SliverToBoxAdapter(
                  child: Padding(
                    padding: const EdgeInsets.symmetric(horizontal: 20),
                    child: _SectionCard(
                      icon: 'storage',
                      title: 'Offline Storage',
                      child: Column(
                        crossAxisAlignment: CrossAxisAlignment.start,
                        children: [
                          Row(
                            mainAxisAlignment: MainAxisAlignment.spaceBetween,
                            children: [
                              Text(
                                'Storage Limit',
                                style: GoogleFonts.ibmPlexSans(
                                  fontSize: 13,
                                  color: const Color(0xFFB0C4D8),
                                ),
                              ),
                              Container(
                                padding: const EdgeInsets.symmetric(
                                  horizontal: 10,
                                  vertical: 4,
                                ),
                                decoration: BoxDecoration(
                                  color: AppTheme.accent.withAlpha(30),
                                  borderRadius: BorderRadius.circular(8),
                                  border: Border.all(
                                    color: AppTheme.accent.withAlpha(80),
                                    width: 1,
                                  ),
                                ),
                                child: Text(
                                  '$_offlineStorageLimitMb MB',
                                  style: GoogleFonts.ibmPlexSans(
                                    fontSize: 13,
                                    fontWeight: FontWeight.w700,
                                    color: AppTheme.accent,
                                  ),
                                ),
                              ),
                            ],
                          ),
                          const SizedBox(height: 12),
                          SliderTheme(
                            data: SliderThemeData(
                              activeTrackColor: AppTheme.accent,
                              inactiveTrackColor: AppTheme.surfaceVariantDark,
                              thumbColor: AppTheme.accent,
                              overlayColor: AppTheme.accent.withAlpha(30),
                              trackHeight: 4,
                            ),
                            child: Slider(
                              value: _offlineStorageLimitMb.toDouble(),
                              min: 50,
                              max: 500,
                              divisions: 9,
                              onChanged: (v) => setState(
                                () => _offlineStorageLimitMb = v.toInt(),
                              ),
                            ),
                          ),
                          Row(
                            mainAxisAlignment: MainAxisAlignment.spaceBetween,
                            children: [
                              Text(
                                '50 MB',
                                style: GoogleFonts.ibmPlexSans(
                                  fontSize: 10,
                                  color: const Color(0xFF8899AA),
                                ),
                              ),
                              Text(
                                '500 MB',
                                style: GoogleFonts.ibmPlexSans(
                                  fontSize: 10,
                                  color: const Color(0xFF8899AA),
                                ),
                              ),
                            ],
                          ),
                          const SizedBox(height: 8),
                          Text(
                            'Controls how much data is cached locally for offline use. Higher limits allow more orders and reports to be stored.',
                            style: GoogleFonts.ibmPlexSans(
                              fontSize: 11,
                              color: const Color(0xFF8899AA),
                              height: 1.5,
                            ),
                          ),
                          const SizedBox(height: 16),
                          SizedBox(
                            width: double.infinity,
                            height: 46,
                            child: ElevatedButton(
                              onPressed: _saveStorageLimit,
                              style: ElevatedButton.styleFrom(
                                backgroundColor: AppTheme.accent,
                                foregroundColor: AppTheme.backgroundDark,
                                shape: RoundedRectangleBorder(
                                  borderRadius: BorderRadius.circular(12),
                                ),
                                elevation: 0,
                              ),
                              child: Text(
                                'Apply Limit',
                                style: GoogleFonts.ibmPlexSans(
                                  fontSize: 14,
                                  fontWeight: FontWeight.w600,
                                ),
                              ),
                            ),
                          ),
                        ],
                      ),
                    ),
                  ),
                ),

                const SliverToBoxAdapter(child: SizedBox(height: 100)),
              ],
            ),
    );
  }
}

// ── Profile Header ───────────────────────────────────────────────────────────

class _ProfileHeader extends StatelessWidget {
  final String name;
  final String employeeId;
  final String role;

  const _ProfileHeader({
    required this.name,
    required this.employeeId,
    required this.role,
  });

  @override
  Widget build(BuildContext context) {
    final initials = name.trim().isEmpty
        ? 'U'
        : name.trim().split(' ').map((w) => w[0]).take(2).join().toUpperCase();

    return Container(
      padding: const EdgeInsets.all(20),
      decoration: BoxDecoration(
        gradient: LinearGradient(
          colors: [
            AppTheme.primaryLight.withAlpha(180),
            AppTheme.primary.withAlpha(220),
          ],
          begin: Alignment.topLeft,
          end: Alignment.bottomRight,
        ),
        borderRadius: BorderRadius.circular(16),
        border: Border.all(color: AppTheme.accent.withAlpha(60), width: 1),
      ),
      child: Row(
        children: [
          Container(
            width: 56,
            height: 56,
            decoration: BoxDecoration(
              color: AppTheme.accent.withAlpha(40),
              shape: BoxShape.circle,
              border: Border.all(
                color: AppTheme.accent.withAlpha(100),
                width: 2,
              ),
            ),
            child: Center(
              child: Text(
                initials,
                style: GoogleFonts.ibmPlexSans(
                  fontSize: 20,
                  fontWeight: FontWeight.w700,
                  color: AppTheme.accent,
                ),
              ),
            ),
          ),
          const SizedBox(width: 16),
          Expanded(
            child: Column(
              crossAxisAlignment: CrossAxisAlignment.start,
              children: [
                Text(
                  name,
                  style: GoogleFonts.ibmPlexSans(
                    fontSize: 16,
                    fontWeight: FontWeight.w700,
                    color: Colors.white,
                  ),
                  overflow: TextOverflow.ellipsis,
                ),
                if (employeeId.isNotEmpty) ...[
                  const SizedBox(height: 2),
                  Text(
                    employeeId,
                    style: GoogleFonts.ibmPlexSans(
                      fontSize: 12,
                      color: const Color(0xFFB0C4D8),
                    ),
                  ),
                ],
                const SizedBox(height: 4),
                Container(
                  padding: const EdgeInsets.symmetric(
                    horizontal: 8,
                    vertical: 3,
                  ),
                  decoration: BoxDecoration(
                    color: AppTheme.accent.withAlpha(30),
                    borderRadius: BorderRadius.circular(6),
                  ),
                  child: Text(
                    role,
                    style: GoogleFonts.ibmPlexSans(
                      fontSize: 11,
                      fontWeight: FontWeight.w600,
                      color: AppTheme.accent,
                    ),
                  ),
                ),
              ],
            ),
          ),
        ],
      ),
    );
  }
}

// ── Section Card ─────────────────────────────────────────────────────────────

class _SectionCard extends StatelessWidget {
  final String icon;
  final String title;
  final Widget child;

  const _SectionCard({
    required this.icon,
    required this.title,
    required this.child,
  });

  @override
  Widget build(BuildContext context) {
    return Container(
      padding: const EdgeInsets.all(16),
      decoration: BoxDecoration(
        color: AppTheme.surfaceDark,
        borderRadius: BorderRadius.circular(16),
        border: Border.all(color: const Color(0xFF3A5068), width: 1),
      ),
      child: Column(
        crossAxisAlignment: CrossAxisAlignment.start,
        children: [
          Row(
            children: [
              CustomIconWidget(
                iconName: icon,
                color: AppTheme.accent,
                size: 16,
              ),
              const SizedBox(width: 8),
              Text(
                title,
                style: GoogleFonts.ibmPlexSans(
                  fontSize: 14,
                  fontWeight: FontWeight.w600,
                  color: Colors.white,
                ),
              ),
            ],
          ),
          const SizedBox(height: 16),
          child,
        ],
      ),
    );
  }
}

// ── Input Field ──────────────────────────────────────────────────────────────

class _InputField extends StatelessWidget {
  final TextEditingController controller;
  final String label;
  final String hint;
  final String icon;
  final TextInputType? keyboardType;

  const _InputField({
    required this.controller,
    required this.label,
    required this.hint,
    required this.icon,
    this.keyboardType,
  });

  @override
  Widget build(BuildContext context) {
    return TextField(
      controller: controller,
      keyboardType: keyboardType,
      style: GoogleFonts.ibmPlexSans(fontSize: 14, color: Colors.white),
      decoration: InputDecoration(
        labelText: label,
        hintText: hint,
        prefixIcon: Padding(
          padding: const EdgeInsets.symmetric(horizontal: 12),
          child: CustomIconWidget(
            iconName: icon,
            color: const Color(0xFF8899AA),
            size: 18,
          ),
        ),
        prefixIconConstraints: const BoxConstraints(minWidth: 44),
        filled: true,
        fillColor: AppTheme.surfaceVariantDark,
        border: OutlineInputBorder(
          borderRadius: BorderRadius.circular(12),
          borderSide: const BorderSide(color: Color(0xFF3A5068)),
        ),
        enabledBorder: OutlineInputBorder(
          borderRadius: BorderRadius.circular(12),
          borderSide: const BorderSide(color: Color(0xFF3A5068), width: 1),
        ),
        focusedBorder: OutlineInputBorder(
          borderRadius: BorderRadius.circular(12),
          borderSide: const BorderSide(color: AppTheme.accent, width: 1.5),
        ),
        labelStyle: GoogleFonts.ibmPlexSans(
          color: const Color(0xFF8899AA),
          fontSize: 13,
        ),
        hintStyle: GoogleFonts.ibmPlexSans(
          color: const Color(0xFF8899AA),
          fontSize: 13,
        ),
        contentPadding: const EdgeInsets.symmetric(
          horizontal: 14,
          vertical: 14,
        ),
      ),
    );
  }
}

// ── PIN Field ────────────────────────────────────────────────────────────────

class _PinField extends StatelessWidget {
  final TextEditingController controller;
  final String label;
  final bool isVisible;
  final VoidCallback onToggle;

  const _PinField({
    required this.controller,
    required this.label,
    required this.isVisible,
    required this.onToggle,
  });

  @override
  Widget build(BuildContext context) {
    return TextField(
      controller: controller,
      obscureText: !isVisible,
      keyboardType: TextInputType.number,
      maxLength: 8,
      style: GoogleFonts.ibmPlexSans(fontSize: 14, color: Colors.white),
      decoration: InputDecoration(
        labelText: label,
        counterText: '',
        prefixIcon: Padding(
          padding: const EdgeInsets.symmetric(horizontal: 12),
          child: CustomIconWidget(
            iconName: 'pin',
            color: const Color(0xFF8899AA),
            size: 18,
          ),
        ),
        prefixIconConstraints: const BoxConstraints(minWidth: 44),
        suffixIcon: GestureDetector(
          onTap: onToggle,
          child: Padding(
            padding: const EdgeInsets.symmetric(horizontal: 12),
            child: CustomIconWidget(
              iconName: isVisible ? 'visibility_off' : 'visibility',
              color: const Color(0xFF8899AA),
              size: 18,
            ),
          ),
        ),
        filled: true,
        fillColor: AppTheme.surfaceVariantDark,
        border: OutlineInputBorder(
          borderRadius: BorderRadius.circular(12),
          borderSide: const BorderSide(color: Color(0xFF3A5068)),
        ),
        enabledBorder: OutlineInputBorder(
          borderRadius: BorderRadius.circular(12),
          borderSide: const BorderSide(color: Color(0xFF3A5068), width: 1),
        ),
        focusedBorder: OutlineInputBorder(
          borderRadius: BorderRadius.circular(12),
          borderSide: const BorderSide(color: AppTheme.accent, width: 1.5),
        ),
        labelStyle: GoogleFonts.ibmPlexSans(
          color: const Color(0xFF8899AA),
          fontSize: 13,
        ),
        contentPadding: const EdgeInsets.symmetric(
          horizontal: 14,
          vertical: 14,
        ),
      ),
    );
  }
}

// ── Notification Toggle ──────────────────────────────────────────────────────

class _NotifToggle extends StatelessWidget {
  final String label;
  final String subtitle;
  final bool value;
  final void Function(bool) onChanged;

  const _NotifToggle({
    required this.label,
    required this.subtitle,
    required this.value,
    required this.onChanged,
  });

  @override
  Widget build(BuildContext context) {
    return Padding(
      padding: const EdgeInsets.only(bottom: 4),
      child: Row(
        children: [
          Expanded(
            child: Column(
              crossAxisAlignment: CrossAxisAlignment.start,
              children: [
                Text(
                  label,
                  style: GoogleFonts.ibmPlexSans(
                    fontSize: 13,
                    fontWeight: FontWeight.w500,
                    color: Colors.white,
                  ),
                ),
                Text(
                  subtitle,
                  style: GoogleFonts.ibmPlexSans(
                    fontSize: 11,
                    color: const Color(0xFF8899AA),
                  ),
                ),
              ],
            ),
          ),
          Switch(
            value: value,
            onChanged: onChanged,
            activeThumbColor: AppTheme.accent,
            activeTrackColor: AppTheme.accent.withAlpha(60),
            inactiveThumbColor: const Color(0xFF8899AA),
            inactiveTrackColor: AppTheme.surfaceVariantDark,
          ),
        ],
      ),
    );
  }
}

// ── Time Picker Button ───────────────────────────────────────────────────────

class _TimePickerButton extends StatelessWidget {
  final String label;
  final TimeOfDay time;
  final VoidCallback onTap;

  const _TimePickerButton({
    required this.label,
    required this.time,
    required this.onTap,
  });

  @override
  Widget build(BuildContext context) {
    final h = time.hour.toString().padLeft(2, '0');
    final m = time.minute.toString().padLeft(2, '0');
    return GestureDetector(
      onTap: onTap,
      child: Container(
        padding: const EdgeInsets.symmetric(horizontal: 14, vertical: 10),
        decoration: BoxDecoration(
          color: AppTheme.surfaceVariantDark,
          borderRadius: BorderRadius.circular(10),
          border: Border.all(color: const Color(0xFF3A5068), width: 1),
        ),
        child: Row(
          mainAxisAlignment: MainAxisAlignment.spaceBetween,
          children: [
            Text(
              label,
              style: GoogleFonts.ibmPlexSans(
                fontSize: 12,
                color: const Color(0xFF8899AA),
              ),
            ),
            Text(
              '$h:$m',
              style: GoogleFonts.ibmPlexSans(
                fontSize: 14,
                fontWeight: FontWeight.w600,
                color: AppTheme.accent,
              ),
            ),
          ],
        ),
      ),
    );
  }
}
