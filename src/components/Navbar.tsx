import React, { useState, useEffect } from 'react';
import { useAuth } from '../context/AuthContext';
import { useLanguage } from '../context/LanguageContext';
import { storageService } from '../services/storage';
import { Wifi, WifiOff, Bell, RefreshCw, ChevronDown, CheckCircle2, User, ShieldAlert } from 'lucide-react';
import { UserRole } from '../types';
import { SupabaseStatusModal } from './SupabaseStatusModal';
import { OfflineSyncModal } from './OfflineSyncModal';
import { ThemeToggle } from './ThemeToggle';
import { LanguageSelector } from './LanguageSelector';

interface NavbarProps {
  currentView: string;
  onNavigate: (view: string) => void;
}

export const Navbar: React.FC<NavbarProps> = ({ currentView, onNavigate }) => {
  const { user, role, setRole, logout } = useAuth();
  const { isSwahili } = useLanguage();
  const [isOnline, setIsOnline] = useState<boolean>(storageService.isOnline());
  const [pendingCount, setPendingCount] = useState<number>(storageService.getPendingSyncCount());
  const [isSyncing, setIsSyncing] = useState<boolean>(storageService.isSyncing());
  const [showNotifMenu, setShowNotifMenu] = useState<boolean>(false);
  const [showDbModal, setShowDbModal] = useState<boolean>(false);
  const [showSyncModal, setShowSyncModal] = useState<boolean>(false);
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

  const getRoleBadge = (r: UserRole) => {
    switch (r) {
      case 'manager':
        return { label: 'Manager', bg: 'bg-purple-900/60 text-purple-300 border-purple-500/40' };
      case 'supervisor':
        return { label: 'Supervisor', bg: 'bg-blue-900/60 text-blue-300 border-blue-500/40' };
      case 'dispatcher':
        return { label: 'Dispatcher', bg: 'bg-amber-900/60 text-amber-300 border-amber-500/40' };
      default:
        return { label: 'Field Staff', bg: 'bg-[#006B3C]/40 text-[#00C46A] border-[#00C46A]/40' };
    }
  };

  const roleInfo = getRoleBadge(role);

  return (
    <header className="sticky top-0 z-40 w-full bg-[#0A1A0F]/90 backdrop-blur-md border-b border-[#243447]">
      <div className="max-w-7xl mx-auto px-4 sm:px-6 lg:px-8 h-16 flex items-center justify-between gap-2">
        {/* Left: Brand & View Name */}
        <div className="flex items-center gap-3 cursor-pointer" onClick={() => onNavigate('home')}>
          <img
            src="/assets/images/Picture1-1789308473747.png"
            alt="Zamzam Logo"
            className="h-10 w-auto object-contain rounded-md"
            onError={(e) => {
              // fallback if asset fails
              (e.target as HTMLElement).style.display = 'none';
            }}
          />
          <div>
            <div className="flex items-center gap-2">
              <span className="font-bold text-white tracking-wider text-base sm:text-lg">ZAMZAM</span>
              <span className="text-xs font-semibold text-[#00C46A] bg-[#006B3C]/40 px-2 py-0.5 rounded border border-[#00C46A]/30">
                {isSwahili ? 'UWANDANI' : 'FIELD'}
              </span>
            </div>
            <div className="text-xs text-[#8899AA] hidden sm:block">
              {isSwahili ? 'Uendeshaji na Usambazaji wa Maji' : 'Operations & Delivery Dispatch'}
            </div>
          </div>
        </div>

        {/* Right Controls */}
        <div className="flex items-center gap-2 sm:gap-3">
          {/* Sync Status Badge & Action */}
          <div
            onClick={() => setShowSyncModal(true)}
            className="flex items-center gap-1.5 bg-[#122010] hover:bg-[#1A2E1C] border border-[#3A5068] px-2.5 py-1.5 rounded-full text-xs cursor-pointer transition-colors"
            title="Open Offline Persistence & Sync Center"
          >
            {isOnline ? (
              <span className="flex items-center gap-1 text-[#00C46A]">
                <Wifi className="w-3.5 h-3.5" />
                <span className="hidden md:inline font-medium">{isSwahili ? 'Mtandaoni' : 'Online'}</span>
              </span>
            ) : (
              <span className="flex items-center gap-1 text-[#F59E0B]">
                <WifiOff className="w-3.5 h-3.5" />
                <span className="hidden md:inline font-medium">{isSwahili ? 'Nje ya Mtandao' : 'Offline'}</span>
              </span>
            )}

            {pendingCount > 0 && (
              <span className="bg-[#F59E0B]/20 text-[#F59E0B] font-semibold px-1.5 py-0.5 rounded text-[10px]">
                {pendingCount} {isSwahili ? 'zinazosubiri' : 'pending'}
              </span>
            )}

            <button
              onClick={handleManualSync}
              disabled={isSyncing}
              title="Force Sync Now"
              className="text-[#8899AA] hover:text-[#00C46A] transition-colors ml-0.5 p-0.5 rounded focus:outline-none"
            >
              <RefreshCw className={`w-3.5 h-3.5 ${isSyncing ? 'animate-spin text-[#00C46A]' : ''}`} />
            </button>
          </div>

          {/* High-Contrast Outdoor Sunlight / Dark Mode Toggle */}
          <ThemeToggle variant="navbar" />

          {syncFeedback && (
            <div className="hidden lg:flex items-center gap-1 text-xs text-[#00C46A] animate-fade-in">
              <CheckCircle2 className="w-3.5 h-3.5" />
              <span>{syncFeedback}</span>
            </div>
          )}

          {/* Language Selection Button (EN with UK Flag, SW with Tanzania Flag) */}
          <LanguageSelector />

          {/* Notifications Icon with dropdown */}
          <div className="relative">
            <button
              onClick={() => setShowNotifMenu(!showNotifMenu)}
              className="p-2 rounded-lg text-[#8899AA] hover:text-white hover:bg-[#122010] border border-transparent hover:border-[#3A5068] transition-colors relative"
            >
              <Bell className="w-4 h-4" />
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

          {/* User Profile Avatar & Role */}
          <button
            onClick={() => onNavigate('account')}
            className="flex items-center gap-2 p-1 rounded-lg hover:bg-[#122010] border border-transparent hover:border-[#3A5068] transition-colors"
            title={`Account Management - ${roleInfo.label}`}
          >
            <div className="w-8 h-8 rounded-full bg-[#006B3C] border border-[#00C46A]/50 flex items-center justify-center font-bold text-white text-xs">
              {user?.name.slice(0, 2).toUpperCase() || 'ZZ'}
            </div>
            <span className={`hidden xl:inline text-[10px] font-semibold px-2 py-0.5 rounded border ${roleInfo.bg}`}>
              {roleInfo.label}
            </span>
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
    </header>
  );
};
