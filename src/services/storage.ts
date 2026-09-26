import {
  Product,
  Customer,
  CustomerSyncLogEntry,
  CustomerInteraction,
  Order,
  EodReport,
  ChatMessage,
  ActivityLogEntry,
  TimelineTask,
  UserProfile,
  BiometricCredential,
} from '../types';
import { supabase } from '../lib/supabase';
import { offlineDb } from './offlineDb';
import { requestBackgroundSync } from './serviceWorkerRegistration';

const STORAGE_KEYS = {
  ORDERS: 'zamzam_orders',
  CUSTOMERS: 'zamzam_customers',
  INTERACTIONS: 'zamzam_customer_interactions',
  REPORTS: 'zamzam_eod_reports',
  MESSAGES: 'zamzam_messages',
  LOGS: 'zamzam_activity_logs',
  TASKS: 'zamzam_tasks',
  OFFLINE_QUEUE: 'zamzam_offline_queue',
  USER_PREFS: 'zamzam_user_prefs',
  USER_PROFILE: 'zamzam_user_profile',
  BIOMETRICS: 'zamzam_biometric_credentials',
  LAST_SYNC: 'zamzam_last_sync_timestamp',
  PRODUCTS: 'zamzam_products',
};

// Production catalog for Zamzam pure water products
export const INITIAL_PRODUCTS: Product[] = [
  {
    id: 'prod-1',
    name: 'ZAMZAM Pure Drinking Water',
    size: '13L',
    price: 5000,
    unit: 'Bottle',
    stockAvailable: 150,
  },
  {
    id: 'prod-2',
    name: 'ZAMZAM Pure Drinking Water',
    size: '18.9L',
    price: 8000,
    unit: 'Bottle',
    stockAvailable: 220,
  },
  {
    id: 'prod-3',
    name: 'ZAMZAM Pure Drinking Water',
    size: '18.9L/R',
    price: 5000,
    unit: 'Bottle (Refill)',
    stockAvailable: 180,
  },
];

// Production state: all customer, order, task, and message lists start clean without mock data
export const INITIAL_CUSTOMERS: Customer[] = [];
export const INITIAL_TASKS: TimelineTask[] = [];
export const INITIAL_MESSAGES: ChatMessage[] = [];
export const INITIAL_ORDERS: Order[] = [];

// Clean up any legacy demo mock records from previous testing sessions
const purgeDemoMockData = () => {
  if (typeof window === 'undefined') return;
  try {
    const ordersRaw = localStorage.getItem(STORAGE_KEYS.ORDERS);
    if (ordersRaw && ordersRaw.includes('ord-1001')) {
      localStorage.removeItem(STORAGE_KEYS.ORDERS);
    }
    const custsRaw = localStorage.getItem(STORAGE_KEYS.CUSTOMERS);
    if (custsRaw && custsRaw.includes('cust-1')) {
      localStorage.removeItem(STORAGE_KEYS.CUSTOMERS);
    }
    const tasksRaw = localStorage.getItem(STORAGE_KEYS.TASKS);
    if (tasksRaw && tasksRaw.includes('task-1')) {
      localStorage.removeItem(STORAGE_KEYS.TASKS);
    }
    const msgsRaw = localStorage.getItem(STORAGE_KEYS.MESSAGES);
    if (msgsRaw && msgsRaw.includes('msg-1')) {
      localStorage.removeItem(STORAGE_KEYS.MESSAGES);
    }
    const logsRaw = localStorage.getItem(STORAGE_KEYS.LOGS);
    if (logsRaw && logsRaw.includes('log-1')) {
      localStorage.removeItem(STORAGE_KEYS.LOGS);
    }
  } catch {
    // ignore
  }
};

purgeDemoMockData();

class StorageService {
  private isOnlineStatus: boolean = typeof navigator !== 'undefined' ? navigator.onLine : true;
  private isSyncingInProgress: boolean = false;
  private listeners: Array<(online: boolean) => void> = [];
  private syncListeners: Array<(isSyncing: boolean) => void> = [];

  constructor() {
    if (typeof window !== 'undefined') {
      window.addEventListener('online', () => this.handleNetworkChange(true));
      window.addEventListener('offline', () => this.handleNetworkChange(false));
      
      // Auto-sync when window re-gains focus or comes back from sleep
      window.addEventListener('focus', () => {
        this.checkConnectivity();
      });
      document.addEventListener('visibilitychange', () => {
        if (document.visibilityState === 'visible') {
          this.checkConnectivity();
        }
      });

      // Listen for Service Worker background sync notification
      window.addEventListener('zamzam:sw-sync', () => {
        console.log('[Storage] SW background sync event received');
        this.syncPendingQueue();
      });

      // Initial dual-layer cache hydration
      this.hydrateIndexedDb();

      // Proactive connectivity and auto-sync check loop (every 20 seconds)
      setInterval(() => {
        this.checkConnectivity();
        if (this.isOnlineStatus && this.getPendingSyncCount() > 0 && !this.isSyncingInProgress) {
          this.syncPendingQueue();
        }
      }, 20000);

      // Background cloud data fetch on boot
      this.fetchCustomersFromCloud();
      this.fetchOrdersFromCloud();
    }
  }

  // Populate IndexedDB with existing local records for offline durability
  private async hydrateIndexedDb() {
    try {
      const orders = this.getOrders();
      for (const ord of orders) {
        await offlineDb.put('orders', ord);
      }
      const customers = this.getCustomers();
      for (const cust of customers) {
        await offlineDb.put('customers', cust);
      }
      const reports = this.getReports();
      for (const rep of reports) {
        await offlineDb.put('eod_reports', rep);
      }
    } catch (err) {
      console.warn('[Storage] Hydration error (non-fatal):', err);
    }
  }

