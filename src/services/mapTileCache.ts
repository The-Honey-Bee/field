// Zamzam Mwanza Plant Map Tile IndexedDB Caching Engine
// Provides high-reliability offline map tile caching for plant dead-zones, basements & loading bays
// Plant Coordinates: (-2.513339, 32.970645)

export const PLANT_COORDINATES = {
  lat: -2.513339,
  lng: 32.970645,
  name: 'ZAMZAM Bottling Plant & Central Depot (Nyakato)',
  zone: 'Nyakato Industrial Area, Mwanza',
};

const DB_NAME = 'zamzam_map_tiles_db';
const DB_VERSION = 1;
const TILES_STORE = 'tiles';
const META_STORE = 'cache_meta';

export interface CachedMapTile {
  id: string; // unique tile key, e.g., 'protomaps_14_9698_8422' or normalized URL
  url: string;
  data: ArrayBuffer;
  mimeType: string;
  z: number;
  x: number;
  y: number;
  theme: string;
  sizeBytes: number;
  timestamp: number;
  isPlantArea: boolean;
}

export interface MapCacheStats {
  totalTiles: number;
  totalSizeBytes: number;
  formattedSize: string;
  plantTilesCount: number;
  isPlantFullyCached: boolean;
  lastPrecacheTime: string | null;
  isSimulatedOffline: boolean;
}

// Slippy map / Web Mercator coordinate converters
export function latLngToTile(lat: number, lng: number, zoom: number): { x: number; y: number } {
  const latRad = (lat * Math.PI) / 180;
  const n = Math.pow(2, zoom);
  const x = Math.floor(((lng + 180) / 360) * n);
  const y = Math.floor(((1 - Math.asinh(Math.tan(latRad)) / Math.PI) / 2) * n);
  return { x, y };
}

export function tileToLatLng(x: number, y: number, zoom: number): { lat: number; lng: number } {
  const n = Math.pow(2, zoom);
  const lng = (x / n) * 360 - 180;
  const latRad = Math.atan(Math.sinh(Math.PI * (1 - (2 * y) / n)));
  const lat = (latRad * 180) / Math.PI;
  return { lat, lng };
}

class MapTileCacheService {
  private dbPromise: Promise<IDBDatabase> | null = null;
  private isIndexedDbAvailable: boolean = typeof window !== 'undefined' && 'indexedDB' in window;
  private isSimulatedOffline: boolean = false;
  private isInterceptorInstalled: boolean = false;
  private originalFetch: typeof window.fetch | null = null;
  private listeners: Set<(stats: MapCacheStats) => void> = new Set();
  private statsCache: MapCacheStats | null = null;

  constructor() {
    if (this.isIndexedDbAvailable) {
      this.initDb();
      this.installFetchInterceptor();
    }
  }

  private initDb(): Promise<IDBDatabase> {
    if (this.dbPromise) return this.dbPromise;

    this.dbPromise = new Promise((resolve, reject) => {
      if (!this.isIndexedDbAvailable) {
        reject(new Error('IndexedDB is not available in this environment'));
        return;
      }

      try {
        const request = window.indexedDB.open(DB_NAME, DB_VERSION);

        request.onupgradeneeded = (event) => {
          const db = (event.target as IDBOpenDBRequest).result;

          if (!db.objectStoreNames.contains(TILES_STORE)) {
            const tilesStore = db.createObjectStore(TILES_STORE, { keyPath: 'id' });
            tilesStore.createIndex('z', 'z', { unique: false });
            tilesStore.createIndex('theme', 'theme', { unique: false });
            tilesStore.createIndex('isPlantArea', 'isPlantArea', { unique: false });
            tilesStore.createIndex('timestamp', 'timestamp', { unique: false });
            tilesStore.createIndex('coordKey', ['z', 'x', 'y'], { unique: false });
          }

          if (!db.objectStoreNames.contains(META_STORE)) {
            db.createObjectStore(META_STORE, { keyPath: 'key' });
          }
        };

        request.onsuccess = () => {
          resolve(request.result);
        };

        request.onerror = () => {
          console.warn('[MapTileCache] Failed to initialize IndexedDB:', request.error);
          this.isIndexedDbAvailable = false;
          reject(request.error);
        };
      } catch (err) {
        console.warn('[MapTileCache] IndexedDB initialization error:', err);
        this.isIndexedDbAvailable = false;
        reject(err);
      }
    });

    return this.dbPromise;
  }

