import React, { useState, useEffect } from 'react';
import {
  Wifi,
  WifiOff,
  RefreshCw,
  X,
  Database,
  CheckCircle2,
  Clock,
  HardDrive,
  FileText,
  Users,
  ShoppingCart,
  ShieldCheck,
  AlertTriangle,
} from 'lucide-react';
import { storageService } from '../services/storage';
import { offlineDb, OfflineSyncQueueItem } from '../services/offlineDb';
import { getServiceWorkerStatus } from '../services/serviceWorkerRegistration';

interface OfflineSyncModalProps {
  isOpen: boolean;
  onClose: () => void;
}

export const OfflineSyncModal: React.FC<OfflineSyncModalProps> = ({ isOpen, onClose }) => {
  const [isOnline, setIsOnline] = useState<boolean>(storageService.isOnline());
  const [isSyncing, setIsSyncing] = useState<boolean>(storageService.isSyncing());
  const [pendingDetails, setPendingDetails] = useState(storageService.getPendingSyncDetails());
  const [queueItems, setQueueItems] = useState<OfflineSyncQueueItem[]>([]);
  const [storageStats, setStorageStats] = useState<{ usageMB: number; quotaMB: number; percentUsed: number }>({
    usageMB: 1.2,
    quotaMB: 50,
    percentUsed: 2,
  });
  const [feedback, setFeedback] = useState<string | null>(null);
  const [isCheckingPing, setIsCheckingPing] = useState<boolean>(false);

  const refreshData = async () => {
    setIsOnline(storageService.isOnline());
    setPendingDetails(storageService.getPendingSyncDetails());
    try {
      const q = await offlineDb.getQueue();
      setQueueItems(q);
      const est = await offlineDb.getStorageEstimate();
      setStorageStats(est);
    } catch {
      // ignore
    }
  };

  useEffect(() => {
    if (!isOpen) return;
    refreshData();

    const unsubNet = storageService.onNetworkChange((online) => {
      setIsOnline(online);
      refreshData();
    });

    const unsubSync = storageService.onSyncStatusChange((syncing) => {
      setIsSyncing(syncing);
      refreshData();
    });

    return () => {
      unsubNet();
      unsubSync();
    };
  }, [isOpen]);

  if (!isOpen) return null;

  const handleManualSync = async () => {
    setIsSyncing(true);
    setFeedback(null);
    try {
      const res = await storageService.forceSyncAll();
      if (res.success) {
        setFeedback(`Successfully synced ${res.total} record(s) to central cloud!`);
      } else {
        setFeedback(res.error || 'Sync failed. Connection unavailable.');
      }
      await refreshData();
    } catch (err: any) {
      setFeedback(err?.message || 'Sync error occurred.');
    } finally {
      setIsSyncing(false);
      setTimeout(() => setFeedback(null), 4000);
    }
  };

  const handleTestPing = async () => {
    setIsCheckingPing(true);
    const online = await storageService.checkConnectivity();
    setIsOnline(online);
    setIsCheckingPing(false);
    setFeedback(online ? 'Real-time internet connection confirmed.' : 'No internet response. Offline cache active.');
    setTimeout(() => setFeedback(null), 3000);
  };

  const swStatus = getServiceWorkerStatus();
  const lastSyncFormatted = pendingDetails.lastSyncTime
    ? new Date(pendingDetails.lastSyncTime).toLocaleTimeString([], { hour: '2-digit', minute: '2-digit', second: '2-digit' })
    : 'Never';

  return (
    <div className="fixed inset-0 z-50 flex items-center justify-center p-4 bg-black/75 backdrop-blur-sm animate-fade-in">
      <div
        className="w-full max-w-xl bg-[#0A1A0F] border border-[#243447] rounded-xl shadow-2xl overflow-hidden text-[#D0E8F0] flex flex-col max-h-[90vh]"
        onClick={(e) => e.stopPropagation()}
      >
        {/* Header */}
        <div className="p-4 sm:p-5 border-b border-[#243447] bg-[#122010] flex items-center justify-between">
          <div className="flex items-center gap-3">
            <div className={`p-2.5 rounded-lg border ${isOnline ? 'bg-[#006B3C]/30 border-[#00C46A]/40 text-[#00C46A]' : 'bg-[#F59E0B]/20 border-[#F59E0B]/40 text-[#F59E0B]'}`}>
              {isOnline ? <Wifi className="w-5 h-5" /> : <WifiOff className="w-5 h-5" />}
            </div>
            <div>
              <h3 className="font-bold text-white text-base sm:text-lg flex items-center gap-2">
                Offline Persistence & Sync Center
              </h3>
              <p className="text-xs text-[#8899AA]">
                Local IndexedDB state caching with auto-reconnection synchronization
              </p>
            </div>
          </div>
          <button
            onClick={onClose}
            className="p-1.5 rounded-lg text-[#8899AA] hover:text-white hover:bg-[#1A2E1C] transition-colors"
          >
            <X className="w-5 h-5" />
          </button>
        </div>

        {/* Content Body */}
        <div className="p-4 sm:p-5 space-y-4 overflow-y-auto flex-1 text-sm">
          {/* Status Row */}
          <div className="grid grid-cols-2 sm:grid-cols-4 gap-2.5">
            <div className="bg-[#122010] border border-[#243447] p-3 rounded-lg text-center">
              <div className="text-[11px] text-[#8899AA] uppercase font-semibold">Connection</div>
              <div className="mt-1 font-bold text-xs flex items-center justify-center gap-1">
                {isOnline ? (
                  <span className="text-[#00C46A] flex items-center gap-1">
                    <span className="w-2 h-2 rounded-full bg-[#00C46A] animate-pulse"></span>
                    Online
                  </span>
                ) : (
                  <span className="text-[#F59E0B] flex items-center gap-1">
                    <span className="w-2 h-2 rounded-full bg-[#F59E0B]"></span>
                    Offline
                  </span>
                )}
              </div>
            </div>

            <div className="bg-[#122010] border border-[#243447] p-3 rounded-lg text-center">
              <div className="text-[11px] text-[#8899AA] uppercase font-semibold">Service Worker</div>
              <div className="mt-1 font-bold text-xs flex items-center justify-center gap-1 text-[#00C46A]">
                <ShieldCheck className="w-3.5 h-3.5" />
                <span>{swStatus.active ? 'Active (PWA)' : 'Standby'}</span>
              </div>
            </div>

            <div className="bg-[#122010] border border-[#243447] p-3 rounded-lg text-center">
              <div className="text-[11px] text-[#8899AA] uppercase font-semibold">Pending Queue</div>
              <div className="mt-1 font-bold text-xs text-[#F59E0B]">
                {pendingDetails.totalPending} item(s)
              </div>
            </div>

            <div className="bg-[#122010] border border-[#243447] p-3 rounded-lg text-center">
              <div className="text-[11px] text-[#8899AA] uppercase font-semibold">Last Cloud Sync</div>
              <div className="mt-1 font-bold text-xs text-white flex items-center justify-center gap-1">
                <Clock className="w-3.5 h-3.5 text-[#8899AA]" />
                <span>{lastSyncFormatted}</span>
              </div>
            </div>
          </div>

          {/* Offline Protection Notice */}
          <div className="bg-[#122010] border border-[#243447] p-3.5 rounded-lg flex items-start gap-3">
            <HardDrive className="w-5 h-5 text-[#00C46A] shrink-0 mt-0.5" />
            <div className="text-xs text-[#8899AA] leading-relaxed">
              <span className="text-white font-semibold">Field Protection Guarantee: </span>
              All delivery orders, customer registrations, cash collections, and end-of-day reports are immediately saved to durable local storage (IndexedDB & Service Worker cache). When signal drops in deep field areas, you can continue working without interruptions. Everything syncs to cloud automatically once connection is re-established.
            </div>
          </div>

          {/* Pending Items Breakdown */}
          <div className="space-y-2">
            <div className="flex items-center justify-between text-xs font-semibold text-[#8899AA]">
              <span>QUEUE BREAKDOWN</span>
              <span>{pendingDetails.totalPending} Unsynced Records</span>
            </div>

            <div className="grid grid-cols-3 gap-2">
              <div className="bg-[#122010] border border-[#243447] p-3 rounded-lg flex items-center gap-2.5">
                <ShoppingCart className="w-4 h-4 text-[#00C46A]" />
                <div>
                  <div className="font-bold text-white text-xs">{pendingDetails.pendingOrders.length}</div>
                  <div className="text-[10px] text-[#8899AA]">Orders</div>
                </div>
              </div>

              <div className="bg-[#122010] border border-[#243447] p-3 rounded-lg flex items-center gap-2.5">
                <Users className="w-4 h-4 text-blue-400" />
                <div>
                  <div className="font-bold text-white text-xs">{pendingDetails.pendingCustomers.length}</div>
                  <div className="text-[10px] text-[#8899AA]">Clients</div>
                </div>
              </div>

              <div className="bg-[#122010] border border-[#243447] p-3 rounded-lg flex items-center gap-2.5">
                <FileText className="w-4 h-4 text-purple-400" />
                <div>
                  <div className="font-bold text-white text-xs">{pendingDetails.pendingReports.length}</div>
                  <div className="text-[10px] text-[#8899AA]">EOD Reports</div>
                </div>
              </div>
            </div>
          </div>

          {/* Detailed Queue List */}
          {pendingDetails.totalPending > 0 ? (
            <div className="space-y-2">
              <div className="text-xs font-semibold text-[#8899AA]">PENDING RECORDS IN LOCAL BUFFER</div>
              <div className="space-y-1.5 max-h-40 overflow-y-auto pr-1">
                {pendingDetails.pendingOrders.map((ord) => (
                  <div key={ord.id} className="bg-[#122010] border border-[#243447] p-2.5 rounded-lg flex items-center justify-between text-xs">
                    <div className="flex items-center gap-2">
                      <span className="w-2 h-2 rounded-full bg-[#F59E0B]"></span>
                      <span className="font-medium text-white">{ord.customerName}</span>
                      <span className="text-[#8899AA] text-[11px]">TZS {ord.subtotal.toLocaleString()}</span>
                    </div>
                    <span className="text-[10px] bg-[#F59E0B]/20 text-[#F59E0B] px-1.5 py-0.5 rounded font-medium">
                      Order Waiting
                    </span>
                  </div>
                ))}
                {pendingDetails.pendingCustomers.map((c) => (
                  <div key={c.id} className="bg-[#122010] border border-[#243447] p-2.5 rounded-lg flex items-center justify-between text-xs">
                    <div className="flex items-center gap-2">
                      <span className="w-2 h-2 rounded-full bg-blue-400"></span>
                      <span className="font-medium text-white">{c.name}</span>
                      <span className="text-[#8899AA] text-[11px]">{c.phone}</span>
                    </div>
                    <span className="text-[10px] bg-blue-500/20 text-blue-300 px-1.5 py-0.5 rounded font-medium">
                      Customer Reg
                    </span>
                  </div>
                ))}
                {pendingDetails.pendingReports.map((r) => (
                  <div key={r.id} className="bg-[#122010] border border-[#243447] p-2.5 rounded-lg flex items-center justify-between text-xs">
                    <div className="flex items-center gap-2">
                      <span className="w-2 h-2 rounded-full bg-purple-400"></span>
                      <span className="font-medium text-white">EOD Report</span>
                      <span className="text-[#8899AA] text-[11px]">{r.totalDeliveries} deliveries</span>
                    </div>
                    <span className="text-[10px] bg-purple-500/20 text-purple-300 px-1.5 py-0.5 rounded font-medium">
                      Report Waiting
                    </span>
                  </div>
                ))}
              </div>
            </div>
          ) : (
            <div className="bg-[#122010] border border-[#243447] p-4 rounded-lg text-center space-y-1">
              <CheckCircle2 className="w-6 h-6 text-[#00C46A] mx-auto" />
              <div className="font-medium text-white text-xs">All Field Data Is Fully Synchronized</div>
              <div className="text-[11px] text-[#8899AA]">No pending orders or reports stored locally waiting for upload.</div>
            </div>
          )}

          {/* Feedback banner */}
          {feedback && (
            <div className="bg-[#006B3C]/20 border border-[#00C46A]/40 text-[#00C46A] p-2.5 rounded-lg text-xs flex items-center gap-2 animate-fade-in">
              <CheckCircle2 className="w-4 h-4 shrink-0" />
              <span>{feedback}</span>
            </div>
          )}
        </div>

        {/* Footer Actions */}
        <div className="p-4 sm:p-5 border-t border-[#243447] bg-[#122010] flex items-center justify-between gap-3">
          <button
            onClick={handleTestPing}
            disabled={isCheckingPing}
            className="px-3 py-2 rounded-lg border border-[#3A5068] text-xs font-semibold text-[#8899AA] hover:text-white hover:bg-[#1A2E1C] transition-colors flex items-center gap-1.5"
          >
            <RefreshCw className={`w-3.5 h-3.5 ${isCheckingPing ? 'animate-spin' : ''}`} />
            <span>Check Connectivity</span>
          </button>

          <div className="flex items-center gap-2">
            <button
              onClick={onClose}
              className="px-3 py-2 rounded-lg border border-[#3A5068] text-xs font-semibold text-[#8899AA] hover:text-white hover:bg-[#1A2E1C] transition-colors"
            >
              Close
            </button>
            <button
              onClick={handleManualSync}
              disabled={isSyncing}
              className="px-4 py-2 rounded-lg bg-[#00C46A] text-[#0A1A0F] font-bold text-xs hover:bg-[#00E57D] transition-all flex items-center gap-2 shadow-md shadow-[#00C46A]/20 disabled:opacity-50"
            >
              <RefreshCw className={`w-3.5 h-3.5 ${isSyncing ? 'animate-spin' : ''}`} />
              <span>{isSyncing ? 'Syncing...' : 'Sync Now'}</span>
            </button>
          </div>
        </div>
      </div>
    </div>
  );
};