  public async checkConnectivity(): Promise<boolean> {
    if (typeof window === 'undefined') return true;
    if (!navigator.onLine) {
      if (this.isOnlineStatus) this.handleNetworkChange(false);
      return false;
    }
    try {
      // Fast lightweight endpoint probe to verify actual end-to-end connectivity
      const controller = new AbortController();
      const timeoutId = setTimeout(() => controller.abort(), 4000);
      const res = await fetch('/api/health', {
        method: 'GET',
        cache: 'no-store',
        signal: controller.signal,
      });
      clearTimeout(timeoutId);
      const isActuallyOnline = res.ok;
      if (isActuallyOnline !== this.isOnlineStatus) {
        this.handleNetworkChange(isActuallyOnline);
      }
      return isActuallyOnline;
    } catch {
      if (this.isOnlineStatus) {
        this.handleNetworkChange(false);
      }
      return false;
    }
  }

  private handleNetworkChange(online: boolean) {
    const wasOffline = !this.isOnlineStatus;
    this.isOnlineStatus = online;
    this.listeners.forEach((fn) => fn(online));
    if (online) {
      this.addActivityLog({
        action: 'network_online',
        entityType: 'network',
        entityId: 'net-' + Date.now(),
        description: 'Internet connection restored. Initiating automatic field data synchronization.',
        status: 'success',
      });
      // Automatically sync cached records when coming back online
      if (wasOffline || this.getPendingSyncCount() > 0) {
        this.syncPendingQueue();
      }
      this.fetchCustomersFromCloud();
      this.fetchOrdersFromCloud();
    } else {
      this.addActivityLog({
        action: 'network_offline',
        entityType: 'network',
        entityId: 'net-' + Date.now(),
        description: 'Internet connection lost. Offline-first local state and service worker caching active.',
        status: 'warning',
      });
    }
  }

  public onNetworkChange(callback: (online: boolean) => void) {
    this.listeners.push(callback);
    return () => {
      this.listeners = this.listeners.filter((fn) => fn !== callback);
    };
  }

  public onSyncStatusChange(callback: (isSyncing: boolean) => void) {
    this.syncListeners.push(callback);
    return () => {
      this.syncListeners = this.syncListeners.filter((fn) => fn !== callback);
    };
  }

  private notifySyncListeners(isSyncing: boolean) {
    this.isSyncingInProgress = isSyncing;
    this.syncListeners.forEach((fn) => fn(isSyncing));
  }

  public isOnline(): boolean {
    return this.isOnlineStatus;
  }

  public isSyncing(): boolean {
    return this.isSyncingInProgress;
  }

  public getLastSyncTime(): string | null {
    if (typeof window === 'undefined') return null;
    return localStorage.getItem(STORAGE_KEYS.LAST_SYNC);
  }

  public setLastSyncTime(timestamp: string) {
    if (typeof window !== 'undefined') {
      localStorage.setItem(STORAGE_KEYS.LAST_SYNC, timestamp);
    }
  }

  // --- Products Catalog (Supabase Table: https://jwlvtpnhibtmalfdcmbu.supabase.co/rest/v1/products) ---
  public getProducts(): Product[] {
    const enforceStandard18Price = (list: Product[]) =>
      list.map((p) => {
        if (
          p.id === 'prod-2' ||
          p.id === '2' ||
          (p.size === '18.9L' &&
            !p.name?.includes('/R') &&
            !p.name?.includes('Refill') &&
            !p.unit?.toLowerCase().includes('refill') &&
            !p.name?.includes('NEW'))
        ) {
          return { ...p, price: 8000 };
        }
        return p;
      });

    if (typeof window === 'undefined') return enforceStandard18Price(INITIAL_PRODUCTS);
    const raw = localStorage.getItem(STORAGE_KEYS.PRODUCTS);
    if (!raw) return enforceStandard18Price(INITIAL_PRODUCTS);
    try {
      const parsed = JSON.parse(raw);
      if (Array.isArray(parsed) && parsed.length > 0) return enforceStandard18Price(parsed);
    } catch {
      // fallback
    }
    return enforceStandard18Price(INITIAL_PRODUCTS);
  }

  public saveProducts(products: Product[]): void {
    if (typeof window !== 'undefined') {
      localStorage.setItem(STORAGE_KEYS.PRODUCTS, JSON.stringify(products));
    }
  }

  public async fetchProductsFromCloud(): Promise<Product[]> {
    // 1. Try direct Supabase query
    try {
      const { data, error } = await supabase
        .from('products')
        .select('*')
        .order('id', { ascending: true });

      if (!error && Array.isArray(data) && data.length > 0) {
        const mapped = this.mapSupabaseProducts(data);
        this.saveProducts(mapped);
        return mapped;
      }
    } catch (err) {
      console.warn('[Storage] Direct Supabase product query fallback:', err);
    }

    // 2. Try proxy endpoint /api/products which connects to https://jwlvtpnhibtmalfdcmbu.supabase.co/rest/v1/products
    try {
      const res = await fetch('/api/products');
      if (res.ok) {
        const json = await res.json();
        if (json.success && Array.isArray(json.products) && json.products.length > 0) {
          const mapped = this.mapSupabaseProducts(json.products);
          this.saveProducts(mapped);
          return mapped;
        }
      }
    } catch (apiErr) {
      console.warn('[Storage] API products query fallback:', apiErr);
    }

    return this.getProducts();
  }