  private async getStore(storeName: string, mode: IDBTransactionMode = 'readonly'): Promise<IDBObjectStore | null> {
    try {
      const db = await this.initDb();
      const tx = db.transaction(storeName, mode);
      return tx.objectStore(storeName);
    } catch {
      return null;
    }
  }

  // --- Normalized Tile Key Generator ---
  public getTileKey(urlOrKey: string, z?: number, x?: number, y?: number, theme = 'default'): string {
    if (z !== undefined && x !== undefined && y !== undefined) {
      return `${theme}_${z}_${x}_${y}`;
    }

    try {
      const parsedUrl = new URL(urlOrKey, window.location.href);
      // Look for /{z}/{x}/{y} in path
      const match = parsedUrl.pathname.match(/\/(\d+)\/(\d+)\/(\d+)(?:\.([a-z0-9]+))?/i);
      if (match) {
        const [, pZ, pX, pY] = match;
        return `${theme}_${pZ}_${pX}_${pY}`;
      }
      return `${theme}_${parsedUrl.pathname}`;
    } catch {
      return `${theme}_${urlOrKey}`;
    }
  }

  // --- Check if a coordinate is within Zamzam Mwanza Plant zone ---
  public isCoordInPlantZone(lat: number, lng: number): boolean {
    const latDiff = Math.abs(lat - PLANT_COORDINATES.lat);
    const lngDiff = Math.abs(lng - PLANT_COORDINATES.lng);
    // ~2.5km radius around plant
    return latDiff <= 0.025 && lngDiff <= 0.025;
  }

  public isTileInPlantZone(z: number, x: number, y: number): boolean {
    const { lat, lng } = tileToLatLng(x, y, z);
    return this.isCoordInPlantZone(lat, lng);
  }

  // --- Save Tile to IndexedDB ---
  public async saveTile(
    id: string,
    url: string,
    data: ArrayBuffer,
    mimeType: string,
    z: number,
    x: number,
    y: number,
    theme = 'protomaps',
    forcePlantArea?: boolean
  ): Promise<void> {
    if (!this.isIndexedDbAvailable) return;

    try {
      const db = await this.initDb();
      const tx = db.transaction(TILES_STORE, 'readwrite');
      const store = tx.objectStore(TILES_STORE);

      const isPlantArea = forcePlantArea !== undefined ? forcePlantArea : this.isTileInPlantZone(z, x, y);

      const tile: CachedMapTile = {
        id,
        url,
        data,
        mimeType: mimeType || 'application/x-protobuf',
        z,
        x,
        y,
        theme,
        sizeBytes: data.byteLength,
        timestamp: Date.now(),
        isPlantArea,
      };

      store.put(tile);

      tx.oncomplete = () => {
        this.notifyStatsUpdated();
      };
    } catch (err) {
      console.warn('[MapTileCache] Could not save tile to IndexedDB:', err);
    }
  }

  // --- Get Tile from IndexedDB ---
  public async getTile(id: string): Promise<CachedMapTile | null> {
    if (!this.isIndexedDbAvailable) return null;

    try {
      const store = await this.getStore(TILES_STORE, 'readonly');
      if (!store) return null;

      return new Promise<CachedMapTile | null>((resolve) => {
        const req = store.get(id);
        req.onsuccess = () => {
          resolve(req.result || null);
        };
        req.onerror = () => {
          resolve(null);
        };
      });
    } catch {
      return null;
    }
  }

  // --- Get Tile by z, x, y coordinates ---
  public async getTileByCoords(z: number, x: number, y: number, theme = 'protomaps'): Promise<CachedMapTile | null> {
    const key = this.getTileKey('', z, x, y, theme);
    const direct = await this.getTile(key);
    if (direct) return direct;

    // Fallback search with default theme
    if (theme !== 'default') {
      return this.getTile(this.getTileKey('', z, x, y, 'default'));
    }
    return null;
  }

  // --- Check if Tile exists in Cache ---
  public async hasTile(id: string): Promise<boolean> {
    const tile = await this.getTile(id);
    return !!tile;
  }

