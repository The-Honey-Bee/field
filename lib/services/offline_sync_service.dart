import 'dart:convert';

import 'package:connectivity_plus/connectivity_plus.dart';
import 'package:flutter/foundation.dart';
import 'package:shared_preferences/shared_preferences.dart';

import './supabase_service.dart';
import './notification_service.dart';

// ─── Sync Status Enum ───────────────────────────────────────────────────────

enum SyncStatus { pending, synced, failed }

// ─── Order Model ────────────────────────────────────────────────────────────

class LocalOrder {
  final String localId;
  final String staffId;
  final String customerName;
  final String paymentMethod;
  final List<Map<String, dynamic>> items;
  final double subtotal;
  final double amountReceived;
  final double changeAmount;
  SyncStatus syncStatus;
  final DateTime createdAt;

  LocalOrder({
    required this.localId,
    required this.staffId,
    required this.customerName,
    required this.paymentMethod,
    required this.items,
    required this.subtotal,
    required this.amountReceived,
    required this.changeAmount,
    this.syncStatus = SyncStatus.pending,
    DateTime? createdAt,
  }) : createdAt = createdAt ?? DateTime.now();

  Map<String, dynamic> toJson() => {
    'localId': localId,
    'staffId': staffId,
    'customerName': customerName,
    'paymentMethod': paymentMethod,
    'items': items,
    'subtotal': subtotal,
    'amountReceived': amountReceived,
    'changeAmount': changeAmount,
    'syncStatus': syncStatus.name,
    'createdAt': createdAt.toIso8601String(),
  };

  factory LocalOrder.fromJson(Map<String, dynamic> json) => LocalOrder(
    localId: json['localId'] as String,
    staffId: json['staffId'] as String,
    customerName: json['customerName'] as String,
    paymentMethod: json['paymentMethod'] as String,
    items: List<Map<String, dynamic>>.from(
      (json['items'] as List).map((e) => Map<String, dynamic>.from(e as Map)),
    ),
    subtotal: (json['subtotal'] as num).toDouble(),
    amountReceived: (json['amountReceived'] as num).toDouble(),
    changeAmount: (json['changeAmount'] as num).toDouble(),
    syncStatus: SyncStatus.values.firstWhere(
      (s) => s.name == json['syncStatus'],
      orElse: () => SyncStatus.pending,
    ),
    createdAt: DateTime.parse(json['createdAt'] as String),
  );

  Map<String, dynamic> toSupabaseMap() => {
    'local_id': localId,
    'staff_id': staffId,
    'customer_name': customerName,
    'payment_method': paymentMethod,
    'items': items,
    'subtotal': subtotal,
    'amount_received': amountReceived,
    'change_amount': changeAmount,
    'sync_status': 'synced',
  };
}

// ─── EOD Report Model ────────────────────────────────────────────────────────

class LocalEodReport {
  final String localId;
  final String staffId;
  final DateTime reportDate;
  final double totalRevenue;
  final int totalDeliveries;
  final int deliveredCount;
  final int collectedCount;
  final int partialCount;
  final List<Map<String, dynamic>> deliveries;
  final String fieldNotes;
  SyncStatus syncStatus;
  final DateTime createdAt;

  LocalEodReport({
    required this.localId,
    required this.staffId,
    required this.reportDate,
    required this.totalRevenue,
    required this.totalDeliveries,
    required this.deliveredCount,
    required this.collectedCount,
    required this.partialCount,
    required this.deliveries,
    required this.fieldNotes,
    this.syncStatus = SyncStatus.pending,
    DateTime? createdAt,
  }) : createdAt = createdAt ?? DateTime.now();

  Map<String, dynamic> toJson() => {
    'localId': localId,
    'staffId': staffId,
    'reportDate': reportDate.toIso8601String(),
    'totalRevenue': totalRevenue,
    'totalDeliveries': totalDeliveries,
    'deliveredCount': deliveredCount,
    'collectedCount': collectedCount,
    'partialCount': partialCount,
    'deliveries': deliveries,
    'fieldNotes': fieldNotes,
    'syncStatus': syncStatus.name,
    'createdAt': createdAt.toIso8601String(),
  };

