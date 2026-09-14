import 'dart:ui';
import 'package:flutter/material.dart';
import 'package:flutter/services.dart';
import '../../../theme/app_theme.dart';
import '../../../widgets/custom_icon_widget.dart';
import '../order_payment_screen.dart';

class PaymentMethodWidget extends StatelessWidget {
  final PaymentMethod selectedMethod;
  final ValueChanged<PaymentMethod> onMethodChanged;
  final double subtotal;
  final double amountReceived;
  final double change;
  final ValueChanged<double> onAmountChanged;

  const PaymentMethodWidget({
    required this.selectedMethod,
    required this.onMethodChanged,
    required this.subtotal,
    required this.amountReceived,
    required this.change,
    required this.onAmountChanged,
    super.key,
  });

  @override
  Widget build(BuildContext context) {
    return ClipRRect(
      borderRadius: BorderRadius.circular(16),
      child: BackdropFilter(
        filter: ImageFilter.blur(sigmaX: 10, sigmaY: 10),
        child: Container(
          padding: const EdgeInsets.all(16),
          decoration: BoxDecoration(
            color: AppTheme.surfaceDark.withAlpha(179),
            borderRadius: BorderRadius.circular(16),
            border: Border.all(color: const Color(0xFF3A5068), width: 0.5),
          ),
          child: Column(
            crossAxisAlignment: CrossAxisAlignment.start,
            children: [
              Row(
                children: [
                  CustomIconWidget(
                    iconName: 'payments_outlined',
                    color: AppTheme.accent,
                    size: 18,
                  ),
                  const SizedBox(width: 8),
                  const Text(
                    'Payment Method',
                    style: TextStyle(
                      fontSize: 14,
                      fontWeight: FontWeight.w700,
                      color: Colors.white,
                    ),
                  ),
                ],
              ),
              const SizedBox(height: 14),
              // 3-option toggle
              Row(
                children: [
                  _MethodChip(
                    label: 'Cash',
                    iconName: 'money',
                    isSelected: selectedMethod == PaymentMethod.cash,
                    onTap: () => onMethodChanged(PaymentMethod.cash),
                  ),
                  const SizedBox(width: 8),
                  _MethodChip(
                    label: 'Credit',
                    iconName: 'credit_card',
                    isSelected: selectedMethod == PaymentMethod.credit,
                    onTap: () => onMethodChanged(PaymentMethod.credit),
                  ),
                  const SizedBox(width: 8),
                  _MethodChip(
                    label: 'Mobile',
                    iconName: 'smartphone',
                    isSelected: selectedMethod == PaymentMethod.mobile,
                    onTap: () => onMethodChanged(PaymentMethod.mobile),
                  ),
                ],
              ),
              // Cash-specific: amount received + change calculator
              if (selectedMethod == PaymentMethod.cash) ...[
                const SizedBox(height: 16),
                Divider(color: const Color(0xFF3A5068), height: 1),
                const SizedBox(height: 14),
                const Text(
                  'Amount Received',
                  style: TextStyle(
                    fontSize: 12,
                    fontWeight: FontWeight.w500,
                    color: Color(0xFF8899AA),
                  ),
                ),
                const SizedBox(height: 8),
                _AmountField(
                  value: amountReceived,
                  onChanged: onAmountChanged,
                  subtotal: subtotal,
                ),
                const SizedBox(height: 14),
                // Quick amount buttons
                Row(
                  children: [
                    _QuickAmountButton(
                      label: 'Exact',
                      onTap: () => onAmountChanged(subtotal),
                    ),
                    const SizedBox(width: 8),
                    ...[50.0, 100.0, 200.0].map((amt) {
                      if (amt >= subtotal) {
                        return Padding(
                          padding: const EdgeInsets.only(right: 8),
                          child: _QuickAmountButton(
                            label: 'TZS ${amt.toInt()}',
                            onTap: () => onAmountChanged(amt),
                          ),
                        );
                      }
                      return const SizedBox.shrink();
                    }),
                  ],
                ),
                // Change display
                if (amountReceived > 0) ...[
                  const SizedBox(height: 14),
                  Container(
                    padding: const EdgeInsets.all(12),
                    decoration: BoxDecoration(
                      color: change >= 0
                          ? AppTheme.success.withAlpha(20)
                          : AppTheme.error.withAlpha(20),
                      borderRadius: BorderRadius.circular(10),
                      border: Border.all(
                        color: change >= 0
                            ? AppTheme.success.withAlpha(64)
                            : AppTheme.error.withAlpha(64),
                      ),
                    ),
                    child: Row(
                      children: [
                        CustomIconWidget(
                          iconName: change >= 0
                              ? 'check_circle_outlined'
                              : 'error_outline',
                          color: change >= 0
                              ? AppTheme.success
                              : AppTheme.error,
                          size: 18,
                        ),
                        const SizedBox(width: 10),
                        Expanded(
                          child: Column(
                            crossAxisAlignment: CrossAxisAlignment.start,
                            children: [
                              Text(
                                change >= 0
                                    ? 'Change to return'
                                    : 'Amount short',
                                style: TextStyle(
                                  fontSize: 11,
                                  color: change >= 0
                                      ? AppTheme.success
                                      : AppTheme.error,
                                  fontWeight: FontWeight.w500,
                                ),
                              ),
                              Text(
                                'TZS ${change.abs().toStringAsFixed(0)}',
                                style: TextStyle(
                                  fontSize: 20,
                                  fontWeight: FontWeight.w800,
                                  color: change >= 0
                                      ? AppTheme.success
                                      : AppTheme.error,
                                  fontFeatures: const [
                                    FontFeature.tabularFigures(),
                                  ],
                                ),
                              ),
                            ],
                          ),
                        ),
                      ],
                    ),
                  ),
                ],
              ],
              // Credit/Mobile confirmation note
              if (selectedMethod != PaymentMethod.cash) ...[
                const SizedBox(height: 14),
                Container(
                  padding: const EdgeInsets.all(12),
                  decoration: BoxDecoration(
                    color: AppTheme.info.withAlpha(20),
                    borderRadius: BorderRadius.circular(10),
                    border: Border.all(color: AppTheme.info.withAlpha(64)),
                  ),
                  child: Row(
                    children: [
                      CustomIconWidget(
                        iconName: selectedMethod == PaymentMethod.credit
                            ? 'credit_card'
                            : 'phone_android',
                        color: AppTheme.info,
                        size: 18,
                      ),
                      const SizedBox(width: 10),
                      Expanded(
                        child: Text(
                          selectedMethod == PaymentMethod.credit
                              ? 'Order will be recorded as credit. Customer account will be updated.'
                              : 'Confirm mobile payment reference number with customer before submitting.',
                          style: TextStyle(
                            fontSize: 12,
                            color: AppTheme.info,
                            height: 1.4,
                          ),
                        ),
                      ),
                    ],
                  ),
                ),
              ],
            ],
          ),
        ),
      ),
    );
  }
}

