import 'dart:ui';
import 'package:flutter/material.dart';
import 'package:google_fonts/google_fonts.dart';
import 'package:fl_chart/fl_chart.dart';
import '../../theme/app_theme.dart';
import '../../widgets/custom_icon_widget.dart';
import '../../services/supabase_service.dart';

class ManagerAnalyticsScreen extends StatefulWidget {
  const ManagerAnalyticsScreen({super.key});

  @override
  State<ManagerAnalyticsScreen> createState() => _ManagerAnalyticsScreenState();
}

class _ManagerAnalyticsScreenState extends State<ManagerAnalyticsScreen>
    with SingleTickerProviderStateMixin {
  late TabController _tabController;
  bool _isLoading = false;
  String _selectedPeriod = 'weekly';

  // Data loaded from Supabase
  List<Map<String, dynamic>> _orders = [];
  List<Map<String, dynamic>> _reports = [];

  // Computed analytics
  double _totalRevenue = 0;
  int _totalDeliveries = 0;
  double _avgCompletionRate = 0;
  List<_StaffKpi> _staffKpis = [];
  List<FlSpot> _revenueSpots = [];
  List<_RegionData> _regionData = [];

  @override
  void initState() {
    super.initState();
    _tabController = TabController(length: 3, vsync: this);
    _loadAnalytics();
  }

  @override
  void dispose() {
    _tabController.dispose();
    super.dispose();
  }

  Future<void> _loadAnalytics() async {
    setState(() => _isLoading = true);
    try {
      final client = SupabaseService.instance.client;
      final now = DateTime.now();
      final cutoff = _selectedPeriod == 'daily'
          ? DateTime(now.year, now.month, now.day)
          : now.subtract(const Duration(days: 7));

      final ordersRes = await client
          .from('orders')
          .select()
          .gte('created_at', cutoff.toIso8601String())
          .order('created_at', ascending: true);
      _orders = List<Map<String, dynamic>>.from(ordersRes);

      final reportsRes = await client
          .from('eod_reports')
          .select()
          .gte('created_at', cutoff.toIso8601String())
          .order('created_at', ascending: true);
      _reports = List<Map<String, dynamic>>.from(reportsRes);

      _computeAnalytics();
    } catch (_) {
      _computeAnalytics();
    } finally {
      if (mounted) setState(() => _isLoading = false);
    }
  }

  void _computeAnalytics() {
    // Revenue & deliveries
    _totalRevenue = _orders.fold(0.0, (sum, o) {
      final sub = o['subtotal'];
      return sum + (sub is num ? sub.toDouble() : 0.0);
    });

    _totalDeliveries = _orders.length;

    // Staff KPIs from reports
    final Map<String, _StaffKpiBuilder> builders = {};
    for (final r in _reports) {
      final staffId = r['staff_id']?.toString() ?? 'Unknown';
      builders.putIfAbsent(staffId, () => _StaffKpiBuilder(staffId));
      final b = builders[staffId]!;
      b.revenue += (r['total_revenue'] as num?)?.toDouble() ?? 0;
      b.deliveries += (r['total_deliveries'] as num?)?.toInt() ?? 0;
      b.delivered += (r['delivered_count'] as num?)?.toInt() ?? 0;
      b.reportCount++;
    }

    _staffKpis = builders.values.map((b) => b.build()).toList()
      ..sort((a, b) => b.revenue.compareTo(a.revenue));

    _avgCompletionRate = _staffKpis.isEmpty
        ? 0
        : _staffKpis.fold(0.0, (s, k) => s + k.completionRate) /
              _staffKpis.length;

    // Revenue trend spots (group by day)
    final Map<int, double> dayRevenue = {};
    for (final r in _reports) {
      final dt = DateTime.tryParse(r['created_at']?.toString() ?? '');
      if (dt == null) continue;
      final dayKey = _selectedPeriod == 'daily' ? dt.hour : dt.weekday;
      dayRevenue[dayKey] =
          (dayRevenue[dayKey] ?? 0) +
          ((r['total_revenue'] as num?)?.toDouble() ?? 0);
    }
    final sortedKeys = dayRevenue.keys.toList()..sort();
    _revenueSpots = sortedKeys.isEmpty
        ? []
        : sortedKeys
              .asMap()
              .entries
              .map((e) => FlSpot(e.key.toDouble(), dayRevenue[e.value] ?? 0))
              .toList();

    // Region data (derived from staff IDs as proxy)
    final Map<String, double> regionRevenue = {};
    for (final o in _orders) {
      final staffId = o['staff_id']?.toString() ?? '';
      final region = _regionFromStaffId(staffId);
      regionRevenue[region] =
          (regionRevenue[region] ?? 0) +
          ((o['subtotal'] as num?)?.toDouble() ?? 0);
    }
    _regionData =
        regionRevenue.entries.map((e) => _RegionData(e.key, e.value)).toList()
          ..sort((a, b) => b.revenue.compareTo(a.revenue));
  }

  String _regionFromStaffId(String staffId) {
    if (staffId.isEmpty) return 'Unassigned';
    final parts = staffId.split('-');
    if (parts.length >= 3) {
      final num = int.tryParse(parts.last) ?? 0;
      if (num <= 30) return 'North Zone';
      if (num <= 60) return 'Central Zone';
      if (num <= 90) return 'South Zone';
      return 'East Zone';
    }
    return 'General';
  }

  @override
  Widget build(BuildContext context) {
    return Scaffold(
      backgroundColor: AppTheme.backgroundDark,
      extendBodyBehindAppBar: true,
      appBar: PreferredSize(
        preferredSize: const Size.fromHeight(72),
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
                      Expanded(
                        child: Column(
                          crossAxisAlignment: CrossAxisAlignment.start,
                          mainAxisSize: MainAxisSize.min,
                          children: [
                            Text(
                              'Strategic Overview',
                              style: GoogleFonts.ibmPlexSans(
                                fontSize: 12,
                                color: const Color(0xFF8899AA),
                              ),
                            ),
                            Text(
                              'Manager Analytics',
                              style: GoogleFonts.ibmPlexSans(
                                fontSize: 18,
                                fontWeight: FontWeight.w700,
                                color: Colors.white,
                              ),
                            ),
                          ],
                        ),
                      ),
                      _PeriodToggle(
                        selected: _selectedPeriod,
                        onChanged: (p) {
                          setState(() => _selectedPeriod = p);
                          _loadAnalytics();
                        },
                      ),
                    ],
                  ),
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
          : RefreshIndicator(
              color: AppTheme.accent,
              backgroundColor: AppTheme.surfaceDark,
              onRefresh: _loadAnalytics,
              child: CustomScrollView(
                slivers: [
                  SliverToBoxAdapter(
                    child: SizedBox(
                      height: MediaQuery.of(context).padding.top + 72,
                    ),
                  ),
                  // KPI Summary Row
                  SliverToBoxAdapter(
                    child: Padding(
                      padding: const EdgeInsets.fromLTRB(20, 20, 20, 0),
                      child: _KpiSummaryRow(
                        totalRevenue: _totalRevenue,
                        totalDeliveries: _totalDeliveries,
                        avgCompletion: _avgCompletionRate,
                        teamSize: _staffKpis.length,
                      ),
                    ),
                  ),
                  const SliverToBoxAdapter(child: SizedBox(height: 20)),
                  // Revenue Trend Chart
                  SliverToBoxAdapter(
                    child: Padding(
                      padding: const EdgeInsets.symmetric(horizontal: 20),
                      child: _RevenueTrendCard(
                        spots: _revenueSpots,
                        period: _selectedPeriod,
                      ),
                    ),
                  ),
                  const SliverToBoxAdapter(child: SizedBox(height: 20)),
                  // Team KPI Section
                  SliverToBoxAdapter(
                    child: Padding(
                      padding: const EdgeInsets.symmetric(horizontal: 20),
                      child: Text(
                        'Team KPI Comparison',
                        style: GoogleFonts.ibmPlexSans(
                          fontSize: 15,
                          fontWeight: FontWeight.w600,
                          color: Colors.white,
                        ),
                      ),
                    ),
                  ),
                  const SliverToBoxAdapter(child: SizedBox(height: 12)),
                  _staffKpis.isEmpty
                      ? SliverToBoxAdapter(
                          child: Padding(
                            padding: const EdgeInsets.symmetric(horizontal: 20),
                            child: _EmptyCard(
                              icon: 'group',
                              message: 'No team data for this period',
                            ),
                          ),
                        )
                      : SliverList(
                          delegate: SliverChildBuilderDelegate(
                            (context, i) => Padding(
                              padding: EdgeInsets.fromLTRB(
                                20,
                                0,
                                20,
                                i == _staffKpis.length - 1 ? 0 : 10,
                              ),
                              child: _StaffKpiCard(
                                kpi: _staffKpis[i],
                                rank: i + 1,
                              ),
                            ),
                            childCount: _staffKpis.length,
                          ),
                        ),
                  const SliverToBoxAdapter(child: SizedBox(height: 20)),
                  // Regional Heat Map
                  SliverToBoxAdapter(
                    child: Padding(
                      padding: const EdgeInsets.symmetric(horizontal: 20),
                      child: Text(
                        'Regional Performance',
                        style: GoogleFonts.ibmPlexSans(
                          fontSize: 15,
                          fontWeight: FontWeight.w600,
                          color: Colors.white,
                        ),
                      ),
                    ),
                  ),
                  const SliverToBoxAdapter(child: SizedBox(height: 12)),
                  SliverToBoxAdapter(
                    child: Padding(
                      padding: const EdgeInsets.symmetric(horizontal: 20),
                      child: _RegionalHeatMap(regions: _regionData),
                    ),
                  ),
                  const SliverToBoxAdapter(child: SizedBox(height: 100)),
                ],
              ),
            ),
    );
  }
}

