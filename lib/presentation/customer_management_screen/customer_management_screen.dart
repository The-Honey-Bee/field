import 'dart:ui';
import 'package:flutter/material.dart';
import 'package:go_router/go_router.dart';
import '../../services/auth_service.dart';
import '../../services/supabase_service.dart';
import '../../theme/app_theme.dart';
import '../../widgets/custom_icon_widget.dart';

class CustomerManagementScreen extends StatefulWidget {
  const CustomerManagementScreen({super.key});

  @override
  State<CustomerManagementScreen> createState() =>
      _CustomerManagementScreenState();
}

class _CustomerManagementScreenState extends State<CustomerManagementScreen> {
  final AuthService _authService = AuthService.instance;
  List<Map<String, dynamic>> _customers = [];
  bool _isLoading = true;
  String _searchQuery = '';

  @override
  void initState() {
    super.initState();
    _loadCustomers();
  }

  Future<void> _loadCustomers() async {
    setState(() => _isLoading = true);
    try {
      final client = SupabaseService.instance.client;

      // RBAC: field staff only see customers they created
      List<Map<String, dynamic>> res;
      if (_authService.isFieldStaff) {
        final uid = _authService.currentUserId;
        if (uid.isNotEmpty) {
          res = List<Map<String, dynamic>>.from(
            await client
                .from('customers')
                .select()
                .eq('created_by', uid)
                .order('name', ascending: true),
          );
        } else {
          res = [];
        }
      } else {
        res = List<Map<String, dynamic>>.from(
          await client
              .from('customers')
              .select()
              .order('name', ascending: true),
        );
      }

      if (mounted) {
        setState(() {
          _customers = res;
          _isLoading = false;
        });
      }
    } catch (e) {
      debugPrint('[Customers] Load error: $e');
      if (mounted) setState(() => _isLoading = false);
    }
  }

  List<Map<String, dynamic>> get _filtered {
    if (_searchQuery.isEmpty) return _customers;
    final q = _searchQuery.toLowerCase();
    return _customers
        .where(
          (c) =>
              (c['name']?.toString() ?? '').toLowerCase().contains(q) ||
              (c['phone']?.toString() ?? '').toLowerCase().contains(q) ||
              (c['address']?.toString() ?? '').toLowerCase().contains(q),
        )
        .toList();
  }

  Future<void> _openForm({Map<String, dynamic>? customer}) async {
    final result = await showModalBottomSheet<bool>(
      context: context,
      isScrollControlled: true,
      backgroundColor: Colors.transparent,
      builder: (ctx) =>
          _CustomerFormSheet(customer: customer, authService: _authService),
    );
    if (result == true) {
      await _loadCustomers();
    }
  }

  Future<void> _deleteCustomer(Map<String, dynamic> customer) async {
    final confirmed = await showDialog<bool>(
      context: context,
      builder: (ctx) => AlertDialog(
        backgroundColor: AppTheme.surfaceDark,
        shape: RoundedRectangleBorder(borderRadius: BorderRadius.circular(16)),
        title: const Text(
          'Delete Customer',
          style: TextStyle(color: Colors.white, fontWeight: FontWeight.w700),
        ),
        content: Text(
          'Remove "${customer['name']}" from your customer list?',
          style: const TextStyle(color: Color(0xFF8899AA), fontSize: 14),
        ),
        actions: [
          TextButton(
            onPressed: () => Navigator.of(ctx).pop(false),
            child: const Text(
              'Cancel',
              style: TextStyle(color: Color(0xFF8899AA)),
            ),
          ),
          ElevatedButton(
            onPressed: () => Navigator.of(ctx).pop(true),
            style: ElevatedButton.styleFrom(
              backgroundColor: AppTheme.error,
              foregroundColor: Colors.white,
              shape: RoundedRectangleBorder(
                borderRadius: BorderRadius.circular(10),
              ),
            ),
            child: const Text(
              'Delete',
              style: TextStyle(fontWeight: FontWeight.w700),
            ),
          ),
        ],
      ),
    );
    if (confirmed != true) return;
    try {
      await SupabaseService.instance.client
          .from('customers')
          .delete()
          .eq('id', customer['id']);
      await _loadCustomers();
    } catch (e) {
      debugPrint('[Customers] Delete error: $e');
    }
  }