  // --- Cache Statistics ---
  public async getStats(): Promise<MapCacheStats> {
    if (!this.isIndexedDbAvailable) {
      return {
        totalTiles: 0,
        totalSizeBytes: 0,
        formattedSize: '0 KB',
        plantTilesCount: 0,
        isPlantFullyCached: false,
        lastPrecacheTime: null,
        isSimulatedOffline: this.isSimulatedOffline,
      };
    }

    try {
      const db = await this.initDb();
      const tx = db.transaction([TILES_STORE, META_STORE], 'readonly');
      const tilesStore = tx.objectStore(TILES_STORE);
      const metaStore = tx.objectStore(META_STORE);

      return new Promise<MapCacheStats>((resolve) => {
        let totalTiles = 0;
        let totalSizeBytes = 0;
        let plantTilesCount = 0;

        const cursorReq = tilesStore.openCursor();
        cursorReq.onsuccess = (e) => {
          const cursor = (e.target as IDBRequest).result as IDBCursorWithValue;
          if (cursor) {
            totalTiles++;
            const tile = cursor.value as CachedMapTile;
            totalSizeBytes += tile.sizeBytes || 0;
            if (tile.isPlantArea) {
              plantTilesCount++;
            }
            cursor.continue();
          } else {
            // Read meta
            const metaReq = metaStore.get('last_precache');
            metaReq.onsuccess = () => {
              const metaVal = metaReq.result?.value;
              const formattedSize =
                totalSizeBytes > 1024 * 1024
                  ? `${(totalSizeBytes / (1024 * 1024)).toFixed(2)} MB`
                  : `${(totalSizeBytes / 1024).toFixed(1)} KB`;

              const stats: MapCacheStats = {
                totalTiles,
                totalSizeBytes,
                formattedSize,
                plantTilesCount,
                isPlantFullyCached: plantTilesCount >= 30,
                lastPrecacheTime: metaVal ? new Date(metaVal).toLocaleString() : null,
                isSimulatedOffline: this.isSimulatedOffline,
              };
              this.statsCache = stats;
              resolve(stats);
            };
            metaReq.onerror = () => {
              resolve({
                totalTiles,
                totalSizeBytes,
                formattedSize: `${(totalSizeBytes / 1024).toFixed(1)} KB`,
                plantTilesCount,
                isPlantFullyCached: plantTilesCount >= 30,
                lastPrecacheTime: null,
                isSimulatedOffline: this.isSimulatedOffline,
              });
            };
          }
        };

        cursorReq.onerror = () => {
          resolve({
            totalTiles: 0,
            totalSizeBytes: 0,
            formattedSize: '0 KB',
            plantTilesCount: 0,
            isPlantFullyCached: false,
            lastPrecacheTime: null,
            isSimulatedOffline: this.isSimulatedOffline,
          });
        };
      });
    } catch {
      return {
        totalTiles: 0,
        totalSizeBytes: 0,
        formattedSize: '0 KB',
        plantTilesCount: 0,
        isPlantFullyCached: false,
        lastPrecacheTime: null,
        isSimulatedOffline: this.isSimulatedOffline,
      };
    }
  }

