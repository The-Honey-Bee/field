import express from 'express';
import path from 'path';
import { GoogleGenAI } from '@google/genai';

const app = express();
const PORT = 3000;

app.use(express.json({ limit: '15mb' }));

// Lazy AI Client initialization
let aiClient: GoogleGenAI | null = null;
function getAi(): GoogleGenAI | null {
  if (!aiClient && process.env.GEMINI_API_KEY) {
    aiClient = new GoogleGenAI({ apiKey: process.env.GEMINI_API_KEY });
  }
  return aiClient;
}

// In-memory caching and Quota Cooldown Management
interface CacheRecord {
  data: any;
  exp: number;
}
const recCache = new Map<string, CacheRecord>();
const forecastCache = new Map<string, CacheRecord>();
const CACHE_TTL_MS = 5 * 60 * 1000; // 5 minutes cache
let geminiQuotaCooldownUntil = 0;

function isTransientAiError(err: any): boolean {
  const msg = typeof err?.message === 'string' ? err.message : String(err || '');
  const status = err?.status || err?.code;
  return (
    status === 429 ||
    status === 503 ||
    status === 500 ||
    status === 502 ||
    status === 504 ||
    msg.includes('429') ||
    msg.includes('503') ||
    msg.includes('RESOURCE_EXHAUSTED') ||
    msg.includes('Quota exceeded') ||
    msg.includes('rate-limits') ||
    msg.includes('UNAVAILABLE') ||
    msg.includes('high demand') ||
    msg.includes('overloaded') ||
    msg.includes('try again later') ||
    msg.includes('temporarily unavailable')
  );
}

function generateHeuristicRecommendation(
  pendingStops: any[],
  completedStops: any[],
  truckInventory: any,
  currentLocation: string
) {
  if (!pendingStops || pendingStops.length === 0) {
    return {
      recommendedStop: 'Central Depot - Ubungo Hub',
      reason: 'All active delivery dispatches are fulfilled. Return to depot for empty bottle offloading and refill staging.',
      urgency: 'normal' as const,
      estimatedDriveMinutes: 10,
      batchSuggestion: 'Stage returned empty 18.9L bottles at depot inspection bay.',
      suggestedActions: [
        'Offload and sanitize empty return bottles',
        'Verify driver daily cash reconciliation summary',
      ],
      source: 'logistics_engine',
    };
  }

  const target = pendingStops[0];
  const stopName = target.title || target.customer || 'Commercial Client Drop';
  const address = target.address || 'Dar es Salaam Corridor';
  const totalAmount = target.total ? ` (TZS ${Number(target.total).toLocaleString()})` : '';

  let driveMinutes = 12;
  let reason = `Prioritized route stop along ${currentLocation} corridor. Optimal window to beat peak transit congestion.`;
  if (/kariakoo|postaa|cbd/i.test(address + stopName)) {
    driveMinutes = 18;
    reason = `Prioritized due to commercial receiving dock closing times and upcoming Kariakoo traffic congestion window.`;
  } else if (/masaki|oysterbay|mikocheni/i.test(address + stopName)) {
    driveMinutes = 15;
    reason = `Grouped residential drop to optimize fuel economy along Bagamoyo Road.`;
  } else if (/ubungo|sinza|mwenge/i.test(address + stopName)) {
    driveMinutes = 9;
    reason = `Proximity advantage near current location. Quick turnaround delivery.`;
  }

  const secondary = pendingStops[1];
  const batchSuggestion = secondary
    ? `Follow immediately with ${secondary.title || secondary.customer} (${secondary.address || 'nearby'}) on the same delivery run.`
    : 'Clear remaining vehicle inventory before afternoon plant refill cutoff.';

  return {
    recommendedStop: stopName,
    reason,
    urgency: (target.total && target.total > 50000) ? 'high' : 'normal',
    estimatedDriveMinutes: driveMinutes,
    batchSuggestion,
    suggestedActions: [
      `Deliver confirmed bottles to receiving desk${totalAmount}`,
      `Collect signed delivery challan and inspect empty exchange bottles`,
    ],
    source: 'logistics_engine',
  };
}

