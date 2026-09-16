import React, { useState, useEffect } from 'react';
import confetti from 'canvas-confetti';
import { useAuth } from '../context/AuthContext';
import { storageService } from '../services/storage';
import { TimelineTask, Order } from '../types';
import {
  Sparkles,
  TrendingUp,
  Clock,
  CheckCircle2,
  Circle,
  Truck,
  Store,
  CreditCard,
  Package,
  Plus,
  ArrowUpRight,
  RefreshCcw,
  Zap,
  Activity,
  Award,
} from 'lucide-react';

interface HomeScreenProps {
  onNavigate: (view: string) => void;
}

export const HomeScreen: React.FC<HomeScreenProps> = ({ onNavigate }) => {
  const { user, role } = useAuth();
  const [tasks, setTasks] = useState<TimelineTask[]>([]);
  const [orders, setOrders] = useState<Order[]>([]);
  const [selectedPeriod, setSelectedPeriod] = useState<'Daily' | 'Weekly' | 'Monthly'>('Weekly');
  const [selectedDayIndex, setSelectedDayIndex] = useState<number>(new Date().getDay() === 0 ? 6 : new Date().getDay() - 1);
  const [targetReached, setTargetReached] = useState<boolean>(false);

  // Weekdays
  const weekDays = [
    { label: 'Mon', date: '16' },
    { label: 'Tue', date: '17' },
    { label: 'Wed', date: '18' },
    { label: 'Thu', date: '19' },
    { label: 'Fri', date: '20' },
    { label: 'Sat', date: '21' },
    { label: 'Sun', date: '22' },
  ];

  // Chart data
  const chartData: Record<'Daily' | 'Weekly' | 'Monthly', { labels: string[]; values: number[] }> = {
    Daily: {
      labels: ['Mon', 'Tue', 'Wed', 'Thu', 'Fri', 'Sat', 'Sun'],
      values: [4, 6, 5, 7, 5, 8, 3],
    },
    Weekly: {
      labels: ['W1', 'W2', 'W3', 'W4', 'W5', 'W6', 'W7'],
      values: [28, 35, 30, 42, 38, 45, 32],
    },
    Monthly: {
      labels: ['Jan', 'Feb', 'Mar', 'Apr', 'May', 'Jun', 'Jul'],
      values: [120, 145, 132, 168, 155, 178, 141],
    },
  };

  useEffect(() => {
    setTasks(storageService.getTasks());
    setOrders(storageService.getOrders());
  }, []);

  const todayOrders = orders.length;
  const todayRevenue = orders.reduce((sum, o) => sum + o.subtotal, 0);
  const revenueTarget = 300000;
  const targetProgress = Math.min(100, Math.round((todayRevenue / revenueTarget) * 100));

  const handleTaskToggle = (taskId: string) => {
    const updated = storageService.toggleTask(taskId);
    setTasks(updated);
  };

  const triggerCelebration = () => {
    setTargetReached(true);
    confetti({
      particleCount: 80,
      spread: 70,
      origin: { y: 0.6 },
      colors: ['#00C46A', '#3B82F6', '#F59E0B', '#10B981'],
    });
    setTimeout(() => setTargetReached(false), 4000);
  };

  const completedTasksCount = tasks.filter((t) => t.isCompleted).length;
  const pendingTasksCount = tasks.filter((t) => !t.isCompleted).length;
  const pendingSyncCount = storageService.getPendingSyncCount();

  const getTaskIcon = (iconName: string) => {
    switch (iconName) {
      case 'store':
        return <Store className="w-4 h-4 text-[#3B82F6]" />;
      case 'payments':
        return <CreditCard className="w-4 h-4 text-[#EC4899]" />;
      case 'inventory':
        return <Package className="w-4 h-4 text-[#00C46A]" />;
      default:
        return <Truck className="w-4 h-4 text-[#F59E0B]" />;
    }
  };

  const activeChart = chartData[selectedPeriod];
  const maxChartVal = Math.max(...activeChart.values);

  return (
    <div className="space-y-6 pb-24 md:pb-12">
      {/* 1. Header Greeting & Target Banner */}
      <div className="flex flex-col sm:flex-row sm:items-center justify-between gap-4 bg-[#122010] p-5 rounded-2xl border border-[#2A5038] shadow-lg">
        <div>
          <div className="flex items-center gap-2 text-xs font-semibold text-[#00C46A] tracking-wider uppercase">
            <Zap className="w-3.5 h-3.5" />
            <span>Active Shift &bull; Route 4B</span>
          </div>
          <h1 className="text-2xl font-bold text-white mt-1">
            Habari, {user?.name || 'Ali Hassan'}
          </h1>
          <p className="text-xs text-[#8899AA] mt-0.5">
            Staff ID: <span className="font-mono text-white">{user?.employeeId || 'ZZ-2024-001'}</span> &bull; Dar es Salaam Central
          </p>
        </div>

        {/* Target Progress Card */}
        <div className="flex items-center gap-4 bg-[#1A2E1C] px-4 py-3 rounded-xl border border-[#3A5068]/50">
          <div className="text-right">
            <div className="text-[11px] text-[#8899AA]">Daily Target ({targetProgress}%)</div>
            <div className="text-sm font-bold text-white font-mono">
              TZS {todayRevenue.toLocaleString()} / {revenueTarget.toLocaleString()}
            </div>
          </div>
          <button
            onClick={triggerCelebration}
            className="p-2 rounded-lg bg-[#006B3C] hover:bg-[#008F50] text-[#00C46A] hover:text-white transition-all transform active:scale-95"
            title="Celebrate Target"
          >
            <Award className="w-5 h-5" />
          </button>
        </div>
      </div>

      {targetReached && (
        <div className="bg-[#006B3C]/40 border border-[#00C46A] p-3 rounded-xl flex items-center justify-between text-xs text-white animate-fade-in">
          <div className="flex items-center gap-2 font-semibold">
            <Sparkles className="w-4 h-4 text-[#00C46A]" />
            <span>Target Achieved! Outstanding field sales milestone today!</span>
          </div>
          <span className="text-[10px] bg-[#00C46A] text-[#0A1A0F] font-bold px-2 py-0.5 rounded">
            +500 Bonus Pts
          </span>
        </div>
      )}

      {/* 2. Interactive Week Calendar Strip */}
      <div className="bg-[#122010] p-3 rounded-2xl border border-[#2A5038]">
        <div className="flex items-center justify-between px-2 mb-2">
          <span className="text-xs font-semibold text-white">This Week's Schedule</span>
          <span className="text-[11px] text-[#8899AA]">March 2026</span>
        </div>
        <div className="grid grid-cols-7 gap-1.5 sm:gap-2">
          {weekDays.map((day, idx) => {
            const isSelected = idx === selectedDayIndex;
            return (
              <button
                key={day.label}
                onClick={() => setSelectedDayIndex(idx)}
                className={`flex flex-col items-center py-2.5 rounded-xl text-center transition-all ${
                  isSelected
                    ? 'bg-[#006B3C] text-white shadow-md border border-[#00C46A]/60'
                    : 'bg-[#1A2E1C]/60 text-[#8899AA] hover:text-white hover:bg-[#1A2E1C]'
                }`}
              >
                <span className="text-[11px] font-medium opacity-80">{day.label}</span>
                <span className="text-sm font-bold mt-0.5">{day.date}</span>
                {idx < 5 && (
                  <span className={`w-1.5 h-1.5 rounded-full mt-1 ${isSelected ? 'bg-[#00C46A]' : 'bg-[#00C46A]/40'}`} />
                )}
              </button>
            );
          })}
        </div>
      </div>

      {/* 3. Dual Metric Row (Route Progress & Pending Sync) */}
      <div className="grid grid-cols-1 md:grid-cols-2 gap-4">
        {/* Left Card: Route Progress */}
        <div className="bg-[#122010] p-5 rounded-2xl border border-[#3A5068]/60 relative overflow-hidden">
          <div className="flex items-center justify-between">
            <span className="text-xs font-medium text-[#8899AA]">Route Progress</span>
            <span className="flex items-center gap-1 text-[11px] text-[#00C46A] font-semibold">
              <TrendingUp className="w-3 h-3" /> +2 vs yesterday
            </span>
          </div>
          <div className="mt-2 flex items-baseline gap-2">
            <span className="text-3xl font-bold font-mono text-[#00C46A]">
              {completedTasksCount}
            </span>
            <span className="text-xs text-[#8899AA]">/ {tasks.length} stops</span>
          </div>

          {/* Mini Sparkline Bar / Progress */}
          <div className="mt-4 space-y-1.5">
            <div className="w-full bg-[#1A2E1C] h-2.5 rounded-full overflow-hidden">
              <div
                className="bg-gradient-to-r from-[#006B3C] to-[#00C46A] h-full rounded-full transition-all duration-500"
                style={{ width: `${(completedTasksCount / Math.max(1, tasks.length)) * 100}%` }}
              />
            </div>
            <div className="flex justify-between text-[10px] text-[#8899AA]">
              <span>Departure: 08:00 AM</span>
              <span>Depot Return: 06:30 PM</span>
            </div>
          </div>
        </div>

        {/* Right Card: Pending Sync Gauge */}
        <div className="bg-[#122010] p-5 rounded-2xl border border-[#3A5068]/60 relative overflow-hidden">
          <div className="flex items-center justify-between">
            <span className="text-xs font-medium text-[#8899AA]">Offline Sync Health</span>
            <span className="text-[11px] text-[#F59E0B] font-semibold">
              {pendingSyncCount > 0 ? `${pendingSyncCount} in queue` : 'Storage Synced'}
            </span>
          </div>
          <div className="mt-2 flex items-baseline gap-2">
            <span className="text-3xl font-bold font-mono text-[#F59E0B]">
              {pendingSyncCount}
            </span>
            <span className="text-xs text-[#8899AA]">pending upload</span>
          </div>

          <div className="mt-4 flex items-center justify-between text-xs bg-[#1A2E1C] p-2.5 rounded-xl border border-[#2A5038]">
            <span className="text-[#8899AA] text-[11px]">Database Link: Supabase Cloud</span>
            <button
              onClick={() => onNavigate('orders')}
              className="text-[#00C46A] font-semibold hover:underline flex items-center gap-1 text-[11px]"
            >
              <span>View Orders</span>
              <ArrowUpRight className="w-3 h-3" />
            </button>
          </div>
        </div>
      </div>

      {/* 4. AI Recommendation Card */}
      <div className="bg-gradient-to-br from-[#006B3C]/20 to-[#122010] p-5 rounded-2xl border border-[#00C46A]/40 relative shadow-sm">
        <div className="flex items-center gap-2 text-xs font-bold text-[#00C46A]">
          <div className="p-1.5 bg-[#00C46A]/20 rounded-lg">
            <Sparkles className="w-4 h-4 text-[#00C46A]" />
          </div>
          <span>Next Stop Recommendation</span>
        </div>
        <p className="mt-2 text-xs sm:text-sm text-[#D0E8F0] leading-relaxed">
          Head to <strong className="text-white">City Hypermarket</strong> next &mdash; they close at 14:00 and your payment collection is overdue by 3 days. <strong className="text-white">Al-Barakah Restaurant</strong> can be batched with your return route.
        </p>
      </div>

      {/* 5. Deliveries Completed Primary Bar Chart */}
      <div className="bg-[#122010] p-5 rounded-2xl border border-[#2A5038] shadow-lg">
        <div className="flex flex-col sm:flex-row sm:items-center justify-between gap-2 mb-4">
          <div>
            <h2 className="text-sm font-bold text-white">Deliveries Completed</h2>
            <p className="text-xs text-[#8899AA]">Volume and stops distribution</p>
          </div>

          <div className="flex items-center gap-2">
            <span className="text-[11px] text-[#00C46A] font-semibold bg-[#006B3C]/30 px-2.5 py-1 rounded-md border border-[#00C46A]/30">
              +18% vs last period
            </span>

            {/* Period selector */}
            <div className="flex bg-[#1A2E1C] p-0.5 rounded-lg border border-[#3A5068]">
              {(['Daily', 'Weekly', 'Monthly'] as const).map((period) => (
                <button
                  key={period}
                  onClick={() => setSelectedPeriod(period)}
                  className={`px-2.5 py-1 rounded-md text-xs font-medium transition-all ${
                    selectedPeriod === period
                      ? 'bg-[#006B3C] text-white shadow-sm'
                      : 'text-[#8899AA] hover:text-white'
                  }`}
                >
                  {period}
                </button>
              ))}
            </div>
          </div>
        </div>

        {/* Custom Clean Bar Chart Visualization */}
        <div className="mt-6 flex items-end justify-between gap-2 h-36 px-2">
          {activeChart.values.map((val, idx) => {
            const heightPct = Math.round((val / maxChartVal) * 100);
            const isHighlighted = idx === activeChart.values.length - 1;
            return (
              <div key={idx} className="flex-1 flex flex-col items-center gap-2 h-full justify-end group">
                <span className="text-[10px] font-mono text-[#8899AA] group-hover:text-white transition-colors">
                  {val}
                </span>
                <div className="w-full max-w-[28px] bg-[#1A2E1C] rounded-t-md h-full flex items-end overflow-hidden">
                  <div
                    className={`w-full rounded-t-md transition-all duration-500 ${
                      isHighlighted
                        ? 'bg-[#00C46A]'
                        : 'bg-[#006B3C] group-hover:bg-[#008F50]'
                    }`}
                    style={{ height: `${heightPct}%` }}
                  />
                </div>
                <span className="text-[11px] text-[#8899AA] font-medium">
                  {activeChart.labels[idx]}
                </span>
              </div>
            );
          })}
        </div>
      </div>

      {/* 6. Performance Metrics Widget */}
      <div className="bg-[#122010] p-5 rounded-2xl border border-[#2A5038]">
        <h2 className="text-sm font-bold text-white mb-3 flex items-center gap-2">
          <Activity className="w-4 h-4 text-[#00C46A]" />
          <span>System & Performance Telemetry</span>
        </h2>
        <div className="grid grid-cols-2 sm:grid-cols-3 lg:grid-cols-5 gap-3">
          <div className="bg-[#1A2E1C] p-3 rounded-xl border border-[#3A5068]/50">
            <div className="text-[10px] text-[#8899AA] uppercase font-semibold">Today's Orders</div>
            <div className="text-lg font-bold font-mono text-[#00C46A] mt-1">{todayOrders}</div>
          </div>
          <div className="bg-[#1A2E1C] p-3 rounded-xl border border-[#3A5068]/50">
            <div className="text-[10px] text-[#8899AA] uppercase font-semibold">Today's Revenue</div>
            <div className="text-lg font-bold font-mono text-white mt-1">TZS {todayRevenue.toLocaleString()}</div>
          </div>
          <div className="bg-[#1A2E1C] p-3 rounded-xl border border-[#3A5068]/50">
            <div className="text-[10px] text-[#8899AA] uppercase font-semibold">Display FPS</div>
            <div className="text-lg font-bold font-mono text-[#00C46A] mt-1">60.0</div>
          </div>
          <div className="bg-[#1A2E1C] p-3 rounded-xl border border-[#3A5068]/50">
            <div className="text-[10px] text-[#8899AA] uppercase font-semibold">API Latency</div>
            <div className="text-lg font-bold font-mono text-[#F59E0B] mt-1">42 ms</div>
          </div>
          <div className="bg-[#1A2E1C] p-3 rounded-xl border border-[#3A5068]/50">
            <div className="text-[10px] text-[#8899AA] uppercase font-semibold">Realtime Lag</div>
            <div className="text-lg font-bold font-mono text-[#F59E0B] mt-1">18 ms</div>
          </div>
        </div>
      </div>

      {/* 7. Today's Schedule Timeline Tasks */}
      <div className="bg-[#122010] p-5 rounded-2xl border border-[#2A5038]">
        <div className="flex items-center justify-between mb-4">
          <div>
            <h2 className="text-sm font-bold text-white flex items-center gap-2">
              <Clock className="w-4 h-4 text-[#00C46A]" />
              <span>Today's Schedule & Timeline</span>
            </h2>
            <p className="text-xs text-[#8899AA]">Tap checkmark to toggle delivery completion</p>
          </div>
          <span className="text-xs bg-[#006B3C]/30 text-[#00C46A] px-2.5 py-1 rounded-full font-semibold border border-[#00C46A]/30">
            {pendingTasksCount} pending
          </span>
        </div>

        <div className="space-y-3">
          {tasks.map((task) => (
            <div
              key={task.id}
              onClick={() => handleTaskToggle(task.id)}
              className={`flex items-start gap-3 p-3.5 rounded-xl border transition-all cursor-pointer ${
                task.isCompleted
                  ? 'bg-[#1A2E1C]/40 border-[#2A5038]/40 opacity-75'
                  : 'bg-[#1A2E1C] border-[#3A5068] hover:border-[#00C46A]'
              }`}
            >
              <button
                type="button"
                className="mt-0.5 text-[#00C46A] hover:scale-110 transition-transform"
              >
                {task.isCompleted ? (
                  <CheckCircle2 className="w-5 h-5 text-[#00C46A] fill-[#006B3C]/50" />
                ) : (
                  <Circle className="w-5 h-5 text-[#8899AA]" />
                )}
              </button>

              <div className="flex-1 min-w-0">
                <div className="flex items-center justify-between gap-2">
                  <h3 className={`text-xs sm:text-sm font-bold ${task.isCompleted ? 'text-[#8899AA] line-through' : 'text-white'}`}>
                    {task.title}
                  </h3>
                  <span className="text-[11px] font-mono text-[#8899AA] whitespace-nowrap">
                    {task.timeRange}
                  </span>
                </div>
                <p className="text-xs text-[#8899AA] mt-0.5 line-clamp-1">{task.subtitle}</p>
              </div>

              <div className="p-2 rounded-lg bg-[#122010] border border-[#243447]">
                {getTaskIcon(task.iconName)}
              </div>
            </div>
          ))}
        </div>
      </div>

      {/* 8. Floating Quick Action Button */}
      <div className="fixed bottom-20 md:bottom-8 right-6 z-30">
        <button
          onClick={() => onNavigate('orders')}
          className="flex items-center gap-2 bg-[#00C46A] hover:bg-[#008F50] text-[#0A1A0F] font-bold px-5 py-3.5 rounded-full shadow-2xl hover:shadow-[#00C46A]/20 transition-all transform hover:-translate-y-0.5 active:translate-y-0"
        >
          <Plus className="w-5 h-5 stroke-[2.5]" />
          <span>New Order</span>
        </button>
      </div>
    </div>
  );
};