  // --- Precache Zamzam Mwanza Plant Area for Offline Use ---
  // Calculates all tiles covering the plant and surrounding perimeter from zoom 12 to 17
  public async precachePlantArea(options?: {
    minZoom?: number;
    maxZoom?: number;
    apiKey?: string;
    onProgress?: (progress: {
      cachedCount: number;
      totalCount: number;
      currentZoom: number;
      percent: number;
      statusText: string;
    }) => void;
  }): Promise<{ cachedCount: number; totalSizeBytes: number }> {
    const minZoom = options?.minZoom ?? 12;
    const maxZoom = options?.maxZoom ?? 17;
    const apiKey =
      options?.apiKey ||
      (typeof import.meta !== 'undefined' && import.meta.env && import.meta.env.VITE_PROTOMAPS_API_KEY) ||
      'c67afbf0807f68f3';

    // Plant boundary: Lat -2.513339, Lng 32.970645
    // Radius buffer around plant: 0.015 degrees lat/lng
    const buffer = 0.015;
    const minLat = PLANT_COORDINATES.lat - buffer;
    const maxLat = PLANT_COORDINATES.lat + buffer;
    const minLng = PLANT_COORDINATES.lng - buffer;
    const maxLng = PLANT_COORDINATES.lng + buffer;

    interface TileTask {
      z: number;
      x: number;
      y: number;
      url: string;
      id: string;
    }

    const tasks: TileTask[] = [];

    for (let z = minZoom; z <= maxZoom; z++) {
      const topLeft = latLngToTile(maxLat, minLng, z);
      const bottomRight = latLngToTile(minLat, maxLng, z);

      const minX = Math.min(topLeft.x, bottomRight.x);
      const maxX = Math.max(topLeft.x, bottomRight.x);
      const minY = Math.min(topLeft.y, bottomRight.y);
      const maxY = Math.max(topLeft.y, bottomRight.y);

      for (let x = minX; x <= maxX; x++) {
        for (let y = minY; y <= maxY; y++) {
          const url = `https://api.protomaps.com/tiles/v3/${z}/${x}/${y}.mvt?key=${apiKey}`;
          const id = `protomaps_${z}_${x}_${y}`;
          tasks.push({ z, x, y, url, id });
        }
      }
    }

    let cachedCount = 0;
    let totalSizeBytes = 0;
    const totalCount = tasks.length;

    options?.onProgress?.({
      cachedCount: 0,
      totalCount,
      currentZoom: minZoom,
      percent: 0,
      statusText: `Preparing to download ${totalCount} tiles for Zamzam Plant (-2.513, 32.970)...`,
    });

    // Concurrency limit to avoid overwhelming browser or network
    const CONCURRENCY = 4;
    for (let i = 0; i < tasks.length; i += CONCURRENCY) {
      const chunk = tasks.slice(i, i + CONCURRENCY);
      await Promise.all(
        chunk.map(async (task) => {
          try {
            // Check if already in cache
            const existing = await this.getTile(task.id);
            if (existing) {
              cachedCount++;
              totalSizeBytes += existing.sizeBytes;
              return;
            }

            const res = await (this.originalFetch || window.fetch)(task.url);
            if (res.ok) {
              const buffer = await res.arrayBuffer();
              await this.saveTile(
                task.id,
                task.url,
                buffer,
                'application/x-protobuf',
                task.z,
                task.x,
                task.y,
                'protomaps',
                true
              );
              cachedCount++;
              totalSizeBytes += buffer.byteLength;
            }
          } catch (err) {
            console.warn(`[MapTileCache] Failed to precache tile ${task.id}:`, err);
          }
        })
      );

      const lastTask = chunk[chunk.length - 1];
      const percent = Math.round((cachedCount / totalCount) * 100);
      options?.onProgress?.({
        cachedCount,
        totalCount,
        currentZoom: lastTask.z,
        percent,
        statusText: `Downloading zoom level ${lastTask.z} (${cachedCount}/${totalCount} tiles cached)`,
      });
    }

    // Save metadata
    try {
      const store = await this.getStore(META_STORE, 'readwrite');
      if (store) {
        store.put({ key: 'last_precache', value: new Date().toISOString() });
        store.put({ key: 'plant_cached', value: true });
      }
    } catch {
      // ignore
    }

    await this.notifyStatsUpdated();

    options?.onProgress?.({
      cachedCount,
      totalCount,
      currentZoom: maxZoom,
      percent: 100,
      statusText: `Plant Offline Cache Ready: ${cachedCount} tiles stored in IndexedDB.`,
    });

    return { cachedCount, totalSizeBytes };
  }

  // --- Clear Map Tile Cache ---
  public async clearCache(): Promise<void> {
    if (!this.isIndexedDbAvailable) return;

    try {
      const db = await this.initDb();
      const tx = db.transaction([TILES_STORE, META_STORE], 'readwrite');
      tx.objectStore(TILES_STORE).clear();
      tx.objectStore(META_STORE).clear();

      tx.oncomplete = () => {
        this.notifyStatsUpdated();
      };
    } catch (err) {
      console.warn('[MapTileCache] Error clearing cache:', err);
    }
  }

  // --- Simulate Offline Mode (for plant testing) ---
  public setSimulatedOffline(isOffline: boolean) {
    this.isSimulatedOffline = isOffline;
    this.notifyStatsUpdated();
  }

  public getIsSimulatedOffline(): boolean {
    return this.isSimulatedOffline;
  }

