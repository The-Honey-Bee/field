import 'dart:ui';
import 'package:flutter/material.dart';
import '../../../theme/app_theme.dart';
import '../../../widgets/custom_icon_widget.dart';

class AiRecommendationCardWidget extends StatelessWidget {
  const AiRecommendationCardWidget({super.key});

  @override
  Widget build(BuildContext context) {
    // Adapted from Image 1.3 AI Recommendation card anatomy
    return ClipRRect(
      borderRadius: BorderRadius.circular(16),
      child: BackdropFilter(
        filter: ImageFilter.blur(sigmaX: 10, sigmaY: 10),
        child: Container(
          padding: const EdgeInsets.all(16),
          decoration: BoxDecoration(
            gradient: LinearGradient(
              begin: Alignment.topLeft,
              end: Alignment.bottomRight,
              colors: [
                AppTheme.accent.withAlpha(31),
                AppTheme.primaryLight.withAlpha(20),
              ],
            ),
            borderRadius: BorderRadius.circular(16),
            border: Border.all(
              color: AppTheme.accent.withAlpha(64),
              width: 0.8,
            ),
          ),
          child: Column(
            crossAxisAlignment: CrossAxisAlignment.start,
            children: [
              Row(
                children: [
                  Container(
                    width: 28,
                    height: 28,
                    decoration: BoxDecoration(
                      color: AppTheme.accent.withAlpha(38),
                      borderRadius: BorderRadius.circular(8),
                    ),
                    child: Center(
                      child: CustomIconWidget(
                        iconName: 'auto_awesome',
                        color: AppTheme.accent,
                        size: 16,
                      ),
                    ),
                  ),
                  const SizedBox(width: 10),
                  Text(
                    'Next Stop Recommendation',
                    style: TextStyle(
                      fontSize: 13,
                      fontWeight: FontWeight.w700,
                      color: AppTheme.accent,
                      fontStyle: FontStyle.italic,
                    ),
                  ),
                ],
              ),
              const SizedBox(height: 10),
              Text(
                'Head to City Hypermarket next — they close at 14:00 and your payment collection is overdue by 3 days. Al-Barakah Restaurant can be batched with your return route.',
                style: const TextStyle(
                  fontSize: 13,
                  color: Color(0xFFD0E8F0),
                  height: 1.5,
                ),
              ),
            ],
          ),
        ),
      ),
    );
  }
}
