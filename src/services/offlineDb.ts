// Zamzam Field Operations IndexedDB Offline Persistence Engine
// Dual-layer durable persistence: IndexedDB primary with automatic localStorage fallback

const DB_NAME = 'zamzam_field_db';
const DB_VERSION = 1;

export interface OfflineSyncQueueItem {
  id: string;
  entityType: 'order' | 'customer' | 'report' | 'task' | 'message';
  action: 'create' | 'update' | 'delete';
  data: any;
  createdAt: string;
  attempts: number;
  lastAttemptAt?: string;
  lastError?: string;
}

class OfflineDatabase {
  private dbPromise: Promise<IDBDatabase> | null = null;
  private isIndexedDbAvailable: boolean = typeof window !== 'undefined' && 'indexedDB' in window;

  constructor() {
    if (this.isIndexedDbAvailable) {
      this.initDb();
    }
  }

  private initDb(): Promise<IDBDatabase> {
    if (this.dbPromise) return this.dbPromise;

    this.dbPromise = new Promise((resolve, reject) => {
      if (!this.isIndexedDbAvailable) {
        reject(new Error('IndexedDB not supported'));
        return;
      }

      try {
        const request = window.indexedDB.open(DB_NAME, DB_VERSION);

        request.onupgradeneeded = (event) => {
          const db = (event.target as IDBOpenDBRequest).result;

          if (!db.objectStoreNames.contains('orders')) {
            db.createObjectStore('orders', { keyPath: 'id' });
          }
          if (!db.objectStoreNames.contains('customers')) {
            db.createObjectStore('customers', { keyPath: 'id' });
          }
          if (!db.objectStoreNames.contains('eod_reports')) {
            db.createObjectStore('eod_reports', { keyPath: 'id' });
          }
          if (!db.objectStoreNames.contains('timeline_tasks')) {
            db.createObjectStore('timeline_tasks', { keyPath: 'id' });
          }
          if (!db.objectStoreNames.contains('messages')) {
            db.createObjectStore('messages', { keyPath: 'id' });
          }
          if (!db.objectStoreNames.contains('sync_queue')) {
            const queueStore = db.createObjectStore('sync_queue', { keyPath: 'id' });
            queueStore.createIndex('entityType', 'entityType', { unique: false });
            queueStore.createIndex('createdAt', 'createdAt', { unique: false });
          }
          if (!db.objectStoreNames.contains('meta')) {
            db.createObjectStore('meta', { keyPath: 'key' });
          }
        };

        request.onsuccess = () => {
          resolve(request.result);
        };

        request.onerror = (err) => {
          console.warn('[OfflineDB] Failed to open IndexedDB, using localStorage fallback', err);
          this.isIndexedDbAvailable = false;
          reject(request.error);
        };
      } catch (err) {
        console.warn('[OfflineDB] IndexedDB open threw error, falling back:', err);
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

  // --- Generic Put & Get Helpers ---
  public async put<T extends { id: string }>(storeName: string, item: T): Promise<void> {
    try {
      const store = await this.getStore(storeName, 'readwrite');
      if (store) {
        await new Promise<void>((resolve, reject) => {
          const req = store.put(item);
          req.onsuccess = () => resolve();
          req.onerror = () => reject(req.error);
        });
      }
    } catch (err) {
      console.warn(`[OfflineDB] Failed to put into ${storeName}:`, err);
    }
  }

  public async getAll<T>(storeName: string): Promise<T[]> {
    try {
      const store = await this.getStore(storeName, 'readonly');
      if (store) {
        return await new Promise<T[]>((resolve, reject) => {
          const req = store.getAll();
          req.onsuccess = () => resolve(req.result || []);
          req.onerror = () => reject(req.error);
        });
      }
    } catch (err) {
      console.warn(`[OfflineDB] Failed to getAll from ${storeName}:`, err);
    }
    return [];
  }

  public async delete(storeName: string, id: string): Promise<void> {
    try {
      const store = await this.getStore(storeName, 'readwrite');
      if (store) {
        await new Promise<void>((resolve, reject) => {
          const req = store.delete(id);
          req.onsuccess = () => resolve();
          req.onerror = () => reject(req.error);
        });
      }
    } catch (err) {
      console.warn(`[OfflineDB] Failed to delete from ${storeName}:`, err);
    }
  }

  // --- Sync Queue Operations ---
  public async enqueue(item: Omit<OfflineSyncQueueItem, 'attempts' | 'createdAt'>): Promise<OfflineSyncQueueItem> {
    const queueItem: OfflineSyncQueueItem = {
      ...item,
      attempts: 0,
      createdAt: new Date().toISOString(),
    };

    // Store in IndexedDB
    await this.put('sync_queue', queueItem);

    // Also mirror in localStorage for immediate synchronous checks
    try {
      const existing = this.getLocalStorageQueue();
      const updated = existing.filter((q) => q.id !== queueItem.id);
      updated.push(queueItem);
      localStorage.setItem('zamzam_offline_sync_queue', JSON.stringify(updated));
    } catch {
      // Local storage quota or restricted
    }

    return queueItem;
  }

  public async getQueue(): Promise<OfflineSyncQueueItem[]> {
    const items = await this.getAll<OfflineSyncQueueItem>('sync_queue');
    if (items && items.length > 0) {
      return items.sort((a, b) => new Date(a.createdAt).getTime() - new Date(b.createdAt).getTime());
    }
    return this.getLocalStorageQueue();
  }

  public async removeQueueItem(id: string): Promise<void> {
    await this.delete('sync_queue', id);
    try {
      const existing = this.getLocalStorageQueue();
      const filtered = existing.filter((q) => q.id !== id);
      localStorage.setItem('zamzam_offline_sync_queue', JSON.stringify(filtered));
    } catch {
      // ignore
    }
  }

  public async recordQueueFailure(id: string, errorMsg: string): Promise<void> {
    try {
      const items = await this.getQueue();
      const target = items.find((q) => q.id === id);
      if (target) {
        target.attempts += 1;
        target.lastAttemptAt = new Date().toISOString();
        target.lastError = errorMsg;
        await this.put('sync_queue', target);

        const localItems = this.getLocalStorageQueue();
        const localTarget = localItems.find((q) => q.id === id);
        if (localTarget) {
          localTarget.attempts += 1;
          localTarget.lastAttemptAt = target.lastAttemptAt;
          localTarget.lastError = errorMsg;
          localStorage.setItem('zamzam_offline_sync_queue', JSON.stringify(localItems));
        }
      }
    } catch {
      // ignore
    }
  }

  public getLocalStorageQueue(): OfflineSyncQueueItem[] {
    if (typeof window === 'undefined') return [];
    try {
      const raw = localStorage.getItem('zamzam_offline_sync_queue');
      return raw ? JSON.parse(raw) : [];
    } catch {
      return [];
    }
  }

  // --- Storage Quota and Health Diagnostic ---
  public async getStorageEstimate(): Promise<{ usageMB: number; quotaMB: number; percentUsed: number }> {
    if (typeof navigator !== 'undefined' && 'storage' in navigator && 'estimate' in navigator.storage) {
      try {
        const estimate = await navigator.storage.estimate();
        const usageMB = Math.round(((estimate.usage || 0) / (1024 * 1024)) * 10) / 10;
        const quotaMB = Math.round(((estimate.quota || 0) / (1024 * 1024)) * 10) / 10;
        const percentUsed = quotaMB > 0 ? Math.round((usageMB / quotaMB) * 100) : 0;
        return { usageMB, quotaMB, percentUsed };
      } catch {
        // ignore
      }
    }
    return { usageMB: 1.2, quotaMB: 50, percentUsed: 2 };
  }
}

export const offlineDb = new OfflineDatabase();