// ── Period Toggle ────────────────────────────────────────────────────────────

class _PeriodToggle extends StatelessWidget {
  final String selected;
  final void Function(String) onChanged;

  const _PeriodToggle({required this.selected, required this.onChanged});

  @override
  Widget build(BuildContext context) {
    return Container(
      padding: const EdgeInsets.all(3),
      decoration: BoxDecoration(
        color: AppTheme.surfaceVariantDark,
        borderRadius: BorderRadius.circular(10),
        border: Border.all(color: const Color(0xFF3A5068), width: 0.5),
      ),
      child: Row(
        mainAxisSize: MainAxisSize.min,
        children: ['daily', 'weekly'].map((p) {
          final isActive = selected == p;
          return GestureDetector(
            onTap: () => onChanged(p),
            child: AnimatedContainer(
              duration: const Duration(milliseconds: 180),
              padding: const EdgeInsets.symmetric(horizontal: 12, vertical: 5),
              decoration: BoxDecoration(
                color: isActive
                    ? AppTheme.accent.withAlpha(40)
                    : Colors.transparent,
                borderRadius: BorderRadius.circular(7),
              ),
              child: Text(
                p == 'daily' ? 'Daily' : 'Weekly',
                style: GoogleFonts.ibmPlexSans(
                  fontSize: 11,
                  fontWeight: isActive ? FontWeight.w600 : FontWeight.w400,
                  color: isActive ? AppTheme.accent : const Color(0xFF8899AA),
                ),
              ),
            ),
          );
        }).toList(),
      ),
    );
  }
}