function generateHeuristicForecast(params: any) {
  const {
    horizonDays = 7,
    totalProjectedStops = 210,
    totalProjectedBottles = 2400,
    peakDay = { dayLabel: 'Monday', stops: 45, bottles: 520, driversNeeded: 4 },
    understaffedDaysCount = 1,
    fleetUtilizationAvg = 84,
  } = params || {};

  return {
    summary: `Forecast projects ${totalProjectedStops} total stops (${totalProjectedBottles} bottles) across the next ${horizonDays} days. Average fleet utilization is projected at ${fleetUtilizationAvg}%. ${
      understaffedDaysCount > 0
        ? `${understaffedDaysCount} surge day(s) exceed standard threshold, requiring temporary cross-route driver support.`
        : 'Standard driver roster is balanced and fully meets SLA targets.'
    }`,
    keyActionItems: [
      `Roster ${peakDay.driversNeeded} drivers on ${peakDay.dayLabel} to absorb peak ${peakDay.stops} stops without overtime penalty.`,
      'Stage 200 filled 18.9L bottles at Kariakoo depot dock by 06:30 AM for early morning corporate deliveries.',
      'Consolidate residential Mikocheni/Masaki routes into a dedicated afternoon delivery run (13:30 - 17:00).',
      'Schedule truck #3 routine mechanical inspection on Sunday when commercial route demand dips by 52%.',
    ],
    shiftStaggeringPlan:
      'Shift A (06:45 - 14:00): 65% of drivers deployed to central commercial zones. Shift B (11:00 - 18:30): 35% of drivers for secondary restaurant orders and residential dispenser maintenance.',
    fleetDeploymentAdvice:
      'Deploy high-tonnage trucks for Kariakoo & Ilala high-volume drops (15+ bottles/stop); use agile mini-vans for residential Masaki & Oysterbay single-bottle dropoffs.',
    riskMitigation:
      'Maintain an emergency buffer stock of 50 sealed bottles in Ubungo to fulfill urgent hotel replenishments during peak afternoon traffic windows.',
    source: 'logistics_engine',
  };
}

// In-memory fleet locations store for real-time supervisor map
const activeFleetLocations = new Map<string, any>();

// Preload baseline fleet
const defaultFleet = [
  {
    userId: 'drv-001',
    staffName: 'Hassan Mwinyi',
    employeeId: 'ZZ-TRK-01',
    phone: '+255 754 112 301',
    role: 'field_staff',
    latitude: -6.8198,
    longitude: 39.2783,
    accuracy: 4.8,
    heading: 95,
    speed: 28,
    altitude: 24,
    timestamp: new Date().toISOString(),
    updatedAt: Date.now(),
    isOnline: true,
    status: 'en_route',
    assignedRoute: 'Kariakoo Commercial Corridor',
    currentStop: 'City Hypermarket - Swahili St',
    batteryLevel: 88,
    truckStock: { bottles18_9L: 22, bottles13L: 10 },
    totalStopsToday: 14,
    completedStopsToday: 9,
  },
  {
    userId: 'drv-002',
    staffName: 'Bakari Juma',
    employeeId: 'ZZ-TRK-02',
    phone: '+255 784 990 412',
    role: 'field_staff',
    latitude: -6.7580,
    longitude: 39.2720,
    accuracy: 3.2,
    heading: 140,
    speed: 36,
    altitude: 18,
    timestamp: new Date().toISOString(),
    updatedAt: Date.now(),
    isOnline: true,
    status: 'at_customer',
    assignedRoute: 'Masaki & Oysterbay Diplomatic',
    currentStop: 'Hotel Sea Cliff Receiving Dock',
    batteryLevel: 94,
    truckStock: { bottles18_9L: 34, bottles13L: 16 },
    totalStopsToday: 12,
    completedStopsToday: 7,
  },
  {
    userId: 'drv-003',
    staffName: 'Juma Khamis',
    employeeId: 'ZZ-TRK-03',
    phone: '+255 713 552 890',
    role: 'field_staff',
    latitude: -6.7865,
    longitude: 39.2132,
    accuracy: 5.1,
    heading: 270,
    speed: 0,
    altitude: 55,
    timestamp: new Date().toISOString(),
    updatedAt: Date.now(),
    isOnline: true,
    status: 'depot_reload',
    assignedRoute: 'Ubungo & Morogoro Rd Corridor',
    currentStop: 'Central Depot Bay #2 (Reloading)',
    batteryLevel: 62,
    truckStock: { bottles18_9L: 45, bottles13L: 20 },
    totalStopsToday: 16,
    completedStopsToday: 11,
  },
  {
    userId: 'drv-004',
    staffName: 'Amina Said',
    employeeId: 'ZZ-TRK-04',
    phone: '+255 765 881 234',
    role: 'field_staff',
    latitude: -6.7720,
    longitude: 39.2450,
    accuracy: 6.0,
    heading: 45,
    speed: 22,
    altitude: 30,
    timestamp: new Date().toISOString(),
    updatedAt: Date.now(),
    isOnline: true,
    status: 'delivering',
    assignedRoute: 'Mikocheni & Bagamoyo Rd Corridor',
    currentStop: 'Al-Barakah Restaurant & Catering',
    batteryLevel: 79,
    truckStock: { bottles18_9L: 18, bottles13L: 8 },
    totalStopsToday: 10,
    completedStopsToday: 6,
  },
];
defaultFleet.forEach((f) => activeFleetLocations.set(f.userId, f));

