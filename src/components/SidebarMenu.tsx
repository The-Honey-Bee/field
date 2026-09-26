import React, { useState, useEffect } from 'react';
import { createPortal } from 'react-dom';
import { useAuth } from '../context/AuthContext';
import { useLanguage } from '../context/LanguageContext';
import { useTheme } from '../context/ThemeContext';
import { UKFlag, TanzaniaFlag } from './FlagIcons';
import {
  X,
  Wifi,
  WifiOff,
  RefreshCw,
  Sun,
  Moon,
  Bell,
  User,
  Shield,
  LogOut,
  CheckCircle2,
  Database,
  ExternalLink,
  ChevronRight,
  Layers,
  FileText,
  MessageSquare,
  Users,
  Clock,
  Home
} from 'lucide-react';
import { UserRole } from '../types';

interface SidebarMenuProps {
  isOpen: boolean;
  onClose: () => void;
  isOnline: boolean;
  pendingCount: number;
  isSyncing: boolean;
  onManualSync: (e?: React.MouseEvent) => void;
  syncFeedback: string | null;
  onOpenSyncModal: () => void;
  onOpenDbModal: () => void;
  onNavigate: (view: string) => void;
}

export const SidebarMenu: React.FC<SidebarMenuProps> = ({
  isOpen,
  onClose,
  isOnline,
  pendingCount,
  isSyncing,
  onManualSync,
  syncFeedback,
  onOpenSyncModal,
  onOpenDbModal,
  onNavigate,
}) => {
  const { user, role, setRole, logout } = useAuth();
  const { language, setLanguage, isSwahili } = useLanguage();
  const { theme, isSunlight, setTheme, toggleTheme } = useTheme();

  // Close on Escape key
  useEffect(() => {
    const handleKeyDown = (e: KeyboardEvent) => {
      if (e.key === 'Escape' && isOpen) {
        onClose();
      }
    };
    window.addEventListener('keydown', handleKeyDown);
    return () => window.removeEventListener('keydown', handleKeyDown);
  }, [isOpen, onClose]);

  // Lock body scroll when drawer is open
  useEffect(() => {
    if (isOpen) {
      document.body.style.overflow = 'hidden';
    } else {
      document.body.style.overflow = '';
    }
    return () => {
      document.body.style.overflow = '';
    };
  }, [isOpen]);

  const [mounted, setMounted] = useState(false);
  useEffect(() => {
    setMounted(true);
  }, []);

  if (!isOpen || !mounted || typeof document === 'undefined') return null;

  const getRoleBadge = (r: UserRole) => {
    switch (r) {
      case 'manager':
        return { label: isSwahili ? 'Meneja' : 'Manager', bg: 'bg-purple-900/60 text-purple-300 border-purple-500/40' };
      case 'supervisor':
        return { label: isSwahili ? 'Msimamizi' : 'Supervisor', bg: 'bg-blue-900/60 text-blue-300 border-blue-500/40' };
      case 'dispatcher':
        return { label: isSwahili ? 'Mrudishi' : 'Dispatcher', bg: 'bg-amber-900/60 text-amber-300 border-amber-500/40' };
      default:
        return { label: isSwahili ? 'Afisa Uwandani' : 'Field Staff', bg: 'bg-[#006B3C]/50 text-[#00C46A] border-[#00C46A]/40' };
    }
  };

  const roleInfo = getRoleBadge(role);

  const handleNavClick = (view: string) => {
    onNavigate(view);
    onClose();
  };

  return createPortal(
    <div
      className="fixed inset-0 overflow-hidden"
      id="zamzam-sidebar-menu-portal"
      style={{
        position: 'fixed',
        top: 0,
        left: 0,
        right: 0,
        bottom: 0,
        width: '100vw',
        height: '100vh',
        zIndex: 2147483647,
        pointerEvents: 'auto',
      }}
    >
      {/* Dimmed backdrop covering full viewport */}
      <div
        className="fixed inset-0 bg-black/80 backdrop-enter cursor-pointer"
        style={{
          position: 'fixed',
          top: 0,
          left: 0,
          right: 0,
          bottom: 0,
          backgroundColor: 'rgba(0, 0, 0, 0.75)',
          backdropFilter: 'blur(4px)',
          WebkitBackdropFilter: 'blur(4px)',
          zIndex: 2147483646,
        }}
        onClick={onClose}
        aria-hidden="true"
      />

      {/* Slide-out Sidebar Drawer */}
      <div
        style={{
          position: 'fixed',
          top: 0,
          bottom: 0,
          right: 0,
          width: '100%',
          maxWidth: '440px',
          height: '100vh',
          height: '100dvh',
          zIndex: 2147483647,
          display: 'flex',
          pointerEvents: 'auto',
        }}
      >
        <aside
          role="dialog"
          aria-label="Sidebar Menu"
          aria-modal="true"
          className="w-full h-full bg-[#0D1E12] border-l border-[#243447] text-[#D0E8F0] shadow-2xl flex flex-col justify-between select-none overflow-hidden relative sidebar-drawer-enter"
          style={{
            boxShadow: '-12px 0 50px rgba(0, 0, 0, 0.9)',
            transform: 'translateX(0)',
          }}
        >
          {/* Top Header - Brought to front over everything */}
          <div className="relative z-50 px-5 py-4 bg-[#0A1A0F] border-b border-[#243447] flex items-center justify-between shrink-0 shadow-lg shadow-black/50">
            <div className="flex items-center gap-2.5">
              <div className="w-8 h-8 rounded-lg bg-[#006B3C] border border-[#00C46A]/40 flex items-center justify-center font-bold text-white text-xs">
                ZZ
              </div>
              <div>
                <div className="font-bold text-white tracking-wider text-sm flex items-center gap-1.5">
                  <span>ZAMZAM</span>
                  <span className="text-[10px] font-semibold text-[#00C46A] bg-[#006B3C]/40 px-1.5 py-0.2 rounded border border-[#00C46A]/30">
                    {isSwahili ? 'MENYU' : 'MENU'}
                  </span>
                </div>
                <div className="text-[11px] text-[#8899AA]">
                  {isSwahili ? 'Vidhibiti na Mipangilio ya Haraka' : 'Quick Controls & Settings'}
                </div>
              </div>
            </div>

            <button
              type="button"
              onClick={onClose}
              className="p-2 rounded-lg text-[#8899AA] hover:text-white hover:bg-[#1A2E1C] border border-transparent hover:border-[#3A5068] transition-colors focus:outline-none"
              title="Close Menu (Esc)"
              aria-label="Close menu"
            >
              <X className="w-5 h-5" />
            </button>
          </div>

          {/* Scrollable Content Body */}
          <div className="flex-1 overflow-y-auto p-5 space-y-5 divide-y divide-[#1D2E22]">
            {/* 1. User Account Card */}
            <div className="space-y-3 pt-1">
              <div className="flex items-center justify-between">
                <span className="text-[11px] font-bold text-[#8899AA] uppercase tracking-wider">
                  {isSwahili ? 'Akaunti Yako' : 'Current Account'}
                </span>
                <span className={`text-[10px] font-semibold px-2 py-0.5 rounded border ${roleInfo.bg}`}>
                  {roleInfo.label}
                </span>
              </div>

              <div className="p-3.5 bg-[#122010] rounded-xl border border-[#2A4030] flex items-center gap-3">
                <div className="w-11 h-11 rounded-full bg-[#006B3C] border-2 border-[#00C46A]/60 flex items-center justify-center font-bold text-white text-sm shrink-0 shadow-sm">
                  {user?.name.slice(0, 2).toUpperCase() || 'ZZ'}
                </div>
                <div className="min-w-0 flex-1">
                  <div className="font-bold text-white text-sm truncate">{user?.name || 'Field Officer'}</div>
                  <div className="text-xs text-[#8899AA] truncate">{user?.email || 'staff@zamzam.tz'}</div>
                  <div className="text-[10px] text-[#00C46A] mt-0.5 flex items-center gap-1">
                    <span className="w-1.5 h-1.5 rounded-full bg-[#00C46A] inline-block animate-pulse"></span>
                    <span>Session Active</span>
                  </div>
                </div>
                <button
                  type="button"
                  onClick={() => handleNavClick('account')}
                  className="px-2.5 py-1.5 rounded-lg bg-[#1A2E1C] hover:bg-[#254228] border border-[#3A5068] hover:border-[#00C46A] text-xs font-semibold text-white transition-colors shrink-0"
                >
                  {isSwahili ? 'Dhibiti' : 'Manage'}
                </button>
              </div>
            </div>

            {/* 2. Network & Offline Sync Controls */}
            <div className="space-y-3 pt-5">
              <div className="flex items-center justify-between">
                <span className="text-[11px] font-bold text-[#8899AA] uppercase tracking-wider flex items-center gap-1.5">
                  <Wifi className="w-3.5 h-3.5 text-[#00C46A]" />
                  <span>{isSwahili ? 'Mtandao na Usawazishaji' : 'Connectivity & Offline Sync'}</span>
                </span>
                <span className={`text-xs font-bold px-2 py-0.5 rounded-full flex items-center gap-1 ${
                  isOnline ? 'bg-[#006B3C]/40 text-[#00C46A] border border-[#00C46A]/30' : 'bg-amber-950/60 text-amber-400 border border-amber-600/40'
                }`}>
                  <span className={`w-2 h-2 rounded-full ${isOnline ? 'bg-[#00C46A]' : 'bg-amber-400 animate-ping'}`} />
                  {isOnline ? (isSwahili ? 'Mtandaoni' : 'Online') : (isSwahili ? 'Nje ya Mtandao' : 'Offline')}
                </span>
              </div>

              <div className="p-3.5 bg-[#122010] rounded-xl border border-[#2A4030] space-y-3">
                <div className="flex items-center justify-between text-xs">
                  <span className="text-[#8899AA]">{isSwahili ? 'Rekodi zinazosubiri:' : 'Pending Sync Queue:'}</span>
                  <span className={`font-bold px-2 py-0.5 rounded text-xs ${
                    pendingCount > 0 ? 'bg-amber-500/20 text-amber-400 border border-amber-500/40' : 'bg-[#006B3C]/30 text-[#00C46A]'
                  }`}>
                    {pendingCount} {isSwahili ? 'rekodi' : 'items'}
                  </span>
                </div>

                {syncFeedback && (
                  <div className="p-2 rounded-lg bg-[#1A2E1C] border border-[#00C46A]/40 text-xs text-[#00C46A] flex items-center gap-2 animate-in fade-in">
                    <CheckCircle2 className="w-4 h-4 shrink-0" />
                    <span>{syncFeedback}</span>
                  </div>
                )}

                <div className="grid grid-cols-2 gap-2 pt-1">
                  <button
                    type="button"
                    onClick={(e) => onManualSync(e)}
                    disabled={isSyncing}
                    className="flex items-center justify-center gap-2 py-2 px-3 rounded-lg bg-[#006B3C] hover:bg-[#00874C] disabled:opacity-50 text-white font-bold text-xs transition-colors shadow-xs"
                  >
                    <RefreshCw className={`w-3.5 h-3.5 ${isSyncing ? 'animate-spin' : ''}`} />
                    <span>{isSyncing ? (isSwahili ? 'Inasawazisha...' : 'Syncing...') : (isSwahili ? 'Sawazisha Sasa' : 'Sync Now')}</span>
                  </button>

                  <button
                    type="button"
                    onClick={() => {
                      onClose();
                      onOpenSyncModal();
                    }}
                    className="flex items-center justify-center gap-1.5 py-2 px-3 rounded-lg bg-[#1A2E1C] hover:bg-[#254228] border border-[#3A5068] hover:border-[#00C46A] text-white font-semibold text-xs transition-colors"
                  >
                    <span>{isSwahili ? 'Kituo cha Usawazishaji' : 'Sync Center'}</span>
                    <ExternalLink className="w-3 h-3 text-[#8899AA]" />
                  </button>
                </div>
              </div>
            </div>

            {/* 3. High-Contrast Outdoor Sunlight vs Dark Theme */}
            <div className="space-y-3 pt-5">
              <div className="flex items-center justify-between">
                <span className="text-[11px] font-bold text-[#8899AA] uppercase tracking-wider flex items-center gap-1.5">
                  <Sun className="w-3.5 h-3.5 text-amber-400" />
                  <span>{isSwahili ? 'Mwangaza na Mandhari' : 'Lighting & Display Theme'}</span>
                </span>
                <span className="text-[10px] text-[#8899AA]">
                  {isSunlight ? (isSwahili ? 'Mwangaza wa Jua' : 'Sunlight Mode') : (isSwahili ? 'Giza' : 'Dark Mode')}
                </span>
              </div>

              <div className="grid grid-cols-2 gap-2.5">
                {/* Dark Mode Option */}
                <button
                  type="button"
                  onClick={() => setTheme('dark')}
                  className={`p-3 rounded-xl border text-left transition-all flex flex-col justify-between ${
                    !isSunlight
                      ? 'bg-[#1A2E1C] border-[#00C46A] ring-1 ring-[#00C46A]/50 text-white shadow-xs'
                      : 'bg-[#122010] border-[#2A4030] text-[#8899AA] hover:text-white'
                  }`}
                >
                  <div className="flex items-center justify-between w-full">
                    <div className="p-1.5 rounded-lg bg-[#0A1A0F] border border-[#243447] text-[#00C46A]">
                      <Moon className="w-4 h-4" />
                    </div>
                    {!isSunlight && <span className="w-2 h-2 rounded-full bg-[#00C46A]"></span>}
                  </div>
                  <div className="mt-2">
                    <div className="text-xs font-bold">{isSwahili ? 'Hali ya Giza' : 'Dark Mode'}</div>
                    <div className="text-[10px] text-[#8899AA]">{isSwahili ? 'Maghala na Usiku' : 'Indoor & Night'}</div>
                  </div>
                </button>

                {/* High Contrast Sunlight Mode Option */}
                <button
                  type="button"
                  onClick={() => setTheme('sunlight')}
                  className={`p-3 rounded-xl border text-left transition-all flex flex-col justify-between ${
                    isSunlight
                      ? 'bg-[#1A2E1C] border-amber-400 ring-1 ring-amber-400/50 text-white shadow-xs'
                      : 'bg-[#122010] border-[#2A4030] text-[#8899AA] hover:text-white'
                  }`}
                >
                  <div className="flex items-center justify-between w-full">
                    <div className="p-1.5 rounded-lg bg-amber-500/20 border border-amber-500/40 text-amber-300">
                      <Sun className="w-4 h-4" />
                    </div>
                    {isSunlight && <span className="w-2 h-2 rounded-full bg-amber-400"></span>}
                  </div>
                  <div className="mt-2">
                    <div className="text-xs font-bold">{isSwahili ? 'Mwangaza wa Jua' : 'Sunlight Mode'}</div>
                    <div className="text-[10px] text-[#8899AA]">{isSwahili ? 'Mwangaza Mkali Uwandani' : 'Direct Sun & Glare'}</div>
                  </div>
                </button>
              </div>
            </div>

            {/* 4. Language Selector Controls */}
            <div className="space-y-3 pt-5">
              <div className="flex items-center justify-between">
                <span className="text-[11px] font-bold text-[#8899AA] uppercase tracking-wider flex items-center gap-1.5">
                  <span className="text-base leading-none">🌐</span>
                  <span>{isSwahili ? 'Lugha ya Mfumo' : 'App Language'}</span>
                </span>
                <span className="text-[10px] text-[#00C46A] font-bold">
                  {language === 'sw' ? 'Kiswahili' : 'English'}
                </span>
              </div>

              <div className="grid grid-cols-2 gap-2.5">
                {/* English Option */}
                <button
                  type="button"
                  onClick={() => setLanguage('en')}
                  className={`p-3 rounded-xl border flex items-center gap-2.5 text-left transition-all ${
                    language === 'en'
                      ? 'bg-[#1A2E1C] border-[#00C46A] ring-1 ring-[#00C46A]/50 text-white font-bold'
                      : 'bg-[#122010] border-[#2A4030] text-[#8899AA] hover:text-white'
                  }`}
                >
                  <UKFlag className="w-5 h-3.5 shrink-0" />
                  <div className="min-w-0">
                    <div className="text-xs">English</div>
                    <div className="text-[10px] text-[#8899AA] font-normal">UK Format</div>
                  </div>
                </button>

                {/* Kiswahili Option */}
                <button
                  type="button"
                  onClick={() => setLanguage('sw')}
                  className={`p-3 rounded-xl border flex items-center gap-2.5 text-left transition-all ${
                    language === 'sw'
                      ? 'bg-[#1A2E1C] border-[#00C46A] ring-1 ring-[#00C46A]/50 text-white font-bold'
                      : 'bg-[#122010] border-[#2A4030] text-[#8899AA] hover:text-white'
                  }`}
                >
                  <TanzaniaFlag className="w-5 h-3.5 shrink-0" />
                  <div className="min-w-0">
                    <div className="text-xs">Kiswahili</div>
                    <div className="text-[10px] text-[#8899AA] font-normal">Tanzania (TZ)</div>
                  </div>
                </button>
              </div>
            </div>

            {/* 5. Notifications & Alerts Feed */}
            <div className="space-y-3 pt-5">
              <div className="flex items-center justify-between">
                <span className="text-[11px] font-bold text-[#8899AA] uppercase tracking-wider flex items-center gap-1.5">
                  <Bell className="w-3.5 h-3.5 text-[#00C46A]" />
                  <span>{isSwahili ? 'Taarifa za Hivi Karibuni' : 'Recent Notifications'}</span>
                </span>
                <span className="text-[10px] bg-[#006B3C]/50 text-[#00C46A] px-2 py-0.5 rounded font-bold">
                  2 {isSwahili ? 'Mpya' : 'New'}
                </span>
              </div>

              <div className="space-y-2">
                <div className="p-3 bg-[#122010] rounded-xl border border-[#2A4030] space-y-1">
                  <div className="flex items-center justify-between">
                    <span className="font-semibold text-white text-xs">Route Priority Updated</span>
                    <span className="text-[10px] text-[#00C46A]">15m ago</span>
                  </div>
                  <p className="text-[11px] text-[#8899AA]">
                    City Hypermarket requested extra stock before 14:00 closing.
                  </p>
                </div>

                <div className="p-3 bg-[#122010] rounded-xl border border-[#2A4030] space-y-1">
                  <div className="flex items-center justify-between">
                    <span className="font-semibold text-white text-xs">Supervisor Approval</span>
                    <span className="text-[10px] text-[#00C46A]">1h ago</span>
                  </div>
                  <p className="text-[11px] text-[#8899AA]">
                    Order #ord-1001 approved by Tariq Al-Mansoor.
                  </p>
                </div>
              </div>
            </div>

            {/* 6. Quick Navigation Shortcuts */}
            <div className="space-y-2 pt-5">
              <div className="text-[11px] font-bold text-[#8899AA] uppercase tracking-wider mb-2">
                {isSwahili ? 'Njia za Haraka' : 'Quick Navigation'}
              </div>

              <div className="grid grid-cols-2 gap-2 text-xs">
                <button
                  type="button"
                  onClick={() => handleNavClick('home')}
                  className="flex items-center gap-2 p-2.5 rounded-lg bg-[#122010] hover:bg-[#1A2E1C] border border-[#2A4030] hover:border-[#00C46A] text-left transition-colors"
                >
                  <Home className="w-4 h-4 text-[#00C46A] shrink-0" />
                  <span className="truncate">{isSwahili ? 'Dashibodi' : 'Dashboard'}</span>
                </button>

                <button
                  type="button"
                  onClick={() => handleNavClick('orders')}
                  className="flex items-center gap-2 p-2.5 rounded-lg bg-[#122010] hover:bg-[#1A2E1C] border border-[#2A4030] hover:border-[#00C46A] text-left transition-colors"
                >
                  <Layers className="w-4 h-4 text-[#00C46A] shrink-0" />
                  <span className="truncate">{isSwahili ? 'Maagizo' : 'Orders & Stock'}</span>
                </button>

                <button
                  type="button"
                  onClick={() => handleNavClick('messages')}
                  className="flex items-center gap-2 p-2.5 rounded-lg bg-[#122010] hover:bg-[#1A2E1C] border border-[#2A4030] hover:border-[#00C46A] text-left transition-colors"
                >
                  <MessageSquare className="w-4 h-4 text-[#00C46A] shrink-0" />
                  <span className="truncate">{isSwahili ? 'Ujumbe' : 'Messaging'}</span>
                </button>

                <button
                  type="button"
                  onClick={() => handleNavClick('reports')}
                  className="flex items-center gap-2 p-2.5 rounded-lg bg-[#122010] hover:bg-[#1A2E1C] border border-[#2A4030] hover:border-[#00C46A] text-left transition-colors"
                >
                  <FileText className="w-4 h-4 text-[#00C46A] shrink-0" />
                  <span className="truncate">{isSwahili ? 'Ripoti za EOD' : 'EOD Reports'}</span>
                </button>

                <button
                  type="button"
                  onClick={() => handleNavClick('customers')}
                  className="flex items-center gap-2 p-2.5 rounded-lg bg-[#122010] hover:bg-[#1A2E1C] border border-[#2A4030] hover:border-[#00C46A] text-left transition-colors"
                >
                  <Users className="w-4 h-4 text-[#00C46A] shrink-0" />
                  <span className="truncate">{isSwahili ? 'Wateja' : 'Customers'}</span>
                </button>

                <button
                  type="button"
                  onClick={() => {
                    onClose();
                    onOpenDbModal();
                  }}
                  className="flex items-center gap-2 p-2.5 rounded-lg bg-[#122010] hover:bg-[#1A2E1C] border border-[#2A4030] hover:border-[#00C46A] text-left transition-colors"
                >
                  <Database className="w-4 h-4 text-[#00C46A] shrink-0" />
                  <span className="truncate">{isSwahili ? 'Hali ya Hifadhidata' : 'Cloud DB'}</span>
                </button>
              </div>
            </div>
          </div>

          {/* Sticky Bottom Actions & Logout */}
          <div className="p-4 bg-[#0A1A0F] border-t border-[#243447] flex items-center justify-between shrink-0 gap-3">
            <button
              type="button"
              onClick={() => {
                onClose();
                logout();
              }}
              className="flex items-center gap-2 px-3.5 py-2 rounded-lg bg-red-950/40 hover:bg-red-900/60 border border-red-800/40 text-red-300 text-xs font-semibold transition-colors"
            >
              <LogOut className="w-4 h-4" />
              <span>{isSwahili ? 'Ondoka' : 'Sign Out'}</span>
            </button>

            <div className="text-right">
              <div className="text-[10px] text-[#8899AA]">Zamzam Field Ops</div>
              <div className="text-[9px] text-[#556677]">v2.4 Enterprise Dispatch</div>
            </div>
          </div>
        </aside>
      </div>
    </div>,
    document.body
  );
};