// ── KPI Summary Row ──────────────────────────────────────────────────────────

class _KpiSummaryRow extends StatelessWidget {
  final double totalRevenue;
  final int totalDeliveries;
  final double avgCompletion;
  final int teamSize;

  const _KpiSummaryRow({
    required this.totalRevenue,
    required this.totalDeliveries,
    required this.avgCompletion,
    required this.teamSize,
  });

  @override
  Widget build(BuildContext context) {
    return Row(
      children: [
        Expanded(
          child: _KpiTile(
            label: 'Revenue',
            value: 'TZS ${_fmt(totalRevenue)}',
            icon: 'trending_up',
            color: AppTheme.accent,
          ),
        ),
        const SizedBox(width: 10),
        Expanded(
          child: _KpiTile(
            label: 'Deliveries',
            value: '$totalDeliveries',
            icon: 'local_shipping',
            color: AppTheme.success,
          ),
        ),
        const SizedBox(width: 10),
        Expanded(
          child: _KpiTile(
            label: 'Completion',
            value: '${(avgCompletion * 100).toStringAsFixed(0)}%',
            icon: 'check_circle_outline',
            color: AppTheme.warning,
          ),
        ),
        const SizedBox(width: 10),
        Expanded(
          child: _KpiTile(
            label: 'Team',
            value: '$teamSize',
            icon: 'group',
            color: AppTheme.info,
          ),
        ),
      ],
    );
  }

  String _fmt(double v) {
    if (v >= 1000) return '${(v / 1000).toStringAsFixed(1)}K';
    return v.toStringAsFixed(0);
  }
}

class _KpiTile extends StatelessWidget {
  final String label;
  final String value;
  final String icon;
  final Color color;

  const _KpiTile({
    required this.label,
    required this.value,
    required this.icon,
    required this.color,
  });

