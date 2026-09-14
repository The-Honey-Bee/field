import 'package:flutter/material.dart';
import '../../../theme/app_theme.dart';
import '../../../widgets/custom_icon_widget.dart';

class _Credential {
  final String role;
  final String employeeId;
  final String pin;
  const _Credential(this.role, this.employeeId, this.pin);
}

class DemoCredentialsWidget extends StatelessWidget {
  final void Function(String employeeId, String pin) onAutofill;

  const DemoCredentialsWidget({required this.onAutofill, super.key});

  static const List<_Credential> _credentials = [
    _Credential('Field Staff', 'ZZ-2024-001', '112233'),
    _Credential('Supervisor', 'ZZ-2024-050', '445566'),
    _Credential('Manager', 'ZZ-2024-100', '778899'),
  ];

  @override
  Widget build(BuildContext context) {
    return Container(
      padding: const EdgeInsets.all(16),
      decoration: BoxDecoration(
        color: AppTheme.surfaceVariantDark.withAlpha(128),
        borderRadius: BorderRadius.circular(12),
        border: Border.all(color: const Color(0xFF3A5068), width: 0.5),
      ),
      child: Column(
        crossAxisAlignment: CrossAxisAlignment.start,
        children: [
          Row(
            children: [
              CustomIconWidget(
                iconName: 'info_outlined',
                color: AppTheme.accent.withAlpha(179),
                size: 14,
              ),
              const SizedBox(width: 6),
              const Text(
                'Demo Accounts',
                style: TextStyle(
                  fontSize: 12,
                  fontWeight: FontWeight.w600,
                  color: Color(0xFF8899AA),
                ),
              ),
            ],
          ),
          const SizedBox(height: 12),
          ..._credentials.map(
            (c) => _CredentialRow(
              credential: c,
              onUse: () => onAutofill(c.employeeId, c.pin),
            ),
          ),
        ],
      ),
    );
  }
}

class _CredentialRow extends StatelessWidget {
  final _Credential credential;
  final VoidCallback onUse;

  const _CredentialRow({required this.credential, required this.onUse});

  @override
  Widget build(BuildContext context) {
    return Padding(
      padding: const EdgeInsets.only(bottom: 8),
      child: Row(
        children: [
          Expanded(
            child: Column(
              crossAxisAlignment: CrossAxisAlignment.start,
              children: [
                Text(
                  credential.role,
                  style: const TextStyle(
                    fontSize: 11,
                    fontWeight: FontWeight.w600,
                    color: Colors.white,
                  ),
                ),
                Text(
                  '${credential.employeeId} • PIN: ${credential.pin}',
                  style: const TextStyle(
                    fontSize: 10,
                    color: Color(0xFF8899AA),
                    fontFamily: 'monospace',
                  ),
                ),
              ],
            ),
          ),
          GestureDetector(
            onTap: onUse,
            child: Container(
              padding: const EdgeInsets.symmetric(horizontal: 10, vertical: 5),
              decoration: BoxDecoration(
                color: AppTheme.accent.withAlpha(31),
                borderRadius: BorderRadius.circular(6),
                border: Border.all(
                  color: AppTheme.accent.withAlpha(77),
                  width: 0.5,
                ),
              ),
              child: Text(
                'Use',
                style: TextStyle(
                  fontSize: 11,
                  fontWeight: FontWeight.w600,
                  color: AppTheme.accent,
                ),
              ),
            ),
          ),
        ],
      ),
    );
  }
}
