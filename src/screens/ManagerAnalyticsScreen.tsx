import React, { useState, useEffect } from 'react';
import { storageService } from '../services/storage';
import { Order } from '../types';
import {
  BarChart3,
  TrendingUp,
  Award,
  DollarSign,
  Package,
  MapPin,
  Calendar,
} from 'lucide-react';

interface ManagerAnalyticsScreenProps {
  onNavigate: (view: string) => void;
}

export const ManagerAnalyticsScreen: React.FC<ManagerAnalyticsScreenProps> = () => {
  const [period, setPeriod] = useState<'Daily' | 'Weekly' | 'Monthly'>('Weekly');
  const [orders, setOrders] = useState<Order[]>([]);

  useEffect(() => {
    setOrders(storageService.getOrders());
  }, []);

  const totalRevenue = orders.reduce((sum, o) => sum + o.subtotal, 0) + 1250000;
  const totalDeliveries = orders.length + 38;
  const completionRate = 96.4;

  const staffKpis = [
    { name: 'Juma Ramadhani', id: 'ZZ-2024-002', revenue: 780000, deliveries: 16, rate: '98%' },
    { name: 'Ali Hassan', id: 'ZZ-2024-001', revenue: 650000, deliveries: 14, rate: '95%' },
    { name: 'Salim Bakari', id: 'ZZ-2024-004', revenue: 590000, deliveries: 12, rate: '94%' },
    { name: 'Baraka Mushi', id: 'ZZ-2024-003', revenue: 480000, deliveries: 10, rate: '92%' },
  ];

  const regionalBreakdown = [
    { region: 'Dar es Salaam Central', pct: 38, revenue: 'TZS 950,000' },
    { region: 'Ilala & Kariakoo Market', pct: 28, revenue: 'TZS 700,000' },
    { region: 'Kinondoni & Masaki', pct: 22, revenue: 'TZS 550,000' },
    { region: 'Temeke South', pct: 12, revenue: 'TZS 300,000' },
  ];

  return (
    <div className="max-w-5xl mx-auto space-y-6 pb-24 md:pb-12">
      {/* Header */}
      <div className="flex flex-col sm:flex-row sm:items-center justify-between gap-3 border-b border-[#243447] pb-4">
        <div>
          <h1 className="text-xl sm:text-2xl font-bold text-white flex items-center gap-2">
            <BarChart3 className="w-6 h-6 text-purple-400" />
            <span>Executive & Fleet Analytics</span>
          </h1>
          <p className="text-xs text-[#8899AA] mt-0.5">
            Regional revenue intelligence, route efficiencies, and staff KPI metrics.
          </p>
        </div>

        {/* Period Selector */}
        <div className="flex bg-[#122010] p-1 rounded-xl border border-[#2A5038] self-start sm:self-auto">
          {(['Daily', 'Weekly', 'Monthly'] as const).map((p) => (
            <button
              key={p}
              onClick={() => setPeriod(p)}
              className={`px-3 py-1.5 rounded-lg text-xs font-semibold transition-all ${
                period === p ? 'bg-[#006B3C] text-white shadow' : 'text-[#8899AA] hover:text-white'
              }`}
            >
              {p}
            </button>
          ))}
        </div>
      </div>

      {/* Top 3 KPI Highlights */}
      <div className="grid grid-cols-1 sm:grid-cols-3 gap-4">
        <div className="bg-[#122010] p-5 rounded-2xl border border-[#2A5038] relative overflow-hidden">
          <div className="flex items-center justify-between text-xs text-[#8899AA]">
            <span>Total Gross Revenue</span>
            <TrendingUp className="w-4 h-4 text-[#00C46A]" />
          </div>
          <div className="text-2xl font-bold font-mono text-white mt-2">
            TZS {totalRevenue.toLocaleString()}
          </div>
          <span className="text-[10px] text-[#00C46A] font-semibold mt-1 inline-block">
            +14.2% vs previous period
          </span>
        </div>

        <div className="bg-[#122010] p-5 rounded-2xl border border-[#2A5038]">
          <div className="flex items-center justify-between text-xs text-[#8899AA]">
            <span>Total Delivered Stops</span>
            <Package className="w-4 h-4 text-blue-400" />
          </div>
          <div className="text-2xl font-bold font-mono text-white mt-2">
            {totalDeliveries} stops
          </div>
          <span className="text-[10px] text-[#00C46A] font-semibold mt-1 inline-block">
            On-time fulfillment 98.1%
          </span>
        </div>

        <div className="bg-[#122010] p-5 rounded-2xl border border-[#2A5038]">
          <div className="flex items-center justify-between text-xs text-[#8899AA]">
            <span>Completion Rate</span>
            <Award className="w-4 h-4 text-purple-400" />
          </div>
          <div className="text-2xl font-bold font-mono text-white mt-2">
            {completionRate}%
          </div>
          <span className="text-[10px] text-[#00C46A] font-semibold mt-1 inline-block">
            Exceeding quarterly SLA
          </span>
        </div>
      </div>

      {/* 2-Column Analytics Sections */}
      <div className="grid grid-cols-1 lg:grid-cols-2 gap-6">
        {/* Staff KPI Leaderboard */}
        <div className="bg-[#122010] p-5 rounded-2xl border border-[#2A5038]">
          <div className="flex items-center justify-between mb-4">
            <h2 className="text-sm font-bold text-white flex items-center gap-2">
              <Award className="w-4 h-4 text-[#00C46A]" />
              <span>Top Performing Field Staff</span>
            </h2>
            <span className="text-xs text-[#8899AA]">{period} Rankings</span>
          </div>

          <div className="space-y-3">
            {staffKpis.map((staff, idx) => (
              <div
                key={staff.id}
                className="bg-[#1A2E1C] p-3.5 rounded-xl border border-[#3A5068]/50 flex items-center justify-between text-xs"
              >
                <div className="flex items-center gap-3">
                  <span className="w-6 h-6 rounded-full bg-[#006B3C] text-white flex items-center justify-center font-bold text-[11px]">
                    #{idx + 1}
                  </span>
                  <div>
                    <div className="font-bold text-white">{staff.name}</div>
                    <div className="text-[10px] text-[#8899AA] font-mono">{staff.id} &bull; {staff.deliveries} stops</div>
                  </div>
                </div>

                <div className="text-right">
                  <div className="font-mono font-bold text-[#00C46A]">
                    TZS {staff.revenue.toLocaleString()}
                  </div>
                  <div className="text-[10px] text-[#8899AA]">{staff.rate} fulfillment</div>
                </div>
              </div>
            ))}
          </div>
        </div>

        {/* Regional Distribution */}
        <div className="bg-[#122010] p-5 rounded-2xl border border-[#2A5038]">
          <div className="flex items-center justify-between mb-4">
            <h2 className="text-sm font-bold text-white flex items-center gap-2">
              <MapPin className="w-4 h-4 text-blue-400" />
              <span>Regional Revenue Distribution</span>
            </h2>
            <span className="text-xs text-[#8899AA]">Dar es Salaam</span>
          </div>

          <div className="space-y-3.5">
            {regionalBreakdown.map((item) => (
              <div key={item.region} className="space-y-1.5">
                <div className="flex justify-between text-xs">
                  <span className="font-medium text-white">{item.region}</span>
                  <span className="font-mono text-[#00C46A]">{item.revenue} ({item.pct}%)</span>
                </div>
                <div className="w-full bg-[#1A2E1C] h-2 rounded-full overflow-hidden">
                  <div
                    className="bg-gradient-to-r from-[#006B3C] to-[#00C46A] h-full rounded-full"
                    style={{ width: `${item.pct}%` }}
                  />
                </div>
              </div>
            ))}
          </div>
        </div>
      </div>
    </div>
  );
};
