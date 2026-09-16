import React, { useState } from 'react';
import { useAuth } from '../context/AuthContext';
import { storageService } from '../services/storage';
import {
  User,
  KeyRound,
  Bell,
  HardDrive,
  LogOut,
  CheckCircle2,
  RefreshCw,
  Shield,
  Smartphone,
} from 'lucide-react';

interface AccountManagementScreenProps {
  onNavigate: (view: string) => void;
}

export const AccountManagementScreen: React.FC<AccountManagementScreenProps> = ({ onNavigate }) => {
  const { user, updateProfile, logout } = useAuth();
  const [name, setName] = useState<string>(user?.name || '');
  const [email, setEmail] = useState<string>(user?.email || '');
  const [phone, setPhone] = useState<string>(user?.phone || '');

  // Notifications
  const [notifDelivery, setNotifDelivery] = useState<boolean>(true);
  const [notifSync, setNotifSync] = useState<boolean>(true);
  const [notifApproval, setNotifApproval] = useState<boolean>(true);
  const [notifMessage, setNotifMessage] = useState<boolean>(true);

  // Storage
  const [storageLimit, setStorageLimit] = useState<number>(100);
  const [feedback, setFeedback] = useState<string | null>(null);

  const handleSaveProfile = (e: React.FormEvent) => {
    e.preventDefault();
    updateProfile({ name, email, phone });
    setFeedback('Profile details updated successfully');
    setTimeout(() => setFeedback(null), 3000);
  };

  const handleClearCache = () => {
    if (confirm('Clear local offline cached records?')) {
      localStorage.removeItem('zamzam_offline_queue');
      setFeedback('Offline buffer cleared');
      setTimeout(() => setFeedback(null), 3000);
    }
  };

  const handleForceSync = async () => {
    try {
      const synced = await storageService.syncPendingQueue();
      setFeedback(`Force sync complete (${synced} records pushed)`);
      setTimeout(() => setFeedback(null), 3000);
    } catch {
      setFeedback('Sync failed: currently offline');
      setTimeout(() => setFeedback(null), 3000);
    }
  };

  return (
    <div className="max-w-3xl mx-auto space-y-6 pb-24 md:pb-12">
      {/* Header */}
      <div className="border-b border-[#243447] pb-4">
        <h1 className="text-xl sm:text-2xl font-bold text-white flex items-center gap-2">
          <User className="w-6 h-6 text-[#00C46A]" />
          <span>Account & Device Preferences</span>
        </h1>
        <p className="text-xs text-[#8899AA] mt-0.5">
          Manage staff profile credentials, notification alerts, and offline caching parameters.
        </p>
      </div>

      {feedback && (
        <div className="bg-[#006B3C]/30 border border-[#00C46A] p-3 rounded-xl flex items-center gap-2 text-xs text-white animate-fade-in">
          <CheckCircle2 className="w-4 h-4 text-[#00C46A]" />
          <span>{feedback}</span>
        </div>
      )}

      {/* 1. Profile Details */}
      <div className="bg-[#122010] p-5 rounded-2xl border border-[#2A5038]">
        <h2 className="text-xs font-semibold text-white uppercase tracking-wider mb-4 flex items-center gap-2">
          <Shield className="w-4 h-4 text-[#00C46A]" />
          <span>Operator Identity</span>
        </h2>

        <form onSubmit={handleSaveProfile} className="space-y-4">
          <div className="grid grid-cols-1 sm:grid-cols-2 gap-4">
            <div>
              <label className="text-xs text-[#8899AA] block mb-1">Full Name</label>
              <input
                type="text"
                value={name}
                onChange={(e) => setName(e.target.value)}
                className="w-full bg-[#1A2E1C] border border-[#3A5068] rounded-xl px-3.5 py-2 text-xs text-white focus:outline-none focus:border-[#00C46A]"
              />
            </div>
            <div>
              <label className="text-xs text-[#8899AA] block mb-1">Employee ID</label>
              <input
                type="text"
                disabled
                value={user?.employeeId || 'ZZ-2024-001'}
                className="w-full bg-[#142416] border border-[#243447] rounded-xl px-3.5 py-2 text-xs text-[#8899AA] font-mono cursor-not-allowed"
              />
            </div>
            <div>
              <label className="text-xs text-[#8899AA] block mb-1">Email Address</label>
              <input
                type="email"
                value={email}
                onChange={(e) => setEmail(e.target.value)}
                className="w-full bg-[#1A2E1C] border border-[#3A5068] rounded-xl px-3.5 py-2 text-xs text-white focus:outline-none focus:border-[#00C46A]"
              />
            </div>
            <div>
              <label className="text-xs text-[#8899AA] block mb-1">Phone Number</label>
              <input
                type="text"
                value={phone}
                onChange={(e) => setPhone(e.target.value)}
                className="w-full bg-[#1A2E1C] border border-[#3A5068] rounded-xl px-3.5 py-2 text-xs text-white focus:outline-none focus:border-[#00C46A]"
              />
            </div>
          </div>

          <div className="flex justify-end">
            <button
              type="submit"
              className="bg-[#006B3C] hover:bg-[#008F50] text-white px-4 py-2 rounded-xl text-xs font-bold"
            >
              Update Information
            </button>
          </div>
        </form>
      </div>

      {/* 2. Notification Preferences */}
      <div className="bg-[#122010] p-5 rounded-2xl border border-[#2A5038]">
        <h2 className="text-xs font-semibold text-white uppercase tracking-wider mb-3 flex items-center gap-2">
          <Bell className="w-4 h-4 text-[#00C46A]" />
          <span>Operational Push Notifications</span>
        </h2>

        <div className="space-y-3">
          {[
            { label: 'Delivery Route Alerts', desc: 'Real-time next stop notifications and route changes', state: notifDelivery, set: setNotifDelivery },
            { label: 'Database Sync Feedback', desc: 'Alerts when offline orders sync successfully', state: notifSync, set: setNotifSync },
            { label: 'Supervisor Approvals', desc: 'Instant status changes for your submitted orders', state: notifApproval, set: setNotifApproval },
            { label: 'Field Chat Messages', desc: 'Notifications for incoming dispatch messages', state: notifMessage, set: setNotifMessage },
          ].map((item, idx) => (
            <div key={idx} className="flex items-center justify-between p-3 rounded-xl bg-[#1A2E1C] border border-[#3A5068]/40">
              <div>
                <div className="text-xs font-bold text-white">{item.label}</div>
                <div className="text-[10px] text-[#8899AA]">{item.desc}</div>
              </div>
              <input
                type="checkbox"
                checked={item.state}
                onChange={(e) => item.set(e.target.checked)}
                className="w-4 h-4 accent-[#00C46A] cursor-pointer"
              />
            </div>
          ))}
        </div>
      </div>

      {/* 3. Offline Storage & Cache */}
      <div className="bg-[#122010] p-5 rounded-2xl border border-[#2A5038]">
        <h2 className="text-xs font-semibold text-white uppercase tracking-wider mb-3 flex items-center gap-2">
          <HardDrive className="w-4 h-4 text-[#00C46A]" />
          <span>Offline Buffer & Cache Management</span>
        </h2>

        <div className="p-3 bg-[#1A2E1C] rounded-xl border border-[#3A5068]/40 space-y-3 text-xs">
          <div className="flex justify-between items-center">
            <span className="text-[#8899AA]">Offline Queue Limit:</span>
            <span className="font-mono text-white font-bold">{storageLimit} MB</span>
          </div>

          <div className="flex gap-2">
            <button
              onClick={handleForceSync}
              className="flex-1 py-2 bg-[#006B3C] hover:bg-[#008F50] text-white rounded-xl font-semibold flex items-center justify-center gap-1.5"
            >
              <RefreshCw className="w-3.5 h-3.5" />
              <span>Force Sync Queue</span>
            </button>
            <button
              onClick={handleClearCache}
              className="px-4 py-2 border border-[#3A5068] text-[#8899AA] hover:text-white rounded-xl font-semibold"
            >
              Clear Buffer
            </button>
          </div>
        </div>
      </div>

      {/* 4. Log Out */}
      <div className="pt-2 flex justify-center">
        <button
          onClick={logout}
          className="flex items-center gap-2 text-xs font-bold text-red-400 hover:text-red-300 p-3 rounded-xl border border-red-900/40 hover:bg-red-950/40 transition-colors"
        >
          <LogOut className="w-4 h-4" />
          <span>Sign Out of Session</span>
        </button>
      </div>
    </div>
  );
};
