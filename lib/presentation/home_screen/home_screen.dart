import 'dart:ui';

import 'package:flutter/material.dart';
import 'package:go_router/go_router.dart';
import 'package:confetti/confetti.dart';

import '../../routes/app_routes.dart';
import '../../services/auth_service.dart';
import '../../services/supabase_service.dart';
import 'package:supabase_flutter/supabase_flutter.dart';
import '../../theme/app_theme.dart';
import '../../widgets/custom_icon_widget.dart';
import '../../services/offline_sync_service.dart';
import './widgets/ai_recommendation_card_widget.dart';
import './widgets/dual_metric_row_widget.dart';
import './widgets/primary_chart_card_widget.dart';
import './widgets/performance_metrics_widget.dart';
import './widgets/sync_status_bar_widget.dart';
import './widgets/timeline_task_item_widget.dart';
import './widgets/week_calendar_strip_widget.dart';

class HomeScreen extends StatefulWidget {
  const HomeScreen({super.key});

  @override
  State<HomeScreen> createState() => _HomeScreenState();
}

class _HomeScreenState extends State<HomeScreen> {
  // Confetti for sales target
  late final ConfettiController _confettiController;
  bool _targetReached = false;
  static const double _dailyRevenueTarget = 100000; // TZS
  int _apiLatencyMs = 0;
  int _realtimeLagMs = 0;
  double _fps = 0.0;
  final OfflineSyncService _syncService = OfflineSyncService.instance;
  final AuthService _authService = AuthService.instance;
  // TODO: Replace with [Riverpod/Bloc] for production
  final bool _isOffline = false;
  int _selectedDayIndex = DateTime.now().weekday - 1;

  // Tasks loaded from Supabase — empty until real data is available
  final List<Map<String, dynamic>> _taskMaps = [];

  // Summary metrics
  int _todayOrders = 0;
  double _todayRevenue = 0;
  bool _isLoadingMetrics = false;
  // Realtime subscription for today's orders
  late final RealtimeChannel _ordersChannel;

  final ScrollController _scrollController = ScrollController();
  bool _appBarVisible = true;
  double _lastScrollOffset = 0;

  @override
  void initState() {
    super.initState();
    _scrollController.addListener(_onScroll);
    _loadMetrics();
    _setupRealtimeMetrics();
    _confettiController = ConfettiController(duration: const Duration(seconds: 3));
  }

  void _onScroll() {
    final offset = _scrollController.offset;
    if (offset > _lastScrollOffset && offset > 72 && _appBarVisible) {
      setState(() => _appBarVisible = false);
    } else if (offset < _lastScrollOffset && !_appBarVisible) {
      setState(() => _appBarVisible = true);
    }
    _lastScrollOffset = offset;
  }

  @override
  void dispose() {
    _scrollController.removeListener(_onScroll);
    _scrollController.dispose();
    _ordersChannel.unsubscribe();
    _confettiController.dispose();
    super.dispose();
  }

