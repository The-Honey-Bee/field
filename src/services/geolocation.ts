import { FieldTeamLocation, TeamFieldStatus, UserProfile } from '../types';
import { firestoreDb } from '../lib/firebase';
import { collection, doc, setDoc, onSnapshot, getDocs } from 'firebase/firestore';

// Dar es Salaam Reference Locations & Routes
export const DAR_ES_SALAAM_HUBS = {
  DEPOT_UBUNGO: {
    name: 'Central Depot - Ubungo Hub',
    lat: -6.7865,
    lng: 39.2132,
    address: 'Morogoro Road, Ubungo, Dar es Salaam',
  },
  KARIAKOO: {
    name: 'Kariakoo Commercial Sector',
    lat: -6.8198,
    lng: 39.2783,
    address: 'Swahili St / Msimbazi, Kariakoo',
  },
  POSTA_CBD: {
    name: 'Posta / CBD Tower Center',
    lat: -6.8145,
    lng: 39.2890,
    address: 'Samora Avenue / Sokoine Dr',
  },
  MASAKI: {
    name: 'Masaki & Oysterbay Corporate',
    lat: -6.7580,
    lng: 39.2720,
    address: 'Haile Selassie Rd / Toure Dr, Masaki',
  },
  MIKOCHENI: {
    name: 'Mikocheni Light Industrial',
    lat: -6.7720,
    lng: 39.2450,
    address: 'Old Bagamoyo Rd, Mikocheni',
  },
  SINZA: {
    name: 'Sinza Commercial Corridor',
    lat: -6.7810,
    lng: 39.2290,
    address: 'Shekilango Rd, Sinza',
  },
  MWENGE: {
    name: 'Mwenge Commercial & Lorry Park',
    lat: -6.7690,
    lng: 39.2220,
    address: 'Sam Nujoma Rd, Mwenge',
  },
  MLIMANI: {
    name: 'Mlimani City Mall',
    lat: -6.7712,
    lng: 39.2185,
    address: 'Sam Nujoma Rd, Survey',
  },
};

// Standard baseline fleet of field delivery vehicles in Dar es Salaam
export const INITIAL_FLEET: FieldTeamLocation[] = [
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
    updatedAt: Date.now() - 1000 * 25,
    isOnline: true,
    status: 'en_route',
    assignedRoute: 'Kariakoo Commercial Corridor',
    currentStop: 'City Hypermarket - Swahili St',
    batteryLevel: 88,
    truckStock: {
      bottles18_9L: 22,
      bottles13L: 10,
    },
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
    updatedAt: Date.now() - 1000 * 15,
    isOnline: true,
    status: 'at_customer',
    assignedRoute: 'Masaki & Oysterbay Diplomatic',
    currentStop: 'Hotel Sea Cliff Receiving Dock',
    batteryLevel: 94,
    truckStock: {
      bottles18_9L: 34,
      bottles13L: 16,
    },
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
    updatedAt: Date.now() - 1000 * 45,
    isOnline: true,
    status: 'depot_reload',
    assignedRoute: 'Ubungo & Morogoro Rd Corridor',
    currentStop: 'Central Depot Bay #2 (Reloading)',
    batteryLevel: 62,
    truckStock: {
      bottles18_9L: 45,
      bottles13L: 20,
    },
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
    updatedAt: Date.now() - 1000 * 60,
    isOnline: true,
    status: 'delivering',
    assignedRoute: 'Mikocheni & Bagamoyo Rd Corridor',
    currentStop: 'Al-Barakah Restaurant & Catering',
    batteryLevel: 79,
    truckStock: {
      bottles18_9L: 18,
      bottles13L: 8,
    },
    totalStopsToday: 10,
    completedStopsToday: 6,
  },
];

const LOCAL_STORAGE_KEY = 'zamzam_field_locations';
const MY_LOCATION_STORAGE_KEY = 'zamzam_my_live_location';
const TRACKING_STATE_KEY = 'zamzam_is_tracking_active';

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
      const stored = localStorage.getItem(LOCAL_STORAGE_KEY);
      if (stored) {
        const parsed: FieldTeamLocation[] = JSON.parse(stored);
        parsed.forEach((item) => this.cachedLocations.set(item.userId, item));
      } else {
        INITIAL_FLEET.forEach((item) => this.cachedLocations.set(item.userId, item));
        this.saveToStorage();
      }

      const storedMy = localStorage.getItem(MY_LOCATION_STORAGE_KEY);
      if (storedMy) {
        this.myCurrentLocation = JSON.parse(storedMy);
      }
    } catch {
      INITIAL_FLEET.forEach((item) => this.cachedLocations.set(item.userId, item));
    }
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
    } catch {
      // Offline fallback
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
          () => {
            // Fallback to local
          }
        );
      }
    } catch {
      // Offline fallback
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

  // Simulation mode: moves the fleet through Dar es Salaam roads
  public toggleFleetSimulation(enable?: boolean): boolean {
    const targetState = enable !== undefined ? enable : !this.isSimulationRunning;
    this.isSimulationRunning = targetState;

    if (this.simulationInterval) {
      clearInterval(this.simulationInterval);
      this.simulationInterval = null;
    }

    if (this.isSimulationRunning) {
      // Slight delta movement per step (0.0003 deg is ~33 meters)
      let step = 0;
      this.simulationInterval = setInterval(() => {
        step++;
        const updatedList: FieldTeamLocation[] = [];

        this.cachedLocations.forEach((driver) => {
          // If this is the user's real GPS, don't simulate
          if (this.watchId !== null && this.myCurrentLocation?.userId === driver.userId) {
            return;
          }

          // Generate realistic micro-movement along route corridors
          const latJitter = Math.sin(step * 0.2 + driver.userId.charCodeAt(driver.userId.length - 1)) * 0.0004;
          const lngJitter = Math.cos(step * 0.2 + driver.userId.charCodeAt(driver.userId.length - 1)) * 0.0004;
          
          const newLat = driver.latitude + latJitter;
          const newLng = driver.longitude + lngJitter;
          const currentSpeed = driver.status === 'at_customer' || driver.status === 'depot_reload'
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