  @override
  Widget build(BuildContext context) {
    final filtered = _filtered;
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
                            color: AppTheme.surfaceVariantDark.withAlpha(153),
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
                      const Expanded(
                        child: Column(
                          crossAxisAlignment: CrossAxisAlignment.start,
                          mainAxisSize: MainAxisSize.min,
                          children: [
                            Text(
                              'Customers',
                              style: TextStyle(
                                fontSize: 17,
                                fontWeight: FontWeight.w700,
                                color: Colors.white,
                              ),
                            ),
                            Text(
                              'Manage your customer list',
                              style: TextStyle(
                                fontSize: 11,
                                color: Color(0xFF8899AA),
                              ),
                            ),
                          ],
                        ),
                      ),
                      GestureDetector(
                        onTap: _loadCustomers,
                        child: Container(
                          width: 36,
                          height: 36,
                          decoration: BoxDecoration(
                            color: AppTheme.surfaceVariantDark.withAlpha(153),
                            borderRadius: BorderRadius.circular(10),
                          ),
                          child: Center(
                            child: CustomIconWidget(
                              iconName: 'refresh',
                              color: const Color(0xFFB0C4D8),
                              size: 20,
                            ),
                          ),
                        ),
                      ),
                    ],
                  ),
                ),
              ),
            ),
          ),
        ),
      ),
      floatingActionButton: FloatingActionButton.extended(
        onPressed: () => _openForm(),
        backgroundColor: AppTheme.accent,
        foregroundColor: AppTheme.backgroundDark,
        icon: const Icon(Icons.person_add_rounded, size: 20),
        label: const Text(
          'Add Customer',
          style: TextStyle(fontWeight: FontWeight.w700, fontSize: 14),
        ),
      ),
      body: Column(
        children: [
          SizedBox(height: MediaQuery.of(context).padding.top + 60),
          // Search bar
          Padding(
            padding: const EdgeInsets.fromLTRB(16, 12, 16, 8),
            child: TextField(
              onChanged: (v) => setState(() => _searchQuery = v),
              style: const TextStyle(color: Colors.white, fontSize: 14),
              decoration: InputDecoration(
                hintText: 'Search customers…',
                hintStyle: const TextStyle(
                  color: Color(0xFF8899AA),
                  fontSize: 14,
                ),
                prefixIcon: Padding(
                  padding: const EdgeInsets.only(left: 12, right: 8),
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
                fillColor: AppTheme.surfaceDark,
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
                  borderSide: const BorderSide(
                    color: AppTheme.accent,
                    width: 1.5,
                  ),
                ),
                contentPadding: const EdgeInsets.symmetric(
                  horizontal: 12,
                  vertical: 12,
                ),
                isDense: true,
              ),
            ),
          ),
          // Count badge
          if (!_isLoading)
            Padding(
              padding: const EdgeInsets.fromLTRB(16, 0, 16, 8),
              child: Row(
                children: [
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
                      '${filtered.length} customer${filtered.length == 1 ? '' : 's'}',
                      style: const TextStyle(
                        fontSize: 11,
                        fontWeight: FontWeight.w600,
                        color: AppTheme.accent,
                      ),
                    ),
                  ),
                  if (_authService.isManagerOrSupervisor) ...[
                    const SizedBox(width: 8),
                    Container(
                      padding: const EdgeInsets.symmetric(
                        horizontal: 10,
                        vertical: 4,
                      ),
                      decoration: BoxDecoration(
                        color: const Color(0xFF8899AA).withAlpha(31),
                        borderRadius: BorderRadius.circular(20),
                      ),
                      child: const Text(
                        'All users',
                        style: TextStyle(
                          fontSize: 11,
                          fontWeight: FontWeight.w500,
                          color: Color(0xFF8899AA),
                        ),
                      ),
                    ),
                  ],
                ],
              ),
            ),
          // List
          Expanded(
            child: _isLoading
                ? const Center(
                    child: CircularProgressIndicator(color: AppTheme.accent),
                  )
                : filtered.isEmpty
                ? _EmptyState(
                    onAdd: () => _openForm(),
                    isSearch: _searchQuery.isNotEmpty,
                  )
                : ListView.builder(
                    padding: EdgeInsets.fromLTRB(
                      16,
                      0,
                      16,
                      MediaQuery.of(context).padding.bottom + 100,
                    ),
                    itemCount: filtered.length,
                    itemBuilder: (ctx, i) {
                      final c = filtered[i];
                      return _CustomerCard(
                        customer: c,
                        canEdit:
                            _authService.isManagerOrSupervisor ||
                            c['created_by'] == _authService.currentUserId,
                        onEdit: () => _openForm(customer: c),
                        onDelete: () => _deleteCustomer(c),
                      );
                    },
                  ),
          ),
        ],
      ),
    );
  }
}