  @override
  Widget build(BuildContext context) {
    return Container(
      padding: const EdgeInsets.symmetric(horizontal: 10, vertical: 14),
      decoration: BoxDecoration(
        color: AppTheme.surfaceDark,
        borderRadius: BorderRadius.circular(12),
        border: Border.all(color: color.withAlpha(60), width: 1),
      ),
      child: Column(
        crossAxisAlignment: CrossAxisAlignment.start,
        children: [
          CustomIconWidget(iconName: icon, color: color, size: 16),
          const SizedBox(height: 8),
          Text(
            value,
            style: GoogleFonts.ibmPlexSans(
              fontSize: 14,
              fontWeight: FontWeight.w700,
              color: Colors.white,
            ),
            overflow: TextOverflow.ellipsis,
          ),
          Text(
            label,
            style: GoogleFonts.ibmPlexSans(
              fontSize: 10,
              color: const Color(0xFF8899AA),
            ),
          ),
        ],
      ),
    );
  }
}

// ── Revenue Trend Chart ──────────────────────────────────────────────────────

class _RevenueTrendCard extends StatelessWidget {
  final List<FlSpot> spots;
  final String period;

  const _RevenueTrendCard({required this.spots, required this.period});

  @override
  Widget build(BuildContext context) {
    final hasData = spots.isNotEmpty;
    final displaySpots = hasData
        ? spots
        : List.generate(7, (i) => FlSpot(i.toDouble(), 0));

    return Container(
      padding: const EdgeInsets.all(18),
      decoration: BoxDecoration(
        color: AppTheme.surfaceDark,
        borderRadius: BorderRadius.circular(16),
        border: Border.all(color: const Color(0xFF3A5068), width: 1),
      ),
      child: Column(
        crossAxisAlignment: CrossAxisAlignment.start,
        children: [
          Row(
            children: [
              CustomIconWidget(
                iconName: 'show_chart',
                color: AppTheme.accent,
                size: 16,
              ),
              const SizedBox(width: 8),
              Text(
                'Revenue Trend',
                style: GoogleFonts.ibmPlexSans(
                  fontSize: 14,
                  fontWeight: FontWeight.w600,
                  color: Colors.white,
                ),
              ),
              const Spacer(),
              Text(
                period == 'daily' ? 'By Hour' : 'By Day',
                style: GoogleFonts.ibmPlexSans(
                  fontSize: 11,
                  color: const Color(0xFF8899AA),
                ),
              ),
            ],
          ),
          const SizedBox(height: 16),
          SizedBox(
            height: 140,
            child: hasData
                ? LineChart(
                    LineChartData(
                      gridData: FlGridData(
                        show: true,
                        drawVerticalLine: false,
                        getDrawingHorizontalLine: (_) => FlLine(
                          color: const Color(0xFF243447),
                          strokeWidth: 1,
                        ),
                      ),
                      titlesData: FlTitlesData(
                        leftTitles: AxisTitles(
                          sideTitles: SideTitles(
                            showTitles: true,
                            reservedSize: 40,
                            getTitlesWidget: (v, _) => Text(
                              v >= 1000
                                  ? '${(v / 1000).toStringAsFixed(0)}K'
                                  : v.toStringAsFixed(0),
                              style: GoogleFonts.ibmPlexSans(
                                fontSize: 9,
                                color: const Color(0xFF8899AA),
                              ),
                            ),
                          ),
                        ),
                        bottomTitles: AxisTitles(
                          sideTitles: SideTitles(
                            showTitles: true,
                            getTitlesWidget: (v, _) {
                              final labels = period == 'daily'
                                  ? ['6', '9', '12', '15', '18', '21', '24']
                                  : [
                                      'Mon',
                                      'Tue',
                                      'Wed',
                                      'Thu',
                                      'Fri',
                                      'Sat',
                                      'Sun',
                                    ];
                              final idx = v.toInt();
                              if (idx < 0 || idx >= labels.length) {
                                return const SizedBox.shrink();
                              }
                              return Text(
                                labels[idx],
                                style: GoogleFonts.ibmPlexSans(
                                  fontSize: 9,
                                  color: const Color(0xFF8899AA),
                                ),
                              );
                            },
                          ),
                        ),
                        rightTitles: const AxisTitles(
                          sideTitles: SideTitles(showTitles: false),
                        ),
                        topTitles: const AxisTitles(
                          sideTitles: SideTitles(showTitles: false),
                        ),
                      ),
                      borderData: FlBorderData(show: false),
                      lineBarsData: [
                        LineChartBarData(
                          spots: displaySpots,
                          isCurved: true,
                          color: AppTheme.accent,
                          barWidth: 2.5,
                          dotData: const FlDotData(show: false),
                          belowBarData: BarAreaData(
                            show: true,
                            gradient: LinearGradient(
                              begin: Alignment.topCenter,
                              end: Alignment.bottomCenter,
                              colors: [
                                AppTheme.accent.withAlpha(60),
                                AppTheme.accent.withAlpha(0),
                              ],
                            ),
                          ),
                        ),
                      ],
                    ),
                  )
                : Center(
                    child: Text(
                      'No revenue data for this period',
                      style: GoogleFonts.ibmPlexSans(
                        fontSize: 13,
                        color: const Color(0xFF8899AA),
                      ),
                    ),
                  ),
          ),
        ],
      ),
    );
  }
}

