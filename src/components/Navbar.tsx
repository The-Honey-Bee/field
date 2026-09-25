import React, { useState, useEffect } from 'react';
import { useAuth } from '../context/AuthContext';
import { useLanguage } from '../context/LanguageContext';
import { storageService } from '../services/storage';
import { Bell, Menu } from 'lucide-react';
import { SupabaseStatusModal } from './SupabaseStatusModal';
import { OfflineSyncModal } from './OfflineSyncModal';
import { SidebarMenu } from './SidebarMenu';

interface NavbarProps {
  currentView: string;
  onNavigate: (view: string) => void;
}

export const Navbar: React.FC<NavbarProps> = ({ currentView, onNavigate }) => {
  const { user } = useAuth();
  const { isSwahili } = useLanguage();
  const [isOnline, setIsOnline] = useState<boolean>(storageService.isOnline());
  const [pendingCount, setPendingCount] = useState<number>(storageService.getPendingSyncCount());
  const [isSyncing, setIsSyncing] = useState<boolean>(storageService.isSyncing());
  const [showNotifMenu, setShowNotifMenu] = useState<boolean>(false);
  const [showDbModal, setShowDbModal] = useState<boolean>(false);
  const [showSyncModal, setShowSyncModal] = useState<boolean>(false);
  const [showSidebar, setShowSidebar] = useState<boolean>(false);
  const [syncFeedback, setSyncFeedback] = useState<string | null>(null);

  useEffect(() => {
    const unsubNet = storageService.onNetworkChange((online) => {
      setIsOnline(online);
      setPendingCount(storageService.getPendingSyncCount());
    });
    const unsubSync = storageService.onSyncStatusChange((syncing) => {
      setIsSyncing(syncing);
      setPendingCount(storageService.getPendingSyncCount());
    });
    return () => {
      unsubNet();
      unsubSync();
    };
  }, []);

  const handleManualSync = async (e?: React.MouseEvent) => {
    if (e) e.stopPropagation();
    if (isSyncing) return;
    try {
      const res = await storageService.forceSyncAll();
      setPendingCount(storageService.getPendingSyncCount());
      if (res.success) {
        setSyncFeedback(res.total > 0 ? `Synced ${res.total} record(s)` : 'All records up to date');
      } else {
        setSyncFeedback(res.error || 'Sync deferred locally');
      }
      setTimeout(() => setSyncFeedback(null), 3000);
    } catch {
      setSyncFeedback('Sync saved locally');
      setTimeout(() => setSyncFeedback(null), 3000);
    }
  };

  return (
    <header className={`sticky top-0 ${showSidebar ? 'z-[100]' : 'z-40'} w-full bg-[#0A1A0F]/90 backdrop-blur-md border-b border-[#243447]`}>
      <div className="max-w-7xl mx-auto px-3 sm:px-6 lg:px-8 h-16 flex items-center justify-between gap-2 sm:gap-4">
        {/* Left: Brand & View Name */}
        <div className="flex items-center gap-2.5 sm:gap-3 cursor-pointer min-w-0 shrink" onClick={() => onNavigate('home')}>
          <img
            src="/assets/images/Picture1-1789308473747.png"
            alt="Zamzam Logo"
            className="h-9 sm:h-10 w-auto object-contain rounded-md shrink-0"
            onError={(e) => {
              // fallback if asset fails
              (e.target as HTMLElement).style.display = 'none';
            }}
          />
          <div className="min-w-0">
            <div className="flex items-center gap-1.5 sm:gap-2">
              <span className="font-bold text-white tracking-wider text-base sm:text-lg shrink-0">ZAMZAM</span>
              <span className="text-xs font-semibold text-[#00C46A] bg-[#006B3C]/40 px-2 py-0.5 rounded border border-[#00C46A]/30 shrink-0">
                {isSwahili ? 'UWANDANI' : 'FIELD'}
              </span>
            </div>
            <div className="text-xs text-[#8899AA] hidden md:block truncate">
              {isSwahili ? 'Uendeshaji na Usambazaji wa Maji' : 'Operations & Delivery Dispatch'}
            </div>
          </div>
        </div>

        {/* Right Controls - Streamlined with Notifications & Sidebar Menu */}
        <div className="flex items-center gap-2 sm:gap-3 shrink-0 flex-nowrap min-w-0">
          {/* Notifications Icon with dropdown */}
          <div className="relative shrink-0">
            <button
              onClick={() => setShowNotifMenu(!showNotifMenu)}
              className="p-2 rounded-lg text-[#8899AA] hover:text-white hover:bg-[#122010] border border-[#243447] hover:border-[#3A5068] transition-colors relative shrink-0 flex items-center justify-center cursor-pointer"
              title="Notifications"
            >
              <Bell className="w-4 h-4 shrink-0" />
              <span className="absolute top-1.5 right-1.5 w-2 h-2 bg-[#00C46A] rounded-full ring-2 ring-[#0A1A0F]"></span>
            </button>

            {showNotifMenu && (
              <>
                <div className="fixed inset-0 z-40" onClick={() => setShowNotifMenu(false)} />
                <div className="absolute right-0 mt-2 w-72 sm:w-80 bg-[#122010] border border-[#3A5068] rounded-xl shadow-2xl z-50 p-3 text-xs animate-in fade-in">
                  <div className="flex items-center justify-between border-b border-[#243447] pb-2 mb-2 font-semibold text-white">
                    <span>Notifications</span>
                    <span className="text-[10px] bg-[#006B3C]/50 text-[#00C46A] px-2 py-0.5 rounded">2 New</span>
                  </div>
                  <div className="space-y-2 max-h-64 overflow-y-auto">
                    <div className="p-2 bg-[#1A2E1C] rounded-lg border border-[#2A5038]">
                      <div className="font-semibold text-white">Route Priority Updated</div>
                      <div className="text-[11px] text-[#8899AA] mt-0.5">City Hypermarket requested extra stock before 14:00 closing.</div>
                      <div className="text-[10px] text-[#00C46A] mt-1">15 mins ago</div>
                    </div>
                    <div className="p-2 bg-[#1A2E1C] rounded-lg border border-[#2A5038]">
                      <div className="font-semibold text-white">Supervisor Approval</div>
                      <div className="text-[11px] text-[#8899AA] mt-0.5">Order #ord-1001 approved by Tariq Al-Mansoor.</div>
                      <div className="text-[10px] text-[#00C46A] mt-1">1 hour ago</div>
                    </div>
                  </div>
                </div>
              </>
            )}
          </div>

          {/* Sidebar Menu Drawer Toggle Button */}
          <button
            type="button"
            id="btn-open-sidebar-menu"
            onClick={() => setShowSidebar(true)}
            className="flex items-center gap-2 sm:gap-2.5 bg-[#122010] hover:bg-[#1A2E1C] border border-[#3A5068] hover:border-[#00C46A] px-2.5 sm:px-3.5 py-1.5 rounded-xl text-xs font-semibold text-white transition-all shadow-xs shrink-0 whitespace-nowrap group cursor-pointer"
            title="Open Menu (Profile, Connectivity & Sync, Sunlight Mode, Language & Settings)"
            aria-label="Open Sidebar Menu"
          >
            <div className="w-6 h-6 rounded-full bg-[#006B3C] border border-[#00C46A]/60 flex items-center justify-center font-bold text-white text-[11px] shrink-0 group-hover:scale-105 transition-transform">
              {user?.name.slice(0, 2).toUpperCase() || 'ZZ'}
            </div>
            <div className="flex items-center gap-1.5">
              <Menu className="w-4 h-4 text-[#00C46A] group-hover:scale-110 transition-transform shrink-0" />
              <span className="font-bold tracking-wide">{isSwahili ? 'Menyu' : 'Menu'}</span>
            </div>
            <span
              className={`w-2 h-2 rounded-full shrink-0 ${isOnline ? 'bg-[#00C46A]' : 'bg-[#F59E0B] animate-pulse'}`}
              title={isOnline ? 'Online' : 'Offline'}
            />
          </button>
        </div>
      </div>

      {/* Supabase Cloud Diagnostic Modal */}
      <SupabaseStatusModal
        isOpen={showDbModal}
        onClose={() => setShowDbModal(false)}
      />

      {/* Offline Persistence & Sync Center Modal */}
      <OfflineSyncModal
        isOpen={showSyncModal}
        onClose={() => setShowSyncModal(false)}
      />

      {/* Sidebar Menu Drawer */}
      <SidebarMenu
        isOpen={showSidebar}
        onClose={() => setShowSidebar(false)}
        isOnline={isOnline}
        pendingCount={pendingCount}
        isSyncing={isSyncing}
        onManualSync={handleManualSync}
        syncFeedback={syncFeedback}
        onOpenSyncModal={() => setShowSyncModal(true)}
        onOpenDbModal={() => setShowDbModal(true)}
        onNavigate={onNavigate}
      />
    </header>
  );
};
