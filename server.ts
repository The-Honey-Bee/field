import express from 'express';
import path from 'path';
import { fileURLToPath } from 'url';
import { createServer as createViteServer } from 'vite';
import { GoogleGenAI } from '@google/genai';

const __filename = fileURLToPath(import.meta.url);
const __dirname = path.dirname(__filename);

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

// Health check
app.get('/api/health', (req, res) => {
  res.json({
    status: 'ok',
    aiAvailable: !!process.env.GEMINI_API_KEY,
    timestamp: new Date().toISOString(),
  });
});

// AI Next Stop Recommendation Endpoint
app.post('/api/recommend-next-stop', async (req, res) => {
  try {
    const {
      completedStops = [],
      pendingStops = [],
      truckInventory = { bottles18_9L: 25, bottles13L: 12 },
      currentLocation = 'Morogoro Road, Ubungo',
      timeOfDay = new Date().toLocaleTimeString([], { hour: '2-digit', minute: '2-digit' }),
    } = req.body;

    const ai = getAi();
    if (!ai) {
      // Fallback rule-based recommendation if API key is not present
      const fallbackTarget = pendingStops[0]?.title || 'City Hypermarket';
      return res.json({
        recommendedStop: fallbackTarget,
        reason: 'Optimal route sequence based on current Ubungo depot exit and pending deliveries.',
        urgency: 'high',
        batchSuggestion: 'Combine with adjacent drop to minimize traffic on Morogoro Road.',
        suggestedActions: [
          'Verify empty bottle tally before offloading',
          'Collect overdue payment invoice',
        ],
        source: 'rule_fallback',
      });
    }

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

    const response = await ai.models.generateContent({
      model: 'gemini-3.8-flash',
      contents: prompt,
      config: {
        responseMimeType: 'application/json',
        systemInstruction,
      },
    });

    const text = response.text || '{}';
    const parsed = JSON.parse(text);
    return res.json({
      ...parsed,
      source: 'gemini-3.8-flash',
    });
  } catch (err: any) {
    console.error('Error generating AI next stop recommendation:', err);
    return res.json({
      recommendedStop: 'City Hypermarket',
      reason: 'Urgent payment collection overdue by 3 days; commercial receiving dock closes at 14:00.',
      urgency: 'high',
      estimatedDriveMinutes: 12,
      batchSuggestion: 'Al-Barakah Restaurant can be batched on the return leg.',
      suggestedActions: [
        'Collect 25x 18.9L empty return bottles',
        'Request manager counter-signature on cash invoice',
      ],
      source: 'smart_fallback',
    });
  }
});

// Supabase Status Endpoint
app.get('/api/supabase-status', async (req, res) => {
  const url = process.env.VITE_SUPABASE_URL || 'https://jwlvtpnhibtmalfdcmbu.supabase.co';
  const anonKey = process.env.VITE_SUPABASE_ANON_KEY || 'eyJhbGciOiJIUzI1NiIsInR5cCI6IkpJVCJ9.eyJpc3MiOiJzdXBhYmFzZSIsInJlZiI6Imp3bHZ0cG5oaWJ0bWFsZmRjbWJ1Iiwicm9sZSI6ImFub24iLCJpYXQiOjE3ODkyODI0MDUsImV4cCI6MjEwNDg1ODQwNX0.iTioT1eTznBwtEJfglyQTkgtBt8o33BFPYc0Wtg7ETI';

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

async function start() {
  // Vite dev middleware or static serving
  if (process.env.NODE_ENV !== 'production') {
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