  private mapSupabaseProducts(rows: any[]): Product[] {
    return rows.map((p: any) => {
      const name = String(p.name || 'ZAMZAM Pure Drinking Water');
      const sizeMatch = name.match(/(18\.9L\/R-NEW|18\.9L\/R|18\.9L|13L|\d+(?:\.\d+)?\s*[a-zA-Z\/]+)/i);
      const size = p.size || (sizeMatch ? sizeMatch[1] : '18.9L');

      let unit = p.unit;
      if (!unit) {
        if (name.includes('Refill') || (name.includes('/R') && !name.includes('NEW'))) {
          unit = 'Bottle (Refill)';
        } else if (name.includes('NEW')) {
          unit = 'New Bottle + Water';
        } else {
          unit = 'Bottle';
        }
      }

      let price = Number(p.price) || 5000;
      if (
        String(p.id) === '2' ||
        (size === '18.9L' &&
          !name.includes('/R') &&
          !name.includes('Refill') &&
          !unit?.toLowerCase().includes('refill') &&
          !name.includes('NEW'))
      ) {
        price = 8000;
      }

      return {
        id: p.id ? String(p.id) : `prod-${Math.random().toString(36).slice(2, 7)}`,
        name: name,
        size: size,
        price: price,
        unit: unit,
        stockAvailable: Number(p.stock_available ?? p.stockAvailable ?? (name.includes('13L') ? 150 : 200)),
        description: p.description || undefined,
        currency: p.currency || 'TZS',
      };
    });
  }

  // --- Customers ---
  private customerSyncLogs: CustomerSyncLogEntry[] = [];
  private customerLogListeners: Array<(entry: CustomerSyncLogEntry) => void> = [];

  public getCustomerSyncLogs(): CustomerSyncLogEntry[] {
    return [...this.customerSyncLogs];
  }

  public clearCustomerSyncLogs(): void {
    this.customerSyncLogs = [];
  }

  public onCustomerSyncLog(cb: (entry: CustomerSyncLogEntry) => void): () => void {
    this.customerLogListeners.push(cb);
    return () => {
      this.customerLogListeners = this.customerLogListeners.filter((l) => l !== cb);
    };
  }

  private appendCustomerLog(
    entry: Omit<CustomerSyncLogEntry, 'id' | 'timestamp' | 'tableName'> & { count?: number; data?: any }
  ) {
    const fullEntry: CustomerSyncLogEntry = {
      id: 'log-' + Date.now() + '-' + Math.random().toString(36).substring(2, 7),
      timestamp:
        new Date().toLocaleTimeString() + '.' + String(new Date().getMilliseconds()).padStart(3, '0'),
      tableName: 'customers',
      ...entry,
    };
    this.customerSyncLogs.unshift(fullEntry);
    if (this.customerSyncLogs.length > 100) {
      this.customerSyncLogs.pop();
    }
    this.customerLogListeners.forEach((listener) => {
      try {
        listener(fullEntry);
      } catch {}
    });
  }

  public getCustomers(): Customer[] {
    const raw = localStorage.getItem(STORAGE_KEYS.CUSTOMERS);
    if (!raw) {
      return [];
    }
    try {
      return JSON.parse(raw);
    } catch {
      return [];
    }
  }

  /**
   * Fetch and log customers list from the "customers" table in Supabase
   */
  public async fetchAndLogCustomersFromSupabase(): Promise<Customer[]> {
    console.group('%c[Supabase:customers] 📡 Fetching Customer List from "customers" Table', 'color: #00C46A; font-weight: bold; font-size: 13px;');
    console.log('[Supabase:customers] Target Table: "customers"');
    console.log('[Supabase:customers] Remote Endpoint: https://jwlvtpnhibtmalfdcmbu.supabase.co/rest/v1/customers?select=*&order=created_at.desc');
    console.log('[Supabase:customers] Query Timestamp:', new Date().toISOString());

    this.appendCustomerLog({
      direction: 'FROM_SUPABASE',
      action: 'FETCH',
      status: 'INFO',
      message: 'Querying Supabase "customers" table (SELECT * FROM customers ORDER BY created_at DESC)...',
    });

    let rawData: any[] = [];
    let fetchSource = 'direct';

    try {
      // 1. First attempt: Direct Supabase client query
      const { data, error } = await supabase.from('customers').select('*').order('created_at', { ascending: false });

      if (!error && Array.isArray(data)) {
        rawData = data;
        fetchSource = 'direct-supabase-client';
      } else {
        if (error) {
          console.warn('[Supabase:customers] Direct client query notice (RLS or anon):', error.message);
        }
        // 2. Second attempt: Authenticated backend proxy /api/customers
        const proxyRes = await fetch('/api/customers');
        if (proxyRes.ok) {
          const json = await proxyRes.json();
          if (json.success && Array.isArray(json.customers)) {
            rawData = json.customers;
            fetchSource = 'authenticated-proxy-api';
          }
        }
      }
    } catch (err: any) {
      console.warn('[Supabase:customers] Direct client call failed, attempting proxy fallback:', err);
      try {
        const proxyRes = await fetch('/api/customers');
        if (proxyRes.ok) {
          const json = await proxyRes.json();
          if (json.success && Array.isArray(json.customers)) {
            rawData = json.customers;
            fetchSource = 'authenticated-proxy-api';
          }
        }
      } catch (proxyErr) {
        console.error('[Supabase:customers] Both direct and proxy queries failed:', proxyErr);
      }
    }

    if (rawData && rawData.length > 0) {
      const cloudCustomers: Customer[] = rawData.map((c: any) => ({
        id: c.id?.toString() || 'cust-' + Date.now(),
        name: c.name || 'Unnamed Client',
        phone: c.phone || '',
        address: c.address || '',
        notes: c.notes || '',
        createdAt: c.created_at || new Date().toISOString(),
        syncStatus: 'synced' as const,
      }));

      // Merge with existing local customers (preserving any unique local unsynced ones)
      const existing = this.getCustomers();
      const cloudIdMap = new Map(cloudCustomers.map((c) => [c.id, c]));
      const preservedLocals = existing.filter((e) => e.syncStatus === 'pending' && !cloudIdMap.has(e.id));
      const combined = [...cloudCustomers, ...preservedLocals];

      localStorage.setItem(STORAGE_KEYS.CUSTOMERS, JSON.stringify(combined));
      cloudCustomers.forEach((c) => offlineDb.put('customers', c));

      // Formatted Console Logging
      console.log(`%c[Supabase:customers] ✅ Successfully fetched & logged ${cloudCustomers.length} customer records from "customers" table via ${fetchSource}:`, 'color: #00E67A; font-weight: bold;');
      console.table(
        cloudCustomers.map((c) => ({
          'Customer ID': c.id,
          'Full Name': c.name,
          'Phone': c.phone,
          'Address': c.address,
          'Created At': c.createdAt,
          'Cloud Status': c.syncStatus,
        }))
      );
      console.log('[Supabase:customers] Raw Payload from Supabase:', rawData);
      console.groupEnd();

      this.appendCustomerLog({
        direction: 'FROM_SUPABASE',
        action: 'FETCH',
        status: 'SUCCESS',
        count: cloudCustomers.length,
        message: `Successfully fetched and logged ${cloudCustomers.length} customer records from Supabase "customers" table via ${fetchSource}.`,
        data: cloudCustomers,
      });

      this.addActivityLog({
        action: 'customers_fetched_from_supabase',
        entityType: 'customer',
        entityId: 'supabase-customers-table',
        description: `Fetched and logged ${cloudCustomers.length} customers from Supabase "customers" table`,
        status: 'success',
      });

      return combined;
    } else {
      console.log('%c[Supabase:customers] ℹ️ Supabase "customers" table returned 0 records (empty table).', 'color: #F59E0B; font-weight: bold;');
      console.groupEnd();

      this.appendCustomerLog({
        direction: 'FROM_SUPABASE',
        action: 'FETCH',
        status: 'INFO',
        count: 0,
        message: 'Supabase "customers" table returned 0 records (empty table).',
      });

      return this.getCustomers();
    }
  }