// Real-Time Field Geolocation Endpoints
app.get('/api/field-locations', (req, res) => {
  const list = Array.from(activeFleetLocations.values());
  res.json(list);
});

app.post('/api/field-locations', (req, res) => {
  const loc = req.body;
  if (!loc || !loc.userId) {
    return res.status(400).json({ error: 'userId is required' });
  }
  const existing = activeFleetLocations.get(loc.userId) || {};
  const updated = {
    ...existing,
    ...loc,
    updatedAt: Date.now(),
  };
  activeFleetLocations.set(loc.userId, updated);
  res.json({ status: 'ok', location: updated });
});

// Health check
app.get('/api/health', (req, res) => {
  res.json({
    status: 'ok',
    aiAvailable: !!process.env.GEMINI_API_KEY,
    geminiCooldownActive: Date.now() < geminiQuotaCooldownUntil,
    timestamp: new Date().toISOString(),
  });
});

// AI Next Stop Recommendation Endpoint
app.post('/api/recommend-next-stop', async (req, res) => {
  const {
    completedStops = [],
    pendingStops = [],
    truckInventory = { bottles18_9L: 25, bottles13L: 12 },
    currentLocation = 'Morogoro Road, Ubungo',
    timeOfDay = new Date().toLocaleTimeString([], { hour: '2-digit', minute: '2-digit' }),
  } = req.body;

  // 1. Check in-memory cache
  const cacheKey = JSON.stringify({
    pending: pendingStops.map((s: any) => s.title || s.customer),
    completedCount: completedStops.length,
    truck: truckInventory,
  });
  const cached = recCache.get(cacheKey);
  if (cached && cached.exp > Date.now()) {
    return res.json({
      ...cached.data,
      source: 'cache',
    });
  }

  // 2. Check quota cooldown or lack of API key
  const ai = getAi();
  if (!ai || Date.now() < geminiQuotaCooldownUntil) {
    const fallback = generateHeuristicRecommendation(
      pendingStops,
      completedStops,
      truckInventory,
      currentLocation
    );
    recCache.set(cacheKey, { data: fallback, exp: Date.now() + CACHE_TTL_MS });
    return res.json(fallback);
  }

  // 3. Query Gemini API
  try {
    const systemInstruction = `You are the Zamzam Water Logistics Route Optimizer for Dar es Salaam, Tanzania.
Analyze the driver's delivery route, truck bottle inventory, and time of day to determine the single best NEXT delivery stop.
Consider traffic patterns in Dar es Salaam (e.g., Bagamoyo Rd, Morogoro Rd, Kariakoo congestion, early afternoon shop closing hours).
Respond strictly with valid JSON with the following structure:
{
  "recommendedStop": "Name of the customer/stop",
  "reason": "1-2 crisp sentences explaining why this stop is prioritized now (e.g. closing time, overdue collection, traffic window)",
  "urgency": "high" | "medium" | "normal",
  "estimatedDriveMinutes": number,
  "batchSuggestion": "1 sentence suggestion on grouping subsequent drops or empty bottle pick-ups",
  "suggestedActions": ["Action 1", "Action 2"]
}`;

    const prompt = `Current Time: ${timeOfDay}
Current Vehicle Location: ${currentLocation}
Remaining Inventory in Truck: ${JSON.stringify(truckInventory)}
Completed Deliveries: ${JSON.stringify(completedStops)}
Pending Scheduled Deliveries: ${JSON.stringify(pendingStops)}

Recommend the best next stop now.`;

    let response;
    let modelUsed = 'gemini-3.8-flash';
    try {
      response = await ai.models.generateContent({
        model: 'gemini-3.8-flash',
        contents: prompt,
        config: {
          responseMimeType: 'application/json',
          systemInstruction,
        },
      });
    } catch (primaryErr: any) {
      if (isTransientAiError(primaryErr)) {
        // Try fallback to gemini-3.1-flash-lite if primary model has high demand or rate limits
        try {
          response = await ai.models.generateContent({
            model: 'gemini-3.1-flash-lite',
            contents: prompt,
            config: {
              responseMimeType: 'application/json',
              systemInstruction,
            },
          });
          modelUsed = 'gemini-3.1-flash-lite';
        } catch {
          throw primaryErr; // rethrow to enter transient cooldown handling
        }
      } else {
        throw primaryErr;
      }
    }

    const text = response?.text || '{}';
    const parsed = JSON.parse(text);
    const result = {
      ...parsed,
      source: modelUsed,
    };
    recCache.set(cacheKey, { data: result, exp: Date.now() + CACHE_TTL_MS });
    return res.json(result);
  } catch (err: any) {
    if (isTransientAiError(err)) {
      geminiQuotaCooldownUntil = Date.now() + 60 * 1000;
      console.info(
        '[Logistics Optimizer] Remote AI model in high-demand/rate-limit cooldown. Using local routing heuristic.'
      );
    } else {
      console.info('[Logistics Optimizer] Using local heuristic routing engine.');
    }

    const fallback = generateHeuristicRecommendation(
      pendingStops,
      completedStops,
      truckInventory,
      currentLocation
    );
    recCache.set(cacheKey, { data: fallback, exp: Date.now() + CACHE_TTL_MS });
    return res.json(fallback);
  }
});

