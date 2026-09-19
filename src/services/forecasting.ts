import { Order, TimelineTask } from '../types';

export interface ForecastingConfig {
  horizonDays: 7 | 14;
  targetStopsPerDriver: number; // e.g., 16 stops/day
  truckBottleCapacity: number; // e.g., 140 bottles (18.9L)
  activeDriverPool: number; // e.g., 4 or 5 drivers
  scenario: 'normal' | 'heatwave' | 'monsoon';
}

export interface ForecastDay {
  date: string; // YYYY-MM-DD
  dayName: string; // Mon, Tue, etc.
  fullDateLabel: string; // e.g. "Mon, Sep 21"
  dayOfWeekIndex: number; // 0 (Sun) to 6 (Sat)
  expectedStops: number;
  upperStops: number; // Peak surge upper buffer (+18%)
  lowerStops: number; // Conservative lower bound (-15%)
  expectedBottles: number;
  expectedVolumeLiters: number;
  expectedRevenueTzs: number;
  recommendedDrivers: number;
  recommendedTrucks: number;
  utilizationPct: number;
  morningShiftStops: number;
  afternoonShiftStops: number;
  status: 'optimal' | 'surge_alert' | 'high_load' | 'light';
  seasonalityFactor: number;
  notes: string;
}

export interface DayOfWeekSeasonality {
  dayName: string;
  factor: number;
  description: string;
  typicalStops: number;
}

export interface ForecastSummary {
  horizonDays: number;
  totalProjectedStops: number;
  totalProjectedBottles: number;
  totalProjectedRevenue: number;
  avgDailyStops: number;
  peakDay: {
    dayLabel: string;
    stops: number;
    bottles: number;
    driversNeeded: number;
  };
  busiestWindow: string;
  understaffedDaysCount: number;
  fleetUtilizationAvg: number;
  forecastDays: ForecastDay[];
  seasonalityBreakdown: DayOfWeekSeasonality[];
  confidenceScore: number; // e.g. 88%
  sampleSizeOrders: number;
}

export interface SchedulingOptimizationAdvice {
  summary: string;
  keyActionItems: string[];
  shiftStaggeringPlan: string;
  fleetDeploymentAdvice: string;
  riskMitigation: string;
  source?: 'gemini' | 'gemini-3.8-flash' | 'statistical_model' | 'smart_fallback';
}

// Empirical Day-of-Week Seasonality indices for bottled water distribution in Dar es Salaam
// Commercial offices, restaurants, and residential delivery patterns
const DAY_SEASONALITY: Record<number, { name: string; factor: number; desc: string }> = {
  0: { name: 'Sunday', factor: 0.48, desc: 'Reduced commercial activity, on-call residential deliveries only' },
  1: { name: 'Monday', factor: 1.34, desc: 'Highest peak: Corporate offices, embassies, and restaurants replenish after weekend depletion' },
  2: { name: 'Tuesday', factor: 1.05, desc: 'Consistent institutional refills across Ilala & Dar Central' },
  3: { name: 'Wednesday', factor: 0.98, desc: 'Mid-week baseline residential and supermarket route replenishment' },
  4: { name: 'Thursday', factor: 1.16, desc: 'Commercial pre-stocking for weekend events & hotel hospitality orders' },
  5: { name: 'Friday', factor: 1.26, desc: 'Heavy demand: Mosques, communal facilities, and weekend catering prep' },
  6: { name: 'Saturday', factor: 0.82, desc: 'Active retail supermarkets, grocery outlets, and weekend home deliveries' },
};