// ─── Customer Card ────────────────────────────────────────────────────────────

class _CustomerCard extends StatelessWidget {
  final Map<String, dynamic> customer;
  final bool canEdit;
  final VoidCallback onEdit;
  final VoidCallback onDelete;

  const _CustomerCard({
    required this.customer,
    required this.canEdit,
    required this.onEdit,
    required this.onDelete,
  });

  @override
  Widget build(BuildContext context) {
    final name = customer['name']?.toString() ?? '';
    final phone = customer['phone']?.toString() ?? '';
    final address = customer['address']?.toString() ?? '';
    final notes = customer['notes']?.toString() ?? '';
    final initials = name.isNotEmpty
        ? name.trim().split(' ').take(2).map((w) => w[0].toUpperCase()).join()
        : '?';

    return Container(
      margin: const EdgeInsets.only(bottom: 10),
      decoration: BoxDecoration(
        color: AppTheme.surfaceDark,
        borderRadius: BorderRadius.circular(14),
        border: Border.all(color: const Color(0xFF3A5068), width: 0.5),
      ),
      child: Padding(
        padding: const EdgeInsets.all(14),
        child: Row(
          children: [
            // Avatar
            Container(
              width: 44,
              height: 44,
              decoration: BoxDecoration(
                gradient: const LinearGradient(
                  colors: [AppTheme.primaryLight, AppTheme.accent],
                  begin: Alignment.topLeft,
                  end: Alignment.bottomRight,
                ),
                borderRadius: BorderRadius.circular(12),
              ),
              child: Center(
                child: Text(
                  initials,
                  style: const TextStyle(
                    fontSize: 15,
                    fontWeight: FontWeight.w700,
                    color: Colors.white,
                  ),
                ),
              ),
            ),
            const SizedBox(width: 12),
            // Info
            Expanded(
              child: Column(
                crossAxisAlignment: CrossAxisAlignment.start,
                children: [
                  Text(
                    name,
                    style: const TextStyle(
                      fontSize: 14,
                      fontWeight: FontWeight.w600,
                      color: Colors.white,
                    ),
                    overflow: TextOverflow.ellipsis,
                  ),
                  if (phone.isNotEmpty) ...[
                    const SizedBox(height: 3),
                    Row(
                      children: [
                        CustomIconWidget(
                          iconName: 'phone_outlined',
                          color: const Color(0xFF8899AA),
                          size: 12,
                        ),
                        const SizedBox(width: 4),
                        Text(
                          phone,
                          style: const TextStyle(
                            fontSize: 12,
                            color: Color(0xFF8899AA),
                          ),
                        ),
                      ],
                    ),
                  ],
                  if (address.isNotEmpty) ...[
                    const SizedBox(height: 2),
                    Row(
                      children: [
                        CustomIconWidget(
                          iconName: 'location_on_outlined',
                          color: const Color(0xFF8899AA),
                          size: 12,
                        ),
                        const SizedBox(width: 4),
                        Expanded(
                          child: Text(
                            address,
                            style: const TextStyle(
                              fontSize: 12,
                              color: Color(0xFF8899AA),
                            ),
                            overflow: TextOverflow.ellipsis,
                          ),
                        ),
                      ],
                    ),
                  ],
                  if (notes.isNotEmpty) ...[
                    const SizedBox(height: 2),
                    Text(
                      notes,
                      style: const TextStyle(
                        fontSize: 11,
                        color: Color(0xFF6A7F94),
                        fontStyle: FontStyle.italic,
                      ),
                      overflow: TextOverflow.ellipsis,
                      maxLines: 1,
                    ),
                  ],
                ],
              ),
            ),
            // Actions
            if (canEdit) ...[
              const SizedBox(width: 8),
              Column(
                children: [
                  GestureDetector(
                    onTap: onEdit,
                    child: Container(
                      width: 32,
                      height: 32,
                      decoration: BoxDecoration(
                        color: AppTheme.accent.withAlpha(31),
                        borderRadius: BorderRadius.circular(8),
                      ),
                      child: Center(
                        child: CustomIconWidget(
                          iconName: 'edit_outlined',
                          color: AppTheme.accent,
                          size: 16,
                        ),
                      ),
                    ),
                  ),
                  const SizedBox(height: 6),
                  GestureDetector(
                    onTap: onDelete,
                    child: Container(
                      width: 32,
                      height: 32,
                      decoration: BoxDecoration(
                        color: AppTheme.error.withAlpha(31),
                        borderRadius: BorderRadius.circular(8),
                      ),
                      child: Center(
                        child: CustomIconWidget(
                          iconName: 'delete_outline',
                          color: AppTheme.error,
                          size: 16,
                        ),
                      ),
                    ),
                  ),
                ],
              ),
            ],
          ],
        ),
      ),
    );
  }
}

