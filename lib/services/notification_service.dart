import 'dart:async';
import 'package:flutter/material.dart';

// ─── Notification Type ───────────────────────────────────────────────────────

enum AppNotificationType { success, error, warning, info }

// ─── Notification Model ──────────────────────────────────────────────────────

class AppNotification {
  final String id;
  final String title;
  final String message;
  final AppNotificationType type;
  final DateTime timestamp;
  bool isRead;

  AppNotification({
    required this.id,
    required this.title,
    required this.message,
    required this.type,
    DateTime? timestamp,
    this.isRead = false,
  }) : timestamp = timestamp ?? DateTime.now();
}

// ─── Notification Service ────────────────────────────────────────────────────

class NotificationService extends ChangeNotifier {
  static NotificationService? _instance;
  static NotificationService get instance =>
      _instance ??= NotificationService._();
  NotificationService._();

  final List<AppNotification> _notifications = [];
  final StreamController<AppNotification> _toastController =
      StreamController<AppNotification>.broadcast();

  List<AppNotification> get notifications =>
      List.unmodifiable(_notifications.reversed.toList());
  int get unreadCount => _notifications.where((n) => !n.isRead).length;
  Stream<AppNotification> get toastStream => _toastController.stream;

  void _add(AppNotification notification) {
    _notifications.add(notification);
    _toastController.add(notification);
    notifyListeners();
  }

  void showSuccess(String title, String message) {
    _add(
      AppNotification(
        id: 'notif_${DateTime.now().millisecondsSinceEpoch}',
        title: title,
        message: message,
        type: AppNotificationType.success,
      ),
    );
  }

  void showError(String title, String message) {
    _add(
      AppNotification(
        id: 'notif_${DateTime.now().millisecondsSinceEpoch}',
        title: title,
        message: message,
        type: AppNotificationType.error,
      ),
    );
  }

  void showWarning(String title, String message) {
    _add(
      AppNotification(
        id: 'notif_${DateTime.now().millisecondsSinceEpoch}',
        title: title,
        message: message,
        type: AppNotificationType.warning,
      ),
    );
  }

  void showInfo(String title, String message) {
    _add(
      AppNotification(
        id: 'notif_${DateTime.now().millisecondsSinceEpoch}',
        title: title,
        message: message,
        type: AppNotificationType.info,
      ),
    );
  }

  void markAllRead() {
    for (final n in _notifications) {
      n.isRead = true;
    }
    notifyListeners();
  }

  void markRead(String id) {
    final idx = _notifications.indexWhere((n) => n.id == id);
    if (idx != -1) {
      _notifications[idx].isRead = true;
      notifyListeners();
    }
  }

  void clearAll() {
    _notifications.clear();
    notifyListeners();
  }

  @override
  void dispose() {
    _toastController.close();
    super.dispose();
  }
}

// ─── Toast Overlay Widget ────────────────────────────────────────────────────

class AppToastOverlay extends StatefulWidget {
  final Widget child;
  const AppToastOverlay({required this.child, super.key});

  @override
  State<AppToastOverlay> createState() => _AppToastOverlayState();
}

class _AppToastOverlayState extends State<AppToastOverlay> {
  final List<_ToastEntry> _toasts = [];
  StreamSubscription<AppNotification>? _sub;

  @override
  void initState() {
    super.initState();
    _sub = NotificationService.instance.toastStream.listen(_onToast);
  }

  void _onToast(AppNotification notification) {
    if (!mounted) return;
    final entry = _ToastEntry(notification: notification);
    setState(() => _toasts.add(entry));
    Future.delayed(const Duration(seconds: 3), () {
      if (mounted) setState(() => _toasts.remove(entry));
    });
  }

  @override
  void dispose() {
    _sub?.cancel();
    super.dispose();
  }

  @override
  Widget build(BuildContext context) {
    return Stack(
      children: [
        widget.child,
        Positioned(
          top: MediaQuery.of(context).padding.top + 80,
          left: 16,
          right: 16,
          child: Column(
            children: _toasts
                .map((e) => _ToastWidget(key: ValueKey(e), entry: e))
                .toList(),
          ),
        ),
      ],
    );
  }
}

