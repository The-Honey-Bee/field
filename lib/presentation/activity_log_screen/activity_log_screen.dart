import 'dart:ui';

import 'package:flutter/material.dart';
import 'package:supabase_flutter/supabase_flutter.dart';

import '../../theme/app_theme.dart';
import '../../widgets/custom_icon_widget.dart';
import '../../services/supabase_service.dart';
import '../../services/auth_service.dart';

class ActivityLogEntry {
  final String id;
  final String userId;
  final String userName;
  final String userRole;
  final String action;
  final String entityType;
  final String entityId;
  final String description;
  final String status;
  final DateTime createdAt;

  ActivityLogEntry({
    required this.id,
    required this.userId,
    required this.userName,
    required this.userRole,
    required this.action,
    required this.entityType,
    required this.entityId,
    required this.description,
    required this.status,
    required this.createdAt,
  });

  factory ActivityLogEntry.fromJson(Map<String, dynamic> json) {
    return ActivityLogEntry(
      id: json['id'] ?? '',
      userId: json['user_id'] ?? '',
      userName: json['user_name'] ?? '',
      userRole: json['user_role'] ?? '',
      action: json['action'] ?? '',
      entityType: json['entity_type'] ?? '',
      entityId: json['entity_id'] ?? '',
      description: json['description'] ?? '',
      status: json['status'] ?? 'success',
      createdAt: DateTime.tryParse(json['created_at'] ?? '') ?? DateTime.now(),
    );
  }
}

class ActivityLogScreen extends StatefulWidget {
  const ActivityLogScreen({super.key});

  @override
  State<ActivityLogScreen> createState() => _ActivityLogScreenState();
}