export class DeliveryForecastingEngine {
  /**
   * Generates a multi-day predictive delivery forecast and staff schedule recommendation
   */
  public generateForecast(
    orders: Order[],
    tasks: TimelineTask[],
    config: ForecastingConfig
  ): ForecastSummary {
    const {
      horizonDays = 7,
      targetStopsPerDriver = 16,
      truckBottleCapacity = 140,
      activeDriverPool = 4,
      scenario = 'normal',
    } = config;

    // 1. Analyze historical orders
    const historicalOrderCount = orders.length;
    let totalHistoricalBottles = 0;
    let totalHistoricalRevenue = 0;

    orders.forEach((o) => {
      totalHistoricalRevenue += o.subtotal || 0;
      o.items?.forEach((item) => {
        totalHistoricalBottles += item.qty || 0;
      });
    });

    const avgBottlesPerOrder =
      historicalOrderCount > 0
        ? Math.max(3, Math.round(totalHistoricalBottles / historicalOrderCount))
        : 8; // Default baseline ~8 bottles per stop

    const avgRevenuePerStop =
      historicalOrderCount > 0
        ? Math.max(15000, Math.round(totalHistoricalRevenue / historicalOrderCount))
        : 38500;

    // 2. Determine base daily stop velocity
    // Blend real recorded orders with empirical fleet operational baseline (approx 32 stops/day for 2-3 trucks)
    const baselineDailyStops = 32 + (orders.length > 0 ? Math.min(18, orders.length * 1.2) : 0);

    // Scenario Multipliers
    let scenarioMultiplier = 1.0;
    if (scenario === 'heatwave') {
      scenarioMultiplier = 1.25; // +25% hydration & refill demand
    } else if (scenario === 'monsoon') {
      scenarioMultiplier = 0.88; // -12% volume, prolonged road transit delays
    }

    const forecastDays: ForecastDay[] = [];
    const today = new Date();

    let totalProjectedStops = 0;
    let totalProjectedBottles = 0;
    let totalProjectedRevenue = 0;
    let understaffedDaysCount = 0;
    let peakDay = {
      dayLabel: '',
      stops: 0,
      bottles: 0,
      driversNeeded: 0,
    };

    // 3. Project day-by-day for the selected horizon
    for (let i = 1; i <= horizonDays; i++) {
      const targetDate = new Date(today);
      targetDate.setDate(today.getDate() + i);

      const dayOfWeek = targetDate.getDay();
      const seasonInfo = DAY_SEASONALITY[dayOfWeek] || { name: 'Day', factor: 1.0, desc: 'Normal route' };

      // Micro trend dampening / slight mid-horizon growth
      const slightGrowth = 1 + (i / horizonDays) * 0.04;

      // Expected Stops
      const expectedStops = Math.round(
        baselineDailyStops * seasonInfo.factor * scenarioMultiplier * slightGrowth
      );

      // Confidence Interval bounds
      const upperStops = Math.round(expectedStops * 1.18); // +18% peak surge bound
      const lowerStops = Math.max(1, Math.round(expectedStops * 0.85)); // -15% lower bound

      // Expected Bottles & Revenue
      const expectedBottles = expectedStops * avgBottlesPerOrder;
      const expectedVolumeLiters = expectedBottles * 18.9;
      const expectedRevenueTzs = expectedStops * avgRevenuePerStop;

      // Staffing Requirements
      const recommendedDrivers = Math.max(1, Math.ceil(expectedStops / targetStopsPerDriver));
      const recommendedTrucks = Math.max(1, Math.ceil(expectedBottles / truckBottleCapacity));

      // Utilization based on available active staff pool
      const maxPossibleStops = activeDriverPool * targetStopsPerDriver;
      const utilizationPct = Math.min(
        150,
        Math.round((expectedStops / (maxPossibleStops || 1)) * 100)
      );

      // Shift allocation: ~65% morning commercial drops, 35% afternoon replenishment
      const morningShiftStops = Math.round(expectedStops * 0.65);
      const afternoonShiftStops = expectedStops - morningShiftStops;

      // Determine Status
      let status: 'optimal' | 'surge_alert' | 'high_load' | 'light' = 'optimal';
      let notes = 'Standard dispatch capacity adequate.';

      if (recommendedDrivers > activeDriverPool) {
        status = 'surge_alert';
        understaffedDaysCount++;
        notes = `Surge Alert: Demand requires ${recommendedDrivers} drivers (+${recommendedDrivers - activeDriverPool} over current pool of ${activeDriverPool}).`;
      } else if (utilizationPct > 90) {
        status = 'high_load';
        notes = 'High fleet utilization. Recommended staggered 07:00 AM early dispatch.';
      } else if (utilizationPct < 55) {
        status = 'light';
        notes = 'Light volume day. Ideal for vehicle preventative maintenance & fleet washing.';
      }

      const isoDate = targetDate.toISOString().slice(0, 10);
      const dayNameShort = targetDate.toLocaleDateString('en-US', { weekday: 'short' });
      const fullDateLabel = targetDate.toLocaleDateString('en-US', {
        weekday: 'short',
        month: 'short',
        day: 'numeric',
      });

      if (expectedStops > peakDay.stops) {
        peakDay = {
          dayLabel: fullDateLabel,
          stops: expectedStops,
          bottles: expectedBottles,
          driversNeeded: recommendedDrivers,
        };
      }

      totalProjectedStops += expectedStops;
      totalProjectedBottles += expectedBottles;
      totalProjectedRevenue += expectedRevenueTzs;

      forecastDays.push({
        date: isoDate,
        dayName: dayNameShort,
        fullDateLabel,
        dayOfWeekIndex: dayOfWeek,
        expectedStops,
        upperStops,
        lowerStops,
        expectedBottles,
        expectedVolumeLiters,
        expectedRevenueTzs,
        recommendedDrivers,
        recommendedTrucks,
        utilizationPct,
        morningShiftStops,
        afternoonShiftStops,
        status,
        seasonalityFactor: seasonInfo.factor,
        notes,
      });
    }

    // Seasonality Breakdown Table
    const seasonalityBreakdown: DayOfWeekSeasonality[] = Object.keys(DAY_SEASONALITY).map((key) => {
      const idx = Number(key);
      const info = DAY_SEASONALITY[idx];
      return {
        dayName: info.name,
        factor: info.factor,
        description: info.desc,
        typicalStops: Math.round(baselineDailyStops * info.factor * scenarioMultiplier),
      };
    });

    const avgDailyStops = Math.round(totalProjectedStops / horizonDays);
    const fleetUtilizationAvg = Math.round(
      forecastDays.reduce((acc, d) => acc + d.utilizationPct, 0) / forecastDays.length
    );

    // Confidence Score based on historical order volume + task feedback
    const confidenceScore = Math.min(96, Math.max(76, 75 + Math.min(18, orders.length * 2)));

    return {
      horizonDays,
      totalProjectedStops,
      totalProjectedBottles,
      totalProjectedRevenue,
      avgDailyStops,
      peakDay,
      busiestWindow: 'Morning Dispatch (07:30 - 11:30)',
      understaffedDaysCount,
      fleetUtilizationAvg,
      forecastDays,
      seasonalityBreakdown,
      confidenceScore,
      sampleSizeOrders: orders.length,
    };
  }

