import 'dart:ui';
import 'package:flutter/material.dart';
import '../../../theme/app_theme.dart';
import '../../../widgets/custom_icon_widget.dart';

class TimelineTaskItemWidget extends StatelessWidget {
  final String time;
  final String timeRange;
  final String title;
  final String subtitle;
  final String iconName;
  final Color iconColor;
  final String status;
  final bool isCompleted;
  final bool isLast;
  final VoidCallback onToggle;

  const TimelineTaskItemWidget({
    required this.time,
    required this.timeRange,
    required this.title,
    required this.subtitle,
    required this.iconName,
    required this.iconColor,
    required this.status,
    required this.isCompleted,
    required this.isLast,
    required this.onToggle,
    super.key,
  });

  @override
  Widget build(BuildContext context) {
    // Adapted from Image 1.3 timeline anatomy:
    // time label left 15% + vertical connector line + task card right 80%
    return IntrinsicHeight(
      child: Row(
        crossAxisAlignment: CrossAxisAlignment.start,
        children: [
          // Left time column (15%)
          SizedBox(
            width: 52,
            child: Column(
              children: [
                Text(
                  time,
                  style: const TextStyle(
                    fontSize: 11,
                    fontWeight: FontWeight.w500,
                    color: Color(0xFF8899AA),
                    fontFeatures: [FontFeature.tabularFigures()],
                  ),
                ),
                const SizedBox(height: 6),
                Expanded(
                  child: isLast
                      ? const SizedBox.shrink()
                      : Center(
                          child: Container(
                            width: 1,
                            color: const Color(0xFF3A5068),
                          ),
                        ),
                ),
              ],
            ),
          ),
          const SizedBox(width: 8),
          // Right task card (80%)
          Expanded(
            child: Padding(
              padding: EdgeInsets.only(bottom: isLast ? 0 : 12),
              child: ClipRRect(
                borderRadius: BorderRadius.circular(14),
                child: BackdropFilter(
                  filter: ImageFilter.blur(sigmaX: 8, sigmaY: 8),
                  child: Container(
                    padding: const EdgeInsets.all(14),
                    decoration: BoxDecoration(
                      color: isCompleted
                          ? AppTheme.surfaceVariantDark.withAlpha(102)
                          : AppTheme.surfaceDark.withAlpha(179),
                      borderRadius: BorderRadius.circular(14),
                      border: Border.all(
                        color: status == 'in_progress'
                            ? AppTheme.accent.withAlpha(102)
                            : const Color(0xFF3A5068),
                        width: status == 'in_progress' ? 1 : 0.5,
                      ),
                    ),
                    child: Row(
                      children: [
                        // Icon container
                        Container(
                          width: 38,
                          height: 38,
                          decoration: BoxDecoration(
                            color: iconColor.withAlpha(31),
                            borderRadius: BorderRadius.circular(10),
                          ),
                          child: Center(
                            child: CustomIconWidget(
                              iconName: iconName,
                              color: isCompleted
                                  ? iconColor.withAlpha(102)
                                  : iconColor,
                              size: 20,
                            ),
                          ),
                        ),
                        const SizedBox(width: 12),
                        // Content
                        Expanded(
                          child: Column(
                            crossAxisAlignment: CrossAxisAlignment.start,
                            children: [
                              Text(
                                timeRange,
                                style: TextStyle(
                                  fontSize: 10,
                                  color: status == 'in_progress'
                                      ? AppTheme.accent
                                      : const Color(0xFF8899AA),
                                  fontWeight: FontWeight.w500,
                                ),
                              ),
                              const SizedBox(height: 2),
                              Text(
                                title,
                                style: TextStyle(
                                  fontSize: 13,
                                  fontWeight: FontWeight.w600,
                                  color: isCompleted
                                      ? const Color(0xFF8899AA)
                                      : Colors.white,
                                  decoration: isCompleted
                                      ? TextDecoration.lineThrough
                                      : null,
                                  decorationColor: const Color(0xFF8899AA),
                                ),
                                maxLines: 2,
                                overflow: TextOverflow.ellipsis,
                              ),
                              const SizedBox(height: 3),
                              Text(
                                subtitle,
                                style: const TextStyle(
                                  fontSize: 11,
                                  color: Color(0xFF8899AA),
                                ),
                              ),
                            ],
                          ),
                        ),
                        const SizedBox(width: 8),
                        // Checkbox
                        GestureDetector(
                          onTap: onToggle,
                          child: AnimatedContainer(
                            duration: const Duration(milliseconds: 200),
                            width: 24,
                            height: 24,
                            decoration: BoxDecoration(
                              color: isCompleted
                                  ? AppTheme.accent
                                  : Colors.transparent,
                              borderRadius: BorderRadius.circular(6),
                              border: Border.all(
                                color: isCompleted
                                    ? AppTheme.accent
                                    : const Color(0xFF3A5068),
                                width: 1.5,
                              ),
                            ),
                            child: isCompleted
                                ? const Icon(
                                    Icons.check_rounded,
                                    size: 14,
                                    color: AppTheme.backgroundDark,
                                  )
                                : null,
                          ),
                        ),
                      ],
                    ),
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