  factory LocalEodReport.fromJson(Map<String, dynamic> json) => LocalEodReport(
    localId: json['localId'] as String,
    staffId: json['staffId'] as String,
    reportDate: DateTime.parse(json['reportDate'] as String),
    totalRevenue: (json['totalRevenue'] as num).toDouble(),
    totalDeliveries: json['totalDeliveries'] as int,
    deliveredCount: json['deliveredCount'] as int,
    collectedCount: json['collectedCount'] as int,
    partialCount: json['partialCount'] as int,
    deliveries: List<Map<String, dynamic>>.from(
      (json['deliveries'] as List).map(
        (e) => Map<String, dynamic>.from(e as Map),
      ),
    ),
    fieldNotes: json['fieldNotes'] as String? ?? '',
    syncStatus: SyncStatus.values.firstWhere(
      (s) => s.name == json['syncStatus'],
      orElse: () => SyncStatus.pending,
    ),
    createdAt: DateTime.parse(json['createdAt'] as String),
  );

  Map<String, dynamic> toSupabaseMap() => {
    'local_id': localId,
    'staff_id': staffId,
    'report_date': reportDate.toIso8601String().split('T').first,
    'total_revenue': totalRevenue,
    'total_deliveries': totalDeliveries,
    'delivered_count': deliveredCount,
    'collected_count': collectedCount,
    'partial_count': partialCount,
    'deliveries': deliveries,
    'field_notes': fieldNotes,
    'sync_status': 'submitted',
  };
}

// ─── Offline Sync Service ────────────────────────────────────────────────────

class OfflineSyncService extends ChangeNotifier {
  static OfflineSyncService? _instance;
  static OfflineSyncService get instance =>
      _instance ??= OfflineSyncService._();
  OfflineSyncService._();

  static const _ordersKey = 'zamzam_pending_orders';
  static const _reportsKey = 'zamzam_pending_reports';

  bool _isOnline = true;
  bool _isSyncing = false;
  List<LocalOrder> _pendingOrders = [];
  List<LocalEodReport> _pendingReports = [];

  bool get isOnline => _isOnline;
  bool get isSyncing => _isSyncing;
  int get pendingOrderCount =>
      _pendingOrders.where((o) => o.syncStatus == SyncStatus.pending).length;
  int get pendingReportCount =>
      _pendingReports.where((r) => r.syncStatus == SyncStatus.pending).length;
  int get totalPendingCount => pendingOrderCount + pendingReportCount;
  int get failedCount =>
      _pendingOrders.where((o) => o.syncStatus == SyncStatus.failed).length +
      _pendingReports.where((r) => r.syncStatus == SyncStatus.failed).length;

  /// Initialize: load persisted data and start connectivity monitoring
  Future<void> initialize() async {
    await _loadFromPrefs();
    _startConnectivityMonitor();
  }

  void _startConnectivityMonitor() {
    Connectivity().onConnectivityChanged.listen((results) {
      final wasOffline = !_isOnline;
      _isOnline = results.any((r) => r != ConnectivityResult.none);
      notifyListeners();
      if (wasOffline && _isOnline) {
        // Back online — trigger sync
        syncNow();
      }
    });

    // Check initial state
    Connectivity().checkConnectivity().then((results) {
      _isOnline = results.any((r) => r != ConnectivityResult.none);
      notifyListeners();
    });
  }

  // ── Load / Save ────────────────────────────────────────────────────────────

  Future<void> _loadFromPrefs() async {
    try {
      final prefs = await SharedPreferences.getInstance();

      final ordersJson = prefs.getString(_ordersKey);
      if (ordersJson != null) {
        final list = jsonDecode(ordersJson) as List;
        _pendingOrders = list
            .map(
              (e) => LocalOrder.fromJson(Map<String, dynamic>.from(e as Map)),
            )
            .toList();
      }

      final reportsJson = prefs.getString(_reportsKey);
      if (reportsJson != null) {
        final list = jsonDecode(reportsJson) as List;
        _pendingReports = list
            .map(
              (e) =>
                  LocalEodReport.fromJson(Map<String, dynamic>.from(e as Map)),
            )
            .toList();
      }
    } catch (e) {
      debugPrint('[OfflineSync] Load error: $e');
    }
    notifyListeners();
  }

  Future<void> _saveOrdersToPrefs() async {
    try {
      final prefs = await SharedPreferences.getInstance();
      await prefs.setString(
        _ordersKey,
        jsonEncode(_pendingOrders.map((o) => o.toJson()).toList()),
      );
    } catch (e) {
      debugPrint('[OfflineSync] Save orders error: $e');
    }
  }

