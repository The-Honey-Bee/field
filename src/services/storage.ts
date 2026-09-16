import { Product, Customer, Order, EodReport, ChatMessage, ActivityLogEntry, TimelineTask } from '../types';
import { supabase } from './supabase';

const STORAGE_KEYS = {
  ORDERS: 'zamzam_orders',
  CUSTOMERS: 'zamzam_customers',
  REPORTS: 'zamzam_eod_reports',
  MESSAGES: 'zamzam_messages',
  LOGS: 'zamzam_activity_logs',
  TASKS: 'zamzam_tasks',
  OFFLINE_QUEUE: 'zamzam_offline_queue',
  USER_PREFS: 'zamzam_user_prefs',
};

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

export const INITIAL_CUSTOMERS: Customer[] = [
  {
    id: 'cust-1',
    name: 'City Hypermarket',
    phone: '+255 712 345 678',
    address: 'Nyerere Road, Plot 14, Dar es Salaam',
    createdAt: new Date().toISOString(),
  },
  {
    id: 'cust-2',
    name: 'Al-Barakah Restaurant',
    phone: '+255 784 992 110',
    address: 'Kariakoo Market St, Dar es Salaam',
    createdAt: new Date().toISOString(),
  },
  {
    id: 'cust-3',
    name: 'Metro Mart Express',
    phone: '+255 655 432 100',
    address: 'Ali Hassan Mwinyi Rd, Kinondoni',
    createdAt: new Date().toISOString(),
  },
  {
    id: 'cust-4',
    name: 'Oasis Luxury Plaza',
    phone: '+255 754 888 222',
    address: 'Masaki Peninsula, Haile Selassie Rd',
    createdAt: new Date().toISOString(),
  },
  {
    id: 'cust-5',
    name: 'Grand Serena Hotel',
    phone: '+255 768 112 334',
    address: 'Ohio Street, Posta, Dar es Salaam',
    createdAt: new Date().toISOString(),
  },
  {
    id: 'cust-6',
    name: 'Sunrise Bakery & Cafe',
    phone: '+255 713 554 990',
    address: 'Morogoro Road, Ubungo',
    createdAt: new Date().toISOString(),
  },
];

export const INITIAL_TASKS: TimelineTask[] = [
  {
    id: 'task-1',
    time: '08:30 AM',
    timeRange: '08:30 - 09:15',
    title: 'City Hypermarket Delivery',
    subtitle: 'Deliver 25x 18.9L bottles & collect overdue payment',
    iconName: 'local_shipping',
    iconColor: '#00C46A',
    status: 'completed',
    isCompleted: true,
  },
  {
    id: 'task-2',
    time: '10:00 AM',
    timeRange: '10:00 - 10:45',
    title: 'Al-Barakah Restaurant Drop',
    subtitle: 'Replenish 15x 13L bottles with cash invoice',
    iconName: 'store',
    iconColor: '#3B82F6',
    status: 'completed',
    isCompleted: true,
  },
  {
    id: 'task-3',
    time: '11:45 AM',
    timeRange: '11:45 - 12:30',
    title: 'Metro Mart Express Replenish',
    subtitle: 'Deliver 30x 18.9L refill bottles',
    iconName: 'local_shipping',
    iconColor: '#F59E0B',
    status: 'completed',
    isCompleted: true,
  },
  {
    id: 'task-4',
    time: '01:30 PM',
    timeRange: '01:30 - 02:15',
    title: 'Oasis Luxury Plaza',
    subtitle: 'Payment collection & empty bottle exchange (10x)',
    iconName: 'payments',
    iconColor: '#EC4899',
    status: 'completed',
    isCompleted: true,
  },
  {
    id: 'task-5',
    time: '03:15 PM',
    timeRange: '03:15 - 04:00',
    title: 'Grand Serena Hotel Scheduled Stop',
    subtitle: 'Restock 40x 18.9L dispenser bottles',
    iconName: 'inventory',
    iconColor: '#00C46A',
    status: 'completed',
    isCompleted: true,
  },
  {
    id: 'task-6',
    time: '04:45 PM',
    timeRange: '04:45 - 05:30',
    title: 'Sunrise Bakery Delivery',
    subtitle: 'Scheduled bi-weekly refill (12x 13L bottles)',
    iconName: 'store',
    iconColor: '#F59E0B',
    status: 'pending',
    isCompleted: false,
  },
  {
    id: 'task-7',
    time: '05:45 PM',
    timeRange: '05:45 - 06:15',
    title: 'Central Depot Check-in',
    subtitle: 'Submit daily cash collections & sign EOD reconciliation',
    iconName: 'payments',
    iconColor: '#8B5CF6',
    status: 'pending',
    isCompleted: false,
  },
  {
    id: 'task-8',
    time: '06:30 PM',
    timeRange: '06:30 - 06:45',
    title: 'Vehicle & Empties Handover',
    subtitle: 'Truck inventory audit and security lockup',
    iconName: 'inventory',
    iconColor: '#6B7280',
    status: 'pending',
    isCompleted: false,
  },
];

export const INITIAL_MESSAGES: ChatMessage[] = [
  {
    id: 'msg-1',
    senderId: 'sup-1',
    senderName: 'Tariq Al-Mansoor (Supervisor)',
    receiverId: 'field-1',
    receiverName: 'Field Staff',
    content: 'Please prioritize City Hypermarket on Nyerere Rd. They requested extra 10 bottles.',
    createdAt: new Date(Date.now() - 1000 * 60 * 45).toISOString(),
    isRead: true,
    syncStatus: 'sent',
  },
  {
    id: 'msg-2',
    senderId: 'field-1',
    senderName: 'Field Staff',
    receiverId: 'sup-1',
    receiverName: 'Tariq Al-Mansoor (Supervisor)',
    content: 'Received. Delivery completed and payment collected via M-Pesa.',
    createdAt: new Date(Date.now() - 1000 * 60 * 20).toISOString(),
    isRead: true,
    syncStatus: 'sent',
  },
  {
    id: 'msg-3',
    senderId: 'sup-1',
    senderName: 'Tariq Al-Mansoor (Supervisor)',
    receiverId: 'field-1',
    receiverName: 'Field Staff',
    content: 'Great work! Don\'t forget to submit your EOD report before 6:30 PM.',
    createdAt: new Date(Date.now() - 1000 * 60 * 5).toISOString(),
    isRead: true,
    syncStatus: 'sent',
  },
];

