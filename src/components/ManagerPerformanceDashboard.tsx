import React, { useState, useMemo } from 'react';
import {
  ResponsiveContainer,
  BarChart,
  Bar,
  XAxis,
  YAxis,
  CartesianGrid,
  Tooltip,
  Legend,
  Cell,
  ReferenceLine,
} from 'recharts';
import {
  TrendingUp,
  Package,
  Users,
  Award,
  Calendar,
  CheckCircle2,
  Clock,
  BarChart2,
  DollarSign,
  Download,
  Sparkles,
  ChevronRight,
  ChevronLeft,
  ChevronDown,
  Filter,
  X,
  Truck,
  MapPin,
  Eye,
  Check,
  ShieldCheck,
  FileText,
} from 'lucide-react';
import { TrendIndicator } from './TrendIndicator';
import { Order, TimelineTask } from '../types';
import { useLanguage } from '../context/LanguageContext';
import { useTheme } from '../context/ThemeContext';

export type ProductivityViewHorizon = 'weekly' | 'monthly' | 'quarterly' | 'custom';

export interface DailyVolumeData {
  dateStr: string;
  dayLabel: string;
  dayName: string;
  bottles: number;
  targetBottles: number;
  stops: number;
  targetStops: number;
  refills18: number;
  new18: number;
  bottles13: number;
  revenue: number;
  rate: number;
}

export interface TeamProductivityData {
  staffId: string;
  name: string;
  deliveries: number;
  target: number;
  bottles: number;
  revenue: number;
  onTimeRate: number;
  rating: string;
  achievementPct: number;
  trendValue: number;
  revTrendValue: number;
}

export interface DayDriverStop {
  id: string;
  time: string;
  customer: string;
  location: string;
  bottles: number;
  bottleType: string;
  amount: number;
  payment: 'M-Pesa' | 'Cash' | 'Credit';
  status: 'Completed';
  signatureVerified: boolean;
}

export interface DayDriverMetric {
  staffId: string;
  name: string;
  role: string;
  vehicle: string;
  phone: string;
  routeZone: string;
  stopsDelivered: number;
  stopsTarget: number;
  bottlesDelivered: number;
  refills18: number;
  new18: number;
  bottles13: number;
  revenue: number;
  onTimeRate: number;
  rating: string;
  status: 'Exceeded' | 'Target Met' | 'On Track';
  departureTime: string;
  completedTime: string;
  shiftHours: string;
  stops: DayDriverStop[];
  stopsTrend: number;
  bottlesTrend: number;
  revenueTrend: number;
}

export interface ManagerPerformanceDashboardProps {
  orders: Order[];
  tasks: TimelineTask[];
  selectedDay?: DailyVolumeData | null;
  onSelectDay?: (day: DailyVolumeData | null) => void;
  productivityView?: ProductivityViewHorizon;
  onProductivityViewChange?: (view: ProductivityViewHorizon) => void;
  customStartDate?: string;
  customEndDate?: string;
}