class _ToastEntry {
  final AppNotification notification;
  _ToastEntry({required this.notification});
}

class _ToastWidget extends StatefulWidget {
  final _ToastEntry entry;
  const _ToastWidget({required this.entry, super.key});

  @override
  State<_ToastWidget> createState() => _ToastWidgetState();
}

class _ToastWidgetState extends State<_ToastWidget>
    with SingleTickerProviderStateMixin {
  late AnimationController _ctrl;
  late Animation<double> _opacity;
  late Animation<Offset> _slide;

  @override
  void initState() {
    super.initState();
    _ctrl = AnimationController(
      vsync: this,
      duration: const Duration(milliseconds: 300),
    );
    _opacity = CurvedAnimation(parent: _ctrl, curve: Curves.easeOut);
    _slide = Tween<Offset>(
      begin: const Offset(0, -0.3),
      end: Offset.zero,
    ).animate(CurvedAnimation(parent: _ctrl, curve: Curves.easeOutCubic));
    _ctrl.forward();
  }

  @override
  void dispose() {
    _ctrl.dispose();
    super.dispose();
  }

  Color get _bgColor {
    switch (widget.entry.notification.type) {
      case AppNotificationType.success:
        return const Color(0xFF22C55E);
      case AppNotificationType.error:
        return const Color(0xFFEF4444);
      case AppNotificationType.warning:
        return const Color(0xFFF59E0B);
      case AppNotificationType.info:
        return const Color(0xFF00B4D8);
    }
  }

  IconData get _icon {
    switch (widget.entry.notification.type) {
      case AppNotificationType.success:
        return Icons.check_circle_outline;
      case AppNotificationType.error:
        return Icons.error_outline;
      case AppNotificationType.warning:
        return Icons.warning_amber_outlined;
      case AppNotificationType.info:
        return Icons.info_outline;
    }
  }

  @override
  Widget build(BuildContext context) {
    return Padding(
      padding: const EdgeInsets.only(bottom: 8),
      child: SlideTransition(
        position: _slide,
        child: FadeTransition(
          opacity: _opacity,
          child: Container(
            decoration: BoxDecoration(
              color: const Color(0xFF1E2A3A),
              borderRadius: BorderRadius.circular(12),
              border: Border.all(color: _bgColor.withAlpha(80), width: 1),
              boxShadow: [
                BoxShadow(
                  color: Colors.black.withAlpha(80),
                  blurRadius: 12,
                  offset: const Offset(0, 4),
                ),
              ],
            ),
            child: Padding(
              padding: const EdgeInsets.symmetric(horizontal: 14, vertical: 12),
              child: Row(
                children: [
                  Container(
                    width: 32,
                    height: 32,
                    decoration: BoxDecoration(
                      color: _bgColor.withAlpha(30),
                      borderRadius: BorderRadius.circular(8),
                    ),
                    child: Icon(_icon, color: _bgColor, size: 18),
                  ),
                  const SizedBox(width: 12),
                  Expanded(
                    child: Column(
                      crossAxisAlignment: CrossAxisAlignment.start,
                      mainAxisSize: MainAxisSize.min,
                      children: [
                        Text(
                          widget.entry.notification.title,
                          style: const TextStyle(
                            fontSize: 13,
                            fontWeight: FontWeight.w600,
                            color: Colors.white,
                          ),
                          overflow: TextOverflow.ellipsis,
                        ),
                        if (widget.entry.notification.message.isNotEmpty)
                          Text(
                            widget.entry.notification.message,
                            style: const TextStyle(
                              fontSize: 12,
                              color: Color(0xFFB0C4D8),
                            ),
                            overflow: TextOverflow.ellipsis,
                            maxLines: 2,
                          ),
                      ],
                    ),
                  ),
                ],
              ),
            ),
          ),
        ),
      ),
    );
  }
}