  Future<void> _saveReportsToPrefs() async {
    try {
      final prefs = await SharedPreferences.getInstance();
      await prefs.setString(
        _reportsKey,
        jsonEncode(_pendingReports.map((r) => r.toJson()).toList()),
      );
    } catch (e) {
      debugPrint('[OfflineSync] Save reports error: $e');
    }
  }

  // ── Save Order Locally ─────────────────────────────────────────────────────

  Future<SyncStatus> saveOrder(LocalOrder order) async {
    _pendingOrders.add(order);
    await _saveOrdersToPrefs();
    notifyListeners();

    if (_isOnline) {
      return await _syncSingleOrder(order);
    }
    return SyncStatus.pending;
  }

  // ── Save EOD Report Locally ────────────────────────────────────────────────

  Future<SyncStatus> saveEodReport(LocalEodReport report) async {
    _pendingReports.add(report);
    await _saveReportsToPrefs();
    notifyListeners();

    if (_isOnline) {
      return await _syncSingleReport(report);
    }
    return SyncStatus.pending;
  }

  // ── Sync Single Order ──────────────────────────────────────────────────────

  Future<SyncStatus> _syncSingleOrder(LocalOrder order) async {
    try {
      final client = SupabaseService.instance.client;
      await client.from('orders').insert(order.toSupabaseMap());
      order.syncStatus = SyncStatus.synced;
      await _saveOrdersToPrefs();
      notifyListeners();
      NotificationService.instance.showSuccess(
        'Order Synced',
        'Order for ${order.customerName} synced successfully',
      );
      return SyncStatus.synced;
    } catch (e) {
      debugPrint('[OfflineSync] Order sync error: $e');
      order.syncStatus = SyncStatus.failed;
      await _saveOrdersToPrefs();
      notifyListeners();
      NotificationService.instance.showError(
        'Sync Failed',
        'Order for ${order.customerName} could not sync',
      );
      return SyncStatus.failed;
    }
  }

  // ── Sync Single Report ─────────────────────────────────────────────────────

  Future<SyncStatus> _syncSingleReport(LocalEodReport report) async {
    try {
      final client = SupabaseService.instance.client;
      await client.from('eod_reports').insert(report.toSupabaseMap());
      report.syncStatus = SyncStatus.synced;
      await _saveReportsToPrefs();
      notifyListeners();
      NotificationService.instance.showSuccess(
        'Report Synced',
        'EOD report submitted and synced successfully',
      );
      return SyncStatus.synced;
    } catch (e) {
      debugPrint('[OfflineSync] Report sync error: $e');
      report.syncStatus = SyncStatus.failed;
      await _saveReportsToPrefs();
      notifyListeners();
      NotificationService.instance.showError(
        'Report Sync Failed',
        'EOD report could not be synced — will retry',
      );
      return SyncStatus.failed;
    }
  }

  // ── Sync All Pending ───────────────────────────────────────────────────────

  Future<void> syncNow() async {
    if (_isSyncing || !_isOnline) return;
    _isSyncing = true;
    notifyListeners();

    // Sync pending orders
    final pendingOrders = _pendingOrders
        .where(
          (o) =>
              o.syncStatus == SyncStatus.pending ||
              o.syncStatus == SyncStatus.failed,
        )
        .toList();
    for (final order in pendingOrders) {
      await _syncSingleOrder(order);
    }

    // Sync pending reports
    final pendingReports = _pendingReports
        .where(
          (r) =>
              r.syncStatus == SyncStatus.pending ||
              r.syncStatus == SyncStatus.failed,
        )
        .toList();
    for (final report in pendingReports) {
      await _syncSingleReport(report);
    }

    _isSyncing = false;
    notifyListeners();
  }

  // ── Clear Synced Records ───────────────────────────────────────────────────

  Future<void> clearSynced() async {
    _pendingOrders.removeWhere((o) => o.syncStatus == SyncStatus.synced);
    _pendingReports.removeWhere((r) => r.syncStatus == SyncStatus.synced);
    await _saveOrdersToPrefs();
    await _saveReportsToPrefs();
    notifyListeners();
  }

  // ── Generate Local ID ──────────────────────────────────────────────────────

  static String generateLocalId() =>
      'local_${DateTime.now().millisecondsSinceEpoch}';
}