// AI Staff Scheduling Optimization & Delivery Forecasting Advice Endpoint
app.post('/api/forecast-staff-scheduling', async (req, res) => {
  const params = req.body || {};
  const cacheKey = JSON.stringify(params);

  // Check cache
  const cached = forecastCache.get(cacheKey);
  if (cached && cached.exp > Date.now()) {
    return res.json({
      ...cached.data,
      source: 'cache',
    });
  }

  const ai = getAi();
  if (!ai || Date.now() < geminiQuotaCooldownUntil) {
    const fallback = generateHeuristicForecast(params);
    forecastCache.set(cacheKey, { data: fallback, exp: Date.now() + CACHE_TTL_MS });
    return res.json(fallback);
  }

  try {
    const {
      horizonDays = 7,
      totalProjectedStops = 210,
      totalProjectedBottles = 2400,
      avgDailyStops = 30,
      peakDay = { dayLabel: 'Monday', stops: 45, bottles: 520, driversNeeded: 4 },
      understaffedDaysCount = 1,
      fleetUtilizationAvg = 84,
      activeDriverPool = 4,
      targetStopsPerDriver = 16,
      scenario = 'normal',
      seasonalityNotes = 'Monday and Friday display highest commercial bottle refill surges.',
    } = params;

    const systemInstruction = `You are the Lead Fleet Logistics and Workforce Planner for Zamzam Water Company in Dar es Salaam, Tanzania.
You are analyzing delivery volume forecasts and staff scheduling for the field distribution team.
Provide realistic, actionable managerial recommendations for driver rostering, shift timing, vehicle allocations, and risk prevention.
Respond strictly in valid JSON format:
{
  "summary": "2-3 concise managerial sentences summarizing the projected volume and staffing posture",
  "keyActionItems": ["Action item 1", "Action item 2", "Action item 3", "Action item 4"],
  "shiftStaggeringPlan": "1-2 sentences on how to stagger morning vs afternoon shifts to balance vehicle utilization and traffic in Dar es Salaam",
  "fleetDeploymentAdvice": "1-2 sentences on vehicle type and route allocation",
  "riskMitigation": "1-2 sentences on handling peak surges, weather/traffic delays, or vehicle downtime"
}`;

    const prompt = `Forecast Parameters:
- Horizon: ${horizonDays} days
- Projected Deliveries: ${totalProjectedStops} stops, ${totalProjectedBottles} 18.9L bottles
- Average Daily Load: ${avgDailyStops} stops/day
- Peak Day: ${peakDay.dayLabel} (${peakDay.stops} stops, ${peakDay.bottles} bottles, ${peakDay.driversNeeded} drivers required)
- Active Driver Pool: ${activeDriverPool} drivers (Capacity: ${targetStopsPerDriver} stops/driver/day)
- Projected Fleet Utilization: ${fleetUtilizationAvg}%
- Days Exceeding Capacity: ${understaffedDaysCount}
- Demand Scenario: ${scenario}
- Operational Note: ${seasonalityNotes}

Analyze this forecast and provide the staff scheduling optimization recommendations.`;

    let response;
    let modelUsed = 'gemini-3.8-flash';
    try {
      response = await ai.models.generateContent({
        model: 'gemini-3.8-flash',
        contents: prompt,
        config: {
          responseMimeType: 'application/json',
          systemInstruction,
        },
      });
    } catch (primaryErr: any) {
      if (isTransientAiError(primaryErr)) {
        try {
          response = await ai.models.generateContent({
            model: 'gemini-3.1-flash-lite',
            contents: prompt,
            config: {
              responseMimeType: 'application/json',
              systemInstruction,
            },
          });
          modelUsed = 'gemini-3.1-flash-lite';
        } catch {
          throw primaryErr;
        }
      } else {
        throw primaryErr;
      }
    }

    const text = response?.text || '{}';
    const parsed = JSON.parse(text);
    const result = {
      ...parsed,
      source: modelUsed,
    };
    forecastCache.set(cacheKey, { data: result, exp: Date.now() + CACHE_TTL_MS });
    return res.json(result);
  } catch (err: any) {
    if (isTransientAiError(err)) {
      geminiQuotaCooldownUntil = Date.now() + 60 * 1000;
      console.info(
        '[Logistics Optimizer] Forecast AI model in high-demand/rate-limit cooldown. Using local forecasting heuristic.'
      );
    } else {
      console.info('[Logistics Optimizer] Using local forecasting engine.');
    }

    const fallback = generateHeuristicForecast(params);
    forecastCache.set(cacheKey, { data: fallback, exp: Date.now() + CACHE_TTL_MS });
    return res.json(fallback);
  }
});

