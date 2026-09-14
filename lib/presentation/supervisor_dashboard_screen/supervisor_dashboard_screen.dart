import 'dart:ui';
import 'package:flutter/material.dart';
import 'package:google_fonts/google_fonts.dart';
import '../../theme/app_theme.dart';
import '../../widgets/custom_icon_widget.dart';
import '../../services/supabase_service.dart';

class SupervisorDashboardScreen extends StatefulWidget {
  const SupervisorDashboardScreen({super.key});

  @override
  State<SupervisorDashboardScreen> createState() =>
      _SupervisorDashboardScreenState();
}

class _SupervisorDashboardScreenState extends State<SupervisorDashboardScreen>
    with SingleTickerProviderStateMixin {
  late TabController _tabController;
  bool _isLoading = false;
  List<Map<String, dynamic>> _pendingOrders = [];
  List<Map<String, dynamic>> _pendingReports = [];
  final List<Map<String, dynamic>> _teamMetrics = [];

  // Team members loaded from Supabase — no mock data
  final List<Map<String, dynamic>> _teamMembers = [];

  @override
  void initState() {
    super.initState();
    _tabController = TabController(length: 3, vsync: this);
    _loadData();
  }

  @override
  void dispose() {
    _tabController.dispose();
    super.dispose();
  }

  Future<void> _loadData() async {
    setState(() => _isLoading = true);
    try {
      final client = SupabaseService.instance.client;
      // Supervisors and managers always have god's-eye view — no user_id filter
      // This is enforced by RLS: is_manager_or_supervisor() returns true for these roles

      // Load pending orders
      final ordersRes = await client
          .from('orders')
          .select()
          .eq('sync_status', 'synced')
          .order('created_at', ascending: false)
          .limit(20);
      _pendingOrders = List<Map<String, dynamic>>.from(ordersRes);

      // Load submitted EOD reports
      final reportsRes = await client
          .from('eod_reports')
          .select()
          .eq('sync_status', 'submitted')
          .order('created_at', ascending: false)
          .limit(20);
      _pendingReports = List<Map<String, dynamic>>.from(reportsRes);
    } catch (e) {
      debugPrint('[Supervisor] Load error: $e');
    }
    if (mounted) setState(() => _isLoading = false);
  }

  Future<void> _approveOrder(Map<String, dynamic> order) async {
    try {
      final client = SupabaseService.instance.client;
      await client
          .from('orders')
          .update({'sync_status': 'synced'})
          .eq('id', order['id']);
      setState(() => _pendingOrders.remove(order));
      if (mounted) {
        ScaffoldMessenger.of(context).showSnackBar(
          SnackBar(
            content: Text('Order approved'),
            backgroundColor: AppTheme.success,
            behavior: SnackBarBehavior.floating,
          ),
        );
      }
    } catch (e) {
      debugPrint('[Supervisor] Approve error: $e');
    }
  }

  Future<void> _approveReport(Map<String, dynamic> report) async {
    try {
      final client = SupabaseService.instance.client;
      await client
          .from('eod_reports')
          .update({'sync_status': 'submitted'})
          .eq('id', report['id']);
      setState(() => _pendingReports.remove(report));
      if (mounted) {
        ScaffoldMessenger.of(context).showSnackBar(
          SnackBar(
            content: Text('Report reviewed'),
            backgroundColor: AppTheme.success,
            behavior: SnackBarBehavior.floating,
          ),
        );
      }
    } catch (e) {
      debugPrint('[Supervisor] Approve report error: $e');
    }
  }

  @override
  Widget build(BuildContext context) {
    return Scaffold(
      backgroundColor: AppTheme.backgroundDark,
      extendBodyBehindAppBar: true,
      appBar: PreferredSize(
        preferredSize: const Size.fromHeight(108),
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
                child: Column(
                  children: [
                    Padding(
                      padding: const EdgeInsets.fromLTRB(20, 12, 20, 8),
                      child: Row(
                        children: [
                          Expanded(
                            child: Column(
                              crossAxisAlignment: CrossAxisAlignment.start,
                              mainAxisSize: MainAxisSize.min,
                              children: [
                                Text(
                                  'Supervisor Panel',
                                  style: GoogleFonts.ibmPlexSans(
                                    fontSize: 13,
                                    color: const Color(0xFF8899AA),
                                  ),
                                ),
                                Text(
                                  'Team Overview',
                                  style: GoogleFonts.ibmPlexSans(
                                    fontSize: 18,
                                    fontWeight: FontWeight.w700,
                                    color: Colors.white,
                                  ),
                                ),
                              ],
                            ),
                          ),
                          GestureDetector(
                            onTap: _loadData,
                            child: Container(
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
                                  iconName: 'refresh',
                                  color: const Color(0xFFB0C4D8),
                                  size: 20,
                                ),
                              ),
                            ),
                          ),
                          const SizedBox(width: 10),
                          Container(
                            width: 40,
                            height: 40,
                            decoration: BoxDecoration(
                              gradient: const LinearGradient(
                                colors: [
                                  AppTheme.primaryLight,
                                  AppTheme.accent,
                                ],
                                begin: Alignment.topLeft,
                                end: Alignment.bottomRight,
                              ),
                              borderRadius: BorderRadius.circular(10),
                            ),
                            child: const Center(
                              child: Text(
                                'SM',
                                style: TextStyle(
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
                    TabBar(
                      controller: _tabController,
                      indicatorColor: AppTheme.accent,
                      indicatorWeight: 2,
                      labelColor: AppTheme.accent,
                      unselectedLabelColor: const Color(0xFF8899AA),
                      labelStyle: GoogleFonts.ibmPlexSans(
                        fontSize: 12,
                        fontWeight: FontWeight.w600,
                      ),
                      unselectedLabelStyle: GoogleFonts.ibmPlexSans(
                        fontSize: 12,
                        fontWeight: FontWeight.w400,
                      ),
                      tabs: [
                        Tab(
                          child: Row(
                            mainAxisSize: MainAxisSize.min,
                            children: [
                              const Text('Orders'),
                              if (_pendingOrders.isNotEmpty) ...[
                                const SizedBox(width: 6),
                                _BadgePill(count: _pendingOrders.length),
                              ],
                            ],
                          ),
                        ),
                        Tab(
                          child: Row(
                            mainAxisSize: MainAxisSize.min,
                            children: [
                              const Text('Reports'),
                              if (_pendingReports.isNotEmpty) ...[
                                const SizedBox(width: 6),
                                _BadgePill(count: _pendingReports.length),
                              ],
                            ],
                          ),
                        ),
                        const Tab(text: 'Team'),
                      ],
                    ),
                  ],
                ),
              ),
            ),
          ),
        ),
      ),
      body: _isLoading
          ? const Center(
              child: CircularProgressIndicator(color: AppTheme.accent),
            )
          : TabBarView(
              controller: _tabController,
              children: [
                _OrdersTab(
                  orders: _pendingOrders,
                  onApprove: _approveOrder,
                  onRefresh: _loadData,
                ),
                _ReportsTab(
                  reports: _pendingReports,
                  onApprove: _approveReport,
                  onRefresh: _loadData,
                ),
                _TeamTab(members: _teamMembers),
              ],
            ),
    );
  }
}

// ─── Badge Pill ──────────────────────────────────────────────────────────────

class _BadgePill extends StatelessWidget {
  final int count;
  const _BadgePill({required this.count});

  @override
  Widget build(BuildContext context) {
    return Container(
      padding: const EdgeInsets.symmetric(horizontal: 6, vertical: 2),
      decoration: BoxDecoration(
        color: AppTheme.warning.withAlpha(40),
        borderRadius: BorderRadius.circular(10),
        border: Border.all(color: AppTheme.warning.withAlpha(80), width: 1),
      ),
      child: Text(
        '$count',
        style: const TextStyle(
          fontSize: 10,
          fontWeight: FontWeight.w700,
          color: AppTheme.warning,
        ),
      ),
    );
  }
}

// ─── Orders Tab ──────────────────────────────────────────────────────────────

class _OrdersTab extends StatelessWidget {
  final List<Map<String, dynamic>> orders;
  final void Function(Map<String, dynamic>) onApprove;
  final Future<void> Function() onRefresh;

  const _OrdersTab({
    required this.orders,
    required this.onApprove,
    required this.onRefresh,
  });

  @override
  Widget build(BuildContext context) {
    return RefreshIndicator(
      color: AppTheme.accent,
      backgroundColor: AppTheme.surfaceDark,
      onRefresh: onRefresh,
      child: CustomScrollView(
        slivers: [
          SliverToBoxAdapter(
            child: SizedBox(height: MediaQuery.of(context).padding.top + 108),
          ),
          if (orders.isEmpty)
            SliverFillRemaining(
              child: _EmptyState(
                icon: 'receipt_long',
                title: 'No Pending Orders',
                subtitle: 'All orders have been reviewed',
              ),
            )
          else ...[
            SliverToBoxAdapter(
              child: Padding(
                padding: const EdgeInsets.fromLTRB(20, 16, 20, 8),
                child: _SummaryMetricRow(
                  metrics: [
                    _Metric(
                      label: 'Pending',
                      value: '${orders.length}',
                      color: AppTheme.warning,
                    ),
                    _Metric(
                      label: 'Total Value',
                      value:
                          'TZS ${orders.fold(0.0, (s, o) => s + ((o['subtotal'] as num?)?.toDouble() ?? 0)).toStringAsFixed(0)}',
                      color: AppTheme.accent,
                    ),
                  ],
                ),
              ),
            ),
            SliverList(
              delegate: SliverChildBuilderDelegate(
                (context, i) => Padding(
                  padding: const EdgeInsets.fromLTRB(20, 0, 20, 12),
                  child: _OrderCard(
                    order: orders[i],
                    onApprove: () => onApprove(orders[i]),
                  ),
                ),
                childCount: orders.length,
              ),
            ),
          ],
          const SliverToBoxAdapter(child: SizedBox(height: 100)),
        ],
      ),
    );
  }
}

class _OrderCard extends StatelessWidget {
  final Map<String, dynamic> order;
  final VoidCallback onApprove;

  const _OrderCard({required this.order, required this.onApprove});

  @override
  Widget build(BuildContext context) {
    final subtotal = (order['subtotal'] as num?)?.toDouble() ?? 0;
    final customerName = order['customer_name'] as String? ?? 'Unknown';
    final staffId = order['staff_id'] as String? ?? '-';
    final paymentMethod = order['payment_method'] as String? ?? '-';
    final createdAt = order['created_at'] != null
        ? DateTime.tryParse(order['created_at'] as String)
        : null;

    return Container(
      decoration: BoxDecoration(
        color: AppTheme.surfaceDark,
        borderRadius: BorderRadius.circular(14),
        border: Border.all(color: const Color(0xFF3A5068), width: 0.5),
      ),
      child: Padding(
        padding: const EdgeInsets.all(16),
        child: Column(
          crossAxisAlignment: CrossAxisAlignment.start,
          children: [
            Row(
              children: [
                Container(
                  width: 36,
                  height: 36,
                  decoration: BoxDecoration(
                    color: AppTheme.accent.withAlpha(30),
                    borderRadius: BorderRadius.circular(9),
                  ),
                  child: const Icon(
                    Icons.receipt_long,
                    color: AppTheme.accent,
                    size: 18,
                  ),
                ),
                const SizedBox(width: 12),
                Expanded(
                  child: Column(
                    crossAxisAlignment: CrossAxisAlignment.start,
                    children: [
                      Text(
                        customerName,
                        style: GoogleFonts.ibmPlexSans(
                          fontSize: 14,
                          fontWeight: FontWeight.w600,
                          color: Colors.white,
                        ),
                        overflow: TextOverflow.ellipsis,
                      ),
                      Text(
                        'Staff: $staffId',
                        style: GoogleFonts.ibmPlexSans(
                          fontSize: 12,
                          color: const Color(0xFF8899AA),
                        ),
                      ),
                    ],
                  ),
                ),
                Text(
                  'TZS ${subtotal.toStringAsFixed(0)}',
                  style: GoogleFonts.ibmPlexSans(
                    fontSize: 15,
                    fontWeight: FontWeight.w700,
                    color: AppTheme.success,
                  ),
                ),
              ],
            ),
            const SizedBox(height: 12),
            Row(
              children: [
                _InfoChip(
                  icon: Icons.payment,
                  label: paymentMethod,
                  color: const Color(0xFF8899AA),
                ),
                const SizedBox(width: 8),
                if (createdAt != null)
                  _InfoChip(
                    icon: Icons.access_time,
                    label:
                        '${createdAt.hour.toString().padLeft(2, '0')}:${createdAt.minute.toString().padLeft(2, '0')}',
                    color: const Color(0xFF8899AA),
                  ),
                const Spacer(),
                GestureDetector(
                  onTap: onApprove,
                  child: Container(
                    padding: const EdgeInsets.symmetric(
                      horizontal: 14,
                      vertical: 7,
                    ),
                    decoration: BoxDecoration(
                      color: AppTheme.success.withAlpha(30),
                      borderRadius: BorderRadius.circular(8),
                      border: Border.all(
                        color: AppTheme.success.withAlpha(80),
                        width: 1,
                      ),
                    ),
                    child: Text(
                      'Approve',
                      style: GoogleFonts.ibmPlexSans(
                        fontSize: 12,
                        fontWeight: FontWeight.w600,
                        color: AppTheme.success,
                      ),
                    ),
                  ),
                ),
              ],
            ),
          ],
        ),
      ),
    );
  }
}

// ─── Reports Tab ─────────────────────────────────────────────────────────────

class _ReportsTab extends StatelessWidget {
  final List<Map<String, dynamic>> reports;
  final void Function(Map<String, dynamic>) onApprove;
  final Future<void> Function() onRefresh;

  const _ReportsTab({
    required this.reports,
    required this.onApprove,
    required this.onRefresh,
  });

  @override
  Widget build(BuildContext context) {
    return RefreshIndicator(
      color: AppTheme.accent,
      backgroundColor: AppTheme.surfaceDark,
      onRefresh: onRefresh,
      child: CustomScrollView(
        slivers: [
          SliverToBoxAdapter(
            child: SizedBox(height: MediaQuery.of(context).padding.top + 108),
          ),
          if (reports.isEmpty)
            SliverFillRemaining(
              child: _EmptyState(
                icon: 'assignment',
                title: 'No Pending Reports',
                subtitle: 'All EOD reports have been reviewed',
              ),
            )
          else ...[
            SliverToBoxAdapter(
              child: Padding(
                padding: const EdgeInsets.fromLTRB(20, 16, 20, 8),
                child: _SummaryMetricRow(
                  metrics: [
                    _Metric(
                      label: 'Awaiting Review',
                      value: '${reports.length}',
                      color: AppTheme.warning,
                    ),
                    _Metric(
                      label: 'Total Revenue',
                      value:
                          'TZS ${reports.fold(0.0, (s, r) => s + ((r['total_revenue'] as num?)?.toDouble() ?? 0)).toStringAsFixed(0)}',
                      color: AppTheme.accent,
                    ),
                  ],
                ),
              ),
            ),
            SliverList(
              delegate: SliverChildBuilderDelegate(
                (context, i) => Padding(
                  padding: const EdgeInsets.fromLTRB(20, 0, 20, 12),
                  child: _ReportCard(
                    report: reports[i],
                    onReview: () => onApprove(reports[i]),
                  ),
                ),
                childCount: reports.length,
              ),
            ),
          ],
          const SliverToBoxAdapter(child: SizedBox(height: 100)),
        ],
      ),
    );
  }
}

class _ReportCard extends StatelessWidget {
  final Map<String, dynamic> report;
  final VoidCallback onReview;

  const _ReportCard({required this.report, required this.onReview});

  @override
  Widget build(BuildContext context) {
    final staffId = report['staff_id'] as String? ?? '-';
    final reportDate = report['report_date'] as String? ?? '-';
    final totalRevenue = (report['total_revenue'] as num?)?.toDouble() ?? 0;
    final totalDeliveries = report['total_deliveries'] as int? ?? 0;
    final deliveredCount = report['delivered_count'] as int? ?? 0;
    final fieldNotes = report['field_notes'] as String? ?? '';

    return Container(
      decoration: BoxDecoration(
        color: AppTheme.surfaceDark,
        borderRadius: BorderRadius.circular(14),
        border: Border.all(color: const Color(0xFF3A5068), width: 0.5),
      ),
      child: Padding(
        padding: const EdgeInsets.all(16),
        child: Column(
          crossAxisAlignment: CrossAxisAlignment.start,
          children: [
            Row(
              children: [
                Container(
                  width: 36,
                  height: 36,
                  decoration: BoxDecoration(
                    color: AppTheme.warning.withAlpha(30),
                    borderRadius: BorderRadius.circular(9),
                  ),
                  child: const Icon(
                    Icons.assignment,
                    color: AppTheme.warning,
                    size: 18,
                  ),
                ),
                const SizedBox(width: 12),
                Expanded(
                  child: Column(
                    crossAxisAlignment: CrossAxisAlignment.start,
                    children: [
                      Text(
                        'EOD Report — $reportDate',
                        style: GoogleFonts.ibmPlexSans(
                          fontSize: 14,
                          fontWeight: FontWeight.w600,
                          color: Colors.white,
                        ),
                        overflow: TextOverflow.ellipsis,
                      ),
                      Text(
                        'Staff: $staffId',
                        style: GoogleFonts.ibmPlexSans(
                          fontSize: 12,
                          color: const Color(0xFF8899AA),
                        ),
                      ),
                    ],
                  ),
                ),
              ],
            ),
            const SizedBox(height: 12),
            Row(
              children: [
                _MetricMini(
                  label: 'Revenue',
                  value: 'TZS ${totalRevenue.toStringAsFixed(0)}',
                  color: AppTheme.success,
                ),
                const SizedBox(width: 12),
                _MetricMini(
                  label: 'Deliveries',
                  value: '$deliveredCount/$totalDeliveries',
                  color: AppTheme.accent,
                ),
              ],
            ),
            if (fieldNotes.isNotEmpty) ...[
              const SizedBox(height: 10),
              Container(
                padding: const EdgeInsets.all(10),
                decoration: BoxDecoration(
                  color: AppTheme.surfaceVariantDark,
                  borderRadius: BorderRadius.circular(8),
                ),
                child: Text(
                  fieldNotes,
                  style: GoogleFonts.ibmPlexSans(
                    fontSize: 12,
                    color: const Color(0xFFB0C4D8),
                  ),
                  maxLines: 2,
                  overflow: TextOverflow.ellipsis,
                ),
              ),
            ],
            const SizedBox(height: 12),
            Row(
              mainAxisAlignment: MainAxisAlignment.end,
              children: [
                GestureDetector(
                  onTap: onReview,
                  child: Container(
                    padding: const EdgeInsets.symmetric(
                      horizontal: 14,
                      vertical: 7,
                    ),
                    decoration: BoxDecoration(
                      color: AppTheme.accent.withAlpha(30),
                      borderRadius: BorderRadius.circular(8),
                      border: Border.all(
                        color: AppTheme.accent.withAlpha(80),
                        width: 1,
                      ),
                    ),
                    child: Text(
                      'Mark Reviewed',
                      style: GoogleFonts.ibmPlexSans(
                        fontSize: 12,
                        fontWeight: FontWeight.w600,
                        color: AppTheme.accent,
                      ),
                    ),
                  ),
                ),
              ],
            ),
          ],
        ),
      ),
    );
  }
}

// ─── Team Tab ────────────────────────────────────────────────────────────────

class _TeamTab extends StatelessWidget {
  final List<Map<String, dynamic>> members;
  const _TeamTab({required this.members});

  @override
  Widget build(BuildContext context) {
    final totalRevenue = members.fold(
      0.0,
      (s, m) => s + (m['revenue'] as double),
    );
    final totalDeliveries = members.fold(
      0,
      (s, m) => s + (m['deliveries'] as int),
    );
    final activeCount = members.where((m) => m['status'] == 'active').length;

    return CustomScrollView(
      slivers: [
        SliverToBoxAdapter(
          child: SizedBox(height: MediaQuery.of(context).padding.top + 108),
        ),
        SliverToBoxAdapter(
          child: Padding(
            padding: const EdgeInsets.fromLTRB(20, 16, 20, 16),
            child: Column(
              crossAxisAlignment: CrossAxisAlignment.start,
              children: [
                // Summary cards row
                Row(
                  children: [
                    Expanded(
                      child: _StatCard(
                        label: 'Active Staff',
                        value: '$activeCount/${members.length}',
                        icon: Icons.people,
                        color: AppTheme.success,
                      ),
                    ),
                    const SizedBox(width: 12),
                    Expanded(
                      child: _StatCard(
                        label: 'Total Deliveries',
                        value: '$totalDeliveries',
                        icon: Icons.local_shipping,
                        color: AppTheme.accent,
                      ),
                    ),
                    const SizedBox(width: 12),
                    Expanded(
                      child: _StatCard(
                        label: 'Team Revenue',
                        value:
                            'TZS ${(totalRevenue / 1000).toStringAsFixed(1)}k',
                        icon: Icons.payments,
                        color: AppTheme.warning,
                      ),
                    ),
                  ],
                ),
                const SizedBox(height: 20),
                Text(
                  'Team Performance',
                  style: GoogleFonts.ibmPlexSans(
                    fontSize: 15,
                    fontWeight: FontWeight.w600,
                    color: Colors.white,
                  ),
                ),
                const SizedBox(height: 12),
              ],
            ),
          ),
        ),
        SliverList(
          delegate: SliverChildBuilderDelegate(
            (context, i) => Padding(
              padding: const EdgeInsets.fromLTRB(20, 0, 20, 12),
              child: _TeamMemberCard(member: members[i]),
            ),
            childCount: members.length,
          ),
        ),
        const SliverToBoxAdapter(child: SizedBox(height: 100)),
      ],
    );
  }
}

class _TeamMemberCard extends StatelessWidget {
  final Map<String, dynamic> member;
  const _TeamMemberCard({required this.member});

  @override
  Widget build(BuildContext context) {
    final completion = member['completion'] as double;
    final isActive = member['status'] == 'active';

    return Container(
      decoration: BoxDecoration(
        color: AppTheme.surfaceDark,
        borderRadius: BorderRadius.circular(14),
        border: Border.all(color: const Color(0xFF3A5068), width: 0.5),
      ),
      child: Padding(
        padding: const EdgeInsets.all(16),
        child: Column(
          children: [
            Row(
              children: [
                Stack(
                  children: [
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
                          member['initials'] as String,
                          style: const TextStyle(
                            fontSize: 14,
                            fontWeight: FontWeight.w700,
                            color: Colors.white,
                          ),
                        ),
                      ),
                    ),
                    Positioned(
                      bottom: 0,
                      right: 0,
                      child: Container(
                        width: 12,
                        height: 12,
                        decoration: BoxDecoration(
                          color: isActive
                              ? AppTheme.success
                              : const Color(0xFF8899AA),
                          shape: BoxShape.circle,
                          border: Border.all(
                            color: AppTheme.surfaceDark,
                            width: 2,
                          ),
                        ),
                      ),
                    ),
                  ],
                ),
                const SizedBox(width: 12),
                Expanded(
                  child: Column(
                    crossAxisAlignment: CrossAxisAlignment.start,
                    children: [
                      Text(
                        member['name'] as String,
                        style: GoogleFonts.ibmPlexSans(
                          fontSize: 14,
                          fontWeight: FontWeight.w600,
                          color: Colors.white,
                        ),
                        overflow: TextOverflow.ellipsis,
                      ),
                      Text(
                        member['role'] as String,
                        style: GoogleFonts.ibmPlexSans(
                          fontSize: 12,
                          color: const Color(0xFF8899AA),
                        ),
                      ),
                    ],
                  ),
                ),
                Column(
                  crossAxisAlignment: CrossAxisAlignment.end,
                  children: [
                    Text(
                      '${member['deliveries']} deliveries',
                      style: GoogleFonts.ibmPlexSans(
                        fontSize: 13,
                        fontWeight: FontWeight.w600,
                        color: AppTheme.accent,
                      ),
                    ),
                    Text(
                      'TZS ${(member['revenue'] as double).toStringAsFixed(0)}',
                      style: GoogleFonts.ibmPlexSans(
                        fontSize: 12,
                        color: const Color(0xFF8899AA),
                      ),
                    ),
                  ],
                ),
              ],
            ),
            const SizedBox(height: 12),
            Row(
              children: [
                Expanded(
                  child: Column(
                    crossAxisAlignment: CrossAxisAlignment.start,
                    children: [
                      Row(
                        mainAxisAlignment: MainAxisAlignment.spaceBetween,
                        children: [
                          Text(
                            'Completion Rate',
                            style: GoogleFonts.ibmPlexSans(
                              fontSize: 11,
                              color: const Color(0xFF8899AA),
                            ),
                          ),
                          Text(
                            '${(completion * 100).toInt()}%',
                            style: GoogleFonts.ibmPlexSans(
                              fontSize: 11,
                              fontWeight: FontWeight.w600,
                              color: _completionColor(completion),
                            ),
                          ),
                        ],
                      ),
                      const SizedBox(height: 6),
                      ClipRRect(
                        borderRadius: BorderRadius.circular(4),
                        child: LinearProgressIndicator(
                          value: completion,
                          backgroundColor: AppTheme.surfaceVariantDark,
                          valueColor: AlwaysStoppedAnimation<Color>(
                            _completionColor(completion),
                          ),
                          minHeight: 6,
                        ),
                      ),
                    ],
                  ),
                ),
              ],
            ),
          ],
        ),
      ),
    );
  }

  Color _completionColor(double v) {
    if (v >= 0.85) return AppTheme.success;
    if (v >= 0.65) return AppTheme.warning;
    return AppTheme.error;
  }
}

