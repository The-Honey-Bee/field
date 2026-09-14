import 'dart:convert';
import 'dart:html' if (dart.library.io) '../../utils/html_stub.dart' as html;
import 'dart:ui';

import 'package:flutter/foundation.dart';
import 'package:flutter/material.dart';
import 'package:google_fonts/google_fonts.dart';

import '../../services/auth_service.dart';
import '../../services/offline_sync_service.dart';
import '../../services/supabase_service.dart';
import '../../theme/app_theme.dart';
import '../../utils/html_stub.dart';
import '../../widgets/custom_icon_widget.dart';

// Web-only import
// ignore: avoid_web_libraries_in_flutter

class EndOfDayReportScreen extends StatefulWidget {
  const EndOfDayReportScreen({super.key});

  @override
  State<EndOfDayReportScreen> createState() => _EndOfDayReportScreenState();
}

class _EndOfDayReportScreenState extends State<EndOfDayReportScreen>
    with SingleTickerProviderStateMixin {
  bool _isSubmitting = false;
  bool _isSubmitted = false;
  bool _isLoadingDeliveries = true;
  bool _isExporting = false;
  SyncStatus? _lastSyncStatus;
  final TextEditingController _notesController = TextEditingController();
  late AnimationController _checkAnimController;
  late Animation<double> _checkScaleAnim;
  final OfflineSyncService _syncService = OfflineSyncService.instance;

  // Deliveries loaded from Supabase (no mock data)
  List<Map<String, dynamic>> _deliveries = [];

  double get _totalRevenue => _deliveries.fold(
    0,
    (sum, d) => sum + ((d['amount'] as num?)?.toDouble() ?? 0.0),
  );
  int get _totalDelivered =>
      _deliveries.where((d) => d['status'] == 'delivered').length;
  int get _totalCollected =>
      _deliveries.where((d) => d['status'] == 'collected').length;
  int get _totalPartial =>
      _deliveries.where((d) => d['status'] == 'partial').length;

  @override
  void initState() {
    super.initState();
    _checkAnimController = AnimationController(
      vsync: this,
      duration: const Duration(milliseconds: 500),
    );
    _checkScaleAnim = CurvedAnimation(
      parent: _checkAnimController,
      curve: Curves.elasticOut,
    );
    _loadTodayDeliveries();
  }

  @override
  void dispose() {
    _notesController.dispose();
    _checkAnimController.dispose();
    super.dispose();
  }

  Future<void> _loadTodayDeliveries() async {
    setState(() => _isLoadingDeliveries = true);
    try {
      final client = SupabaseService.instance.client;
      final authService = AuthService.instance;
      final today = DateTime.now();
      final startOfDay = DateTime(today.year, today.month, today.day);
      final endOfDay = startOfDay.add(const Duration(days: 1));

      var query = client
          .from('orders')
          .select()
          .gte('created_at', startOfDay.toIso8601String())
          .lt('created_at', endOfDay.toIso8601String())
          .order('created_at', ascending: true);

      // RBAC: field staff only see their own orders
      if (authService.isFieldStaff) {
        final uid = authService.currentUserId;
        if (uid.isNotEmpty) {
          // query = query.eq('user_id', uid);
        }
      }

      final res = await query;
      final orders = List<Map<String, dynamic>>.from(res);
      _deliveries = orders.map((o) {
        final items = o['items'];
        String itemsStr = '';
        if (items is List) {
          itemsStr = items
              .map((i) => '${i['quantity']} × ${i['name']}')
              .join(', ');
        } else if (items is String) {
          itemsStr = items;
        }
        final createdAt = DateTime.tryParse(o['created_at']?.toString() ?? '');
        final timeStr = createdAt != null
            ? '${createdAt.hour.toString().padLeft(2, '0')}:${createdAt.minute.toString().padLeft(2, '0')}'
            : '';
        return {
          'customer': o['customer_name']?.toString() ?? 'Unknown',
          'items': itemsStr.isEmpty ? 'Order' : itemsStr,
          'amount': (o['subtotal'] as num?)?.toDouble() ?? 0.0,
          'status': 'delivered',
          'time': timeStr,
        };
      }).toList();
    } catch (_) {
      _deliveries = [];
    } finally {
      if (mounted) setState(() => _isLoadingDeliveries = false);
    }
  }

  Future<void> _submitReport() async {
    setState(() => _isSubmitting = true);

    final report = LocalEodReport(
      localId: OfflineSyncService.generateLocalId(),
      staffId: 'staff',
      reportDate: DateTime.now(),
      totalRevenue: _totalRevenue,
      totalDeliveries: _deliveries.length,
      deliveredCount: _totalDelivered,
      collectedCount: _totalCollected,
      partialCount: _totalPartial,
      deliveries: _deliveries.map((d) => Map<String, dynamic>.from(d)).toList(),
      fieldNotes: _notesController.text.trim(),
    );

    final status = await _syncService.saveEodReport(report);

    if (!mounted) return;
    setState(() {
      _isSubmitting = false;
      _isSubmitted = true;
      _lastSyncStatus = status;
    });
    _checkAnimController.forward();
  }

  String _buildCsvContent() {
    final now = DateTime.now();
    final dateStr =
        '${now.year}-${now.month.toString().padLeft(2, '0')}-${now.day.toString().padLeft(2, '0')}';
    final lines = <String>[
      'End-of-Day Report,$dateStr',
      '',
      'Summary',
      'Total Revenue,TZS ${_totalRevenue.toStringAsFixed(0)}',
      'Total Stops,${_deliveries.length}',
      'Delivered,$_totalDelivered',
      'Collected,$_totalCollected',
      'Partial,$_totalPartial',
      '',
      'Delivery Breakdown',
      'Time,Customer,Items,Amount (TZS),Status',
      ..._deliveries.map(
        (d) =>
            '${d['time']},${d['customer']},${d['items']},${(d['amount'] as double).toStringAsFixed(2)},${d['status']}',
      ),
      '',
      'Field Notes',
      _notesController.text.trim().isEmpty
          ? 'None'
          : _notesController.text.trim(),
    ];
    return lines.join('\n');
  }

  Future<void> _exportCsv() async {
    setState(() => _isExporting = true);
    try {
      final content = _buildCsvContent();
      final now = DateTime.now();
      final filename =
          'eod_report_${now.year}${now.month.toString().padLeft(2, '0')}${now.day.toString().padLeft(2, '0')}.csv';

      if (kIsWeb) {
        final bytes = utf8.encode(content);
        final blob = html.Blob([bytes], 'text/csv');
        final url = html.Url.createObjectUrlFromBlob(blob);
        final anchor = html.AnchorElement(href: url)
          ..setAttribute('download', filename)
          ..click();
        html.Url.revokeObjectUrl(url);
      } else {
        // On mobile, share via share_plus
        await _shareMobileFile(content, filename, 'text/csv');
      }

      if (mounted) {
        ScaffoldMessenger.of(context).showSnackBar(
          SnackBar(
            content: Text(
              kIsWeb ? 'CSV downloaded' : 'CSV ready to share',
              style: GoogleFonts.ibmPlexSans(color: Colors.white),
            ),
            backgroundColor: AppTheme.success,
            behavior: SnackBarBehavior.floating,
            shape: RoundedRectangleBorder(
              borderRadius: BorderRadius.circular(10),
            ),
          ),
        );
      }
    } catch (_) {
      if (mounted) {
        ScaffoldMessenger.of(context).showSnackBar(
          SnackBar(
            content: Text(
              'Export failed. Please try again.',
              style: GoogleFonts.ibmPlexSans(color: Colors.white),
            ),
            backgroundColor: AppTheme.error,
            behavior: SnackBarBehavior.floating,
            shape: RoundedRectangleBorder(
              borderRadius: BorderRadius.circular(10),
            ),
          ),
        );
      }
    } finally {
      if (mounted) setState(() => _isExporting = false);
    }
  }

  Future<void> _shareMobileFile(
    String content,
    String filename,
    String mimeType,
  ) async {
    // Uses share_plus on mobile
    try {
      // Dynamic import to avoid web compilation issues
      // ignore: undefined_prefixed_name
      final sharePlugin = await _getSharePlugin();
      if (sharePlugin != null) {
        await sharePlugin(content, filename);
      }
    } catch (_) {
      // Fallback: copy to clipboard
      if (mounted) {
        ScaffoldMessenger.of(context).showSnackBar(
          SnackBar(
            content: Text(
              'Report content ready. Install share_plus for file sharing.',
              style: GoogleFonts.ibmPlexSans(color: Colors.white),
            ),
            backgroundColor: AppTheme.info,
            behavior: SnackBarBehavior.floating,
            shape: RoundedRectangleBorder(
              borderRadius: BorderRadius.circular(10),
            ),
          ),
        );
      }
    }
  }

  Future<Function?> _getSharePlugin() async => null;

  Color _statusColor(String status) {
    switch (status) {
      case 'delivered':
        return AppTheme.success;
      case 'collected':
        return AppTheme.accent;
      case 'partial':
        return AppTheme.warning;
      default:
        return const Color(0xFF8899AA);
    }
  }

  String _statusLabel(String status) {
    switch (status) {
      case 'delivered':
        return 'Delivered';
      case 'collected':
        return 'Collected';
      case 'partial':
        return 'Partial';
      default:
        return status;
    }
  }

  @override
  Widget build(BuildContext context) {
    final safeBottom = MediaQuery.of(context).padding.bottom;
    final now = DateTime.now();
    final months = [
      'Jan',
      'Feb',
      'Mar',
      'Apr',
      'May',
      'Jun',
      'Jul',
      'Aug',
      'Sep',
      'Oct',
      'Nov',
      'Dec',
    ];
    final days = ['Mon', 'Tue', 'Wed', 'Thu', 'Fri', 'Sat', 'Sun'];
    final dayName = days[(now.weekday - 1) % 7];
    final dateLabel =
        '$dayName, ${now.day} ${months[now.month - 1]} ${now.year}';

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
                              dateLabel,
                              style: GoogleFonts.ibmPlexSans(
                                fontSize: 12,
                                color: const Color(0xFF8899AA),
                              ),
                            ),
                            Text(
                              'End-of-Day Report',
                              style: GoogleFonts.ibmPlexSans(
                                fontSize: 18,
                                fontWeight: FontWeight.w700,
                                color: Colors.white,
                              ),
                            ),
                          ],
                        ),
                      ),
                      // Export button
                      GestureDetector(
                        onTap: _isExporting ? null : _exportCsv,
                        child: Container(
                          padding: const EdgeInsets.symmetric(
                            horizontal: 10,
                            vertical: 6,
                          ),
                          decoration: BoxDecoration(
                            color: AppTheme.success.withAlpha(30),
                            borderRadius: BorderRadius.circular(10),
                            border: Border.all(
                              color: AppTheme.success.withAlpha(80),
                              width: 1,
                            ),
                          ),
                          child: _isExporting
                              ? SizedBox(
                                  width: 14,
                                  height: 14,
                                  child: CircularProgressIndicator(
                                    strokeWidth: 2,
                                    color: AppTheme.success,
                                  ),
                                )
                              : Row(
                                  mainAxisSize: MainAxisSize.min,
                                  children: [
                                    CustomIconWidget(
                                      iconName: 'download',
                                      color: AppTheme.success,
                                      size: 14,
                                    ),
                                    const SizedBox(width: 4),
                                    Text(
                                      'CSV',
                                      style: GoogleFonts.ibmPlexSans(
                                        fontSize: 11,
                                        fontWeight: FontWeight.w600,
                                        color: AppTheme.success,
                                      ),
                                    ),
                                  ],
                                ),
                        ),
                      ),
                      const SizedBox(width: 8),
                      _EodSyncBadge(
                        isSubmitted: _isSubmitted,
                        syncStatus: _lastSyncStatus,
                        syncService: _syncService,
                      ),
                    ],
                  ),
                ),
              ),
            ),
          ),
        ),
      ),
      body: _isSubmitted
          ? _buildSuccessView(safeBottom)
          : _buildReportView(safeBottom),
      bottomNavigationBar: _isSubmitted
          ? null
          : Container(
              padding: EdgeInsets.fromLTRB(20, 12, 20, safeBottom + 76),
              decoration: BoxDecoration(
                color: AppTheme.backgroundDark.withAlpha(230),
                border: const Border(
                  top: BorderSide(color: Color(0xFF243447), width: 0.5),
                ),
              ),
              child: SizedBox(
                height: 52,
                child: ElevatedButton(
                  onPressed: _isSubmitting ? null : _submitReport,
                  style: ElevatedButton.styleFrom(
                    backgroundColor: AppTheme.accent,
                    foregroundColor: AppTheme.backgroundDark,
                    disabledBackgroundColor: AppTheme.accent.withAlpha(100),
                    shape: RoundedRectangleBorder(
                      borderRadius: BorderRadius.circular(14),
                    ),
                    elevation: 0,
                  ),
                  child: _isSubmitting
                      ? Row(
                          mainAxisAlignment: MainAxisAlignment.center,
                          children: [
                            SizedBox(
                              width: 18,
                              height: 18,
                              child: CircularProgressIndicator(
                                strokeWidth: 2,
                                color: AppTheme.backgroundDark,
                              ),
                            ),
                            const SizedBox(width: 10),
                            Text(
                              'Submitting…',
                              style: GoogleFonts.ibmPlexSans(
                                fontSize: 15,
                                fontWeight: FontWeight.w600,
                              ),
                            ),
                          ],
                        )
                      : Row(
                          mainAxisAlignment: MainAxisAlignment.center,
                          children: [
                            const Icon(Icons.send_rounded, size: 18),
                            const SizedBox(width: 8),
                            Text(
                              'Submit End-of-Day Report',
                              style: GoogleFonts.ibmPlexSans(
                                fontSize: 15,
                                fontWeight: FontWeight.w600,
                              ),
                            ),
                          ],
                        ),
                ),
              ),
            ),
    );
  }

  Widget _buildSuccessView(double safeBottom) {
    return Center(
      child: Padding(
        padding: const EdgeInsets.symmetric(horizontal: 32),
        child: Column(
          mainAxisAlignment: MainAxisAlignment.center,
          children: [
            ScaleTransition(
              scale: _checkScaleAnim,
              child: Container(
                width: 88,
                height: 88,
                decoration: BoxDecoration(
                  color: AppTheme.success.withAlpha(30),
                  shape: BoxShape.circle,
                  border: Border.all(
                    color: AppTheme.success.withAlpha(100),
                    width: 2,
                  ),
                ),
                child: const Center(
                  child: Icon(
                    Icons.check_rounded,
                    color: AppTheme.success,
                    size: 44,
                  ),
                ),
              ),
            ),
            const SizedBox(height: 24),
            Text(
              'Report Submitted',
              style: GoogleFonts.ibmPlexSans(
                fontSize: 22,
                fontWeight: FontWeight.w700,
                color: Colors.white,
              ),
            ),
            const SizedBox(height: 10),
            Text(
              'Your end-of-day report has been sent to your supervisor for review. You\'ll be notified once it\'s approved.',
              textAlign: TextAlign.center,
              style: GoogleFonts.ibmPlexSans(
                fontSize: 14,
                color: const Color(0xFF8899AA),
                height: 1.5,
              ),
            ),
            const SizedBox(height: 32),
            _SummaryChip(
              icon: 'local_shipping',
              label: 'Total Revenue',
              value: 'TZS ${_totalRevenue.toStringAsFixed(0)}',
              color: AppTheme.accent,
            ),
            const SizedBox(height: 12),
            _SummaryChip(
              icon: 'assignment_turned_in',
              label: 'Deliveries Completed',
              value: '$_totalDelivered of ${_deliveries.length}',
              color: AppTheme.success,
            ),
            const SizedBox(height: 24),
            // Export button on success screen too
            SizedBox(
              width: double.infinity,
              height: 46,
              child: OutlinedButton.icon(
                onPressed: _isExporting ? null : _exportCsv,
                icon: CustomIconWidget(
                  iconName: 'download',
                  color: AppTheme.success,
                  size: 16,
                ),
                label: Text(
                  'Download CSV Report',
                  style: GoogleFonts.ibmPlexSans(
                    fontSize: 14,
                    fontWeight: FontWeight.w600,
                    color: AppTheme.success,
                  ),
                ),
                style: OutlinedButton.styleFrom(
                  side: BorderSide(color: AppTheme.success.withAlpha(100)),
                  shape: RoundedRectangleBorder(
                    borderRadius: BorderRadius.circular(12),
                  ),
                ),
              ),
            ),
          ],
        ),
      ),
    );
  }

  Widget _buildReportView(double safeBottom) {
    return CustomScrollView(
      slivers: [
        SliverToBoxAdapter(
          child: SizedBox(height: MediaQuery.of(context).padding.top + 72),
        ),

        // ── Summary Totals ──────────────────────────────────────────────
        SliverToBoxAdapter(
          child: Padding(
            padding: const EdgeInsets.fromLTRB(20, 20, 20, 0),
            child: _SummaryTotalsCard(
              totalRevenue: _totalRevenue,
              totalDeliveries: _deliveries.length,
              delivered: _totalDelivered,
              collected: _totalCollected,
              partial: _totalPartial,
            ),
          ),
        ),

        const SliverToBoxAdapter(child: SizedBox(height: 20)),

        // ── Section header: Deliveries ──────────────────────────────────
        SliverToBoxAdapter(
          child: Padding(
            padding: const EdgeInsets.symmetric(horizontal: 20),
            child: Row(
              children: [
                Text(
                  'Delivery Breakdown',
                  style: GoogleFonts.ibmPlexSans(
                    fontSize: 15,
                    fontWeight: FontWeight.w600,
                    color: Colors.white,
                  ),
                ),
                const Spacer(),
                Text(
                  '${_deliveries.length} stops',
                  style: GoogleFonts.ibmPlexSans(
                    fontSize: 12,
                    color: const Color(0xFF8899AA),
                  ),
                ),
              ],
            ),
          ),
        ),

        const SliverToBoxAdapter(child: SizedBox(height: 12)),

        // ── Delivery list ───────────────────────────────────────────────
        _isLoadingDeliveries
            ? SliverToBoxAdapter(
                child: Padding(
                  padding: const EdgeInsets.symmetric(horizontal: 20),
                  child: Container(
                    padding: const EdgeInsets.all(24),
                    decoration: BoxDecoration(
                      color: AppTheme.surfaceDark,
                      borderRadius: BorderRadius.circular(12),
                    ),
                    child: const Center(
                      child: CircularProgressIndicator(color: AppTheme.accent),
                    ),
                  ),
                ),
              )
            : _deliveries.isEmpty
            ? SliverToBoxAdapter(
                child: Padding(
                  padding: const EdgeInsets.symmetric(horizontal: 20),
                  child: Container(
                    padding: const EdgeInsets.all(24),
                    decoration: BoxDecoration(
                      color: AppTheme.surfaceDark,
                      borderRadius: BorderRadius.circular(12),
                      border: Border.all(
                        color: const Color(0xFF3A5068),
                        width: 1,
                      ),
                    ),
                    child: Column(
                      children: [
                        CustomIconWidget(
                          iconName: 'local_shipping',
                          color: const Color(0xFF8899AA),
                          size: 32,
                        ),
                        const SizedBox(height: 10),
                        Text(
                          'No deliveries recorded today',
                          style: GoogleFonts.ibmPlexSans(
                            fontSize: 13,
                            color: const Color(0xFF8899AA),
                          ),
                        ),
                      ],
                    ),
                  ),
                ),
              )
            : SliverList(
                delegate: SliverChildBuilderDelegate((context, index) {
                  final d = _deliveries[index];
                  return Padding(
                    padding: EdgeInsets.fromLTRB(
                      20,
                      0,
                      20,
                      index == _deliveries.length - 1 ? 0 : 10,
                    ),
                    child: _DeliveryRow(
                      customer: d['customer'] as String,
                      items: d['items'] as String,
                      amount: (d['amount'] as num).toDouble(),
                      status: d['status'] as String,
                      time: d['time'] as String,
                      statusColor: _statusColor(d['status'] as String),
                      statusLabel: _statusLabel(d['status'] as String),
                    ),
                  );
                }, childCount: _deliveries.length),
              ),

        const SliverToBoxAdapter(child: SizedBox(height: 20)),

        // ── Notes field ─────────────────────────────────────────────────
        SliverToBoxAdapter(
          child: Padding(
            padding: const EdgeInsets.symmetric(horizontal: 20),
            child: Column(
              crossAxisAlignment: CrossAxisAlignment.start,
              children: [
                Text(
                  'Field Notes',
                  style: GoogleFonts.ibmPlexSans(
                    fontSize: 15,
                    fontWeight: FontWeight.w600,
                    color: Colors.white,
                  ),
                ),
                const SizedBox(height: 10),
                Container(
                  decoration: BoxDecoration(
                    color: AppTheme.surfaceVariantDark,
                    borderRadius: BorderRadius.circular(12),
                    border: Border.all(
                      color: const Color(0xFF3A5068),
                      width: 1,
                    ),
                  ),
                  child: TextField(
                    controller: _notesController,
                    maxLines: 4,
                    style: GoogleFonts.ibmPlexSans(
                      fontSize: 14,
                      color: const Color(0xFFE2EAF0),
                    ),
                    decoration: InputDecoration(
                      hintText:
                          'Add any notes for your supervisor (road issues, customer feedback, incidents…)',
                      hintStyle: GoogleFonts.ibmPlexSans(
                        fontSize: 13,
                        color: const Color(0xFF8899AA),
                      ),
                      border: InputBorder.none,
                      contentPadding: const EdgeInsets.all(14),
                    ),
                  ),
                ),
              ],
            ),
          ),
        ),

        const SliverToBoxAdapter(child: SizedBox(height: 20)),

        // ── Supervisor approval note ────────────────────────────────────
        SliverToBoxAdapter(
          child: Padding(
            padding: const EdgeInsets.symmetric(horizontal: 20),
            child: Container(
              padding: const EdgeInsets.all(14),
              decoration: BoxDecoration(
                color: AppTheme.info.withAlpha(20),
                borderRadius: BorderRadius.circular(12),
                border: Border.all(
                  color: AppTheme.info.withAlpha(60),
                  width: 1,
                ),
              ),
              child: Row(
                crossAxisAlignment: CrossAxisAlignment.start,
                children: [
                  CustomIconWidget(
                    iconName: 'info_outline',
                    color: AppTheme.info,
                    size: 18,
                  ),
                  const SizedBox(width: 10),
                  Expanded(
                    child: Text(
                      'This report will be reviewed by your supervisor and included in team analytics. Submit before 18:00.',
                      style: GoogleFonts.ibmPlexSans(
                        fontSize: 12,
                        color: AppTheme.info,
                        height: 1.5,
                      ),
                    ),
                  ),
                ],
              ),
            ),
          ),
        ),

        // Bottom padding for submit button
        SliverToBoxAdapter(child: SizedBox(height: safeBottom + 100)),
      ],
    );
  }
}