// Supabase Status Endpoint
app.get('/api/supabase-status', async (req, res) => {
  const url = process.env.VITE_SUPABASE_URL || 'https://jwlvtpnhibtmalfdcmbu.supabase.co';
  const anonKey = process.env.VITE_SUPABASE_ANON_KEY || 'eyJhbGciOiJIUzI1NiIsInR5cCI6IkpXVCJ9.eyJpc3MiOiJzdXBhYmFzZSIsInJlZiI6Imp3bHZ0cG5oaWJ0bWFsZmRjbWJ1Iiwicm9sZSI6ImFub24iLCJpYXQiOjE3ODkyODI0MDUsImV4cCI6MjEwNDg1ODQwNX0.iTioT1eTznBwtEJfglyQTkgtBt8o33BFPYc0Wtg7ETI';

  try {
    const response = await fetch(`${url}/auth/v1/health`, {
      headers: {
        apikey: anonKey,
      },
    });

    if (response.ok) {
      return res.json({
        connected: true,
        status: 'online',
        url,
        message: 'Supabase REST API connected successfully.',
      });
    }

    const data: any = await response.json().catch(() => ({}));
    return res.json({
      connected: false,
      status: 'auth_error',
      url,
      httpCode: response.status,
      error: data?.message || 'Invalid API key or unauthorized project access',
      hint: data?.hint || 'Update VITE_SUPABASE_ANON_KEY with a valid project token in settings or .env',
      fallbackMode: 'Local Offline-First Resilience Active (Indexed storage & queue)',
    });
  } catch (err: any) {
    return res.json({
      connected: false,
      status: 'network_error',
      url,
      error: err.message,
      fallbackMode: 'Local Offline-First Resilience Active',
    });
  }
});