  public async fetchCustomersFromCloud(): Promise<Customer[]> {
    return this.fetchAndLogCustomersFromSupabase();
  }

  /**
   * Log and send a single customer to the "customers" table in Supabase
   */
  public async logCustomerToSupabase(customerData: {
    name: string;
    phone?: string;
    address?: string;
    notes?: string;
  }): Promise<{ success: boolean; customer: Customer; error?: string }> {
    console.group('%c[Supabase:customers] 📤 Sending Customer Record to "customers" Table', 'color: #00E67A; font-weight: bold; font-size: 13px;');
    console.log('[Supabase:customers] Target Table: "customers"');
    console.log('[Supabase:customers] Payload being logged and sent to Supabase:', customerData);
    console.log('[Supabase:customers] Timestamp:', new Date().toISOString());

    this.appendCustomerLog({
      direction: 'TO_SUPABASE',
      action: 'INSERT',
      status: 'INFO',
      message: `Sending customer "${customerData.name}" to Supabase "customers" table...`,
      data: customerData,
    });

    let insertedRecord: any = null;
    let methodUsed = 'direct';

    try {
      // 1. Direct Supabase insert
      const { data, error } = await supabase
        .from('customers')
        .insert({
          name: customerData.name,
          phone: customerData.phone || '',
          address: customerData.address || '',
          notes: customerData.notes || '',
        })
        .select();

      if (!error && data && data.length > 0) {
        insertedRecord = data[0];
        methodUsed = 'direct-supabase-client';
      } else {
        if (error) console.warn('[Supabase:customers] Direct insert returned:', error.message);
        // 2. Proxy fallback with authenticated staff token
        const res = await fetch('/api/customers', {
          method: 'POST',
          headers: { 'Content-Type': 'application/json' },
          body: JSON.stringify(customerData),
        });
        if (res.ok) {
          const json = await res.json();
          if (json.success && json.customer) {
            insertedRecord = json.customer;
            methodUsed = 'authenticated-proxy-api';
          }
        }
      }
    } catch (err: any) {
      console.warn('[Supabase:customers] Direct insert failed, trying proxy:', err);
      try {
        const res = await fetch('/api/customers', {
          method: 'POST',
          headers: { 'Content-Type': 'application/json' },
          body: JSON.stringify(customerData),
        });
        if (res.ok) {
          const json = await res.json();
          if (json.success && json.customer) {
            insertedRecord = json.customer;
            methodUsed = 'authenticated-proxy-api';
          }
        }
      } catch (proxyErr: any) {
        console.error('[Supabase:customers] Proxy insert also failed:', proxyErr);
      }
    }

    const savedCustomer: Customer = {
      id: insertedRecord?.id?.toString() || 'cust-' + Date.now(),
      name: customerData.name,
      phone: customerData.phone || '',
      address: customerData.address || '',
      notes: customerData.notes || '',
      createdAt: insertedRecord?.created_at || new Date().toISOString(),
      syncStatus: insertedRecord ? 'synced' : 'pending',
    };

    // Save locally
    const currentCustomers = this.getCustomers();
    const existingIdx = currentCustomers.findIndex(
      (c) => c.id === savedCustomer.id || (c.name === savedCustomer.name && c.phone === savedCustomer.phone)
    );
    if (existingIdx >= 0) {
      currentCustomers[existingIdx] = savedCustomer;
    } else {
      currentCustomers.unshift(savedCustomer);
    }
    localStorage.setItem(STORAGE_KEYS.CUSTOMERS, JSON.stringify(currentCustomers));
    offlineDb.put('customers', savedCustomer);

    if (insertedRecord) {
      console.log(`%c[Supabase:customers] ✅ Successfully inserted into "customers" table via ${methodUsed}:`, 'color: #00C46A; font-weight: bold;', insertedRecord);
      console.table([
        {
          'Supabase Record ID': insertedRecord.id,
          'Name': insertedRecord.name,
          'Phone': insertedRecord.phone,
          'Address': insertedRecord.address,
          'Created At': insertedRecord.created_at,
          'Method': methodUsed,
        },
      ]);
      console.groupEnd();

      this.appendCustomerLog({
        direction: 'TO_SUPABASE',
        action: 'INSERT',
        status: 'SUCCESS',
        message: `Successfully inserted & logged customer "${savedCustomer.name}" into Supabase "customers" table (ID: ${savedCustomer.id}).`,
        data: insertedRecord,
      });

      this.addActivityLog({
        action: 'customer_inserted_to_supabase',
        entityType: 'customer',
        entityId: savedCustomer.id,
        description: `Logged and inserted customer "${savedCustomer.name}" to Supabase "customers" table`,
        status: 'success',
      });

      return { success: true, customer: savedCustomer };
    } else {
      console.warn('[Supabase:customers] ⚠️ Cloud insert offline/queued. Saved to local IndexedDB with syncStatus="pending".');
      console.groupEnd();

      offlineDb.enqueue({
        id: savedCustomer.id,
        entityType: 'customer',
        action: 'create',
        data: savedCustomer,
      });

      this.appendCustomerLog({
        direction: 'TO_SUPABASE',
        action: 'INSERT',
        status: 'ERROR',
        message: `Customer "${savedCustomer.name}" queued offline; pending background sync to Supabase "customers" table.`,
        data: savedCustomer,
      });

      return { success: false, customer: savedCustomer, error: 'Queued offline for sync' };
    }
  }

