import React, { useState, useEffect } from 'react';
import { useAuth } from '../context/AuthContext';
import { useLanguage } from '../context/LanguageContext';
import { storageService } from '../services/storage';
import { Order, TimelineTask } from '../types';
import { DeliveryForecastOptimizer } from '../components/DeliveryForecastOptimizer';
import {
  TrendingUp,
  BarChart3,
  DollarSign,
  Package,
  Award,
  Users,
  MapPin,
  Calendar,
  Sparkles,
  Layers,
  ArrowUpRight,
  ShieldCheck,
  FileSpreadsheet,
  History,
  CheckCircle2,
  RefreshCw,
} from 'lucide-react';

interface ManagerHomeScreenProps {
  onNavigate: (view: string) => void;
}

export const ManagerHomeScreen: React.FC<ManagerHomeScreenProps> = ({ onNavigate }) => {
  const { user } = useAuth();
  const { isSwahili } = useLanguage();
  const [orders, setOrders] = useState<Order[]>([]);
  const [activeTab, setActiveTab] = useState<'executive' | 'forecast' | 'inventory'>('executive');

  const loadData = () => {
    setOrders(storageService.getOrders());
  };

  useEffect(() => {
    loadData();
    const interval = setInterval(loadData, 15000);
    return () => clearInterval(interval);
  }, []);

  const totalRevenue = orders.reduce((sum, o) => sum + o.subtotal, 0) + 1850000;
  const approvedOrdersCount = orders.filter((o) => o.status === 'approved').length + 42;
  const targetMonthlyProgress = 76; // 76% of monthly quota

  const lakeZoneRegionalRevenue = [
    { zone: isSwahili ? 'Nyakato & Buzuruga' : 'Nyakato & Buzuruga', pct: 36, revenue: 'TZS 666,000' },
    { zone: isSwahili ? 'Capripoint Waterfront & CBD' : 'Capripoint & CBD', pct: 32, revenue: 'TZS 592,000' },
    { zone: isSwahili ? 'Kirumba & Airport Road' : 'Kirumba & Airport Rd', pct: 20, revenue: 'TZS 370,000' },
    { zone: isSwahili ? 'Nyegezi & Butimba' : 'Nyegezi & Butimba', pct: 12, revenue: 'TZS 222,000' },
  ];

  const staffPerformance = [
    { name: 'Juma Ramadhani', id: 'ZZ-MWZ-002', route: 'Capripoint & CBD', revenue: 780000, deliveries: 16, rate: '98%' },
    { name: 'Salim Bakari', id: 'ZZ-MWZ-001', route: 'Nyakato & Buzuruga', revenue: 650000, deliveries: 14, rate: '96%' },
    { name: 'Baraka Mushi', id: 'ZZ-MWZ-003', route: 'Kirumba & Airport', revenue: 590000, deliveries: 12, rate: '94%' },
    { name: 'Ali Hassan', id: 'ZZ-MWZ-004', route: 'Nyegezi & Butimba', revenue: 480000, deliveries: 10, rate: '92%' },
  ];

  return (
    <div className="max-w-7xl mx-auto space-y-6 pb-24 md:pb-12">
      {/* Executive Command Header */}
      <div className="bg-gradient-to-r from-[#171226] via-[#1A182E] to-[#122218] border border-[#243447] rounded-2xl p-5 shadow-xl relative overflow-hidden">
        <div className="absolute -right-8 -top-8 w-40 h-40 bg-purple-500/10 rounded-full blur-3xl pointer-events-none" />
        <div className="flex flex-col md:flex-row md:items-center justify-between gap-4 relative z-10">
          <div className="flex items-center gap-3.5">
            <div className="w-12 h-12 rounded-xl bg-purple-500/20 border border-purple-500/40 flex items-center justify-center text-purple-400 shadow-md">
              <TrendingUp className="w-7 h-7" />
            </div>
            <div>
              <div className="flex items-center gap-2">
                <h1 className="text-xl sm:text-2xl font-black text-white tracking-tight">
                  {user?.name || 'Aaliyah Salehe'}
                </h1>
                <span className="inline-flex items-center gap-1 px-2.5 py-0.5 rounded-full text-[10px] font-black uppercase tracking-wider bg-purple-500/20 text-purple-300 border border-purple-500/40">
                  <span className="w-1.5 h-1.5 rounded-full bg-purple-400 animate-pulse" />
                  General Manager
                </span>
                <span className="text-xs px-2 py-0.5 rounded-md bg-[#122010] text-[#00C46A] border border-[#2A5038] font-mono">
                  {user?.plant || 'Mwanza Plant'}
                </span>
              </div>
              <p className="text-xs text-[#8899AA] mt-0.5 flex items-center gap-2">
                <span>{user?.title || 'Mwanza Plant General Manager'}</span>
                <span>&bull;</span>
                <span className="font-mono text-[#D0E8F0]">ID: {user?.employeeId || 'ZZ-MWZ-MGR-01'}</span>
                <span>&bull;</span>
                <span className="text-purple-300">Executive Leadership Hub</span>
              </p>
            </div>
          </div>

          <div className="flex items-center gap-2">
            <button
              onClick={() => onNavigate('analytics')}
              className="flex items-center gap-1.5 px-3.5 py-2 bg-purple-600 hover:bg-purple-500 text-white rounded-xl text-xs font-bold transition shadow-sm"
            >
              <BarChart3 className="w-4 h-4" />
              <span>{isSwahili ? 'Takwimu Kamili' : 'Deep Analytics'}</span>
            </button>
            <button
              onClick={() => onNavigate('reports')}
              className="flex items-center gap-1.5 px-3.5 py-2 bg-[#1A2E1C] hover:bg-[#243E26] text-white rounded-xl text-xs font-semibold border border-[#2A5038] transition"
            >
              <FileSpreadsheet className="w-3.5 h-3.5 text-[#00C46A]" />
              <span>{isSwahili ? 'Kaguzi za EOD' : 'EOD Audits'}</span>
            </button>
            <button
              onClick={loadData}
              className="p-2 bg-[#122010] hover:bg-[#1A2E1C] text-[#8899AA] hover:text-white rounded-xl border border-[#243447] transition"
            >
              <RefreshCw className="w-4 h-4" />
            </button>
          </div>
        </div>
      </div>

      {/* High-Level Executive KPIs */}
      <div className="grid grid-cols-2 lg:grid-cols-4 gap-3.5">
        <div className="bg-[#0D1E12] border border-[#243447] p-4 rounded-xl">
          <div className="flex items-center justify-between text-[#8899AA] text-xs font-medium mb-2">
            <span>{isSwahili ? 'Mapato ya Kiwanda Leo' : 'Total Plant Revenue'}</span>
            <DollarSign className="w-4 h-4 text-[#00C46A]" />
          </div>
          <div className="flex items-baseline gap-2">
            <span className="text-2xl font-black text-white">{totalRevenue.toLocaleString()}</span>
            <span className="text-[11px] text-[#8899AA]">TZS</span>
          </div>
          <p className="text-[10px] text-[#00C46A] mt-1 font-medium flex items-center gap-1">
            <ArrowUpRight className="w-3 h-3" /> +14.2% {isSwahili ? 'ikilinganishwa na wiki iliyopita' : 'vs last week'}
          </p>
        </div>

        <div className="bg-[#0D1E12] border border-[#243447] p-4 rounded-xl">
          <div className="flex items-center justify-between text-[#8899AA] text-xs font-medium mb-2">
            <span>{isSwahili ? 'Utekelezaji wa Lengo' : 'Monthly Target Attainment'}</span>
            <Award className="w-4 h-4 text-purple-400" />
          </div>
          <div className="flex items-baseline gap-2">
            <span className="text-2xl font-black text-white">{targetMonthlyProgress}%</span>
            <span className="text-[11px] text-purple-300 font-medium">On Track</span>
          </div>
          <div className="w-full h-1.5 bg-[#1A2E1C] rounded-full mt-2 overflow-hidden">
            <div className="h-full bg-purple-500 rounded-full" style={{ width: `${targetMonthlyProgress}%` }} />
          </div>
        </div>

        <div className="bg-[#0D1E12] border border-[#243447] p-4 rounded-xl">
          <div className="flex items-center justify-between text-[#8899AA] text-xs font-medium mb-2">
            <span>{isSwahili ? 'Chupa Zilizosambazwa' : 'Total Deliveries'}</span>
            <Package className="w-4 h-4 text-blue-400" />
          </div>
          <div className="flex items-baseline gap-2">
            <span className="text-2xl font-black text-white">{approvedOrdersCount}</span>
            <span className="text-[11px] text-blue-300 font-medium">Orders</span>
          </div>
          <p className="text-[10px] text-[#8899AA] mt-1">96.8% on-time delivery rate</p>
        </div>

        <div className="bg-[#0D1E12] border border-[#243447] p-4 rounded-xl">
          <div className="flex items-center justify-between text-[#8899AA] text-xs font-medium mb-2">
            <span>{isSwahili ? 'Ufanisi wa Meli' : 'Fleet Efficiency'}</span>
            <Layers className="w-4 h-4 text-amber-400" />
          </div>
          <div className="flex items-baseline gap-2">
            <span className="text-2xl font-black text-white">98.2%</span>
            <span className="text-[11px] text-[#00C46A] font-medium">Optimal</span>
          </div>
          <p className="text-[10px] text-[#8899AA] mt-1">4 Lake Zone routes covered</p>
        </div>
      </div>

      {/* Tabs */}
      <div className="flex bg-[#122010] p-1.5 rounded-xl border border-[#243447] gap-1 overflow-x-auto">
        <button
          onClick={() => setActiveTab('executive')}
          className={`flex-1 min-w-[140px] py-2 rounded-lg text-xs font-bold transition-all flex items-center justify-center gap-2 ${
            activeTab === 'executive' ? 'bg-purple-600 text-white shadow' : 'text-[#8899AA] hover:text-white'
          }`}
        >
          <TrendingUp className="w-3.5 h-3.5" />
          <span>{isSwahili ? 'Muhtasari wa Kiutendaji' : 'Executive Overview'}</span>
        </button>

        <button
          onClick={() => setActiveTab('forecast')}
          className={`flex-1 min-w-[140px] py-2 rounded-lg text-xs font-bold transition-all flex items-center justify-center gap-2 ${
            activeTab === 'forecast' ? 'bg-purple-600 text-white shadow' : 'text-[#8899AA] hover:text-white'
          }`}
        >
          <Sparkles className="w-3.5 h-3.5 text-amber-300" />
          <span>{isSwahili ? 'Utabiri wa Mahitaji' : 'Demand Forecasting'}</span>
        </button>

        <button
          onClick={() => setActiveTab('inventory')}
          className={`flex-1 min-w-[140px] py-2 rounded-lg text-xs font-bold transition-all flex items-center justify-center gap-2 ${
            activeTab === 'inventory' ? 'bg-purple-600 text-white shadow' : 'text-[#8899AA] hover:text-white'
          }`}
        >
          <Package className="w-3.5 h-3.5 text-[#00C46A]" />
          <span>{isSwahili ? 'Hifadhi ya Kiwanda' : 'Plant Inventory Stock'}</span>
        </button>
      </div>

      {/* Tab: Executive Overview */}
      {activeTab === 'executive' && (
        <div className="space-y-6">
          <div className="grid grid-cols-1 lg:grid-cols-2 gap-6">
            {/* Regional Performance */}
            <div className="bg-[#0D1E12] border border-[#243447] rounded-xl p-5 space-y-4">
              <div className="flex items-center justify-between">
                <h3 className="text-sm font-bold text-white flex items-center gap-2">
                  <MapPin className="w-4 h-4 text-[#00C46A]" />
                  <span>{isSwahili ? 'Mgawanyo wa Mapato Kikanda (Mwanza)' : 'Mwanza Zone Revenue Distribution'}</span>
                </h3>
                <span className="text-xs text-[#8899AA]">Today</span>
              </div>

              <div className="space-y-3">
                {lakeZoneRegionalRevenue.map((item, idx) => (
                  <div key={idx} className="space-y-1">
                    <div className="flex justify-between text-xs">
                      <span className="text-white font-medium">{item.zone}</span>
                      <span className="font-mono text-[#00C46A] font-bold">{item.revenue} ({item.pct}%)</span>
                    </div>
                    <div className="w-full h-2 bg-[#1A2E1C] rounded-full overflow-hidden">
                      <div
                        className="h-full bg-gradient-to-r from-[#00C46A] to-purple-500 rounded-full"
                        style={{ width: `${item.pct}%` }}
                      />
                    </div>
                  </div>
                ))}
              </div>
            </div>

            {/* Plant Leadership & Roster */}
            <div className="bg-[#0D1E12] border border-[#243447] rounded-xl p-5 space-y-4">
              <h3 className="text-sm font-bold text-white flex items-center gap-2">
                <ShieldCheck className="w-4 h-4 text-purple-400" />
                <span>{isSwahili ? 'Uongozi wa Kiwanda cha Mwanza' : 'Mwanza Plant Operational Officers'}</span>
              </h3>

              <div className="space-y-2.5">
                <div className="p-3 rounded-xl bg-[#122010] border border-[#1A2E1C] flex items-center justify-between">
                  <div>
                    <span className="text-xs font-bold text-white">Aaliyah Salehe</span>
                    <p className="text-[11px] text-[#8899AA]">Mwanza Plant General Manager</p>
                  </div>
                  <span className="px-2 py-0.5 rounded text-[10px] font-black uppercase bg-purple-500/20 text-purple-300 border border-purple-500/40">
                    Manager
                  </span>
                </div>

                <div className="p-3 rounded-xl bg-[#122010] border border-[#1A2E1C] flex items-center justify-between">
                  <div>
                    <span className="text-xs font-bold text-white">Noah Philemon</span>
                    <p className="text-[11px] text-[#8899AA]">Plant Operations Supervisor</p>
                  </div>
                  <span className="px-2 py-0.5 rounded text-[10px] font-black uppercase bg-blue-500/20 text-blue-300 border border-blue-500/40">
                    Supervisor
                  </span>
                </div>

                <div className="p-3 rounded-xl bg-[#122010] border border-[#1A2E1C] flex items-center justify-between">
                  <div>
                    <span className="text-xs font-bold text-white">Grace Matiku</span>
                    <p className="text-[11px] text-[#8899AA]">Fleet & Delivery Dispatcher</p>
                  </div>
                  <span className="px-2 py-0.5 rounded text-[10px] font-black uppercase bg-amber-500/20 text-amber-300 border border-amber-500/40">
                    Dispatcher
                  </span>
                </div>
              </div>
            </div>
          </div>

          {/* Staff Performance Leaderboard */}
          <div className="bg-[#0D1E12] border border-[#243447] rounded-xl p-5 space-y-4">
            <div className="flex items-center justify-between">
              <h3 className="text-sm font-bold text-white flex items-center gap-2">
                <Award className="w-4 h-4 text-amber-400" />
                <span>{isSwahili ? 'Ufanisi wa Wafanyakazi wa Njia' : 'Route Delivery Performance Leaderboard'}</span>
              </h3>
            </div>

            <div className="overflow-x-auto">
              <table className="w-full text-left text-xs">
                <thead>
                  <tr className="border-b border-[#1A2E1C] text-[#8899AA]">
                    <th className="pb-2">{isSwahili ? 'Jina la Mfanyakazi' : 'Staff Member'}</th>
                    <th className="pb-2">{isSwahili ? 'Njia Kuu' : 'Assigned Corridor'}</th>
                    <th className="pb-2 text-right">{isSwahili ? 'Vituo' : 'Deliveries'}</th>
                    <th className="pb-2 text-right">{isSwahili ? 'Mapato' : 'Revenue'}</th>
                    <th className="pb-2 text-right">{isSwahili ? 'Kiwango' : 'Accuracy'}</th>
                  </tr>
                </thead>
                <tbody className="divide-y divide-[#1A2E1C]">
                  {staffPerformance.map((staff, i) => (
                    <tr key={i} className="hover:bg-[#122010]">
                      <td className="py-2.5 font-medium text-white flex items-center gap-2">
                        <span className="w-5 h-5 rounded-full bg-[#1A2E1C] text-[#8899AA] flex items-center justify-center text-[10px] font-bold">
                          {i + 1}
                        </span>
                        <span>{staff.name}</span>
                      </td>
                      <td className="py-2.5 text-[#8899AA]">{staff.route}</td>
                      <td className="py-2.5 text-right font-mono text-white">{staff.deliveries}</td>
                      <td className="py-2.5 text-right font-mono text-[#00C46A] font-bold">
                        {staff.revenue.toLocaleString()} TZS
                      </td>
                      <td className="py-2.5 text-right text-purple-300 font-bold">{staff.rate}</td>
                    </tr>
                  ))}
                </tbody>
              </table>
            </div>
          </div>
        </div>
      )}

      {/* Tab: Demand Forecasting */}
      {activeTab === 'forecast' && (
        <div className="space-y-4">
          <DeliveryForecastOptimizer orders={orders} />
        </div>
      )}

      {/* Tab: Plant Inventory Stock */}
      {activeTab === 'inventory' && (
        <div className="grid grid-cols-1 md:grid-cols-3 gap-4">
          <div className="bg-[#0D1E12] border border-[#243447] p-4 rounded-xl space-y-2">
            <span className="text-xs font-bold text-[#8899AA] uppercase">ZAMZAM 13L Pure Water</span>
            <div className="flex items-baseline gap-2">
              <span className="text-3xl font-black text-white">150</span>
              <span className="text-xs text-[#00C46A]">{isSwahili ? 'Chupa Ghala' : 'Bottles in Stock'}</span>
            </div>
            <p className="text-[11px] text-[#8899AA]">5,000 TZS unit price</p>
          </div>

          <div className="bg-[#0D1E12] border border-[#243447] p-4 rounded-xl space-y-2">
            <span className="text-xs font-bold text-[#8899AA] uppercase">ZAMZAM 18.9L Pure Water</span>
            <div className="flex items-baseline gap-2">
              <span className="text-3xl font-black text-white">220</span>
              <span className="text-xs text-[#00C46A]">{isSwahili ? 'Chupa Ghala' : 'Bottles in Stock'}</span>
            </div>
            <p className="text-[11px] text-[#8899AA]">5,000 TZS unit price</p>
          </div>

          <div className="bg-[#0D1E12] border border-[#243447] p-4 rounded-xl space-y-2">
            <span className="text-xs font-bold text-[#8899AA] uppercase">18.9L/R Refill Returns</span>
            <div className="flex items-baseline gap-2">
              <span className="text-3xl font-black text-white">180</span>
              <span className="text-xs text-purple-300">{isSwahili ? 'Zilizooshwa' : 'Sanitized & Ready'}</span>
            </div>
            <p className="text-[11px] text-[#8899AA]">Buffer stock for daily refill routes</p>
          </div>
        </div>
      )}
    </div>
  );
};
