import 'package:flutter/material.dart';
import '../../../theme/app_theme.dart';
import '../../../widgets/custom_icon_widget.dart';
import '../../../services/offline_sync_service.dart';

/// Enhanced sync status bar with cleared/pending/failed states and retry action.
class SyncStatusBarWidget extends StatelessWidget {
  final OfflineSyncService syncService;

  const SyncStatusBarWidget({required this.syncService, super.key});

  @override
  Widget build(BuildContext context) {
    final isOnline = syncService.isOnline;
    final pending = syncService.totalPendingCount;
    final failed = syncService.failedCount;
    final isSyncing = syncService.isSyncing;

    // Cleared — nothing to show
    if (isOnline && pending == 0 && failed == 0 && !isSyncing) {
      return const SizedBox.shrink();
    }

    Color color;
    String message;
    String iconName;
    String? actionLabel;

    if (isSyncing) {
      color = AppTheme.accent;
      message = 'Syncing $pending item(s)…';
      iconName = 'sync';
      actionLabel = null;
    } else if (failed > 0) {
      color = AppTheme.error;
      message = '$failed item(s) failed to sync';
      iconName = 'sync_problem';
      actionLabel = 'Retry';
    } else if (!isOnline && pending > 0) {
      color = AppTheme.warning;
      message = '$pending item(s) pending sync';
      iconName = 'cloud_off';
      actionLabel = null;
    } else if (isOnline && pending > 0) {
      color = AppTheme.accent;
      message = 'Syncing $pending item(s)…';
      iconName = 'cloud_upload';
      actionLabel = null;
      // Trigger sync if not already running
      WidgetsBinding.instance.addPostFrameCallback((_) {
        syncService.syncNow();
      });
    } else {
      return const SizedBox.shrink();
    }

    return GestureDetector(
      onTap: actionLabel != null ? () => syncService.syncNow() : null,
      child: Container(
        margin: const EdgeInsets.fromLTRB(20, 0, 20, 12),
        padding: const EdgeInsets.symmetric(horizontal: 14, vertical: 10),
        decoration: BoxDecoration(
          color: color.withAlpha(31),
          borderRadius: BorderRadius.circular(10),
          border: Border.all(color: color.withAlpha(89)),
        ),
        child: Row(
          children: [
            isSyncing
                ? SizedBox(
                    width: 16,
                    height: 16,
                    child: CircularProgressIndicator(
                      strokeWidth: 2,
                      color: color,
                    ),
                  )
                : CustomIconWidget(iconName: iconName, color: color, size: 16),
            const SizedBox(width: 10),
            Expanded(
              child: Text(
                message,
                style: TextStyle(
                  fontSize: 12,
                  fontWeight: FontWeight.w500,
                  color: color,
                ),
              ),
            ),
            if (actionLabel != null)
              Text(
                actionLabel,
                style: TextStyle(
                  fontSize: 11,
                  fontWeight: FontWeight.w600,
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