  Future<void> _loadMetrics() async {
    setState(() => _isLoadingMetrics = true);
    try {
      final client = SupabaseService.instance.client;
      final today = DateTime.now();
      final startOfDay = DateTime(today.year, today.month, today.day);
      final endOfDay = startOfDay.add(const Duration(days: 1));

      var query = client
          .from('orders')
          .select('subtotal, user_id')
          .gte('created_at', startOfDay.toIso8601String())
          .lt('created_at', endOfDay.toIso8601String());

      // RBAC: field staff only see their own orders
      if (_authService.isFieldStaff) {
        final uid = _authService.currentUserId;
        if (uid.isNotEmpty) {
          query = query.eq('user_id', uid);
        }
      }

      final res = await query;
      final orders = List<Map<String, dynamic>>.from(res);
      _todayOrders = orders.length;
      _todayRevenue = orders.fold(
        0.0,
        (sum, o) => sum + ((o['subtotal'] as num?)?.toDouble() ?? 0.0),
      );
      // Trigger celebration if daily revenue target reached
      if (!_targetReached && _todayRevenue >= _dailyRevenueTarget) {
        _confettiController.play();
        _targetReached = true;
      }
    } catch (e) {
      debugPrint('[Home] Metrics load error: $e');
    } finally {
      if (mounted) setState(() => _isLoadingMetrics = false);
    }
  }
  void _setupRealtimeMetrics() {
    final client = SupabaseService.instance.client;
    final today = DateTime.now();
    final startOfDay = DateTime(today.year, today.month, today.day);
    final endOfDay = startOfDay.add(const Duration(days: 1));

    _ordersChannel = client.channel('public:orders');
    _ordersChannel.onPostgresChanges(
      event: PostgresChangeEvent.all,
      schema: 'public',
      table: 'orders',
      callback: (payload) {
        final newRecord = payload.newRecord as Map<String, dynamic>;
        final createdAtStr = newRecord['created_at'] as String?;
        if (createdAtStr == null) return;
        final createdAt = DateTime.parse(createdAtStr);
        if (createdAt.isAfter(startOfDay) && createdAt.isBefore(endOfDay)) {
          if (_authService.isFieldStaff) {
            final uid = _authService.currentUserId;
            if (uid.isNotEmpty && newRecord['user_id'] != uid) return;
          }
          setState(() {
            _todayOrders += 1;
            _todayRevenue += ((newRecord['subtotal'] as num?)?.toDouble() ?? 0.0);
          });
        }
      },
    ).subscribe();
  }