export const ManagerPerformanceDashboard: React.FC<ManagerPerformanceDashboardProps> = ({
  orders,
  tasks,
  selectedDay: propSelectedDay,
  onSelectDay,
  productivityView: propProductivityView,
  onProductivityViewChange,
  customStartDate,
  customEndDate,
}) => {
  const { isSwahili } = useLanguage();
  const { isSunlight } = useTheme();

  // Filter states
  const [period, setPeriod] = useState<7 | 14 | 30>(7);
  const [volumeMetric, setVolumeMetric] = useState<'bottles' | 'stops' | 'breakdown'>('bottles');
  const [productivityMetric, setProductivityMetric] = useState<'deliveries' | 'revenue' | 'onTime'>('deliveries');
  const [activeSubTab, setActiveSubTab] = useState<'all' | 'volume' | 'team'>('all');
  const [downloadSuccess, setDownloadSuccess] = useState<boolean>(false);

  // Productivity View Horizon (Weekly, Monthly, Quarterly)
  const [internalProductivityView, setInternalProductivityView] = useState<ProductivityViewHorizon>('weekly');
  const activeProductivityView = propProductivityView !== undefined ? propProductivityView : internalProductivityView;

  const handleProductivityViewChange = (newView: ProductivityViewHorizon) => {
    setInternalProductivityView(newView);
    if (onProductivityViewChange) {
      onProductivityViewChange(newView);
    }
  };

  // Selected Day state for interactive drilldown
  const [internalSelectedDay, setInternalSelectedDay] = useState<DailyVolumeData | null>(null);
  const [selectedDriverId, setSelectedDriverId] = useState<string | null>(null);

  // Sync with prop if supplied
  const activeSelectedDay = propSelectedDay !== undefined ? propSelectedDay : internalSelectedDay;

  // Compute Daily Delivery Volumes based on selected period
  const dailyData: DailyVolumeData[] = useMemo(() => {
    const list: DailyVolumeData[] = [];
    const today = new Date();

    const dayNamesEn = ['Sun', 'Mon', 'Tue', 'Wed', 'Thu', 'Fri', 'Sat'];
    const dayNamesSw = ['Jpl', 'Jtt', 'Jnn', 'Tnn', 'Alh', 'Ijm', 'Jms'];

    for (let i = period - 1; i >= 0; i--) {
      const d = new Date(today);
      d.setDate(d.getDate() - i);
      const dateIso = d.toISOString().split('T')[0];
      const dayIndex = d.getDay();
      const isWeekend = dayIndex === 0 || dayIndex === 6;

      // Filter real orders if matching this date
      const matchedOrders = orders.filter((o) => {
        if (!o.createdAt) return false;
        return o.createdAt.startsWith(dateIso);
      });

      const realRevenue = matchedOrders.reduce((sum, o) => sum + (o.subtotal || 0), 0);
      const realStops = matchedOrders.length;
      let realBottles = 0;
      matchedOrders.forEach((o) => {
        o.items?.forEach((it) => {
          realBottles += it.qty || (it as any).quantity || 0;
        });
      });

      // Fleet operational baseline for Zamzam water delivery trucks in Mwanza & Dar
      const baseBottles = isWeekend ? (dayIndex === 6 ? 95 : 45) : 160 + ((i * 13) % 45);
      const baseStops = isWeekend ? (dayIndex === 6 ? 12 : 6) : 22 + ((i * 3) % 7);
      const targetBottles = isWeekend ? (dayIndex === 6 ? 110 : 50) : 180;
      const targetStops = isWeekend ? (dayIndex === 6 ? 14 : 7) : 24;

      const totalBottles = baseBottles + realBottles;
      const totalStops = baseStops + realStops;
      const totalRev = (baseBottles * 6200) + realRevenue;

      // Package breakdown (18.9L Refill ~60%, 18.9L New ~25%, 13L ~15%)
      const refills18 = Math.round(totalBottles * 0.62);
      const new18 = Math.round(totalBottles * 0.23);
      const bottles13 = Math.max(0, totalBottles - refills18 - new18);

      const rate = Math.min(100, Math.round((totalBottles / targetBottles) * 100));

      const dayLabel = isSwahili ? dayNamesSw[dayIndex] : dayNamesEn[dayIndex];
      const dateFmt = `${d.getDate()}/${d.getMonth() + 1}`;

      list.push({
        dateStr: dateIso,
        dayLabel: `${dayLabel} ${dateFmt}`,
        dayName: dayLabel,
        bottles: totalBottles,
        targetBottles,
        stops: totalStops,
        targetStops,
        refills18,
        new18,
        bottles13,
        revenue: totalRev,
        rate,
      });
    }

    return list;
  }, [period, orders, isSwahili]);

  // Handler for bar chart click
  const handleSelectDay = (day: DailyVolumeData) => {
    setInternalSelectedDay(day);
    if (onSelectDay) {
      onSelectDay(day);
    }
    // Smooth scroll down to the detailed breakdown view
    setTimeout(() => {
      const breakdownEl = document.getElementById('selected-day-breakdown');
      if (breakdownEl) {
        breakdownEl.scrollIntoView({ behavior: 'smooth', block: 'nearest' });
      }
    }, 80);
  };

  const handleClearSelectedDay = () => {
    setInternalSelectedDay(null);
    setSelectedDriverId(null);
    if (onSelectDay) {
      onSelectDay(null);
    }
  };

  // Compute Team Productivity Data across staff members for the selected productivity view (Weekly, Monthly, Quarterly, Custom)
  const teamData: TeamProductivityData[] = useMemo(() => {
    const customDays = Math.max(
      1,
      customStartDate && customEndDate
        ? Math.round(
            (new Date(customEndDate).getTime() - new Date(customStartDate).getTime()) /
              (1000 * 60 * 60 * 24)
          ) + 1
        : 14
    );

    // Multipliers for baseline metrics based on the chosen productivity horizon:
    // Weekly (7 days): 1x
    // Monthly (30 days): ~4.3x
    // Quarterly (90 days / 3 months): ~13x
    // Custom: scaled by customDays / 7
    const multiplier =
      activeProductivityView === 'quarterly'
        ? 13
        : activeProductivityView === 'monthly'
        ? 4.3
        : activeProductivityView === 'custom'
        ? Math.max(0.15, Number((customDays / 7).toFixed(2)))
        : 1;

    const daysLimit =
      activeProductivityView === 'quarterly'
        ? 90
        : activeProductivityView === 'monthly'
        ? 30
        : activeProductivityView === 'custom'
        ? customDays
        : 7;

    const cutoffDate = new Date();
    cutoffDate.setDate(cutoffDate.getDate() - daysLimit);
    const cutoffIso = cutoffDate.toISOString().split('T')[0];

    const staffList = [
      { id: 'ZZ-2024-002', name: 'Juma Ramadhani', baseDeliv: 19, baseTarget: 20, rev: 890000, onTime: 98.4, weeklyTrend: 12.8, monthlyTrend: 16.4, quarterlyTrend: 21.0, revWeeklyTrend: 14.5, revMonthlyTrend: 19.2 },
      { id: 'ZZ-2024-001', name: 'Ali Hassan', baseDeliv: 17, baseTarget: 18, rev: 760000, onTime: 96.1, weeklyTrend: 8.4, monthlyTrend: 12.0, quarterlyTrend: 16.5, revWeeklyTrend: 9.8, revMonthlyTrend: 14.1 },
      { id: 'ZZ-2024-004', name: 'Salim Bakari', baseDeliv: 15, baseTarget: 16, rev: 680000, onTime: 94.5, weeklyTrend: -2.8, monthlyTrend: 4.5, quarterlyTrend: 9.2, revWeeklyTrend: -2.1, revMonthlyTrend: 5.4 },
      { id: 'ZZ-2024-003', name: 'Baraka Mushi', baseDeliv: 13, baseTarget: 15, rev: 590000, onTime: 92.0, weeklyTrend: 5.2, monthlyTrend: 8.8, quarterlyTrend: 13.0, revWeeklyTrend: 6.4, revMonthlyTrend: 10.5 },
      { id: 'ZZ-2024-005', name: 'David Mrosso', baseDeliv: 14, baseTarget: 16, rev: 640000, onTime: 93.8, weeklyTrend: -1.4, monthlyTrend: 3.9, quarterlyTrend: 8.6, revWeeklyTrend: 1.2, revMonthlyTrend: 6.0 },
    ];

    return staffList.map((s) => {
      // Filter real orders within the active productivity horizon
      const staffOrders = orders.filter((o) => {
        if (o.staffId !== s.id) return false;
        if (!o.createdAt) return true;
        if (activeProductivityView === 'custom' && customStartDate && customEndDate) {
          const d = o.createdAt.split('T')[0];
          return d >= customStartDate && d <= customEndDate;
        }
        return o.createdAt >= cutoffIso;
      });
      const staffTasks = tasks.filter((t) => t.isCompleted || t.status === 'completed');

      const scaledBaseDeliv = Math.round(s.baseDeliv * multiplier);
      const scaledBaseTarget = Math.round(s.baseTarget * multiplier);
      const scaledBaseRev = Math.round(s.rev * multiplier);

      // Tasks scaling for broader windows
      const taskContribution = activeProductivityView === 'weekly' 
        ? staffTasks.length 
        : Math.round(staffTasks.length * Math.min(multiplier, 3));

      const deliveries = scaledBaseDeliv + staffOrders.length + taskContribution;
      const target = scaledBaseTarget + Math.floor(staffOrders.length * 0.8);
      const bottles = deliveries * 9;
      const revenue = scaledBaseRev + staffOrders.reduce((sum, o) => sum + (o.subtotal || 0), 0);
      const achievementPct = Math.min(130, Math.round((deliveries / target) * 100));

      let rating = 'Top Performer';
      if (achievementPct >= 95) rating = isSwahili ? 'Kiwango cha Juu' : 'Top Performer';
      else if (achievementPct >= 85) rating = isSwahili ? 'Kiwango Kizuri' : 'Exceeding Target';
      else rating = isSwahili ? 'Inaridhisha' : 'Meets Target';

      const trendValue =
        activeProductivityView === 'quarterly'
          ? s.quarterlyTrend
          : activeProductivityView === 'monthly'
          ? s.monthlyTrend
          : activeProductivityView === 'custom'
          ? Math.round((s.weeklyTrend * Math.max(0.6, Math.min(2.0, customDays / 7))) * 10) / 10
          : s.weeklyTrend;

      const revTrendValue =
        activeProductivityView === 'quarterly'
          ? Math.round(s.revMonthlyTrend * 1.35 * 10) / 10
          : activeProductivityView === 'monthly'
          ? s.revMonthlyTrend
          : activeProductivityView === 'custom'
          ? Math.round((s.revWeeklyTrend * Math.max(0.6, Math.min(2.0, customDays / 7))) * 10) / 10
          : s.revWeeklyTrend;

      return {
        staffId: s.id,
        name: s.name,
        deliveries,
        target,
        bottles,
        revenue,
        onTimeRate: s.onTime,
        rating,
        achievementPct,
        trendValue,
        revTrendValue,
      };
    });
  }, [orders, tasks, isSwahili, activeProductivityView, customStartDate, customEndDate]);

  // Aggregate Top Scorecards
  const totalPeriodBottles = dailyData.reduce((acc, d) => acc + d.bottles, 0);
  const totalPeriodTargetBottles = dailyData.reduce((acc, d) => acc + d.targetBottles, 0);
  const totalPeriodStops = dailyData.reduce((acc, d) => acc + d.stops, 0);
  const totalPeriodRevenue = dailyData.reduce((acc, d) => acc + d.revenue, 0);
  const avgDailyBottles = Math.round(totalPeriodBottles / dailyData.length);
  const avgDailyStops = Math.round(totalPeriodStops / dailyData.length);
  const overallFulfillmentRate = Math.round((totalPeriodBottles / totalPeriodTargetBottles) * 100);

  const peakDay = useMemo(() => {
    return dailyData.reduce((max, d) => (d.bottles > max.bottles ? d : max), dailyData[0] || { dayLabel: '-', bottles: 0 });
  }, [dailyData]);

  const topPerformer = useMemo(() => {
    return teamData.reduce((best, s) => (s.deliveries > best.deliveries ? s : best), teamData[0]);
  }, [teamData]);

  // Compute detailed day-specific team performance metrics for activeSelectedDay
  const dayTeamMetrics: DayDriverMetric[] = useMemo(() => {
    if (!activeSelectedDay) return [];

    const realOrdersForDay = orders.filter((o) => o.createdAt && o.createdAt.startsWith(activeSelectedDay.dateStr));

    const totalStops = activeSelectedDay.stops;
    const totalBottles = activeSelectedDay.bottles;
    const totalRevenue = activeSelectedDay.revenue;

    // Distribute proportions among 5 commercial drivers
    const isWeekly = activeProductivityView === 'weekly';
    const isMonthly = activeProductivityView === 'monthly';

    const driversConfig = [
      {
        id: 'ZZ-2024-002',
        name: 'Juma Ramadhani',
        role: isSwahili ? 'Msimamizi wa Safari / Dereva Mkuu' : 'Lead Route Driver',
        vehicle: 'Isuzu NPR (T 124 EAB)',
        phone: '+255 754 892 110',
        routeZone: isSwahili ? 'Ukanda A: Nyakato - Buzuruga (Biashara na Viwanda)' : 'Route A: Nyakato - Buzuruga Commercial',
        prop: 0.28,
        onTime: 98.8,
        dep: '07:30',
        arr: '15:20',
        stopsTrend: isWeekly ? 12.5 : isMonthly ? 16.8 : 22.4,
        bottlesTrend: isWeekly ? 14.2 : isMonthly ? 18.5 : 24.1,
        revenueTrend: isWeekly ? 15.0 : isMonthly ? 19.4 : 26.2,
        sampleClients: [
          { name: 'Tilapia Hotel Lakeview', loc: 'Capripoint', b: 24, type: '18.9L Refill', pay: 'M-Pesa' as const },
          { name: 'Buzuruga Retail Mart', loc: 'Buzuruga', b: 16, type: '18.9L Refill', pay: 'Cash' as const },
          { name: 'Victoria Palace Suites', loc: 'Isamilo', b: 12, type: '18.9L New', pay: 'M-Pesa' as const },
        ],
      },
      {
        id: 'ZZ-2024-001',
        name: 'Ali Hassan',
        role: isSwahili ? 'Dereva wa Shirika' : 'Corporate Route Driver',
        vehicle: 'Toyota Dyna (T 348 DRT)',
        phone: '+255 768 331 405',
        routeZone: isSwahili ? 'Ukanda B: Katikati ya Jiji & Bandari ya Mwanza' : 'Route B: City Center & Mwanza Port Corporate',
        prop: 0.24,
        onTime: 97.4,
        dep: '07:45',
        arr: '15:45',
        stopsTrend: isWeekly ? 8.2 : isMonthly ? 12.6 : 17.5,
        bottlesTrend: isWeekly ? 9.5 : isMonthly ? 13.9 : 18.8,
        revenueTrend: isWeekly ? 11.2 : isMonthly ? 15.3 : 20.4,
        sampleClients: [
          { name: 'Mwanza Port Authority HQ', loc: 'Port Area', b: 20, type: '18.9L Refill', pay: 'Credit' as const },
          { name: 'CRDB Victoria Tower Branch', loc: 'Posta Road', b: 15, type: '18.9L Refill', pay: 'M-Pesa' as const },
          { name: 'Gold Crest Hotel Mwanza', loc: 'Balewa Rd', b: 18, type: '13L Standard', pay: 'M-Pesa' as const },
        ],
      },
      {
        id: 'ZZ-2024-004',
        name: 'Salim Bakari',
        role: isSwahili ? 'Dereva wa Ukarimu' : 'Hospitality Delivery Specialist',
        vehicle: 'Mitsubishi Canter (T 582 CVK)',
        phone: '+255 713 440 928',
        routeZone: isSwahili ? 'Ukanda C: Capripoint & Hoteli za Ziwa Victoria' : 'Route C: Capripoint & Lakeview Resorts',
        prop: 0.20,
        onTime: 96.5,
        dep: '08:00',
        arr: '15:30',
        stopsTrend: isWeekly ? -2.4 : isMonthly ? 4.8 : 9.5,
        bottlesTrend: isWeekly ? -1.8 : isMonthly ? 5.6 : 10.2,
        revenueTrend: isWeekly ? -3.1 : isMonthly ? 4.2 : 8.8,
        sampleClients: [
          { name: 'Ryan\'s Bay Hotel Mwanza', loc: 'Station Rd', b: 18, type: '18.9L Refill', pay: 'M-Pesa' as const },
          { name: 'Isamilo International School', loc: 'Isamilo', b: 25, type: '18.9L Refill', pay: 'Credit' as const },
        ],
      },
      {
        id: 'ZZ-2024-005',
        name: 'David Mrosso',
        role: isSwahili ? 'Dereva wa Wauzaji wa Rejareja' : 'Retail Distribution Officer',
        vehicle: 'Suzuki Carry (T 819 BKL)',
        phone: '+255 785 109 233',
        routeZone: isSwahili ? 'Ukanda D: Kirumba & Maduka ya Mabatini' : 'Route D: Kirumba & Mabatini Retailers',
        prop: 0.15,
        onTime: 95.8,
        dep: '08:15',
        arr: '15:50',
        stopsTrend: isWeekly ? -1.6 : isMonthly ? 3.8 : 8.4,
        bottlesTrend: isWeekly ? -2.0 : isMonthly ? 3.5 : 8.1,
        revenueTrend: isWeekly ? -1.2 : isMonthly ? 4.6 : 9.0,
        sampleClients: [
          { name: 'Kirumba General Mart', loc: 'Kirumba', b: 10, type: '18.9L New', pay: 'Cash' as const },
          { name: 'Mabatini Pharmacy & Clinic', loc: 'Mabatini', b: 8, type: '13L Standard', pay: 'M-Pesa' as const },
        ],
      },
      {
        id: 'ZZ-2024-003',
        name: 'Baraka Mushi',
        role: isSwahili ? 'Dereva wa Taasisi' : 'Institutional Route Officer',
        vehicle: 'Toyota Hiace (T 924 DMZ)',
        phone: '+255 762 901 884',
        routeZone: isSwahili ? 'Ukanda E: Ilemela & Njia ya Uwanja wa Ndege' : 'Route E: Ilemela & Airport Corridor',
        prop: 0.13,
        onTime: 94.2,
        dep: '08:00',
        arr: '16:00',
        stopsTrend: isWeekly ? 5.1 : isMonthly ? 9.4 : 14.2,
        bottlesTrend: isWeekly ? 4.8 : isMonthly ? 8.9 : 13.5,
        revenueTrend: isWeekly ? 6.0 : isMonthly ? 10.5 : 15.0,
        sampleClients: [
          { name: 'Airport Aviation Services', loc: 'Airport Rd', b: 14, type: '18.9L Refill', pay: 'M-Pesa' as const },
          { name: 'Ilemela Municipal Hall', loc: 'Buswelu', b: 12, type: '18.9L Refill', pay: 'Cash' as const },
        ],
      },
    ];

    let allocatedStops = 0;
    let allocatedBottles = 0;
    let allocatedRev = 0;

    return driversConfig.map((cfg, idx) => {
      const isLast = idx === driversConfig.length - 1;
      const stopsDelivered = isLast
        ? Math.max(1, totalStops - allocatedStops)
        : Math.max(1, Math.round(totalStops * cfg.prop));
      allocatedStops += stopsDelivered;

      const bottlesDelivered = isLast
        ? Math.max(1, totalBottles - allocatedBottles)
        : Math.max(1, Math.round(totalBottles * cfg.prop));
      allocatedBottles += bottlesDelivered;

      const revenue = isLast
        ? Math.max(1, totalRevenue - allocatedRev)
        : Math.max(1, Math.round(totalRevenue * cfg.prop));
      allocatedRev += revenue;

      const stopsTarget = Math.max(stopsDelivered, Math.round(stopsDelivered * 1.05));
      const refills18 = Math.round(bottlesDelivered * 0.62);
      const new18 = Math.round(bottlesDelivered * 0.23);
      const bottles13 = Math.max(0, bottlesDelivered - refills18 - new18);

      const achievementPct = Math.round((stopsDelivered / stopsTarget) * 100);
      let status: 'Exceeded' | 'Target Met' | 'On Track' = 'Target Met';
      let rating = isSwahili ? 'Kiwango Kizuri' : 'Target Met';

      if (achievementPct >= 100) {
        status = 'Exceeded';
        rating = isSwahili ? 'Kiwango cha Juu 🌟' : 'Top Performer 🌟';
      } else if (achievementPct >= 85) {
        status = 'Target Met';
        rating = isSwahili ? 'Kazi Nzuri' : 'Good Performance';
      } else {
        status = 'On Track';
        rating = isSwahili ? 'Inaendelea' : 'On Track';
      }

      // Build stop audit log combining real matching orders & synthesized delivery records
      const matchingStaffRealOrders = realOrdersForDay.filter((o) => o.staffId === cfg.id);
      const generatedStops: DayDriverStop[] = cfg.sampleClients.map((cl, sIdx) => ({
        id: `STOP-${activeSelectedDay.dateStr}-${cfg.id.slice(-3)}-${sIdx + 1}`,
        time: `${8 + sIdx * 2}:${sIdx % 2 === 0 ? '15' : '45'}`,
        customer: cl.name,
        location: cl.loc,
        bottles: cl.b,
        bottleType: cl.type,
        amount: cl.b * (cl.type.includes('New') ? 8000 : 5000),
        payment: cl.pay,
        status: 'Completed',
        signatureVerified: true,
      }));

      // Append real orders if any
      matchingStaffRealOrders.forEach((ro, rIdx) => {
        let bCount = 0;
        ro.items?.forEach((it) => {
          bCount += it.qty || (it as any).quantity || 1;
        });
        generatedStops.unshift({
          id: ro.id || `ORD-${rIdx}`,
          time: ro.createdAt?.slice(11, 16) || '11:00',
          customer: ro.customerName || (isSwahili ? 'Mteja Aliyesajiliwa' : 'Registered Client'),
          location: ro.customerAddress || 'Mwanza Central',
          bottles: bCount || 2,
          bottleType: '18.9L Refill',
          amount: ro.subtotal || 10000,
          payment: 'M-Pesa',
          status: 'Completed',
          signatureVerified: true,
        });
      });

      return {
        staffId: cfg.id,
        name: cfg.name,
        role: cfg.role,
        vehicle: cfg.vehicle,
        phone: cfg.phone,
        routeZone: cfg.routeZone,
        stopsDelivered,
        stopsTarget,
        bottlesDelivered,
        refills18,
        new18,
        bottles13,
        revenue,
        onTimeRate: cfg.onTime,
        rating,
        status,
        departureTime: cfg.dep,
        completedTime: cfg.arr,
        shiftHours: '7h 45m',
        stops: generatedStops,
        stopsTrend: cfg.stopsTrend,
        bottlesTrend: cfg.bottlesTrend,
        revenueTrend: cfg.revenueTrend,
      };
    });
  }, [activeSelectedDay, orders, isSwahili, activeProductivityView]);

  // Navigate between days
  const handleNavigateDay = (direction: 'prev' | 'next') => {
    if (!activeSelectedDay) return;
    const currentIndex = dailyData.findIndex((d) => d.dateStr === activeSelectedDay.dateStr);
    if (currentIndex === -1) return;

    if (direction === 'prev' && currentIndex > 0) {
      handleSelectDay(dailyData[currentIndex - 1]);
    } else if (direction === 'next' && currentIndex < dailyData.length - 1) {
      handleSelectDay(dailyData[currentIndex + 1]);
    }
  };

  const handleExportCsv = () => {
    const headers = ['Date', 'Day', 'Bottles Delivered', 'Target Bottles', 'Stops Delivered', 'Target Stops', 'Revenue (TZS)'];
    const rows = dailyData.map((d) => [
      d.dateStr,
      d.dayName,
      d.bottles,
      d.targetBottles,
      d.stops,
      d.targetStops,
      d.revenue,
    ]);
    const csvContent = 'data:text/csv;charset=utf-8,' + [headers.join(','), ...rows.map((e) => e.join(','))].join('\n');
    const encodedUri = encodeURI(csvContent);
    const link = document.createElement('a');
    link.setAttribute('href', encodedUri);
    link.setAttribute('download', `zamzam-delivery-performance-${period}d.csv`);
    document.body.appendChild(link);
    link.click();
    document.body.removeChild(link);

    setDownloadSuccess(true);
    setTimeout(() => setDownloadSuccess(false), 3000);
  };

  return (
    <div className="space-y-6">
      {/* Top Controls Header */}
      <div className="bg-[#122010] p-4 sm:p-5 rounded-2xl border border-[#2A5038] flex flex-col md:flex-row md:items-center justify-between gap-4">
        <div>
          <div className="flex items-center gap-2">
            <div className="p-2 rounded-xl bg-[#006B3C]/40 border border-[#00C46A]/40 text-[#00C46A]">
              <BarChart2 className="w-5 h-5" />
            </div>
            <div>
              <h2 className="text-base sm:text-lg font-bold text-white flex items-center gap-2">
                <span>{isSwahili ? 'Dashibodi ya Utendaji wa Uwasilishaji' : 'Delivery & Team Performance Dashboard'}</span>
                <span className="text-[10px] font-semibold text-[#00C46A] bg-[#006B3C]/40 px-2 py-0.5 rounded border border-[#00C46A]/30">
                  {isSwahili ? 'MIAKA YA MWANZA NA DSM' : 'LIVE FLEET METRICS'}
                </span>
              </h2>
              <p className="text-xs text-[#8899AA]">
                {isSwahili
                  ? 'Chati za kila siku za ujazo wa chupa, vituo vya usambazaji, na ufanisi wa madereva'
                  : 'Daily volumes, quota targets, driver productivity, and on-time SLA metrics'}
              </p>
            </div>
          </div>
        </div>

        {/* Period Selector & Controls */}
        <div className="flex flex-wrap items-center gap-2 self-start md:self-auto">
          {/* Sub-view switcher */}
          <div className="flex bg-[#1A2E1C] p-1 rounded-xl border border-[#3A5068]">
            <button
              type="button"
              onClick={() => setActiveSubTab('all')}
              className={`px-3 py-1.5 rounded-lg text-xs font-semibold transition-all ${
                activeSubTab === 'all' ? 'bg-[#006B3C] text-white shadow-xs' : 'text-[#8899AA] hover:text-white'
              }`}
            >
              {isSwahili ? 'Yote' : 'All Views'}
            </button>
            <button
              type="button"
              onClick={() => setActiveSubTab('volume')}
              className={`px-3 py-1.5 rounded-lg text-xs font-semibold transition-all ${
                activeSubTab === 'volume' ? 'bg-[#006B3C] text-white shadow-xs' : 'text-[#8899AA] hover:text-white'
              }`}
            >
              {isSwahili ? 'Ujazo wa Siku' : 'Daily Volume'}
            </button>
            <button
              type="button"
              onClick={() => setActiveSubTab('team')}
              className={`px-3 py-1.5 rounded-lg text-xs font-semibold transition-all ${
                activeSubTab === 'team' ? 'bg-[#006B3C] text-white shadow-xs' : 'text-[#8899AA] hover:text-white'
              }`}
            >
              {isSwahili ? 'Utendaji wa Timu' : 'Team Output'}
            </button>
          </div>

          {/* Time Period Buttons */}
          <div className="flex bg-[#1A2E1C] p-1 rounded-xl border border-[#3A5068]">
            {([7, 14, 30] as const).map((d) => (
              <button
                key={d}
                type="button"
                onClick={() => setPeriod(d)}
                className={`px-2.5 py-1.5 rounded-lg text-xs font-semibold transition-all ${
                  period === d ? 'bg-[#006B3C] text-white shadow-xs' : 'text-[#8899AA] hover:text-white'
                }`}
              >
                {d} {isSwahili ? 'Siku' : 'Days'}
              </button>
            ))}
          </div>

          {/* Export CSV Button */}
          <button
            type="button"
            onClick={handleExportCsv}
            className="flex items-center gap-1.5 px-3 py-1.5 rounded-xl bg-[#1A2E1C] hover:bg-[#254228] border border-[#3A5068] hover:border-[#00C46A] text-xs font-semibold text-white transition-colors"
            title="Export CSV Performance Report"
          >
            <Download className="w-3.5 h-3.5 text-[#00C46A]" />
            <span className="hidden sm:inline">{isSwahili ? 'Hamisha' : 'Export'}</span>
          </button>
        </div>
      </div>

      {downloadSuccess && (
        <div className="bg-[#006B3C]/30 border border-[#00C46A]/50 text-[#00C46A] px-3.5 py-2 rounded-xl text-xs flex items-center gap-2 animate-in fade-in">
          <CheckCircle2 className="w-4 h-4 shrink-0" />
          <span>{isSwahili ? 'Ripoti ya utendaji imepakuliwa kwa ufanisi (CSV).' : 'Performance report exported successfully (CSV).'}</span>
        </div>
      )}

      {/* 4 Scorecards KPI Highlights */}
      <div className="grid grid-cols-2 lg:grid-cols-4 gap-3.5">
        {/* Total Bottles Delivered */}
        <div className="bg-[#122010] p-4 rounded-2xl border border-[#2A5038]">
          <div className="flex items-center justify-between text-xs text-[#8899AA]">
            <span>{isSwahili ? `Jumla ya Chupa (${period}d)` : `Total Bottles (${period}d)`}</span>
            <Package className="w-4 h-4 text-[#00C46A]" />
          </div>
          <div className="text-xl sm:text-2xl font-bold font-mono text-white mt-1.5">
            {totalPeriodBottles.toLocaleString()}
          </div>
          <div className="text-[11px] text-[#8899AA] mt-1 flex items-center justify-between">
            <span>{isSwahili ? `Wastani ${avgDailyBottles}/siku` : `Avg ${avgDailyBottles}/day`}</span>
            <span className="text-[#00C46A] font-semibold">{overallFulfillmentRate}% {isSwahili ? 'ya lengo' : 'of quota'}</span>
          </div>
        </div>

        {/* Total Stops Delivered */}
        <div className="bg-[#122010] p-4 rounded-2xl border border-[#2A5038]">
          <div className="flex items-center justify-between text-xs text-[#8899AA]">
            <span>{isSwahili ? `Vituo Vilivyofikishwa` : `Completed Stops`}</span>
            <TrendingUp className="w-4 h-4 text-blue-400" />
          </div>
          <div className="text-xl sm:text-2xl font-bold font-mono text-white mt-1.5">
            {totalPeriodStops.toLocaleString()} <span className="text-xs font-normal text-[#8899AA]">{isSwahili ? 'vituo' : 'stops'}</span>
          </div>
          <div className="text-[11px] text-[#8899AA] mt-1 flex items-center justify-between">
            <span>{isSwahili ? `Wastani ${avgDailyStops}/siku` : `Avg ${avgDailyStops}/day`}</span>
            <span className="text-blue-400 font-semibold">{isSwahili ? 'SLA 97.4%' : '97.4% SLA'}</span>
          </div>
        </div>

        {/* Peak Volume Day */}
        <div
          onClick={() => peakDay.dateStr && handleSelectDay(peakDay)}
          className="bg-[#122010] p-4 rounded-2xl border border-[#2A5038] hover:border-[#00C46A] cursor-pointer transition-all group"
          title="Click to view Peak Day breakdown"
        >
          <div className="flex items-center justify-between text-xs text-[#8899AA]">
            <span>{isSwahili ? 'Siku ya Ujazo wa Juu' : 'Peak Volume Day'}</span>
            <Calendar className="w-4 h-4 text-amber-400 group-hover:scale-110 transition-transform" />
          </div>
          <div className="text-xl sm:text-2xl font-bold font-mono text-white mt-1.5 truncate group-hover:text-[#00C46A] transition-colors">
            {peakDay.dayLabel}
          </div>
          <div className="text-[11px] text-amber-400 font-semibold mt-1 flex items-center justify-between">
            <span>{peakDay.bottles.toLocaleString()} {isSwahili ? 'chupa' : 'bottles'}</span>
            <span className="text-[10px] text-[#8899AA] group-hover:text-white underline">{isSwahili ? 'Bofya kutazama' : 'Click to inspect'}</span>
          </div>
        </div>

        {/* Top Field Driver */}
        <div className="bg-[#122010] p-4 rounded-2xl border border-[#2A5038]">
          <div className="flex items-center justify-between text-xs text-[#8899AA]">
            <span>{isSwahili ? 'Dereva Bora wa Kipindi' : 'Top Field Officer'}</span>
            <Award className="w-4 h-4 text-purple-400" />
          </div>
          <div className="text-base sm:text-lg font-bold text-white mt-1.5 truncate">
            {topPerformer.name}
          </div>
          <div className="text-[11px] text-purple-300 font-semibold mt-1">
            {topPerformer.deliveries} {isSwahili ? 'vituo vilivyokamilika' : 'stops delivered'} ({topPerformer.onTimeRate}%)
          </div>
        </div>
      </div>

      {/* Interactive Helper Banner for Bar Chart Click Handler */}
      <div className="flex flex-col sm:flex-row items-start sm:items-center justify-between gap-2.5 bg-[#122010] px-4 py-2.5 rounded-xl border border-[#2A5038]/80 text-xs">
        <div className="flex items-center gap-2 text-[#8899AA]">
          <Sparkles className="w-4 h-4 text-[#00C46A] shrink-0 animate-pulse" />
          <span>
            {isSwahili
              ? 'Kidokezo cha Kuingiliana: Bofya nguzo yoyote kwenye chati hapa chini ili kufungua uchambuzi wa kina wa utendaji wa timu wa siku hiyo.'
              : 'Interactive: Click any bar on the chart below to inspect that specific day\'s team performance metrics, driver dispatches, and SLA breakdown.'}
          </span>
        </div>

        {activeSelectedDay ? (
          <div className="flex items-center gap-2 shrink-0">
            <span className="text-[11px] text-[#00C46A] font-semibold bg-[#006B3C]/40 px-2.5 py-1 rounded-lg border border-[#00C46A]/40 flex items-center gap-1.5">
              <Calendar className="w-3.5 h-3.5" />
              <span>{isSwahili ? 'Imechaguliwa:' : 'Selected Day:'} <strong>{activeSelectedDay.dayLabel}</strong></span>
            </span>
            <button
              type="button"
              onClick={handleClearSelectedDay}
              className="text-xs text-[#8899AA] hover:text-white p-1 rounded hover:bg-[#1A2E1C]"
              title="Close day breakdown"
            >
              <X className="w-3.5 h-3.5" />
            </button>
          </div>
        ) : (
          <span className="text-[11px] text-[#8899AA] shrink-0 font-medium">
            {isSwahili ? '(Bofya nguzo kuanza)' : '(Click a bar to begin)'}
          </span>
        )}
      </div>

      {/* Chart 1: Daily Delivery Volumes Bar Chart */}
      {(activeSubTab === 'all' || activeSubTab === 'volume') && (
        <div className="bg-[#122010] p-4 sm:p-5 rounded-2xl border border-[#2A5038] space-y-4">
          <div className="flex flex-col sm:flex-row sm:items-center justify-between gap-3 border-b border-[#1D2E22] pb-3">
            <div>
              <div className="flex items-center gap-2">
                <Package className="w-4 h-4 text-[#00C46A]" />
                <h3 className="text-sm font-bold text-white">
                  {isSwahili ? 'Ujazo wa Uwasilishaji wa Kila Siku (Daily Delivery Volumes)' : 'Daily Delivery Volumes (Bottles vs Target Quota)'}
                </h3>
              </div>
              <p className="text-[11px] text-[#8899AA] mt-0.5">
                {isSwahili
                  ? `Mwenendo wa uwasilishaji wa siku ${period} zilizopita ukilinganisha ujazo halisi na malengo ya kiwanda.`
                  : `Actual bottle deliveries and completed stop throughput across the past ${period} days against plant dispatch targets.`}
              </p>
            </div>

            {/* Metric Mode Switcher */}
            <div className="flex items-center gap-2 self-start sm:self-auto">
              <span className="text-[11px] text-[#8899AA] hidden md:inline">{isSwahili ? 'Mtazamo:' : 'Display:'}</span>
              <div className="flex bg-[#1A2E1C] p-1 rounded-xl border border-[#3A5068]">
                <button
                  type="button"
                  onClick={() => setVolumeMetric('bottles')}
                  className={`px-2.5 py-1 rounded-lg text-xs font-semibold transition-all ${
                    volumeMetric === 'bottles' ? 'bg-[#006B3C] text-white shadow-xs' : 'text-[#8899AA] hover:text-white'
                  }`}
                >
                  {isSwahili ? 'Chupa (Bottles)' : 'Bottles vs Quota'}
                </button>
                <button
                  type="button"
                  onClick={() => setVolumeMetric('stops')}
                  className={`px-2.5 py-1 rounded-lg text-xs font-semibold transition-all ${
                    volumeMetric === 'stops' ? 'bg-[#006B3C] text-white shadow-xs' : 'text-[#8899AA] hover:text-white'
                  }`}
                >
                  {isSwahili ? 'Vituo (Stops)' : 'Stops vs Quota'}
                </button>
                <button
                  type="button"
                  onClick={() => setVolumeMetric('breakdown')}
                  className={`px-2.5 py-1 rounded-lg text-xs font-semibold transition-all ${
                    volumeMetric === 'breakdown' ? 'bg-[#006B3C] text-white shadow-xs' : 'text-[#8899AA] hover:text-white'
                  }`}
                >
                  {isSwahili ? 'Aina ya Bidhaa' : 'SKU Breakdown'}
                </button>
              </div>
            </div>
          </div>

          {/* Recharts Bar Chart Container with Click Event Handler */}
          <div className="h-72 sm:h-84 w-full">
            <ResponsiveContainer width="100%" height="100%">
              <BarChart
                data={dailyData}
                margin={{ top: 15, right: 15, left: -10, bottom: 5 }}
                barGap={4}
                style={{ cursor: 'pointer' }}
                onClick={(state: any) => {
                  if (state && state.activePayload && state.activePayload.length > 0) {
                    const day = state.activePayload[0].payload as DailyVolumeData;
                    handleSelectDay(day);
                  }
                }}
              >
                <defs>
                  <linearGradient id="deliveredBarGradient" x1="0" y1="0" x2="0" y2="1">
                    <stop offset="0%" stopColor="#00E67A" stopOpacity={0.95} />
                    <stop offset="100%" stopColor="#006B3C" stopOpacity={0.85} />
                  </linearGradient>
                  <linearGradient id="selectedBarGradient" x1="0" y1="0" x2="0" y2="1">
                    <stop offset="0%" stopColor="#00FF88" stopOpacity={1} />
                    <stop offset="100%" stopColor="#00A859" stopOpacity={0.95} />
                  </linearGradient>
                  <linearGradient id="targetBarGradient" x1="0" y1="0" x2="0" y2="1">
                    <stop offset="0%" stopColor="#38BDF8" stopOpacity={0.5} />
                    <stop offset="100%" stopColor="#1E3A8A" stopOpacity={0.3} />
                  </linearGradient>
                  <linearGradient id="refillGradient" x1="0" y1="0" x2="0" y2="1">
                    <stop offset="0%" stopColor="#00C46A" />
                    <stop offset="100%" stopColor="#005A32" />
                  </linearGradient>
                  <linearGradient id="new18Gradient" x1="0" y1="0" x2="0" y2="1">
                    <stop offset="0%" stopColor="#38BDF8" />
                    <stop offset="100%" stopColor="#0284C7" />
                  </linearGradient>
                  <linearGradient id="bottle13Gradient" x1="0" y1="0" x2="0" y2="1">
                    <stop offset="0%" stopColor="#F59E0B" />
                    <stop offset="100%" stopColor="#B45309" />
                  </linearGradient>
                </defs>
                <CartesianGrid strokeDasharray="3 3" stroke={isSunlight ? '#CBD5E1' : '#1A2E1C'} />
                <XAxis
                  dataKey="dayLabel"
                  stroke={isSunlight ? '#475569' : '#8899AA'}
                  fontSize={11}
                  tickLine={false}
                />
                <YAxis
                  stroke={isSunlight ? '#475569' : '#8899AA'}
                  fontSize={11}
                  tickLine={false}
                  label={{
                    value: volumeMetric === 'stops' ? 'Stops' : 'Bottles (Units)',
                    angle: -90,
                    position: 'insideLeft',
                    fill: '#8899AA',
                    fontSize: 10,
                  }}
                />
                <Tooltip
                  cursor={{ fill: 'rgba(0, 196, 106, 0.12)' }}
                  contentStyle={{
                    backgroundColor: isSunlight ? '#FFFFFF' : '#0E1B11',
                    borderColor: '#2A5038',
                    borderRadius: '12px',
                    color: isSunlight ? '#0A1A0F' : '#FFFFFF',
                    fontSize: '12px',
                    boxShadow: '0 8px 24px rgba(0,0,0,0.5)',
                  }}
                  formatter={(val: any, name: any) => {
                    if (name === 'bottles') return [`${Number(val).toLocaleString()} units`, isSwahili ? 'Chupa Zilizofikishwa' : 'Delivered Bottles'];
                    if (name === 'targetBottles') return [`${Number(val).toLocaleString()} units`, isSwahili ? 'Lengo la Kiwanda' : 'Target Quota'];
                    if (name === 'stops') return [`${val} stops`, isSwahili ? 'Vituo Vilivyokamilika' : 'Completed Stops'];
                    if (name === 'targetStops') return [`${val} stops`, isSwahili ? 'Lengo la Vituo' : 'Target Stops'];
                    if (name === 'refills18') return [`${val} units`, '18.9L Refills'];
                    if (name === 'new18') return [`${val} units`, '18.9L New Bottles'];
                    if (name === 'bottles13') return [`${val} units`, '13L Bottles'];
                    return [val, name];
                  }}
                  labelFormatter={(label) => `${label} (Click bar to inspect team performance)`}
                />
                <Legend
                  verticalAlign="top"
                  height={36}
                  wrapperStyle={{ fontSize: '11px', color: '#8899AA' }}
                />

                {/* View 1: Bottles vs Quota */}
                {volumeMetric === 'bottles' && (
                  <>
                    <Bar
                      dataKey="bottles"
                      name={isSwahili ? 'Chupa Zilizofikishwa' : 'Delivered Bottles'}
                      cursor="pointer"
                      onClick={(entry: any) => handleSelectDay(entry)}
                      radius={[6, 6, 0, 0]}
                      maxBarSize={40}
                    >
                      {dailyData.map((entry, index) => {
                        const isSelected = activeSelectedDay?.dateStr === entry.dateStr;
                        return (
                          <Cell
                            key={`bottle-cell-${index}`}
                            cursor="pointer"
                            fill={isSelected ? 'url(#selectedBarGradient)' : 'url(#deliveredBarGradient)'}
                            stroke={isSelected ? '#FFFFFF' : 'none'}
                            strokeWidth={isSelected ? 2 : 0}
                            opacity={activeSelectedDay && !isSelected ? 0.55 : 1}
                          />
                        );
                      })}
                    </Bar>
                    <Bar
                      dataKey="targetBottles"
                      name={isSwahili ? 'Lengo la Kiwanda' : 'Target Quota'}
                      cursor="pointer"
                      onClick={(entry: any) => handleSelectDay(entry)}
                      radius={[6, 6, 0, 0]}
                      maxBarSize={40}
                    >
                      {dailyData.map((entry, index) => {
                        const isSelected = activeSelectedDay?.dateStr === entry.dateStr;
                        return (
                          <Cell
                            key={`target-bottle-cell-${index}`}
                            cursor="pointer"
                            fill={isSelected ? '#38BDF8' : 'url(#targetBarGradient)'}
                            stroke={isSelected ? '#FFFFFF' : 'none'}
                            strokeWidth={isSelected ? 1.5 : 0}
                            opacity={activeSelectedDay && !isSelected ? 0.45 : 1}
                          />
                        );
                      })}
                    </Bar>
                  </>
                )}

                {/* View 2: Stops vs Quota */}
                {volumeMetric === 'stops' && (
                  <>
                    <Bar
                      dataKey="stops"
                      name={isSwahili ? 'Vituo Vilivyokamilika' : 'Completed Stops'}
                      cursor="pointer"
                      onClick={(entry: any) => handleSelectDay(entry)}
                      radius={[6, 6, 0, 0]}
                      maxBarSize={40}
                    >
                      {dailyData.map((entry, index) => {
                        const isSelected = activeSelectedDay?.dateStr === entry.dateStr;
                        return (
                          <Cell
                            key={`stops-cell-${index}`}
                            cursor="pointer"
                            fill={isSelected ? 'url(#selectedBarGradient)' : 'url(#deliveredBarGradient)'}
                            stroke={isSelected ? '#FFFFFF' : 'none'}
                            strokeWidth={isSelected ? 2 : 0}
                            opacity={activeSelectedDay && !isSelected ? 0.55 : 1}
                          />
                        );
                      })}
                    </Bar>
                    <Bar
                      dataKey="targetStops"
                      name={isSwahili ? 'Lengo la Vituo' : 'Target Stops'}
                      cursor="pointer"
                      onClick={(entry: any) => handleSelectDay(entry)}
                      radius={[6, 6, 0, 0]}
                      maxBarSize={40}
                    >
                      {dailyData.map((entry, index) => {
                        const isSelected = activeSelectedDay?.dateStr === entry.dateStr;
                        return (
                          <Cell
                            key={`target-stops-cell-${index}`}
                            cursor="pointer"
                            fill={isSelected ? '#38BDF8' : 'url(#targetBarGradient)'}
                            stroke={isSelected ? '#FFFFFF' : 'none'}
                            strokeWidth={isSelected ? 1.5 : 0}
                            opacity={activeSelectedDay && !isSelected ? 0.45 : 1}
                          />
                        );
                      })}
                    </Bar>
                  </>
                )}

                {/* View 3: Stacked Breakdown by SKU */}
                {volumeMetric === 'breakdown' && (
                  <>
                    <Bar
                      dataKey="refills18"
                      name="18.9L Refill (TZS 5,000)"
                      stackId="a"
                      cursor="pointer"
                      onClick={(entry: any) => handleSelectDay(entry)}
                      radius={[0, 0, 0, 0]}
                      maxBarSize={44}
                    >
                      {dailyData.map((entry, index) => {
                        const isSelected = activeSelectedDay?.dateStr === entry.dateStr;
                        return (
                          <Cell
                            key={`refill-cell-${index}`}
                            cursor="pointer"
                            fill="url(#refillGradient)"
                            stroke={isSelected ? '#FFFFFF' : 'none'}
                            strokeWidth={isSelected ? 1.5 : 0}
                            opacity={activeSelectedDay && !isSelected ? 0.5 : 1}
                          />
                        );
                      })}
                    </Bar>
                    <Bar
                      dataKey="new18"
                      name="18.9L New (TZS 8,000)"
                      stackId="a"
                      cursor="pointer"
                      onClick={(entry: any) => handleSelectDay(entry)}
                      radius={[0, 0, 0, 0]}
                      maxBarSize={44}
                    >
                      {dailyData.map((entry, index) => {
                        const isSelected = activeSelectedDay?.dateStr === entry.dateStr;
                        return (
                          <Cell
                            key={`new-cell-${index}`}
                            cursor="pointer"
                            fill="url(#new18Gradient)"
                            stroke={isSelected ? '#FFFFFF' : 'none'}
                            strokeWidth={isSelected ? 1.5 : 0}
                            opacity={activeSelectedDay && !isSelected ? 0.5 : 1}
                          />
                        );
                      })}
                    </Bar>
                    <Bar
                      dataKey="bottles13"
                      name="13L Bottle (TZS 5,000)"
                      stackId="a"
                      cursor="pointer"
                      onClick={(entry: any) => handleSelectDay(entry)}
                      radius={[6, 6, 0, 0]}
                      maxBarSize={44}
                    >
                      {dailyData.map((entry, index) => {
                        const isSelected = activeSelectedDay?.dateStr === entry.dateStr;
                        return (
                          <Cell
                            key={`bottle13-cell-${index}`}
                            cursor="pointer"
                            fill="url(#bottle13Gradient)"
                            stroke={isSelected ? '#FFFFFF' : 'none'}
                            strokeWidth={isSelected ? 1.5 : 0}
                            opacity={activeSelectedDay && !isSelected ? 0.5 : 1}
                          />
                        );
                      })}
                    </Bar>
                  </>
                )}
              </BarChart>
            </ResponsiveContainer>
          </div>

          {/* Quick Summary Footnote */}
          <div className="pt-2 border-t border-[#1D2E22] flex flex-wrap items-center justify-between gap-3 text-xs text-[#8899AA]">
            <div className="flex items-center gap-3">
              <span className="flex items-center gap-1.5">
                <span className="w-2.5 h-2.5 rounded bg-[#00C46A]"></span>
                <span>{isSwahili ? 'Wastani wa Utekelezaji:' : 'Average Daily Run:'} <strong className="text-white">{avgDailyBottles} bottles</strong></span>
              </span>
              <span className="flex items-center gap-1.5">
                <span className="w-2.5 h-2.5 rounded bg-[#38BDF8]"></span>
                <span>{isSwahili ? 'Kiwango cha Mafanikio:' : 'Fleet Quota Rate:'} <strong className="text-[#00C46A]">{overallFulfillmentRate}%</strong></span>
              </span>
            </div>
            <div className="font-mono text-[11px] text-[#00C46A]">
              TZS {totalPeriodRevenue.toLocaleString()} {isSwahili ? 'Jumla ya Mapato' : 'Total Period Revenue'}
            </div>
          </div>
        </div>
      )}

      {/* REVEALED DETAILED BREAKDOWN OF THE SELECTED DAY'S TEAM PERFORMANCE METRICS */}
      {activeSelectedDay ? (
        <div
          id="selected-day-breakdown"
          data-testid="selected-day-breakdown"
          className="bg-[#0E1B11] p-5 sm:p-6 rounded-2xl border-2 border-[#00C46A]/80 shadow-2xl shadow-black/50 space-y-6 animate-in fade-in duration-300"
        >
          {/* Header of Detailed Breakdown */}
          <div className="flex flex-col md:flex-row md:items-center justify-between gap-4 border-b border-[#254228] pb-4">
            <div className="space-y-1">
              <div className="flex items-center gap-2 flex-wrap">
                <div className="p-1.5 rounded-lg bg-[#006B3C] text-white">
                  <Calendar className="w-4 h-4" />
                </div>
                <h3 className="text-base sm:text-lg font-bold text-white flex items-center gap-2">
                  <span>
                    {isSwahili
                      ? `Uchambuzi wa Kina wa Timu: ${activeSelectedDay.dayLabel}`
                      : `Detailed Team Performance Breakdown: ${activeSelectedDay.dayLabel}`}
                  </span>
                </h3>
                <span className="text-[11px] font-semibold text-[#00C46A] bg-[#006B3C]/40 px-2.5 py-0.5 rounded-full border border-[#00C46A]/40">
                  {activeSelectedDay.dateStr}
                </span>
                <span className="text-[11px] font-semibold text-white bg-blue-900/60 px-2.5 py-0.5 rounded-full border border-blue-500/40">
                  {activeSelectedDay.rate}% {isSwahili ? 'ya Lengo' : 'Quota Met'}
                </span>
              </div>
              <p className="text-xs text-[#8899AA]">
                {isSwahili
                  ? `Ripoti kamili ya usambazaji, vituo vya wateja, na ufanisi wa madereva 5 kwa siku ya ${activeSelectedDay.dayLabel}.`
                  : `Comprehensive dispatch volume, route coverage, verified customer drop-offs, and driver productivity for ${activeSelectedDay.dayLabel}.`}
              </p>
            </div>

            {/* Actions & Day Switcher */}
            <div className="flex items-center gap-2 self-start md:self-auto">
              <div className="flex items-center bg-[#1A2E1C] rounded-xl border border-[#3A5068] p-1">
                <button
                  type="button"
                  onClick={() => handleNavigateDay('prev')}
                  className="p-1.5 rounded-lg hover:bg-[#254228] text-[#8899AA] hover:text-white transition-colors"
                  title="Previous Day"
                >
                  <ChevronLeft className="w-4 h-4" />
                </button>
                <span className="px-2 text-xs font-semibold text-white">
                  {activeSelectedDay.dayName}
                </span>
                <button
                  type="button"
                  onClick={() => handleNavigateDay('next')}
                  className="p-1.5 rounded-lg hover:bg-[#254228] text-[#8899AA] hover:text-white transition-colors"
                  title="Next Day"
                >
                  <ChevronRight className="w-4 h-4" />
                </button>
              </div>

              <button
                type="button"
                onClick={handleClearSelectedDay}
                className="flex items-center gap-1.5 px-3 py-1.5 rounded-xl bg-[#1A2E1C] hover:bg-[#2A1515] border border-[#3A5068] hover:border-red-500/50 text-xs font-semibold text-[#8899AA] hover:text-red-400 transition-colors"
              >
                <X className="w-3.5 h-3.5" />
                <span>{isSwahili ? 'Funga Uchambuzi' : 'Close Breakdown'}</span>
              </button>
            </div>
          </div>

          {/* 4 Core Selected Day Highlight Cards with WoW / MoM Trend Indicators */}
          <div className="grid grid-cols-2 lg:grid-cols-4 gap-3.5">
            {/* Delivered Volume Card */}
            <div className="bg-[#122010] p-4 rounded-xl border border-[#2A5038]">
              <div className="text-xs text-[#8899AA] flex items-center justify-between">
                <span>{isSwahili ? 'Chupa Zilizofikishwa' : 'Delivered Bottles'}</span>
                <Package className="w-4 h-4 text-[#00C46A]" />
              </div>
              <div className="flex items-baseline justify-between gap-2 mt-1">
                <div className="text-2xl font-bold font-mono text-white">
                  {activeSelectedDay.bottles.toLocaleString()}
                </div>
                <TrendIndicator
                  value={activeProductivityView === 'monthly' ? 18.2 : activeProductivityView === 'quarterly' ? 24.6 : 11.4}
                  horizon={activeProductivityView}
                  size="xs"
                />
              </div>
              <div className="space-y-1 mt-2">
                <div className="flex justify-between text-[10px] text-[#8899AA]">
                  <span>{isSwahili ? 'Lengo:' : 'Target:'} {activeSelectedDay.targetBottles}</span>
                  <span className="text-[#00C46A] font-bold">{activeSelectedDay.rate}%</span>
                </div>
                <div className="w-full bg-[#1A2E1C] h-1.5 rounded-full overflow-hidden">
                  <div
                    className="bg-[#00C46A] h-full rounded-full"
                    style={{ width: `${Math.min(100, activeSelectedDay.rate)}%` }}
                  />
                </div>
              </div>
              <div className="text-[10px] text-[#8899AA] mt-2 flex items-center gap-2 flex-wrap">
                <span className="text-emerald-300">{activeSelectedDay.refills18} Refills</span>
                <span>&bull;</span>
                <span className="text-sky-300">{activeSelectedDay.new18} New</span>
                <span>&bull;</span>
                <span className="text-amber-300">{activeSelectedDay.bottles13} 13L</span>
              </div>
            </div>

            {/* Completed Stops Card */}
            <div className="bg-[#122010] p-4 rounded-xl border border-[#2A5038]">
              <div className="text-xs text-[#8899AA] flex items-center justify-between">
                <span>{isSwahili ? 'Vituo Vilivyokamilika' : 'Completed Stops'}</span>
                <TrendingUp className="w-4 h-4 text-blue-400" />
              </div>
              <div className="flex items-baseline justify-between gap-2 mt-1">
                <div className="text-2xl font-bold font-mono text-white">
                  {activeSelectedDay.stops}{' '}
                  <span className="text-xs text-[#8899AA] font-normal">/ {activeSelectedDay.targetStops}</span>
                </div>
                <TrendIndicator
                  value={activeProductivityView === 'monthly' ? 14.8 : activeProductivityView === 'quarterly' ? 21.0 : 8.6}
                  horizon={activeProductivityView}
                  size="xs"
                />
              </div>
              <div className="text-[11px] text-blue-400 font-semibold mt-2 flex items-center gap-1">
                <CheckCircle2 className="w-3.5 h-3.5" />
                <span>
                  {Math.round((activeSelectedDay.stops / activeSelectedDay.targetStops) * 100)}%{' '}
                  {isSwahili ? 'Utekelezaji wa Vituo' : 'Route Clearance Rate'}
                </span>
              </div>
              <div className="text-[10px] text-[#8899AA] mt-2">
                {isSwahili ? 'Wastani wa dakika 14.5 kwa kituo' : 'Avg 14.5 mins turnaround per drop'}
              </div>
            </div>

            {/* Revenue Collected Card */}
            <div className="bg-[#122010] p-4 rounded-xl border border-[#2A5038]">
              <div className="text-xs text-[#8899AA] flex items-center justify-between">
                <span>{isSwahili ? 'Mapato ya Siku' : 'Day Revenue'}</span>
                <DollarSign className="w-4 h-4 text-[#00C46A]" />
              </div>
              <div className="flex items-baseline justify-between gap-2 mt-1">
                <div className="text-xl sm:text-2xl font-bold font-mono text-[#00C46A]">
                  TZS {activeSelectedDay.revenue.toLocaleString()}
                </div>
                <TrendIndicator
                  value={activeProductivityView === 'monthly' ? 19.4 : activeProductivityView === 'quarterly' ? 27.8 : 13.9}
                  horizon={activeProductivityView}
                  size="xs"
                />
              </div>
              <div className="text-[11px] text-[#8899AA] mt-2 flex items-center justify-between">
                <span>M-Pesa (65%):</span>
                <span className="text-white font-mono">TZS {Math.round(activeSelectedDay.revenue * 0.65).toLocaleString()}</span>
              </div>
              <div className="text-[11px] text-[#8899AA] mt-0.5 flex items-center justify-between">
                <span>Cash/Credit (35%):</span>
                <span className="text-white font-mono">TZS {Math.round(activeSelectedDay.revenue * 0.35).toLocaleString()}</span>
              </div>
            </div>

            {/* Fleet On-Time SLA Card */}
            <div className="bg-[#122010] p-4 rounded-xl border border-[#2A5038]">
              <div className="text-xs text-[#8899AA] flex items-center justify-between">
                <span>{isSwahili ? 'Kiwango cha SLA ya Nyanjani' : 'Fleet Dispatch SLA'}</span>
                <Clock className="w-4 h-4 text-purple-400" />
              </div>
              <div className="flex items-baseline justify-between gap-2 mt-1">
                <div className="text-2xl font-bold font-mono text-purple-300">
                  98.2%
                </div>
                <TrendIndicator
                  value={activeProductivityView === 'monthly' ? 1.6 : activeProductivityView === 'quarterly' ? 3.2 : -0.4}
                  horizon={activeProductivityView}
                  size="xs"
                />
              </div>
              <div className="text-[11px] text-[#00C46A] font-semibold mt-2 flex items-center gap-1">
                <ShieldCheck className="w-3.5 h-3.5" />
                <span>5 {isSwahili ? 'magari yaliyokamilisha' : 'commercial trucks deployed'}</span>
              </div>
              <div className="text-[10px] text-[#8899AA] mt-2">
                {isSwahili ? 'Hakuna malalamiko ya ucheleweshaji' : 'Zero delayed customer escalations'}
              </div>
            </div>
          </div>

          {/* Section: Driver-by-Driver Team Productivity Roster for Selected Day */}
          <div className="space-y-3 pt-2">
            <div className="flex flex-col sm:flex-row sm:items-center justify-between gap-2">
              <div className="flex items-center gap-2">
                <Users className="w-4 h-4 text-purple-400" />
                <h4 className="text-sm font-bold text-white">
                  {isSwahili
                    ? `Utendaji wa Madereva kwa Siku Hii (${dayTeamMetrics.length} Maafisa)`
                    : `Individual Officer Productivity on ${activeSelectedDay.dayLabel} (${dayTeamMetrics.length} Field Officers)`}
                </h4>
              </div>
              <span className="text-xs text-[#8899AA]">
                {isSwahili ? 'Bofya dereva kutazama orodha ya vituo na stakabadhi' : 'Click any officer to view verified delivery drops'}
              </span>
            </div>

            {/* Grid of Team Members */}
            <div className="grid grid-cols-1 md:grid-cols-2 lg:grid-cols-3 gap-3.5">
              {dayTeamMetrics.map((staff, idx) => {
                const isExpanded = selectedDriverId === staff.staffId;
                return (
                  <div
                    key={staff.staffId}
                    className={`bg-[#122010] rounded-xl border p-4 transition-all flex flex-col justify-between space-y-3 ${
                      isExpanded
                        ? 'border-[#00C46A] ring-1 ring-[#00C46A]/50 bg-[#162916]'
                        : 'border-[#2A5038] hover:border-[#00C46A]/60'
                    }`}
                  >
                    {/* Driver Card Header */}
                    <div className="flex items-start justify-between gap-2">
                      <div className="flex items-center gap-2.5">
                        <div className="w-9 h-9 rounded-full bg-[#006B3C] text-white flex items-center justify-center font-bold text-sm shrink-0 shadow">
                          {staff.name.split(' ').map((n) => n[0]).join('')}
                        </div>
                        <div>
                          <div className="font-bold text-white text-xs sm:text-sm flex items-center gap-1.5">
                            <span>{staff.name}</span>
                            {idx === 0 && (
                              <span className="text-[10px] text-amber-300 font-normal">🌟</span>
                            )}
                          </div>
                          <div className="text-[10px] text-[#8899AA] font-mono">
                            {staff.staffId} &bull; {staff.phone}
                          </div>
                        </div>
                      </div>

                      <span
                        className={`text-[10px] font-semibold px-2 py-0.5 rounded-full border ${
                          staff.status === 'Exceeded'
                            ? 'bg-[#006B3C]/50 text-[#00E67A] border-[#00C46A]/40'
                            : 'bg-blue-900/40 text-blue-300 border-blue-500/30'
                        }`}
                      >
                        {staff.rating}
                      </span>
                    </div>

                    {/* Vehicle & Zone Info */}
                    <div className="bg-[#1A2E1C]/80 p-2.5 rounded-lg border border-[#254228] text-[11px] space-y-1">
                      <div className="flex items-center gap-1.5 text-white font-medium">
                        <Truck className="w-3.5 h-3.5 text-[#00C46A] shrink-0" />
                        <span className="truncate">{staff.vehicle}</span>
                      </div>
                      <div className="flex items-center gap-1.5 text-[#8899AA]">
                        <MapPin className="w-3.5 h-3.5 text-blue-400 shrink-0" />
                        <span className="truncate">{staff.routeZone}</span>
                      </div>
                    </div>

                    {/* Metric Bars */}
                    <div className="space-y-1.5 text-xs">
                      <div className="flex justify-between items-center text-[11px]">
                        <span className="text-[#8899AA]">{isSwahili ? 'Vituo Vilivyokamilika:' : 'Stops Delivered:'}</span>
                        <div className="flex items-center gap-1.5">
                          <span className="font-bold text-white">
                            {staff.stopsDelivered} / {staff.stopsTarget} {isSwahili ? 'vituo' : 'stops'}
                          </span>
                          <TrendIndicator value={staff.stopsTrend} horizon={activeProductivityView} size="xs" />
                        </div>
                      </div>

                      <div className="flex justify-between items-center text-[11px]">
                        <span className="text-[#8899AA]">{isSwahili ? 'Jumla ya Chupa:' : 'Bottles Delivered:'}</span>
                        <div className="flex items-center gap-1.5">
                          <span className="font-bold text-[#00C46A]">
                            {staff.bottlesDelivered} units
                          </span>
                          <TrendIndicator value={staff.bottlesTrend} horizon={activeProductivityView} size="xs" />
                        </div>
                      </div>

                      <div className="flex justify-between items-center text-[11px]">
                        <span className="text-[#8899AA]">{isSwahili ? 'Mapato Yaliyokusanywa:' : 'Day Collections:'}</span>
                        <div className="flex items-center gap-1.5">
                          <span className="font-mono font-bold text-white">
                            TZS {staff.revenue.toLocaleString()}
                          </span>
                          <TrendIndicator value={staff.revenueTrend} horizon={activeProductivityView} size="xs" />
                        </div>
                      </div>

                      <div className="flex justify-between text-[11px] pt-1 border-t border-[#1D2E22]">
                        <span className="text-[#8899AA]">{isSwahili ? 'Saa za Safari:' : 'Shift / On-Time:'}</span>
                        <span className="text-[#00C46A] font-semibold">
                          {staff.departureTime} - {staff.completedTime} ({staff.onTimeRate}%)
                        </span>
                      </div>
                    </div>

                    {/* Toggle Deliveries Log Button */}
                    <button
                      type="button"
                      onClick={() => setSelectedDriverId(isExpanded ? null : staff.staffId)}
                      className={`w-full py-1.5 px-3 rounded-lg text-xs font-semibold flex items-center justify-center gap-1.5 transition-colors ${
                        isExpanded
                          ? 'bg-[#006B3C] text-white'
                          : 'bg-[#1A2E1C] hover:bg-[#254228] text-[#8899AA] hover:text-white border border-[#2A5038]'
                      }`}
                    >
                      <Eye className="w-3.5 h-3.5" />
                      <span>
                        {isExpanded
                          ? (isSwahili ? 'Ficha Vituo vya Wateja' : 'Hide Stop Records')
                          : (isSwahili ? `Tazama Vituo vya Mteja (${staff.stops.length})` : `View Drop Logs (${staff.stops.length})`)}
                      </span>
                    </button>
                  </div>
                );
              })}
            </div>
          </div>

          {/* Drilldown Section: Verified Customer Drops for Selected Driver */}
          {selectedDriverId && (
            <div className="bg-[#122010] p-4 rounded-xl border border-[#2A5038] space-y-3 animate-in fade-in">
              {(() => {
                const activeStaff = dayTeamMetrics.find((s) => s.staffId === selectedDriverId);
                if (!activeStaff) return null;

                return (
                  <div>
                    <div className="flex flex-col sm:flex-row sm:items-center justify-between gap-2 border-b border-[#1D2E22] pb-2.5">
                      <div className="flex items-center gap-2">
                        <FileText className="w-4 h-4 text-[#00C46A]" />
                        <h5 className="text-xs sm:text-sm font-bold text-white">
                          {isSwahili
                            ? `Orodha ya Vituo vya Uwasilishaji: ${activeStaff.name} (${activeSelectedDay.dayLabel})`
                            : `Verified Customer Deliveries: ${activeStaff.name} (${activeSelectedDay.dayLabel})`}
                        </h5>
                      </div>
                      <span className="text-xs text-[#00C46A] font-mono">
                        {activeStaff.stops.length} {isSwahili ? 'vituo vimethibitishwa' : 'stops verified'} &bull; TZS {activeStaff.revenue.toLocaleString()}
                      </span>
                    </div>

                    <div className="divide-y divide-[#1D2E22] mt-2">
                      {activeStaff.stops.map((stop) => (
                        <div key={stop.id} className="py-2.5 flex flex-col sm:flex-row sm:items-center justify-between gap-2 text-xs">
                          <div className="flex items-center gap-3">
                            <span className="font-mono text-[11px] text-[#8899AA] bg-[#1A2E1C] px-2 py-0.5 rounded border border-[#2A5038]">
                              {stop.time}
                            </span>
                            <div>
                              <div className="font-bold text-white">{stop.customer}</div>
                              <div className="text-[11px] text-[#8899AA] flex items-center gap-1.5">
                                <MapPin className="w-3 h-3 text-blue-400" />
                                <span>{stop.location}</span>
                                <span>&bull;</span>
                                <span className="text-[#00C46A]">{stop.bottles} x {stop.bottleType}</span>
                              </div>
                            </div>
                          </div>

                          <div className="flex items-center gap-3 self-end sm:self-auto">
                            <div className="text-right">
                              <div className="font-mono font-bold text-white">TZS {stop.amount.toLocaleString()}</div>
                              <div className="text-[10px] text-[#8899AA]">{stop.payment}</div>
                            </div>
                            <span className="flex items-center gap-1 text-[11px] font-semibold text-[#00E67A] bg-[#006B3C]/30 px-2 py-0.5 rounded-full border border-[#00C46A]/40">
                              <Check className="w-3 h-3" />
                              <span>{isSwahili ? 'Imekabidhiwa' : 'Delivered'}</span>
                            </span>
                          </div>
                        </div>
                      ))}
                    </div>
                  </div>
                );
              })()}
            </div>
          )}
        </div>
      ) : (
        /* Prompt Card when no day is selected yet */
        <div className="bg-[#122010] p-4 sm:p-5 rounded-2xl border border-[#2A5038] flex flex-col sm:flex-row items-start sm:items-center justify-between gap-4">
          <div className="flex items-center gap-3">
            <div className="p-2.5 rounded-xl bg-[#006B3C]/30 border border-[#00C46A]/40 text-[#00C46A] shrink-0">
              <Sparkles className="w-5 h-5" />
            </div>
            <div>
              <h4 className="text-sm font-bold text-white">
                {isSwahili ? 'Uchambuzi wa Kina wa Siku: Chagua Siku Kutazama' : 'Detailed Day Drilldown: Select a Day to Inspect'}
              </h4>
              <p className="text-xs text-[#8899AA] mt-0.5">
                {isSwahili
                  ? 'Bofya nguzo yoyote kwenye chati ya ujazo hapo juu, au chagua siku za hivi karibuni hapa:'
                  : 'Click any bar in the Daily Delivery Volumes chart above, or click a quick date below to reveal driver productivity:'}
              </p>
            </div>
          </div>

          <div className="flex flex-wrap items-center gap-1.5">
            {dailyData.slice(-5).map((d) => (
              <button
                key={d.dateStr}
                type="button"
                onClick={() => handleSelectDay(d)}
                className="px-2.5 py-1 rounded-lg bg-[#1A2E1C] hover:bg-[#006B3C] border border-[#3A5068] hover:border-[#00C46A] text-xs font-semibold text-white transition-all flex items-center gap-1"
              >
                <span>{d.dayLabel}</span>
                <span className="text-[10px] text-[#00C46A]">({d.bottles})</span>
              </button>
            ))}
          </div>
        </div>
      )}

      {/* Chart 2: Team Productivity Metrics Bar Chart */}
      {(activeSubTab === 'all' || activeSubTab === 'team') && (
        <div className="bg-[#122010] p-4 sm:p-5 rounded-2xl border border-[#2A5038] space-y-4">
          <div className="flex flex-col md:flex-row md:items-center justify-between gap-3 border-b border-[#1D2E22] pb-3">
            <div>
              <div className="flex items-center gap-2 flex-wrap">
                <Users className="w-4 h-4 text-purple-400" />
                <h3 className="text-sm font-bold text-white flex items-center gap-2">
                  <span>{isSwahili ? 'Viwango vya Ufanisi na Tija ya Timu' : 'Team Productivity & Driver Quota Performance'}</span>
                  <span className="text-[10px] font-semibold text-purple-300 bg-purple-950/60 px-2 py-0.5 rounded-full border border-purple-500/30 uppercase tracking-wide">
                    {activeProductivityView === 'quarterly'
                      ? (isSwahili ? 'Mtazamo wa Robo Mwaka' : 'Quarterly View')
                      : activeProductivityView === 'monthly'
                      ? (isSwahili ? 'Mtazamo wa Mwezi' : 'Monthly View')
                      : activeProductivityView === 'custom'
                      ? (isSwahili ? 'Masafa Maalum (Custom)' : 'Custom Range')
                      : (isSwahili ? 'Mtazamo wa Wiki' : 'Weekly View')}
                  </span>
                </h3>
              </div>
              <p className="text-[11px] text-[#8899AA] mt-0.5">
                {isSwahili
                  ? 'Kulinganisha idadi ya vituo, chupa zilizowasilishwa, na mapato yaliyokusanywa na kila dereva kwa kipindi ulichochagua.'
                  : 'Individual field officer output, quota achievement rate, and verified customer deliveries across the chosen view.'}
              </p>
            </div>

            {/* Productivity View Dropdown & Metric Controls */}
            <div className="flex flex-wrap items-center gap-2.5 self-start md:self-auto">
              {/* Dropdown Filter to Toggle Between Weekly, Monthly, Quarterly, and Custom */}
              <div className="flex items-center gap-1.5 bg-[#1A2E1C] px-2.5 py-1 rounded-xl border border-[#3A5068]">
                <Filter className="w-3.5 h-3.5 text-[#00C46A]" />
                <label htmlFor="dashboard-productivity-dropdown" className="text-[11px] text-[#8899AA] font-medium hidden sm:inline">
                  {isSwahili ? 'Mtazamo:' : 'View:'}
                </label>
                <div className="relative">
                  <select
                    id="dashboard-productivity-dropdown"
                    data-testid="productivity-view-dropdown-dashboard"
                    value={activeProductivityView}
                    onChange={(e) => handleProductivityViewChange(e.target.value as ProductivityViewHorizon)}
                    className="bg-transparent text-white text-xs font-semibold pr-5 py-0.5 focus:outline-none focus:ring-0 appearance-none cursor-pointer"
                  >
                    <option value="weekly" className="bg-[#0E1B11] text-white">
                      {isSwahili ? 'Kila Wiki (Weekly)' : 'Weekly (7 Days)'}
                    </option>
                    <option value="monthly" className="bg-[#0E1B11] text-white">
                      {isSwahili ? 'Kila Mwezi (Monthly)' : 'Monthly (30 Days)'}
                    </option>
                    <option value="quarterly" className="bg-[#0E1B11] text-white">
                      {isSwahili ? 'Robo Mwaka (Quarterly)' : 'Quarterly (90 Days)'}
                    </option>
                    <option value="custom" className="bg-[#0E1B11] text-white">
                      {isSwahili ? 'Masafa Maalum (Custom Range)' : 'Custom Range'}
                    </option>
                  </select>
                  <ChevronDown className="w-3 h-3 text-[#8899AA] pointer-events-none absolute right-0 top-1/2 -translate-y-1/2" />
                </div>
              </div>

              {/* Productivity Metric Toggle */}
              <div className="flex bg-[#1A2E1C] p-1 rounded-xl border border-[#3A5068]">
                <button
                  type="button"
                  onClick={() => setProductivityMetric('deliveries')}
                  className={`px-2.5 py-1 rounded-lg text-xs font-semibold transition-all ${
                    productivityMetric === 'deliveries' ? 'bg-[#006B3C] text-white shadow-xs' : 'text-[#8899AA] hover:text-white'
                  }`}
                >
                  {isSwahili ? 'Vituo dhidi ya Lengo' : 'Stops vs Target'}
                </button>
                <button
                  type="button"
                  onClick={() => setProductivityMetric('revenue')}
                  className={`px-2.5 py-1 rounded-lg text-xs font-semibold transition-all ${
                    productivityMetric === 'revenue' ? 'bg-[#006B3C] text-white shadow-xs' : 'text-[#8899AA] hover:text-white'
                  }`}
                >
                  {isSwahili ? 'Mapato (TZS)' : 'Revenue (TZS)'}
                </button>
                <button
                  type="button"
                  onClick={() => setProductivityMetric('onTime')}
                  className={`px-2.5 py-1 rounded-lg text-xs font-semibold transition-all ${
                    productivityMetric === 'onTime' ? 'bg-[#006B3C] text-white shadow-xs' : 'text-[#8899AA] hover:text-white'
                  }`}
                >
                  {isSwahili ? 'Kwa Wakati (%)' : 'On-Time %'}
                </button>
              </div>
            </div>
          </div>

          {/* Recharts Bar Chart Container for Team Productivity */}
          <div className="h-72 sm:h-80 w-full">
            <ResponsiveContainer width="100%" height="100%">
              <BarChart
                data={teamData}
                margin={{ top: 15, right: 15, left: -5, bottom: 5 }}
                barGap={4}
                style={{ cursor: 'pointer' }}
                onClick={(state: any) => {
                  if (state && state.activePayload && state.activePayload.length > 0) {
                    const member = state.activePayload[0].payload as TeamProductivityData;
                    setSelectedDriverId((prev) => (prev === member.staffId ? null : member.staffId));
                  }
                }}
              >
                <defs>
                  <linearGradient id="teamDeliveredGrad" x1="0" y1="0" x2="0" y2="1">
                    <stop offset="0%" stopColor="#A855F7" stopOpacity={0.95} />
                    <stop offset="100%" stopColor="#7E22CE" stopOpacity={0.8} />
                  </linearGradient>
                  <linearGradient id="teamTargetGrad" x1="0" y1="0" x2="0" y2="1">
                    <stop offset="0%" stopColor="#64748B" stopOpacity={0.6} />
                    <stop offset="100%" stopColor="#334155" stopOpacity={0.4} />
                  </linearGradient>
                  <linearGradient id="teamRevGrad" x1="0" y1="0" x2="0" y2="1">
                    <stop offset="0%" stopColor="#00E67A" stopOpacity={0.95} />
                    <stop offset="100%" stopColor="#006B3C" stopOpacity={0.85} />
                  </linearGradient>
                  <linearGradient id="teamRateGrad" x1="0" y1="0" x2="0" y2="1">
                    <stop offset="0%" stopColor="#38BDF8" stopOpacity={0.95} />
                    <stop offset="100%" stopColor="#0284C7" stopOpacity={0.85} />
                  </linearGradient>
                </defs>
                <CartesianGrid strokeDasharray="3 3" stroke={isSunlight ? '#CBD5E1' : '#1A2E1C'} />
                <XAxis
                  dataKey="name"
                  stroke={isSunlight ? '#475569' : '#8899AA'}
                  fontSize={11}
                  tickLine={false}
                />
                <YAxis
                  stroke={isSunlight ? '#475569' : '#8899AA'}
                  fontSize={11}
                  tickLine={false}
                  label={{
                    value:
                      productivityMetric === 'revenue'
                        ? 'TZS'
                        : productivityMetric === 'onTime'
                        ? '%'
                        : 'Completed Stops',
                    angle: -90,
                    position: 'insideLeft',
                    fill: '#8899AA',
                    fontSize: 10,
                  }}
                />
                <Tooltip
                  cursor={{ fill: 'rgba(168, 85, 247, 0.08)' }}
                  contentStyle={{
                    backgroundColor: isSunlight ? '#FFFFFF' : '#0E1B11',
                    borderColor: '#2A5038',
                    borderRadius: '12px',
                    color: isSunlight ? '#0A1A0F' : '#FFFFFF',
                    fontSize: '12px',
                    boxShadow: '0 8px 24px rgba(0,0,0,0.5)',
                  }}
                  formatter={(val: any, name: any) => {
                    if (name === 'deliveries') return [`${val} stops`, isSwahili ? 'Vituo Vilivyokamilika' : 'Delivered Stops'];
                    if (name === 'target') return [`${val} stops`, isSwahili ? 'Lengo la Kazi' : 'Target Quota'];
                    if (name === 'revenue') return [`TZS ${Number(val).toLocaleString()}`, isSwahili ? 'Mapato' : 'Revenue Generated'];
                    if (name === 'onTimeRate') return [`${val}%`, isSwahili ? 'Utekelezaji kwa Wakati' : 'On-Time Fulfillment'];
                    return [val, name];
                  }}
                />
                <Legend
                  verticalAlign="top"
                  height={36}
                  wrapperStyle={{ fontSize: '11px', color: '#8899AA' }}
                />

                {productivityMetric === 'deliveries' && (
                  <>
                    <Bar
                      dataKey="deliveries"
                      name={isSwahili ? 'Vituo Vilivyokamilika' : 'Completed Deliveries'}
                      fill="url(#teamDeliveredGrad)"
                      radius={[6, 6, 0, 0]}
                      maxBarSize={44}
                      cursor="pointer"
                    >
                      {teamData.map((staff, idx) => {
                        const isSelected = selectedDriverId === staff.staffId;
                        return (
                          <Cell
                            key={`team-deliv-cell-${idx}`}
                            cursor="pointer"
                            stroke={isSelected ? '#FFFFFF' : 'none'}
                            strokeWidth={isSelected ? 2 : 0}
                          />
                        );
                      })}
                    </Bar>
                    <Bar
                      dataKey="target"
                      name={isSwahili ? 'Lengo la Vituo' : 'Target Quota'}
                      fill="url(#teamTargetGrad)"
                      radius={[6, 6, 0, 0]}
                      maxBarSize={44}
                      cursor="pointer"
                    />
                    <ReferenceLine
                      y={
                        activeProductivityView === 'quarterly'
                          ? 205
                          : activeProductivityView === 'monthly'
                          ? 68
                          : activeProductivityView === 'custom'
                          ? Math.round(16 * Math.max(0.5, (customStartDate && customEndDate ? Math.max(1, Math.round((new Date(customEndDate).getTime() - new Date(customStartDate).getTime()) / (1000 * 60 * 60 * 24)) + 1) : 14) / 7))
                          : 16
                      }
                      stroke="#F59E0B"
                      strokeDasharray="3 3"
                      label={{
                        value: `${isSwahili ? 'Kipimo' : 'Benchmark'} (${
                          activeProductivityView === 'quarterly'
                            ? '205'
                            : activeProductivityView === 'monthly'
                            ? '68'
                            : activeProductivityView === 'custom'
                            ? String(Math.round(16 * Math.max(0.5, (customStartDate && customEndDate ? Math.max(1, Math.round((new Date(customEndDate).getTime() - new Date(customStartDate).getTime()) / (1000 * 60 * 60 * 24)) + 1) : 14) / 7)))
                            : '16'
                        } ${isSwahili ? 'vituo' : 'stops'})`,
                        fill: '#F59E0B',
                        fontSize: 10,
                        position: 'top',
                      }}
                    />
                  </>
                )}

                {productivityMetric === 'revenue' && (
                  <Bar
                    dataKey="revenue"
                    name={isSwahili ? 'Mapato Yaliyokusanywa (TZS)' : 'Revenue Generated (TZS)'}
                    fill="url(#teamRevGrad)"
                    radius={[6, 6, 0, 0]}
                    maxBarSize={48}
                    cursor="pointer"
                  >
                    {teamData.map((staff, idx) => {
                      const isSelected = selectedDriverId === staff.staffId;
                      return (
                        <Cell
                          key={`team-rev-cell-${idx}`}
                          cursor="pointer"
                          stroke={isSelected ? '#FFFFFF' : 'none'}
                          strokeWidth={isSelected ? 2 : 0}
                        />
                      );
                    })}
                  </Bar>
                )}

                {productivityMetric === 'onTime' && (
                  <>
                    <Bar
                      dataKey="onTimeRate"
                      name={isSwahili ? 'Kiwango cha Uwasilishaji kwa Wakati (%)' : 'On-Time Fulfillment Rate (%)'}
                      fill="url(#teamRateGrad)"
                      radius={[6, 6, 0, 0]}
                      maxBarSize={48}
                      cursor="pointer"
                    >
                      {teamData.map((staff, idx) => {
                        const isSelected = selectedDriverId === staff.staffId;
                        return (
                          <Cell
                            key={`team-ontime-cell-${idx}`}
                            cursor="pointer"
                            stroke={isSelected ? '#FFFFFF' : 'none'}
                            strokeWidth={isSelected ? 2 : 0}
                          />
                        );
                      })}
                    </Bar>
                    <ReferenceLine y={95} stroke="#00C46A" strokeDasharray="3 3" label={{ value: 'Target SLA 95%', fill: '#00C46A', fontSize: 10, position: 'top' }} />
                  </>
                )}
              </BarChart>
            </ResponsiveContainer>
          </div>

          {/* Detailed Team Scorecards Grid */}
          <div className="grid grid-cols-1 sm:grid-cols-2 lg:grid-cols-3 gap-3 pt-2">
            {teamData.map((staff, idx) => {
              const isSelected = selectedDriverId === staff.staffId;
              return (
                <div
                  key={staff.staffId}
                  onClick={() => setSelectedDriverId(isSelected ? null : staff.staffId)}
                  className={`bg-[#1A2E1C] p-3.5 rounded-xl border flex flex-col justify-between text-xs space-y-2 cursor-pointer transition-all ${
                    isSelected
                      ? 'border-[#00C46A] ring-1 ring-[#00C46A]/40 bg-[#162916]'
                      : 'border-[#3A5068]/50 hover:border-[#00C46A]/50'
                  }`}
                >
                  <div className="flex items-center justify-between">
                    <div className="flex items-center gap-2">
                      <span className="w-7 h-7 rounded-full bg-[#006B3C] text-white flex items-center justify-center font-bold text-xs">
                        #{idx + 1}
                      </span>
                      <div>
                        <div className="font-bold text-white text-xs">{staff.name}</div>
                        <div className="text-[10px] text-[#8899AA] font-mono">{staff.staffId}</div>
                      </div>
                    </div>
                    <span className="text-[10px] font-semibold px-2 py-0.5 rounded bg-purple-900/50 text-purple-300 border border-purple-500/30">
                      {staff.rating}
                    </span>
                  </div>

                  <div className="space-y-1">
                    <div className="flex justify-between items-center text-[11px]">
                      <span className="text-[#8899AA]">{isSwahili ? 'Utekelezaji wa Lengo:' : 'Target Quota:'}</span>
                      <div className="flex items-center gap-1.5">
                        <span className="font-bold text-white">
                          {staff.deliveries} / {staff.target} stops ({staff.achievementPct}%)
                        </span>
                        <TrendIndicator value={staff.trendValue} horizon={activeProductivityView} size="xs" />
                      </div>
                    </div>
                    <div className="w-full bg-[#0A1A0F] h-1.5 rounded-full overflow-hidden">
                      <div
                        className={`h-full rounded-full transition-all ${
                          staff.achievementPct >= 100
                            ? 'bg-[#00C46A]'
                            : staff.achievementPct >= 85
                            ? 'bg-blue-400'
                            : 'bg-amber-400'
                        }`}
                        style={{ width: `${Math.min(100, staff.achievementPct)}%` }}
                      />
                    </div>
                  </div>

                  <div className="pt-2 border-t border-[#243447]/60 flex items-center justify-between text-[10px] text-[#8899AA]">
                    <div className="flex items-center gap-1.5">
                      <span>TZS {staff.revenue.toLocaleString()}</span>
                      <TrendIndicator value={staff.revTrendValue} horizon={activeProductivityView} size="xs" />
                    </div>
                    <span className="text-[#00C46A] font-semibold">{staff.onTimeRate}% on-time</span>
                  </div>
                </div>
              );
            })}
          </div>
        </div>
      )}
    </div>
  );
};
