import { FieldTeamLocation, TeamFieldStatus, UserProfile } from '../types';
import { firestoreDb, handleFirestoreError, OperationType } from '../lib/firebase';
import { collection, doc, setDoc, onSnapshot, getDocs } from 'firebase/firestore';

// Mwanza Tanzania Reference Hubs & Regional Logistics Stations
export const MWANZA_HUBS = {
  DEPOT_NYAKATO: {
    id: 'hub-nyakato',
    name: 'ZAMZAM Bottling Plant & Central Depot (Nyakato)',
    shortName: 'Nyakato Main Plant',
    lat: -2.5280,
    lng: 32.9350,
    address: 'Musoma Road, Nyakato Industrial Area, Mwanza',
    role: 'Central RO Bottling & Plant Logistics',
    capacity: '4,500x 18.9L Bottles',
  },
  CAPRIPOINT_WATERFRONT: {
    id: 'hub-capripoint',
    name: 'Capripoint Waterfront & Tilapia Executive Station',
    shortName: 'Capripoint Hub',
    lat: -2.5140,
    lng: 32.8925,
    address: 'Capripoint Hill / Tilapia Bay, Lake Victoria, Mwanza',
    role: 'Corporate, Diplomatic & Hotel Distribution',
    capacity: '800x 18.9L Bottles',
  },
  POSTA_CBD: {
    id: 'hub-posta-cbd',
    name: 'Posta & Mwanza Central Business District Hub',
    shortName: 'CBD Posta Station',
    lat: -2.5175,
    lng: 32.9015,
    address: 'Nyerere Road / Posta St, Mwanza CBD',
    role: 'Financial Sector & Commercial Offices Refills',
    capacity: '1,200x 18.9L Bottles',
  },
  BUZURUGA_PLAZA: {
    id: 'hub-buzuruga',
    name: 'Buzuruga Commercial Plaza & Highway Terminal',
    shortName: 'Buzuruga Terminal',
    lat: -2.5315,
    lng: 32.9465,
    address: 'Musoma Highway, Buzuruga, Mwanza',
    role: 'High-Volume Wholesale & Retail Drop Station',
    capacity: '1,500x 18.9L Bottles',
  },
  KIRUMBA_STADIUM: {
    id: 'hub-kirumba',
    name: 'Kirumba & CCM Kirumba Stadium Sector',
    shortName: 'Kirumba Hub',
    lat: -2.5025,
    lng: 32.8965,
    address: 'Makongoro Road, Kirumba, Mwanza',
    role: 'Residential & Institutional Distribution',
    capacity: '950x 18.9L Bottles',
  },
  PASIANSI_AIRPORT: {
    id: 'hub-pasiansi',
    name: 'Pasiansi & Mwanza Airport Logistics Stop',
    shortName: 'Pasiansi / Airport Hub',
    lat: -2.4825,
    lng: 32.9155,
    address: 'Airport Road, Pasiansi, Mwanza',
    role: 'Airport Corridor & Northern Suburbs',
    capacity: '700x 18.9L Bottles',
  },
  NYEGEZI_TERMINAL: {
    id: 'hub-nyegezi',
    name: 'Nyegezi Transit Hub & Butimba Terminal',
    shortName: 'Nyegezi Terminal',
    lat: -2.5665,
    lng: 32.8975,
    address: 'Shinyanga Road, Nyegezi, Mwanza',
    role: 'Southern Mwanza Transit & College Corridor',
    capacity: '1,100x 18.9L Bottles',
  },
  IGOMA_JUNCTION: {
    id: 'hub-igoma',
    name: 'Igoma Commercial Market Station',
    shortName: 'Igoma Hub',
    lat: -2.5455,
    lng: 32.9810,
    address: 'Musoma Road, Igoma, Mwanza',
    role: 'Eastern Mwanza Outskirts Distribution',
    capacity: '650x 18.9L Bottles',
  },
};

// Backward-compatible alias for any legacy imports
export const DAR_ES_SALAAM_HUBS = {
  DEPOT_UBUNGO: MWANZA_HUBS.DEPOT_NYAKATO,
  ...MWANZA_HUBS,
};

