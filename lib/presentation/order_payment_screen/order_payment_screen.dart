import 'dart:ui';

import 'package:flutter/material.dart';
import 'package:go_router/go_router.dart';

import '../../services/auth_service.dart';
import '../../services/supabase_service.dart';
import '../../theme/app_theme.dart';
import '../../widgets/custom_icon_widget.dart';
import '../../services/offline_sync_service.dart';
import '../../routes/app_routes.dart';
import './widgets/customer_selector_widget.dart';
import './widgets/order_summary_widget.dart';
import './widgets/payment_method_widget.dart';
import './widgets/product_item_widget.dart';

class _ProductModel {
  final String id;
  final String name;
  final String size;
  final double price;
  final String unit;
  int quantity;
  final int stockAvailable;

  _ProductModel({
    required this.id,
    required this.name,
    required this.size,
    required this.price,
    required this.unit,
    this.quantity = 0,
    required this.stockAvailable,
  });

  factory _ProductModel.fromMap(Map<String, dynamic> map) {
    return _ProductModel(
      id: map['id'] as String,
      name: map['name'] as String,
      size: map['size'] as String,
      price: (map['price'] as num).toDouble(),
      unit: map['unit'] as String,
      quantity: map['quantity'] as int,
      stockAvailable: map['stockAvailable'] as int,
    );
  }
}

enum PaymentMethod { cash, credit, mobile }

class OrderPaymentScreen extends StatefulWidget {
  const OrderPaymentScreen({super.key});

  @override
  State<OrderPaymentScreen> createState() => _OrderPaymentScreenState();
}