  /**
   * Sync all pending or local customers to Supabase "customers" table and log results
   */
  public async syncAndLogAllCustomersToSupabase(): Promise<{ total: number; synced: number; failed: number; customers: Customer[] }> {
    console.group('%c[Supabase:customers] 🔄 Synchronizing Local Customers to Supabase "customers" Table', 'color: #00E67A; font-weight: bold; font-size: 13px;');
    const customers = this.getCustomers();
    console.log(`[Supabase:customers] Total local customer records: ${customers.length}`);

    this.appendCustomerLog({
      direction: 'TO_SUPABASE',
      action: 'SYNC',
      status: 'INFO',
      message: `Starting bulk sync of ${customers.length} customer records to Supabase "customers" table...`,
    });

    let syncedCount = 0;
    let failedCount = 0;

    for (const customer of customers) {
      if (customer.syncStatus !== 'synced') {
        try {
          const res = await this.logCustomerToSupabase({
            name: customer.name,
            phone: customer.phone,
            address: customer.address,
            notes: customer.notes,
          });
          if (res.success) {
            syncedCount++;
            customer.syncStatus = 'synced';
          } else {
            failedCount++;
          }
        } catch {
          failedCount++;
        }
      }
    }

    console.log(`[Supabase:customers] 🏁 Synchronization complete: ${syncedCount} synced, ${failedCount} pending/failed.`);
    console.groupEnd();

    this.appendCustomerLog({
      direction: 'TO_SUPABASE',
      action: 'SYNC',
      status: 'SUCCESS',
      count: syncedCount,
      message: `Completed sync to Supabase "customers" table: ${syncedCount} records synced, ${failedCount} pending/failed.`,
    });

    // Re-fetch fresh state from cloud
    const updated = await this.fetchAndLogCustomersFromSupabase();
    return { total: customers.length, synced: syncedCount, failed: failedCount, customers: updated };
  }

  public saveCustomer(customer: Omit<Customer, 'id' | 'createdAt'>): Customer {
    const customers = this.getCustomers();
    const isOnline = this.isOnlineStatus;
    const newCustomer: Customer = {
      ...customer,
      id: 'cust-' + Date.now(),
      createdAt: new Date().toISOString(),
      syncStatus: isOnline ? 'synced' : 'pending',
    };
    customers.unshift(newCustomer);
    localStorage.setItem(STORAGE_KEYS.CUSTOMERS, JSON.stringify(customers));

    // Durable persistence into IndexedDB
    offlineDb.put('customers', newCustomer);

    // Log & push to Supabase
    this.logCustomerToSupabase(customer).catch((err) => {
      console.warn('[Storage] Background Supabase customer sync error:', err);
    });

    return newCustomer;
  }

  public deleteCustomer(id: string) {
    const customers = this.getCustomers().filter((c) => c.id !== id);
    localStorage.setItem(STORAGE_KEYS.CUSTOMERS, JSON.stringify(customers));
    offlineDb.delete('customers', id);
  }

  // --- Customer Interactions & History ---
  public getCustomerInteractions(customerId?: string, customerName?: string): CustomerInteraction[] {
    const raw = typeof window !== 'undefined' ? localStorage.getItem(STORAGE_KEYS.INTERACTIONS) : null;
    let list: CustomerInteraction[] = [];
    if (raw) {
      try {
        list = JSON.parse(raw);
      } catch {
        list = [];
      }
    }

    if (!customerId && !customerName) {
      return list.sort((a, b) => new Date(b.timestamp).getTime() - new Date(a.timestamp).getTime());
    }

    const filtered = list.filter((item) => {
      if (customerId && item.customerId === customerId) return true;
      if (customerName && item.customerName.toLowerCase() === customerName.toLowerCase()) return true;
      return false;
    });

    return filtered.sort((a, b) => new Date(b.timestamp).getTime() - new Date(a.timestamp).getTime());
  }

