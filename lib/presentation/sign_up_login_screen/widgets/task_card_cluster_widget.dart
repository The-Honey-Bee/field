import 'dart:ui';
import 'package:flutter/material.dart';
import '../../../theme/app_theme.dart';

class TaskCardClusterWidget extends StatelessWidget {
  const TaskCardClusterWidget({super.key});

  @override
  Widget build(BuildContext context) {
    final cards = [
      _CardData(
        'Deliver to Al-Noor Supermarket',
        '8 stops • High priority • Route A',
        const Color(0xFF1E3A5F),
        -0.08,
      ),
      _CardData(
        'Collect Payment: City Hypermarket',
        '45 min • SAR 1,250 • Sales',
        const Color(0xFF1A3A4A),
        0.05,
      ),
      _CardData(
        'Inventory Check: Vehicle ZZ-012',
        '20 min • Stock count • Ops',
        const Color(0xFF2A3A2A),
        -0.04,
      ),
      _CardData(
        'Submit Daily Report',
        '15 min • End of shift • Admin',
        const Color(0xFF3A2A1A),
        0.09,
      ),
    ];

    return Stack(
      alignment: Alignment.center,
      children: List.generate(cards.length, (i) {
        final card = cards[i];
        return Positioned(
          top: i * 4.0,
          left: 8.0 + i * 6.0,
          right: 8.0 - i * 2.0,
          child: Transform.rotate(
            angle: card.rotation,
            child: ClipRRect(
              borderRadius: BorderRadius.circular(12),
              child: BackdropFilter(
                filter: ImageFilter.blur(sigmaX: 6, sigmaY: 6),
                child: Container(
                  padding: const EdgeInsets.symmetric(
                    horizontal: 14,
                    vertical: 10,
                  ),
                  decoration: BoxDecoration(
                    color: card.color.withAlpha(217),
                    borderRadius: BorderRadius.circular(12),
                    border: Border.all(
                      color: Colors.white.withAlpha(20),
                      width: 0.5,
                    ),
                  ),
                  child: Row(
                    children: [
                      Container(
                        width: 20,
                        height: 20,
                        decoration: BoxDecoration(
                          border: Border.all(
                            color: AppTheme.accent.withAlpha(153),
                          ),
                          borderRadius: BorderRadius.circular(5),
                        ),
                        child: i < 2
                            ? Icon(
                                Icons.check,
                                size: 13,
                                color: AppTheme.accent,
                              )
                            : null,
                      ),
                      const SizedBox(width: 10),
                      Expanded(
                        child: Column(
                          crossAxisAlignment: CrossAxisAlignment.start,
                          mainAxisSize: MainAxisSize.min,
                          children: [
                            Text(
                              card.title,
                              style: const TextStyle(
                                fontSize: 12,
                                fontWeight: FontWeight.w600,
                                color: Colors.white,
                              ),
                              maxLines: 1,
                              overflow: TextOverflow.ellipsis,
                            ),
                            const SizedBox(height: 2),
                            Text(
                              card.subtitle,
                              style: const TextStyle(
                                fontSize: 10,
                                color: Color(0xFF8899AA),
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
        );
      }),
    );
  }
}

class _CardData {
  final String title;
  final String subtitle;
  final Color color;
  final double rotation;

  const _CardData(this.title, this.subtitle, this.color, this.rotation);
}