// ── Staff KPI Card ───────────────────────────────────────────────────────────

class _StaffKpiCard extends StatelessWidget {
  final _StaffKpi kpi;
  final int rank;

  const _StaffKpiCard({required this.kpi, required this.rank});

  @override
  Widget build(BuildContext context) {
    final rankColor = rank == 1
        ? const Color(0xFFFFD700)
        : rank == 2
        ? const Color(0xFFC0C0C0)
        : rank == 3
        ? const Color(0xFFCD7F32)
        : const Color(0xFF8899AA);

    return Container(
      padding: const EdgeInsets.all(14),
      decoration: BoxDecoration(
        color: AppTheme.surfaceDark,
        borderRadius: BorderRadius.circular(12),
        border: Border.all(
          color: const Color(0xFF3A5068).withAlpha(120),
          width: 1,
        ),
      ),
      child: Row(
        children: [
          Container(
            width: 32,
            height: 32,
            decoration: BoxDecoration(
              color: rankColor.withAlpha(25),
              shape: BoxShape.circle,
              border: Border.all(color: rankColor.withAlpha(80), width: 1),
            ),
            child: Center(
              child: Text(
                '#$rank',
                style: GoogleFonts.ibmPlexSans(
                  fontSize: 11,
                  fontWeight: FontWeight.w700,
                  color: rankColor,
                ),
              ),
            ),
          ),
          const SizedBox(width: 12),
          Expanded(
            child: Column(
              crossAxisAlignment: CrossAxisAlignment.start,
              children: [
                Text(
                  kpi.staffId,
                  style: GoogleFonts.ibmPlexSans(
                    fontSize: 13,
                    fontWeight: FontWeight.w600,
                    color: Colors.white,
                  ),
                  overflow: TextOverflow.ellipsis,
                ),
                const SizedBox(height: 4),
                ClipRRect(
                  borderRadius: BorderRadius.circular(4),
                  child: LinearProgressIndicator(
                    value: kpi.completionRate.clamp(0.0, 1.0),
                    backgroundColor: AppTheme.surfaceVariantDark,
                    valueColor: AlwaysStoppedAnimation<Color>(
                      kpi.completionRate >= 0.8
                          ? AppTheme.success
                          : kpi.completionRate >= 0.5
                          ? AppTheme.warning
                          : AppTheme.error,
                    ),
                    minHeight: 4,
                  ),
                ),
                const SizedBox(height: 2),
                Text(
                  '${(kpi.completionRate * 100).toStringAsFixed(0)}% completion · ${kpi.deliveries} deliveries',
                  style: GoogleFonts.ibmPlexSans(
                    fontSize: 10,
                    color: const Color(0xFF8899AA),
                  ),
                ),
              ],
            ),
          ),
          const SizedBox(width: 12),
          Column(
            crossAxisAlignment: CrossAxisAlignment.end,
            children: [
              Text(
                'TZS ${kpi.revenue.toStringAsFixed(0)}',
                style: GoogleFonts.ibmPlexSans(
                  fontSize: 13,
                  fontWeight: FontWeight.w700,
                  color: Colors.white,
                ),
              ),
              Text(
                'revenue',
                style: GoogleFonts.ibmPlexSans(
                  fontSize: 10,
                  color: const Color(0xFF8899AA),
                ),
              ),
            ],
          ),
        ],
      ),
    );
  }
}

// ── Regional Heat Map ────────────────────────────────────────────────────────

class _RegionalHeatMap extends StatelessWidget {
  final List<_RegionData> regions;