// Clean baseline fleet in Mwanza, Tanzania (Lake Zone Corridor)
export const INITIAL_FLEET: FieldTeamLocation[] = [
  {
    userId: 'drv-001',
    staffName: 'Salim Bakari',
    employeeId: 'T 412 DZZ',
    phone: '+255 754 882 101',
    role: 'field_staff',
    latitude: -2.5315,
    longitude: 32.9420,
    accuracy: 4.2,
    heading: 75,
    speed: 28,
    altitude: 1140,
    timestamp: new Date().toISOString(),
    updatedAt: Date.now() - 1000 * 25,
    isOnline: true,
    status: 'en_route',
    assignedRoute: 'Nyakato & Buzuruga Industrial Corridor',
    currentStop: 'Buzuruga Commercial Plaza & Bus Terminal',
    batteryLevel: 91,
    truckStock: {
      bottles18_9L: 26,
      bottles13L: 12,
    },
    totalStopsToday: 15,
    completedStopsToday: 9,
  },
  {
    userId: 'drv-002',
    staffName: 'Juma Ramadhani',
    employeeId: 'T 834 EZZ',
    phone: '+255 784 331 490',
    role: 'field_staff',
    latitude: -2.5145,
    longitude: 32.8960,
    accuracy: 3.1,
    heading: 180,
    speed: 0,
    altitude: 1135,
    timestamp: new Date().toISOString(),
    updatedAt: Date.now() - 1000 * 15,
    isOnline: true,
    status: 'at_customer',
    assignedRoute: 'Capripoint Waterfront & CBD Hub',
    currentStop: 'Tilapia Hotel Lakeview Receiving Dock',
    batteryLevel: 95,
    truckStock: {
      bottles18_9L: 34,
      bottles13L: 16,
    },
    totalStopsToday: 12,
    completedStopsToday: 7,
  },
  {
    userId: 'drv-003',
    staffName: 'Baraka Mushi',
    employeeId: 'T 119 CZZ',
    phone: '+255 713 774 219',
    role: 'field_staff',
    latitude: -2.4920,
    longitude: 32.9080,
    accuracy: 5.0,
    heading: 340,
    speed: 22,
    altitude: 1145,
    timestamp: new Date().toISOString(),
    updatedAt: Date.now() - 1000 * 45,
    isOnline: true,
    status: 'delivering',
    assignedRoute: 'Kirumba, Airport Rd & Pasiansi Corridor',
    currentStop: 'Pasiansi Executive Suites & Clinic',
    batteryLevel: 84,
    truckStock: {
      bottles18_9L: 18,
      bottles13L: 8,
    },
    totalStopsToday: 11,
    completedStopsToday: 6,
  },
  {
    userId: 'drv-004',
    staffName: 'Ali Hassan',
    employeeId: 'T 602 AZZ',
    phone: '+255 765 220 541',
    role: 'field_staff',
    latitude: -2.5580,
    longitude: 32.9020,
    accuracy: 4.8,
    heading: 195,
    speed: 34,
    altitude: 1150,
    timestamp: new Date().toISOString(),
    updatedAt: Date.now() - 1000 * 60,
    isOnline: true,
    status: 'en_route',
    assignedRoute: 'Nyegezi, Butimba & Mabatini Corridor',
    currentStop: 'Nyegezi Intercity Terminal Stores',
    batteryLevel: 78,
    truckStock: {
      bottles18_9L: 42,
      bottles13L: 18,
    },
    totalStopsToday: 14,
    completedStopsToday: 8,
  },
  {
    userId: 'drv-005',
    staffName: 'Hassan Mwinyi',
    employeeId: 'ZZ-MWZ-05',
    phone: '+255 754 112 301',
    role: 'field_staff',
    latitude: -2.5180,
    longitude: 32.9040,
    accuracy: 3.5,
    heading: 90,
    speed: 0,
    altitude: 1138,
    timestamp: new Date().toISOString(),
    updatedAt: Date.now() - 1000 * 30,
    isOnline: true,
    status: 'at_customer',
    assignedRoute: 'Mwanza Central Express & Urgent Refills',
    currentStop: 'Posta Bank Mwanza Main Branch',
    batteryLevel: 88,
    truckStock: {
      bottles18_9L: 14,
      bottles13L: 6,
    },
    totalStopsToday: 16,
    completedStopsToday: 12,
  },
];

const LOCAL_STORAGE_KEY = 'zamzam_field_locations_mwanza_clean_v1';
const MY_LOCATION_STORAGE_KEY = 'zamzam_my_live_location_mwanza';
const TRACKING_STATE_KEY = 'zamzam_is_tracking_active';