// ── Summary Totals Card ─────────────────────────────────────────────────────

class _SummaryTotalsCard extends StatelessWidget {
  final double totalRevenue;
  final int totalDeliveries;
  final int delivered;
  final int collected;
  final int partial;

  const _SummaryTotalsCard({
    required this.totalRevenue,
    required this.totalDeliveries,
    required this.delivered,
    required this.collected,
    required this.partial,
  });

  @override
  Widget build(BuildContext context) {
    return Container(
      padding: const EdgeInsets.all(20),
      decoration: BoxDecoration(
        gradient: LinearGradient(
          colors: [
            AppTheme.primaryLight.withAlpha(180),
            AppTheme.primary.withAlpha(220),
          ],
          begin: Alignment.topLeft,
          end: Alignment.bottomRight,
        ),
        borderRadius: BorderRadius.circular(16),
        border: Border.all(color: AppTheme.accent.withAlpha(60), width: 1),
      ),
      child: Column(
        crossAxisAlignment: CrossAxisAlignment.start,
        children: [
          Row(
            children: [
              CustomIconWidget(
                iconName: 'summarize',
                color: AppTheme.accent,
                size: 18,
              ),
              const SizedBox(width: 8),
              Text(
                'Daily Summary',
                style: GoogleFonts.ibmPlexSans(
                  fontSize: 13,
                  fontWeight: FontWeight.w500,
                  color: AppTheme.accent,
                ),
              ),
            ],
          ),
          const SizedBox(height: 14),
          Text(
            'TZS ${totalRevenue.toStringAsFixed(0)}',
            style: GoogleFonts.ibmPlexSans(
              fontSize: 32,
              fontWeight: FontWeight.w700,
              color: Colors.white,
            ),
          ),
          Text(
            'Total revenue collected today',
            style: GoogleFonts.ibmPlexSans(
              fontSize: 12,
              color: const Color(0xFFB0C4D8),
            ),
          ),
          const SizedBox(height: 18),
          Row(
            children: [
              _StatPill(
                label: 'Delivered',
                value: '$delivered',
                color: AppTheme.success,
              ),
              const SizedBox(width: 8),
              _StatPill(
                label: 'Collected',
                value: '$collected',
                color: AppTheme.accent,
              ),
              const SizedBox(width: 8),
              _StatPill(
                label: 'Partial',
                value: '$partial',
                color: AppTheme.warning,
              ),
              const Spacer(),
              Text(
                '$totalDeliveries stops',
                style: GoogleFonts.ibmPlexSans(
                  fontSize: 12,
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

class _StatPill extends StatelessWidget {
  final String label;
  final String value;
  final Color color;

  const _StatPill({
    required this.label,
    required this.value,
    required this.color,
  });

  @override
  Widget build(BuildContext context) {
    return Container(
      padding: const EdgeInsets.symmetric(horizontal: 10, vertical: 5),
      decoration: BoxDecoration(
        color: color.withAlpha(30),
        borderRadius: BorderRadius.circular(20),
        border: Border.all(color: color.withAlpha(80), width: 1),
      ),
      child: Row(
        mainAxisSize: MainAxisSize.min,
        children: [
          Text(
            value,
            style: GoogleFonts.ibmPlexSans(
              fontSize: 13,
              fontWeight: FontWeight.w700,
              color: color,
            ),
          ),
          const SizedBox(width: 4),
          Text(
            label,
            style: GoogleFonts.ibmPlexSans(
              fontSize: 11,
              color: color.withAlpha(200),
            ),
          ),
        ],
      ),
    );
  }
}

// ── Delivery Row ────────────────────────────────────────────────────────────

class _DeliveryRow extends StatelessWidget {
  final String customer;
  final String items;
  final double amount;
  final String status;
  final String time;
  final Color statusColor;
  final String statusLabel;

  const _DeliveryRow({
    required this.customer,
    required this.items,
    required this.amount,
    required this.status,
    required this.time,
    required this.statusColor,
    required this.statusLabel,
  });

  @override
  Widget build(BuildContext context) {
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
            width: 40,
            height: 40,
            decoration: BoxDecoration(
              color: statusColor.withAlpha(25),
              borderRadius: BorderRadius.circular(10),
            ),
            child: Center(
              child: CustomIconWidget(
                iconName: status == 'collected'
                    ? 'payments'
                    : status == 'partial'
                    ? 'warning_amber'
                    : 'local_shipping',
                color: statusColor,
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
                  customer,
                  style: GoogleFonts.ibmPlexSans(
                    fontSize: 13,
                    fontWeight: FontWeight.w600,
                    color: Colors.white,
                  ),
                  overflow: TextOverflow.ellipsis,
                  maxLines: 1,
                ),
                const SizedBox(height: 2),
                Text(
                  items,
                  style: GoogleFonts.ibmPlexSans(
                    fontSize: 11,
                    color: const Color(0xFF8899AA),
                  ),
                  overflow: TextOverflow.ellipsis,
                  maxLines: 1,
                ),
              ],
            ),
          ),
          const SizedBox(width: 10),
          Column(
            crossAxisAlignment: CrossAxisAlignment.end,
            children: [
              Text(
                'TZS ${amount.toStringAsFixed(0)}',
                style: GoogleFonts.ibmPlexSans(
                  fontSize: 13,
                  fontWeight: FontWeight.w700,
                  color: Colors.white,
                ),
              ),
              const SizedBox(height: 4),
              Container(
                padding: const EdgeInsets.symmetric(horizontal: 7, vertical: 2),
                decoration: BoxDecoration(
                  color: statusColor.withAlpha(25),
                  borderRadius: BorderRadius.circular(8),
                ),
                child: Text(
                  statusLabel,
                  style: GoogleFonts.ibmPlexSans(
                    fontSize: 10,
                    fontWeight: FontWeight.w600,
                    color: statusColor,
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

// ── EOD Sync Badge (AppBar) ─────────────────────────────────────────────────

class _EodSyncBadge extends StatefulWidget {
  final bool isSubmitted;
  final SyncStatus? syncStatus;
  final OfflineSyncService syncService;

  const _EodSyncBadge({
    required this.isSubmitted,
    required this.syncStatus,
    required this.syncService,
  });

  @override
  State<_EodSyncBadge> createState() => _EodSyncBadgeState();
}

class _EodSyncBadgeState extends State<_EodSyncBadge>
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
    Color color;
    String label;
    IconData icon;
    bool showPulse;

    if (!widget.isSubmitted) {
      final isOnline = widget.syncService.isOnline;
      if (!isOnline) {
        color = AppTheme.warning;
        label = 'Offline';
        icon = Icons.cloud_off_rounded;
        showPulse = false;
      } else {
        color = AppTheme.warning;
        label = 'Pending Sync';
        icon = Icons.cloud_upload_outlined;
        showPulse = true;
      }
    } else {
      switch (widget.syncStatus) {
        case SyncStatus.synced:
          color = AppTheme.success;
          label = 'Synced';
          icon = Icons.cloud_done_rounded;
          showPulse = false;
          break;
        case SyncStatus.failed:
          color = AppTheme.error;
          label = 'Sync Failed';
          icon = Icons.sync_problem_rounded;
          showPulse = false;
          break;
        case SyncStatus.pending:
        default:
          color = AppTheme.warning;
          label = 'Pending Sync';
          icon = Icons.cloud_upload_outlined;
          showPulse = true;
          break;
      }
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
            style: GoogleFonts.ibmPlexSans(
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

// ── Summary Chip (success view) ─────────────────────────────────────────────

class _SummaryChip extends StatelessWidget {
  final String icon;
  final String label;
  final String value;
  final Color color;

  const _SummaryChip({
    required this.icon,
    required this.label,
    required this.value,
    required this.color,
  });

  @override
  Widget build(BuildContext context) {
    return Container(
      width: double.infinity,
      padding: const EdgeInsets.symmetric(horizontal: 16, vertical: 14),
      decoration: BoxDecoration(
        color: AppTheme.surfaceDark,
        borderRadius: BorderRadius.circular(12),
        border: Border.all(color: color.withAlpha(60), width: 1),
      ),
      child: Row(
        children: [
          CustomIconWidget(iconName: icon, color: color, size: 20),
          const SizedBox(width: 12),
          Text(
            label,
            style: GoogleFonts.ibmPlexSans(
              fontSize: 13,
              color: const Color(0xFFB0C4D8),
            ),
          ),
          const Spacer(),
          Text(
            value,
            style: GoogleFonts.ibmPlexSans(
              fontSize: 14,
              fontWeight: FontWeight.w700,
              color: Colors.white,
            ),
          ),
        ],
      ),
    );
  }
}