class _OrderPaymentScreenState extends State<OrderPaymentScreen>
    with SingleTickerProviderStateMixin {
  String? _selectedCustomer;
  PaymentMethod _paymentMethod = PaymentMethod.cash;
  double _amountReceived = 0;
  bool _isSubmitting = false;
  SyncStatus? _lastSyncStatus;
  late AnimationController _slideController;
  late Animation<Offset> _slideAnimation;

  final OfflineSyncService _syncService = OfflineSyncService.instance;
  final AuthService _authService = AuthService.instance;

  // Product catalog — loaded from Supabase
  List<_ProductModel> _products = [];
  bool _isLoadingProducts = false;

  // Customers — loaded from Supabase
  List<String> _customers = [];
  bool _isLoadingCustomers = false;

  @override
  void initState() {
    super.initState();
    _slideController = AnimationController(
      vsync: this,
      duration: const Duration(milliseconds: 320),
    );
    _slideAnimation =
        Tween<Offset>(begin: const Offset(0, 0.06), end: Offset.zero).animate(
          CurvedAnimation(parent: _slideController, curve: Curves.easeOutCubic),
        );
    _slideController.forward();
    _loadCustomers();
    _loadProducts();
  }

  @override
  void dispose() {
    _slideController.dispose();
    super.dispose();
  }

  Future<void> _loadCustomers() async {
    setState(() => _isLoadingCustomers = true);
    try {
      final client = SupabaseService.instance.client;
      final res = await client
          .from('customers')
          .select('name')
          .order('name', ascending: true);
      final list = List<Map<String, dynamic>>.from(res);
      setState(() {
        _customers = list
            .map((c) => c['name']?.toString() ?? '')
            .where((n) => n.isNotEmpty)
            .toList();
      });
    } catch (e) {
      debugPrint('[Order] Load customers error: $e');
    } finally {
      if (mounted) setState(() => _isLoadingCustomers = false);
    }
  }

  Future<void> _loadProducts() async {
    setState(() => _isLoadingProducts = true);
    try {
      final client = SupabaseService.instance.client;
      final res = await client
          .from('products')
          .select()
          .order('name', ascending: true);
      final list = List<Map<String, dynamic>>.from(res);
      if (mounted) {
        setState(() {
          _products = list.map((p) {
            return _ProductModel(
              id: p['id']?.toString() ?? '',
              name: p['name']?.toString() ?? '',
              size: p['size']?.toString() ?? '',
              price: (p['price'] as num?)?.toDouble() ?? 0.0,
              unit: p['unit']?.toString() ?? 'unit',
              quantity: 0,
              stockAvailable: (p['stock_available'] as num?)?.toInt() ?? 999,
            );
          }).toList();
        });
      }
    } catch (e) {
      debugPrint('[Order] Load products error: $e');
      // Keep empty list — user will see empty products section
    } finally {
      if (mounted) setState(() => _isLoadingProducts = false);
    }
  }

  Future<void> _showAddCustomerDialog() async {
    final nameController = TextEditingController();
    final phoneController = TextEditingController();
    final formKey = GlobalKey<FormState>();

    await showDialog(
      context: context,
      builder: (ctx) => AlertDialog(
        backgroundColor: AppTheme.surfaceDark,
        shape: RoundedRectangleBorder(borderRadius: BorderRadius.circular(16)),
        title: const Text(
          'Add Customer',
          style: TextStyle(color: Colors.white, fontWeight: FontWeight.w700),
        ),
        content: Form(
          key: formKey,
          child: Column(
            mainAxisSize: MainAxisSize.min,
            children: [
              TextFormField(
                controller: nameController,
                style: const TextStyle(color: Colors.white),
                decoration: InputDecoration(
                  labelText: 'Customer Name',
                  labelStyle: const TextStyle(color: Color(0xFF8899AA)),
                  enabledBorder: OutlineInputBorder(
                    borderRadius: BorderRadius.circular(10),
                    borderSide: const BorderSide(color: Color(0xFF3A5068)),
                  ),
                  focusedBorder: OutlineInputBorder(
                    borderRadius: BorderRadius.circular(10),
                    borderSide: const BorderSide(
                      color: AppTheme.accent,
                      width: 1.5,
                    ),
                  ),
                  errorBorder: OutlineInputBorder(
                    borderRadius: BorderRadius.circular(10),
                    borderSide: const BorderSide(color: AppTheme.error),
                  ),
                  focusedErrorBorder: OutlineInputBorder(
                    borderRadius: BorderRadius.circular(10),
                    borderSide: const BorderSide(
                      color: AppTheme.error,
                      width: 1.5,
                    ),
                  ),
                  filled: true,
                  fillColor: AppTheme.surfaceVariantDark,
                ),
                validator: (v) =>
                    (v == null || v.trim().isEmpty) ? 'Name is required' : null,
              ),
              const SizedBox(height: 12),
              TextFormField(
                controller: phoneController,
                style: const TextStyle(color: Colors.white),
                keyboardType: TextInputType.phone,
                decoration: InputDecoration(
                  labelText: 'Phone (optional)',
                  labelStyle: const TextStyle(color: Color(0xFF8899AA)),
                  enabledBorder: OutlineInputBorder(
                    borderRadius: BorderRadius.circular(10),
                    borderSide: const BorderSide(color: Color(0xFF3A5068)),
                  ),
                  focusedBorder: OutlineInputBorder(
                    borderRadius: BorderRadius.circular(10),
                    borderSide: const BorderSide(
                      color: AppTheme.accent,
                      width: 1.5,
                    ),
                  ),
                  filled: true,
                  fillColor: AppTheme.surfaceVariantDark,
                ),
              ),
            ],
          ),
        ),
        actions: [
          TextButton(
            onPressed: () => Navigator.of(ctx).pop(),
            child: const Text(
              'Cancel',
              style: TextStyle(color: Color(0xFF8899AA)),
            ),
          ),
          ElevatedButton(
            onPressed: () async {
              if (!formKey.currentState!.validate()) return;
              try {
                final client = SupabaseService.instance.client;
                final uid = _authService.currentUserId;
                await client.from('customers').insert({
                  'name': nameController.text.trim(),
                  'phone': phoneController.text.trim(),
                  'created_by': uid.isNotEmpty ? uid : null,
                });
                if (ctx.mounted) Navigator.of(ctx).pop();
                await _loadCustomers();
                setState(() => _selectedCustomer = nameController.text.trim());
              } catch (e) {
                debugPrint('[Order] Add customer error: $e');
              }
            },
            style: ElevatedButton.styleFrom(
              backgroundColor: AppTheme.accent,
              foregroundColor: AppTheme.backgroundDark,
              shape: RoundedRectangleBorder(
                borderRadius: BorderRadius.circular(10),
              ),
            ),
            child: const Text(
              'Add',
              style: TextStyle(fontWeight: FontWeight.w700),
            ),
          ),
        ],
      ),
    );
    nameController.dispose();
    phoneController.dispose();
  }

  double get _subtotal =>
      _products.fold(0, (sum, p) => sum + (p.price * p.quantity));

  int get _totalItems => _products.fold(0, (sum, p) => sum + p.quantity);

  double get _change => (_amountReceived - _subtotal).clamp(0, double.infinity);

  bool get _hasItems => _totalItems > 0;
  bool get _canSubmit => _hasItems && _selectedCustomer != null;
  bool get _isOffline => !_syncService.isOnline;

  void _updateQuantity(int index, int delta) {
    setState(() {
      final newQty = (_products[index].quantity + delta).clamp(
        0,
        _products[index].stockAvailable,
      );
      _products[index].quantity = newQty;
    });
  }

  Future<void> _handleSubmit() async {
    if (!_canSubmit) return;
    setState(() => _isSubmitting = true);

    try {
      final client = SupabaseService.instance.client;
      final uid = _authService.currentUserId;
      final items = _products
          .where((p) => p.quantity > 0)
          .map(
            (p) => {
              'id': p.id,
              'name': '${p.name} ${p.size}',
              'qty': p.quantity,
              'price': p.price,
              'subtotal': p.price * p.quantity,
            },
          )
          .toList();

      // Try direct Supabase insert first
      try {
        await client.from('orders').insert({
          'user_id': uid.isNotEmpty ? uid : null,
          'customer_name': _selectedCustomer,
          'payment_method': _paymentMethod.name,
          'items': items,
          'subtotal': _subtotal,
          'amount_received': _amountReceived,
          'change_amount': _change,
          'sync_status': 'synced',
          'created_at': DateTime.now().toIso8601String(),
        });

        if (!mounted) return;
        setState(() {
          _isSubmitting = false;
          _lastSyncStatus = SyncStatus.synced;
          _selectedCustomer = null;
          _paymentMethod = PaymentMethod.cash;
          _amountReceived = 0;
          for (final p in _products) {
            p.quantity = 0;
          }
        });
        _showSyncSnackBar(SyncStatus.synced);
        context.go('/home-screen');
        return;
      } catch (dbError) {
        debugPrint(
          '[Order] Direct insert failed, falling back to offline: $dbError',
        );
      }

      // Fallback to offline sync
      final order = LocalOrder(
        localId: OfflineSyncService.generateLocalId(),
        staffId: uid.isNotEmpty ? uid : 'ZZ-2024-001',
        customerName: _selectedCustomer!,
        paymentMethod: _paymentMethod.name,
        items: items,
        subtotal: _subtotal,
        amountReceived: _amountReceived,
        changeAmount: _change,
      );

      final status = await _syncService.saveOrder(order);

      if (!mounted) return;

      setState(() {
        _isSubmitting = false;
        _lastSyncStatus = status;
        _selectedCustomer = null;
        _paymentMethod = PaymentMethod.cash;
        _amountReceived = 0;
        for (final p in _products) {
          p.quantity = 0;
        }
      });

      _showSyncSnackBar(status);
      context.go('/home-screen');
    } catch (e) {
      debugPrint('[Order] Submit error: $e');
      if (mounted) {
        setState(() => _isSubmitting = false);
        ScaffoldMessenger.of(context).showSnackBar(
          SnackBar(
            content: Text('Failed to submit order: ${e.toString()}'),
            backgroundColor: AppTheme.error,
            behavior: SnackBarBehavior.floating,
            shape: RoundedRectangleBorder(
              borderRadius: BorderRadius.circular(10),
            ),
          ),
        );
      }
    }
  }

  void _showSyncSnackBar(SyncStatus status) {
    final isOffline = status == SyncStatus.pending;
    final isFailed = status == SyncStatus.failed;

    String message;
    Color color;
    String icon;

    if (isOffline) {
      message = 'Order saved locally — will sync when online';
      color = AppTheme.warning;
      icon = 'cloud_off';
    } else if (isFailed) {
      message = 'Order saved locally — sync failed, will retry';
      color = AppTheme.error;
      icon = 'sync_problem';
    } else {
      message = 'Order submitted & synced successfully';
      color = AppTheme.success;
      icon = 'cloud_done';
    }

    ScaffoldMessenger.of(context).showSnackBar(
      SnackBar(
        content: Row(
          children: [
            Icon(Icons.cloud_off, color: Colors.white, size: 16),
            const SizedBox(width: 8),
            Expanded(
              child: Text(
                message,
                style: const TextStyle(color: Colors.white, fontSize: 13),
              ),
            ),
          ],
        ),
        backgroundColor: color,
        behavior: SnackBarBehavior.floating,
        shape: RoundedRectangleBorder(borderRadius: BorderRadius.circular(10)),
        duration: const Duration(seconds: 3),
      ),
    );
  }

  @override
  Widget build(BuildContext context) {
    return ListenableBuilder(
      listenable: _syncService,
      builder: (context, _) {
        return Scaffold(
          backgroundColor: AppTheme.backgroundDark,
          extendBodyBehindAppBar: true,
          appBar: PreferredSize(
            preferredSize: const Size.fromHeight(60),
            child: ClipRect(
              child: BackdropFilter(
                filter: ImageFilter.blur(sigmaX: 16, sigmaY: 16),
                child: Container(
                  decoration: BoxDecoration(
                    color: AppTheme.backgroundDark.withAlpha(204),
                    border: const Border(
                      bottom: BorderSide(color: Color(0xFF243447), width: 0.5),
                    ),
                  ),
                  child: SafeArea(
                    bottom: false,
                    child: Padding(
                      padding: const EdgeInsets.symmetric(
                        horizontal: 16,
                        vertical: 10,
                      ),
                      child: Row(
                        children: [
                          GestureDetector(
                            onTap: () => context.pop(),
                            child: Container(
                              width: 36,
                              height: 36,
                              decoration: BoxDecoration(
                                color: AppTheme.surfaceVariantDark.withAlpha(
                                  153,
                                ),
                                borderRadius: BorderRadius.circular(10),
                              ),
                              child: Center(
                                child: CustomIconWidget(
                                  iconName: 'arrow_back_ios_new',
                                  color: Colors.white,
                                  size: 18,
                                ),
                              ),
                            ),
                          ),
                          const SizedBox(width: 12),
                          Expanded(
                            child: Column(
                              crossAxisAlignment: CrossAxisAlignment.start,
                              mainAxisSize: MainAxisSize.min,
                              children: [
                                const Text(
                                  'New Order',
                                  style: TextStyle(
                                    fontSize: 17,
                                    fontWeight: FontWeight.w700,
                                    color: Colors.white,
                                  ),
                                ),
                                Text(
                                  'Capture & collect payment',
                                  style: const TextStyle(
                                    fontSize: 11,
                                    color: Color(0xFF8899AA),
                                  ),
                                ),
                              ],
                            ),
                          ),
                          // Sync status badge
                          _SyncBadge(syncService: _syncService),
                        ],
                      ),
                    ),
                  ),
                ),
              ),
            ),
          ),
          body: Column(
            children: [
              SizedBox(height: MediaQuery.of(context).padding.top + 60),
              // Offline / sync banner
              _SyncBanner(syncService: _syncService),
              Expanded(
                child: SlideTransition(
                  position: _slideAnimation,
                  child: SingleChildScrollView(
                    padding: EdgeInsets.fromLTRB(
                      16,
                      8,
                      16,
                      MediaQuery.of(context).padding.bottom + 88,
                    ),
                    child: Column(
                      crossAxisAlignment: CrossAxisAlignment.stretch,
                      children: [
                        CustomerSelectorWidget(
                          customers: _customers,
                          selectedCustomer: _selectedCustomer,
                          onCustomerSelected: (c) =>
                              setState(() => _selectedCustomer = c),
                        ),
                        const SizedBox(height: 8),
                        // Manage Customers button
                        SizedBox(
                          width: double.infinity,
                          child: OutlinedButton.icon(
                            onPressed: () async {
                              await context.push(
                                AppRoutes.customerManagementScreen,
                              );
                              // Reload customers after returning
                              await _loadCustomers();
                            },
                            icon: CustomIconWidget(
                              iconName: 'people_outlined',
                              color: AppTheme.accent,
                              size: 18,
                            ),
                            label: const Text(
                              'Manage Customers',
                              style: TextStyle(
                                fontSize: 13,
                                fontWeight: FontWeight.w600,
                                color: AppTheme.accent,
                              ),
                            ),
                            style: OutlinedButton.styleFrom(
                              side: BorderSide(
                                color: AppTheme.accent.withAlpha(102),
                              ),
                              shape: RoundedRectangleBorder(
                                borderRadius: BorderRadius.circular(10),
                              ),
                              padding: const EdgeInsets.symmetric(vertical: 10),
                            ),
                          ),
                        ),
                        const SizedBox(height: 16),
                        Row(
                          children: [
                            const Text(
                              'Products',
                              style: TextStyle(
                                fontSize: 15,
                                fontWeight: FontWeight.w700,
                                color: Colors.white,
                              ),
                            ),
                            const Spacer(),
                            if (_hasItems)
                              Container(
                                padding: const EdgeInsets.symmetric(
                                  horizontal: 10,
                                  vertical: 4,
                                ),
                                decoration: BoxDecoration(
                                  color: AppTheme.accent.withAlpha(31),
                                  borderRadius: BorderRadius.circular(20),
                                ),
                                child: Text(
                                  '$_totalItems items',
                                  style: TextStyle(
                                    fontSize: 11,
                                    fontWeight: FontWeight.w600,
                                    color: AppTheme.accent,
                                  ),
                                ),
                              ),
                          ],
                        ),
                        const SizedBox(height: 10),
                        if (_isLoadingProducts)
                          const Center(
                            child: Padding(
                              padding: EdgeInsets.symmetric(vertical: 24),
                              child: CircularProgressIndicator(
                                color: AppTheme.accent,
                              ),
                            ),
                          )
                        else if (_products.isEmpty)
                          Container(
                            padding: const EdgeInsets.symmetric(vertical: 24),
                            decoration: BoxDecoration(
                              color: AppTheme.surfaceDark.withAlpha(128),
                              borderRadius: BorderRadius.circular(14),
                              border: Border.all(
                                color: const Color(0xFF3A5068),
                                width: 0.5,
                              ),
                            ),
                            child: const Center(
                              child: Text(
                                'No products available.\nAdd products in the backend to start taking orders.',
                                textAlign: TextAlign.center,
                                style: TextStyle(
                                  fontSize: 13,
                                  color: Color(0xFF8899AA),
                                  height: 1.5,
                                ),
                              ),
                            ),
                          )
                        else
                          ...List.generate(_products.length, (i) {
                            return Padding(
                              padding: const EdgeInsets.only(bottom: 10),
                              child: ProductItemWidget(
                                name: _products[i].name,
                                size: _products[i].size,
                                price: _products[i].price,
                                unit: _products[i].unit,
                                quantity: _products[i].quantity,
                                stockAvailable: _products[i].stockAvailable,
                                onIncrement: () => _updateQuantity(i, 1),
                                onDecrement: () => _updateQuantity(i, -1),
                              ),
                            );
                          }),
                        const SizedBox(height: 6),
                        if (_hasItems) ...[
                          OrderSummaryWidget(
                            products: _products
                                .where((p) => p.quantity > 0)
                                .map(
                                  (p) => {
                                    'name': '${p.name} ${p.size}',
                                    'qty': p.quantity,
                                    'price': p.price,
                                    'subtotal': p.price * p.quantity,
                                  },
                                )
                                .toList(),
                            subtotal: _subtotal,
                          ),
                          const SizedBox(height: 16),
                        ],
                        PaymentMethodWidget(
                          selectedMethod: _paymentMethod,
                          onMethodChanged: (m) =>
                              setState(() => _paymentMethod = m),
                          subtotal: _subtotal,
                          amountReceived: _amountReceived,
                          change: _change,
                          onAmountChanged: (v) =>
                              setState(() => _amountReceived = v),
                        ),
                        const SizedBox(height: 24),
                        // Pending sync count chip (if any)
                        if (_syncService.totalPendingCount > 0)
                          _PendingSyncChip(syncService: _syncService),
                        if (_syncService.totalPendingCount > 0)
                          const SizedBox(height: 12),
                        SizedBox(
                          height: 54,
                          child: ElevatedButton(
                            onPressed: _canSubmit && !_isSubmitting
                                ? _handleSubmit
                                : null,
                            style: ElevatedButton.styleFrom(
                              backgroundColor: _canSubmit
                                  ? AppTheme.accent
                                  : AppTheme.surfaceVariantDark,
                              foregroundColor: _canSubmit
                                  ? AppTheme.backgroundDark
                                  : const Color(0xFF8899AA),
                              shape: RoundedRectangleBorder(
                                borderRadius: BorderRadius.circular(14),
                              ),
                              elevation: 0,
                            ),
                            child: _isSubmitting
                                ? SizedBox(
                                    width: 22,
                                    height: 22,
                                    child: CircularProgressIndicator(
                                      strokeWidth: 2,
                                      color: AppTheme.backgroundDark,
                                    ),
                                  )
                                : Row(
                                    mainAxisAlignment: MainAxisAlignment.center,
                                    children: [
                                      Icon(
                                        _isOffline
                                            ? Icons.save_outlined
                                            : Icons.send_rounded,
                                        color: _canSubmit
                                            ? AppTheme.backgroundDark
                                            : const Color(0xFF8899AA),
                                        size: 20,
                                      ),
                                      const SizedBox(width: 10),
                                      Text(
                                        _isOffline
                                            ? 'Save Offline'
                                            : 'Submit Order',
                                        style: const TextStyle(
                                          fontSize: 16,
                                          fontWeight: FontWeight.w700,
                                        ),
                                      ),
                                      if (_hasItems) ...[
                                        const SizedBox(width: 8),
                                        Container(
                                          padding: const EdgeInsets.symmetric(
                                            horizontal: 8,
                                            vertical: 2,
                                          ),
                                          decoration: BoxDecoration(
                                            color: AppTheme.backgroundDark
                                                .withAlpha(51),
                                            borderRadius: BorderRadius.circular(
                                              20,
                                            ),
                                          ),
                                          child: Text(
                                            'TZS ${_subtotal.toStringAsFixed(0)}',
                                            style: TextStyle(
                                              fontSize: 12,
                                              fontWeight: FontWeight.w700,
                                              color: _canSubmit
                                                  ? AppTheme.backgroundDark
                                                  : const Color(0xFF8899AA),
                                            ),
                                          ),
                                        ),
                                      ],
                                    ],
                                  ),
                          ),
                        ),
                      ],
                    ),
                  ),
                ),
              ),
            ],
          ),
        );
      },
    );
  }
}