  @override
  Widget build(BuildContext context) {
    final now = DateTime.now();
    final isTablet = MediaQuery.of(context).size.width >= 600;

    return Stack(
      children: [
        Scaffold(
      backgroundColor: AppTheme.backgroundDark,
      extendBodyBehindAppBar: true,
      appBar: PreferredSize(
        preferredSize: const Size.fromHeight(72),
        child: AnimatedSlide(
          offset: _appBarVisible ? Offset.zero : const Offset(0, -1),
          duration: const Duration(milliseconds: 250),
          curve: Curves.easeInOut,
          child: ClipRect(
            child: BackdropFilter(
              filter: ImageFilter.blur(sigmaX: 16, sigmaY: 16),
              child: Container(
                decoration: BoxDecoration(
                  color: AppTheme.backgroundDark.withAlpha(191),
                  border: const Border(
                    bottom: BorderSide(color: Color(0xFF243447), width: 0.5),
                  ),
                ),
                child: SafeArea(
                  bottom: false,
                  child: Padding(
                    padding: const EdgeInsets.symmetric(
                      horizontal: 20,
                      vertical: 12,
                    ),
                    child: Row(
                      children: [
                        // Logo
                        Container(
                          width: 36,
                          height: 36,
                          decoration: BoxDecoration(
                            borderRadius: BorderRadius.circular(9),
                          ),
                          child: ClipRRect(
                            borderRadius: BorderRadius.circular(9),
                            child: Image.asset(
                              'assets/images/Picture1-1789308473747.png',
                              fit: BoxFit.cover,
                              semanticLabel: 'ZamZam Field logo',
                            ),
                          ),
                        ),
                        const SizedBox(width: 10),
                        Expanded(
                          child: Column(
                            crossAxisAlignment: CrossAxisAlignment.start,
                            mainAxisSize: MainAxisSize.min,
                            children: [
                              Text(
                                _greeting(),
                                style: const TextStyle(
                                  fontSize: 13,
                                  color: Color(0xFF8899AA),
                                ),
                              ),
                              Text(
                                _authService.currentUserName,
                                style: const TextStyle(
                                  fontSize: 18,
                                  fontWeight: FontWeight.w700,
                                  color: Colors.white,
                                ),
                              ),
                            ],
                          ),
                        ),
                        // Sync indicator
                        ListenableBuilder(
                          listenable: _syncService,
                          builder: (context, _) => _SyncDot(
                            isOffline: !_syncService.isOnline,
                            pendingCount: _syncService.totalPendingCount,
                            isFailed: _syncService.failedCount > 0,
                          ),
                        ),
                        const SizedBox(width: 12),
                        // Notification bell — tappable
                        GestureDetector(
                          onTap: () {
                            ScaffoldMessenger.of(context).showSnackBar(
                              SnackBar(
                                content: const Text('No new notifications'),
                                backgroundColor: AppTheme.surfaceDark,
                                behavior: SnackBarBehavior.floating,
                                shape: RoundedRectangleBorder(
                                  borderRadius: BorderRadius.circular(10),
                                ),
                                duration: const Duration(seconds: 2),
                              ),
                            );
                          },
                          child: Stack(
                            children: [
                              Container(
                                width: 40,
                                height: 40,
                                decoration: BoxDecoration(
                                  color: AppTheme.surfaceVariantDark.withAlpha(
                                    153,
                                  ),
                                  borderRadius: BorderRadius.circular(10),
                                ),
                                child: Center(
                                  child: CustomIconWidget(
                                    iconName: 'notifications_outlined',
                                    color: const Color(0xFFB0C4D8),
                                    size: 22,
                                  ),
                                ),
                              ),
                              Positioned(
                                top: 6,
                                right: 6,
                                child: Container(
                                  width: 8,
                                  height: 8,
                                  decoration: BoxDecoration(
                                    color: AppTheme.error,
                                    shape: BoxShape.circle,
                                    border: Border.all(
                                      color: AppTheme.backgroundDark,
                                      width: 1.5,
                                    ),
                                  ),
                                ),
                              ),
                            ],
                          ),
                        ),
                        const SizedBox(width: 10),
                        // Avatar
                        Container(
                          width: 40,
                          height: 40,
                          decoration: BoxDecoration(
                            gradient: const LinearGradient(
                              colors: [AppTheme.primaryLight, AppTheme.accent],
                              begin: Alignment.topLeft,
                              end: Alignment.bottomRight,
                            ),
                            borderRadius: BorderRadius.circular(10),
                          ),
                          child: Center(
                            child: Text(
                              _authService.currentUserName.isNotEmpty
                                  ? _authService.currentUserName
                                        .split(' ')
                                        .take(2)
                                        .map(
                                          (w) => w.isNotEmpty
                                              ? w[0].toUpperCase()
                                              : '',
                                        )
                                        .join()
                                  : 'U',
                              style: const TextStyle(
                                fontSize: 13,
                                fontWeight: FontWeight.w700,
                                color: Colors.white,
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
      ),
      body: RefreshIndicator(
        color: AppTheme.accent,
        backgroundColor: AppTheme.surfaceDark,
        onRefresh: () async {
          await _loadMetrics();
        },
        child: CustomScrollView(
          controller: _scrollController,
          physics: const AlwaysScrollableScrollPhysics(),
          slivers: [
            SliverToBoxAdapter(
              child: SizedBox(height: MediaQuery.of(context).padding.top + 72),
            ),
            // Offline sync banner
            SliverToBoxAdapter(
              child: ListenableBuilder(
                listenable: _syncService,
                builder: (context, _) =>
                    SyncStatusBarWidget(syncService: _syncService),
              ),
            ),
            // Week calendar strip
            SliverToBoxAdapter(
              child: Padding(
                padding: const EdgeInsets.fromLTRB(20, 16, 20, 0),
                child: WeekCalendarStripWidget(
                  currentDate: now,
                  selectedIndex: _selectedDayIndex,
                  onDaySelected: (i) => setState(() => _selectedDayIndex = i),
                ),
              ),
            ),
            const SliverToBoxAdapter(child: SizedBox(height: 16)),
            // Today's KPI summary row
            SliverToBoxAdapter(
              child: Padding(
                padding: const EdgeInsets.symmetric(horizontal: 20),
                child: _isLoadingMetrics
                    ? Container(
                        height: 72,
                        decoration: BoxDecoration(
                          color: AppTheme.surfaceDark.withAlpha(128),
                          borderRadius: BorderRadius.circular(14),
                        ),
                        child: const Center(
                          child: SizedBox(
                            width: 20,
                            height: 20,
                            child: CircularProgressIndicator(
                              strokeWidth: 2,
                              color: AppTheme.accent,
                            ),
                          ),
                        ),
                      )
                    : Row(
                        children: [
                          Expanded(
                            child: _KpiCard(
                              label: "Today's Orders",
                              value: '$_todayOrders',
                              iconName: 'receipt_long',
                              color: AppTheme.accent,
                            ),
                          ),
                          const SizedBox(width: 12),
                          Expanded(
                            child: _KpiCard(
                              label: "Today's Revenue",
                              value: _todayRevenue >= 1000
                                  ? 'TZS ${(_todayRevenue / 1000).toStringAsFixed(1)}K'
                                  : 'TZS ${_todayRevenue.toStringAsFixed(0)}',
                              iconName: 'payments_outlined',
                              color: AppTheme.success,
                            ),
                          ),
                        ],
                      ),
              ),
            ),
            const SliverToBoxAdapter(child: SizedBox(height: 16)),
            // Dual metric row
            SliverToBoxAdapter(
              child: Padding(
                padding: const EdgeInsets.symmetric(horizontal: 20),
                child: DualMetricRowWidget(),
              ),
            ),
            const SliverToBoxAdapter(child: SizedBox(height: 16)),
            // AI Recommendation card
            SliverToBoxAdapter(
              child: Padding(
                padding: const EdgeInsets.symmetric(horizontal: 20),
                child: AiRecommendationCardWidget(),
              ),
            ),
            const SliverToBoxAdapter(child: SizedBox(height: 16)),
            // Primary chart card
            SliverToBoxAdapter(
              child: Padding(
                padding: const EdgeInsets.symmetric(horizontal: 20),
                child: PrimaryChartCardWidget(),
              ),
            ),
            const SliverToBoxAdapter(child: SizedBox(height: 20)),
// Performance metrics section
const SliverToBoxAdapter(child: SizedBox(height: 16)),
SliverToBoxAdapter(
  child: Padding(
    padding: const EdgeInsets.symmetric(horizontal: 20),
    child: PerformanceMetricsWidget(todayOrders: _todayOrders, todayRevenue: _todayRevenue, apiLatencyMs: _apiLatencyMs, realtimeLagMs: _realtimeLagMs, fps: _fps),
  ),
),
const SliverToBoxAdapter(child: SizedBox(height: 16)),
            // Timeline tasks header
            SliverToBoxAdapter(
              child: Padding(
                padding: const EdgeInsets.symmetric(horizontal: 20),
                child: Row(
                  children: [
                    const Text(
                      "Today's Schedule",
                      style: TextStyle(
                        fontSize: 16,
                        fontWeight: FontWeight.w700,
                        color: Colors.white,
                      ),
                    ),
                    const Spacer(),
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
                        '${_taskMaps.where((t) => t['status'] == 'pending').length} pending',
                        style: TextStyle(
                          fontSize: 11,
                          fontWeight: FontWeight.w600,
                          color: AppTheme.accent,
                        ),
                      ),
                    ),
                  ],
                ),
              ),
            ),
            const SliverToBoxAdapter(child: SizedBox(height: 12)),
            // Timeline task items
            _taskMaps.isEmpty
                ? SliverToBoxAdapter(
                    child: Padding(
                      padding: EdgeInsets.only(
                        left: 20,
                        right: 20,
                        bottom: MediaQuery.of(context).padding.bottom + 100,
                        top: 8,
                      ),
                      child: Container(
                        padding: const EdgeInsets.symmetric(vertical: 32),
                        decoration: BoxDecoration(
                          color: AppTheme.surfaceDark,
                          borderRadius: BorderRadius.circular(14),
                          border: Border.all(
                            color: const Color(0xFF3A5068),
                            width: 0.5,
                          ),
                        ),
                        child: Column(
                          children: [
                            Icon(
                              Icons.event_available_outlined,
                              color: const Color(0xFF8899AA),
                              size: 32,
                            ),
                            const SizedBox(height: 10),
                            const Text(
                              'No tasks scheduled today',
                              style: TextStyle(
                                fontSize: 14,
                                color: Color(0xFF8899AA),
                              ),
                            ),
                          ],
                        ),
                      ),
                    ),
                  )
                : SliverList(
                    delegate: SliverChildBuilderDelegate((context, index) {
                      final task = _taskMaps[index];
                      final isLast = index == _taskMaps.length - 1;
                      return Padding(
                        padding: EdgeInsets.only(
                          left: 20,
                          right: 20,
                          bottom: isLast
                              ? MediaQuery.of(context).padding.bottom + 100
                              : 0,
                        ),
                        child: TimelineTaskItemWidget(
                          time: task['time'] as String,
                          timeRange: task['timeRange'] as String,
                          title: task['title'] as String,
                          subtitle: task['subtitle'] as String,
                          iconName: task['iconName'] as String,
                          iconColor: Color(task['iconColor'] as int),
                          status: task['status'] as String,
                          isCompleted: task['isCompleted'] as bool,
                          isLast: isLast,
                          onToggle: () {
                            setState(() {
                              _taskMaps[index]['isCompleted'] =
                                  !(_taskMaps[index]['isCompleted'] as bool);
                            });
                          },
                        ),
                      );
                    }, childCount: _taskMaps.length),
                  ),
          ],
        ),
      ),
      floatingActionButton: FloatingActionButton.extended(
        onPressed: () => context.go(AppRoutes.orderPaymentScreen),
        icon: CustomIconWidget(
          iconName: 'add_rounded',
          color: AppTheme.backgroundDark,
          size: 20,
        ),
        label: const Text(
          'New Order',
          style: TextStyle(
            fontWeight: FontWeight.w700,
            color: AppTheme.backgroundDark,
          ),
        ),
        backgroundColor: AppTheme.accent,
      ),
              ),
          // Confetti overlay
          Align(
            alignment: Alignment.topCenter,
            child: ConfettiWidget(
              confettiController: _confettiController,
              blastDirectionality: BlastDirectionality.explosive,
              shouldLoop: false,
              colors: const [
                Colors.yellow,
                Colors.red,
                Colors.blue,
                Colors.green,
                Colors.orange,
              ],
            ),
          ),
          // Target reached overlay
          if (_targetReached)
            Positioned.fill(
              child: Container(
                color: Colors.black45,
                alignment: Alignment.center,
                child: Card(
                  color: Colors.white,
                  shape: RoundedRectangleBorder(borderRadius: BorderRadius.circular(16)),
                  child: Padding(
                    padding: const EdgeInsets.symmetric(horizontal: 24, vertical: 32),
                    child: Column(
                      mainAxisSize: MainAxisSize.min,
                      children: const [
                        Icon(Icons.celebration, size: 48, color: Colors.amber),
                        SizedBox(height: 12),
                        Text(
                          'Daily Sales Target Reached!',
                          style: TextStyle(fontSize: 20, fontWeight: FontWeight.bold),
                        ),
                        SizedBox(height: 8),
                        Text(
                          'Great job! Keep up the excellent work.',
                          textAlign: TextAlign.center,
                        ),
                      ],
                    ),
                  ),
                ),
              ),
            ),
        ],
      );
  }

  String _greeting() {
    final hour = DateTime.now().hour;
    if (hour < 12) return 'Good morning,';
    if (hour < 17) return 'Good afternoon,';
    return 'Good evening,';
  }
}

class _SyncDot extends StatefulWidget {
  final bool isOffline;
  final int pendingCount;
  final bool isFailed;

  const _SyncDot({
    required this.isOffline,
    required this.pendingCount,
    this.isFailed = false,
  });

  @override
  State<_SyncDot> createState() => _SyncDotState();
}

class _SyncDotState extends State<_SyncDot>
    with SingleTickerProviderStateMixin {
  late AnimationController _pulse;

  @override
  void initState() {
    super.initState();
    _pulse = AnimationController(
      vsync: this,
      duration: const Duration(milliseconds: 1200),
    )..repeat(reverse: true);
  }

  @override
  void dispose() {
    _pulse.dispose();
    super.dispose();
  }

  @override
  Widget build(BuildContext context) {
    final color = widget.isFailed
        ? AppTheme.error
        : widget.isOffline
        ? AppTheme.warning
        : AppTheme.success;
    final label = widget.isFailed
        ? '${widget.pendingCount} failed'
        : widget.isOffline
        ? (widget.pendingCount > 0
              ? '${widget.pendingCount} pending'
              : 'Offline')
        : 'Synced';

    return AnimatedBuilder(
      animation: _pulse,
      builder: (context, child) {
        return Container(
          padding: const EdgeInsets.symmetric(horizontal: 10, vertical: 5),
          decoration: BoxDecoration(
            color: color.withOpacity(0.1 + _pulse.value * 0.05),
            borderRadius: BorderRadius.circular(20),
            border: Border.all(color: color.withAlpha(77)),
          ),
          child: Row(
            mainAxisSize: MainAxisSize.min,
            children: [
              Container(
                width: 7,
                height: 7,
                decoration: BoxDecoration(
                  color: color.withOpacity(0.6 + _pulse.value * 0.4),
                  shape: BoxShape.circle,
                ),
              ),
              const SizedBox(width: 6),
              Text(
                label,
                style: TextStyle(
                  fontSize: 11,
                  fontWeight: FontWeight.w600,
                  color: color,
                ),
              ),
            ],
          ),
        );
      },
    );
  }
}

class _KpiCard extends StatelessWidget {
  final String label;
  final String value;
  final String iconName;
  final Color color;

  const _KpiCard({
    required this.label,
    required this.value,
    required this.iconName,
    required this.color,
  });

  @override
  Widget build(BuildContext context) {
    return Container(
      padding: const EdgeInsets.symmetric(horizontal: 14, vertical: 12),
      decoration: BoxDecoration(
        color: AppTheme.surfaceDark.withAlpha(179),
        borderRadius: BorderRadius.circular(14),
        border: Border.all(color: const Color(0xFF3A5068), width: 0.5),
      ),
      child: Row(
        children: [
          Container(
            width: 36,
            height: 36,
            decoration: BoxDecoration(
              color: color.withAlpha(31),
              borderRadius: BorderRadius.circular(9),
            ),
            child: Center(
              child: CustomIconWidget(
                iconName: iconName,
                color: color,
                size: 18,
              ),
            ),
          ),
          const SizedBox(width: 10),
          Expanded(
            child: Column(
              crossAxisAlignment: CrossAxisAlignment.start,
              children: [
                Text(
                  label,
                  style: const TextStyle(
                    fontSize: 10,
                    color: Color(0xFF8899AA),
                    fontWeight: FontWeight.w500,
                  ),
                  overflow: TextOverflow.ellipsis,
                ),
                const SizedBox(height: 2),
                Text(
                  value,
                  style: TextStyle(
                    fontSize: 14,
                    fontWeight: FontWeight.w700,
                    color: color,
                  ),
                  overflow: TextOverflow.ellipsis,
                ),
              ],
            ),
          ),
        ],
      ),
    );
  }
}