// Helper to verify that a coordinate set is genuinely within Mwanza, Tanzania
export function isWithinMwanzaRegion(lat: number, lng: number): boolean {
  return lat >= -2.75 && lat <= -2.35 && lng >= 32.70 && lng <= 33.15;
}

// Haversine formula to compute distance in km
export function calculateDistanceKm(lat1: number, lon1: number, lat2: number, lon2: number): number {
  const R = 6371; // Earth's radius in km
  const dLat = ((lat2 - lat1) * Math.PI) / 180;
  const dLon = ((lon2 - lon1) * Math.PI) / 180;
  const a =
    Math.sin(dLat / 2) * Math.sin(dLat / 2) +
    Math.cos((lat1 * Math.PI) / 180) *
      Math.cos((lat2 * Math.PI) / 180) *
      Math.sin(dLon / 2) *
      Math.sin(dLon / 2);
  const c = 2 * Math.atan2(Math.sqrt(a), Math.sqrt(1 - a));
  return Math.round(R * c * 10) / 10;
}

class GeolocationTrackingService {
  private watchId: number | null = null;
  private channel: BroadcastChannel | null = null;
  private isSimulationRunning: boolean = false;
  private simulationInterval: any = null;
  private listeners: Set<(locations: FieldTeamLocation[]) => void> = new Set();
  private currentLocationListeners: Set<(loc: FieldTeamLocation | null) => void> = new Set();
  private cachedLocations: Map<string, FieldTeamLocation> = new Map();
  private myCurrentLocation: FieldTeamLocation | null = null;

  constructor() {
    // Initialize broadcast channel for instant multi-tab sync
    if (typeof window !== 'undefined' && 'BroadcastChannel' in window) {
      try {
        this.channel = new BroadcastChannel('zamzam_geolocation_channel');
        this.channel.onmessage = (event) => {
          if (event.data && event.data.type === 'LOCATION_UPDATE') {
            const loc: FieldTeamLocation = event.data.payload;
            this.cachedLocations.set(loc.userId, loc);
            this.notifyListeners();
          } else if (event.data && event.data.type === 'ALL_LOCATIONS') {
            const locs: FieldTeamLocation[] = event.data.payload;
            locs.forEach((l) => this.cachedLocations.set(l.userId, l));
            this.notifyListeners();
          }
        };
      } catch {
        // BroadcastChannel unavailable
      }
    }

    // Load initial cached fleet
    this.loadFromStorage();
  }

  private loadFromStorage() {
    try {
      // Clean up legacy Dar es Salaam storage keys
      localStorage.removeItem('zamzam_field_locations');
      localStorage.removeItem('zamzam_my_live_location');

      const stored = localStorage.getItem(LOCAL_STORAGE_KEY);
      let isValidMwanza = false;
      if (stored) {
        const parsed: FieldTeamLocation[] = JSON.parse(stored);
        if (Array.isArray(parsed) && parsed.length > 0) {
          // Verify that cached locations are strictly within Mwanza, Tanzania
          isValidMwanza = parsed.every((item) => isWithinMwanzaRegion(item.latitude, item.longitude));
          if (isValidMwanza) {
            parsed.forEach((item) => this.cachedLocations.set(item.userId, item));
          }
        }
      }

      if (!isValidMwanza) {
        this.cachedLocations.clear();
        INITIAL_FLEET.forEach((item) => this.cachedLocations.set(item.userId, item));
        this.saveToStorage();
      }

      const storedMy = localStorage.getItem(MY_LOCATION_STORAGE_KEY);
      if (storedMy) {
        const parsedMy = JSON.parse(storedMy);
        if (parsedMy && isWithinMwanzaRegion(parsedMy.latitude, parsedMy.longitude)) {
          this.myCurrentLocation = parsedMy;
        } else {
          this.myCurrentLocation = null;
        }
      }
    } catch {
      INITIAL_FLEET.forEach((item) => this.cachedLocations.set(item.userId, item));
    }
  }

