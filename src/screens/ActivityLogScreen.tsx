import React, { useState, useEffect } from 'react';
import { storageService } from '../services/storage';
import { ActivityLogEntry } from '../types';
import { useLanguage } from '../context/LanguageContext';
import { useAuth } from '../context/AuthContext';
import {
  History,
  Search,
  CheckCircle2,
  XCircle,
  RefreshCw,
  LogIn,
  FileText,
  Filter,
  Trash2,
  ShieldCheck,
} from 'lucide-react';

interface ActivityLogScreenProps {
  onNavigate: (view: string) => void;
}

export const ActivityLogScreen: React.FC<ActivityLogScreenProps> = () => {
  const { isSupervisor } = useAuth();
  const { isSwahili } = useLanguage();
  const [logs, setLogs] = useState<ActivityLogEntry[]>([]);
  const [filterAction, setFilterAction] = useState<string>('all');
  const [search, setSearch] = useState<string>('');
  const [feedback, setFeedback] = useState<string | null>(null);

  const loadLogs = () => {
    setLogs(storageService.getActivityLogs());
  };

  useEffect(() => {
    loadLogs();
  }, []);

  const handleDeleteLog = (logId: string) => {
    if (window.confirm(isSwahili ? 'Futa kumbukumbu hii?' : 'Delete this audit log entry?')) {
      storageService.deleteActivityLog(logId);
      loadLogs();
      setFeedback(isSwahili ? 'Kumbukumbu imefutwa' : 'Log entry deleted');
      setTimeout(() => setFeedback(null), 2500);
    }
  };

  const handleClearLogs = () => {
    if (window.confirm(isSwahili ? 'Je, una uhakika unataka kufuta kumbukumbu zote za shughuli?' : 'Are you sure you want to clear all audit logs?')) {
      storageService.clearActivityLogs();
      loadLogs();
      setFeedback(isSwahili ? 'Kumbukumbu zote zimefutwa' : 'All audit logs cleared');
      setTimeout(() => setFeedback(null), 2500);
    }
  };

  const filterOptions = [
    { id: 'all', label: isSwahili ? 'Matukio Yote' : 'All Events' },
    { id: 'order_approved', label: isSwahili ? 'Uidhinishaji' : 'Approvals' },
    { id: 'order_rejected', label: isSwahili ? 'Kukataliwa' : 'Rejections' },
    { id: 'sync_success', label: isSwahili ? 'Usawazishaji' : 'Syncs' },
    { id: 'user_login', label: isSwahili ? 'Kuingia' : 'Logins' },
    { id: 'eod_submitted', label: isSwahili ? 'Ripoti za EOD' : 'EOD Reports' },
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
      <div className="flex flex-col sm:flex-row sm:items-center justify-between gap-3 border-b border-[#243447] pb-4">
        <div>
          <h1 className="text-xl sm:text-2xl font-bold text-white flex items-center gap-2">
            <History className="w-6 h-6 text-[#00C46A]" />
            <span>{isSwahili ? 'Kumbukumbu za Uendeshaji na Shughuli' : 'Operational Audit Trail & Activity Logs'}</span>
          </h1>
          <p className="text-xs text-[#8899AA] mt-0.5">
            {isSwahili
              ? 'Kumbukumbu ya idhini za usafirishaji, matukio ya kusawazisha, vipindi vya watumiaji, na uundaji wa maagizo.'
              : 'Immutable log of dispatch approvals, sync events, user sessions, and order creations.'}
          </p>
        </div>

        {isSupervisor && logs.length > 0 && (
          <button
            onClick={handleClearLogs}
            className="flex items-center gap-1.5 px-3 py-1.5 bg-red-950/40 hover:bg-red-900/60 text-red-300 border border-red-800/40 rounded-xl text-xs font-bold transition self-start sm:self-auto"
            title={isSwahili ? 'Futa kumbukumbu zote' : 'Clear all audit logs'}
          >
            <Trash2 className="w-3.5 h-3.5" />
            <span>{isSwahili ? 'Futa Kumbukumbu Zote' : 'Clear Audit Trail'}</span>
          </button>
        )}
      </div>

      {feedback && (
        <div className="bg-[#006B3C]/20 border border-[#00C46A] p-3 rounded-xl flex items-center gap-2 text-xs text-[#00C46A]">
          <CheckCircle2 className="w-4 h-4" />
          <span>{feedback}</span>
        </div>
      )}

      {/* Filters & Search */}
      <div className="space-y-3">
        <div className="flex items-center gap-2 bg-[#122010] border border-[#3A5068] px-4 py-2.5 rounded-xl">
          <Search className="w-4 h-4 text-[#8899AA]" />
          <input
            type="text"
            value={search}
            onChange={(e) => setSearch(e.target.value)}
            placeholder={isSwahili ? 'Tafuta kumbukumbu za shughuli...' : 'Search activity records...'}
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
            {isSwahili
              ? 'Hakuna kumbukumbu za shughuli zinazolingana na kichujio kilichochaguliwa.'
              : 'No activity logs match the selected filter.'}
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
                    <div className="flex items-center gap-2 shrink-0">
                      <span className="text-[10px] text-[#8899AA] font-mono whitespace-nowrap">
                        {new Date(log.createdAt).toLocaleTimeString([], { hour: '2-digit', minute: '2-digit' })}
                      </span>
                      {isSupervisor && (
                        <button
                          onClick={() => handleDeleteLog(log.id)}
                          className="text-[#8899AA] hover:text-red-400 p-0.5 transition-colors"
                          title={isSwahili ? 'Futa kumbukumbu hii' : 'Delete this log entry'}
                        >
                          <Trash2 className="w-3.5 h-3.5" />
                        </button>
                      )}
                    </div>
                  </div>
                  <div className="text-[11px] text-[#8899AA] mt-1 flex items-center gap-3">
                    <span>
                      {isSwahili ? 'Mhudumu:' : 'Operator:'}{' '}
                      <strong className="text-[#D0E8F0]">{log.userName}</strong>
                    </span>
                    <span>&bull;</span>
                    <span>
                      {isSwahili ? 'Wajibu:' : 'Role:'}{' '}
                      <strong className="text-[#00C46A]">{log.userRole}</strong>
                    </span>
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