  public addCustomerInteraction(
    interaction: Omit<CustomerInteraction, 'id' | 'timestamp'>
  ): CustomerInteraction {
    const fullInteraction: CustomerInteraction = {
      ...interaction,
      id: 'int-' + Date.now(),
      timestamp: new Date().toISOString(),
      syncStatus: this.isOnlineStatus ? 'synced' : 'pending',
    };

    const list = this.getCustomerInteractions();
    list.unshift(fullInteraction);
    if (typeof window !== 'undefined') {
      localStorage.setItem(STORAGE_KEYS.INTERACTIONS, JSON.stringify(list.slice(0, 500)));
    }

    this.addActivityLog({
      action: 'customer_interaction_logged',
      entityType: 'customer',
      entityId: fullInteraction.customerId,
      description: `Logged [${fullInteraction.type.toUpperCase()}] for ${fullInteraction.customerName}: ${fullInteraction.title}`,
      status: 'success',
    });

    return fullInteraction;
  }

  public getCustomerOrders(customerId: string, customerName: string): Order[] {
    const allOrders = this.getOrders();
    const cName = customerName ? customerName.trim().toLowerCase() : '';
    return allOrders.filter((ord) => {
      if (ord.customerId && ord.customerId === customerId) return true;
      if (cName && ord.customerName && ord.customerName.trim().toLowerCase() === cName) return true;
      return false;
    }).sort((a, b) => new Date(b.createdAt).getTime() - new Date(a.createdAt).getTime());
  }

  // --- Orders ---
  public getOrders(): Order[] {
    const raw = localStorage.getItem(STORAGE_KEYS.ORDERS);
    if (!raw) {
      return [];
    }
    try {
      return JSON.parse(raw);
    } catch {
      return [];
    }
  }

  public async fetchOrdersFromCloud(): Promise<Order[]> {
    try {
      const { data, error } = await supabase.from('orders').select('*').order('created_at', { ascending: false });
      if (!error && data && data.length > 0) {
        const cloudOrders: Order[] = data.map((o: any) => ({
          id: o.id?.toString() || 'ord-' + Date.now(),
          staffId: o.staff_id || '',
          customerName: o.customer_name || 'Client',
          paymentMethod: o.payment_method || 'cash',
          items: o.items || [],
          subtotal: Number(o.subtotal) || 0,
          amountReceived: Number(o.amount_received) || Number(o.subtotal) || 0,
          changeAmount: Number(o.change_amount) || 0,
          syncStatus: 'synced',
          createdAt: o.created_at || new Date().toISOString(),
          status: o.status || 'pending',
        }));
        localStorage.setItem(STORAGE_KEYS.ORDERS, JSON.stringify(cloudOrders));
        for (const co of cloudOrders) {
          offlineDb.put('orders', co);
        }
        return cloudOrders;
      }
    } catch {
      // offline or table not present
    }
    return this.getOrders();
  }

  public async saveOrder(orderData: Omit<Order, 'id' | 'createdAt' | 'syncStatus'>): Promise<Order> {
    const id = 'ord-' + Date.now();
    const isOnline = this.isOnlineStatus;
    const order: Order = {
      ...orderData,
      id,
      localId: id,
      syncStatus: isOnline ? 'synced' : 'pending',
      createdAt: new Date().toISOString(),
      status: 'pending',
    };

    const orders = this.getOrders();
    orders.unshift(order);
    localStorage.setItem(STORAGE_KEYS.ORDERS, JSON.stringify(orders));

    // Durable persistence in IndexedDB
    await offlineDb.put('orders', order);

    this.addActivityLog({
      action: 'order_created',
      entityType: 'order',
      entityId: order.id,
      description: `Order created for ${order.customerName} - TZS ${order.subtotal.toLocaleString()} (${isOnline ? 'Online' : 'Saved to Local Cache'})`,
      status: 'success',
    });

    if (isOnline) {
      try {
        await supabase.from('orders').insert({
          customer_name: order.customerName,
          payment_method: order.paymentMethod,
          items: order.items,
          subtotal: order.subtotal,
          amount_received: order.amountReceived,
          change_amount: order.changeAmount,
          sync_status: 'synced',
          status: 'pending',
          created_at: order.createdAt,
        });
      } catch (err) {
        console.warn('Direct supabase order insert failed, queued to offline DB', err);
        order.syncStatus = 'pending';
        localStorage.setItem(STORAGE_KEYS.ORDERS, JSON.stringify(orders));
        await offlineDb.enqueue({
          id: order.id,
          entityType: 'order',
          action: 'create',
          data: order,
        });
      }
    } else {
      await offlineDb.enqueue({
        id: order.id,
        entityType: 'order',
        action: 'create',
        data: order,
      });
      requestBackgroundSync();
    }

    return order;
  }

  public updateOrderStatus(orderId: string, status: 'approved' | 'rejected') {
    const orders = this.getOrders();
    const order = orders.find((o) => o.id === orderId);
    if (order) {
      order.status = status;
      localStorage.setItem(STORAGE_KEYS.ORDERS, JSON.stringify(orders));
      this.addActivityLog({
        action: status === 'approved' ? 'order_approved' : 'order_rejected',
        entityType: 'order',
        entityId: orderId,
        description: `Order ${orderId} was ${status} by supervisor`,
        status: 'success',
      });
      if (this.isOnlineStatus) {
        supabase.from('orders').update({ status }).eq('id', orderId).then(() => {}, () => {});
      }
    }
  }

  // --- User Profile ---
  public getUser(): UserProfile | null {
    const raw = localStorage.getItem(STORAGE_KEYS.USER_PROFILE);
    if (!raw) return null;
    try {
      return JSON.parse(raw);
    } catch {
      return null;
    }
  }

  public setUser(user: UserProfile | null) {
    if (!user) {
      localStorage.removeItem(STORAGE_KEYS.USER_PROFILE);
    } else {
      localStorage.setItem(STORAGE_KEYS.USER_PROFILE, JSON.stringify(user));
    }
  }