  // Explicit Clean & Reset to pristine Mwanza Tanzania baseline data
  public resetToCleanMwanzaData(): FieldTeamLocation[] {
    try {
      localStorage.removeItem('zamzam_field_locations');
      localStorage.removeItem('zamzam_my_live_location');
      localStorage.removeItem(LOCAL_STORAGE_KEY);
      localStorage.removeItem(MY_LOCATION_STORAGE_KEY);
    } catch {}

    this.cachedLocations.clear();
    INITIAL_FLEET.forEach((item) =>
      this.cachedLocations.set(item.userId, {
        ...item,
        updatedAt: Date.now(),
        timestamp: new Date().toISOString(),
      })
    );
    this.saveToStorage();
    this.notifyListeners();
    this.channel?.postMessage({ type: 'ALL_LOCATIONS', payload: Array.from(this.cachedLocations.values()) });

    // Sync to backend reset endpoint
    try {
      fetch('/api/field-locations/reset-mwanza', { method: 'POST' }).catch(() => {});
    } catch {}

    return Array.from(this.cachedLocations.values());
  }

  private saveToStorage() {
    try {
      const array = Array.from(this.cachedLocations.values());
      localStorage.setItem(LOCAL_STORAGE_KEY, JSON.stringify(array));
    } catch {
      // Storage unavailable
    }
  }

  public isGeolocationSupported(): boolean {
    return typeof navigator !== 'undefined' && 'geolocation' in navigator;
  }

  public isTrackingActive(): boolean {
    return this.watchId !== null;
  }

  public getMyCurrentLocation(): FieldTeamLocation | null {
    return this.myCurrentLocation;
  }

  // Request single current position via standard HTML5 Geolocation
  public async getCurrentPosition(): Promise<GeolocationPosition> {
    return new Promise((resolve, reject) => {
      if (!this.isGeolocationSupported()) {
        reject(new Error('Geolocation is not supported on this device.'));
        return;
      }
      navigator.geolocation.getCurrentPosition(resolve, reject, {
        enableHighAccuracy: true,
        timeout: 12000,
        maximumAge: 10000,
      });
    });
  }

  // Start real-time GPS tracking for active field team member
  public async startTracking(
    currentUser: UserProfile,
    onSuccess?: (loc: FieldTeamLocation) => void,
    onError?: (err: GeolocationPositionError | Error) => void
  ): Promise<boolean> {
    if (!this.isGeolocationSupported()) {
      onError?.(new Error('HTML5 Geolocation is not supported by your browser.'));
      return false;
    }

    if (this.watchId !== null) {
      this.stopTracking();
    }

    let batteryLevel: number | undefined = undefined;
    if (typeof navigator !== 'undefined' && 'getBattery' in navigator) {
      try {
        const battery: any = await (navigator as any).getBattery();
        batteryLevel = Math.round(battery.level * 100);
      } catch {
        // Battery API not supported
      }
    }

    const handlePosition = (pos: GeolocationPosition) => {
      const speedKmH =
        pos.coords.speed !== null && pos.coords.speed !== undefined
          ? Math.round(pos.coords.speed * 3.6)
          : 0;

      const loc: FieldTeamLocation = {
        userId: currentUser.id || currentUser.employeeId || 'my-device-gps',
        staffName: currentUser.name || 'Field Driver',
        employeeId: currentUser.employeeId || 'ZZ-FIELD-GPS',
        phone: currentUser.phone || '+255 700 000 000',
        role: currentUser.role || 'field_staff',
        latitude: pos.coords.latitude,
        longitude: pos.coords.longitude,
        accuracy: Math.round(pos.coords.accuracy),
        heading: pos.coords.heading !== null ? Math.round(pos.coords.heading) : null,
        speed: speedKmH,
        altitude: pos.coords.altitude !== null ? Math.round(pos.coords.altitude) : null,
        timestamp: new Date(pos.timestamp).toISOString(),
        updatedAt: pos.timestamp || Date.now(),
        isOnline: true,
        status: speedKmH > 5 ? 'en_route' : 'at_customer',
        assignedRoute: 'Live GPS Active Dispatch',
        currentStop: 'Current Field Coordinates',
        batteryLevel,
        truckStock: {
          bottles18_9L: 26,
          bottles13L: 12,
        },
      };

      this.myCurrentLocation = loc;
      try {
        localStorage.setItem(MY_LOCATION_STORAGE_KEY, JSON.stringify(loc));
        localStorage.setItem(TRACKING_STATE_KEY, 'true');
      } catch {}

      // Update in local cache
      this.cachedLocations.set(loc.userId, loc);
      this.saveToStorage();
      this.notifyListeners();
      this.notifyCurrentLocationListeners(loc);

      // Broadcast across local browser windows
      this.channel?.postMessage({ type: 'LOCATION_UPDATE', payload: loc });

      // Sync to cloud Firestore & server API
      this.syncLocationToCloud(loc);

      onSuccess?.(loc);
    };

    const handleError = (err: GeolocationPositionError) => {
      console.warn('[Geolocation] Tracking error:', err.message);
      onError?.(err);
    };

    try {
      this.watchId = navigator.geolocation.watchPosition(handlePosition, handleError, {
        enableHighAccuracy: true,
        timeout: 15000,
        maximumAge: 3000,
      });

      // Also trigger an immediate one-shot request
      navigator.geolocation.getCurrentPosition(handlePosition, handleError, {
        enableHighAccuracy: true,
        timeout: 10000,
        maximumAge: 1000,
      });

      return true;
    } catch (err: any) {
      onError?.(err);
      return false;
    }
  }

