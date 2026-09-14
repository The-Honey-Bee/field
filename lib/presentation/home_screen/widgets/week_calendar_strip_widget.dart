import 'package:flutter/material.dart';
import '../../../theme/app_theme.dart';

class WeekCalendarStripWidget extends StatelessWidget {
  final DateTime currentDate;
  final int selectedIndex;
  final ValueChanged<int> onDaySelected;

  const WeekCalendarStripWidget({
    required this.currentDate,
    required this.selectedIndex,
    required this.onDaySelected,
    super.key,
  });

  @override
  Widget build(BuildContext context) {
    // Generate week starting Monday
    final weekStart = currentDate.subtract(
      Duration(days: currentDate.weekday - 1),
    );
    final days = ['Mon', 'Tue', 'Wed', 'Thu', 'Fri', 'Sat', 'Sun'];

    // Delivery indicators — empty until loaded from real data
    final deliveryIndicators = [0, 0, 0, 0, 0, 0, 0];

    return Column(
      crossAxisAlignment: CrossAxisAlignment.start,
      children: [
        Row(
          mainAxisAlignment: MainAxisAlignment.spaceBetween,
          children: List.generate(7, (i) {
            final day = weekStart.add(Duration(days: i));
            final isSelected = i == selectedIndex;
            final isToday =
                day.day == currentDate.day && day.month == currentDate.month;

            return GestureDetector(
              onTap: () => onDaySelected(i),
              child: SizedBox(
                width: 40,
                child: Column(
                  children: [
                    Text(
                      days[i],
                      style: TextStyle(
                        fontSize: 10,
                        fontWeight: FontWeight.w500,
                        color: isSelected
                            ? AppTheme.accent
                            : const Color(0xFF8899AA),
                      ),
                    ),
                    const SizedBox(height: 4),
                    AnimatedContainer(
                      duration: const Duration(milliseconds: 200),
                      width: 36,
                      height: 36,
                      decoration: BoxDecoration(
                        color: isSelected
                            ? AppTheme.accent
                            : isToday
                            ? AppTheme.accent.withAlpha(31)
                            : Colors.transparent,
                        borderRadius: BorderRadius.circular(10),
                        border: isToday && !isSelected
                            ? Border.all(
                                color: AppTheme.accent.withAlpha(102),
                                width: 1,
                              )
                            : null,
                      ),
                      child: Center(
                        child: Text(
                          '${day.day}',
                          style: TextStyle(
                            fontSize: 14,
                            fontWeight: FontWeight.w700,
                            color: isSelected
                                ? AppTheme.backgroundDark
                                : Colors.white,
                          ),
                        ),
                      ),
                    ),
                    const SizedBox(height: 4),
                    // Delivery dots
                    SizedBox(
                      height: 12,
                      child: deliveryIndicators[i] > 0
                          ? Row(
                              mainAxisAlignment: MainAxisAlignment.center,
                              children: List.generate(
                                deliveryIndicators[i].clamp(0, 3),
                                (j) => Container(
                                  width: 4,
                                  height: 4,
                                  margin: const EdgeInsets.only(right: 2),
                                  decoration: BoxDecoration(
                                    color: isSelected
                                        ? AppTheme.backgroundDark.withAlpha(153)
                                        : AppTheme.accent.withAlpha(128),
                                    shape: BoxShape.circle,
                                  ),
                                ),
                              ),
                            )
                          : const SizedBox.shrink(),
                    ),
                  ],
                ),
              ),
            );
          }),
        ),
      ],
    );
  }
}