// ─── Shared Helpers ──────────────────────────────────────────────────────────

class _EmptyState extends StatelessWidget {
  final String icon;
  final String title;
  final String subtitle;
  const _EmptyState({
    required this.icon,
    required this.title,
    required this.subtitle,
  });

  @override
  Widget build(BuildContext context) {
    return Center(
      child: Column(
        mainAxisSize: MainAxisSize.min,
        children: [
          Container(
            width: 64,
            height: 64,
            decoration: BoxDecoration(
              color: AppTheme.surfaceVariantDark,
              borderRadius: BorderRadius.circular(16),
            ),
            child: Center(
              child: CustomIconWidget(
                iconName: icon,
                color: const Color(0xFF8899AA),
                size: 28,
              ),
            ),
          ),
          const SizedBox(height: 16),
          Text(
            title,
            style: GoogleFonts.ibmPlexSans(
              fontSize: 16,
              fontWeight: FontWeight.w600,
              color: Colors.white,
            ),
          ),
          const SizedBox(height: 6),
          Text(
            subtitle,
            style: GoogleFonts.ibmPlexSans(
              fontSize: 13,
              color: const Color(0xFF8899AA),
            ),
          ),
        ],
      ),
    );
  }
}

class _Metric {
  final String label;
  final String value;
  final Color color;
  const _Metric({
    required this.label,
    required this.value,
    required this.color,
  });
}