  // Stop real-time GPS tracking
  public stopTracking(): void {
    if (this.watchId !== null && this.isGeolocationSupported()) {
      navigator.geolocation.clearWatch(this.watchId);
      this.watchId = null;
      try {
        localStorage.removeItem(TRACKING_STATE_KEY);
      } catch {}
    }

    if (this.myCurrentLocation) {
      const updated = {
        ...this.myCurrentLocation,
        isOnline: false,
        status: 'offline' as TeamFieldStatus,
        updatedAt: Date.now(),
      };
      this.myCurrentLocation = updated;
      this.cachedLocations.set(updated.userId, updated);
      this.saveToStorage();
      this.notifyListeners();
      this.notifyCurrentLocationListeners(updated);
      this.syncLocationToCloud(updated);
    }
  }

  // Sync location to Firestore & Express server
  public async syncLocationToCloud(location: FieldTeamLocation): Promise<void> {
    // 1. Post to Express Server
    try {
      fetch('/api/field-locations', {
        method: 'POST',
        headers: { 'Content-Type': 'application/json' },
        body: JSON.stringify(location),
      }).catch(() => {});
    } catch {}

    // 2. Sync to Firebase Firestore if available
    try {
      if (firestoreDb && location.userId) {
        const docRef = doc(firestoreDb, 'field_locations', location.userId);
        await setDoc(docRef, { ...location }, { merge: true });
      }
    } catch (err) {
      handleFirestoreError(err, OperationType.WRITE, `field_locations/${location.userId}`);
    }
  }

  // Fetch all field team locations
  public getAllLocations(): FieldTeamLocation[] {
    return Array.from(this.cachedLocations.values());
  }

  // Subscribe to real-time fleet updates (for supervisor screen)
  public subscribeToFleet(callback: (locations: FieldTeamLocation[]) => void): () => void {
    this.listeners.add(callback);
    // Send immediate current data
    callback(this.getAllLocations());

    // Connect to Firestore real-time snapshot listener if online
    let unsubscribeFirestore: (() => void) | null = null;
    try {
      if (firestoreDb) {
        const colRef = collection(firestoreDb, 'field_locations');
        unsubscribeFirestore = onSnapshot(
          colRef,
          (snapshot) => {
            snapshot.docChanges().forEach((change) => {
              const data = change.doc.data() as FieldTeamLocation;
              if (data && data.userId) {
                this.cachedLocations.set(data.userId, data);
              }
            });
            this.saveToStorage();
            this.notifyListeners();
          },
          (err) => {
            handleFirestoreError(err, OperationType.LIST, 'field_locations');
          }
        );
      }
    } catch (err) {
      handleFirestoreError(err, OperationType.LIST, 'field_locations');
    }

    // Server-side polling fallback (every 8 seconds)
    const pollInterval = setInterval(() => {
      this.fetchLocationsFromServer();
    }, 8000);

    return () => {
      this.listeners.delete(callback);
      clearInterval(pollInterval);
      if (unsubscribeFirestore) {
        unsubscribeFirestore();
      }
    };
  }

  // Subscribe to logged-in user's own GPS tracking updates
  public subscribeToCurrentLocation(callback: (loc: FieldTeamLocation | null) => void): () => void {
    this.currentLocationListeners.add(callback);
    callback(this.myCurrentLocation);
    return () => {
      this.currentLocationListeners.delete(callback);
    };
  }