  // --- Fetch Interceptor for Seamless Transparent Tile Caching ---
  private installFetchInterceptor() {
    if (this.isInterceptorInstalled || typeof window === 'undefined') return;

    try {
      if (typeof window.fetch !== 'function') return;
      const nativeFetch = window.fetch.bind(window);
      this.originalFetch = nativeFetch;
      const self = this;

      const customFetch = async function (input: RequestInfo | URL, init?: RequestInit): Promise<Response> {
        const urlString = typeof input === 'string' ? input : input instanceof Request ? input.url : input.toString();

        // Check if this request is a map tile request
        const isProtomapsTile = urlString.includes('api.protomaps.com/tiles/');
        const isRasterTile =
          urlString.includes('basemaps.cartocdn.com') ||
          urlString.includes('tile.openstreetmap.org') ||
          urlString.includes('/tiles/v3/');

        if (!isProtomapsTile && !isRasterTile) {
          return nativeFetch(input, init);
        }

        // Extract tile coordinates if possible
        const match = urlString.match(/\/(\d+)\/(\d+)\/(\d+)(?:\.([a-z0-9]+))?/i);
        let z: number | undefined;
        let x: number | undefined;
        let y: number | undefined;
        if (match) {
          z = parseInt(match[1], 10);
          x = parseInt(match[2], 10);
          y = parseInt(match[3], 10);
        }

        const tileKey = self.getTileKey(urlString, z, x, y, isProtomapsTile ? 'protomaps' : 'raster');

        // 1. Check IndexedDB cache first
        try {
          const cached = await self.getTile(tileKey);
          if (cached) {
            return new Response(cached.data, {
              status: 200,
              statusText: 'OK (From IndexedDB)',
              headers: {
                'Content-Type': cached.mimeType || (isProtomapsTile ? 'application/x-protobuf' : 'image/png'),
                'X-Cache-Source': 'IndexedDB',
                'X-Zamzam-Plant-Cached': cached.isPlantArea ? 'true' : 'false',
              },
            });
          }
        } catch (err) {
          console.warn('[MapTileCache] IndexedDB read error in fetch interceptor:', err);
        }

        // If simulated offline or device is offline:
        if (self.isSimulatedOffline || (typeof navigator !== 'undefined' && !navigator.onLine)) {
          // Return synthetic empty vector tile or transparent fallback
          if (isProtomapsTile) {
            // Empty protobuf tile response (0 bytes) to prevent crash in protomaps parser
            return new Response(new ArrayBuffer(0), {
              status: 200,
              headers: {
                'Content-Type': 'application/x-protobuf',
                'X-Cache-Source': 'IndexedDB-Offline-Blank',
              },
            });
          } else {
            // Transparent 1x1 png
            const blankPng =
              'data:image/png;base64,iVBORw0KGgoAAAANSUhEUgAAAAEAAAABCAQAAAC1HAwCAAAAC0lEQVR42mNkYAAAAAYAAjCB0C8AAAAASUVORK5CYII=';
            const blob = await (await nativeFetch(blankPng)).blob();
            return new Response(blob, {
              status: 200,
              headers: { 'Content-Type': 'image/png' },
            });
          }
        }

        // 2. Fetch from network
        try {
          const response = await nativeFetch(input, init);
          if (response.ok) {
            // Clone the response so we can store the buffer in IndexedDB
            const clone = response.clone();
            clone
              .arrayBuffer()
              .then((buffer) => {
                if (z !== undefined && x !== undefined && y !== undefined) {
                  const mimeType = response.headers.get('content-type') || (isProtomapsTile ? 'application/x-protobuf' : 'image/png');
                  self.saveTile(tileKey, urlString, buffer, mimeType, z, x, y, isProtomapsTile ? 'protomaps' : 'raster');
                }
              })
              .catch(() => {
                // Ignore background clone errors
              });
          }
          return response;
        } catch (networkErr) {
          // In case network throws (e.g. offline during request)
          if (isProtomapsTile) {
            return new Response(new ArrayBuffer(0), {
              status: 200,
              headers: { 'Content-Type': 'application/x-protobuf' },
            });
          }
          throw networkErr;
        }
      };

      // Safely apply override using defineProperty on window or globalThis
      try {
        Object.defineProperty(window, 'fetch', {
          value: customFetch,
          writable: true,
          configurable: true,
          enumerable: true,
        });
        this.isInterceptorInstalled = true;
      } catch (defineError) {
        try {
          (window as any).fetch = customFetch;
          this.isInterceptorInstalled = true;
        } catch {
          console.warn('[MapTileCache] Window fetch is protected by environment, direct tile caching active.');
        }
      }
    } catch (err) {
      console.warn('[MapTileCache] installFetchInterceptor safely bypassed:', err);
    }
  }

  // --- Subscriptions ---
  public subscribe(listener: (stats: MapCacheStats) => void): () => void {
    this.listeners.add(listener);
    this.getStats().then((stats) => listener(stats));
    return () => {
      this.listeners.delete(listener);
    };
  }

  private async notifyStatsUpdated() {
    const stats = await this.getStats();
    this.listeners.forEach((listener) => {
      try {
        listener(stats);
      } catch {
        // ignore
      }
    });
  }
}

export const mapTileCache = new MapTileCacheService();
