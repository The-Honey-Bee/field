import React, { useMemo, useState } from 'react';
import {
  ResponsiveContainer,
  PieChart,
  Pie,
  Cell,
  Tooltip,
  BarChart,
  Bar,
  XAxis,
  YAxis,
} from 'recharts';
import {
  CheckCircle2,
  Clock,
  Truck,
  TrendingUp,
  Target,
  Sparkles,
  UserCheck,
  PackageCheck,
  ArrowUpRight,
  Download,
  Printer,
  FileSpreadsheet,
} from 'lucide-react';
import { TimelineTask, Order, UserProfile } from '../types';
import { useTheme } from '../context/ThemeContext';
import { ExportPerformanceModal } from './ExportPerformanceModal';

interface DeliveryCompletionDashboardProps {
  user: UserProfile | null;
  tasks: TimelineTask[];
  orders: Order[];
  onNavigate?: (view: string) => void;
}

export const DeliveryCompletionDashboard: React.FC<DeliveryCompletionDashboardProps> = ({
  user,
  tasks,
  orders,
  onNavigate,
}) => {
  const { isSunlight } = useTheme();
  const [isExportModalOpen, setIsExportModalOpen] = useState(false);

  // 1. Calculate active user's delivery metrics
  const metrics = useMemo(() => {
    // Check if any orders belong specifically to this active user
    const userOrders = orders.filter(
      (o) =>
        !user?.id ||
        !o.staffId ||
        o.staffId === user.id ||
        o.staffId === user.employeeId
    );

    // Filter tasks: in field mobile dispatch, tasks represent the active user's shift stops
    const totalStops = tasks.length > 0 ? tasks.length : Math.max(userOrders.length, 4);
    const completedTasks = tasks.filter((t) => t.isCompleted).length;
    
    // In case tasks list is empty, deduce from approved orders
    const approvedOrders = userOrders.filter((o) => o.status === 'approved').length;
    const completedCount = tasks.length > 0 ? completedTasks : approvedOrders;
    
    const pendingCount = Math.max(0, totalStops - completedCount);
    const inTransitCount = tasks.filter((t) => t.status === 'in_transit').length;

    const completionPercentage = totalStops > 0 
      ? Math.min(100, Math.round((completedCount / totalStops) * 100))
      : 0;

    // Total bottles delivered today
    const totalBottlesDelivered = userOrders.reduce((sum, o) => {
      return (
        sum +
        o.items.reduce((itemSum, item) => itemSum + (item.qty || 0), 0)
      );
    }, 0);

    return {
      totalStops,
      completedCount,
      pendingCount,
      inTransitCount,
      completionPercentage,
      totalBottlesDelivered: totalBottlesDelivered > 0 ? totalBottlesDelivered : completedCount * 6,
    };
  }, [tasks, orders, user]);

  // 2. Recharts Data for Donut Completion Gauge
  const gaugeData = useMemo(() => {
    if (metrics.totalStops === 0) {
      return [
        { name: 'Completed', value: 0, color: '#00C46A' },
        { name: 'Pending', value: 1, color: isSunlight ? '#CBD5E1' : '#1A2E1C' },
      ];
    }

    return [
      {
        name: 'Completed Stops',
        value: metrics.completedCount,
        color: '#00C46A', // Zamzam vibrant green
      },
      {
        name: 'In Transit / Queued',
        value: metrics.pendingCount,
        color: isSunlight ? '#E2E8F0' : '#1A2E1C', // High contrast track
      },
    ];
  }, [metrics, isSunlight]);

  // 3. Shift Time Blocks Progress for Recharts BarChart
  const timeBlocksData = useMemo(() => {
    // Parse tasks into morning (08:00-11:00), midday (11:00-14:00), afternoon (14:00-17:00), evening (17:00+)
    const blocks = [
      { name: 'Morning', time: '08:00 - 11:00', total: 0, completed: 0 },
      { name: 'Midday', time: '11:00 - 14:00', total: 0, completed: 0 },
      { name: 'Afternoon', time: '14:00 - 17:00', total: 0, completed: 0 },
      { name: 'Evening', time: '17:00 - 19:00', total: 0, completed: 0 },
    ];

    if (tasks.length > 0) {
      tasks.forEach((t) => {
        const timeStr = t.time || t.timeRange || '';
        const hourMatch = timeStr.match(/(\d{1,2}):/);
        const hour = hourMatch ? parseInt(hourMatch[1], 10) : 10;

        let blockIndex = 0;
        if (hour < 11) blockIndex = 0;
        else if (hour < 14) blockIndex = 1;
        else if (hour < 17) blockIndex = 2;
        else blockIndex = 3;

        blocks[blockIndex].total += 1;
        if (t.isCompleted) {
          blocks[blockIndex].completed += 1;
        }
      });
    } else {
      // Default baseline blocks if tasks aren't populated yet
      blocks[0].total = 2;
      blocks[0].completed = 2;
      blocks[1].total = 2;
      blocks[1].completed = 1;
      blocks[2].total = 1;
      blocks[2].completed = 0;
      blocks[3].total = 1;
      blocks[3].completed = 0;
    }

    return blocks.map((b) => ({
      name: b.name,
      completed: b.completed,
      remaining: Math.max(0, b.total - b.completed),
      total: b.total,
    }));
  }, [tasks]);

  // Dynamic Status Badge
  const getStatusBadge = (pct: number) => {
    if (pct === 100) {
      return {
        label: 'All Route Stops Completed!',
        badgeClass: 'bg-emerald-950/60 text-emerald-300 border-emerald-500/40',
        dotClass: 'bg-emerald-400',
      };
    }
    if (pct >= 70) {
      return {
        label: 'Route On Track',
        badgeClass: 'bg-[#006B3C]/30 text-[#00C46A] border-[#00C46A]/40',
        dotClass: 'bg-[#00C46A]',
      };
    }
    if (pct >= 40) {
      return {
        label: 'In Progress (Active Shift)',
        badgeClass: 'bg-blue-950/50 text-blue-300 border-blue-500/40',
        dotClass: 'bg-blue-400',
      };
    }
    return {
      label: 'Shift Initiated',
      badgeClass: 'bg-amber-950/50 text-amber-300 border-amber-500/40',
      dotClass: 'bg-amber-400',
    };
  };

  const statusInfo = getStatusBadge(metrics.completionPercentage);

  return (
    <div className="bg-[#122010] p-5 sm:p-6 rounded-2xl border border-[#2A5038] shadow-xl relative overflow-hidden space-y-6">
      {/* Background radial accent glow */}
      <div className="absolute top-0 right-1/4 w-64 h-64 bg-[#00C46A]/5 rounded-full blur-3xl pointer-events-none" />

      {/* 1. Header Section with Active User Identity & Live Status */}
      <div className="flex flex-col sm:flex-row sm:items-center justify-between gap-3 border-b border-[#243447] pb-4 relative z-10">
        <div>
          <div className="flex items-center gap-2">
            <span className="p-1.5 rounded-lg bg-[#006B3C]/30 text-[#00C46A] border border-[#00C46A]/30">
              <Target className="w-4 h-4" />
            </span>
            <h2 className="text-sm sm:text-base font-bold text-white tracking-wide">
              Today's Delivery Completion
            </h2>
            <span
              className={`text-[10px] font-bold uppercase tracking-wider px-2 py-0.5 rounded-full border flex items-center gap-1.5 ${statusInfo.badgeClass}`}
            >
              <span className={`w-1.5 h-1.5 rounded-full animate-pulse ${statusInfo.dotClass}`} />
              <span>{statusInfo.label}</span>
            </span>
          </div>
          <p className="text-xs text-[#8899AA] mt-1 flex items-center gap-1.5">
            <UserCheck className="w-3.5 h-3.5 text-[#00C46A]" />
            <span>
              Field Operator: <strong className="text-white">{user?.name || 'Active Staff'}</strong> ({user?.employeeId || 'ZZ-STAFF'})
            </span>
            <span className="text-[#64748B]">&bull;</span>
            <span className="text-[#00C46A] font-semibold">Today's Shift</span>
          </p>
        </div>

        <div className="flex items-center gap-2 flex-wrap">
          {/* Export Performance Summary Button */}
          <button
            type="button"
            id="btn-export-performance"
            onClick={() => setIsExportModalOpen(true)}
            className="text-xs bg-[#00C46A] hover:bg-[#008F50] text-[#0A1A0F] px-3.5 py-1.5 rounded-xl border border-[#00C46A] transition-all flex items-center gap-1.5 font-bold shadow-md shadow-[#00C46A]/20 active:scale-95"
            title="Export summary of the day's delivery performance as printable sheet or downloadable file"
          >
            <Download className="w-3.5 h-3.5 text-[#0A1A0F] stroke-[2.5]" />
            <span>Export</span>
          </button>

          {onNavigate && (
            <button
              type="button"
              onClick={() => onNavigate('orders')}
              className="text-xs text-[#00C46A] hover:text-[#008F50] bg-[#1A2E1C] hover:bg-[#233B26] px-3 py-1.5 rounded-xl border border-[#3A5068] transition-all flex items-center gap-1 font-semibold"
            >
              <span>Dispatch Orders</span>
              <ArrowUpRight className="w-3.5 h-3.5" />
            </button>
          )}
        </div>
      </div>

      {/* 2. Visualizations Layout (Recharts Donut Gauge + Recharts Time Blocks) */}
      <div className="grid grid-cols-1 lg:grid-cols-12 gap-6 items-center relative z-10">
        {/* Left Column: Recharts Donut Completion Gauge */}
        <div className="lg:col-span-5 flex flex-col items-center justify-center p-3 rounded-xl bg-[#1A2E1C]/50 border border-[#3A5068]/30 relative">
          <div className="relative w-48 h-48 sm:w-52 sm:h-52 flex items-center justify-center">
            <ResponsiveContainer width="100%" height="100%">
              <PieChart>
                <Pie
                  data={gaugeData}
                  cx="50%"
                  cy="50%"
                  innerRadius={68}
                  outerRadius={88}
                  startAngle={90}
                  endAngle={-270}
                  dataKey="value"
                  stroke="none"
                  animationDuration={1000}
                >
                  {gaugeData.map((entry, index) => (
                    <Cell key={`cell-${index}`} fill={entry.color} />
                  ))}
                </Pie>
                <Tooltip
                  contentStyle={{
                    backgroundColor: isSunlight ? '#FFFFFF' : '#122010',
                    borderColor: isSunlight ? '#CBD5E1' : '#3A5068',
                    borderRadius: '0.75rem',
                    color: isSunlight ? '#0A1A0F' : '#D0E8F0',
                    fontSize: '12px',
                    boxShadow: '0 4px 12px rgba(0,0,0,0.2)',
                  }}
                  itemStyle={{
                    color: isSunlight ? '#0A1A0F' : '#D0E8F0',
                  }}
                  formatter={(val: any) => [`${val ?? 0} stops`, 'Count']}
                />
              </PieChart>
            </ResponsiveContainer>

            {/* Centered Completion Metric Display */}
            <div className="absolute inset-0 flex flex-col items-center justify-center pointer-events-none text-center">
              <span className="text-3xl sm:text-4xl font-extrabold font-mono text-[#00C46A] tracking-tight">
                {metrics.completionPercentage}%
              </span>
              <span className="text-[10px] sm:text-[11px] uppercase tracking-wider font-semibold text-[#8899AA] mt-0.5">
                Completed
              </span>
              <span className="text-[10px] text-[#64748B] font-mono mt-0.5">
                {metrics.completedCount} of {metrics.totalStops} stops
              </span>
            </div>
          </div>

          <div className="mt-2 flex items-center gap-4 text-xs">
            <div className="flex items-center gap-1.5">
              <span className="w-2.5 h-2.5 rounded-full bg-[#00C46A]" />
              <span className="text-white font-medium">Delivered ({metrics.completedCount})</span>
            </div>
            <div className="flex items-center gap-1.5">
              <span className={`w-2.5 h-2.5 rounded-full ${isSunlight ? 'bg-slate-300' : 'bg-[#1A2E1C] border border-[#3A5068]'}`} />
              <span className="text-[#8899AA]">Pending ({metrics.pendingCount})</span>
            </div>
          </div>
        </div>

        {/* Right Column: Shift Time-Block Progress Bar Chart using Recharts */}
        <div className="lg:col-span-7 space-y-4">
          <div className="flex items-center justify-between">
            <div>
              <h3 className="text-xs font-bold text-white uppercase tracking-wider flex items-center gap-1.5">
                <Clock className="w-3.5 h-3.5 text-[#00C46A]" />
                <span>Shift Progression Timeline</span>
              </h3>
              <p className="text-[11px] text-[#8899AA]">
                Completed vs Remaining deliveries by shift window
              </p>
            </div>
            <span className="text-[11px] text-[#00C46A] font-semibold bg-[#006B3C]/20 px-2 py-0.5 rounded border border-[#00C46A]/30 flex items-center gap-1">
              <TrendingUp className="w-3 h-3" />
              <span>Real-time</span>
            </span>
          </div>

          {/* Recharts Stacked/Grouped Bar Chart */}
          <div className="h-40 w-full">
            <ResponsiveContainer width="100%" height="100%">
              <BarChart
                data={timeBlocksData}
                margin={{ top: 10, right: 10, left: -25, bottom: 0 }}
                barSize={20}
              >
                <XAxis
                  dataKey="name"
                  stroke={isSunlight ? '#64748B' : '#8899AA'}
                  fontSize={11}
                  tickLine={false}
                  axisLine={{ stroke: isSunlight ? '#CBD5E1' : '#2A5038' }}
                />
                <YAxis
                  stroke={isSunlight ? '#64748B' : '#8899AA'}
                  fontSize={11}
                  allowDecimals={false}
                  tickLine={false}
                  axisLine={false}
                />
                <Tooltip
                  cursor={{ fill: isSunlight ? 'rgba(0,0,0,0.04)' : 'rgba(255,255,255,0.04)' }}
                  contentStyle={{
                    backgroundColor: isSunlight ? '#FFFFFF' : '#122010',
                    borderColor: isSunlight ? '#CBD5E1' : '#3A5068',
                    borderRadius: '0.75rem',
                    color: isSunlight ? '#0A1A0F' : '#D0E8F0',
                    fontSize: '11px',
                  }}
                  formatter={(val: any, name: any) => [
                    `${val ?? 0} stops`,
                    name === 'completed' ? 'Delivered' : 'Pending',
                  ]}
                />
                <Bar
                  dataKey="completed"
                  name="completed"
                  stackId="a"
                  fill="#00C46A"
                  radius={[0, 0, 4, 4]}
                />
                <Bar
                  dataKey="remaining"
                  name="remaining"
                  stackId="a"
                  fill={isSunlight ? '#CBD5E1' : '#1E3825'}
                  radius={[4, 4, 0, 0]}
                />
              </BarChart>
            </ResponsiveContainer>
          </div>

          {/* 4 Summary Stat Cards */}
          <div className="grid grid-cols-2 sm:grid-cols-4 gap-2 pt-1">
            <div className="bg-[#1A2E1C] p-2.5 rounded-xl border border-[#3A5068]/40">
              <span className="text-[10px] text-[#8899AA] uppercase font-semibold block">Total Route</span>
              <span className="text-base font-bold font-mono text-white mt-0.5 block">
                {metrics.totalStops} stops
              </span>
            </div>

            <div className="bg-[#1A2E1C] p-2.5 rounded-xl border border-[#3A5068]/40">
              <span className="text-[10px] text-[#8899AA] uppercase font-semibold block">Delivered</span>
              <span className="text-base font-bold font-mono text-[#00C46A] mt-0.5 block">
                {metrics.completedCount} done
              </span>
            </div>

            <div className="bg-[#1A2E1C] p-2.5 rounded-xl border border-[#3A5068]/40">
              <span className="text-[10px] text-[#8899AA] uppercase font-semibold block">Remaining</span>
              <span className="text-base font-bold font-mono text-[#F59E0B] mt-0.5 block">
                {metrics.pendingCount} left
              </span>
            </div>

            <div className="bg-[#1A2E1C] p-2.5 rounded-xl border border-[#3A5068]/40">
              <span className="text-[10px] text-[#8899AA] uppercase font-semibold block">Bottles Dropped</span>
              <span className="text-base font-bold font-mono text-white mt-0.5 block">
                {metrics.totalBottlesDelivered} units
              </span>
            </div>
          </div>
        </div>
      </div>

      {/* Export Daily Performance Summary Modal (Printable Sheet & Downloadable CSV/HTML) */}
      <ExportPerformanceModal
        isOpen={isExportModalOpen}
        onClose={() => setIsExportModalOpen(false)}
        user={user}
        tasks={tasks}
        orders={orders}
        metrics={metrics}
        timeBlocksData={timeBlocksData}
      />
    </div>
  );
};