class _SummaryMetricRow extends StatelessWidget {
  final List<_Metric> metrics;
  const _SummaryMetricRow({required this.metrics});

  @override
  Widget build(BuildContext context) {
    return Row(
      children: metrics
          .map(
            (m) => Expanded(
              child: Container(
                margin: EdgeInsets.only(right: metrics.last == m ? 0 : 12),
                padding: const EdgeInsets.symmetric(
                  horizontal: 14,
                  vertical: 12,
                ),
                decoration: BoxDecoration(
                  color: m.color.withAlpha(20),
                  borderRadius: BorderRadius.circular(12),
                  border: Border.all(color: m.color.withAlpha(50), width: 1),
                ),
                child: Column(
                  crossAxisAlignment: CrossAxisAlignment.start,
                  children: [
                    Text(
                      m.value,
                      style: GoogleFonts.ibmPlexSans(
                        fontSize: 18,
                        fontWeight: FontWeight.w700,
                        color: m.color,
                      ),
                    ),
                    Text(
                      m.label,
                      style: GoogleFonts.ibmPlexSans(
                        fontSize: 11,
                        color: const Color(0xFF8899AA),
                      ),
                    ),
                  ],
                ),
              ),
            ),
          )
          .toList(),
    );
  }
}

class _StatCard extends StatelessWidget {
  final String label;
  final String value;
  final IconData icon;
  final Color color;
  const _StatCard({
    required this.label,
    required this.value,
    required this.icon,
    required this.color,
  });

