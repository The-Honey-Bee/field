export type UserRole = 'field_staff' | 'supervisor' | 'manager';

export interface UserProfile {
  id: string;
  name: string;
  email: string;
  phone: string;
  role: UserRole;
  employeeId: string;
}

export interface Product {
  id: string;
  name: string;
  size: string;
  price: number;
  unit: string;
  stockAvailable: number;
  quantity?: number;
}

export interface OrderItem {
  id: string;
  name: string;
  qty: number;
  price: number;
  subtotal: number;
}

export type PaymentMethod = 'cash' | 'credit' | 'mobile';

export interface Order {
  id: string;
  localId?: string;
  staffId: string;
  customerName: string;
  paymentMethod: PaymentMethod;
  items: OrderItem[];
  subtotal: number;
  amountReceived: number;
  changeAmount: number;
  syncStatus: 'synced' | 'pending' | 'failed';
  createdAt: string;
  status?: 'pending' | 'approved' | 'rejected';
}

export interface EodReport {
  id: string;
  localId?: string;
  staffId: string;
  reportDate: string;
  totalRevenue: number;
  totalDeliveries: number;
  deliveredCount: number;
  collectedCount: number;
  partialCount: number;
  deliveries: Array<{
    customer: string;
    items: string;
    amount: number;
    status: 'delivered' | 'collected' | 'partial';
    time: string;
  }>;
  fieldNotes: string;
  syncStatus: 'submitted' | 'pending' | 'reviewed';
  createdAt: string;
}

export interface Customer {
  id: string;
  name: string;
  phone: string;
  address?: string;
  createdBy?: string;
  createdAt: string;
}

export interface ChatMessage {
  id: string;
  senderId: string;
  senderName: string;
  receiverId: string;
  receiverName: string;
  content: string;
  createdAt: string;
  isRead: boolean;
  syncStatus: 'sent' | 'pending' | 'failed';
}

export interface ActivityLogEntry {
  id: string;
  userId: string;
  userName: string;
  userRole: string;
  action: string;
  entityType: string;
  entityId: string;
  description: string;
  status: string;
  createdAt: string;
}

export interface TimelineTask {
  id: string;
  time: string;
  timeRange: string;
  title: string;
  subtitle: string;
  iconName: 'store' | 'local_shipping' | 'payments' | 'inventory';
  iconColor: string;
  status: 'pending' | 'completed' | 'in_transit';
  isCompleted: boolean;
}