// ─── Sync Badge (AppBar) ─────────────────────────────────────────────────────

class _SyncBadge extends StatefulWidget {
  final OfflineSyncService syncService;
  const _SyncBadge({required this.syncService});

  @override
  State<_SyncBadge> createState() => _SyncBadgeState();
}

class _SyncBadgeState extends State<_SyncBadge>
    with SingleTickerProviderStateMixin {
  late AnimationController _pulseController;
  late Animation<double> _pulseAnim;

  @override
  void initState() {
    super.initState();
    _pulseController = AnimationController(
      vsync: this,
      duration: const Duration(milliseconds: 900),
    )..repeat(reverse: true);
    _pulseAnim = Tween<double>(begin: 0.4, end: 1.0).animate(
      CurvedAnimation(parent: _pulseController, curve: Curves.easeInOut),
    );
  }

  @override
  void dispose() {
    _pulseController.dispose();
    super.dispose();
  }

  @override
  Widget build(BuildContext context) {
    final isOnline = widget.syncService.isOnline;
    final pending = widget.syncService.totalPendingCount;
    final failed = widget.syncService.failedCount;
    final isSyncing = widget.syncService.isSyncing;

    // Determine the three primary states
    final bool isPendingSync =
        !isOnline && pending > 0 || (isOnline && pending > 0 && !isSyncing);
    final bool isFailed = failed > 0 && !isSyncing;
    final bool isSynced = isOnline && pending == 0 && failed == 0 && !isSyncing;

    Color color;
    String label;
    IconData icon;
    bool showPulse;

    if (isSyncing) {
      color = AppTheme.accent;
      label = 'Syncing…';
      icon = Icons.sync;
      showPulse = false;
    } else if (isFailed) {
      color = AppTheme.error;
      label = 'Sync Failed';
      icon = Icons.sync_problem_rounded;
      showPulse = false;
    } else if (isPendingSync) {
      color = AppTheme.warning;
      label = pending > 1 ? 'Pending Sync · $pending' : 'Pending Sync';
      icon = Icons.cloud_upload_outlined;
      showPulse = true;
    } else if (isSynced) {
      color = AppTheme.success;
      label = 'Synced';
      icon = Icons.cloud_done_rounded;
      showPulse = false;
    } else {
      // Offline, nothing pending
      color = AppTheme.warning;
      label = 'Offline';
      icon = Icons.cloud_off_rounded;
      showPulse = false;
    }

    return Container(
      padding: const EdgeInsets.symmetric(horizontal: 10, vertical: 5),
      decoration: BoxDecoration(
        color: color.withAlpha(31),
        borderRadius: BorderRadius.circular(20),
        border: Border.all(color: color.withAlpha(89), width: 1),
      ),
      child: Row(
        mainAxisSize: MainAxisSize.min,
        children: [
          // Animated dot indicator
          if (showPulse)
            AnimatedBuilder(
              animation: _pulseAnim,
              builder: (context, _) => Opacity(
                opacity: _pulseAnim.value,
                child: Container(
                  width: 6,
                  height: 6,
                  decoration: BoxDecoration(
                    color: color,
                    shape: BoxShape.circle,
                  ),
                ),
              ),
            )
          else if (isSyncing)
            SizedBox(
              width: 10,
              height: 10,
              child: CircularProgressIndicator(strokeWidth: 1.5, color: color),
            )
          else
            Container(
              width: 6,
              height: 6,
              decoration: BoxDecoration(color: color, shape: BoxShape.circle),
            ),
          const SizedBox(width: 6),
          Icon(icon, color: color, size: 12),
          const SizedBox(width: 4),
          Text(
            label,
            style: TextStyle(
              fontSize: 11,
              fontWeight: FontWeight.w600,
              color: color,
              letterSpacing: 0.1,
            ),
          ),
        ],
      ),
    );
  }
}