  @override
  Widget build(BuildContext context) {
    return Container(
      padding: const EdgeInsets.all(12),
      decoration: BoxDecoration(
        color: color.withAlpha(20),
        borderRadius: BorderRadius.circular(12),
        border: Border.all(color: color.withAlpha(50), width: 1),
      ),
      child: Column(
        crossAxisAlignment: CrossAxisAlignment.start,
        children: [
          Icon(icon, color: color, size: 18),
          const SizedBox(height: 8),
          Text(
            value,
            style: GoogleFonts.ibmPlexSans(
              fontSize: 14,
              fontWeight: FontWeight.w700,
              color: color,
            ),
            overflow: TextOverflow.ellipsis,
          ),
          Text(
            label,
            style: GoogleFonts.ibmPlexSans(
              fontSize: 10,
              color: const Color(0xFF8899AA),
            ),
            overflow: TextOverflow.ellipsis,
          ),
        ],
      ),
    );
  }
}

class _InfoChip extends StatelessWidget {
  final IconData icon;
  final String label;
  final Color color;
  const _InfoChip({
    required this.icon,
    required this.label,
    required this.color,
  });

  @override
  Widget build(BuildContext context) {
    return Row(
      mainAxisSize: MainAxisSize.min,
      children: [
        Icon(icon, size: 12, color: color),
        const SizedBox(width: 4),
        Text(label, style: GoogleFonts.ibmPlexSans(fontSize: 12, color: color)),
      ],
    );
  }
}

class _MetricMini extends StatelessWidget {
  final String label;
  final String value;
  final Color color;
  const _MetricMini({
    required this.label,
    required this.value,
    required this.color,
  });

  @override
  Widget build(BuildContext context) {
    return Column(
      crossAxisAlignment: CrossAxisAlignment.start,
      children: [
        Text(
          value,
          style: GoogleFonts.ibmPlexSans(
            fontSize: 14,
            fontWeight: FontWeight.w700,
            color: color,
          ),
        ),
        Text(
          label,
          style: GoogleFonts.ibmPlexSans(
            fontSize: 11,
            color: const Color(0xFF8899AA),
          ),
        ),
      ],
    );
  }
}