  private notifyListeners() {
    const list = this.getAllLocations();
    this.listeners.forEach((cb) => cb(list));
  }

  private notifyCurrentLocationListeners(loc: FieldTeamLocation | null) {
    this.currentLocationListeners.forEach((cb) => cb(loc));
  }

  private async fetchLocationsFromServer() {
    try {
      const res = await fetch('/api/field-locations');
      if (res.ok) {
        const data = await res.json();
        if (Array.isArray(data) && data.length > 0) {
          data.forEach((loc: FieldTeamLocation) => {
            this.cachedLocations.set(loc.userId, loc);
          });
          this.saveToStorage();
          this.notifyListeners();
        }
      }
    } catch {
      // Offline
    }
  }

  // Update a team member's status (e.g., from supervisor control or driver action)
  public updateDriverStatus(userId: string, status: TeamFieldStatus, currentStop?: string): void {
    const existing = this.cachedLocations.get(userId);
    if (!existing) return;

    const updated: FieldTeamLocation = {
      ...existing,
      status,
      currentStop: currentStop || existing.currentStop,
      updatedAt: Date.now(),
      timestamp: new Date().toISOString(),
    };

    this.cachedLocations.set(userId, updated);
    this.saveToStorage();
    this.notifyListeners();
    this.channel?.postMessage({ type: 'LOCATION_UPDATE', payload: updated });
    this.syncLocationToCloud(updated);
  }

  // Simulation mode: moves the fleet through Mwanza, Tanzania road networks
  public toggleFleetSimulation(enable?: boolean): boolean {
    const targetState = enable !== undefined ? enable : !this.isSimulationRunning;
    this.isSimulationRunning = targetState;

    if (this.simulationInterval) {
      clearInterval(this.simulationInterval);
      this.simulationInterval = null;
    }

    if (this.isSimulationRunning) {
      // Delta movement along Mwanza road corridors
      let step = 0;
      this.simulationInterval = setInterval(() => {
        step++;
        const updatedList: FieldTeamLocation[] = [];

        this.cachedLocations.forEach((driver) => {
          // If this is the user's real GPS, don't simulate
          if (this.watchId !== null && this.myCurrentLocation?.userId === driver.userId) {
            return;
          }

          // Generate realistic micro-movement along Mwanza corridors
          const latJitter = Math.sin(step * 0.15 + driver.userId.charCodeAt(driver.userId.length - 1)) * 0.00035;
          const lngJitter = Math.cos(step * 0.15 + driver.userId.charCodeAt(driver.userId.length - 1)) * 0.00035;

          // Keep strictly inside Mwanza road perimeter
          let newLat = driver.latitude + latJitter;
          let newLng = driver.longitude + lngJitter;

          if (!isWithinMwanzaRegion(newLat, newLng)) {
            // Re-anchor to Mwanza initial position if drift exceeds bounds
            const initial = INITIAL_FLEET.find((f) => f.userId === driver.userId);
            if (initial) {
              newLat = initial.latitude;
              newLng = initial.longitude;
            }
          }

          const currentSpeed =
            driver.status === 'at_customer' || driver.status === 'depot_reload'
              ? 0
              : Math.max(15, Math.min(48, (driver.speed || 25) + Math.round((Math.random() - 0.5) * 6)));

          const updated: FieldTeamLocation = {
            ...driver,
            latitude: newLat,
            longitude: newLng,
            speed: currentSpeed,
            heading: (Math.round((driver.heading || 90) + (Math.random() - 0.5) * 15) + 360) % 360,
            updatedAt: Date.now(),
            timestamp: new Date().toISOString(),
            batteryLevel: Math.max(12, (driver.batteryLevel || 80) - (step % 120 === 0 ? 1 : 0)),
          };

          this.cachedLocations.set(driver.userId, updated);
          updatedList.push(updated);
        });

        this.saveToStorage();
        this.notifyListeners();
        this.channel?.postMessage({ type: 'ALL_LOCATIONS', payload: Array.from(this.cachedLocations.values()) });
      }, 3500);
    }

    return this.isSimulationRunning;
  }

  public isSimulationActive(): boolean {
    return this.isSimulationRunning;
  }
}

export const geolocationService = new GeolocationTrackingService();