class _ActivityLogScreenState extends State<ActivityLogScreen>
    with SingleTickerProviderStateMixin {
  late TabController _tabController;
  List<ActivityLogEntry> _allEntries = [];
  bool _isLoading = true;
  String? _error;
  String _searchQuery = '';
  String _filterAction = 'all';
  RealtimeChannel? _subscription;

  static const _filterOptions = [
    ('all', 'All'),
    ('order_approved', 'Approvals'),
    ('order_rejected', 'Rejections'),
    ('sync_success', 'Syncs'),
    ('user_login', 'Logins'),
    ('document_uploaded', 'Documents'),
  ];

  @override
  void initState() {
    super.initState();
    _tabController = TabController(length: 2, vsync: this);
    _loadLogs();
    _subscribeToLogs();
  }

  @override
  void dispose() {
    _tabController.dispose();
    _subscription?.unsubscribe();
    super.dispose();
  }

  Future<void> _loadLogs() async {
    setState(() {
      _isLoading = true;
      _error = null;
    });
    try {
      final client = SupabaseService.instance.client;
      final authService = AuthService.instance;

      // RBAC: field staff only see their own activity
      if (authService.isFieldStaff) {
        final uid = authService.currentUserId;
        if (uid.isNotEmpty) {
          final response = await client
              .from('activity_log')
              .select()
              .eq('user_id', uid)
              .order('created_at', ascending: false)
              .limit(200);
          if (mounted) {
            setState(() {
              _allEntries = (response as List)
                  .map((e) => ActivityLogEntry.fromJson(e))
                  .toList();
              _isLoading = false;
            });
          }
          return;
        }
      }

      final response = await client
          .from('activity_log')
          .select()
          .order('created_at', ascending: false)
          .limit(200);

      if (mounted) {
        setState(() {
          _allEntries = (response as List)
              .map((e) => ActivityLogEntry.fromJson(e))
              .toList();
          _isLoading = false;
        });
      }
    } catch (e) {
      if (mounted) {
        setState(() {
          _error = 'Failed to load activity log. Check your connection.';
          _isLoading = false;
        });
      }
    }
  }

  void _subscribeToLogs() {
    final client = SupabaseService.instance.client;
    _subscription = client
        .channel('activity_log_realtime')
        .onPostgresChanges(
          event: PostgresChangeEvent.insert,
          schema: 'public',
          table: 'activity_log',
          callback: (payload) {
            if (mounted) {
              final newEntry = ActivityLogEntry.fromJson(payload.newRecord);
              setState(() {
                _allEntries.insert(0, newEntry);
              });
            }
          },
        )
        .subscribe();
  }

  List<ActivityLogEntry> get _filteredEntries {
    var entries = _allEntries;
    if (_filterAction != 'all') {
      entries = entries.where((e) => e.action == _filterAction).toList();
    }
    if (_searchQuery.isNotEmpty) {
      final q = _searchQuery.toLowerCase();
      entries = entries
          .where(
            (e) =>
                e.userName.toLowerCase().contains(q) ||
                e.description.toLowerCase().contains(q) ||
                e.userRole.toLowerCase().contains(q),
          )
          .toList();
    }
    return entries;
  }

  List<ActivityLogEntry> get _recentEntries {
    final cutoff = DateTime.now().subtract(const Duration(hours: 24));
    return _filteredEntries.where((e) => e.createdAt.isAfter(cutoff)).toList();
  }

  @override
  Widget build(BuildContext context) {
    return Scaffold(
      backgroundColor: AppTheme.backgroundDark,
      body: Column(
        children: [
          _buildHeader(),
          _buildFilterChips(),
          _buildSearchBar(),
          _buildTabBar(),
          Expanded(child: _buildTabContent()),
        ],
      ),
    );
  }

  Widget _buildHeader() {
    final approvals = _allEntries
        .where((e) => e.action == 'order_approved')
        .length;
    final rejections = _allEntries
        .where((e) => e.action == 'order_rejected')
        .length;
    final syncs = _allEntries
        .where((e) => e.action == 'sync_success' || e.action.contains('synced'))
        .length;
    final failures = _allEntries
        .where((e) => e.status == 'failed' || e.action == 'sync_failed')
        .length;

    return Container(
      padding: EdgeInsets.only(
        top: MediaQuery.of(context).padding.top + 16,
        left: 20,
        right: 20,
        bottom: 16,
      ),
      decoration: BoxDecoration(
        color: AppTheme.surfaceDark.withAlpha(200),
        border: const Border(
          bottom: BorderSide(color: Color(0xFF2A3F55), width: 0.5),
        ),
      ),
      child: Column(
        crossAxisAlignment: CrossAxisAlignment.start,
        children: [
          Row(
            children: [
              CustomIconWidget(
                iconName: 'history',
                color: AppTheme.accent,
                size: 22,
              ),
              const SizedBox(width: 10),
              const Text(
                'Activity Log',
                style: TextStyle(
                  fontSize: 20,
                  fontWeight: FontWeight.w700,
                  color: Colors.white,
                  letterSpacing: -0.3,
                ),
              ),
              const Spacer(),
              GestureDetector(
                onTap: _loadLogs,
                child: Container(
                  padding: const EdgeInsets.symmetric(
                    horizontal: 12,
                    vertical: 6,
                  ),
                  decoration: BoxDecoration(
                    color: AppTheme.accent.withAlpha(30),
                    borderRadius: BorderRadius.circular(8),
                    border: Border.all(color: AppTheme.accent.withAlpha(80)),
                  ),
                  child: Row(
                    mainAxisSize: MainAxisSize.min,
                    children: [
                      CustomIconWidget(
                        iconName: 'refresh',
                        color: AppTheme.accent,
                        size: 14,
                      ),
                      const SizedBox(width: 4),
                      Text(
                        'Refresh',
                        style: TextStyle(
                          color: AppTheme.accent,
                          fontSize: 12,
                          fontWeight: FontWeight.w500,
                        ),
                      ),
                    ],
                  ),
                ),
              ),
            ],
          ),
          const SizedBox(height: 16),
          Row(
            children: [
              _StatTile(
                label: 'Approvals',
                value: approvals,
                color: AppTheme.success,
                icon: 'check_circle_outline',
              ),
              const SizedBox(width: 8),
              _StatTile(
                label: 'Rejections',
                value: rejections,
                color: AppTheme.error,
                icon: 'cancel_outlined',
              ),
              const SizedBox(width: 8),
              _StatTile(
                label: 'Syncs',
                value: syncs,
                color: AppTheme.accent,
                icon: 'sync',
              ),
              const SizedBox(width: 8),
              _StatTile(
                label: 'Failures',
                value: failures,
                color: AppTheme.warning,
                icon: 'warning_amber_outlined',
              ),
            ],
          ),
        ],
      ),
    );
  }

  Widget _buildFilterChips() {
    return Container(
      height: 44,
      padding: const EdgeInsets.symmetric(horizontal: 16, vertical: 6),
      child: ListView.separated(
        scrollDirection: Axis.horizontal,
        itemCount: _filterOptions.length,
        separatorBuilder: (_, __) => const SizedBox(width: 8),
        itemBuilder: (context, i) {
          final (value, label) = _filterOptions[i];
          final isSelected = _filterAction == value;
          return GestureDetector(
            onTap: () => setState(() => _filterAction = value),
            child: AnimatedContainer(
              duration: const Duration(milliseconds: 180),
              padding: const EdgeInsets.symmetric(horizontal: 14, vertical: 4),
              decoration: BoxDecoration(
                color: isSelected
                    ? AppTheme.accent.withAlpha(40)
                    : AppTheme.surfaceVariantDark.withAlpha(150),
                borderRadius: BorderRadius.circular(20),
                border: Border.all(
                  color: isSelected ? AppTheme.accent : const Color(0xFF3A5068),
                  width: isSelected ? 1.5 : 1,
                ),
              ),
              child: Text(
                label,
                style: TextStyle(
                  fontSize: 12,
                  fontWeight: isSelected ? FontWeight.w600 : FontWeight.w400,
                  color: isSelected ? AppTheme.accent : const Color(0xFF8899AA),
                ),
              ),
            ),
          );
        },
      ),
    );
  }

  Widget _buildSearchBar() {
    return Padding(
      padding: const EdgeInsets.symmetric(horizontal: 16, vertical: 4),
      child: ClipRRect(
        borderRadius: BorderRadius.circular(10),
        child: BackdropFilter(
          filter: ImageFilter.blur(sigmaX: 8, sigmaY: 8),
          child: TextField(
            onChanged: (v) => setState(() => _searchQuery = v),
            style: const TextStyle(color: Colors.white, fontSize: 14),
            decoration: InputDecoration(
              hintText: 'Search by user, action, description…',
              hintStyle: const TextStyle(
                color: Color(0xFF8899AA),
                fontSize: 13,
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
              fillColor: AppTheme.surfaceVariantDark.withAlpha(180),
              border: OutlineInputBorder(
                borderRadius: BorderRadius.circular(10),
                borderSide: const BorderSide(
                  color: Color(0xFF3A5068),
                  width: 1,
                ),
              ),
              enabledBorder: OutlineInputBorder(
                borderRadius: BorderRadius.circular(10),
                borderSide: const BorderSide(
                  color: Color(0xFF3A5068),
                  width: 1,
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
                horizontal: 16,
                vertical: 10,
              ),
            ),
          ),
        ),
      ),
    );
  }

  Widget _buildTabBar() {
    return Container(
      margin: const EdgeInsets.symmetric(horizontal: 16, vertical: 8),
      decoration: BoxDecoration(
        color: AppTheme.surfaceVariantDark.withAlpha(150),
        borderRadius: BorderRadius.circular(10),
        border: Border.all(color: const Color(0xFF3A5068), width: 0.5),
      ),
      child: TabBar(
        controller: _tabController,
        indicator: BoxDecoration(
          color: AppTheme.accent.withAlpha(40),
          borderRadius: BorderRadius.circular(8),
          border: Border.all(color: AppTheme.accent.withAlpha(100)),
        ),
        indicatorSize: TabBarIndicatorSize.tab,
        labelColor: AppTheme.accent,
        unselectedLabelColor: const Color(0xFF8899AA),
        labelStyle: const TextStyle(fontSize: 13, fontWeight: FontWeight.w600),
        unselectedLabelStyle: const TextStyle(
          fontSize: 13,
          fontWeight: FontWeight.w400,
        ),
        dividerColor: Colors.transparent,
        tabs: [
          Tab(
            child: Row(
              mainAxisAlignment: MainAxisAlignment.center,
              children: [
                CustomIconWidget(
                  iconName: 'schedule',
                  color: AppTheme.accent,
                  size: 14,
                ),
                const SizedBox(width: 6),
                const Text('Recent (24h)'),
              ],
            ),
          ),
          Tab(
            child: Row(
              mainAxisAlignment: MainAxisAlignment.center,
              children: [
                CustomIconWidget(
                  iconName: 'list_alt',
                  color: AppTheme.accent,
                  size: 14,
                ),
                const SizedBox(width: 6),
                const Text('All Logs'),
              ],
            ),
          ),
        ],
      ),
    );
  }

  Widget _buildTabContent() {
    if (_isLoading) {
      return const Center(
        child: CircularProgressIndicator(color: AppTheme.accent),
      );
    }
    if (_error != null) {
      return Center(
        child: Column(
          mainAxisSize: MainAxisSize.min,
          children: [
            CustomIconWidget(
              iconName: 'error_outline',
              color: AppTheme.error,
              size: 40,
            ),
            const SizedBox(height: 12),
            Text(
              _error!,
              style: const TextStyle(color: Color(0xFF8899AA), fontSize: 14),
              textAlign: TextAlign.center,
            ),
            const SizedBox(height: 16),
            ElevatedButton(
              onPressed: _loadLogs,
              style: ElevatedButton.styleFrom(
                backgroundColor: AppTheme.accent,
                foregroundColor: AppTheme.backgroundDark,
              ),
              child: const Text('Retry'),
            ),
          ],
        ),
      );
    }

    return TabBarView(
      controller: _tabController,
      children: [
        _buildLogList(
          _recentEntries,
          emptyLabel: 'No activity in the last 24 hours',
        ),
        _buildLogList(_filteredEntries, emptyLabel: 'No activity logs found'),
      ],
    );
  }

  Widget _buildLogList(
    List<ActivityLogEntry> entries, {
    required String emptyLabel,
  }) {
    if (entries.isEmpty) {
      return Center(
        child: Column(
          mainAxisSize: MainAxisSize.min,
          children: [
            CustomIconWidget(
              iconName: 'inbox',
              color: const Color(0xFF3A5068),
              size: 48,
            ),
            const SizedBox(height: 12),
            Text(
              emptyLabel,
              style: const TextStyle(color: Color(0xFF8899AA), fontSize: 14),
            ),
          ],
        ),
      );
    }

    return ListView.builder(
      padding: const EdgeInsets.fromLTRB(16, 4, 16, 100),
      itemCount: entries.length,
      itemBuilder: (context, i) => _ActivityLogTile(entry: entries[i]),
    );
  }
}

class _StatTile extends StatelessWidget {
  final String label;
  final int value;
  final Color color;
  final String icon;

  const _StatTile({
    required this.label,
    required this.value,
    required this.color,
    required this.icon,
  });

  @override
  Widget build(BuildContext context) {
    return Expanded(
      child: Container(
        padding: const EdgeInsets.symmetric(vertical: 10, horizontal: 8),
        decoration: BoxDecoration(
          color: color.withAlpha(20),
          borderRadius: BorderRadius.circular(10),
          border: Border.all(color: color.withAlpha(60)),
        ),
        child: Column(
          children: [
            CustomIconWidget(iconName: icon, color: color, size: 16),
            const SizedBox(height: 4),
            Text(
              '$value',
              style: TextStyle(
                fontSize: 16,
                fontWeight: FontWeight.w700,
                color: color,
              ),
            ),
            Text(
              label,
              style: const TextStyle(fontSize: 9, color: Color(0xFF8899AA)),
              overflow: TextOverflow.ellipsis,
            ),
          ],
        ),
      ),
    );
  }
}

class _ActivityLogTile extends StatelessWidget {
  final ActivityLogEntry entry;

  const _ActivityLogTile({required this.entry});

  Color get _actionColor {
    switch (entry.action) {
      case 'order_approved':
      case 'report_reviewed':
      case 'sync_success':
        return AppTheme.success;
      case 'order_rejected':
      case 'sync_failed':
        return AppTheme.error;
      case 'order_synced':
      case 'report_synced':
      case 'report_submitted':
        return AppTheme.accent;
      case 'user_login':
      case 'user_signup':
        return const Color(0xFF8B5CF6);
      case 'document_uploaded':
        return const Color(0xFFF59E0B);
      case 'message_sent':
        return const Color(0xFF06B6D4);
      default:
        return const Color(0xFF8899AA);
    }
  }

  String get _actionIcon {
    switch (entry.action) {
      case 'order_approved':
        return 'check_circle';
      case 'order_rejected':
        return 'cancel';
      case 'order_synced':
      case 'sync_success':
        return 'sync';
      case 'sync_failed':
        return 'sync_problem';
      case 'order_created':
        return 'add_shopping_cart';
      case 'report_submitted':
        return 'assignment_turned_in';
      case 'report_reviewed':
        return 'rate_review';
      case 'report_synced':
        return 'cloud_done';
      case 'user_login':
        return 'login';
      case 'user_logout':
        return 'logout';
      case 'user_signup':
        return 'person_add';
      case 'document_uploaded':
        return 'upload_file';
      case 'message_sent':
        return 'chat_bubble';
      default:
        return 'info_outline';
    }
  }

  String get _timeAgo {
    final diff = DateTime.now().difference(entry.createdAt);
    if (diff.inMinutes < 1) return 'just now';
    if (diff.inMinutes < 60) return '${diff.inMinutes}m ago';
    if (diff.inHours < 24) return '${diff.inHours}h ago';
    return '${diff.inDays}d ago';
  }

  String get _roleLabel {
    switch (entry.userRole) {
      case 'field_staff':
        return 'Field Staff';
      case 'supervisor':
        return 'Supervisor';
      case 'manager':
        return 'Manager';
      default:
        return entry.userRole;
    }
  }

  @override
  Widget build(BuildContext context) {
    final color = _actionColor;
    final isFailure = entry.status == 'failed' || entry.action == 'sync_failed';

    return Container(
      margin: const EdgeInsets.only(bottom: 8),
      padding: const EdgeInsets.all(14),
      decoration: BoxDecoration(
        color: AppTheme.surfaceDark.withAlpha(160),
        borderRadius: BorderRadius.circular(12),
        border: Border.all(
          color: isFailure
              ? AppTheme.error.withAlpha(80)
              : const Color(0xFF2A3F55),
          width: 0.5,
        ),
      ),
      child: Row(
        crossAxisAlignment: CrossAxisAlignment.start,
        children: [
          Container(
            width: 36,
            height: 36,
            decoration: BoxDecoration(
              color: color.withAlpha(30),
              borderRadius: BorderRadius.circular(10),
              border: Border.all(color: color.withAlpha(80)),
            ),
            child: Center(
              child: CustomIconWidget(
                iconName: _actionIcon,
                color: color,
                size: 18,
              ),
            ),
          ),
          const SizedBox(width: 12),
          Expanded(
            child: Column(
              crossAxisAlignment: CrossAxisAlignment.start,
              children: [
                Row(
                  children: [
                    Expanded(
                      child: Text(
                        entry.userName.isNotEmpty
                            ? entry.userName
                            : 'Unknown User',
                        style: const TextStyle(
                          fontSize: 13,
                          fontWeight: FontWeight.w600,
                          color: Colors.white,
                        ),
                        overflow: TextOverflow.ellipsis,
                      ),
                    ),
                    const SizedBox(width: 8),
                    Text(
                      _timeAgo,
                      style: const TextStyle(
                        fontSize: 11,
                        color: Color(0xFF8899AA),
                      ),
                    ),
                  ],
                ),
                const SizedBox(height: 3),
                Text(
                  entry.description,
                  style: const TextStyle(
                    fontSize: 12,
                    color: Color(0xFFAABBCC),
                  ),
                  maxLines: 2,
                  overflow: TextOverflow.ellipsis,
                ),
                const SizedBox(height: 6),
                Row(
                  children: [
                    _Chip(label: _roleLabel, color: const Color(0xFF8899AA)),
                    const SizedBox(width: 6),
                    _Chip(
                      label: isFailure ? 'Failed' : 'Success',
                      color: isFailure ? AppTheme.error : AppTheme.success,
                    ),
                    if (entry.entityType.isNotEmpty) ...[
                      const SizedBox(width: 6),
                      _Chip(
                        label: entry.entityType,
                        color: const Color(0xFF5A7A9A),
                      ),
                    ],
                  ],
                ),
              ],
            ),
          ),
        ],
      ),
    );
  }
}

class _Chip extends StatelessWidget {
  final String label;
  final Color color;

  const _Chip({required this.label, required this.color});

  @override
  Widget build(BuildContext context) {
    return Container(
      padding: const EdgeInsets.symmetric(horizontal: 8, vertical: 2),
      decoration: BoxDecoration(
        color: color.withAlpha(25),
        borderRadius: BorderRadius.circular(6),
        border: Border.all(color: color.withAlpha(70)),
      ),
      child: Text(
        label,
        style: TextStyle(
          fontSize: 10,
          color: color,
          fontWeight: FontWeight.w500,
        ),
      ),
    );
  }
}