// ─── Customer Form Sheet ──────────────────────────────────────────────────────

class _CustomerFormSheet extends StatefulWidget {
  final Map<String, dynamic>? customer;
  final AuthService authService;

  const _CustomerFormSheet({this.customer, required this.authService});

  @override
  State<_CustomerFormSheet> createState() => _CustomerFormSheetState();
}

class _CustomerFormSheetState extends State<_CustomerFormSheet> {
  final _formKey = GlobalKey<FormState>();
  late final TextEditingController _nameCtrl;
  late final TextEditingController _phoneCtrl;
  late final TextEditingController _addressCtrl;
  late final TextEditingController _notesCtrl;
  bool _isSaving = false;

  // Real-time validation
  String? _nameError;
  String? _phoneError;
  bool _nameTouched = false;
  bool _phoneTouched = false;

  bool get _isFormValid => _nameCtrl.text.trim().isNotEmpty;

  void _validateName() {
    setState(() {
      _nameError = _nameCtrl.text.trim().isEmpty
          ? 'Customer name is required'
          : null;
    });
  }

  void _validatePhone() {
    final v = _phoneCtrl.text.trim();
    if (v.isNotEmpty && v.length < 7) {
      setState(() => _phoneError = 'Enter a valid phone number');
    } else {
      setState(() => _phoneError = null);
    }
  }

  bool get _isEditing => widget.customer != null;

  @override
  void initState() {
    super.initState();
    final c = widget.customer;
    _nameCtrl = TextEditingController(text: c?['name']?.toString() ?? '');
    _phoneCtrl = TextEditingController(text: c?['phone']?.toString() ?? '');
    _addressCtrl = TextEditingController(text: c?['address']?.toString() ?? '');
    _notesCtrl = TextEditingController(text: c?['notes']?.toString() ?? '');

    // Real-time listeners
    _nameCtrl.addListener(() {
      if (_nameTouched) _validateName();
      setState(() {});
    });
    _phoneCtrl.addListener(() {
      if (_phoneTouched) _validatePhone();
      setState(() {});
    });
  }

  @override
  void dispose() {
    _nameCtrl.dispose();
    _phoneCtrl.dispose();
    _addressCtrl.dispose();
    _notesCtrl.dispose();
    super.dispose();
  }

  Future<void> _save() async {
    setState(() {
      _nameTouched = true;
      _phoneTouched = true;
    });
    _validateName();
    _validatePhone();

    if (!_isFormValid || _nameError != null || _phoneError != null) return;
    setState(() => _isSaving = true);
    try {
      final client = SupabaseService.instance.client;
      final data = {
        'name': _nameCtrl.text.trim(),
        'phone': _phoneCtrl.text.trim(),
        'address': _addressCtrl.text.trim(),
        'notes': _notesCtrl.text.trim(),
        'updated_at': DateTime.now().toIso8601String(),
      };

      if (_isEditing) {
        await client
            .from('customers')
            .update(data)
            .eq('id', widget.customer!['id']);
      } else {
        final uid = widget.authService.currentUserId;
        data['created_by'] = uid.isNotEmpty ? uid : '';
        await client.from('customers').insert(data);
      }

      if (mounted) Navigator.of(context).pop(true);
    } catch (e) {
      debugPrint('[CustomerForm] Save error: $e');
      if (mounted) setState(() => _isSaving = false);
    }
  }