  // --- Biometric / WebAuthn Credentials ---
  public getBiometricCredentials(): BiometricCredential[] {
    const raw = localStorage.getItem(STORAGE_KEYS.BIOMETRICS);
    if (!raw) return [];
    try {
      return JSON.parse(raw);
    } catch {
      return [];
    }
  }

  public saveBiometricCredential(cred: BiometricCredential): void {
    const existing = this.getBiometricCredentials();
    const filtered = existing.filter((c) => c.id !== cred.id);
    filtered.push(cred);
    localStorage.setItem(STORAGE_KEYS.BIOMETRICS, JSON.stringify(filtered));
  }

  public removeBiometricCredential(credentialId: string): void {
    const existing = this.getBiometricCredentials();
    const filtered = existing.filter((c) => c.id !== credentialId);
    localStorage.setItem(STORAGE_KEYS.BIOMETRICS, JSON.stringify(filtered));
  }

  // --- EOD Reports ---
  public getReports(): EodReport[] {
    const raw = localStorage.getItem(STORAGE_KEYS.REPORTS);
    if (!raw) return [];
    try {
      return JSON.parse(raw);
    } catch {
      return [];
    }
  }

  public async saveReport(reportData: Omit<EodReport, 'id' | 'createdAt' | 'syncStatus'>): Promise<EodReport> {
    const id = 'eod-' + Date.now();
    const isOnline = this.isOnlineStatus;
    const report: EodReport = {
      ...reportData,
      id,
      localId: id,
      syncStatus: isOnline ? 'submitted' : 'pending',
      createdAt: new Date().toISOString(),
    };

    const reports = this.getReports();
    reports.unshift(report);
    localStorage.setItem(STORAGE_KEYS.REPORTS, JSON.stringify(reports));

    // Durable persistence in IndexedDB
    await offlineDb.put('eod_reports', report);

    this.addActivityLog({
      action: 'eod_submitted',
      entityType: 'eod_report',
      entityId: report.id,
      description: `End of Day Report submitted - Total TZS ${report.totalRevenue.toLocaleString()} (${report.totalDeliveries} deliveries, ${isOnline ? 'Direct Cloud' : 'Cached Offline'})`,
      status: 'success',
    });

    if (isOnline) {
      try {
        await supabase.from('eod_reports').insert({
          staff_id: report.staffId,
          total_revenue: report.totalRevenue,
          total_deliveries: report.totalDeliveries,
          delivered_count: report.deliveredCount,
          collected_count: report.collectedCount,
          partial_count: report.partialCount,
          deliveries: report.deliveries,
          field_notes: report.fieldNotes,
          sync_status: 'submitted',
          created_at: report.createdAt,
        });
      } catch (err) {
        console.warn('Supabase report submit failed, saved locally and queued to offline DB', err);
        report.syncStatus = 'pending';
        localStorage.setItem(STORAGE_KEYS.REPORTS, JSON.stringify(reports));
        await offlineDb.enqueue({
          id: report.id,
          entityType: 'report',
          action: 'create',
          data: report,
        });
      }
    } else {
      await offlineDb.enqueue({
        id: report.id,
        entityType: 'report',
        action: 'create',
        data: report,
      });
      requestBackgroundSync();
    }

    return report;
  }

  public updateReportStatus(reportId: string, syncStatus: 'reviewed' | 'submitted') {
    const reports = this.getReports();
    const rep = reports.find((r) => r.id === reportId);
    if (rep) {
      rep.syncStatus = syncStatus;
      localStorage.setItem(STORAGE_KEYS.REPORTS, JSON.stringify(reports));
    }
  }

  // --- Messages ---
  public getMessages(): ChatMessage[] {
    const raw = localStorage.getItem(STORAGE_KEYS.MESSAGES);
    if (!raw) {
      return [];
    }
    try {
      return JSON.parse(raw);
    } catch {
      return [];
    }
  }

  public sendMessage(msg: Omit<ChatMessage, 'id' | 'createdAt' | 'isRead' | 'syncStatus'>): ChatMessage {
    const newMsg: ChatMessage = {
      ...msg,
      id: 'msg-' + Date.now(),
      createdAt: new Date().toISOString(),
      isRead: false,
      syncStatus: this.isOnlineStatus ? 'sent' : 'pending',
    };
    const messages = this.getMessages();
    messages.push(newMsg);
    localStorage.setItem(STORAGE_KEYS.MESSAGES, JSON.stringify(messages));
    return newMsg;
  }

  // --- Tasks ---
  public getTasks(): TimelineTask[] {
    const raw = localStorage.getItem(STORAGE_KEYS.TASKS);
    if (!raw) {
      return [];
    }
    try {
      return JSON.parse(raw);
    } catch {
      return [];
    }
  }

  public toggleTask(taskId: string): TimelineTask[] {
    const tasks = this.getTasks();
    const task = tasks.find((t) => t.id === taskId);
    if (task) {
      task.isCompleted = !task.isCompleted;
      task.status = task.isCompleted ? 'completed' : 'pending';
      localStorage.setItem(STORAGE_KEYS.TASKS, JSON.stringify(tasks));
    }
    return [...tasks];
  }

  // --- Activity Logs ---
  public getActivityLogs(): ActivityLogEntry[] {
    const raw = localStorage.getItem(STORAGE_KEYS.LOGS);
    if (!raw) {
      return [];
    }
    try {
      return JSON.parse(raw);
    } catch {
      return [];
    }
  }

  public addActivityLog(logData: {
    action: string;
    entityType: string;
    entityId: string;
    description: string;
    status: string;
  }) {
    const logs = this.getActivityLogs();
    const entry: ActivityLogEntry = {
      id: 'log-' + Date.now(),
      userId: 'ZZ-2024-001',
      userName: 'Current User',
      userRole: 'Field Staff',
      ...logData,
      createdAt: new Date().toISOString(),
    };
    logs.unshift(entry);
    localStorage.setItem(STORAGE_KEYS.LOGS, JSON.stringify(logs.slice(0, 100)));
  }

