import React, { useState, useEffect } from 'react';
import { storageService } from '../services/storage';
import { ActivityLogEntry } from '../types';
import {
  History,
  Search,
  CheckCircle2,
  XCircle,
  RefreshCw,
  LogIn,
  FileText,
  Filter,
} from 'lucide-react';

interface ActivityLogScreenProps {
  onNavigate: (view: string) => void;
}

export const ActivityLogScreen: React.FC<ActivityLogScreenProps> = () => {
  const [logs, setLogs] = useState<ActivityLogEntry[]>([]);
  const [filterAction, setFilterAction] = useState<string>('all');
  const [search, setSearch] = useState<string>('');

  useEffect(() => {
    setLogs(storageService.getActivityLogs());
  }, []);

  const filterOptions = [
    { id: 'all', label: 'All Events' },
    { id: 'order_approved', label: 'Approvals' },
    { id: 'order_rejected', label: 'Rejections' },
    { id: 'sync_success', label: 'Syncs' },
    { id: 'user_login', label: 'Logins' },
    { id: 'eod_submitted', label: 'EOD Reports' },
  ];

  const filteredLogs = logs.filter((log) => {
    const matchesFilter = filterAction === 'all' || log.action === filterAction;
    const matchesSearch =
      search === '' ||
      log.description.toLowerCase().includes(search.toLowerCase()) ||
      log.userName.toLowerCase().includes(search.toLowerCase());
    return matchesFilter && matchesSearch;
  });

  const getActionIcon = (action: string) => {
    switch (action) {
      case 'order_approved':
        return <CheckCircle2 className="w-4 h-4 text-[#00C46A]" />;
      case 'order_rejected':
        return <XCircle className="w-4 h-4 text-red-400" />;
      case 'sync_success':
        return <RefreshCw className="w-4 h-4 text-blue-400" />;
      case 'user_login':
        return <LogIn className="w-4 h-4 text-purple-400" />;
      default:
        return <FileText className="w-4 h-4 text-[#F59E0B]" />;
    }
  };

  return (
    <div className="max-w-4xl mx-auto space-y-6 pb-24 md:pb-12">
      {/* Header */}
      <div className="border-b border-[#243447] pb-4">
        <h1 className="text-xl sm:text-2xl font-bold text-white flex items-center gap-2">
          <History className="w-6 h-6 text-[#00C46A]" />
          <span>Operational Audit Trail & Activity Logs</span>
        </h1>
        <p className="text-xs text-[#8899AA] mt-0.5">
          Immutable log of dispatch approvals, sync events, user sessions, and order creations.
        </p>
      </div>

      {/* Filters & Search */}
      <div className="space-y-3">
        <div className="flex items-center gap-2 bg-[#122010] border border-[#3A5068] px-4 py-2.5 rounded-xl">
          <Search className="w-4 h-4 text-[#8899AA]" />
          <input
            type="text"
            value={search}
            onChange={(e) => setSearch(e.target.value)}
            placeholder="Search activity records..."
            className="w-full bg-transparent text-xs text-white placeholder-[#8899AA] focus:outline-none"
          />
        </div>

        <div className="flex gap-1.5 overflow-x-auto pb-1 scrollbar-none">
          {filterOptions.map((opt) => (
            <button
              key={opt.id}
              onClick={() => setFilterAction(opt.id)}
              className={`px-3 py-1.5 rounded-lg text-xs font-medium whitespace-nowrap transition-all ${
                filterAction === opt.id
                  ? 'bg-[#006B3C] text-white'
                  : 'bg-[#122010] text-[#8899AA] hover:text-white border border-[#2A5038]'
              }`}
            >
              {opt.label}
            </button>
          ))}
        </div>
      </div>

      {/* Logs Timeline */}
      <div className="bg-[#122010] p-5 rounded-2xl border border-[#2A5038] space-y-3">
        {filteredLogs.length === 0 ? (
          <div className="text-center py-8 text-xs text-[#8899AA]">
            No activity logs match the selected filter.
          </div>
        ) : (
          <div className="divide-y divide-[#243447]">
            {filteredLogs.map((log) => (
              <div key={log.id} className="py-3 flex items-start gap-3 text-xs">
                <div className="p-2 rounded-xl bg-[#1A2E1C] border border-[#3A5068] mt-0.5">
                  {getActionIcon(log.action)}
                </div>

                <div className="flex-1 min-w-0">
                  <div className="flex items-center justify-between gap-2">
                    <span className="font-bold text-white text-xs">{log.description}</span>
                    <span className="text-[10px] text-[#8899AA] font-mono whitespace-nowrap">
                      {new Date(log.createdAt).toLocaleTimeString([], { hour: '2-digit', minute: '2-digit' })}
                    </span>
                  </div>
                  <div className="text-[11px] text-[#8899AA] mt-1 flex items-center gap-3">
                    <span>Operator: <strong className="text-[#D0E8F0]">{log.userName}</strong></span>
                    <span>&bull;</span>
                    <span>Role: <strong className="text-[#00C46A]">{log.userRole}</strong></span>
                  </div>
                </div>
              </div>
            ))}
          </div>
        )}
      </div>
    </div>
  );
};
