import 'package:flutter/material.dart';
import '../../../theme/app_theme.dart';
import '../sign_up_login_screen.dart';
import '../../../widgets/custom_icon_widget.dart';

class RoleSelectorWidget extends StatelessWidget {
  final UserRole selectedRole;
  final ValueChanged<UserRole> onRoleChanged;

  const RoleSelectorWidget({
    required this.selectedRole,
    required this.onRoleChanged,
    super.key,
  });

  @override
  Widget build(BuildContext context) {
    final roles = [
      (UserRole.fieldStaff, 'Field Staff', 'local_shipping'),
      (UserRole.supervisor, 'Supervisor', 'supervisor_account'),
      (UserRole.manager, 'Manager', 'manage_accounts'),
    ];

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
          children: roles.map((r) {
            final isSelected = selectedRole == r.$1;
            return Expanded(
              child: Padding(
                padding: EdgeInsets.only(
                  right: r.$1 != UserRole.manager ? 8 : 0,
                ),
                child: GestureDetector(
                  onTap: () => onRoleChanged(r.$1),
                  child: AnimatedContainer(
                    duration: const Duration(milliseconds: 200),
                    padding: const EdgeInsets.symmetric(
                      vertical: 10,
                      horizontal: 8,
                    ),
                    decoration: BoxDecoration(
                      color: isSelected
                          ? AppTheme.accent.withAlpha(38)
                          : AppTheme.surfaceVariantDark.withAlpha(153),
                      borderRadius: BorderRadius.circular(10),
                      border: Border.all(
                        color: isSelected
                            ? AppTheme.accent
                            : const Color(0xFF3A5068),
                        width: isSelected ? 1.5 : 0.5,
                      ),
                    ),
                    child: Column(
                      children: [
                        CustomIconWidget(
                          iconName: r.$3,
                          color: isSelected
                              ? AppTheme.accent
                              : const Color(0xFF8899AA),
                          size: 18,
                        ),
                        const SizedBox(height: 4),
                        Text(
                          r.$2,
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
              ),
            );
          }).toList(),
        ),
      ],
    );
  }
}