  InputDecoration _inputDecoration(
    String label, {
    String? hint,
    String? errorText,
  }) {
    final hasError = errorText != null && errorText.isNotEmpty;
    return InputDecoration(
      labelText: label,
      hintText: hint,
      errorText: errorText,
      labelStyle: TextStyle(
        color: hasError ? AppTheme.error : const Color(0xFF8899AA),
        fontSize: 13,
      ),
      hintStyle: const TextStyle(color: Color(0xFF6A7F94), fontSize: 13),
      errorStyle: const TextStyle(
        fontSize: 11,
        color: AppTheme.error,
        height: 1.2,
      ),
      enabledBorder: OutlineInputBorder(
        borderRadius: BorderRadius.circular(10),
        borderSide: BorderSide(
          color: hasError ? AppTheme.error : const Color(0xFF3A5068),
          width: hasError ? 1.5 : 1,
        ),
      ),
      focusedBorder: OutlineInputBorder(
        borderRadius: BorderRadius.circular(10),
        borderSide: BorderSide(
          color: hasError ? AppTheme.error : AppTheme.accent,
          width: 1.5,
        ),
      ),
      errorBorder: OutlineInputBorder(
        borderRadius: BorderRadius.circular(10),
        borderSide: const BorderSide(color: AppTheme.error, width: 1.5),
      ),
      focusedErrorBorder: OutlineInputBorder(
        borderRadius: BorderRadius.circular(10),
        borderSide: const BorderSide(color: AppTheme.error, width: 1.5),
      ),
      filled: true,
      fillColor: hasError
          ? AppTheme.error.withAlpha(15)
          : AppTheme.surfaceVariantDark,
      contentPadding: const EdgeInsets.symmetric(horizontal: 14, vertical: 12),
    );
  }

  @override
  Widget build(BuildContext context) {
    final bottomPad = MediaQuery.of(context).viewInsets.bottom;
    return Container(
      decoration: const BoxDecoration(
        color: AppTheme.surfaceDark,
        borderRadius: BorderRadius.vertical(top: Radius.circular(20)),
      ),
      padding: EdgeInsets.fromLTRB(20, 0, 20, bottomPad + 24),
      child: Column(
        mainAxisSize: MainAxisSize.min,
        crossAxisAlignment: CrossAxisAlignment.stretch,
        children: [
          // Handle
          Center(
            child: Container(
              margin: const EdgeInsets.only(top: 12, bottom: 16),
              width: 40,
              height: 4,
              decoration: BoxDecoration(
                color: const Color(0xFF3A5068),
                borderRadius: BorderRadius.circular(2),
              ),
            ),
          ),
          // Title
          Row(
            children: [
              Container(
                width: 36,
                height: 36,
                decoration: BoxDecoration(
                  color: AppTheme.accent.withAlpha(31),
                  borderRadius: BorderRadius.circular(10),
                ),
                child: Center(
                  child: CustomIconWidget(
                    iconName: _isEditing
                        ? 'edit_outlined'
                        : 'person_add_rounded',
                    color: AppTheme.accent,
                    size: 18,
                  ),
                ),
              ),
              const SizedBox(width: 12),
              Text(
                _isEditing ? 'Edit Customer' : 'New Customer',
                style: const TextStyle(
                  fontSize: 17,
                  fontWeight: FontWeight.w700,
                  color: Colors.white,
                ),
              ),
            ],
          ),
          const SizedBox(height: 20),
          // Form
          Form(
            key: _formKey,
            child: Column(
              children: [
                TextFormField(
                  controller: _nameCtrl,
                  style: const TextStyle(color: Colors.white, fontSize: 14),
                  decoration: _inputDecoration(
                    'Customer Name *',
                    errorText: _nameTouched ? _nameError : null,
                  ),
                  onChanged: (_) {
                    _nameTouched = true;
                    _validateName();
                  },
                  validator: (v) => (v == null || v.trim().isEmpty)
                      ? 'Name is required'
                      : null,
                ),
                const SizedBox(height: 12),
                TextFormField(
                  controller: _phoneCtrl,
                  style: const TextStyle(color: Colors.white, fontSize: 14),
                  keyboardType: TextInputType.phone,
                  decoration: _inputDecoration(
                    'Phone Number',
                    hint: '+255 7XX XXX XXX',
                    errorText: _phoneTouched ? _phoneError : null,
                  ),
                  onChanged: (_) {
                    _phoneTouched = true;
                    _validatePhone();
                  },
                ),
                const SizedBox(height: 12),
                TextFormField(
                  controller: _addressCtrl,
                  style: const TextStyle(color: Colors.white, fontSize: 14),
                  decoration: _inputDecoration('Address / Location'),
                ),
                const SizedBox(height: 12),
                TextFormField(
                  controller: _notesCtrl,
                  style: const TextStyle(color: Colors.white, fontSize: 14),
                  maxLines: 2,
                  decoration: _inputDecoration(
                    'Notes',
                    hint: 'Delivery instructions, preferences…',
                  ),
                ),
              ],
            ),
          ),
          const SizedBox(height: 20),
          // Buttons
          Row(
            children: [
              Expanded(
                child: OutlinedButton(
                  onPressed: _isSaving
                      ? null
                      : () => Navigator.of(context).pop(false),
                  style: OutlinedButton.styleFrom(
                    side: const BorderSide(color: Color(0xFF3A5068)),
                    shape: RoundedRectangleBorder(
                      borderRadius: BorderRadius.circular(12),
                    ),
                    padding: const EdgeInsets.symmetric(vertical: 14),
                  ),
                  child: const Text(
                    'Cancel',
                    style: TextStyle(
                      color: Color(0xFF8899AA),
                      fontWeight: FontWeight.w600,
                    ),
                  ),
                ),
              ),
              const SizedBox(width: 12),
              Expanded(
                flex: 2,
                child: ElevatedButton(
                  onPressed: (_isSaving || !_isFormValid) ? null : _save,
                  style: ElevatedButton.styleFrom(
                    backgroundColor: _isFormValid
                        ? AppTheme.accent
                        : AppTheme.surfaceVariantDark,
                    foregroundColor: _isFormValid
                        ? AppTheme.backgroundDark
                        : const Color(0xFF8899AA),
                    shape: RoundedRectangleBorder(
                      borderRadius: BorderRadius.circular(12),
                    ),
                    padding: const EdgeInsets.symmetric(vertical: 14),
                    elevation: 0,
                  ),
                  child: _isSaving
                      ? const SizedBox(
                          width: 20,
                          height: 20,
                          child: CircularProgressIndicator(
                            strokeWidth: 2,
                            color: AppTheme.backgroundDark,
                          ),
                        )
                      : Text(
                          _isEditing ? 'Save Changes' : 'Add Customer',
                          style: const TextStyle(
                            fontSize: 15,
                            fontWeight: FontWeight.w700,
                          ),
                        ),
                ),
              ),
            ],
          ),
        ],
      ),
    );
  }
}

