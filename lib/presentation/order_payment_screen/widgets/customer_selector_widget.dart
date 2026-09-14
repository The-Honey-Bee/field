import 'dart:ui';
import 'package:flutter/material.dart';
import '../../../theme/app_theme.dart';
import '../../../widgets/custom_icon_widget.dart';

class CustomerSelectorWidget extends StatefulWidget {
  final List<String> customers;
  final String? selectedCustomer;
  final ValueChanged<String> onCustomerSelected;

  const CustomerSelectorWidget({
    required this.customers,
    required this.selectedCustomer,
    required this.onCustomerSelected,
    super.key,
  });

  @override
  State<CustomerSelectorWidget> createState() => _CustomerSelectorWidgetState();
}

class _CustomerSelectorWidgetState extends State<CustomerSelectorWidget> {
  bool _isSearching = false;
  final TextEditingController _searchController = TextEditingController();
  List<String> _filtered = [];

  @override
  void initState() {
    super.initState();
    _filtered = widget.customers;
  }

  @override
  void dispose() {
    _searchController.dispose();
    super.dispose();
  }

  void _onSearchChanged(String q) {
    setState(() {
      _filtered = widget.customers
          .where((c) => c.toLowerCase().contains(q.toLowerCase()))
          .toList();
    });
  }

  @override
  Widget build(BuildContext context) {
    return ClipRRect(
      borderRadius: BorderRadius.circular(16),
      child: BackdropFilter(
        filter: ImageFilter.blur(sigmaX: 10, sigmaY: 10),
        child: Container(
          decoration: BoxDecoration(
            color: AppTheme.surfaceDark.withAlpha(179),
            borderRadius: BorderRadius.circular(16),
            border: Border.all(
              color: widget.selectedCustomer != null
                  ? AppTheme.accent.withAlpha(102)
                  : const Color(0xFF3A5068),
              width: widget.selectedCustomer != null ? 1 : 0.5,
            ),
          ),
          child: Column(
            children: [
              // Header tap area
              InkWell(
                onTap: () => setState(() => _isSearching = !_isSearching),
                borderRadius: BorderRadius.circular(16),
                child: Padding(
                  padding: const EdgeInsets.all(14),
                  child: Row(
                    children: [
                      Container(
                        width: 36,
                        height: 36,
                        decoration: BoxDecoration(
                          color: widget.selectedCustomer != null
                              ? AppTheme.accent.withAlpha(31)
                              : AppTheme.surfaceVariantDark,
                          borderRadius: BorderRadius.circular(10),
                        ),
                        child: Center(
                          child: CustomIconWidget(
                            iconName: 'store',
                            color: widget.selectedCustomer != null
                                ? AppTheme.accent
                                : const Color(0xFF8899AA),
                            size: 20,
                          ),
                        ),
                      ),
                      const SizedBox(width: 12),
                      Expanded(
                        child: Column(
                          crossAxisAlignment: CrossAxisAlignment.start,
                          children: [
                            Text(
                              'Customer',
                              style: const TextStyle(
                                fontSize: 11,
                                color: Color(0xFF8899AA),
                                fontWeight: FontWeight.w500,
                              ),
                            ),
                            const SizedBox(height: 2),
                            Text(
                              widget.selectedCustomer ?? 'Select customer',
                              style: TextStyle(
                                fontSize: 14,
                                fontWeight: FontWeight.w600,
                                color: widget.selectedCustomer != null
                                    ? Colors.white
                                    : const Color(0xFF8899AA),
                              ),
                            ),
                          ],
                        ),
                      ),
                      CustomIconWidget(
                        iconName: _isSearching
                            ? 'keyboard_arrow_up_rounded'
                            : 'keyboard_arrow_down_rounded',
                        color: const Color(0xFF8899AA),
                        size: 22,
                      ),
                    ],
                  ),
                ),
              ),
              // Expanded search + list
              AnimatedSize(
                duration: const Duration(milliseconds: 250),
                curve: Curves.easeOutCubic,
                child: _isSearching
                    ? Column(
                        children: [
                          Divider(color: const Color(0xFF3A5068), height: 1),
                          Padding(
                            padding: const EdgeInsets.fromLTRB(14, 10, 14, 6),
                            child: TextField(
                              controller: _searchController,
                              onChanged: _onSearchChanged,
                              autofocus: true,
                              style: const TextStyle(
                                color: Colors.white,
                                fontSize: 14,
                              ),
                              decoration: InputDecoration(
                                hintText: 'Search customers...',
                                hintStyle: const TextStyle(
                                  color: Color(0xFF8899AA),
                                  fontSize: 14,
                                ),
                                prefixIcon: Padding(
                                  padding: const EdgeInsets.only(
                                    left: 10,
                                    right: 8,
                                  ),
                                  child: CustomIconWidget(
                                    iconName: 'search',
                                    color: const Color(0xFF8899AA),
                                    size: 18,
                                  ),
                                ),
                                prefixIconConstraints: const BoxConstraints(
                                  minWidth: 40,
                                  minHeight: 40,
                                ),
                                filled: true,
                                fillColor: AppTheme.surfaceVariantDark,
                                border: OutlineInputBorder(
                                  borderRadius: BorderRadius.circular(10),
                                  borderSide: const BorderSide(
                                    color: Color(0xFF3A5068),
                                  ),
                                ),
                                enabledBorder: OutlineInputBorder(
                                  borderRadius: BorderRadius.circular(10),
                                  borderSide: const BorderSide(
                                    color: Color(0xFF3A5068),
                                  ),
                                ),
                                focusedBorder: OutlineInputBorder(
                                  borderRadius: BorderRadius.circular(10),
                                  borderSide: const BorderSide(
                                    color: AppTheme.accent,
                                    width: 1.5,
                                  ),
                                ),
                                contentPadding: const EdgeInsets.symmetric(
                                  horizontal: 12,
                                  vertical: 10,
                                ),
                                isDense: true,
                              ),
                            ),
                          ),
                          ..._filtered.map((c) {
                            final isSelected = c == widget.selectedCustomer;
                            return InkWell(
                              onTap: () {
                                widget.onCustomerSelected(c);
                                setState(() {
                                  _isSearching = false;
                                  _searchController.clear();
                                  _filtered = widget.customers;
                                });
                              },
                              child: Container(
                                padding: const EdgeInsets.symmetric(
                                  horizontal: 16,
                                  vertical: 12,
                                ),
                                decoration: BoxDecoration(
                                  color: isSelected
                                      ? AppTheme.accent.withAlpha(20)
                                      : Colors.transparent,
                                ),
                                child: Row(
                                  children: [
                                    Expanded(
                                      child: Text(
                                        c,
                                        style: TextStyle(
                                          fontSize: 14,
                                          color: isSelected
                                              ? AppTheme.accent
                                              : Colors.white,
                                          fontWeight: isSelected
                                              ? FontWeight.w600
                                              : FontWeight.w400,
                                        ),
                                      ),
                                    ),
                                    if (isSelected)
                                      CustomIconWidget(
                                        iconName: 'check_rounded',
                                        color: AppTheme.accent,
                                        size: 18,
                                      ),
                                  ],
                                ),
                              ),
                            );
                          }),
                          const SizedBox(height: 6),
                        ],
                      )
                    : const SizedBox.shrink(),
              ),
            ],
          ),
        ),
      ),
    );
  }
}
