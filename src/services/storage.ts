import {
  Product,
  Customer,
  Order,
  EodReport,
  ChatMessage,
  ActivityLogEntry,
  TimelineTask,
  UserProfile,
  BiometricCredential,
} from '../types';
import { supabase } from '../lib/supabase';

const STORAGE_KEYS = {
  ORDERS: 'zamzam_orders',
  CUSTOMERS: 'zamzam_customers',
  REPORTS: 'zamzam_eod_reports',
  MESSAGES: 'zamzam_messages',
  LOGS: 'zamzam_activity_logs',
  TASKS: 'zamzam_tasks',
  OFFLINE_QUEUE: 'zamzam_offline_queue',
  USER_PREFS: 'zamzam_user_prefs',
  USER_PROFILE: 'zamzam_user_profile',
  BIOMETRICS: 'zamzam_biometric_credentials',
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
    price: 5000,
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
  private listeners: Array<(online: boolean) => void> = [];

  constructor() {
    if (typeof window !== 'undefined') {
      window.addEventListener('online', () => this.handleNetworkChange(true));
      window.addEventListener('offline', () => this.handleNetworkChange(false));
      // Background sync on boot
      this.fetchCustomersFromCloud();
      this.fetchOrdersFromCloud();
    }
  }

  private handleNetworkChange(online: boolean) {
    this.isOnlineStatus = online;
    this.listeners.forEach((fn) => fn(online));
    if (online) {
      this.syncPendingQueue();
      this.fetchCustomersFromCloud();
      this.fetchOrdersFromCloud();
    }
  }

  public onNetworkChange(callback: (online: boolean) => void) {
    this.listeners.push(callback);
    return () => {
      this.listeners = this.listeners.filter((fn) => fn !== callback);
    };
  }

  public isOnline(): boolean {
    return this.isOnlineStatus;
  }

  // --- Customers ---
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

  public async fetchCustomersFromCloud(): Promise<Customer[]> {
    try {
      const { data, error } = await supabase.from('customers').select('*').order('created_at', { ascending: false });
      if (!error && data && data.length > 0) {
        const cloudCustomers: Customer[] = data.map((c: any) => ({
          id: c.id?.toString() || 'cust-' + Date.now(),
          name: c.name || 'Unnamed Client',
          phone: c.phone || '',
          address: c.address || '',
          createdAt: c.created_at || new Date().toISOString(),
        }));
        localStorage.setItem(STORAGE_KEYS.CUSTOMERS, JSON.stringify(cloudCustomers));
        return cloudCustomers;
      }
    } catch {
      // offline or table not present
    }
    return this.getCustomers();
  }

  public saveCustomer(customer: Omit<Customer, 'id' | 'createdAt'>): Customer {
    const customers = this.getCustomers();
    const newCustomer: Customer = {
      ...customer,
      id: 'cust-' + Date.now(),
      createdAt: new Date().toISOString(),
    };
    customers.unshift(newCustomer);
    localStorage.setItem(STORAGE_KEYS.CUSTOMERS, JSON.stringify(customers));
    
    // Log activity
    this.addActivityLog({
      action: 'customer_created',
      entityType: 'customer',
      entityId: newCustomer.id,
      description: `New customer registered: ${newCustomer.name}`,
      status: 'success',
    });

    // Try Supabase insert
    if (this.isOnlineStatus) {
      supabase.from('customers').insert({
        name: newCustomer.name,
        phone: newCustomer.phone,
        address: newCustomer.address,
      }).then(() => {}, () => {});
    }

    return newCustomer;
  }

  public deleteCustomer(id: string) {
    const customers = this.getCustomers().filter((c) => c.id !== id);
    localStorage.setItem(STORAGE_KEYS.CUSTOMERS, JSON.stringify(customers));
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

    this.addActivityLog({
      action: 'order_created',
      entityType: 'order',
      entityId: order.id,
      description: `Order created for ${order.customerName} - TZS ${order.subtotal.toLocaleString()}`,
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
        console.warn('Direct supabase order insert failed, kept in local storage', err);
      }
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

    this.addActivityLog({
      action: 'eod_submitted',
      entityType: 'eod_report',
      entityId: report.id,
      description: `End of Day Report submitted - Total TZS ${report.totalRevenue.toLocaleString()} (${report.totalDeliveries} deliveries)`,
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
        console.warn('Supabase report submit failed, saved locally', err);
      }
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

  // --- Sync Count ---
  public getPendingSyncCount(): number {
    const orders = this.getOrders();
    const reports = this.getReports();
    const pendingOrders = orders.filter((o) => o.syncStatus === 'pending').length;
    const pendingReports = reports.filter((r) => r.syncStatus === 'pending').length;
    return pendingOrders + pendingReports;
  }

  public async syncPendingQueue(): Promise<number> {
    const orders = this.getOrders();
    let syncedCount = 0;
    let modified = false;

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
            created_at: order.createdAt,
          });
          order.syncStatus = 'synced';
          syncedCount++;
          modified = true;
        } catch {
          // Keep as pending
        }
      }
    }

    if (modified) {
      localStorage.setItem(STORAGE_KEYS.ORDERS, JSON.stringify(orders));
    }

    return syncedCount;
  }
}

export const storageService = new StorageService();
