import React, { useState, useEffect } from 'react';
import { useAuth } from '../context/AuthContext';
import { useLanguage } from '../context/LanguageContext';
import { storageService } from '../services/storage';
import { Order, EodReport, ProofImage } from '../types';
import { SupervisorLiveMap } from '../components/SupervisorLiveMap';
import {
  ShieldCheck,
  CheckCircle2,
  XCircle,
  Users,
  Clock,
  DollarSign,
  Truck,
  AlertTriangle,
  MapPin,
  Radio,
  FileCheck,
  ChevronRight,
  Eye,
  Plus,
  RefreshCw,
  Bell,
  Check,
} from 'lucide-react';

interface SupervisorHomeScreenProps {
  onNavigate: (view: string) => void;
}

export const SupervisorHomeScreen: React.FC<SupervisorHomeScreenProps> = ({ onNavigate }) => {
  const { user } = useAuth();
  const { isSwahili } = useLanguage();
  const [activeTab, setActiveTab] = useState<'overview' | 'map' | 'orders' | 'eod'>('overview');
  const [orders, setOrders] = useState<Order[]>([]);
  const [reports, setReports] = useState<EodReport[]>([]);
  const [feedback, setFeedback] = useState<string | null>(null);
  const [selectedProofImage, setSelectedProofImage] = useState<ProofImage | null>(null);

  const loadData = () => {
    setOrders(storageService.getOrders());
    setReports(storageService.getReports());
  };

  useEffect(() => {
    loadData();
    const interval = setInterval(loadData, 10000);
    return () => clearInterval(interval);
  }, []);

  const pendingOrders = orders.filter((o) => o.status === 'pending');
  const approvedOrders = orders.filter((o) => o.status === 'approved');
  const pendingReports = reports.filter((r) => r.syncStatus === 'submitted' || r.syncStatus === 'pending');
  const totalPlantRevenue = approvedOrders.reduce((sum, o) => sum + o.subtotal, 0);

  const handleApproveOrder = (orderId: string) => {
    storageService.updateOrderStatus(orderId, 'approved');
    loadData();
    setFeedback(isSwahili ? `Agizo ${orderId} limeidhinishwa kikamilifu!` : `Order ${orderId} approved successfully!`);
    setTimeout(() => setFeedback(null), 3000);
  };

  const handleRejectOrder = (orderId: string) => {
    storageService.updateOrderStatus(orderId, 'rejected');
    loadData();
    setFeedback(isSwahili ? `Agizo ${orderId} limekataliwa.` : `Order ${orderId} was rejected.`);
    setTimeout(() => setFeedback(null), 3000);
  };

  const handleApproveReport = (reportId: string) => {
    storageService.updateReportStatus(reportId, 'reviewed');
    loadData();
    setFeedback(isSwahili ? `Ripoti ya EOD ${reportId} imethibitishwa.` : `EOD Report ${reportId} marked as verified.`);
    setTimeout(() => setFeedback(null), 3000);
  };

  return (
    <div className="max-w-7xl mx-auto space-y-6 pb-24 md:pb-12">
      {/* Supervisor Mission Control Header */}
      <div className="bg-gradient-to-r from-[#0C2214] via-[#0E2818] to-[#122438] border border-[#243447] rounded-2xl p-5 shadow-xl relative overflow-hidden">
        <div className="absolute -right-8 -top-8 w-40 h-40 bg-blue-500/10 rounded-full blur-3xl pointer-events-none" />
        <div className="flex flex-col md:flex-row md:items-center justify-between gap-4 relative z-10">
          <div className="flex items-center gap-3.5">
            <div className="w-12 h-12 rounded-xl bg-blue-500/20 border border-blue-500/40 flex items-center justify-center text-blue-400 shadow-md">
              <ShieldCheck className="w-7 h-7" />
            </div>
            <div>
              <div className="flex items-center gap-2">
                <h1 className="text-xl sm:text-2xl font-black text-white tracking-tight">
                  {user?.name || 'Noah Philemon'}
                </h1>
                <span className="inline-flex items-center gap-1 px-2.5 py-0.5 rounded-full text-[10px] font-black uppercase tracking-wider bg-blue-500/20 text-blue-300 border border-blue-500/40">
                  <span className="w-1.5 h-1.5 rounded-full bg-blue-400 animate-pulse" />
                  Supervisor
                </span>
                <span className="text-xs px-2 py-0.5 rounded-md bg-[#122010] text-[#00C46A] border border-[#2A5038] font-mono">
                  {user?.plant || 'Mwanza Plant'}
                </span>
              </div>
              <p className="text-xs text-[#8899AA] mt-0.5 flex items-center gap-2">
                <span>{user?.title || 'Plant Operations Supervisor'}</span>
                <span>&bull;</span>
                <span className="font-mono text-[#D0E8F0]">ID: {user?.employeeId || 'ZZ-MWZ-SUP-01'}</span>
                <span>&bull;</span>
                <span className="text-[#00C46A] flex items-center gap-1">
                  <Radio className="w-3 h-3 animate-pulse" /> Lake Zone Live Dispatch
                </span>
              </p>
            </div>
          </div>

          <div className="flex items-center gap-2">
            <button
              onClick={() => onNavigate('orders')}
              className="flex items-center gap-1.5 px-3.5 py-2 bg-[#006B3C] hover:bg-[#008A4D] text-white rounded-xl text-xs font-bold transition shadow-sm"
            >
              <Plus className="w-4 h-4" />
              <span>{isSwahili ? 'Agizo la Haraka' : 'Create Order'}</span>
            </button>
            <button
              onClick={() => onNavigate('messages')}
              className="flex items-center gap-1.5 px-3.5 py-2 bg-[#1A2E1C] hover:bg-[#243E26] text-white rounded-xl text-xs font-semibold border border-[#2A5038] transition"
            >
              <Radio className="w-3.5 h-3.5 text-blue-400" />
              <span>{isSwahili ? 'Mawasiliano ya Redio' : 'Radio Broadcast'}</span>
            </button>
            <button
              onClick={loadData}
              title="Refresh Data"
              className="p-2 bg-[#122010] hover:bg-[#1A2E1C] text-[#8899AA] hover:text-white rounded-xl border border-[#243447] transition"
            >
              <RefreshCw className="w-4 h-4" />
            </button>
          </div>
        </div>
      </div>

      {feedback && (
        <div className="bg-blue-950/50 border border-blue-500/50 p-3.5 rounded-xl flex items-center gap-2.5 text-xs text-blue-200 shadow-lg">
          <CheckCircle2 className="w-4 h-4 text-blue-400 shrink-0" />
          <span className="font-medium">{feedback}</span>
        </div>
      )}

      {/* KPI Metrics Dashboard */}
      <div className="grid grid-cols-2 lg:grid-cols-4 gap-3.5">
        <div
          onClick={() => setActiveTab('orders')}
          className="bg-[#0D1E12] border border-[#243447] hover:border-amber-500/50 p-4 rounded-xl cursor-pointer transition-all hover:bg-[#122418]"
        >
          <div className="flex items-center justify-between text-[#8899AA] text-xs font-medium mb-2">
            <span>{isSwahili ? 'Maagizo Yanasubiri' : 'Pending Approvals'}</span>
            <Clock className="w-4 h-4 text-amber-400" />
          </div>
          <div className="flex items-baseline gap-2">
            <span className="text-2xl font-black text-white">{pendingOrders.length}</span>
            <span className="text-[11px] text-amber-400 font-medium">{isSwahili ? 'Inahitaji Idhini' : 'Requires Action'}</span>
          </div>
          <p className="text-[10px] text-[#8899AA] mt-1">
            {pendingOrders.reduce((s, o) => s + o.subtotal, 0).toLocaleString()} TZS {isSwahili ? 'Jumla' : 'total value'}
          </p>
        </div>

        <div
          onClick={() => setActiveTab('eod')}
          className="bg-[#0D1E12] border border-[#243447] hover:border-blue-500/50 p-4 rounded-xl cursor-pointer transition-all hover:bg-[#122418]"
        >
          <div className="flex items-center justify-between text-[#8899AA] text-xs font-medium mb-2">
            <span>{isSwahili ? 'Ripoti za EOD' : 'Pending EOD Reports'}</span>
            <FileCheck className="w-4 h-4 text-blue-400" />
          </div>
          <div className="flex items-baseline gap-2">
            <span className="text-2xl font-black text-white">{pendingReports.length}</span>
            <span className="text-[11px] text-blue-300 font-medium">{isSwahili ? 'Zilizo Wasilishwa' : 'Submitted'}</span>
          </div>
          <p className="text-[10px] text-[#8899AA] mt-1">
            {isSwahili ? 'Upatanisho wa pesa na chupa' : 'Cash & bottle reconciliations'}
          </p>
        </div>

        <div
          onClick={() => setActiveTab('map')}
          className="bg-[#0D1E12] border border-[#243447] hover:border-[#00C46A]/50 p-4 rounded-xl cursor-pointer transition-all hover:bg-[#122418]"
        >
          <div className="flex items-center justify-between text-[#8899AA] text-xs font-medium mb-2">
            <span>{isSwahili ? 'Magari Nyanjani' : 'Fleet Active on Route'}</span>
            <Truck className="w-4 h-4 text-[#00C46A]" />
          </div>
          <div className="flex items-baseline gap-2">
            <span className="text-2xl font-black text-white">4</span>
            <span className="text-[11px] text-[#00C46A] font-medium">{isSwahili ? 'Njia za Mwanza' : 'Lake Zone'}</span>
          </div>
          <p className="text-[10px] text-[#8899AA] mt-1">Capripoint, Kirumba, Nyegezi & Buzuruga</p>
        </div>

        <div className="bg-[#0D1E12] border border-[#243447] p-4 rounded-xl">
          <div className="flex items-center justify-between text-[#8899AA] text-xs font-medium mb-2">
            <span>{isSwahili ? 'Mapato ya Leo' : 'Approved Revenue'}</span>
            <DollarSign className="w-4 h-4 text-[#00C46A]" />
          </div>
          <div className="flex items-baseline gap-2">
            <span className="text-xl font-black text-white">{totalPlantRevenue.toLocaleString()}</span>
            <span className="text-[11px] text-[#8899AA]">TZS</span>
          </div>
          <p className="text-[10px] text-[#00C46A] mt-1 font-medium">{approvedOrders.length} {isSwahili ? 'maagizo yameidhinishwa' : 'orders confirmed'}</p>
        </div>
      </div>

      {/* Tabs */}
      <div className="flex bg-[#122010] p-1.5 rounded-xl border border-[#243447] gap-1 overflow-x-auto">
        <button
          onClick={() => setActiveTab('overview')}
          className={`flex-1 min-w-[130px] py-2 rounded-lg text-xs font-bold transition-all flex items-center justify-center gap-2 ${
            activeTab === 'overview' ? 'bg-[#006B3C] text-white shadow' : 'text-[#8899AA] hover:text-white'
          }`}
        >
          <span>{isSwahili ? 'Muhtasari wa Usimamizi' : 'Supervisor Hub'}</span>
        </button>

        <button
          onClick={() => setActiveTab('map')}
          className={`flex-1 min-w-[130px] py-2 rounded-lg text-xs font-bold transition-all flex items-center justify-center gap-2 ${
            activeTab === 'map' ? 'bg-[#006B3C] text-white shadow' : 'text-[#8899AA] hover:text-white'
          }`}
        >
          <Radio className="w-3.5 h-3.5 text-[#00C46A] animate-pulse" />
          <span>{isSwahili ? 'Ramani ya GPS' : 'Live Fleet Map'}</span>
        </button>

        <button
          onClick={() => setActiveTab('orders')}
          className={`flex-1 min-w-[130px] py-2 rounded-lg text-xs font-bold transition-all flex items-center justify-center gap-2 ${
            activeTab === 'orders' ? 'bg-[#006B3C] text-white shadow' : 'text-[#8899AA] hover:text-white'
          }`}
        >
          <span>{isSwahili ? 'Idhini ya Maagizo' : 'Order Approvals'}</span>
          {pendingOrders.length > 0 && (
            <span className="bg-[#F59E0B] text-[#0A1A0F] text-[10px] font-black px-1.5 py-0.2 rounded-full">
              {pendingOrders.length}
            </span>
          )}
        </button>

        <button
          onClick={() => setActiveTab('eod')}
          className={`flex-1 min-w-[130px] py-2 rounded-lg text-xs font-bold transition-all flex items-center justify-center gap-2 ${
            activeTab === 'eod' ? 'bg-[#006B3C] text-white shadow' : 'text-[#8899AA] hover:text-white'
          }`}
        >
          <span>{isSwahili ? 'Upatanisho wa EOD' : 'EOD Verification'}</span>
          {pendingReports.length > 0 && (
            <span className="bg-blue-400 text-[#0A1A0F] text-[10px] font-black px-1.5 py-0.2 rounded-full">
              {pendingReports.length}
            </span>
          )}
        </button>
      </div>

      {/* Tab: Live Map */}
      {activeTab === 'map' && (
        <div className="space-y-4">
          <div className="bg-[#0D1E12] border border-[#243447] rounded-xl p-4">
            <SupervisorLiveMap onNavigate={onNavigate} />
          </div>
        </div>
      )}

      {/* Tab: Overview */}
      {activeTab === 'overview' && (
        <div className="space-y-6">
          {/* Quick Pending Approvals Alert Banner */}
          {pendingOrders.length > 0 && (
            <div className="bg-amber-950/40 border border-amber-500/40 rounded-xl p-4 flex flex-col sm:flex-row sm:items-center justify-between gap-3">
              <div className="flex items-center gap-3">
                <AlertTriangle className="w-5 h-5 text-amber-400 shrink-0" />
                <div>
                  <h4 className="text-sm font-bold text-white">
                    {pendingOrders.length} {isSwahili ? 'Maagizo yanahitaji idhini yako ya usimamizi' : 'Orders pending supervisor authorization'}
                  </h4>
                  <p className="text-xs text-[#8899AA] mt-0.5">
                    {isSwahili ? 'Weka idhini ili madereva na wasambazaji waweze kuanza safari' : 'Approve to allow drivers and delivery teams to proceed'}
                  </p>
                </div>
              </div>
              <button
                onClick={() => setActiveTab('orders')}
                className="px-4 py-1.5 bg-amber-500 hover:bg-amber-400 text-[#0A1A0F] font-bold text-xs rounded-lg transition"
              >
                {isSwahili ? 'Kagua Sasa' : 'Review Queue'}
              </button>
            </div>
          )}

          <div className="grid grid-cols-1 lg:grid-cols-3 gap-6">
            {/* Left: Pending Approval Orders list */}
            <div className="lg:col-span-2 space-y-4">
              <div className="flex items-center justify-between">
                <h3 className="text-sm font-bold text-white flex items-center gap-2">
                  <Clock className="w-4 h-4 text-amber-400" />
                  <span>{isSwahili ? 'Foleni ya Idhini ya Maagizo' : 'Immediate Authorization Queue'}</span>
                </h3>
                <button
                  onClick={() => setActiveTab('orders')}
                  className="text-xs text-[#00C46A] hover:underline"
                >
                  {isSwahili ? 'Tazama yote' : 'View full queue'} &rarr;
                </button>
              </div>

              {pendingOrders.length === 0 ? (
                <div className="bg-[#0D1E12] border border-[#243447] rounded-xl p-8 text-center">
                  <CheckCircle2 className="w-10 h-10 text-[#00C46A] mx-auto mb-2 opacity-80" />
                  <p className="text-sm font-semibold text-white">{isSwahili ? 'Hakuna maagizo yanayosubiri idhini' : 'No orders awaiting supervisor approval'}</p>
                  <p className="text-xs text-[#8899AA] mt-1">{isSwahili ? 'Maagizo yote yamethibitishwa kwa mafanikio.' : 'All field orders are verified and cleared for dispatch.'}</p>
                </div>
              ) : (
                <div className="space-y-3">
                  {pendingOrders.slice(0, 4).map((order) => (
                    <div
                      key={order.id}
                      className="bg-[#0D1E12] border border-[#243447] hover:border-[#3A5068] rounded-xl p-4 transition-all"
                    >
                      <div className="flex flex-col sm:flex-row sm:items-center justify-between gap-2 border-b border-[#1A2E1C] pb-2.5 mb-2.5">
                        <div>
                          <div className="flex items-center gap-2">
                            <span className="text-xs font-mono font-bold text-white">{order.id}</span>
                            <span className="px-2 py-0.5 rounded text-[10px] font-bold bg-amber-500/20 text-amber-300 border border-amber-500/40 uppercase">
                              {order.paymentMethod || 'Cash'}
                            </span>
                          </div>
                          <p className="text-xs font-semibold text-white mt-1">{order.customerName}</p>
                          <p className="text-[11px] text-[#8899AA]">{order.customerAddress || 'Mwanza'}</p>
                        </div>
                        <div className="text-right">
                          <span className="text-base font-black text-[#00C46A]">{order.subtotal.toLocaleString()} TZS</span>
                          <p className="text-[10px] text-[#8899AA]">{order.items.reduce((s, i) => s + (i.qty || 1), 0)} {isSwahili ? 'chupa' : 'bottles'}</p>
                        </div>
                      </div>

                      <div className="flex items-center justify-between pt-1">
                        <span className="text-[11px] text-[#8899AA]">
                          {isSwahili ? 'Mfanyakazi' : 'Staff'}: <span className="text-white font-mono">{order.staffId || 'ZZ-FIELD'}</span>
                        </span>
                        <div className="flex items-center gap-2">
                          <button
                            onClick={() => handleRejectOrder(order.id)}
                            className="px-3 py-1 bg-red-900/30 hover:bg-red-900/50 text-red-300 border border-red-800/40 rounded-lg text-xs font-bold transition flex items-center gap-1"
                          >
                            <XCircle className="w-3.5 h-3.5" />
                            <span>{isSwahili ? 'Kataa' : 'Reject'}</span>
                          </button>
                          <button
                            onClick={() => handleApproveOrder(order.id)}
                            className="px-3.5 py-1 bg-[#006B3C] hover:bg-[#008A4D] text-white rounded-lg text-xs font-bold transition flex items-center gap-1 shadow-sm"
                          >
                            <Check className="w-3.5 h-3.5" />
                            <span>{isSwahili ? 'Idhinisha' : 'Approve'}</span>
                          </button>
                        </div>
                      </div>
                    </div>
                  ))}
                </div>
              )}
            </div>

            {/* Right: Operational Status & Shortcuts */}
            <div className="space-y-4">
              <div className="bg-[#0D1E12] border border-[#243447] rounded-xl p-4 space-y-3">
                <h3 className="text-xs font-bold text-white uppercase tracking-wider text-[#8899AA]">
                  {isSwahili ? 'Hali ya Kituo cha Mwanza' : 'Mwanza Plant Operations'}
                </h3>
                <div className="space-y-2 text-xs">
                  <div className="flex items-center justify-between p-2 rounded-lg bg-[#122010] border border-[#1A2E1C]">
                    <span className="text-[#8899AA]">{isSwahili ? 'Msimamizi wa Zamu' : 'Duty Supervisor'}:</span>
                    <span className="text-white font-bold">Noah Philemon</span>
                  </div>
                  <div className="flex items-center justify-between p-2 rounded-lg bg-[#122010] border border-[#1A2E1C]">
                    <span className="text-[#8899AA]">{isSwahili ? 'Mratibu wa Usambazaji' : 'Fleet Dispatcher'}:</span>
                    <span className="text-white font-bold">Grace Matiku</span>
                  </div>
                  <div className="flex items-center justify-between p-2 rounded-lg bg-[#122010] border border-[#1A2E1C]">
                    <span className="text-[#8899AA]">{isSwahili ? 'Meneja wa Kiwanda' : 'Plant Manager'}:</span>
                    <span className="text-white font-bold">Aaliyah Salehe</span>
                  </div>
                </div>

                <div className="pt-2 border-t border-[#1A2E1C] space-y-2">
                  <button
                    onClick={() => setActiveTab('map')}
                    className="w-full py-2 bg-[#1A2E1C] hover:bg-[#243E26] text-white rounded-lg text-xs font-bold border border-[#2A5038] transition flex items-center justify-center gap-2"
                  >
                    <Truck className="w-4 h-4 text-[#00C46A]" />
                    <span>{isSwahili ? 'Fuatilia Magari ya Lake Zone' : 'Track Lake Zone Fleet'}</span>
                  </button>
                  <button
                    onClick={() => onNavigate('messages')}
                    className="w-full py-2 bg-[#122010] hover:bg-[#1A2E1C] text-[#8899AA] hover:text-white rounded-lg text-xs font-medium border border-[#243447] transition flex items-center justify-center gap-2"
                  >
                    <Radio className="w-4 h-4 text-blue-400" />
                    <span>{isSwahili ? 'Tuma Ujumbe wa Timu' : 'Team Broadcast Radio'}</span>
                  </button>
                  <button
                    onClick={() => onNavigate('forms')}
                    className="w-full py-2 bg-[#122010] hover:bg-[#1A2E1C] text-[#8899AA] hover:text-white rounded-lg text-xs font-medium border border-[#243447] transition flex items-center justify-center gap-2"
                  >
                    <FileCheck className="w-4 h-4 text-[#00C46A]" />
                    <span>{isSwahili ? 'Fomu za Google & Kaguzi' : 'Google Forms & Audit Checklists'}</span>
                  </button>
                </div>
              </div>
            </div>
          </div>
        </div>
      )}

      {/* Tab: Orders Full Authorization Queue */}
      {activeTab === 'orders' && (
        <div className="space-y-4">
          <div className="flex items-center justify-between">
            <div>
              <h3 className="text-base font-bold text-white flex items-center gap-2">
                <ShieldCheck className="w-5 h-5 text-blue-400" />
                <span>{isSwahili ? 'Uthibitishaji Kamili wa Maagizo' : 'All Orders Authorization Queue'}</span>
              </h3>
              <p className="text-xs text-[#8899AA]">
                {isSwahili ? 'Kagua, thibitisha au kataa maagizo ya maji yaliyowekwa na wafanyakazi wa nyanjani.' : 'Review, authorize, or reject delivery orders submitted by field teams.'}
              </p>
            </div>
          </div>

          {orders.length === 0 ? (
            <div className="bg-[#0D1E12] border border-[#243447] rounded-xl p-8 text-center">
              <p className="text-sm text-[#8899AA]">{isSwahili ? 'Hakuna maagizo kwenye kumbukumbu.' : 'No orders in system records.'}</p>
            </div>
          ) : (
            <div className="space-y-3">
              {orders.map((order) => (
                <div
                  key={order.id}
                  className={`bg-[#0D1E12] border rounded-xl p-4 transition-all ${
                    order.status === 'pending'
                      ? 'border-amber-500/50 bg-amber-950/10'
                      : order.status === 'approved'
                      ? 'border-[#00C46A]/30'
                      : 'border-red-500/30'
                  }`}
                >
                  <div className="flex flex-col sm:flex-row sm:items-center justify-between gap-2 pb-2 mb-2 border-b border-[#1A2E1C]">
                    <div>
                      <div className="flex items-center gap-2">
                        <span className="text-xs font-mono font-bold text-white">{order.id}</span>
                        <span
                          className={`px-2 py-0.5 rounded text-[10px] font-bold uppercase ${
                            order.status === 'approved'
                              ? 'bg-[#006B3C]/40 text-[#00C46A] border border-[#00C46A]/40'
                              : order.status === 'rejected'
                              ? 'bg-red-900/40 text-red-300 border border-red-800/40'
                              : 'bg-amber-500/20 text-amber-300 border border-amber-500/40'
                          }`}
                        >
                          {order.status}
                        </span>
                        <span className="text-xs font-mono text-[#8899AA]">{order.paymentMethod}</span>
                      </div>
                      <p className="text-sm font-semibold text-white mt-1">{order.customerName}</p>
                      <p className="text-xs text-[#8899AA]">{order.customerAddress || 'Mwanza Plant Territory'}</p>
                    </div>

                    <div className="text-right">
                      <span className="text-lg font-black text-[#00C46A]">{order.subtotal.toLocaleString()} TZS</span>
                      <p className="text-xs text-[#8899AA]">
                        {order.items.map((i) => `${i.name} x${i.qty}`).join(', ')}
                      </p>
                    </div>
                  </div>

                  <div className="flex items-center justify-between pt-1">
                    <span className="text-xs text-[#8899AA]">
                      {new Date(order.createdAt).toLocaleTimeString([], { hour: '2-digit', minute: '2-digit' })} &bull; Staff: {order.staffId || 'ZZ-FIELD'}
                    </span>

                    {order.status === 'pending' && (
                      <div className="flex items-center gap-2">
                        <button
                          onClick={() => handleRejectOrder(order.id)}
                          className="px-3 py-1 bg-red-900/30 hover:bg-red-900/50 text-red-300 border border-red-800/40 rounded-lg text-xs font-bold transition flex items-center gap-1"
                        >
                          <XCircle className="w-3.5 h-3.5" />
                          <span>{isSwahili ? 'Kataa' : 'Reject'}</span>
                        </button>
                        <button
                          onClick={() => handleApproveOrder(order.id)}
                          className="px-4 py-1 bg-[#006B3C] hover:bg-[#008A4D] text-white rounded-lg text-xs font-bold transition flex items-center gap-1 shadow-sm"
                        >
                          <Check className="w-3.5 h-3.5" />
                          <span>{isSwahili ? 'Idhinisha' : 'Authorize Order'}</span>
                        </button>
                      </div>
                    )}
                  </div>
                </div>
              ))}
            </div>
          )}
        </div>
      )}

      {/* Tab: EOD Verification */}
      {activeTab === 'eod' && (
        <div className="space-y-4">
          <div>
            <h3 className="text-base font-bold text-white flex items-center gap-2">
              <FileCheck className="w-5 h-5 text-blue-400" />
              <span>{isSwahili ? 'Upatanisho wa Mwisho wa Siku (EOD)' : 'End of Day (EOD) Reconciliation Queue'}</span>
            </h3>
            <p className="text-xs text-[#8899AA]">
              {isSwahili ? 'Thibitisha ripoti rasmi za mauzo, fedha taslimu zilizokusanywa, na idadi ya chupa zilizorejeshwa.' : 'Verify staff revenue reports, cash envelopes collected, and empty bottle returns.'}
            </p>
          </div>

          {reports.length === 0 ? (
            <div className="bg-[#0D1E12] border border-[#243447] rounded-xl p-8 text-center">
              <p className="text-sm text-[#8899AA]">{isSwahili ? 'Hakuna ripoti za EOD zilizowasilishwa bado.' : 'No EOD reports submitted yet.'}</p>
            </div>
          ) : (
            <div className="space-y-4">
              {reports.map((report) => (
                <div
                  key={report.id}
                  className="bg-[#0D1E12] border border-[#243447] rounded-xl p-4 space-y-3"
                >
                  <div className="flex flex-col sm:flex-row sm:items-center justify-between gap-2 border-b border-[#1A2E1C] pb-2">
                    <div>
                      <div className="flex items-center gap-2">
                        <span className="text-xs font-mono font-bold text-white">{report.id}</span>
                        <span
                          className={`px-2 py-0.5 rounded text-[10px] font-bold uppercase ${
                            report.syncStatus === 'reviewed'
                              ? 'bg-[#006B3C]/40 text-[#00C46A] border border-[#00C46A]/40'
                              : 'bg-blue-500/20 text-blue-300 border border-blue-500/40'
                          }`}
                        >
                          {report.syncStatus}
                        </span>
                      </div>
                      <p className="text-xs font-medium text-white mt-1">Staff: {report.staffId}</p>
                    </div>

                    <div className="text-right">
                      <span className="text-base font-black text-white">{report.totalRevenue.toLocaleString()} TZS</span>
                      <p className="text-xs text-[#8899AA]">{report.deliveredCount} {isSwahili ? 'chupa zilisambazwa' : 'bottles delivered'}</p>
                    </div>
                  </div>

                  {report.proofImages && report.proofImages.length > 0 && (
                    <div className="flex items-center gap-2 overflow-x-auto py-1">
                      {report.proofImages.map((img) => (
                        <div
                          key={img.id}
                          onClick={() => setSelectedProofImage(img)}
                          className="relative w-16 h-16 rounded-lg overflow-hidden border border-[#243447] cursor-pointer shrink-0 hover:opacity-80"
                        >
                          <img src={img.dataUrl} alt={img.category} className="w-full h-full object-cover" />
                          <span className="absolute bottom-0 inset-x-0 bg-black/70 text-[8px] text-white text-center py-0.5 truncate">
                            {img.category}
                          </span>
                        </div>
                      ))}
                    </div>
                  )}

                  <div className="flex items-center justify-between pt-1">
                    <span className="text-xs text-[#8899AA]">
                      {new Date(report.reportDate || report.createdAt).toLocaleDateString()}
                    </span>
                    {report.syncStatus !== 'reviewed' && (
                      <button
                        onClick={() => handleApproveReport(report.id)}
                        className="px-3.5 py-1.5 bg-[#006B3C] hover:bg-[#008A4D] text-white rounded-lg text-xs font-bold transition flex items-center gap-1 shadow-sm"
                      >
                        <Check className="w-3.5 h-3.5" />
                        <span>{isSwahili ? 'Thibitisha na Weka Sahihi' : 'Verify & Sign-off'}</span>
                      </button>
                    )}
                  </div>
                </div>
              ))}
            </div>
          )}
        </div>
      )}

      {/* Proof Image Modal */}
      {selectedProofImage && (
        <div className="fixed inset-0 z-50 bg-black/80 flex items-center justify-center p-4" onClick={() => setSelectedProofImage(null)}>
          <div className="bg-[#0D1E12] border border-[#243447] max-w-lg w-full rounded-2xl p-4 overflow-hidden" onClick={(e) => e.stopPropagation()}>
            <div className="flex items-center justify-between pb-3 border-b border-[#1A2E1C]">
              <h4 className="text-sm font-bold text-white capitalize">{selectedProofImage.category}</h4>
              <button onClick={() => setSelectedProofImage(null)} className="text-[#8899AA] hover:text-white text-sm font-bold">X</button>
            </div>
            <div className="my-4 max-h-[70vh] flex items-center justify-center bg-black/40 rounded-xl overflow-hidden">
              <img src={selectedProofImage.dataUrl} alt="Proof" className="max-h-[60vh] object-contain" />
            </div>
            <p className="text-xs text-[#8899AA] text-center">Captured: {new Date(selectedProofImage.uploadedAt).toLocaleString()}</p>
          </div>
        </div>
      )}
    </div>
  );
};