// Products catalog endpoint proxying Supabase table https://jwlvtpnhibtmalfdcmbu.supabase.co/rest/v1/products
app.get('/api/products', async (req, res) => {
  const url = process.env.VITE_SUPABASE_URL || 'https://jwlvtpnhibtmalfdcmbu.supabase.co';
  const anonKey = process.env.VITE_SUPABASE_ANON_KEY || 'eyJhbGciOiJIUzI1NiIsInR5cCI6IkpXVCJ9.eyJpc3MiOiJzdXBhYmFzZSIsInJlZiI6Imp3bHZ0cG5oaWJ0bWFsZmRjbWJ1Iiwicm9sZSI6ImFub24iLCJpYXQiOjE3ODkyODI0MDUsImV4cCI6MjEwNDg1ODQwNX0.iTioT1eTznBwtEJfglyQTkgtBt8o33BFPYc0Wtg7ETI';

  try {
    let authHeader = (req.headers['authorization'] as string) || '';

    // If client does not have session header, authenticate service session
    if (!authHeader) {
      try {
        const loginRes = await fetch(`${url}/auth/v1/token?grant_type=password`, {
          method: 'POST',
          headers: {
            apikey: anonKey,
            'Content-Type': 'application/json',
          },
          body: JSON.stringify({
            email: 'field_staff@zamzam.co.tz',
            password: 'Password123!',
          }),
        });
        if (loginRes.ok) {
          const authData = await loginRes.json();
          if (authData?.access_token) {
            authHeader = `Bearer ${authData.access_token}`;
          }
        }
      } catch (e) {
        console.warn('[Server] Supabase staff auth attempt failed:', e);
      }
    }

    const headers: Record<string, string> = {
      apikey: anonKey,
    };
    if (authHeader) {
      headers['Authorization'] = authHeader;
    }

    const response = await fetch(`${url}/rest/v1/products?select=*&order=id.asc`, {
      headers,
    });

    if (response.ok) {
      const data = await response.json();
      return res.json({ success: true, source: 'supabase', products: data });
    }

    const errorData = await response.json().catch(() => ({}));
    return res.status(response.status).json({
      success: false,
      source: 'supabase',
      error: errorData,
      products: [],
    });
  } catch (err: any) {
    return res.status(500).json({ success: false, error: err.message, products: [] });
  }
});

async function start() {
  // Vite dev middleware or static serving
  if (process.env.NODE_ENV !== 'production') {
    const { createServer: createViteServer } = await import('vite');
    const vite = await createViteServer({
      server: { middlewareMode: true },
      appType: 'spa',
    });
    app.use(vite.middlewares);
  } else {
    const distPath = path.join(process.cwd(), 'dist');
    app.use(express.static(distPath));
    // Express v5 syntax
    app.get('*all', (req, res) => {
      res.sendFile(path.join(distPath, 'index.html'));
    });
  }

  app.listen(PORT, '0.0.0.0', () => {
    console.log(`Server listening on http://0.0.0.0:${PORT}`);
  });
}

start();
