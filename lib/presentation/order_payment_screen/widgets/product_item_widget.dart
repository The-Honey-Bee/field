import 'dart:ui';
import 'package:flutter/material.dart';
import '../../../theme/app_theme.dart';
import '../../../widgets/custom_icon_widget.dart';

class ProductItemWidget extends StatelessWidget {
  final String name;
  final String size;
  final double price;
  final String unit;
  final int quantity;
  final int stockAvailable;
  final VoidCallback onIncrement;
  final VoidCallback onDecrement;

  const ProductItemWidget({
    required this.name,
    required this.size,
    required this.price,
    required this.unit,
    required this.quantity,
    required this.stockAvailable,
    required this.onIncrement,
    required this.onDecrement,
    super.key,
  });

  @override
  Widget build(BuildContext context) {
    final hasQty = quantity > 0;
    final isLowStock = stockAvailable < 12;

    return ClipRRect(
      borderRadius: BorderRadius.circular(14),
      child: BackdropFilter(
        filter: ImageFilter.blur(sigmaX: 8, sigmaY: 8),
        child: AnimatedContainer(
          duration: const Duration(milliseconds: 200),
          padding: const EdgeInsets.symmetric(horizontal: 14, vertical: 12),
          decoration: BoxDecoration(
            color: hasQty
                ? AppTheme.accent.withAlpha(20)
                : AppTheme.surfaceDark.withAlpha(166),
            borderRadius: BorderRadius.circular(14),
            border: Border.all(
              color: hasQty
                  ? AppTheme.accent.withAlpha(89)
                  : const Color(0xFF3A5068),
              width: hasQty ? 1 : 0.5,
            ),
          ),
          child: Row(
            children: [
              // Product icon
              Container(
                width: 42,
                height: 42,
                decoration: BoxDecoration(
                  color: AppTheme.surfaceVariantDark,
                  borderRadius: BorderRadius.circular(10),
                  border: Border.all(
                    color: const Color(0xFF3A5068),
                    width: 0.5,
                  ),
                ),
                child: Center(
                  child: CustomIconWidget(
                    iconName: size.contains('18.9L')
                        ? 'water_drop'
                        : size.contains('13L')
                        ? 'water_drop'
                        : 'local_drink',
                    color: hasQty ? AppTheme.accent : const Color(0xFF8899AA),
                    size: 22,
                  ),
                ),
              ),
              const SizedBox(width: 12),
              // Product info
              Expanded(
                child: Column(
                  crossAxisAlignment: CrossAxisAlignment.start,
                  children: [
                    Row(
                      children: [
                        Expanded(
                          child: Text(
                            '$name $size',
                            style: TextStyle(
                              fontSize: 13,
                              fontWeight: FontWeight.w600,
                              color: hasQty
                                  ? Colors.white
                                  : const Color(0xFFD0DDE8),
                            ),
                          ),
                        ),
                        if (isLowStock)
                          Container(
                            padding: const EdgeInsets.symmetric(
                              horizontal: 6,
                              vertical: 2,
                            ),
                            decoration: BoxDecoration(
                              color: AppTheme.warning.withAlpha(31),
                              borderRadius: BorderRadius.circular(5),
                            ),
                            child: Text(
                              'Low',
                              style: TextStyle(
                                fontSize: 9,
                                fontWeight: FontWeight.w700,
                                color: AppTheme.warning,
                              ),
                            ),
                          ),
                      ],
                    ),
                    const SizedBox(height: 3),
                    Row(
                      children: [
                        Text(
                          'TZS ${price.toStringAsFixed(0)}',
                          style: TextStyle(
                            fontSize: 13,
                            fontWeight: FontWeight.w700,
                            color: AppTheme.accent,
                            fontFeatures: const [FontFeature.tabularFigures()],
                          ),
                        ),
                        Text(
                          ' / $unit',
                          style: const TextStyle(
                            fontSize: 11,
                            color: Color(0xFF8899AA),
                          ),
                        ),
                        const Spacer(),
                        Text(
                          'Stock: $stockAvailable',
                          style: const TextStyle(
                            fontSize: 10,
                            color: Color(0xFF8899AA),
                          ),
                        ),
                      ],
                    ),
                    if (hasQty) ...[
                      const SizedBox(height: 3),
                      Text(
                        'Subtotal: TZS ${(price * quantity).toStringAsFixed(0)}',
                        style: TextStyle(
                          fontSize: 11,
                          fontWeight: FontWeight.w600,
                          color: AppTheme.success,
                          fontFeatures: const [FontFeature.tabularFigures()],
                        ),
                      ),
                    ],
                  ],
                ),
              ),
              const SizedBox(width: 12),
              // Quantity stepper
              Row(
                mainAxisSize: MainAxisSize.min,
                children: [
                  _StepperButton(
                    icon: 'remove',
                    onTap: quantity > 0 ? onDecrement : null,
                    active: quantity > 0,
                  ),
                  AnimatedContainer(
                    duration: const Duration(milliseconds: 150),
                    width: 36,
                    height: 36,
                    decoration: BoxDecoration(
                      color: hasQty
                          ? AppTheme.accent.withAlpha(31)
                          : AppTheme.surfaceVariantDark,
                      borderRadius: BorderRadius.circular(8),
                    ),
                    child: Center(
                      child: Text(
                        '$quantity',
                        style: TextStyle(
                          fontSize: 15,
                          fontWeight: FontWeight.w700,
                          color: hasQty
                              ? AppTheme.accent
                              : const Color(0xFF8899AA),
                          fontFeatures: const [FontFeature.tabularFigures()],
                        ),
                      ),
                    ),
                  ),
                  _StepperButton(
                    icon: 'add',
                    onTap: quantity < stockAvailable ? onIncrement : null,
                    active: true,
                  ),
                ],
              ),
            ],
          ),
        ),
      ),
    );
  }
}

class _StepperButton extends StatelessWidget {
  final String icon;
  final VoidCallback? onTap;
  final bool active;

  const _StepperButton({
    required this.icon,
    required this.onTap,
    required this.active,
  });

  @override
  Widget build(BuildContext context) {
    return GestureDetector(
      onTap: onTap,
      child: AnimatedContainer(
        duration: const Duration(milliseconds: 150),
        width: 36,
        height: 36,
        decoration: BoxDecoration(
          color: onTap != null
              ? AppTheme.accent.withAlpha(38)
              : AppTheme.surfaceVariantDark.withAlpha(128),
          borderRadius: BorderRadius.circular(8),
          border: Border.all(
            color: onTap != null
                ? AppTheme.accent.withAlpha(77)
                : const Color(0xFF3A5068),
            width: 0.5,
          ),
        ),
        child: Center(
          child: CustomIconWidget(
            iconName: icon,
            color: onTap != null ? AppTheme.accent : const Color(0xFF8899AA),
            size: 18,
          ),
        ),
      ),
    );
  }
}
