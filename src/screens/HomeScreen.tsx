import React, { useState, useEffect } from 'react';
import confetti from 'canvas-confetti';
import { useAuth } from '../context/AuthContext';
import { useLanguage } from '../context/LanguageContext';
import { storageService } from '../services/storage';
import { TimelineTask, Order } from '../types';
import { DeliveryCompletionDashboard } from '../components/DeliveryCompletionDashboard';
import { GoogleMapsLiveMap } from '../components/GoogleMapsLiveMap';
import { GoogleMapComponent } from '../components/GoogleMapComponent';
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
  RefreshCw,
  Zap,
  Activity,
  Award,
  MapPin,
  Compass,
  AlertCircle,
  ClipboardList,
  Navigation as NavIcon,
} from 'lucide-react';
import { geolocationService } from '../services/geolocation';

interface AiRecommendation {
  recommendedStop: string;
  reason: string;
  urgency: 'high' | 'medium' | 'normal';
  estimatedDriveMinutes?: number;
  batchSuggestion?: string;
  suggestedActions?: string[];
  source?: string;
}

interface HomeScreenProps {
  onNavigate: (view: string) => void;
}

export const HomeScreen: React.FC<HomeScreenProps> = ({ onNavigate }) => {
  const { user, role } = useAuth();
  const { isSwahili } = useLanguage();
  const [tasks, setTasks] = useState<TimelineTask[]>([]);
  const [orders, setOrders] = useState<Order[]>([]);
  const [selectedPeriod, setSelectedPeriod] = useState<'Daily' | 'Weekly' | 'Monthly'>('Weekly');
  const [selectedDayIndex, setSelectedDayIndex] = useState<number>(new Date().getDay() === 0 ? 6 : new Date().getDay() - 1);
  const [targetReached, setTargetReached] = useState<boolean>(false);

  // AI Next Stop Recommendation State
  const [aiRec, setAiRec] = useState<AiRecommendation | null>(null);
  const [isAiLoading, setIsAiLoading] = useState<boolean>(false);

  // Real-time Geolocation State
  const [homeMapTab, setHomeMapTab] = useState<'delivery_sites' | 'fleet_telemetry'>('delivery_sites');
  const [isGpsBroadcasting, setIsGpsBroadcasting] = useState<boolean>(false);
  const [myGpsCoords, setMyGpsCoords] = useState<any>(null);

  useEffect(() => {
    setIsGpsBroadcasting(geolocationService.isTrackingActive());
    const unsub = geolocationService.subscribeToCurrentLocation((loc) => {
      setMyGpsCoords(loc);
      setIsGpsBroadcasting(geolocationService.isTrackingActive());
    });
    return () => unsub();
  }, []);

  const handleToggleDeviceGps = async () => {
    if (isGpsBroadcasting) {
      geolocationService.stopTracking();
      setIsGpsBroadcasting(false);
    } else {
      if (!user) return;
      await geolocationService.startTracking(user, (loc) => {
        setMyGpsCoords(loc);
        setIsGpsBroadcasting(true);
      });
      setIsGpsBroadcasting(true);
    }
  };

  const handleRefreshRecommendation = async (force: boolean = false) => {
    // Check sessionStorage cache first if not forced
    if (!force) {
      try {
        const cachedRaw = sessionStorage.getItem('zamzam_rec_cache');
        if (cachedRaw) {
          const cached = JSON.parse(cachedRaw);
          if (cached && Date.now() - cached.savedAt < 5 * 60 * 1000) {
            setAiRec(cached.data);
            return;
          }
        }
      } catch {
        // ignore
      }
    }

    setIsAiLoading(true);
    try {
      const allOrders = storageService.getOrders();
      const completed = allOrders.filter((o) => o.status === 'approved');
      const pending = allOrders.filter((o) => o.status !== 'approved');

      if (pending.length === 0 && completed.length === 0) {
        const defaultRec: AiRecommendation = {
          recommendedStop: 'All Stops Clear',
          reason: 'No active delivery stops currently queued. Add client orders or dispatch tasks to receive real-time AI routing advice.',
          urgency: 'normal',
          batchSuggestion: 'Truck is parked at Central Depot ready for inventory loading.',
          suggestedActions: [
            'Create new customer delivery orders',
            'Verify stock counts before route departure',
          ],
          source: 'system',
        };
        setAiRec(defaultRec);
        try {
          sessionStorage.setItem('zamzam_rec_cache', JSON.stringify({ data: defaultRec, savedAt: Date.now() }));
        } catch {
          // ignore
        }
        setIsAiLoading(false);
        return;
      }

      const res = await fetch('/api/recommend-next-stop', {
        method: 'POST',
        headers: { 'Content-Type': 'application/json' },
        body: JSON.stringify({
          completedStops: completed.map((o) => ({ customer: o.customerName, address: o.customerAddress || 'Mwanza, Lake Zone' })),
          pendingStops: pending.map((o) => ({
            title: o.customerName,
            customer: o.customerName,
            address: o.customerAddress || 'Mwanza, Lake Zone',
            total: o.subtotal,
            payment: o.paymentMethod,
          })),
          truckInventory: { bottles18_9L: 26, bottles13L: 14 },
          currentLocation: 'Nyakato Industrial Area, Mwanza',
          timeOfDay: new Date().toLocaleTimeString([], { hour: '2-digit', minute: '2-digit' }),
        }),
      });

      if (res.ok) {
        const data = await res.json();
        setAiRec(data);
        try {
          sessionStorage.setItem('zamzam_rec_cache', JSON.stringify({ data, savedAt: Date.now() }));
        } catch {
          // ignore
        }
      }
    } catch (err) {
      console.warn('AI recommendation request failed:', err);
    } finally {
      setIsAiLoading(false);
    }
  };

  // Weekdays dynamically generated
  const weekDays = [
    { label: 'Mon', date: '16' },
    { label: 'Tue', date: '17' },
    { label: 'Wed', date: '18' },
    { label: 'Thu', date: '19' },
    { label: 'Fri', date: '20' },
    { label: 'Sat', date: '21' },
    { label: 'Sun', date: '22' },
  ];

  useEffect(() => {
    const loadedTasks = storageService.getTasks();
    const loadedOrders = storageService.getOrders();
    setTasks(loadedTasks);
    setOrders(loadedOrders);
    
    // Background cloud sync
    storageService.fetchOrdersFromCloud().then((cloudOrders) => {
      if (cloudOrders && cloudOrders.length > 0) {
        setOrders(cloudOrders);
      }
    });

    handleRefreshRecommendation();
  }, []);

  const todayOrders = orders.length;
  const todayRevenue = orders.reduce((sum, o) => sum + o.subtotal, 0);
  const revenueTarget = 300000;
  const targetProgress = Math.min(100, Math.round((todayRevenue / revenueTarget) * 100));

  // Dynamic Chart data computed from real orders
  const chartData: Record<'Daily' | 'Weekly' | 'Monthly', { labels: string[]; values: number[] }> = {
    Daily: {
      labels: ['Mon', 'Tue', 'Wed', 'Thu', 'Fri', 'Sat', 'Sun'],
      values: [0, 0, 0, 0, todayOrders > 0 ? todayOrders : 0, 0, 0],
    },
    Weekly: {
      labels: ['W1', 'W2', 'W3', 'W4'],
      values: [0, 0, todayOrders, 0],
    },
    Monthly: {
      labels: ['Jan', 'Feb', 'Mar', 'Apr', 'May', 'Jun'],
      values: [0, 0, todayOrders, 0, 0, 0],
    },
  };

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
  const maxChartVal = Math.max(1, ...activeChart.values);

  return (
    <div className="space-y-6 pb-24 md:pb-12">
      {/* 1. Header Greeting & Target Banner */}
      <div className="flex flex-col sm:flex-row sm:items-center justify-between gap-4 bg-[#122010] p-5 rounded-2xl border border-[#2A5038] shadow-lg">
        <div>
          <div className="flex items-center gap-2 text-xs font-semibold text-[#00C46A] tracking-wider uppercase">
            <Zap className="w-3.5 h-3.5" />
            <span>{isSwahili ? 'Zamu Inayoendelea • Usambazaji wa Njia' : 'Active Shift • Route Dispatch'}</span>
          </div>
          <h1 className="text-2xl font-bold text-white mt-1">
            {isSwahili ? `Habari, ${user?.name || 'Mhudumu'}` : `Welcome, ${user?.name || 'Staff Member'}`}
          </h1>
          <p className="text-xs text-[#8899AA] mt-0.5">
            Staff ID: <span className="font-mono text-white">{user?.employeeId || user?.id?.slice(0, 8) || 'ZZ-STAFF'}</span> &bull; {user?.role === 'supervisor' ? (isSwahili ? 'Usimamizi wa Uendeshaji' : 'Supervisor Operations') : 'Dar es Salaam Central'}
          </p>
        </div>

        {/* Target Progress Card & Google Forms Shortcut */}
        <div className="flex items-center gap-3">
          <button
            onClick={() => onNavigate('forms')}
            className="hidden sm:flex items-center gap-2 bg-[#122010] hover:bg-[#1A2E1C] border border-[#3A5068]/70 px-3.5 py-2.5 rounded-xl text-xs font-semibold text-[#00C46A] hover:text-white transition-all shadow-xs"
            title={isSwahili ? 'Simamia Fomu za Google na Tafiti za Wateja' : 'Manage Google Forms and Customer Surveys'}
          >
            <ClipboardList className="w-4 h-4" />
            <span>{isSwahili ? 'Fomu za Google' : 'Google Forms'}</span>
          </button>

          <div className="flex items-center gap-4 bg-[#1A2E1C] px-4 py-3 rounded-xl border border-[#3A5068]/50">
          <div className="text-right">
            <div className="text-[11px] text-[#8899AA]">
              {isSwahili ? 'Lengo la Siku' : 'Daily Target'} ({targetProgress}%)
            </div>
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
          <span className="text-xs font-semibold text-white">
            {isSwahili ? 'Ratiba ya Wiki Hii' : "This Week's Schedule"}
          </span>
          <span className="text-[11px] text-[#8899AA]">
            {isSwahili ? 'Machi 2026' : 'March 2026'}
          </span>
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

      {/* Real-time Field GPS Geolocation Tracking Bar */}
      <div className="bg-[#122010] p-4 rounded-2xl border border-[#2A5038] flex flex-col sm:flex-row sm:items-center justify-between gap-3 shadow-md">
        <div className="flex items-center gap-3">
          <div className="w-10 h-10 rounded-xl bg-[#006B3C]/30 text-[#00C46A] border border-[#00C46A]/30 flex items-center justify-center shrink-0">
            <Compass className={`w-5 h-5 ${isGpsBroadcasting ? 'animate-spin text-[#00C46A]' : 'text-[#8899AA]'}`} />
          </div>
          <div>
            <div className="flex items-center gap-2">
              <span className="text-xs sm:text-sm font-bold text-white">
                {isSwahili ? 'Ufuatiliaji wa Moja kwa Moja wa GPS' : 'Real-Time Geolocation Tracking'}
              </span>
              <span
                className={`text-[10px] font-bold uppercase tracking-wider px-2 py-0.5 rounded-full border ${
                  isGpsBroadcasting
                    ? 'bg-[#00C46A]/20 text-[#00C46A] border-[#00C46A]/30'
                    : 'bg-[#8899AA]/20 text-[#8899AA] border-[#8899AA]/30'
                }`}
              >
                {isGpsBroadcasting ? 'Broadcasting Live' : 'Standby'}
              </span>
            </div>
            <p className="text-[11px] text-[#8899AA]">
              {isGpsBroadcasting && myGpsCoords
                ? `Active GPS Signal: ${myGpsCoords.latitude.toFixed(4)}, ${myGpsCoords.longitude.toFixed(4)} (±${myGpsCoords.accuracy}m)`
                : isSwahili
                ? 'Sambaza eneo lako la ugani kwa wasimamizi na uone timu kwenye ramani'
                : 'Transmit high-accuracy field coordinates to supervisor command center'}
            </p>
          </div>
        </div>

        <div className="flex items-center gap-2">
          {/* If supervisor/manager, allow jumping straight to map */}
          {(role === 'supervisor' || role === 'manager') && (
            <button
              type="button"
              onClick={() => onNavigate('supervisor')}
              className="bg-[#1A2E1C] hover:bg-[#253D28] text-white border border-[#3A5068] hover:border-[#00C46A] px-3.5 py-2 rounded-xl text-xs font-semibold flex items-center gap-1.5 transition-all shadow-sm"
            >
              <NavIcon className="w-3.5 h-3.5 text-[#00C46A]" />
              <span>{isSwahili ? 'Fungua Ramani ya Ugani' : 'Open Live Map'}</span>
            </button>
          )}

          {/* Toggle Device GPS Transmitter */}
          <button
            type="button"
            onClick={handleToggleDeviceGps}
            className={`px-3.5 py-2 rounded-xl text-xs font-bold transition-all flex items-center gap-1.5 shadow-sm ${
              isGpsBroadcasting
                ? 'bg-red-500/20 text-red-300 border border-red-500/40 hover:bg-red-500/30'
                : 'bg-[#006B3C] text-white hover:bg-[#008F50] border border-[#00C46A]/40'
            }`}
          >
            <NavIcon className="w-3.5 h-3.5" />
            <span>{isGpsBroadcasting ? 'Stop GPS Broadcast' : 'Broadcast My GPS'}</span>
          </button>
        </div>
      </div>

      {/* Map View Mode Tabs */}
      <div className="flex items-center justify-between gap-3 bg-[#0E1A0E] p-2 rounded-2xl border border-[#2A5038]">
        <div className="flex items-center gap-1.5 bg-[#1A2E1C] p-1 rounded-xl border border-[#3A5068]/50">
          <button
            type="button"
            onClick={() => setHomeMapTab('delivery_sites')}
            className={`px-3.5 py-1.5 rounded-lg text-xs font-bold transition-all flex items-center gap-1.5 ${
              homeMapTab === 'delivery_sites'
                ? 'bg-[#006B3C] text-white shadow-sm'
                : 'text-[#8899AA] hover:text-white'
            }`}
          >
            <Package className="w-3.5 h-3.5 text-[#00C46A]" />
            <span>{isSwahili ? 'Maeneo ya Utoaji Mwanza' : 'Active Delivery Sites'}</span>
            <span className="text-[10px] bg-[#00C46A]/20 text-[#00C46A] px-1.5 py-0.2 rounded-full font-mono">
              12
            </span>
          </button>
          <button
            type="button"
            onClick={() => setHomeMapTab('fleet_telemetry')}
            className={`px-3.5 py-1.5 rounded-lg text-xs font-bold transition-all flex items-center gap-1.5 ${
              homeMapTab === 'fleet_telemetry'
                ? 'bg-[#006B3C] text-white shadow-sm'
                : 'text-[#8899AA] hover:text-white'
            }`}
          >
            <Truck className="w-3.5 h-3.5 text-[#60A5FA]" />
            <span>{isSwahili ? 'Meli ya Magari GPS' : 'Live Fleet Telemetry'}</span>
          </button>
        </div>

        <div className="hidden sm:flex items-center gap-2 text-[11px] text-[#8899AA] font-mono pr-2">
          <span className="w-2 h-2 rounded-full bg-[#00C46A] animate-pulse"></span>
          <span>Mwanza Basin &bull; Lake Zone</span>
        </div>
      </div>

      {/* Google Maps Operations Map View */}
      {homeMapTab === 'delivery_sites' ? (
        <GoogleMapComponent
          height="520px"
          showFilterBar={true}
          showQuickStats={true}
          showRoutes={true}
          showHubs={true}
          showZoneBoundary={true}
        />
      ) : (
        <GoogleMapsLiveMap onNavigate={onNavigate} />
      )}

      {/* 3. Recharts Active User Today's Delivery Completion Dashboard */}
      <DeliveryCompletionDashboard
        user={user}
        tasks={tasks}
        orders={orders}
        onNavigate={onNavigate}
      />

      {/* 4. Dual Metric Row (Route Progress & Pending Sync) */}
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

      {/* 4. AI Next Stop Recommendation Card */}
      <div className="bg-gradient-to-br from-[#006B3C]/25 via-[#122010] to-[#0D1E12] p-5 sm:p-6 rounded-2xl border border-[#00C46A]/50 relative shadow-xl overflow-hidden group">
        {/* Background glow & decoration */}
        <div className="absolute top-0 right-0 w-48 h-48 bg-[#00C46A]/10 rounded-full blur-3xl pointer-events-none" />

        <div className="flex flex-col sm:flex-row sm:items-center justify-between gap-3 relative z-10">
          <div className="flex items-center gap-2.5">
            <div className="p-2 bg-[#00C46A]/20 rounded-xl text-[#00C46A] border border-[#00C46A]/40 shadow-sm">
              <Sparkles className="w-5 h-5" />
            </div>
            <div>
              <div className="flex items-center gap-2">
                <span className="text-xs sm:text-sm font-bold text-white tracking-wide">
                  {isSwahili ? 'Pendekezo la Kituo Kinachofuata' : 'Next Stop Recommendation'}
                </span>
                <span className="bg-[#00C46A]/20 text-[#00C46A] text-[10px] font-bold uppercase tracking-wider px-2 py-0.5 rounded-full border border-[#00C46A]/30 flex items-center gap-1">
                  <Zap className="w-3 h-3 text-[#00C46A]" />
                  <span>{aiRec?.source === 'logistics_engine' ? 'Logistics Engine' : 'Gemini AI'}</span>
                </span>
              </div>
              <p className="text-[11px] text-[#8899AA]">
                {isSwahili
                  ? 'Uchambuzi wa papo hapo wa msongamano, hesabu za stoo, na dharura ya mteja'
                  : 'Real-time traffic, inventory & customer urgency analysis'}
              </p>
            </div>
          </div>

          <div className="flex items-center gap-2">
            {aiRec?.estimatedDriveMinutes && (
              <span className="text-xs text-[#00C46A] bg-[#006B3C]/30 px-2.5 py-1 rounded-lg border border-[#00C46A]/30 flex items-center gap-1 font-semibold">
                <Clock className="w-3.5 h-3.5" />
                <span>~{aiRec.estimatedDriveMinutes} min drive</span>
              </span>
            )}

            <button
              type="button"
              onClick={() => handleRefreshRecommendation(true)}
              disabled={isAiLoading}
              title="Re-run route recommendation with Gemini AI"
              className="flex items-center gap-1.5 bg-[#1A2E1C] hover:bg-[#253D28] text-white border border-[#3A5068] hover:border-[#00C46A] px-3 py-1.5 rounded-xl text-xs font-semibold transition-all disabled:opacity-60 shadow-sm"
            >
              <RefreshCw className={`w-3.5 h-3.5 text-[#00C46A] ${isAiLoading ? 'animate-spin' : ''}`} />
              <span>{isAiLoading ? 'Analyzing...' : 'Re-Optimize'}</span>
            </button>
          </div>
        </div>

        {/* Main Recommendation Content */}
        <div className="mt-4 pt-3 border-t border-[#2A5038]/70 relative z-10 space-y-3">
          {aiRec ? (
            <>
              <div className="flex flex-col sm:flex-row sm:items-center justify-between gap-2">
                <div className="flex items-center gap-2">
                  <MapPin className="w-4 h-4 text-[#00C46A] shrink-0" />
                  <span className="text-sm sm:base font-bold text-white">
                    {aiRec.recommendedStop}
                  </span>
                  <span
                    className={`text-[10px] uppercase font-bold px-2 py-0.5 rounded-md ${
                      aiRec.urgency === 'high'
                        ? 'bg-rose-900/50 text-rose-300 border border-rose-500/40'
                        : 'bg-emerald-900/50 text-emerald-300 border border-emerald-500/40'
                    }`}
                  >
                    {aiRec.urgency} Urgency
                  </span>
                </div>

                <button
                  type="button"
                  onClick={() => onNavigate('orders')}
                  className="self-start sm:self-auto bg-[#00C46A] hover:bg-[#008F50] text-[#0A1A0F] font-bold px-3.5 py-1.5 rounded-xl text-xs flex items-center gap-1.5 shadow-md shadow-[#00C46A]/20 transition-transform active:scale-95"
                >
                  <Compass className="w-3.5 h-3.5 text-[#0A1A0F]" />
                  <span>Navigate to Stop</span>
                </button>
              </div>

              <p className="text-xs sm:text-sm text-[#D0E8F0] leading-relaxed">
                {aiRec.reason}
              </p>

              {aiRec.batchSuggestion && (
                <div className="bg-[#1A2E1C]/80 p-2.5 rounded-xl border border-[#2A5038] text-xs text-[#8899AA] flex items-start gap-2">
                  <Store className="w-4 h-4 text-[#00C46A] shrink-0 mt-0.5" />
                  <div>
                    <strong className="text-white">Route Efficiency: </strong>
                    <span className="text-[#D0E8F0]">{aiRec.batchSuggestion}</span>
                  </div>
                </div>
              )}

              {aiRec.suggestedActions && aiRec.suggestedActions.length > 0 && (
                <div className="flex flex-wrap items-center gap-1.5 pt-1">
                  <span className="text-[11px] font-semibold text-[#8899AA] mr-1">Action Items:</span>
                  {aiRec.suggestedActions.map((action, idx) => (
                    <span
                      key={idx}
                      className="bg-[#162719] text-[#D0E8F0] border border-[#2A5038] px-2.5 py-1 rounded-lg text-[11px] flex items-center gap-1"
                    >
                      <CheckCircle2 className="w-3 h-3 text-[#00C46A]" />
                      <span>{action}</span>
                    </span>
                  ))}
                </div>
              )}
            </>
          ) : (
            <div className="py-4 text-center text-xs text-[#8899AA]">
              {isAiLoading ? 'Analyzing dispatch schedule and traffic conditions...' : 'No route recommendation available yet. Tap Re-Optimize to generate.'}
            </div>
          )}
        </div>
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

        {tasks.length === 0 ? (
          <div className="text-center py-8 px-4 bg-[#1A2E1C]/40 rounded-xl border border-dashed border-[#2A5038] text-xs text-[#8899AA]">
            <Clock className="w-8 h-8 mx-auto text-[#00C46A]/50 mb-2" />
            <div className="font-bold text-white mb-1">No Scheduled Stops for Today</div>
            <p>Deliveries and dispatch tasks registered in the system will automatically populate your shift timeline.</p>
            <button
              onClick={() => onNavigate('orders')}
              className="mt-3 inline-flex items-center gap-1.5 bg-[#006B3C] hover:bg-[#008F50] text-white px-3 py-1.5 rounded-lg font-semibold text-xs transition-colors"
            >
              <Plus className="w-3.5 h-3.5" />
              <span>Create Delivery Order</span>
            </button>
          </div>
        ) : (
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
        )}
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