  const _RegionalHeatMap({required this.regions});

  @override
  Widget build(BuildContext context) {
    if (regions.isEmpty) {
      return _EmptyCard(
        icon: 'map',
        message: 'No regional data for this period',
      );
    }

    final maxRevenue = regions.fold(
      0.0,
      (m, r) => r.revenue > m ? r.revenue : m,
    );

    return Container(
      padding: const EdgeInsets.all(16),
      decoration: BoxDecoration(
        color: AppTheme.surfaceDark,
        borderRadius: BorderRadius.circular(16),
        border: Border.all(color: const Color(0xFF3A5068), width: 1),
      ),
      child: Column(
        crossAxisAlignment: CrossAxisAlignment.start,
        children: [
          Row(
            children: [
              CustomIconWidget(
                iconName: 'map',
                color: AppTheme.accent,
                size: 16,
              ),
              const SizedBox(width: 8),
              Text(
                'Revenue by Region',
                style: GoogleFonts.ibmPlexSans(
                  fontSize: 14,
                  fontWeight: FontWeight.w600,
                  color: Colors.white,
                ),
              ),
            ],
          ),
          const SizedBox(height: 14),
          ...regions.map((r) {
            final intensity = maxRevenue > 0 ? r.revenue / maxRevenue : 0.0;
            final heatColor = Color.lerp(
              AppTheme.accent.withAlpha(40),
              AppTheme.accent,
              intensity,
            )!;
            return Padding(
              padding: const EdgeInsets.only(bottom: 10),
              child: Row(
                children: [
                  Container(
                    width: 10,
                    height: 10,
                    decoration: BoxDecoration(
                      color: heatColor,
                      shape: BoxShape.circle,
                    ),
                  ),
                  const SizedBox(width: 10),
                  Expanded(
                    flex: 2,
                    child: Text(
                      r.region,
                      style: GoogleFonts.ibmPlexSans(
                        fontSize: 12,
                        color: const Color(0xFFB0C4D8),
                      ),
                    ),
                  ),
                  Expanded(
                    flex: 3,
                    child: ClipRRect(
                      borderRadius: BorderRadius.circular(4),
                      child: LinearProgressIndicator(
                        value: intensity.clamp(0.0, 1.0),
                        backgroundColor: AppTheme.surfaceVariantDark,
                        valueColor: AlwaysStoppedAnimation<Color>(heatColor),
                        minHeight: 8,
                      ),
                    ),
                  ),
                  const SizedBox(width: 10),
                  Text(
                    'TZS ${r.revenue.toStringAsFixed(0)}',
                    style: GoogleFonts.ibmPlexSans(
                      fontSize: 11,
                      fontWeight: FontWeight.w600,
                      color: Colors.white,
                    ),
                  ),
                ],
              ),
            );
          }),
        ],
      ),
    );
  }
}

// ── Empty Card ───────────────────────────────────────────────────────────────

class _EmptyCard extends StatelessWidget {
  final String icon;
  final String message;

  const _EmptyCard({required this.icon, required this.message});

  @override
  Widget build(BuildContext context) {
    return Container(
      padding: const EdgeInsets.all(24),
      decoration: BoxDecoration(
        color: AppTheme.surfaceDark,
        borderRadius: BorderRadius.circular(12),
        border: Border.all(color: const Color(0xFF3A5068), width: 1),
      ),
      child: Row(
        mainAxisAlignment: MainAxisAlignment.center,
        children: [
          CustomIconWidget(
            iconName: icon,
            color: const Color(0xFF8899AA),
            size: 18,
          ),
          const SizedBox(width: 10),
          Text(
            message,
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

// ── Data Models ──────────────────────────────────────────────────────────────

class _StaffKpi {
  final String staffId;
  final double revenue;
  final int deliveries;
  final double completionRate;

  const _StaffKpi({
    required this.staffId,
    required this.revenue,
    required this.deliveries,
    required this.completionRate,
  });
}

class _StaffKpiBuilder {
  final String staffId;
  double revenue = 0;
  int deliveries = 0;
  int delivered = 0;
  int reportCount = 0;

  _StaffKpiBuilder(this.staffId);

  _StaffKpi build() => _StaffKpi(
    staffId: staffId,
    revenue: revenue,
    deliveries: deliveries,
    completionRate: deliveries > 0 ? delivered / deliveries : 0,
  );
}

class _RegionData {
  final String region;
  final double revenue;

  const _RegionData(this.region, this.revenue);
}
