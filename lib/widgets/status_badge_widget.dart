import 'package:flutter/material.dart';
import '../theme/app_theme.dart';

enum BadgeStatus { success, warning, error, info, neutral, pending }

class StatusBadgeWidget extends StatelessWidget {
  final String label;
  final BadgeStatus status;
  final double? fontSize;

  const StatusBadgeWidget({
    required this.label,
    required this.status,
    this.fontSize,
    super.key,
  });

  Color _bgColor() {
    switch (status) {
      case BadgeStatus.success:
        return AppTheme.success.withAlpha(38);
      case BadgeStatus.warning:
        return AppTheme.warning.withAlpha(38);
      case BadgeStatus.error:
        return AppTheme.error.withAlpha(38);
      case BadgeStatus.info:
        return AppTheme.info.withAlpha(38);
      case BadgeStatus.pending:
        return AppTheme.accent.withAlpha(31);
      case BadgeStatus.neutral:
        return const Color(0xFF3A5068);
    }
  }

  Color _textColor() {
    switch (status) {
      case BadgeStatus.success:
        return AppTheme.success;
      case BadgeStatus.warning:
        return AppTheme.warning;
      case BadgeStatus.error:
        return AppTheme.error;
      case BadgeStatus.info:
        return AppTheme.info;
      case BadgeStatus.pending:
        return AppTheme.accent;
      case BadgeStatus.neutral:
        return const Color(0xFF8899AA);
    }
  }

  @override
  Widget build(BuildContext context) {
    return Container(
      padding: const EdgeInsets.symmetric(horizontal: 8, vertical: 3),
      decoration: BoxDecoration(
        color: _bgColor(),
        borderRadius: BorderRadius.circular(8),
        border: Border.all(color: _textColor().withAlpha(77), width: 0.5),
      ),
      child: Text(
        label,
        style: TextStyle(
          fontSize: fontSize ?? 11,
          fontWeight: FontWeight.w600,
          color: _textColor(),
          letterSpacing: 0.2,
        ),
      ),
    );
  }
}
