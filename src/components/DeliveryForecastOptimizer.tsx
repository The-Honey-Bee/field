import React, { useState, useMemo, useEffect } from 'react';
import {
  ResponsiveContainer,
  ComposedChart,
  BarChart,
  Area,
  Line,
  Bar,
  XAxis,
  YAxis,
  CartesianGrid,
  Tooltip,
  Legend,
  ReferenceLine,
} from 'recharts';
import {
  TrendingUp,
  Users,
  Truck,
  AlertTriangle,
  Calendar,
  Sparkles,
  Sliders,
  CheckCircle2,
  Clock,
  Download,
  Info,
  ChevronRight,
  RefreshCw,
  BarChart2,
  CalendarDays,
  ShieldAlert,
} from 'lucide-react';
import { Order, TimelineTask } from '../types';
import {
  forecastingEngine,
  ForecastingConfig,
  ForecastSummary,
  ForecastDay,
  SchedulingOptimizationAdvice,
} from '../services/forecasting';
import { useTheme } from '../context/ThemeContext';

interface DeliveryForecastOptimizerProps {
  orders: Order[];
  tasks?: TimelineTask[];
}

export const DeliveryForecastOptimizer: React.FC<DeliveryForecastOptimizerProps> = ({
  orders,
  tasks = [],
}) => {
  const { isSunlight } = useTheme();

  // Configuration State
  const [horizon, setHorizon] = useState<7 | 14>(7);
  const [scenario, setScenario] = useState<'normal' | 'heatwave' | 'monsoon'>('normal');
  const [targetStopsPerDriver, setTargetStopsPerDriver] = useState<number>(16);
  const [activeDriverPool, setActiveDriverPool] = useState<number>(4);
  const [truckCapacity, setTruckCapacity] = useState<number>(140);
  const [showConfigDrawer, setShowConfigDrawer] = useState<boolean>(false);
  const [activeChartTab, setActiveChartTab] = useState<'volume' | 'staffing' | 'seasonality'>('volume');

  // AI Insights State
  const [aiAdvice, setAiAdvice] = useState<SchedulingOptimizationAdvice | null>(null);
  const [isAiLoading, setIsAiLoading] = useState<boolean>(false);
  const [exportNotice, setExportNotice] = useState<string | null>(null);

  // Generate Forecast dynamically from historical orders + config
  const config: ForecastingConfig = useMemo(
    () => ({
      horizonDays: horizon,
      targetStopsPerDriver,
      truckBottleCapacity: truckCapacity,
      activeDriverPool,
      scenario,
    }),
    [horizon, targetStopsPerDriver, truckCapacity, activeDriverPool, scenario]
  );

  const forecastSummary: ForecastSummary = useMemo(() => {
    return forecastingEngine.generateForecast(orders, tasks, config);
  }, [orders, tasks, config]);

  // Initial local heuristic advice
  useEffect(() => {
    const localAdvice = forecastingEngine.generateHeuristicAdvice(forecastSummary, config);
    setAiAdvice(localAdvice);
  }, [forecastSummary, config]);

  // Request AI Staffing Optimization from server (calls Gemini or smart fallback)
  const handleFetchAiSchedulingAnalysis = async () => {
    setIsAiLoading(true);
    try {
      const response = await fetch('/api/forecast-staff-scheduling', {
        method: 'POST',
        headers: { 'Content-Type': 'application/json' },
        body: JSON.stringify({
          horizonDays: forecastSummary.horizonDays,
          totalProjectedStops: forecastSummary.totalProjectedStops,
          totalProjectedBottles: forecastSummary.totalProjectedBottles,
          avgDailyStops: forecastSummary.avgDailyStops,
          peakDay: forecastSummary.peakDay,
          understaffedDaysCount: forecastSummary.understaffedDaysCount,
          fleetUtilizationAvg: forecastSummary.fleetUtilizationAvg,
          activeDriverPool,
          targetStopsPerDriver,
          scenario,
          seasonalityNotes: 'Corporate offices peak Mondays; commercial restaurants refill Thursdays and Fridays.',
        }),
      });

      if (response.ok) {
        const data = await response.json();
        setAiAdvice({
          summary: data.summary,
          keyActionItems: data.keyActionItems || [],
          shiftStaggeringPlan: data.shiftStaggeringPlan || '',
          fleetDeploymentAdvice: data.fleetDeploymentAdvice || '',
          riskMitigation: data.riskMitigation || '',
          source: data.source || 'gemini',
        });
      }
    } catch (err) {
      console.warn('Error fetching AI scheduling analysis, retaining local engine heuristics:', err);
    } finally {
      setIsAiLoading(false);
    }
  };

  // Export Forecast & Staff Schedule as CSV
  const handleExportCSV = () => {
    const lines = [
      'ZAMZAM WATER CO. - PREDICTIVE DELIVERY FORECAST & STAFF ROSTER',
      `Generated Date,${new Date().toLocaleDateString()}`,
      `Forecast Horizon,${horizon} Days`,
      `Scenario,${scenario.toUpperCase()}`,
      `Active Staff Pool,${activeDriverPool} Drivers`,
      `Driver Capacity Target,${targetStopsPerDriver} stops/day`,
      `Total Projected Deliveries,${forecastSummary.totalProjectedStops} stops`,
      `Total Projected Bottles,${forecastSummary.totalProjectedBottles} units (18.9L)`,
      `Total Projected Revenue,TZS ${forecastSummary.totalProjectedRevenue.toLocaleString()}`,
      '',
      'DAILY FORECAST & RECOMMENDED STAFF SCHEDULE',
      'Date,Day,Expected Stops,Surge Upper Bound,Projected Bottles,Recommended Drivers,Recommended Trucks,Fleet Utilization %,Morning Shift Stops,Afternoon Shift Stops,Status,Dispatch Notes',
      ...forecastSummary.forecastDays.map(
        (d) =>
          `"${d.date}","${d.fullDateLabel}",${d.expectedStops},${d.upperStops},${d.expectedBottles},${d.recommendedDrivers},${d.recommendedTrucks},${d.utilizationPct}%,${d.morningShiftStops},${d.afternoonShiftStops},"${d.status}","${d.notes.replace(/"/g, '""')}"`
      ),
    ];

    const csvContent = 'data:text/csv;charset=utf-8,\uFEFF' + encodeURIComponent(lines.join('\n'));
    const link = document.createElement('a');
    link.href = csvContent;
    link.download = `zamzam_delivery_forecast_${horizon}d_${new Date().toISOString().slice(0, 10)}.csv`;
    document.body.appendChild(link);
    link.click();
    document.body.removeChild(link);

    setExportNotice('Forecast roster exported to CSV!');
    setTimeout(() => setExportNotice(null), 3000);
  };

  // Prepare chart data
  const chartData = useMemo(() => {
    const maxCapacityStops = activeDriverPool * targetStopsPerDriver;
    return forecastSummary.forecastDays.map((d) => ({
      name: d.dayName,
      fullLabel: d.fullDateLabel,
      expectedStops: d.expectedStops,
      upperStops: d.upperStops,
      lowerStops: d.lowerStops,
      bottles: d.expectedBottles,
      recommendedDrivers: d.recommendedDrivers,
      activeDrivers: activeDriverPool,
      maxFleetCapacity: maxCapacityStops,
      utilization: d.utilizationPct,
      morningStops: d.morningShiftStops,
      afternoonStops: d.afternoonShiftStops,
      isSurge: d.recommendedDrivers > activeDriverPool,
    }));
  }, [forecastSummary, activeDriverPool, targetStopsPerDriver]);

  // Seasonality bar chart data
  const seasonalityChartData = useMemo(() => {
    return forecastSummary.seasonalityBreakdown.map((s) => ({
      day: s.dayName.slice(0, 3),
      factor: Math.round(s.factor * 100),
      typicalStops: s.typicalStops,
      description: s.description,
    }));
  }, [forecastSummary]);

  const maxFleetDailyCapacity = activeDriverPool * targetStopsPerDriver;

  return (
    <div className="space-y-6">
      {/* Forecasting Control Panel Banner */}
      <div className="bg-[#122010] p-4 sm:p-5 rounded-2xl border border-[#2A5038] shadow-lg">
        <div className="flex flex-col md:flex-row md:items-center justify-between gap-4">
          <div>
            <div className="flex items-center gap-2">
              <span className="p-2 rounded-xl bg-purple-500/20 text-purple-400 border border-purple-500/30">
                <TrendingUp className="w-5 h-5" />
              </span>
              <div>
                <h2 className="text-base sm:text-lg font-bold text-white flex items-center gap-2">
                  <span>Predictive Delivery & Staffing Forecast</span>
                  <span className="text-[10px] uppercase font-bold bg-[#006B3C] text-white px-2 py-0.5 rounded-full border border-[#00C46A]/40">
                    Confidence: {forecastSummary.confidenceScore}%
                  </span>
                </h2>
                <p className="text-xs text-[#8899AA] mt-0.5">
                  Statistical regression model combining historical orders, day-of-week seasonality, and fleet capacity targets.
                </p>
              </div>
            </div>
          </div>

          {/* Quick Scenario & Horizon Controls */}
          <div className="flex flex-wrap items-center gap-2 self-start md:self-auto">
            {/* Horizon Selector */}
            <div className="flex bg-[#1A2E1C] p-1 rounded-xl border border-[#3A5068]">
              <button
                type="button"
                onClick={() => setHorizon(7)}
                className={`px-3 py-1.5 rounded-lg text-xs font-semibold transition-all ${
                  horizon === 7 ? 'bg-[#006B3C] text-white shadow-sm' : 'text-[#8899AA] hover:text-white'
                }`}
              >
                Next 7 Days
              </button>
              <button
                type="button"
                onClick={() => setHorizon(14)}
                className={`px-3 py-1.5 rounded-lg text-xs font-semibold transition-all ${
                  horizon === 14 ? 'bg-[#006B3C] text-white shadow-sm' : 'text-[#8899AA] hover:text-white'
                }`}
              >
                Next 14 Days
              </button>
            </div>

            {/* Scenario Dropdown */}
            <div className="flex items-center bg-[#1A2E1C] px-2.5 py-1.5 rounded-xl border border-[#3A5068] text-xs">
              <span className="text-[#8899AA] mr-1.5 font-medium">Demand:</span>
              <select
                aria-label="Demand Scenario"
                value={scenario}
                onChange={(e) => setScenario(e.target.value as any)}
                className="bg-transparent text-white font-semibold focus:outline-none cursor-pointer"
              >
                <option value="normal" className="bg-[#122010] text-white">Normal Baseline</option>
                <option value="heatwave" className="bg-[#122010] text-white">Heatwave Surge (+25%)</option>
                <option value="monsoon" className="bg-[#122010] text-white">Rain / Road Delays (-12%)</option>
              </select>
            </div>

            {/* Staffing Config Drawer Toggle */}
            <button
              type="button"
              onClick={() => setShowConfigDrawer(!showConfigDrawer)}
              className={`p-2 rounded-xl border text-xs font-semibold flex items-center gap-1.5 transition-all ${
                showConfigDrawer
                  ? 'bg-[#00C46A] text-[#0A1A0F] border-[#00C46A]'
                  : 'bg-[#1A2E1C] text-[#8899AA] hover:text-white border-[#3A5068]'
              }`}
              title="Adjust driver capacity and fleet parameters"
            >
              <Sliders className="w-4 h-4" />
              <span className="hidden sm:inline">Fleet Tuning</span>
            </button>

            {/* Export Roster CSV */}
            <button
              type="button"
              onClick={handleExportCSV}
              className="p-2 rounded-xl bg-[#1A2E1C] hover:bg-[#253D28] text-white border border-[#3A5068] hover:border-[#00C46A] transition-all"
              title="Export Forecast & Staff Schedule as CSV"
            >
              <Download className="w-4 h-4 text-[#00C46A]" />
            </button>
          </div>
        </div>

        {/* Staffing Assumption Tuning Drawer */}
        {showConfigDrawer && (
          <div className="mt-4 pt-4 border-t border-[#243447] grid grid-cols-1 sm:grid-cols-3 gap-4 animate-fade-in bg-[#0E1B11] p-3.5 rounded-xl border border-[#2A5038]">
            {/* Target Stops Per Driver */}
            <div>
              <div className="flex justify-between text-xs text-[#8899AA] mb-1">
                <span>Driver Capacity Target:</span>
                <strong className="text-white font-mono">{targetStopsPerDriver} stops/day</strong>
              </div>
              <input
                type="range"
                min="10"
                max="24"
                step="1"
                value={targetStopsPerDriver}
                onChange={(e) => setTargetStopsPerDriver(Number(e.target.value))}
                className="w-full accent-[#00C46A] cursor-pointer"
              />
              <span className="text-[10px] text-[#8899AA] block mt-0.5">
                Standard route workload in urban Dar es Salaam
              </span>
            </div>

            {/* Active Driver Pool */}
            <div>
              <div className="flex justify-between text-xs text-[#8899AA] mb-1">
                <span>Active Driver Pool:</span>
                <strong className="text-white font-mono">{activeDriverPool} Drivers</strong>
              </div>
              <input
                type="range"
                min="2"
                max="10"
                step="1"
                value={activeDriverPool}
                onChange={(e) => setActiveDriverPool(Number(e.target.value))}
                className="w-full accent-[#00C46A] cursor-pointer"
              />
              <span className="text-[10px] text-[#8899AA] block mt-0.5">
                Fleet max daily capacity: {maxFleetDailyCapacity} stops
              </span>
            </div>

            {/* Vehicle Bottle Capacity */}
            <div>
              <div className="flex justify-between text-xs text-[#8899AA] mb-1">
                <span>Truck Capacity (18.9L):</span>
                <strong className="text-white font-mono">{truckCapacity} bottles</strong>
              </div>
              <input
                type="range"
                min="80"
                max="240"
                step="10"
                value={truckCapacity}
                onChange={(e) => setTruckCapacity(Number(e.target.value))}
                className="w-full accent-[#00C46A] cursor-pointer"
              />
              <span className="text-[10px] text-[#8899AA] block mt-0.5">
                Standard 3-ton Isuzu vs light van payload
              </span>
            </div>
          </div>
        )}

        {exportNotice && (
          <div className="mt-3 bg-[#006B3C]/30 border border-[#00C46A]/50 text-[#00C46A] px-3 py-1.5 rounded-lg text-xs flex items-center gap-2">
            <CheckCircle2 className="w-4 h-4" />
            <span>{exportNotice}</span>
          </div>
        )}
      </div>

      {/* 4 Scorecard KPI Cards for Forecast Highlights */}
      <div className="grid grid-cols-2 lg:grid-cols-4 gap-3.5">
        {/* Total Projected Stops */}
        <div className="bg-[#122010] p-4 rounded-2xl border border-[#2A5038]">
          <div className="flex items-center justify-between text-xs text-[#8899AA]">
            <span>Projected {horizon}-Day Volume</span>
            <TrendingUp className="w-4 h-4 text-[#00C46A]" />
          </div>
          <div className="text-2xl font-bold font-mono text-white mt-1.5">
            {forecastSummary.totalProjectedStops} stops
          </div>
          <div className="text-[11px] text-[#8899AA] mt-1 flex items-center justify-between">
            <span>Avg {forecastSummary.avgDailyStops}/day</span>
            <span className="text-[#00C46A] font-semibold">{forecastSummary.totalProjectedBottles.toLocaleString()} bottles</span>
          </div>
        </div>

        {/* Peak Surge Day */}
        <div className="bg-[#122010] p-4 rounded-2xl border border-[#2A5038]">
          <div className="flex items-center justify-between text-xs text-[#8899AA]">
            <span>Peak Demand Window</span>
            <Calendar className="w-4 h-4 text-amber-400" />
          </div>
          <div className="text-xl sm:text-2xl font-bold font-mono text-white mt-1.5 truncate">
            {forecastSummary.peakDay.dayLabel}
          </div>
          <div className="text-[11px] text-amber-400 font-semibold mt-1">
            {forecastSummary.peakDay.stops} stops &bull; {forecastSummary.peakDay.driversNeeded} drivers needed
          </div>
        </div>

        {/* Fleet Staffing Health */}
        <div className="bg-[#122010] p-4 rounded-2xl border border-[#2A5038]">
          <div className="flex items-center justify-between text-xs text-[#8899AA]">
            <span>Staffing Capacity Health</span>
            <Users className="w-4 h-4 text-blue-400" />
          </div>
          <div className="text-2xl font-bold font-mono text-white mt-1.5">
            {forecastSummary.understaffedDaysCount === 0 ? (
              <span className="text-[#00C46A]">Fully Covered</span>
            ) : (
              <span className="text-amber-400">{forecastSummary.understaffedDaysCount} Surge Alert{forecastSummary.understaffedDaysCount > 1 ? 's' : ''}</span>
            )}
          </div>
          <div className="text-[11px] text-[#8899AA] mt-1">
            Pool: {activeDriverPool} drivers &bull; Max {maxFleetDailyCapacity} stops/day
          </div>
        </div>

        {/* Fleet Utilization Rate */}
        <div className="bg-[#122010] p-4 rounded-2xl border border-[#2A5038]">
          <div className="flex items-center justify-between text-xs text-[#8899AA]">
            <span>Avg Fleet Utilization</span>
            <Truck className="w-4 h-4 text-purple-400" />
          </div>
          <div className="text-2xl font-bold font-mono text-white mt-1.5">
            {forecastSummary.fleetUtilizationAvg}%
          </div>
          <div className="text-[11px] text-[#8899AA] mt-1">
            {forecastSummary.fleetUtilizationAvg > 90
              ? 'High demand: Recommend Shift B support'
              : 'Optimal operating range (75-88%)'}
          </div>
        </div>
      </div>

      {/* Main Interactive Charts Card */}
      <div className="bg-[#122010] p-4 sm:p-5 rounded-2xl border border-[#2A5038] shadow-md">
        {/* Chart Header & Tab Navigation */}
        <div className="flex flex-col sm:flex-row sm:items-center justify-between gap-3 border-b border-[#243447] pb-3 mb-4">
          <div>
            <h3 className="text-sm font-bold text-white flex items-center gap-2">
              <BarChart2 className="w-4 h-4 text-[#00C46A]" />
              <span>
                {activeChartTab === 'volume' && 'Projected Delivery Volumes & Confidence Envelope'}
                {activeChartTab === 'staffing' && 'Staff Optimization: Recommended vs Available Driver Roster'}
                {activeChartTab === 'seasonality' && 'Empirical Day-of-Week Seasonality Decomposition'}
              </span>
            </h3>
            <p className="text-xs text-[#8899AA] mt-0.5">
              {activeChartTab === 'volume' && 'Expected deliveries with +18% peak surge confidence interval.'}
              {activeChartTab === 'staffing' && 'Identifies scheduling deficits before the shift starts.'}
              {activeChartTab === 'seasonality' && 'Baseline refill frequency distribution across Dar es Salaam commercial routes.'}
            </p>
          </div>

          <div className="flex bg-[#1A2E1C] p-1 rounded-xl border border-[#3A5068] self-start sm:self-auto">
            <button
              type="button"
              onClick={() => setActiveChartTab('volume')}
              className={`px-3 py-1.5 rounded-lg text-xs font-semibold transition-all ${
                activeChartTab === 'volume' ? 'bg-[#006B3C] text-white' : 'text-[#8899AA] hover:text-white'
              }`}
            >
              Delivery Volume
            </button>
            <button
              type="button"
              onClick={() => setActiveChartTab('staffing')}
              className={`px-3 py-1.5 rounded-lg text-xs font-semibold transition-all ${
                activeChartTab === 'staffing' ? 'bg-[#006B3C] text-white' : 'text-[#8899AA] hover:text-white'
              }`}
            >
              Staff Roster
            </button>
            <button
              type="button"
              onClick={() => setActiveChartTab('seasonality')}
              className={`px-3 py-1.5 rounded-lg text-xs font-semibold transition-all ${
                activeChartTab === 'seasonality' ? 'bg-[#006B3C] text-white' : 'text-[#8899AA] hover:text-white'
              }`}
            >
              Seasonality
            </button>
          </div>
        </div>

        {/* Tab 1: Composed Chart for Delivery Volume Forecast */}
        {activeChartTab === 'volume' && (
          <div className="h-72 sm:h-80 w-full">
            <ResponsiveContainer width="100%" height="100%">
              <ComposedChart data={chartData} margin={{ top: 10, right: 15, left: -15, bottom: 5 }}>
                <defs>
                  <linearGradient id="surgeArea" x1="0" y1="0" x2="0" y2="1">
                    <stop offset="5%" stopColor="#00C46A" stopOpacity={0.25} />
                    <stop offset="95%" stopColor="#00C46A" stopOpacity={0.0} />
                  </linearGradient>
                </defs>
                <CartesianGrid strokeDasharray="3 3" stroke={isSunlight ? '#CBD5E1' : '#1A2E1C'} />
                <XAxis
                  dataKey="fullLabel"
                  stroke={isSunlight ? '#475569' : '#8899AA'}
                  fontSize={11}
                  tickLine={false}
                />
                <YAxis
                  yAxisId="left"
                  stroke={isSunlight ? '#475569' : '#8899AA'}
                  fontSize={11}
                  tickLine={false}
                  label={{ value: 'Stops', angle: -90, position: 'insideLeft', fill: '#8899AA', fontSize: 10 }}
                />
                <YAxis
                  yAxisId="right"
                  orientation="right"
                  stroke={isSunlight ? '#475569' : '#8899AA'}
                  fontSize={11}
                  tickLine={false}
                  label={{ value: 'Bottles', angle: 90, position: 'insideRight', fill: '#8899AA', fontSize: 10 }}
                />
                <Tooltip
                  contentStyle={{
                    backgroundColor: isSunlight ? '#FFFFFF' : '#0E1B11',
                    borderColor: '#2A5038',
                    borderRadius: '12px',
                    color: isSunlight ? '#0A1A0F' : '#FFFFFF',
                    fontSize: '12px',
                    boxShadow: '0 8px 24px rgba(0,0,0,0.5)',
                  }}
                  formatter={(val: any, name: any) => {
                    if (name === 'expectedStops') return [`${val} stops`, 'Expected Stops'];
                    if (name === 'upperStops') return [`${val} stops`, 'Surge Upper Buffer'];
                    if (name === 'bottles') return [`${val} units`, '18.9L Bottles'];
                    if (name === 'maxFleetCapacity') return [`${val} stops`, 'Current Fleet Limit'];
                    return [val, name];
                  }}
                />
                <Legend
                  verticalAlign="top"
                  height={36}
                  wrapperStyle={{ fontSize: '11px', color: '#8899AA' }}
                />
                {/* Confidence Range Area */}
                <Area
                  yAxisId="left"
                  type="monotone"
                  dataKey="upperStops"
                  fill="url(#surgeArea)"
                  stroke="#00C46A"
                  strokeDasharray="4 4"
                  name="Surge Upper Buffer"
                />
                {/* Projected Bottles Bar */}
                <Bar
                  yAxisId="right"
                  dataKey="bottles"
                  fill="#38BDF8"
                  opacity={0.35}
                  radius={[4, 4, 0, 0]}
                  name="Projected 18.9L Bottles"
                />
                {/* Expected Stops Line */}
                <Line
                  yAxisId="left"
                  type="monotone"
                  dataKey="expectedStops"
                  stroke="#00C46A"
                  strokeWidth={3}
                  dot={{ r: 4, fill: '#00C46A', strokeWidth: 2, stroke: '#FFFFFF' }}
                  activeDot={{ r: 6 }}
                  name="Expected Stops"
                />
                {/* Max Fleet Capacity Reference Line */}
                <ReferenceLine
                  yAxisId="left"
                  y={maxFleetDailyCapacity}
                  stroke="#F59E0B"
                  strokeDasharray="5 5"
                  strokeWidth={1.5}
                  label={{
                    value: `Active Fleet Limit (${maxFleetDailyCapacity} stops)`,
                    fill: '#F59E0B',
                    fontSize: 10,
                    position: 'top',
                  }}
                />
              </ComposedChart>
            </ResponsiveContainer>
          </div>
        )}

        {/* Tab 2: Staff Optimization Bar Chart */}
        {activeChartTab === 'staffing' && (
          <div className="h-72 sm:h-80 w-full">
            <ResponsiveContainer width="100%" height="100%">
              <BarChart data={chartData} margin={{ top: 10, right: 15, left: -15, bottom: 5 }}>
                <CartesianGrid strokeDasharray="3 3" stroke={isSunlight ? '#CBD5E1' : '#1A2E1C'} />
                <XAxis
                  dataKey="fullLabel"
                  stroke={isSunlight ? '#475569' : '#8899AA'}
                  fontSize={11}
                  tickLine={false}
                />
                <YAxis
                  stroke={isSunlight ? '#475569' : '#8899AA'}
                  fontSize={11}
                  tickLine={false}
                  domain={[0, Math.max(activeDriverPool + 2, 8)]}
                  label={{ value: 'Drivers', angle: -90, position: 'insideLeft', fill: '#8899AA', fontSize: 10 }}
                />
                <Tooltip
                  contentStyle={{
                    backgroundColor: isSunlight ? '#FFFFFF' : '#0E1B11',
                    borderColor: '#2A5038',
                    borderRadius: '12px',
                    color: isSunlight ? '#0A1A0F' : '#FFFFFF',
                    fontSize: '12px',
                  }}
                  formatter={(val: any, name: any) => [
                    `${val} staff`,
                    name === 'recommendedDrivers' ? 'Recommended Drivers' : 'Current Active Pool',
                  ]}
                />
                <Legend verticalAlign="top" height={36} wrapperStyle={{ fontSize: '11px' }} />
                <Bar
                  dataKey="activeDrivers"
                  fill="#475569"
                  radius={[4, 4, 0, 0]}
                  name="Current Available Drivers"
                />
                <Bar
                  dataKey="recommendedDrivers"
                  fill="#00C46A"
                  radius={[4, 4, 0, 0]}
                  name="Recommended Drivers On Duty"
                />
              </BarChart>
            </ResponsiveContainer>
          </div>
        )}

        {/* Tab 3: Seasonality Breakdown */}
        {activeChartTab === 'seasonality' && (
          <div className="h-72 sm:h-80 w-full">
            <ResponsiveContainer width="100%" height="100%">
              <BarChart data={seasonalityChartData} margin={{ top: 10, right: 15, left: -15, bottom: 5 }}>
                <CartesianGrid strokeDasharray="3 3" stroke={isSunlight ? '#CBD5E1' : '#1A2E1C'} />
                <XAxis dataKey="day" stroke={isSunlight ? '#475569' : '#8899AA'} fontSize={11} tickLine={false} />
                <YAxis
                  stroke={isSunlight ? '#475569' : '#8899AA'}
                  fontSize={11}
                  tickLine={false}
                  domain={[0, 160]}
                  label={{ value: 'Index %', angle: -90, position: 'insideLeft', fill: '#8899AA', fontSize: 10 }}
                />
                <Tooltip
                  contentStyle={{
                    backgroundColor: isSunlight ? '#FFFFFF' : '#0E1B11',
                    borderColor: '#2A5038',
                    borderRadius: '12px',
                    color: isSunlight ? '#0A1A0F' : '#FFFFFF',
                    fontSize: '12px',
                  }}
                  formatter={(val: any, name: any, item: any) => [
                    `${val}% baseline (Typical ${item?.payload?.typicalStops} stops)`,
                    'Demand Index',
                  ]}
                />
                <ReferenceLine y={100} stroke="#94A3B8" strokeDasharray="3 3" label="Baseline 100%" />
                <Bar dataKey="factor" fill="#8B5CF6" radius={[4, 4, 0, 0]} name="Day-of-Week Demand Index (%)" />
              </BarChart>
            </ResponsiveContainer>
          </div>
        )}
      </div>

      {/* Daily Staff Scheduling & Dispatch Roster Table */}
      <div className="bg-[#122010] rounded-2xl border border-[#2A5038] overflow-hidden shadow-md">
        <div className="p-4 sm:p-5 border-b border-[#243447] flex flex-col sm:flex-row sm:items-center justify-between gap-3 bg-[#0E1B11]">
          <div>
            <h3 className="text-sm font-bold text-white flex items-center gap-2">
              <CalendarDays className="w-4 h-4 text-[#00C46A]" />
              <span>Optimized Daily Shift & Vehicle Roster</span>
            </h3>
            <p className="text-xs text-[#8899AA] mt-0.5">
              Target workload: {targetStopsPerDriver} stops/driver/day &bull; Staggered morning/afternoon split
            </p>
          </div>

          <div className="flex items-center gap-2">
            <span className="text-xs text-[#8899AA]">
              {forecastSummary.understaffedDaysCount > 0 ? (
                <span className="text-amber-400 font-semibold flex items-center gap-1">
                  <AlertTriangle className="w-3.5 h-3.5" />
                  {forecastSummary.understaffedDaysCount} shift surge requires relief staff
                </span>
              ) : (
                <span className="text-[#00C46A] font-semibold flex items-center gap-1">
                  <CheckCircle2 className="w-3.5 h-3.5" />
                  Full shift coverage verified
                </span>
              )}
            </span>
          </div>
        </div>

        <div className="overflow-x-auto">
          <table className="w-full text-xs text-left">
            <thead>
              <tr className="border-b border-[#243447] bg-[#162719] text-[#8899AA]">
                <th className="py-3 px-3.5 font-semibold">Date & Day</th>
                <th className="py-3 px-3 font-semibold">Forecasted Stops</th>
                <th className="py-3 px-3 font-semibold">Bottles (18.9L)</th>
                <th className="py-3 px-3 font-semibold">Drivers Needed</th>
                <th className="py-3 px-3 font-semibold">Trucks</th>
                <th className="py-3 px-3 font-semibold">Shift Split</th>
                <th className="py-3 px-3 font-semibold">Utilization</th>
                <th className="py-3 px-3.5 font-semibold">Dispatch Directive</th>
              </tr>
            </thead>
            <tbody className="divide-y divide-[#243447]/60">
              {forecastSummary.forecastDays.map((day) => {
                const isUnderstaffed = day.recommendedDrivers > activeDriverPool;
                return (
                  <tr
                    key={day.date}
                    className={`hover:bg-[#1A2E1C]/70 transition-colors ${
                      isUnderstaffed ? 'bg-amber-950/20' : ''
                    }`}
                  >
                    {/* Date */}
                    <td className="py-3 px-3.5 whitespace-nowrap">
                      <div className="font-bold text-white">{day.fullDateLabel}</div>
                      <div className="text-[10px] text-[#8899AA] font-mono">{day.date}</div>
                    </td>

                    {/* Forecasted Stops */}
                    <td className="py-3 px-3 whitespace-nowrap">
                      <div className="font-bold text-white font-mono flex items-center gap-1.5">
                        <span className="text-base text-[#00C46A]">{day.expectedStops}</span>
                        <span className="text-[10px] text-[#8899AA]">({day.lowerStops}-{day.upperStops})</span>
                      </div>
                    </td>

                    {/* Bottles */}
                    <td className="py-3 px-3 whitespace-nowrap font-mono text-[#8899AA]">
                      <strong className="text-white">{day.expectedBottles}</strong> units
                    </td>

                    {/* Drivers Needed */}
                    <td className="py-3 px-3 whitespace-nowrap">
                      <div className="flex items-center gap-1.5">
                        <span
                          className={`px-2 py-0.5 rounded-full font-bold font-mono text-xs ${
                            isUnderstaffed
                              ? 'bg-amber-500/20 text-amber-400 border border-amber-500/40'
                              : 'bg-[#006B3C]/30 text-[#00C46A] border border-[#00C46A]/30'
                          }`}
                        >
                          {day.recommendedDrivers} Drivers
                        </span>
                        {isUnderstaffed && (
                          <span className="text-[10px] text-amber-400 font-bold" title="Surge exceeds available pool">
                            +1
                          </span>
                        )}
                      </div>
                    </td>

                    {/* Trucks */}
                    <td className="py-3 px-3 whitespace-nowrap font-mono text-white">
                      {day.recommendedTrucks} Vehicles
                    </td>

                    {/* Shift Split */}
                    <td className="py-3 px-3 whitespace-nowrap">
                      <div className="text-[11px] text-white">
                        <span>A: {day.morningShiftStops} stops</span>
                        <span className="text-[#8899AA] mx-1">&bull;</span>
                        <span className="text-[#8899AA]">B: {day.afternoonShiftStops}</span>
                      </div>
                      <div className="text-[9px] text-[#8899AA]">07:00 vs 13:00 dispatch</div>
                    </td>

                    {/* Utilization */}
                    <td className="py-3 px-3 whitespace-nowrap">
                      <div className="flex items-center gap-2">
                        <div className="w-14 bg-[#1A2E1C] h-1.5 rounded-full overflow-hidden">
                          <div
                            className={`h-full rounded-full ${
                              day.utilizationPct > 100
                                ? 'bg-amber-500'
                                : day.utilizationPct > 80
                                ? 'bg-[#00C46A]'
                                : 'bg-blue-400'
                            }`}
                            style={{ width: `${Math.min(100, day.utilizationPct)}%` }}
                          />
                        </div>
                        <span className="font-mono text-xs font-semibold text-white">
                          {day.utilizationPct}%
                        </span>
                      </div>
                    </td>

                    {/* Notes / Directive */}
                    <td className="py-3 px-3.5 text-xs text-[#8899AA] max-w-xs">
                      <span className={isUnderstaffed ? 'text-amber-300 font-medium' : ''}>
                        {day.notes}
                      </span>
                    </td>
                  </tr>
                );
              })}
            </tbody>
          </table>
        </div>
      </div>

      {/* AI Workforce & Logistics Optimization Advisory */}
      <div className="bg-[#122010] p-5 rounded-2xl border border-[#2A5038] relative overflow-hidden">
        <div className="flex flex-col sm:flex-row sm:items-center justify-between gap-3 border-b border-[#243447] pb-3 mb-4">
          <div className="flex items-center gap-2.5">
            <div className="p-2 rounded-xl bg-purple-500/20 text-purple-400 border border-purple-500/30">
              <Sparkles className="w-5 h-5" />
            </div>
            <div>
              <h3 className="text-sm sm:text-base font-bold text-white flex items-center gap-2">
                <span>AI Logistics & Shift Rostering Advisory</span>
                {aiAdvice?.source === 'gemini-3.8-flash' && (
                  <span className="text-[10px] font-bold bg-purple-900/60 text-purple-300 px-2 py-0.5 rounded-full border border-purple-500/40">
                    Gemini 3.8 Flash
                  </span>
                )}
              </h3>
              <p className="text-xs text-[#8899AA] mt-0.5">
                Strategic scheduling recommendations to prevent driver burnout and optimize vehicle turnover.
              </p>
            </div>
          </div>

          <button
            type="button"
            onClick={handleFetchAiSchedulingAnalysis}
            disabled={isAiLoading}
            className="flex items-center gap-1.5 bg-[#1A2E1C] hover:bg-[#253D28] text-white border border-[#3A5068] hover:border-[#00C46A] px-3 py-1.5 rounded-xl text-xs font-semibold transition-all disabled:opacity-50"
          >
            <RefreshCw className={`w-3.5 h-3.5 text-[#00C46A] ${isAiLoading ? 'animate-spin' : ''}`} />
            <span>{isAiLoading ? 'Analyzing Roster...' : 'Re-run AI Analysis'}</span>
          </button>
        </div>

        {aiAdvice && (
          <div className="space-y-4 text-xs">
            {/* Executive Summary */}
            <div className="bg-[#0E1B11] p-3.5 rounded-xl border border-[#2A5038] text-slate-200 leading-relaxed">
              {aiAdvice.summary}
            </div>

            {/* 3 Pillars Grid */}
            <div className="grid grid-cols-1 md:grid-cols-3 gap-3.5">
              {/* Shift Staggering */}
              <div className="bg-[#1A2E1C] p-3.5 rounded-xl border border-[#3A5068]/50">
                <div className="flex items-center gap-2 font-bold text-white mb-1.5">
                  <Clock className="w-4 h-4 text-blue-400" />
                  <span>Shift Staggering Strategy</span>
                </div>
                <p className="text-[#8899AA] leading-normal">{aiAdvice.shiftStaggeringPlan}</p>
              </div>

              {/* Fleet Deployment */}
              <div className="bg-[#1A2E1C] p-3.5 rounded-xl border border-[#3A5068]/50">
                <div className="flex items-center gap-2 font-bold text-white mb-1.5">
                  <Truck className="w-4 h-4 text-[#00C46A]" />
                  <span>Fleet & Vehicle Allocation</span>
                </div>
                <p className="text-[#8899AA] leading-normal">{aiAdvice.fleetDeploymentAdvice}</p>
              </div>

              {/* Risk Mitigation */}
              <div className="bg-[#1A2E1C] p-3.5 rounded-xl border border-[#3A5068]/50">
                <div className="flex items-center gap-2 font-bold text-white mb-1.5">
                  <ShieldAlert className="w-4 h-4 text-amber-400" />
                  <span>Surge & Risk Buffering</span>
                </div>
                <p className="text-[#8899AA] leading-normal">{aiAdvice.riskMitigation}</p>
              </div>
            </div>

            {/* Key Action Items Checklist */}
            {aiAdvice.keyActionItems?.length > 0 && (
              <div className="bg-[#162719] p-3.5 rounded-xl border border-[#2A5038]">
                <span className="text-[11px] font-bold text-white uppercase tracking-wider block mb-2">
                  Manager Dispatch Checklist
                </span>
                <div className="grid grid-cols-1 sm:grid-cols-2 gap-2">
                  {aiAdvice.keyActionItems.map((item, idx) => (
                    <div key={idx} className="flex items-start gap-2 text-slate-300">
                      <CheckCircle2 className="w-3.5 h-3.5 text-[#00C46A] shrink-0 mt-0.5" />
                      <span>{item}</span>
                    </div>
                  ))}
                </div>
              </div>
            )}
          </div>
        )}
      </div>
    </div>
  );
};