// ─── Sync Banner (below AppBar) ───────────────────────────────────────────────

class _SyncBanner extends StatelessWidget {
  final OfflineSyncService syncService;
  const _SyncBanner({required this.syncService});

  @override
  Widget build(BuildContext context) {
    final isOnline = syncService.isOnline;
    final pending = syncService.totalPendingCount;
    final failed = syncService.failedCount;
    final isSyncing = syncService.isSyncing;

    if (isOnline && pending == 0 && failed == 0 && !isSyncing) {
      return const SizedBox.shrink();
    }

    Color color;
    String message;
    IconData icon;

    if (isSyncing) {
      color = AppTheme.accent;
      message = 'Syncing ${syncService.totalPendingCount} item(s) to server…';
      icon = Icons.sync;
    } else if (!isOnline) {
      message =
          'Offline — orders will be saved locally and synced when connected';
      color = AppTheme.warning;
      icon = Icons.cloud_off;
    } else if (failed > 0) {
      message = '$failed item(s) failed to sync — tap to retry';
      color = AppTheme.error;
      icon = Icons.sync_problem;
    } else {
      return const SizedBox.shrink();
    }

    return GestureDetector(
      onTap: failed > 0 ? () => syncService.syncNow() : null,
      child: Container(
        margin: const EdgeInsets.fromLTRB(16, 0, 16, 8),
        padding: const EdgeInsets.symmetric(horizontal: 14, vertical: 8),
        decoration: BoxDecoration(
          color: color.withAlpha(31),
          borderRadius: BorderRadius.circular(8),
          border: Border.all(color: color.withAlpha(89)),
        ),
        child: Row(
          children: [
            Icon(icon, color: color, size: 14),
            const SizedBox(width: 8),
            Expanded(
              child: Text(
                message,
                style: TextStyle(
                  fontSize: 11,
                  color: color,
                  fontWeight: FontWeight.w500,
                ),
              ),
            ),
            if (failed > 0)
              Text(
                'Retry',
                style: TextStyle(
                  fontSize: 11,
                  fontWeight: FontWeight.w700,
                  color: color,
                  decoration: TextDecoration.underline,
                  decorationColor: color,
                ),
              ),
          ],
        ),
      ),
    );
  }
}