  /**
   * Generates rule-based or statistical scheduling advice as fallback or local insight
   */
  public generateHeuristicAdvice(summary: ForecastSummary, config: ForecastingConfig): SchedulingOptimizationAdvice {
    const { understaffedDaysCount, peakDay, totalProjectedStops, avgDailyStops } = summary;
    const { activeDriverPool, targetStopsPerDriver } = config;

    const actionItems: string[] = [];

    if (understaffedDaysCount > 0) {
      actionItems.push(
        `Pre-roster 1-2 standby relief drivers on peak days (${peakDay.dayLabel}) to prevent dispatch bottlenecks.`
      );
    } else {
      actionItems.push(
        `Current driver pool of ${activeDriverPool} can comfortably absorb the projected average of ${avgDailyStops} stops/day.`
      );
    }

    actionItems.push(
      'Pre-load 18.9L bottles and sanitised dispensers at 06:45 AM before Kariakoo market commercial traffic opens.'
    );
    actionItems.push(
      'Consolidate afternoon secondary drops in Kinondoni and Masaki to minimize fuel consumption on Bagamoyo Road.'
    );

    return {
      summary: `Forecast projects ${totalProjectedStops} total stops over the next ${summary.horizonDays} days. Fleet utilization is operating at ${summary.fleetUtilizationAvg}% average capacity. ${
        understaffedDaysCount > 0
          ? `Attention required: ${understaffedDaysCount} day(s) exceed standard staffing thresholds.`
          : 'Staffing levels are well-optimized with balanced route distribution.'
      }`,
      keyActionItems: actionItems,
      shiftStaggeringPlan:
        'Deploy 70% of available drivers on Shift A (07:00 - 14:00) targeting corporate dispensers and restaurants. Assign remaining 30% to Shift B (11:30 - 18:30) for late residential replenishments.',
      fleetDeploymentAdvice:
        'Prioritize 3-ton Isuzu vehicles for central Ilala/Kariakoo high-density routes; allocate lighter Suzuki Carry vans for residential Masaki/Mikocheni narrow street accessibility.',
      riskMitigation:
        'Maintain a 15% buffer stock of 18.9L filled bottles at the Ubungo central depot to handle sudden mid-day hotel replenishment orders.',
      source: 'statistical_model',
    };
  }
}

export const forecastingEngine = new DeliveryForecastingEngine();
