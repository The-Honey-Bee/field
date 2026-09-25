import React, { useState, useEffect } from 'react';
import { storageService } from '../services/storage';
import { Customer, CustomerSyncLogEntry } from '../types';
import { useLanguage } from '../context/LanguageContext';
import {
  Users,
  Search,
  Plus,
  Phone,
  MapPin,
  Trash2,
  ShoppingCart,
  CheckCircle2,
  Building2,
  ClipboardList,
  RefreshCw,
  Database,
  ArrowDownToLine,
  ArrowUpToLine,
  FileText,
  Copy,
  Check,
  X,
  Cloud,
  ChevronDown,
  ChevronUp,
} from 'lucide-react';

interface CustomerManagementScreenProps {
  onNavigate: (view: string) => void;
}

export const CustomerManagementScreen: React.FC<CustomerManagementScreenProps> = ({ onNavigate }) => {
  const { isSwahili } = useLanguage();
  const [customers, setCustomers] = useState<Customer[]>([]);
  const [search, setSearch] = useState<string>('');
  const [showAddModal, setShowAddModal] = useState<boolean>(false);
  const [name, setName] = useState<string>('');
  const [phone, setPhone] = useState<string>('');
  const [address, setAddress] = useState<string>('');
  const [notes, setNotes] = useState<string>('');
  const [feedback, setFeedback] = useState<string | null>(null);

  // Supabase Fetch & Log State
  const [isFetching, setIsFetching] = useState<boolean>(false);
  const [isSyncing, setIsSyncing] = useState<boolean>(false);
  const [showLogsModal, setShowLogsModal] = useState<boolean>(false);
  const [logs, setLogs] = useState<CustomerSyncLogEntry[]>([]);
  const [logFilter, setLogFilter] = useState<'ALL' | 'FROM_SUPABASE' | 'TO_SUPABASE'>('ALL');
  const [expandedLogId, setExpandedLogId] = useState<string | null>(null);
  const [copiedLogs, setCopiedLogs] = useState<boolean>(false);

  // Load customers and subscribe to live customer logs
  useEffect(() => {
    // 1. Initial local load
    setCustomers(storageService.getCustomers());
    setLogs(storageService.getCustomerSyncLogs());

    // 2. Fetch and log customers list from Supabase on mount
    handleFetchFromSupabase(false);

    // 3. Subscribe to real-time sync log entries
    const unsubscribe = storageService.onCustomerSyncLog((newEntry) => {
      setLogs((prev) => [newEntry, ...prev.slice(0, 99)]);
    });

    return () => {
      unsubscribe();
    };
  }, []);

  const handleFetchFromSupabase = async (showToast: boolean = true) => {
    setIsFetching(true);
    try {
      const cloudData = await storageService.fetchAndLogCustomersFromSupabase();
      if (cloudData && cloudData.length > 0) {
        setCustomers(cloudData);
      } else {
        setCustomers(storageService.getCustomers());
      }
      setLogs(storageService.getCustomerSyncLogs());

      if (showToast) {
        setFeedback(
          isSwahili
            ? `Wateja ${cloudData?.length || 0} wamepakiwa na kuwekwa kwenye kumbukumbu kutoka jedwali la Supabase "customers"`
            : `Fetched & logged ${cloudData?.length || 0} customers from Supabase "customers" table`
        );
        setTimeout(() => setFeedback(null), 4000);
      }
    } catch (err: any) {
      console.error('[Supabase Fetch Error]', err);
      if (showToast) {
        setFeedback(
          isSwahili
            ? 'Hitilafu ya kupakia kutoka Supabase. Hali ya nje ya mtandao inatumika.'
            : 'Error fetching from Supabase. Offline cache active.'
        );
        setTimeout(() => setFeedback(null), 4000);
      }
    } finally {
      setIsFetching(false);
    }
  };

  const handleSyncToSupabase = async () => {
    setIsSyncing(true);
    try {
      const res = await storageService.syncAndLogAllCustomersToSupabase();
      setCustomers(res.customers);
      setLogs(storageService.getCustomerSyncLogs());

      setFeedback(
        isSwahili
          ? `Usawazishaji umekamilika: ${res.synced} wamesawazishwa na jedwali la Supabase "customers"`
          : `Sync complete: ${res.synced} customer(s) logged & saved to Supabase "customers" table`
      );
      setTimeout(() => setFeedback(null), 4000);
    } catch (err: any) {
      setFeedback(isSwahili ? 'Hitilafu ya usawazishaji' : 'Sync error: ' + err.message);
      setTimeout(() => setFeedback(null), 4000);
    } finally {
      setIsSyncing(false);
    }
  };

  const handleAddCustomer = async (e: React.FormEvent) => {
    e.preventDefault();
    if (!name.trim()) return;

    const payload = {
      name: name.trim(),
      phone: phone.trim() || '+255 700 000 000',
      address: address.trim() || 'Dar es Salaam',
      notes: notes.trim() || undefined,
    };

    // Save and immediately push & log to Supabase "customers" table
    storageService.saveCustomer(payload);
    setCustomers(storageService.getCustomers());
    setLogs(storageService.getCustomerSyncLogs());

    setName('');
    setPhone('');
    setAddress('');
    setNotes('');
    setShowAddModal(false);

    setFeedback(
      isSwahili
        ? `Mteja "${payload.name}" amesajiliwa na kuwekwa kwenye kumbukumbu ya Supabase "customers"`
        : `Customer "${payload.name}" registered & logged to Supabase "customers" table`
    );
    setTimeout(() => setFeedback(null), 3500);
  };

  const handleDelete = (id: string, custName: string) => {
    const confirmPrompt = isSwahili
      ? `Ondoa "${custName}" kwenye orodha ya wateja?`
      : `Remove "${custName}" from client registry?`;
    if (confirm(confirmPrompt)) {
      storageService.deleteCustomer(id);
      setCustomers(storageService.getCustomers());
      setFeedback(isSwahili ? 'Mteja ameondolewa' : 'Customer removed');
      setTimeout(() => setFeedback(null), 3000);
    }
  };

  const handleCopyLogs = () => {
    const text = logs
      .map(
        (l) =>
          `[${l.timestamp}] [${l.direction}] [${l.tableName}] [${l.action}] [${l.status}]: ${l.message}${
            l.data ? '\nPayload: ' + JSON.stringify(l.data, null, 2) : ''
          }`
      )
      .join('\n\n');
    navigator.clipboard.writeText(text);
    setCopiedLogs(true);
    setTimeout(() => setCopiedLogs(false), 2000);
  };

  const filteredLogs = logs.filter((l) => {
    if (logFilter === 'ALL') return true;
    return l.direction === logFilter;
  });

  const filtered = customers.filter(
    (c) =>
      c.name.toLowerCase().includes(search.toLowerCase()) ||
      c.phone.toLowerCase().includes(search.toLowerCase()) ||
      (c.address && c.address.toLowerCase().includes(search.toLowerCase())) ||
      (c.notes && c.notes.toLowerCase().includes(search.toLowerCase()))
  );

  const pendingCount = customers.filter((c) => c.syncStatus === 'pending').length;

  return (
    <div className="max-w-5xl mx-auto space-y-6 pb-24 md:pb-12">
      {/* Header & Supabase Controls */}
      <div className="flex flex-col sm:flex-row sm:items-center justify-between gap-3 border-b border-[#243447] pb-4">
        <div>
          <h1 className="text-xl sm:text-2xl font-bold text-white flex items-center gap-2">
            <Users className="w-6 h-6 text-[#00C46A]" />
            <span>{isSwahili ? 'Orodha ya Wateja na Makampuni' : 'Customer & Client Directory'}</span>
          </h1>
          <p className="text-xs text-[#8899AA] mt-0.5">
            {isSwahili
              ? 'Inawasiliana moja kwa moja na jedwali la "customers" katika Supabase (Fetch & Log).'
              : 'Direct bidirectional live synchronization with the "customers" table in Supabase.'}
          </p>
        </div>

        <div className="flex flex-wrap items-center gap-2 self-start sm:self-auto">
          {/* Supabase Live Logs Button */}
          <button
            onClick={() => setShowLogsModal(true)}
            className="bg-[#122010] hover:bg-[#1A2E1C] border border-[#2A5038] text-[#8899AA] hover:text-white px-3 py-2 rounded-xl text-xs flex items-center gap-1.5 transition-colors"
            title={isSwahili ? 'Tazama Kumbukumbu za Supabase' : 'View Supabase Sync Logs'}
          >
            <Database className="w-3.5 h-3.5 text-[#00C46A]" />
            <span>{isSwahili ? 'Kumbukumbu' : 'Supabase Logs'}</span>
            {logs.length > 0 && (
              <span className="bg-[#00C46A]/20 text-[#00C46A] text-[10px] font-bold px-1.5 py-0.2 rounded-full border border-[#00C46A]/40">
                {logs.length}
              </span>
            )}
          </button>

          {/* Fetch from Supabase Button */}
          <button
            onClick={() => handleFetchFromSupabase(true)}
            disabled={isFetching}
            className="bg-[#122010] hover:bg-[#1A2E1C] border border-[#00C46A]/40 hover:border-[#00C46A] text-white px-3 py-2 rounded-xl text-xs flex items-center gap-1.5 transition-colors disabled:opacity-50"
            title={isSwahili ? 'Pakua orodha kutoka Supabase' : 'Fetch customers list from Supabase "customers" table'}
          >
            <RefreshCw className={`w-3.5 h-3.5 text-[#00C46A] ${isFetching ? 'animate-spin' : ''}`} />
            <span>{isFetching ? (isSwahili ? 'Inapakua...' : 'Fetching...') : (isSwahili ? 'Pakua toka Supabase' : 'Fetch from Supabase')}</span>
          </button>

          {/* Add Customer Button */}
          <button
            onClick={() => setShowAddModal(true)}
            className="bg-[#00C46A] hover:bg-[#008F50] text-[#0A1A0F] font-bold px-4 py-2 rounded-xl text-xs flex items-center gap-1.5 shadow-sm"
          >
            <Plus className="w-4 h-4" />
            <span>{isSwahili ? 'Sajili Mteja' : 'Add Customer'}</span>
          </button>
        </div>
      </div>

      {/* Supabase Connectivity & Table Status Banner */}
      <div className="bg-[#122010]/80 border border-[#2A5038] rounded-2xl p-3 sm:px-4 sm:py-3 flex flex-col sm:flex-row sm:items-center justify-between gap-3 text-xs">
        <div className="flex items-center gap-3">
          <div className="w-8 h-8 rounded-xl bg-[#00C46A]/10 border border-[#00C46A]/30 flex items-center justify-center shrink-0">
            <Database className="w-4 h-4 text-[#00C46A]" />
          </div>
          <div>
            <div className="flex items-center gap-2">
              <span className="font-semibold text-white">Supabase Target:</span>
              <span className="font-mono text-[11px] bg-[#0A1A0F] px-2 py-0.5 rounded-md border border-[#2A5038] text-[#00C46A]">
                table: &quot;customers&quot;
              </span>
              <span className="inline-flex items-center gap-1 text-[10px] text-[#00E67A] bg-[#00E67A]/10 px-2 py-0.5 rounded-full font-medium">
                <span className="w-1.5 h-1.5 rounded-full bg-[#00E67A] animate-pulse"></span>
                REST API Live
              </span>
            </div>
            <p className="text-[11px] text-[#8899AA] mt-0.5">
              https://jwlvtpnhibtmalfdcmbu.supabase.co/rest/v1/customers
            </p>
          </div>
        </div>

        <div className="flex items-center gap-2 self-end sm:self-auto">
          {pendingCount > 0 && (
            <button
              onClick={handleSyncToSupabase}
              disabled={isSyncing}
              className="inline-flex items-center gap-1.5 bg-[#F59E0B]/20 hover:bg-[#F59E0B]/30 border border-[#F59E0B]/50 text-[#F59E0B] px-2.5 py-1 rounded-lg text-xs font-semibold transition-colors disabled:opacity-50"
            >
              <ArrowUpToLine className={`w-3.5 h-3.5 ${isSyncing ? 'animate-bounce' : ''}`} />
              <span>
                {isSyncing
                  ? (isSwahili ? 'Inasawazisha...' : 'Syncing...')
                  : (isSwahili ? `Sawazisha ${pendingCount} toka Nje` : `Push ${pendingCount} to Supabase`)}
              </span>
            </button>
          )}

          <div className="text-[11px] text-[#8899AA] bg-[#0A1A0F] px-3 py-1 rounded-lg border border-[#2A5038]">
            <span className="text-white font-semibold">{customers.length}</span> {isSwahili ? 'Wateja kwenye Jedwali' : 'Customers in Registry'}
          </div>
        </div>
      </div>

      {feedback && (
        <div className="bg-[#006B3C]/30 border border-[#00C46A] p-3 rounded-xl flex items-center gap-2 text-xs text-white animate-fade-in shadow-md">
          <CheckCircle2 className="w-4 h-4 text-[#00C46A] shrink-0" />
          <span>{feedback}</span>
        </div>
      )}

      {/* Search Bar */}
      <div className="flex items-center gap-2 bg-[#122010] border border-[#3A5068] px-4 py-2.5 rounded-xl">
        <Search className="w-4 h-4 text-[#8899AA]" />
        <input
          type="text"
          value={search}
          onChange={(e) => setSearch(e.target.value)}
          placeholder={
            isSwahili
              ? 'Tafuta kwa jina la biashara, nambari ya simu, au anwani ya mtaa...'
              : 'Search by business name, phone number, or street address...'
          }
          className="w-full bg-transparent text-xs text-white placeholder-[#8899AA] focus:outline-none"
        />
      </div>

      {/* Customers Grid or Empty State */}
      {filtered.length === 0 ? (
        <div className="text-center py-12 px-4 bg-[#122010] rounded-2xl border border-dashed border-[#2A5038] space-y-3">
          <Users className="w-10 h-10 mx-auto text-[#00C46A]/50" />
          <h3 className="text-base font-bold text-white">
            {isSwahili ? 'Hakuna Wateja Waliopatikana' : 'No Customers Found'}
          </h3>
          <p className="text-xs text-[#8899AA] max-w-sm mx-auto">
            {search
              ? (isSwahili ? `Hakuna mteja anayelingana na "${search}".` : `No customer records matched "${search}".`)
              : (isSwahili
                  ? 'Orodha ya wateja haina kumbukumbu. Bofya "Pakua toka Supabase" au sajili mteja mpya.'
                  : 'Customer directory is clean. Click "Fetch from Supabase" or register a new customer.')}
          </p>
          <div className="flex items-center justify-center gap-3 pt-2">
            <button
              onClick={() => handleFetchFromSupabase(true)}
              disabled={isFetching}
              className="inline-flex items-center gap-1.5 bg-[#122010] hover:bg-[#1A2E1C] border border-[#00C46A] text-[#00C46A] font-bold px-4 py-2 rounded-xl text-xs"
            >
              <RefreshCw className={`w-3.5 h-3.5 ${isFetching ? 'animate-spin' : ''}`} />
              <span>{isSwahili ? 'Pakua toka Supabase' : 'Fetch from Supabase'}</span>
            </button>
            <button
              onClick={() => setShowAddModal(true)}
              className="inline-flex items-center gap-1.5 bg-[#00C46A] hover:bg-[#008F50] text-[#0A1A0F] font-bold px-4 py-2 rounded-xl text-xs"
            >
              <Plus className="w-4 h-4" />
              <span>{isSwahili ? 'Sajili Mteja wa Kwanza' : 'Add First Customer'}</span>
            </button>
          </div>
        </div>
      ) : (
        <div className="grid grid-cols-1 md:grid-cols-2 gap-4">
          {filtered.map((c) => (
            <div
              key={c.id}
              className="bg-[#122010] p-4 rounded-2xl border border-[#2A5038] flex flex-col justify-between gap-3 shadow-md hover:border-[#00C46A]/50 transition-colors"
            >
              <div>
                <div className="flex items-center justify-between gap-2">
                  <h2 className="text-sm font-bold text-white flex items-center gap-2 truncate">
                    <Building2 className="w-4 h-4 text-[#00C46A] shrink-0" />
                    <span className="truncate">{c.name}</span>
                  </h2>

                  <div className="flex items-center gap-1.5 shrink-0">
                    {/* Supabase sync badge */}
                    {c.syncStatus === 'synced' ? (
                      <span
                        className="inline-flex items-center gap-1 text-[10px] text-[#00C46A] bg-[#00C46A]/10 border border-[#00C46A]/30 px-2 py-0.5 rounded-full font-medium"
                        title="Synced with Supabase customers table"
                      >
                        <Check className="w-2.5 h-2.5" />
                        Supabase
                      </span>
                    ) : (
                      <span
                        className="inline-flex items-center gap-1 text-[10px] text-[#F59E0B] bg-[#F59E0B]/10 border border-[#F59E0B]/30 px-2 py-0.5 rounded-full font-medium"
                        title="Pending sync to Supabase"
                      >
                        <Cloud className="w-2.5 h-2.5" />
                        Pending
                      </span>
                    )}

                    <button
                      onClick={() => handleDelete(c.id, c.name)}
                      className="text-[#8899AA] hover:text-red-400 p-1 transition-colors"
                      title={isSwahili ? 'Futa Mteja' : 'Delete Customer'}
                    >
                      <Trash2 className="w-3.5 h-3.5" />
                    </button>
                  </div>
                </div>

                <div className="mt-2 space-y-1 text-xs text-[#8899AA]">
                  <div className="flex items-center gap-2">
                    <Phone className="w-3.5 h-3.5 text-[#00C46A] shrink-0" />
                    <a href={`tel:${c.phone}`} className="hover:underline text-[#D0E8F0] font-mono">
                      {c.phone}
                    </a>
                  </div>
                  {c.address && (
                    <div className="flex items-center gap-2">
                      <MapPin className="w-3.5 h-3.5 text-[#F59E0B] shrink-0" />
                      <span className="truncate">{c.address}</span>
                    </div>
                  )}
                  {c.notes && (
                    <div className="flex items-center gap-2 text-[11px] text-[#8899AA]/80 italic">
                      <FileText className="w-3 h-3 text-[#38BDF8] shrink-0" />
                      <span className="truncate">{c.notes}</span>
                    </div>
                  )}
                </div>

                {/* Supabase UUID/ID */}
                <div className="mt-2 pt-2 border-t border-[#243447]/60 flex items-center justify-between text-[10px] text-[#6A7B8C]">
                  <span className="font-mono truncate max-w-[200px]">ID: {c.id}</span>
                  <span>{new Date(c.createdAt).toLocaleDateString()}</span>
                </div>
              </div>

              <div className="pt-2 border-t border-[#243447] flex items-center justify-between">
                <button
                  onClick={() => onNavigate('forms')}
                  className="flex items-center gap-1.5 text-xs text-[#8899AA] hover:text-[#00C46A] transition-colors font-medium"
                  title={isSwahili ? 'Fungua Utafiti wa Kuridhika kwa Wateja katika Google Forms' : 'Open Customer Satisfaction Survey in Google Forms'}
                >
                  <ClipboardList className="w-3.5 h-3.5" />
                  <span>{isSwahili ? 'Utafiti wa Google' : 'Google Survey'}</span>
                </button>
                <button
                  onClick={() => onNavigate('orders')}
                  className="flex items-center gap-1.5 text-xs text-[#00C46A] hover:text-white font-semibold"
                >
                  <ShoppingCart className="w-3.5 h-3.5" />
                  <span>{isSwahili ? 'Unda Agizo' : 'Create Order'}</span>
                </button>
              </div>
            </div>
          ))}
        </div>
      )}

      {/* Supabase Live Logs Viewer Modal */}
      {showLogsModal && (
        <div className="fixed inset-0 z-50 bg-black/75 backdrop-blur-sm flex items-center justify-center p-4">
          <div className="bg-[#0A1A0F] border border-[#2A5038] rounded-2xl max-w-3xl w-full max-h-[85vh] flex flex-col shadow-2xl overflow-hidden animate-fade-in">
            {/* Modal Header */}
            <div className="p-4 sm:p-5 border-b border-[#243447] flex items-center justify-between bg-[#122010]">
              <div className="flex items-center gap-2.5">
                <div className="w-8 h-8 rounded-xl bg-[#00C46A]/20 border border-[#00C46A]/40 flex items-center justify-center">
                  <Database className="w-4 h-4 text-[#00C46A]" />
                </div>
                <div>
                  <h2 className="text-sm sm:text-base font-bold text-white flex items-center gap-2">
                    <span>Supabase &quot;customers&quot; Table Activity Logs</span>
                    <span className="text-[10px] bg-[#00C46A]/20 text-[#00C46A] px-2 py-0.5 rounded-full font-mono">
                      {filteredLogs.length} events
                    </span>
                  </h2>
                  <p className="text-[11px] text-[#8899AA]">
                    Target: https://jwlvtpnhibtmalfdcmbu.supabase.co/rest/v1/customers
                  </p>
                </div>
              </div>

              <div className="flex items-center gap-2">
                <button
                  onClick={handleCopyLogs}
                  className="p-1.5 text-[#8899AA] hover:text-white rounded-lg hover:bg-[#1A2E1C] transition-colors"
                  title="Copy logs to clipboard"
                >
                  {copiedLogs ? <Check className="w-4 h-4 text-[#00C46A]" /> : <Copy className="w-4 h-4" />}
                </button>
                <button
                  onClick={() => {
                    storageService.clearCustomerSyncLogs();
                    setLogs([]);
                  }}
                  className="p-1.5 text-[#8899AA] hover:text-red-400 rounded-lg hover:bg-[#1A2E1C] transition-colors"
                  title="Clear logs"
                >
                  <Trash2 className="w-4 h-4" />
                </button>
                <button
                  onClick={() => setShowLogsModal(false)}
                  className="p-1.5 text-[#8899AA] hover:text-white rounded-lg hover:bg-[#1A2E1C] transition-colors"
                >
                  <X className="w-4 h-4" />
                </button>
              </div>
            </div>

            {/* Filter Tabs */}
            <div className="px-4 py-2 bg-[#0E1712] border-b border-[#243447] flex items-center justify-between gap-2 text-xs">
              <div className="flex items-center gap-1.5">
                {(['ALL', 'FROM_SUPABASE', 'TO_SUPABASE'] as const).map((filterKey) => (
                  <button
                    key={filterKey}
                    onClick={() => setLogFilter(filterKey)}
                    className={`px-3 py-1 rounded-lg text-[11px] font-semibold transition-colors ${
                      logFilter === filterKey
                        ? 'bg-[#00C46A] text-[#0A1A0F]'
                        : 'bg-[#122010] text-[#8899AA] hover:text-white'
                    }`}
                  >
                    {filterKey === 'ALL'
                      ? 'All Logs'
                      : filterKey === 'FROM_SUPABASE'
                      ? '📥 From Supabase (Fetch)'
                      : '📤 To Supabase (Push & Insert)'}
                  </button>
                ))}
              </div>

              <span className="text-[10px] text-[#8899AA] hidden sm:inline">
                Also logged to DevTools Console (F12)
              </span>
            </div>

            {/* Logs List */}
            <div className="p-4 overflow-y-auto space-y-2.5 flex-1 font-mono text-xs">
              {filteredLogs.length === 0 ? (
                <div className="text-center py-10 text-[#8899AA] space-y-2">
                  <Database className="w-8 h-8 mx-auto text-[#8899AA]/40" />
                  <p className="text-xs">No logs recorded yet for this session.</p>
                  <button
                    onClick={() => handleFetchFromSupabase(true)}
                    className="mt-2 inline-flex items-center gap-1 text-[11px] text-[#00C46A] hover:underline"
                  >
                    <RefreshCw className="w-3 h-3" />
                    <span>Run &quot;Fetch from Supabase&quot; to generate logs</span>
                  </button>
                </div>
              ) : (
                filteredLogs.map((log) => {
                  const isExpanded = expandedLogId === log.id;
                  const isFrom = log.direction === 'FROM_SUPABASE';

                  return (
                    <div
                      key={log.id}
                      className="bg-[#122010] border border-[#2A5038] rounded-xl p-3 space-y-2 transition-colors hover:border-[#00C46A]/50"
                    >
                      <div className="flex items-start justify-between gap-2">
                        <div className="flex items-center gap-2">
                          <span
                            className={`inline-flex items-center gap-1 px-2 py-0.5 rounded-md text-[10px] font-bold ${
                              isFrom
                                ? 'bg-cyan-950/80 text-cyan-300 border border-cyan-800'
                                : 'bg-emerald-950/80 text-emerald-300 border border-emerald-800'
                            }`}
                          >
                            {isFrom ? (
                              <ArrowDownToLine className="w-3 h-3 text-cyan-400" />
                            ) : (
                              <ArrowUpToLine className="w-3 h-3 text-emerald-400" />
                            )}
                            {log.direction}
                          </span>

                          <span className="text-[10px] bg-[#0A1A0F] text-[#8899AA] px-1.5 py-0.5 rounded border border-[#243447]">
                            table: {log.tableName}
                          </span>

                          <span
                            className={`text-[10px] font-bold px-1.5 py-0.5 rounded ${
                              log.status === 'SUCCESS'
                                ? 'bg-[#00E67A]/20 text-[#00E67A]'
                                : log.status === 'ERROR'
                                ? 'bg-red-500/20 text-red-400'
                                : 'bg-blue-500/20 text-blue-400'
                            }`}
                          >
                            {log.status}
                          </span>
                        </div>

                        <span className="text-[10px] text-[#6A7B8C]">{log.timestamp}</span>
                      </div>

                      <p className="text-white text-xs leading-relaxed font-sans">{log.message}</p>

                      {log.data && (
                        <div>
                          <button
                            onClick={() => setExpandedLogId(isExpanded ? null : log.id)}
                            className="text-[11px] text-[#00C46A] hover:underline inline-flex items-center gap-1"
                          >
                            <span>{isExpanded ? 'Hide Raw Payload' : 'View Raw Payload'}</span>
                            {isExpanded ? <ChevronUp className="w-3 h-3" /> : <ChevronDown className="w-3 h-3" />}
                          </button>

                          {isExpanded && (
                            <pre className="mt-2 bg-[#0A1A0F] border border-[#243447] p-2.5 rounded-lg text-[10px] text-[#A0B0C0] overflow-x-auto max-h-48">
                              {JSON.stringify(log.data, null, 2)}
                            </pre>
                          )}
                        </div>
                      )}
                    </div>
                  );
                })
              )}
            </div>

            {/* Modal Footer */}
            <div className="p-3 bg-[#122010] border-t border-[#243447] flex items-center justify-between text-xs text-[#8899AA]">
              <span className="text-[11px]">
                Endpoint: <code className="text-[#00C46A]">/rest/v1/customers</code> &amp; Proxy <code className="text-[#00C46A]">/api/customers</code>
              </span>
              <button
                onClick={() => setShowLogsModal(false)}
                className="px-4 py-1.5 rounded-xl bg-[#243447] hover:bg-[#344860] text-white text-xs font-semibold"
              >
                Close
              </button>
            </div>
          </div>
        </div>
      )}

      {/* Add Modal */}
      {showAddModal && (
        <div className="fixed inset-0 z-50 bg-black/70 backdrop-blur-sm flex items-center justify-center p-4">
          <div className="bg-[#122010] border border-[#3A5068] rounded-2xl max-w-md w-full p-6 space-y-4 shadow-2xl">
            <div className="flex items-center justify-between">
              <h2 className="text-lg font-bold text-white flex items-center gap-2">
                <Users className="w-5 h-5 text-[#00C46A]" />
                <span>{isSwahili ? 'Sajili Mteja Kwenye Supabase' : 'Register Customer to Supabase'}</span>
              </h2>
              <button
                onClick={() => setShowAddModal(false)}
                className="text-[#8899AA] hover:text-white p-1"
              >
                <X className="w-4 h-4" />
              </button>
            </div>

            <p className="text-xs text-[#8899AA]">
              {isSwahili
                ? 'Mteja atahifadhiwa kwenye kumbukumbu ya ndani na kuingizwa moja kwa moja kwenye jedwali la "customers" katika Supabase.'
                : 'Customer will be saved locally and pushed & logged directly to the "customers" table in Supabase.'}
            </p>

            <form onSubmit={handleAddCustomer} className="space-y-3">
              <div>
                <label className="text-xs text-[#8899AA] block mb-1">
                  {isSwahili ? 'Jina la Kampuni / Mteja *' : 'Company / Customer Name *'}
                </label>
                <input
                  type="text"
                  required
                  value={name}
                  onChange={(e) => setName(e.target.value)}
                  placeholder={isSwahili ? 'mfano: Capripoint Waterfront Hotel' : 'e.g. Capripoint Waterfront Hotel'}
                  className="w-full bg-[#1A2E1C] border border-[#3A5068] rounded-xl px-3.5 py-2 text-sm text-white focus:outline-none focus:border-[#00C46A]"
                />
              </div>
              <div>
                <label className="text-xs text-[#8899AA] block mb-1">
                  {isSwahili ? 'Nambari ya Simu' : 'Phone Number'}
                </label>
                <input
                  type="text"
                  value={phone}
                  onChange={(e) => setPhone(e.target.value)}
                  placeholder="+255 7XX XXX XXX"
                  className="w-full bg-[#1A2E1C] border border-[#3A5068] rounded-xl px-3.5 py-2 text-sm text-white focus:outline-none focus:border-[#00C46A]"
                />
              </div>
              <div>
                <label className="text-xs text-[#8899AA] block mb-1">
                  {isSwahili ? 'Anwani ya Uwasilishaji' : 'Physical Delivery Address'}
                </label>
                <input
                  type="text"
                  value={address}
                  onChange={(e) => setAddress(e.target.value)}
                  placeholder={isSwahili ? 'Mtaa / Wilaya / Ghorofa' : 'Street / District / Floor'}
                  className="w-full bg-[#1A2E1C] border border-[#3A5068] rounded-xl px-3.5 py-2 text-sm text-white focus:outline-none focus:border-[#00C46A]"
                />
              </div>
              <div>
                <label className="text-xs text-[#8899AA] block mb-1">
                  {isSwahili ? 'Maelezo ya Ziada / Maagizo' : 'Delivery Notes & Cadence'}
                </label>
                <input
                  type="text"
                  value={notes}
                  onChange={(e) => setNotes(e.target.value)}
                  placeholder={isSwahili ? 'mfano: Chupa 18.9L kila Jumatatu asubuhi' : 'e.g. 18.9L Refills every Monday morning'}
                  className="w-full bg-[#1A2E1C] border border-[#3A5068] rounded-xl px-3.5 py-2 text-sm text-white focus:outline-none focus:border-[#00C46A]"
                />
              </div>

              <div className="flex gap-2 pt-2">
                <button
                  type="button"
                  onClick={() => setShowAddModal(false)}
                  className="flex-1 px-4 py-2.5 rounded-xl border border-[#3A5068] text-[#8899AA] hover:text-white text-xs font-semibold"
                >
                  {isSwahili ? 'Ghairi' : 'Cancel'}
                </button>
                <button
                  type="submit"
                  className="flex-1 px-4 py-2.5 rounded-xl bg-[#00C46A] hover:bg-[#008F50] text-[#0A1A0F] text-xs font-bold shadow-md"
                >
                  {isSwahili ? 'Hifadhi & Sawazisha Supabase' : 'Save & Log to Supabase'}
                </button>
              </div>
            </form>
          </div>
        </div>
      )}
    </div>
  );
};

