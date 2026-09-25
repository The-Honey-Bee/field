import React, { useState, useEffect, useMemo } from 'react';
import { useLanguage } from '../context/LanguageContext';
import { storageService } from '../services/storage';
import { Order, TimelineTask } from '../types';
import { DeliveryForecastOptimizer } from '../components/DeliveryForecastOptimizer';
import {
  ManagerPerformanceDashboard,
  DailyVolumeData,
  ProductivityViewHorizon,
} from '../components/ManagerPerformanceDashboard';
import { TrendIndicator } from '../components/TrendIndicator';
import {
  BarChart3,
  TrendingUp,
  Award,
  DollarSign,
  Package,
  MapPin,
  Calendar,
  Sparkles,
  Users,
  LineChart,
  ChevronDown,
  Filter,
  ArrowRight,
  CalendarDays,
  RotateCcw,
  FileDown,
  Printer,
  CheckCircle2,
} from 'lucide-react';
import { AnalyticsPrintableModal } from '../components/AnalyticsPrintableModal';
import { generateAnalyticsPDF } from '../utils/analyticsPdfGenerator';

interface ManagerAnalyticsScreenProps {
  onNavigate: (view: string) => void;
}

export const ManagerAnalyticsScreen: React.FC<ManagerAnalyticsScreenProps> = () => {
  const { isSwahili } = useLanguage();
  const [activeTab, setActiveTab] = useState<'performance' | 'forecast' | 'overview'>('performance');
  const [period, setPeriod] = useState<'Daily' | 'Weekly' | 'Monthly'>('Weekly');
  const [productivityView, setProductivityView] = useState<ProductivityViewHorizon>('weekly');
  const [selectedDayPerformance, setSelectedDayPerformance] = useState<DailyVolumeData | null>(null);
  const [orders, setOrders] = useState<Order[]>([]);
  const [tasks, setTasks] = useState<TimelineTask[]>([]);

  // PDF report export & printable modal states
  const [isPrintModalOpen, setIsPrintModalOpen] = useState<boolean>(false);
  const [isGeneratingPdf, setIsGeneratingPdf] = useState<boolean>(false);
  const [downloadNotification, setDownloadNotification] = useState<string | null>(null);

  // Custom date range state (defaults to past 14 days up to today)
  const [customStartDate, setCustomStartDate] = useState<string>('2026-09-11');
  const [customEndDate, setCustomEndDate] = useState<string>('2026-09-25');

  useEffect(() => {
    setOrders(storageService.getOrders());
    setTasks(storageService.getTasks());
  }, []);

  // Compute number of days in the custom date range
  const customDaysCount = useMemo(() => {
    if (!customStartDate || !customEndDate) return 14;
    const start = new Date(customStartDate);
    const end = new Date(customEndDate);
    const diffTime = Math.max(0, end.getTime() - start.getTime());
    const diffDays = Math.round(diffTime / (1000 * 60 * 60 * 24)) + 1;
    return Math.max(1, diffDays);
  }, [customStartDate, customEndDate]);

  // Dynamic KPI multiplier based on selected view horizon or custom date range
  const kpiMultiplier = useMemo(() => {
    if (productivityView === 'quarterly') return 13;
    if (productivityView === 'monthly') return 4.3;
    if (productivityView === 'custom') return Math.max(0.15, Number((customDaysCount / 7).toFixed(2)));
    return 1; // weekly
  }, [productivityView, customDaysCount]);

  // Filter orders according to custom date range if custom is selected
  const filteredOrders = useMemo(() => {
    if (productivityView === 'custom' && customStartDate && customEndDate) {
      return orders.filter((o) => {
        if (!o.createdAt) return true;
        const d = o.createdAt.split('T')[0];
        return d >= customStartDate && d <= customEndDate;
      });
    }
    return orders;
  }, [orders, productivityView, customStartDate, customEndDate]);

  const totalRevenue = filteredOrders.reduce((sum, o) => sum + o.subtotal, 0) + Math.round(1250000 * kpiMultiplier);
  const totalDeliveries = filteredOrders.length + Math.round(38 * kpiMultiplier);
  const completionRate = 96.4;

  const staffKpis = [
    { name: 'Juma Ramadhani', id: 'ZZ-2024-002', revenue: Math.round(780000 * kpiMultiplier), deliveries: Math.round(16 * kpiMultiplier), rate: '98%', trend: 12.8, revTrend: 14.5 },
    { name: 'Ali Hassan', id: 'ZZ-2024-001', revenue: Math.round(650000 * kpiMultiplier), deliveries: Math.round(14 * kpiMultiplier), rate: '95%', trend: 8.4, revTrend: 10.2 },
    { name: 'Salim Bakari', id: 'ZZ-2024-004', revenue: Math.round(590000 * kpiMultiplier), deliveries: Math.round(12 * kpiMultiplier), rate: '94%', trend: -2.8, revTrend: -1.5 },
    { name: 'Baraka Mushi', id: 'ZZ-2024-003', revenue: Math.round(480000 * kpiMultiplier), deliveries: Math.round(10 * kpiMultiplier), rate: '92%', trend: 5.2, revTrend: 6.8 },
  ];

  const regionalBreakdown = [
    { region: isSwahili ? 'Katikati ya Dar es Salaam' : 'Dar es Salaam Central', pct: 38, revenue: 'TZS 950,000' },
    { region: isSwahili ? 'Ilala na Soko la Kariakoo' : 'Ilala & Kariakoo Market', pct: 28, revenue: 'TZS 700,000' },
    { region: isSwahili ? 'Kinondoni na Masaki' : 'Kinondoni & Masaki', pct: 22, revenue: 'TZS 550,000' },
    { region: isSwahili ? 'Temeke Kusini' : 'Temeke South', pct: 12, revenue: 'TZS 300,000' },
  ];

  const handleStartDateChange = (val: string) => {
    setCustomStartDate(val);
    if (customEndDate && val > customEndDate) {
      setCustomEndDate(val);
    }
  };

  const handleEndDateChange = (val: string) => {
    setCustomEndDate(val);
    if (customStartDate && val < customStartDate) {
      setCustomStartDate(val);
    }
  };

  const applyPreset = (days: number) => {
    const end = new Date('2026-09-25T12:00:00Z');
    const start = new Date(end);
    start.setDate(end.getDate() - (days - 1));
    setCustomStartDate(start.toISOString().split('T')[0]);
    setCustomEndDate(end.toISOString().split('T')[0]);
  };

  const applyMonthToDate = () => {
    setCustomStartDate('2026-09-01');
    setCustomEndDate('2026-09-25');
  };

  const applyLastMonth = () => {
    setCustomStartDate('2026-08-01');
    setCustomEndDate('2026-08-31');
  };

  const formatDateDisplay = (dStr: string) => {
    if (!dStr) return '';
    try {
      const [year, month, day] = dStr.split('-');
      const monthNamesEng = ['Jan', 'Feb', 'Mar', 'Apr', 'May', 'Jun', 'Jul', 'Aug', 'Sep', 'Oct', 'Nov', 'Dec'];
      const monthNamesSwa = ['Jan', 'Feb', 'Mac', 'Apr', 'Mei', 'Jun', 'Jul', 'Ago', 'Sep', 'Okt', 'Nov', 'Des'];
      const mIdx = parseInt(month, 10) - 1;
      const mName = isSwahili ? monthNamesSwa[mIdx] : monthNamesEng[mIdx];
      return `${parseInt(day, 10)} ${mName} ${year}`;
    } catch {
      return dStr;
    }
  };

  const getPeriodLabel = (p: 'Daily' | 'Weekly' | 'Monthly') => {
    if (!isSwahili) return p;
    switch (p) {
      case 'Daily': return 'Kila Siku';
      case 'Weekly': return 'Kila Wiki';
      case 'Monthly': return 'Kila Mwezi';
    }
  };

  // Generate and download printable PDF report of current analytics view
  const handleDownloadPDF = () => {
    setIsGeneratingPdf(true);
    try {
      generateAnalyticsPDF({
        productivityView,
        customStartDate,
        customEndDate,
        customDaysCount,
        totalRevenue,
        totalDeliveries,
        completionRate,
        staffKpis,
        regionalBreakdown,
        activeTab,
        isSwahili,
      });
      setDownloadNotification(
        isSwahili
          ? 'Ripoti ya PDF ya takwimu za sasa imepakuliwa kikamilifu!'
          : 'Formatted printable PDF analytics report downloaded successfully!'
      );
      setTimeout(() => setDownloadNotification(null), 5000);
    } catch (err) {
      console.error('Error generating PDF report:', err);
    } finally {
      setIsGeneratingPdf(false);
    }
  };

  return (
    <div className="max-w-5xl mx-auto space-y-6 pb-24 md:pb-12">
      {/* Header with View Navigation and Export Actions */}
      <div className="flex flex-col md:flex-row md:items-center justify-between gap-4 border-b border-[#243447] pb-4">
        <div>
          <h1 className="text-xl sm:text-2xl font-bold text-white flex items-center gap-2">
            <BarChart3 className="w-6 h-6 text-purple-400" />
            <span>
              {isSwahili
                ? 'Uchambuzi na Takwimu za Meli ya Wasimamizi'
                : 'Executive Fleet Intelligence & Analytics'}
            </span>
          </h1>
          <p className="text-xs text-[#8899AA] mt-0.5">
            {isSwahili
              ? 'Utabiri wa mahitaji, uboreshaji wa ratiba za wafanyakazi, na takwimu za mapato ya kikanda.'
              : 'Predictive demand forecasting, workforce scheduling optimization, and regional revenue intelligence.'}
          </p>
        </div>

        {/* Action Controls: Download as PDF, Printable Preview & Tab Switcher */}
        <div className="flex flex-wrap items-center gap-2 self-start md:self-auto">
          {/* Prominent 'Download as PDF' Button */}
          <button
            type="button"
            id="btn-download-pdf"
            data-testid="download-pdf-button"
            onClick={handleDownloadPDF}
            disabled={isGeneratingPdf}
            className="flex items-center gap-1.5 px-3.5 py-1.5 rounded-xl bg-[#006B3C] hover:bg-[#00874C] active:bg-[#005A32] text-white text-xs font-bold shadow-md transition-all border border-[#00C46A]/50 hover:border-[#00C46A] cursor-pointer"
            title={isSwahili ? 'Pakua ripoti hii ya takwimu kama faili la PDF' : 'Download formatted printable report of current analytics view as PDF'}
          >
            <FileDown className="w-4 h-4 text-[#00E67A]" />
            <span>
              {isGeneratingPdf
                ? (isSwahili ? 'Inatayarisha...' : 'Generating...')
                : (isSwahili ? 'Pakua kama PDF' : 'Download as PDF')}
            </span>
          </button>

          {/* Printable Report Preview Button */}
          <button
            type="button"
            id="btn-printable-preview"
            data-testid="printable-preview-button"
            onClick={() => setIsPrintModalOpen(true)}
            className="flex items-center gap-1.5 px-3 py-1.5 rounded-xl bg-[#1A2E1C] hover:bg-[#243E26] text-white text-xs font-semibold transition-all border border-[#3A5068] cursor-pointer"
            title={isSwahili ? 'Hakiki ripoti kamili ya kuchapisha' : 'Preview formatted printable report'}
          >
            <Printer className="w-3.5 h-3.5 text-[#8899AA]" />
            <span className="hidden sm:inline">{isSwahili ? 'Hakiki / Chapa' : 'Printable View'}</span>
          </button>

          {/* Primary View Switcher */}
          <div className="flex bg-[#122010] p-1 rounded-xl border border-[#2A5038] overflow-x-auto max-w-full">
            <button
              type="button"
              id="tab-btn-performance"
              onClick={() => setActiveTab('performance')}
              className={`flex items-center gap-2 px-3.5 py-1.5 rounded-lg text-xs font-bold transition-all shrink-0 ${
                activeTab === 'performance'
                  ? 'bg-[#006B3C] text-white shadow-md'
                  : 'text-[#8899AA] hover:text-white'
              }`}
            >
              <BarChart3 className="w-3.5 h-3.5 text-[#00C46A]" />
              <span>{isSwahili ? 'Dashibodi ya Utendaji' : 'Performance Dashboard'}</span>
            </button>
            <button
              type="button"
              id="tab-btn-forecast"
              onClick={() => setActiveTab('forecast')}
              className={`flex items-center gap-2 px-3.5 py-1.5 rounded-lg text-xs font-bold transition-all shrink-0 ${
                activeTab === 'forecast'
                  ? 'bg-[#006B3C] text-white shadow-md'
                  : 'text-[#8899AA] hover:text-white'
              }`}
            >
              <Sparkles className="w-3.5 h-3.5 text-purple-300" />
              <span>{isSwahili ? 'Utabiri na Upangaji Wafanyakazi' : 'Predictive Forecasting'}</span>
            </button>
            <button
              type="button"
              id="tab-btn-overview"
              onClick={() => setActiveTab('overview')}
              className={`flex items-center gap-2 px-3.5 py-1.5 rounded-lg text-xs font-bold transition-all shrink-0 ${
                activeTab === 'overview'
                  ? 'bg-[#006B3C] text-white shadow-md'
                  : 'text-[#8899AA] hover:text-white'
              }`}
            >
              <Award className="w-3.5 h-3.5 text-blue-400" />
              <span>{isSwahili ? 'Viashiria vya Meli na Kanda' : 'Fleet KPIs & Regions'}</span>
            </button>
          </div>
        </div>
      </div>

      {/* PDF Download Success Notification Banner */}
      {downloadNotification && (
        <div
          data-testid="pdf-download-notification"
          className="bg-[#006B3C]/25 border border-[#00C46A] p-3 rounded-2xl flex items-center justify-between text-xs text-white animate-fade-in shadow-md"
        >
          <div className="flex items-center gap-2.5">
            <CheckCircle2 className="w-4 h-4 text-[#00E67A] shrink-0" />
            <div>
              <span className="font-bold">{downloadNotification}</span>
              <span className="text-[#8899AA] ml-2 font-mono text-[11px]">
                ({productivityView === 'custom' ? `${customDaysCount}d range` : productivityView} report)
              </span>
            </div>
          </div>
          <button
            type="button"
            onClick={() => setIsPrintModalOpen(true)}
            className="text-[11px] text-[#00E67A] hover:underline font-semibold cursor-pointer"
          >
            {isSwahili ? 'Fungua Hakiki ya Kuchapisha →' : 'Open Printable View →'}
          </button>
        </div>
      )}

      {/* Productivity Metrics View Dropdown Filter Toolbar */}
      <div className="flex flex-col sm:flex-row sm:items-center justify-between gap-3 bg-[#122010] p-3.5 sm:px-4 sm:py-3 rounded-2xl border border-[#2A5038]">
        <div className="flex items-center gap-2.5">
          <div className="p-2 rounded-xl bg-[#006B3C]/40 border border-[#00C46A]/30 text-[#00C46A]">
            <Filter className="w-4 h-4" />
          </div>
          <div>
            <div className="flex items-center gap-2">
              <span className="text-xs font-bold text-white">
                {isSwahili ? 'Kichujio cha Takwimu za Utendaji' : 'Productivity Metrics Filter'}
              </span>
              <span className="text-[10px] text-[#00C46A] font-semibold bg-[#006B3C]/40 px-2 py-0.5 rounded border border-[#00C46A]/20 uppercase">
                {productivityView === 'quarterly'
                  ? (isSwahili ? 'Robo Mwaka (Quarterly)' : 'Quarterly')
                  : productivityView === 'monthly'
                  ? (isSwahili ? 'Kila Mwezi (Monthly)' : 'Monthly')
                  : productivityView === 'custom'
                  ? (isSwahili ? `Masafa Maalum (${customDaysCount} Siku)` : `Custom Range (${customDaysCount} Days)`)
                  : (isSwahili ? 'Kila Wiki (Weekly)' : 'Weekly')}
              </span>
            </div>
            <p className="text-[11px] text-[#8899AA]">
              {isSwahili
                ? 'Badilisha vipimo vya tija ya madereva kati ya mtazamo wa kila wiki, mwezi, robo mwaka, au chagua masafa maalum ya tarehe.'
                : 'Toggle driver productivity metrics between weekly, monthly, quarterly, or analyze performance within a custom date range.'}
            </p>
          </div>
        </div>

        <div className="flex items-center gap-2 self-start sm:self-auto">
          <label
            htmlFor="productivity-view-dropdown-screen"
            className="text-xs text-[#8899AA] font-medium whitespace-nowrap flex items-center gap-1.5"
          >
            <Calendar className="w-3.5 h-3.5 text-[#00C46A]" />
            <span>{isSwahili ? 'Mtazamo wa Tija:' : 'Productivity View:'}</span>
          </label>
          <div className="relative">
            <select
              id="productivity-view-dropdown-screen"
              data-testid="productivity-view-dropdown"
              value={productivityView}
              onChange={(e) => setProductivityView(e.target.value as ProductivityViewHorizon)}
              className="bg-[#1A2E1C] border border-[#3A5068] hover:border-[#00C46A] focus:border-[#00C46A] text-white text-xs font-semibold rounded-xl pl-3 pr-8 py-2 focus:outline-none focus:ring-1 focus:ring-[#00C46A] transition-all appearance-none cursor-pointer shadow-sm"
            >
              <option value="weekly" className="bg-[#0E1B11] text-white">
                {isSwahili ? '📅 Kila Wiki (Weekly View - Siku 7)' : '📅 Weekly View (7 Days)'}
              </option>
              <option value="monthly" className="bg-[#0E1B11] text-white">
                {isSwahili ? '📆 Kila Mwezi (Monthly View - Siku 30)' : '📆 Monthly View (30 Days)'}
              </option>
              <option value="quarterly" className="bg-[#0E1B11] text-white">
                {isSwahili ? '📊 Robo Mwaka (Quarterly View - Miezi 3)' : '📊 Quarterly View (90 Days / 3 Mos)'}
              </option>
              <option value="custom" className="bg-[#0E1B11] text-white">
                {isSwahili ? '🗓️ Masafa Maalum (Custom Range)' : '🗓️ Custom Range'}
              </option>
            </select>
            <ChevronDown className="w-4 h-4 text-[#8899AA] pointer-events-none absolute right-2.5 top-1/2 -translate-y-1/2" />
          </div>
        </div>
      </div>

      {/* Custom Date Range Picker Component when 'custom' option is active */}
      {productivityView === 'custom' && (
        <div
          id="custom-date-picker-panel"
          data-testid="custom-date-range-picker"
          className="bg-[#122010] p-4 rounded-2xl border border-[#00C46A]/40 bg-gradient-to-r from-[#122010] via-[#162A19] to-[#122010] shadow-lg animate-fade-in space-y-3.5"
        >
          <div className="flex flex-col md:flex-row md:items-center justify-between gap-3 border-b border-[#2A5038] pb-3">
            <div className="flex items-center gap-2.5">
              <div className="p-1.5 rounded-lg bg-[#006B3C]/50 border border-[#00C46A]/30 text-[#00C46A]">
                <CalendarDays className="w-4 h-4" />
              </div>
              <div>
                <span className="text-xs font-bold text-white flex items-center gap-2">
                  <span>{isSwahili ? 'Masafa Maalum ya Utendaji wa Meli' : 'Custom Performance Date Range'}</span>
                  <span className="text-[10px] font-mono text-[#00C46A] bg-[#006B3C]/40 px-2 py-0.5 rounded border border-[#00C46A]/30">
                    {customDaysCount} {customDaysCount === 1 ? (isSwahili ? 'Siku' : 'Day') : (isSwahili ? 'Siku' : 'Days')}
                  </span>
                </span>
                <p className="text-[11px] text-[#8899AA] mt-0.5">
                  {isSwahili
                    ? 'Chagua tarehe maalum za kuanza na kumaliza ili kuchanganua ujazo, mapato, na tija ya madereva.'
                    : 'Analyze delivery volume, revenue yield, and driver quota velocity between specific start and end dates.'}
                </p>
              </div>
            </div>

            {/* Quick Range Preset Buttons */}
            <div className="flex items-center gap-1.5 flex-wrap text-xs">
              <span className="text-[#8899AA] text-[10px] uppercase font-bold tracking-wider mr-1">
                {isSwahili ? 'Chaguo Haraka:' : 'Presets:'}
              </span>
              <button
                type="button"
                id="preset-btn-7d"
                onClick={() => applyPreset(7)}
                className={`px-2.5 py-1 rounded-lg text-[11px] font-semibold transition-all border ${
                  customDaysCount === 7
                    ? 'bg-[#006B3C] text-white border-[#00C46A]'
                    : 'bg-[#1A2E1C] text-[#8899AA] hover:text-white border-[#2A5038]'
                }`}
              >
                {isSwahili ? 'Siku 7' : 'Last 7d'}
              </button>
              <button
                type="button"
                id="preset-btn-14d"
                onClick={() => applyPreset(14)}
                className={`px-2.5 py-1 rounded-lg text-[11px] font-semibold transition-all border ${
                  customDaysCount === 14
                    ? 'bg-[#006B3C] text-white border-[#00C46A]'
                    : 'bg-[#1A2E1C] text-[#8899AA] hover:text-white border-[#2A5038]'
                }`}
              >
                {isSwahili ? 'Siku 14' : 'Last 14d'}
              </button>
              <button
                type="button"
                id="preset-btn-30d"
                onClick={() => applyPreset(30)}
                className={`px-2.5 py-1 rounded-lg text-[11px] font-semibold transition-all border ${
                  customDaysCount === 30
                    ? 'bg-[#006B3C] text-white border-[#00C46A]'
                    : 'bg-[#1A2E1C] text-[#8899AA] hover:text-white border-[#2A5038]'
                }`}
              >
                {isSwahili ? 'Siku 30' : 'Last 30d'}
              </button>
              <button
                type="button"
                id="preset-btn-mtd"
                onClick={() => applyMonthToDate()}
                className="px-2.5 py-1 rounded-lg text-[11px] font-semibold transition-all border bg-[#1A2E1C] text-[#8899AA] hover:text-white border-[#2A5038]"
              >
                {isSwahili ? 'Mwezi Huu' : 'Month-to-Date'}
              </button>
              <button
                type="button"
                id="preset-btn-last-month"
                onClick={() => applyLastMonth()}
                className="px-2.5 py-1 rounded-lg text-[11px] font-semibold transition-all border bg-[#1A2E1C] text-[#8899AA] hover:text-white border-[#2A5038]"
              >
                {isSwahili ? 'Mwezi Uliopita' : 'Last Month'}
              </button>
            </div>
          </div>

          {/* Date Picker Input Fields */}
          <div className="flex flex-col md:flex-row md:items-center justify-between gap-3 pt-1">
            <div className="flex flex-col sm:flex-row sm:items-center gap-3">
              {/* Start Date Input */}
              <div className="flex items-center gap-2">
                <label
                  htmlFor="custom-start-date"
                  className="text-xs text-[#8899AA] font-semibold whitespace-nowrap flex items-center gap-1.5"
                >
                  <Calendar className="w-3.5 h-3.5 text-[#00C46A]" />
                  <span>{isSwahili ? 'Tarehe ya Kuanza:' : 'Start Date:'}</span>
                </label>
                <input
                  type="date"
                  id="custom-start-date"
                  data-testid="custom-start-date"
                  value={customStartDate}
                  max={customEndDate || '2026-12-31'}
                  onChange={(e) => handleStartDateChange(e.target.value)}
                  className="bg-[#1A2E1C] text-white border border-[#2A5038] hover:border-[#00C46A] focus:border-[#00C46A] rounded-xl px-3 py-1.5 text-xs font-mono font-medium focus:outline-none focus:ring-1 focus:ring-[#00C46A] transition-all cursor-pointer [color-scheme:dark]"
                />
              </div>

              <div className="hidden sm:flex items-center text-[#8899AA]">
                <ArrowRight className="w-4 h-4" />
              </div>

              {/* End Date Input */}
              <div className="flex items-center gap-2">
                <label
                  htmlFor="custom-end-date"
                  className="text-xs text-[#8899AA] font-semibold whitespace-nowrap flex items-center gap-1.5"
                >
                  <Calendar className="w-3.5 h-3.5 text-[#00C46A]" />
                  <span>{isSwahili ? 'Tarehe ya Kumaliza:' : 'End Date:'}</span>
                </label>
                <input
                  type="date"
                  id="custom-end-date"
                  data-testid="custom-end-date"
                  value={customEndDate}
                  min={customStartDate || '2025-01-01'}
                  max="2026-12-31"
                  onChange={(e) => handleEndDateChange(e.target.value)}
                  className="bg-[#1A2E1C] text-white border border-[#2A5038] hover:border-[#00C46A] focus:border-[#00C46A] rounded-xl px-3 py-1.5 text-xs font-mono font-medium focus:outline-none focus:ring-1 focus:ring-[#00C46A] transition-all cursor-pointer [color-scheme:dark]"
                />
              </div>
            </div>

            {/* Active Range Summary Badge */}
            <div className="flex items-center gap-2 self-start md:self-auto">
              <div className="px-3 py-1.5 rounded-xl bg-[#1A2E1C] border border-[#2A5038] text-[11px] font-mono text-[#00E67A] flex items-center gap-1.5">
                <span className="w-2 h-2 rounded-full bg-[#00C46A] animate-pulse"></span>
                <span>
                  {formatDateDisplay(customStartDate)} &ndash; {formatDateDisplay(customEndDate)}
                </span>
                <span className="text-[#8899AA] font-sans text-[10px]">
                  ({customDaysCount} {customDaysCount === 1 ? (isSwahili ? 'siku' : 'day') : (isSwahili ? 'siku' : 'days')})
                </span>
              </div>
            </div>
          </div>
        </div>
      )}

      {/* Enhanced Productivity Breakdown View with Month-over-Month & Week-over-Week Trend Indicators */}
      <div
        id="productivity-breakdown-view"
        data-testid="productivity-breakdown-view"
        className="bg-[#122010] p-4 sm:p-5 rounded-2xl border border-[#2A5038] space-y-4"
      >
        <div className="flex flex-col sm:flex-row sm:items-center justify-between gap-3 border-b border-[#1D2E22] pb-3">
          <div className="flex items-center gap-2.5">
            <div className="p-2 rounded-xl bg-[#006B3C]/40 border border-[#00C46A]/30 text-[#00C46A]">
              <TrendingUp className="w-4 h-4" />
            </div>
            <div>
              <div className="flex items-center gap-2 flex-wrap">
                <h3 className="text-sm sm:text-base font-bold text-white">
                  {isSwahili ? 'Mchanganuo wa Tija na Mitindo ya Utendaji' : 'Productivity Breakdown & Trend Velocity'}
                </h3>
                <span className="text-[10px] font-semibold text-[#00C46A] bg-[#006B3C]/40 px-2 py-0.5 rounded border border-[#00C46A]/30 uppercase tracking-wide">
                  {productivityView === 'quarterly'
                    ? (isSwahili ? 'Robo-kwa-Robo (QoQ)' : 'Quarter-over-Quarter (QoQ)')
                    : productivityView === 'monthly'
                    ? (isSwahili ? 'Mwezi-kwa-Mwezi (MoM)' : 'Month-over-Month (MoM)')
                    : productivityView === 'custom'
                    ? (isSwahili ? `Masafa Maalum (${customDaysCount} Siku)` : `Custom Range (${customDaysCount} Days)`)
                    : (isSwahili ? 'Wiki-kwa-Wiki (WoW)' : 'Week-over-Week (WoW)')}
                </span>
              </div>
              <p className="text-[11px] text-[#8899AA] mt-0.5">
                {isSwahili
                  ? `Viashiria vya mtindo wa ${
                      productivityView === 'monthly'
                        ? 'Mwezi-kwa-Mwezi (MoM)'
                        : productivityView === 'quarterly'
                        ? 'Robo-kwa-Robo (QoQ)'
                        : productivityView === 'custom'
                        ? `Masafa Maalum (${customDaysCount} Siku)`
                        : 'Wiki-kwa-Wiki (WoW)'
                    } vinavyoonyesha mwelekeo wa ukuaji wa vituo, chupa, na mapato.`
                  : `Real-time ${
                      productivityView === 'monthly'
                        ? 'month-over-month (MoM)'
                        : productivityView === 'quarterly'
                        ? 'quarter-over-quarter (QoQ)'
                        : productivityView === 'custom'
                        ? `custom ${customDaysCount}-day range`
                        : 'week-over-week (WoW)'
                    } trend indicators measuring fleet velocity, volume output, and revenue.`}
              </p>
            </div>
          </div>

          <div className="flex items-center gap-3 text-xs self-start sm:self-auto">
            <span className="inline-flex items-center gap-1.5 text-[11px] text-[#00E67A]">
              <span className="w-2 h-2 rounded-full bg-[#00C46A] inline-block animate-pulse"></span>
              <span>{isSwahili ? 'Ukuaji Chanya' : 'Positive Trend'}</span>
            </span>
            <span className="inline-flex items-center gap-1.5 text-[11px] text-red-400">
              <span className="w-2 h-2 rounded-full bg-red-400 inline-block"></span>
              <span>{isSwahili ? 'Upungufu / Tahadhari' : 'Alert / Decline'}</span>
            </span>
          </div>
        </div>

        {/* 5 Key Productivity Metrics Cards with Trend Indicators */}
        <div className="grid grid-cols-2 sm:grid-cols-3 lg:grid-cols-5 gap-3">
          {/* Metric 1: Total Stops Delivered */}
          <div className="bg-[#1A2E1C]/90 p-3.5 rounded-xl border border-[#2A5038] flex flex-col justify-between space-y-1.5">
            <div className="text-[11px] text-[#8899AA] flex items-center justify-between">
              <span>{isSwahili ? 'Vituo Vilivyofikishwa' : 'Stops Delivered'}</span>
              <Package className="w-3.5 h-3.5 text-blue-400 shrink-0" />
            </div>
            <div className="flex items-baseline justify-between gap-1.5 flex-wrap">
              <span className="text-xl sm:text-2xl font-bold font-mono text-white">
                {totalDeliveries}
              </span>
              <TrendIndicator
                value={
                  productivityView === 'quarterly'
                    ? 22.1
                    : productivityView === 'monthly'
                    ? 15.4
                    : productivityView === 'custom'
                    ? Math.round(8.6 * Math.max(0.6, Math.min(2.5, customDaysCount / 7)) * 10) / 10
                    : 8.6
                }
                horizon={productivityView}
                size="xs"
              />
            </div>
            <div className="text-[10px] text-[#8899AA] truncate">
              {productivityView === 'weekly'
                ? (isSwahili ? '+3 vituo vs wiki iliyopita' : '+3 stops vs prior week')
                : productivityView === 'monthly'
                ? (isSwahili ? '+18 vituo vs mwezi uliopita' : '+18 stops vs prior month')
                : productivityView === 'quarterly'
                ? (isSwahili ? '+54 vituo vs robo iliyopita' : '+54 stops vs prior quarter')
                : (isSwahili ? `+${Math.round(3 * (customDaysCount / 7))} vituo vs kipindi cha nyuma` : `+${Math.round(3 * (customDaysCount / 7))} stops vs prior period`)}
            </div>
          </div>

          {/* Metric 2: Total Bottles Dispatched */}
          <div className="bg-[#1A2E1C]/90 p-3.5 rounded-xl border border-[#2A5038] flex flex-col justify-between space-y-1.5">
            <div className="text-[11px] text-[#8899AA] flex items-center justify-between">
              <span>{isSwahili ? 'Chupa Zilizosambazwa' : 'Bottles Dispatched'}</span>
              <TrendingUp className="w-3.5 h-3.5 text-[#00C46A] shrink-0" />
            </div>
            <div className="flex items-baseline justify-between gap-1.5 flex-wrap">
              <span className="text-xl sm:text-2xl font-bold font-mono text-[#00C46A]">
                {(totalDeliveries * 9).toLocaleString()}
              </span>
              <TrendIndicator
                value={
                  productivityView === 'quarterly'
                    ? 26.4
                    : productivityView === 'monthly'
                    ? 18.7
                    : productivityView === 'custom'
                    ? Math.round(11.3 * Math.max(0.6, Math.min(2.5, customDaysCount / 7)) * 10) / 10
                    : 11.3
                }
                horizon={productivityView}
                size="xs"
              />
            </div>
            <div className="text-[10px] text-[#8899AA] truncate">
              {productivityView === 'weekly'
                ? (isSwahili ? '+38 chupa (18.9L & 13L)' : '+38 bottles (18.9L & 13L)')
                : productivityView === 'monthly'
                ? (isSwahili ? '+196 chupa vs mwezi uliopita' : '+196 bottles vs prior month')
                : productivityView === 'quarterly'
                ? (isSwahili ? '+580 chupa vs robo iliyopita' : '+580 bottles vs prior quarter')
                : (isSwahili ? `+${Math.round(38 * (customDaysCount / 7))} chupa zilizowasilishwa` : `+${Math.round(38 * (customDaysCount / 7))} bottles delivered`)}
            </div>
          </div>

          {/* Metric 3: Gross Revenue Collections */}
          <div className="bg-[#1A2E1C]/90 p-3.5 rounded-xl border border-[#2A5038] flex flex-col justify-between space-y-1.5">
            <div className="text-[11px] text-[#8899AA] flex items-center justify-between">
              <span>{isSwahili ? 'Mapato ya Meli' : 'Gross Collections'}</span>
              <DollarSign className="w-3.5 h-3.5 text-[#00C46A] shrink-0" />
            </div>
            <div className="flex items-baseline justify-between gap-1.5 flex-wrap">
              <span className="text-lg sm:text-xl font-bold font-mono text-white truncate">
                TZS {(totalRevenue >= 1000000 ? `${(totalRevenue / 1000000).toFixed(2)}M` : totalRevenue.toLocaleString())}
              </span>
              <TrendIndicator
                value={
                  productivityView === 'quarterly'
                    ? 28.5
                    : productivityView === 'monthly'
                    ? 19.8
                    : productivityView === 'custom'
                    ? Math.round(14.2 * Math.max(0.6, Math.min(2.5, customDaysCount / 7)) * 10) / 10
                    : 14.2
                }
                horizon={productivityView}
                size="xs"
              />
            </div>
            <div className="text-[10px] text-[#8899AA] truncate">
              {productivityView === 'weekly'
                ? '+TZS 185k WoW'
                : productivityView === 'monthly'
                ? '+TZS 740k MoM'
                : productivityView === 'quarterly'
                ? '+TZS 2.4M QoQ'
                : `+TZS ${Math.round(185 * (customDaysCount / 7))}k (${customDaysCount}d)`}
            </div>
          </div>

          {/* Metric 4: Quota Completion Rate */}
          <div className="bg-[#1A2E1C]/90 p-3.5 rounded-xl border border-[#2A5038] flex flex-col justify-between space-y-1.5">
            <div className="text-[11px] text-[#8899AA] flex items-center justify-between">
              <span>{isSwahili ? 'Utekelezaji wa Lengo' : 'Quota Completion'}</span>
              <Award className="w-3.5 h-3.5 text-purple-400 shrink-0" />
            </div>
            <div className="flex items-baseline justify-between gap-1.5 flex-wrap">
              <span className="text-xl sm:text-2xl font-bold font-mono text-purple-300">
                {completionRate}%
              </span>
              <TrendIndicator
                value={
                  productivityView === 'quarterly'
                    ? 8.4
                    : productivityView === 'monthly'
                    ? 5.8
                    : productivityView === 'custom'
                    ? Math.round(3.2 * Math.max(0.6, Math.min(1.8, customDaysCount / 7)) * 10) / 10
                    : 3.2
                }
                horizon={productivityView}
                size="xs"
              />
            </div>
            <div className="text-[10px] text-[#8899AA] truncate">
              {isSwahili ? 'SLA ya Meli: 95.0%' : 'Fleet SLA Target: 95.0%'}
            </div>
          </div>

          {/* Metric 5: Dispatch SLA & On-Time Rate (shows red down arrow for weekly traffic alerts) */}
          <div className="bg-[#1A2E1C]/90 p-3.5 rounded-xl border border-[#2A5038] flex flex-col justify-between space-y-1.5 col-span-2 sm:col-span-1">
            <div className="text-[11px] text-[#8899AA] flex items-center justify-between">
              <span>{isSwahili ? 'Kwa Wakati (On-Time)' : 'Dispatch SLA'}</span>
              <Sparkles className="w-3.5 h-3.5 text-amber-400 shrink-0" />
            </div>
            <div className="flex items-baseline justify-between gap-1.5 flex-wrap">
              <span className="text-xl sm:text-2xl font-bold font-mono text-white">
                98.1%
              </span>
              <TrendIndicator
                value={
                  productivityView === 'quarterly'
                    ? 3.4
                    : productivityView === 'monthly'
                    ? 1.8
                    : productivityView === 'custom'
                    ? 1.2
                    : -0.5
                }
                horizon={productivityView}
                size="xs"
              />
            </div>
            <div className="text-[10px] text-[#8899AA] truncate">
              {productivityView === 'weekly'
                ? (isSwahili ? '-0.5% (msongamano jioni)' : '-0.5% (evening traffic alert)')
                : productivityView === 'monthly'
                ? (isSwahili ? '+1.8% ufanisi wa njia' : '+1.8% route dispatch gains')
                : (isSwahili ? '+1.2% utulivu wa njia' : '+1.2% route fulfillment')}
            </div>
          </div>
        </div>
      </div>

      {/* View 1: Visual Performance Dashboard with Recharts Bar Charts */}
      {activeTab === 'performance' && (
        <div className="space-y-6 animate-fade-in">
          <ManagerPerformanceDashboard
            orders={orders}
            tasks={tasks}
            selectedDay={selectedDayPerformance}
            onSelectDay={setSelectedDayPerformance}
            productivityView={productivityView}
            onProductivityViewChange={setProductivityView}
            customStartDate={customStartDate}
            customEndDate={customEndDate}
          />
        </div>
      )}

      {/* View 2: Predictive Delivery Forecasting & Staff Scheduling Optimization Model */}
      {activeTab === 'forecast' && (
        <div className="space-y-6 animate-fade-in">
          <DeliveryForecastOptimizer orders={orders} tasks={tasks} />
        </div>
      )}

      {/* View 2: Historic Fleet KPIs & Regional Performance */}
      {activeTab === 'overview' && (
        <div className="space-y-6 animate-fade-in">
          {/* Period Selector Bar */}
          <div className="flex items-center justify-between bg-[#122010] p-3 rounded-2xl border border-[#2A5038]">
            <span className="text-xs text-[#8899AA] font-medium">
              {isSwahili ? 'Kipindi cha Ripoti:' : 'Reporting Aggregation Window:'}
            </span>
            <div className="flex bg-[#1A2E1C] p-1 rounded-xl border border-[#3A5068]">
              {(['Daily', 'Weekly', 'Monthly'] as const).map((p) => (
                <button
                  key={p}
                  onClick={() => setPeriod(p)}
                  className={`px-3 py-1 rounded-lg text-xs font-semibold transition-all ${
                    period === p ? 'bg-[#006B3C] text-white shadow' : 'text-[#8899AA] hover:text-white'
                  }`}
                >
                  {getPeriodLabel(p)}
                </button>
              ))}
            </div>
          </div>

          {/* Top 3 KPI Highlights */}
          <div className="grid grid-cols-1 sm:grid-cols-3 gap-4">
            <div className="bg-[#122010] p-5 rounded-2xl border border-[#2A5038] relative overflow-hidden">
              <div className="flex items-center justify-between text-xs text-[#8899AA]">
                <span>{isSwahili ? 'Jumla ya Mapato Ghafi' : 'Total Gross Revenue'}</span>
                <TrendingUp className="w-4 h-4 text-[#00C46A]" />
              </div>
              <div className="flex items-baseline justify-between gap-2 mt-2">
                <div className="text-2xl font-bold font-mono text-white">
                  TZS {totalRevenue.toLocaleString()}
                </div>
                <TrendIndicator
                  value={period === 'Weekly' ? 14.2 : period === 'Monthly' ? 19.8 : 3.8}
                  horizon={period === 'Weekly' ? 'WoW' : period === 'Monthly' ? 'MoM' : 'weekly'}
                  size="xs"
                />
              </div>
              <span className="text-[10px] text-[#00C46A] font-semibold mt-1 inline-block">
                {isSwahili
                  ? `${period === 'Weekly' ? 'Wiki-kwa-Wiki' : 'Mwezi-kwa-Mwezi'}: Ukuaji mzuri wa mapato`
                  : `${period === 'Weekly' ? 'Week-over-Week' : 'Month-over-Month'} strong revenue momentum`}
              </span>
            </div>

            <div className="bg-[#122010] p-5 rounded-2xl border border-[#2A5038]">
              <div className="flex items-center justify-between text-xs text-[#8899AA]">
                <span>{isSwahili ? 'Vituo Vilivyofikishwa' : 'Total Delivered Stops'}</span>
                <Package className="w-4 h-4 text-blue-400" />
              </div>
              <div className="flex items-baseline justify-between gap-2 mt-2">
                <div className="text-2xl font-bold font-mono text-white">
                  {totalDeliveries} {isSwahili ? 'vituo' : 'stops'}
                </div>
                <TrendIndicator
                  value={period === 'Weekly' ? 8.6 : period === 'Monthly' ? 15.4 : 2.5}
                  horizon={period === 'Weekly' ? 'WoW' : period === 'Monthly' ? 'MoM' : 'weekly'}
                  size="xs"
                />
              </div>
              <span className="text-[10px] text-[#00C46A] font-semibold mt-1 inline-block">
                {isSwahili ? 'Utekelezaji kwa wakati 98.1%' : 'On-time fulfillment 98.1%'}
              </span>
            </div>

            <div className="bg-[#122010] p-5 rounded-2xl border border-[#2A5038]">
              <div className="flex items-center justify-between text-xs text-[#8899AA]">
                <span>{isSwahili ? 'Kiwango cha Kukamilisha' : 'Completion Rate'}</span>
                <Award className="w-4 h-4 text-purple-400" />
              </div>
              <div className="flex items-baseline justify-between gap-2 mt-2">
                <div className="text-2xl font-bold font-mono text-white">
                  {completionRate}%
                </div>
                <TrendIndicator
                  value={period === 'Weekly' ? 2.4 : period === 'Monthly' ? 4.8 : 0.8}
                  horizon={period === 'Weekly' ? 'WoW' : period === 'Monthly' ? 'MoM' : 'weekly'}
                  size="xs"
                />
              </div>
              <span className="text-[10px] text-[#00C46A] font-semibold mt-1 inline-block">
                {isSwahili ? 'Kuzidi lengo la robo mwaka' : 'Exceeding quarterly SLA'}
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
                  <span>{isSwahili ? 'Wafanyakazi Bora wa Nyanjani' : 'Top Performing Field Staff'}</span>
                </h2>
                <span className="text-xs text-[#8899AA]">
                  {isSwahili ? `Nafasi za ${getPeriodLabel(period)}` : `${period} Rankings`}
                </span>
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
                        <div className="font-bold text-white flex items-center gap-1.5">
                          <span>{staff.name}</span>
                          <TrendIndicator
                            value={period === 'Weekly' ? staff.trend : Math.round(staff.trend * 1.35 * 10) / 10}
                            horizon={period === 'Weekly' ? 'WoW' : 'MoM'}
                            size="xs"
                          />
                        </div>
                        <div className="text-[10px] text-[#8899AA] font-mono">
                          {staff.id} &bull; {staff.deliveries} {isSwahili ? 'vituo' : 'stops'}
                        </div>
                      </div>
                    </div>

                    <div className="text-right space-y-0.5">
                      <div className="font-mono font-bold text-[#00C46A] flex items-center justify-end gap-1.5">
                        <span>TZS {staff.revenue.toLocaleString()}</span>
                        <TrendIndicator
                          value={period === 'Weekly' ? staff.revTrend : Math.round(staff.revTrend * 1.3 * 10) / 10}
                          horizon={period === 'Weekly' ? 'WoW' : 'MoM'}
                          size="xs"
                        />
                      </div>
                      <div className="text-[10px] text-[#8899AA]">
                        {staff.rate} {isSwahili ? 'utekelezaji' : 'fulfillment'}
                      </div>
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
                  <span>{isSwahili ? 'Mgawanyo wa Mapato ya Kanda' : 'Regional Revenue Distribution'}</span>
                </h2>
                <span className="text-xs text-[#8899AA]">Dar es Salaam</span>
              </div>

              <div className="space-y-3.5">
                {regionalBreakdown.map((item) => (
                  <div key={item.region} className="space-y-1.5">
                    <div className="flex justify-between text-xs">
                      <span className="font-medium text-white">{item.region}</span>
                      <span className="font-mono text-[#00C46A]">
                        {item.revenue} ({item.pct}%)
                      </span>
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
      )}

      {/* Formatted Printable Report Preview & PDF Export Modal */}
      <AnalyticsPrintableModal
        isOpen={isPrintModalOpen}
        onClose={() => setIsPrintModalOpen(false)}
        reportData={{
          productivityView,
          customStartDate,
          customEndDate,
          customDaysCount,
          totalRevenue,
          totalDeliveries,
          completionRate,
          staffKpis,
          regionalBreakdown,
          activeTab,
          isSwahili,
        }}
      />
    </div>
  );
};
