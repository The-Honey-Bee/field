import React, { useState, useEffect } from 'react';
import { WifiOff, RefreshCw, CheckCircle2, Cloud, ChevronRight } from 'lucide-react';
import { storageService } from '../services/storage';

interface OfflineSyncBannerProps {
  onOpenSyncCenter?: () => void;
}

export const OfflineSyncBanner: React.FC<OfflineSyncBannerProps> = ({ onOpenSyncCenter }) => {
  const [isOnline, setIsOnline] = useState<boolean>(storageService.isOnline());
  const [isSyncing, setIsSyncing] = useState<boolean>(storageService.isSyncing());
  const [pendingCount, setPendingCount] = useState<number>(storageService.getPendingSyncCount());
  const [showRecentlySynced, setShowRecentlySynced] = useState<boolean>(false);

  useEffect(() => {
    const unsubNet = storageService.onNetworkChange((online) => {
      setIsOnline(online);
      setPendingCount(storageService.getPendingSyncCount());
    });

    const unsubSync = storageService.onSyncStatusChange((syncing) => {
      setIsSyncing(syncing);
      const newPending = storageService.getPendingSyncCount();
      setPendingCount(newPending);
      if (!syncing && isOnline && newPending === 0) {
        setShowRecentlySynced(true);
        setTimeout(() => setShowRecentlySynced(false), 4000);
      }
    });

    // Check periodically
    const interval = setInterval(() => {
      setIsOnline(storageService.isOnline());
      setPendingCount(storageService.getPendingSyncCount());
    }, 5000);

    return () => {
      unsubNet();
      unsubSync();
      clearInterval(interval);
    };
  }, [isOnline]);

  if (isOnline && pendingCount === 0 && !isSyncing && !showRecentlySynced) {
    return null;
  }

  return (
    <div
      className={`w-full text-xs transition-all duration-300 ${
        !isOnline
          ? 'bg-[#F59E0B]/15 border-b border-[#F59E0B]/30 text-[#F59E0B]'
          : isSyncing
          ? 'bg-[#006B3C]/20 border-b border-[#00C46A]/30 text-[#00C46A]'
          : showRecentlySynced
          ? 'bg-[#006B3C]/20 border-b border-[#00C46A]/30 text-[#00C46A]'
          : 'bg-[#122010] border-b border-[#243447] text-[#8899AA]'
      }`}
    >
      <div className="max-w-7xl mx-auto px-4 sm:px-6 lg:px-8 py-2 flex items-center justify-between gap-3">
        <div className="flex items-center gap-2 font-medium">
          {!isOnline ? (
            <>
              <WifiOff className="w-4 h-4 shrink-0 text-[#F59E0B]" />
              <span>
                <strong>Offline Mode Active:</strong> Field orders and reports are cached locally on this device. They will automatically sync to cloud once connection is restored.
                {pendingCount > 0 && ` (${pendingCount} pending record${pendingCount > 1 ? 's' : ''})`}
              </span>
            </>
          ) : isSyncing ? (
            <>
              <RefreshCw className="w-4 h-4 shrink-0 text-[#00C46A] animate-spin" />
              <span>
                <strong>Syncing:</strong> Uploading {pendingCount} locally cached field record{pendingCount > 1 ? 's' : ''} to central cloud database...
              </span>
            </>
          ) : showRecentlySynced ? (
            <>
              <CheckCircle2 className="w-4 h-4 shrink-0 text-[#00C46A]" />
              <span>
                <strong>All Synced:</strong> Field data synchronized with cloud database successfully.
              </span>
            </>
          ) : (
            <>
              <RefreshCw className="w-4 h-4 shrink-0 text-[#8899AA]" />
              <span>
                {pendingCount} item{pendingCount > 1 ? 's' : ''} stored locally in queue.
              </span>
            </>
          )}
        </div>

        {onOpenSyncCenter && (
          <button
            onClick={onOpenSyncCenter}
            className="shrink-0 flex items-center gap-1 font-semibold underline hover:opacity-80 transition-opacity text-xs"
          >
            <span>Sync Center</span>
            <ChevronRight className="w-3.5 h-3.5" />
          </button>
        )}
      </div>
    </div>
  );
};