export const INITIAL_ORDERS: Order[] = [
  {
    id: 'ord-1001',
    staffId: 'ZZ-2024-001',
    customerName: 'City Hypermarket',
    paymentMethod: 'mobile',
    items: [
      { id: 'prod-2', name: 'ZAMZAM Pure Drinking Water 18.9L', qty: 25, price: 5000, subtotal: 125000 },
    ],
    subtotal: 125000,
    amountReceived: 125000,
    changeAmount: 0,
    syncStatus: 'synced',
    createdAt: new Date(Date.now() - 1000 * 60 * 180).toISOString(),
    status: 'approved',
  },
  {
    id: 'ord-1002',
    staffId: 'ZZ-2024-001',
    customerName: 'Al-Barakah Restaurant',
    paymentMethod: 'cash',
    items: [
      { id: 'prod-1', name: 'ZAMZAM Pure Drinking Water 13L', qty: 15, price: 5000, subtotal: 75000 },
    ],
    subtotal: 75000,
    amountReceived: 80000,
    changeAmount: 5000,
    syncStatus: 'synced',
    createdAt: new Date(Date.now() - 1000 * 60 * 120).toISOString(),
    status: 'approved',
  },
  {
    id: 'ord-1003',
    staffId: 'ZZ-2024-001',
    customerName: 'Metro Mart Express',
    paymentMethod: 'cash',
    items: [
      { id: 'prod-3', name: 'ZAMZAM Pure Drinking Water 18.9L/R', qty: 30, price: 5000, subtotal: 150000 },
    ],
    subtotal: 150000,
    amountReceived: 150000,
    changeAmount: 0,
    syncStatus: 'synced',
    createdAt: new Date(Date.now() - 1000 * 60 * 60).toISOString(),
    status: 'pending',
  },
];

class StorageService {
  private isOnlineStatus: boolean = typeof navigator !== 'undefined' ? navigator.onLine : true;
  private listeners: Array<(online: boolean) => void> = [];

  constructor() {
    if (typeof window !== 'undefined') {
      window.addEventListener('online', () => this.handleNetworkChange(true));
      window.addEventListener('offline', () => this.handleNetworkChange(false));
    }
  }

  private handleNetworkChange(online: boolean) {
    this.isOnlineStatus = online;
    this.listeners.forEach((fn) => fn(online));
    if (online) {
      this.syncPendingQueue();
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
      localStorage.setItem(STORAGE_KEYS.CUSTOMERS, JSON.stringify(INITIAL_CUSTOMERS));
      return INITIAL_CUSTOMERS;
    }
    try {
      return JSON.parse(raw);
    } catch {
      return INITIAL_CUSTOMERS;
    }
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
      }).then().catch(() => {});
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
      localStorage.setItem(STORAGE_KEYS.ORDERS, JSON.stringify(INITIAL_ORDERS));
      return INITIAL_ORDERS;
    }
    try {
      return JSON.parse(raw);
    } catch {
      return INITIAL_ORDERS;
    }
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
        supabase.from('orders').update({ status }).eq('id', orderId).then().catch(() => {});
      }
    }
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
      localStorage.setItem(STORAGE_KEYS.MESSAGES, JSON.stringify(INITIAL_MESSAGES));
      return INITIAL_MESSAGES;
    }
    try {
      return JSON.parse(raw);
    } catch {
      return INITIAL_MESSAGES;
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
      localStorage.setItem(STORAGE_KEYS.TASKS, JSON.stringify(INITIAL_TASKS));
      return INITIAL_TASKS;
    }
    try {
      return JSON.parse(raw);
    } catch {
      return INITIAL_TASKS;
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
      const initialLogs: ActivityLogEntry[] = [
        {
          id: 'log-1',
          userId: 'ZZ-2024-001',
          userName: 'Ali Hassan',
          userRole: 'Field Staff',
          action: 'user_login',
          entityType: 'auth',
          entityId: 'auth-1',
          description: 'Staff logged in from Mobile Dispatch unit',
          status: 'success',
          createdAt: new Date(Date.now() - 1000 * 60 * 240).toISOString(),
        },
        {
          id: 'log-2',
          userId: 'ZZ-2024-001',
          userName: 'Ali Hassan',
          userRole: 'Field Staff',
          action: 'order_approved',
          entityType: 'order',
          entityId: 'ord-1001',
          description: 'Order #ord-1001 verified and approved for City Hypermarket',
          status: 'success',
          createdAt: new Date(Date.now() - 1000 * 60 * 170).toISOString(),
        },
        {
          id: 'log-3',
          userId: 'ZZ-2024-001',
          userName: 'Ali Hassan',
          userRole: 'Field Staff',
          action: 'sync_success',
          entityType: 'sync',
          entityId: 'sync-1',
          description: 'Offline records synchronized with Cloud Supabase',
          status: 'success',
          createdAt: new Date(Date.now() - 1000 * 60 * 90).toISOString(),
        },
      ];
      localStorage.setItem(STORAGE_KEYS.LOGS, JSON.stringify(initialLogs));
      return initialLogs;
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