class _MethodChip extends StatelessWidget {
  final String label;
  final String iconName;
  final bool isSelected;
  final VoidCallback onTap;

  const _MethodChip({
    required this.label,
    required this.iconName,
    required this.isSelected,
    required this.onTap,
  });

  @override
  Widget build(BuildContext context) {
    return Expanded(
      child: GestureDetector(
        onTap: onTap,
        child: AnimatedContainer(
          duration: const Duration(milliseconds: 200),
          padding: const EdgeInsets.symmetric(vertical: 10),
          decoration: BoxDecoration(
            color: isSelected
                ? AppTheme.accent.withAlpha(38)
                : AppTheme.surfaceVariantDark.withAlpha(153),
            borderRadius: BorderRadius.circular(10),
            border: Border.all(
              color: isSelected ? AppTheme.accent : const Color(0xFF3A5068),
              width: isSelected ? 1.5 : 0.5,
            ),
          ),
          child: Column(
            children: [
              CustomIconWidget(
                iconName: iconName,
                color: isSelected ? AppTheme.accent : const Color(0xFF8899AA),
                size: 20,
              ),
              const SizedBox(height: 4),
              Text(
                label,
                style: TextStyle(
                  fontSize: 11,
                  fontWeight: isSelected ? FontWeight.w600 : FontWeight.w400,
                  color: isSelected ? AppTheme.accent : const Color(0xFF8899AA),
                ),
              ),
            ],
          ),
        ),
      ),
    );
  }
}