// ─── Empty State ──────────────────────────────────────────────────────────────

class _EmptyState extends StatelessWidget {
  final VoidCallback onAdd;
  final bool isSearch;

  const _EmptyState({required this.onAdd, required this.isSearch});

  @override
  Widget build(BuildContext context) {
    return Center(
      child: Padding(
        padding: const EdgeInsets.all(40),
        child: Column(
          mainAxisSize: MainAxisSize.min,
          children: [
            Container(
              width: 72,
              height: 72,
              decoration: BoxDecoration(
                color: AppTheme.surfaceDark,
                borderRadius: BorderRadius.circular(20),
                border: Border.all(color: const Color(0xFF3A5068)),
              ),
              child: Center(
                child: CustomIconWidget(
                  iconName: isSearch ? 'search_off' : 'people_outline',
                  color: const Color(0xFF8899AA),
                  size: 32,
                ),
              ),
            ),
            const SizedBox(height: 16),
            Text(
              isSearch ? 'No customers found' : 'No customers yet',
              style: const TextStyle(
                fontSize: 16,
                fontWeight: FontWeight.w600,
                color: Colors.white,
              ),
            ),
            const SizedBox(height: 8),
            Text(
              isSearch
                  ? 'Try a different search term'
                  : 'Add your first customer to get started',
              style: const TextStyle(fontSize: 13, color: Color(0xFF8899AA)),
              textAlign: TextAlign.center,
            ),
            if (!isSearch) ...[
              const SizedBox(height: 20),
              ElevatedButton.icon(
                onPressed: onAdd,
                icon: const Icon(Icons.person_add_rounded, size: 18),
                label: const Text(
                  'Add Customer',
                  style: TextStyle(fontWeight: FontWeight.w700),
                ),
                style: ElevatedButton.styleFrom(
                  backgroundColor: AppTheme.accent,
                  foregroundColor: AppTheme.backgroundDark,
                  shape: RoundedRectangleBorder(
                    borderRadius: BorderRadius.circular(12),
                  ),
                  padding: const EdgeInsets.symmetric(
                    horizontal: 20,
                    vertical: 12,
                  ),
                ),
              ),
            ],
          ],
        ),
      ),
    );
  }
}