// ─── Pending Sync Chip ────────────────────────────────────────────────────────

class _PendingSyncChip extends StatelessWidget {
  final OfflineSyncService syncService;
  const _PendingSyncChip({required this.syncService});

  @override
  Widget build(BuildContext context) {
    final pending = syncService.pendingOrderCount;
    final failed = syncService.failedCount;

    Color color;
    String label;

    if (failed > 0) {
      color = AppTheme.error;
      label = '$failed order(s) failed to sync';
    } else {
      color = AppTheme.warning;
      label = '$pending order(s) pending sync';
    }

    return GestureDetector(
      onTap: () => syncService.syncNow(),
      child: Container(
        padding: const EdgeInsets.symmetric(horizontal: 12, vertical: 8),
        decoration: BoxDecoration(
          color: color.withAlpha(20),
          borderRadius: BorderRadius.circular(10),
          border: Border.all(color: color.withAlpha(70)),
        ),
        child: Row(
          children: [
            Icon(
              failed > 0 ? Icons.sync_problem : Icons.pending_outlined,
              color: color,
              size: 15,
            ),
            const SizedBox(width: 8),
            Expanded(
              child: Text(
                label,
                style: TextStyle(
                  fontSize: 12,
                  color: color,
                  fontWeight: FontWeight.w500,
                ),
              ),
            ),
            Text(
              'Sync now',
              style: TextStyle(
                fontSize: 11,
                fontWeight: FontWeight.w700,
                color: color,
                decoration: TextDecoration.underline,
                decorationColor: color,
              ),
            ),
          ],
        ),
      ),
    );
  }
}