class _AmountField extends StatefulWidget {
  final double value;
  final ValueChanged<double> onChanged;
  final double subtotal;

  const _AmountField({
    required this.value,
    required this.onChanged,
    required this.subtotal,
  });

  @override
  State<_AmountField> createState() => _AmountFieldState();
}

class _AmountFieldState extends State<_AmountField> {
  late TextEditingController _ctrl;
  bool _focused = false;

  @override
  void initState() {
    super.initState();
    _ctrl = TextEditingController(
      text: widget.value > 0 ? widget.value.toStringAsFixed(2) : '',
    );
  }

  @override
  void didUpdateWidget(_AmountField old) {
    super.didUpdateWidget(old);
    if (!_focused) {
      _ctrl.text = widget.value > 0 ? widget.value.toStringAsFixed(2) : '';
    }
  }

  @override
  void dispose() {
    _ctrl.dispose();
    super.dispose();
  }

  @override
  Widget build(BuildContext context) {
    return Focus(
      onFocusChange: (f) => setState(() => _focused = f),
      child: TextField(
        controller: _ctrl,
        keyboardType: const TextInputType.numberWithOptions(decimal: true),
        inputFormatters: [FilteringTextInputFormatter.allow(RegExp(r'[\d.]'))],
        onChanged: (v) {
          final parsed = double.tryParse(v) ?? 0;
          widget.onChanged(parsed);
        },
        style: const TextStyle(
          fontSize: 20,
          fontWeight: FontWeight.w700,
          color: Colors.white,
          fontFeatures: [FontFeature.tabularFigures()],
        ),
        decoration: InputDecoration(
          prefixText: 'TZS  ',
          prefixStyle: const TextStyle(
            fontSize: 16,
            color: Color(0xFF8899AA),
            fontWeight: FontWeight.w500,
          ),
          hintText: widget.subtotal.toStringAsFixed(2),
          hintStyle: const TextStyle(
            fontSize: 20,
            color: Color(0xFF3A5068),
            fontWeight: FontWeight.w700,
          ),
          filled: true,
          fillColor: AppTheme.surfaceVariantDark,
          border: OutlineInputBorder(
            borderRadius: BorderRadius.circular(12),
            borderSide: const BorderSide(color: Color(0xFF3A5068)),
          ),
          enabledBorder: OutlineInputBorder(
            borderRadius: BorderRadius.circular(12),
            borderSide: const BorderSide(color: Color(0xFF3A5068)),
          ),
          focusedBorder: OutlineInputBorder(
            borderRadius: BorderRadius.circular(12),
            borderSide: const BorderSide(color: AppTheme.accent, width: 1.5),
          ),
          contentPadding: const EdgeInsets.symmetric(
            horizontal: 16,
            vertical: 14,
          ),
        ),
      ),
    );
  }
}

class _QuickAmountButton extends StatelessWidget {
  final String label;
  final VoidCallback onTap;

  const _QuickAmountButton({required this.label, required this.onTap});

  @override
  Widget build(BuildContext context) {
    return GestureDetector(
      onTap: onTap,
      child: Container(
        padding: const EdgeInsets.symmetric(horizontal: 12, vertical: 7),
        decoration: BoxDecoration(
          color: AppTheme.surfaceVariantDark,
          borderRadius: BorderRadius.circular(8),
          border: Border.all(color: const Color(0xFF3A5068), width: 0.5),
        ),
        child: Text(
          label,
          style: const TextStyle(
            fontSize: 12,
            fontWeight: FontWeight.w600,
            color: Colors.white,
          ),
        ),
      ),
    );
  }
}