  // --- Sync State & Queue Management ---
  public getPendingSyncCount(): number {
    const orders = this.getOrders();
    const reports = this.getReports();
    const customers = this.getCustomers();
    const pendingOrders = orders.filter((o) => o.syncStatus === 'pending').length;
    const pendingReports = reports.filter((r) => r.syncStatus === 'pending').length;
    const pendingCustomers = customers.filter((c) => c.syncStatus === 'pending').length;
    return pendingOrders + pendingReports + pendingCustomers;
  }

  public getPendingSyncDetails() {
    const orders = this.getOrders().filter((o) => o.syncStatus === 'pending');
    const reports = this.getReports().filter((r) => r.syncStatus === 'pending');
    const customers = this.getCustomers().filter((c) => c.syncStatus === 'pending');
    return {
      pendingOrders: orders,
      pendingReports: reports,
      pendingCustomers: customers,
      totalPending: orders.length + reports.length + customers.length,
      lastSyncTime: this.getLastSyncTime(),
    };
  }

  public async forceSyncAll(): Promise<{
    success: boolean;
    syncedOrders: number;
    syncedCustomers: number;
    syncedReports: number;
    total: number;
    error?: string;
  }> {
    const isActuallyOnline = await this.checkConnectivity();
    if (!isActuallyOnline) {
      return {
        success: false,
        syncedOrders: 0,
        syncedCustomers: 0,
        syncedReports: 0,
        total: 0,
        error: 'Device is offline or server cannot be reached. Cached field data remains safely preserved locally.',
      };
    }
    const res = await this.syncPendingQueue();
    return {
      success: true,
      ...res,
    };
  }

  public async syncPendingQueue(): Promise<{
    syncedOrders: number;
    syncedCustomers: number;
    syncedReports: number;
    total: number;
  }> {
    if (this.isSyncingInProgress) {
      return { syncedOrders: 0, syncedCustomers: 0, syncedReports: 0, total: 0 };
    }
    this.notifySyncListeners(true);

    let syncedOrders = 0;
    let syncedCustomers = 0;
    let syncedReports = 0;

    try {
      // 1. Sync Pending Customers first
      const customers = this.getCustomers();
      let customersModified = false;
      for (const customer of customers) {
        if (customer.syncStatus === 'pending') {
          try {
            await supabase.from('customers').insert({
              name: customer.name,
              phone: customer.phone,
              address: customer.address || '',
            });
            customer.syncStatus = 'synced';
            syncedCustomers++;
            customersModified = true;
            await offlineDb.removeQueueItem(customer.id);
            await offlineDb.put('customers', customer);
          } catch (err: any) {
            console.warn(`[Sync] Customer ${customer.name} upload error:`, err);
            await offlineDb.recordQueueFailure(customer.id, err?.message || 'Sync failed');
          }
        }
      }
      if (customersModified) {
        localStorage.setItem(STORAGE_KEYS.CUSTOMERS, JSON.stringify(customers));
      }

      // 2. Sync Pending Orders
      const orders = this.getOrders();
      let ordersModified = false;
      for (const order of orders) {
        if (order.syncStatus === 'pending') {
          try {
            await supabase.from('orders').insert({
              customer_name: order.customerName,
              payment_method: order.paymentMethod,
              items: order.items,
              subtotal: order.subtotal,
              amount_received: order.amountReceived,
              change_amount: order.changeAmount,
              sync_status: 'synced',
              status: order.status || 'pending',
              created_at: order.createdAt,
            });
            order.syncStatus = 'synced';
            syncedOrders++;
            ordersModified = true;
            await offlineDb.removeQueueItem(order.id);
            await offlineDb.put('orders', order);
          } catch (err: any) {
            console.warn(`[Sync] Order ${order.id} upload error:`, err);
            await offlineDb.recordQueueFailure(order.id, err?.message || 'Sync failed');
          }
        }
      }
      if (ordersModified) {
        localStorage.setItem(STORAGE_KEYS.ORDERS, JSON.stringify(orders));
      }

      // 3. Sync Pending EOD Reports
      const reports = this.getReports();
      let reportsModified = false;
      for (const report of reports) {
        if (report.syncStatus === 'pending') {
          try {
            await supabase.from('eod_reports').insert({
              staff_id: report.staffId,
              total_revenue: report.totalRevenue,
              total_deliveries: report.totalDeliveries,
              delivered_count: report.deliveredCount,
              collected_count: report.collectedCount,
              partial_count: report.partialCount,
              deliveries: report.deliveries,
              field_notes: report.fieldNotes,
              sync_status: 'submitted',
              created_at: report.createdAt,
            });
            report.syncStatus = 'submitted';
            syncedReports++;
            reportsModified = true;
            await offlineDb.removeQueueItem(report.id);
            await offlineDb.put('eod_reports', report);
          } catch (err: any) {
            console.warn(`[Sync] EOD Report ${report.id} upload error:`, err);
            await offlineDb.recordQueueFailure(report.id, err?.message || 'Sync failed');
          }
        }
      }
      if (reportsModified) {
        localStorage.setItem(STORAGE_KEYS.REPORTS, JSON.stringify(reports));
      }

      const total = syncedOrders + syncedCustomers + syncedReports;
      if (total > 0) {
        this.setLastSyncTime(new Date().toISOString());
        this.addActivityLog({
          action: 'sync_completed',
          entityType: 'sync',
          entityId: 'sync-' + Date.now(),
          description: `Field auto-sync completed: ${total} item(s) pushed to central database`,
          status: 'success',
        });
      }

      return { syncedOrders, syncedCustomers, syncedReports, total };
    } finally {
      this.notifySyncListeners(false);
    }
  }
}

export const storageService = new StorageService();
