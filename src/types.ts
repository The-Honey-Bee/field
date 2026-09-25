export type UserRole = 'field_staff' | 'dispatcher' | 'supervisor' | 'manager';

export interface UserProfile {
  id: string;
  name: string;
  email: string;
  phone: string;
  role: UserRole;
  employeeId: string;
  plant?: string;
  title?: string;
}

export interface BiometricCredential {
  id: string; // Base64URL encoded credential ID
  rawId?: string;
  userId: string;
  userEmail: string;
  userName: string;
  deviceLabel: string;
  createdAt: string;
  counter?: number;
  transports?: string[];
}

export interface Product {
  id: string;
  name: string;
  size: string;
  price: number;
  unit: string;
  stockAvailable: number;
  quantity?: number;
  description?: string;
  currency?: string;
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
  customerAddress?: string;
  paymentMethod: PaymentMethod;
  items: OrderItem[];
  subtotal: number;
  amountReceived: number;
  changeAmount: number;
  syncStatus: 'synced' | 'pending' | 'failed';
  createdAt: string;
  status?: 'pending' | 'approved' | 'rejected';
}

export interface ProofImage {
  id: string;
  dataUrl: string;
  name: string;
  category?: 'bottles' | 'odometer' | 'fuel' | 'receipt' | 'damage' | 'other';
  uploadedAt: string;
  size?: string;
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
  proofImages?: ProofImage[];
  syncStatus: 'submitted' | 'pending' | 'reviewed';
  createdAt: string;
}

export interface Customer {
  id: string;
  name: string;
  phone: string;
  address?: string;
  notes?: string;
  createdBy?: string;
  createdAt: string;
  syncStatus?: 'synced' | 'pending' | 'failed';
}

export interface CustomerSyncLogEntry {
  id: string;
  timestamp: string;
  tableName: string; // 'customers'
  direction: 'FROM_SUPABASE' | 'TO_SUPABASE';
  action: 'FETCH' | 'INSERT' | 'SYNC';
  status: 'INFO' | 'SUCCESS' | 'WARNING' | 'ERROR';
  message: string;
  count?: number;
  data?: any;
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
  messageType?: 'text' | 'voice';
  audioUrl?: string; // base64 Data URL or audio URI
  audioDuration?: number; // duration in seconds
  voiceCategory?: 'status' | 'delay' | 'arrival' | 'refill' | 'urgent' | 'general';
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

export type ThemeMode = 'dark' | 'sunlight';

export type TeamFieldStatus = 'en_route' | 'at_customer' | 'delivering' | 'depot_reload' | 'idle' | 'offline';

export interface FieldTeamLocation {
  userId: string;
  staffName: string;
  employeeId: string;
  phone?: string;
  role: UserRole;
  latitude: number;
  longitude: number;
  accuracy: number; // in meters
  heading: number | null; // in degrees (0-360)
  speed: number | null; // in km/h
  altitude: number | null;
  timestamp: string; // ISO string
  updatedAt: number; // Unix epoch ms
  isOnline: boolean;
  status: TeamFieldStatus;
  assignedRoute: string;
  currentStop?: string;
  batteryLevel?: number; // 0-100%
  truckStock?: {
    bottles18_9L: number;
    bottles13L: number;
  };
  totalStopsToday?: number;
  completedStopsToday?: number;
}

export type DeliverySiteStatus = 'pending' | 'in_progress' | 'urgent' | 'delivered' | 'scheduled';
export type DeliverySiteCategory =
  | 'hotel_hospitality'
  | 'commercial_office'
  | 'health_hospital'
  | 'retail_plaza'
  | 'institution_school'
  | 'residential';

export interface DeliverySite {
  id: string;
  name: string;
  category: DeliverySiteCategory;
  status: DeliverySiteStatus;
  latitude: number;
  longitude: number;
  address: string;
  sector: string;
  contactPerson: string;
  contactPhone: string;
  orderItems: {
    bottles18_9L: number;
    bottles13L: number;
    dispensers?: number;
  };
  assignedDriver?: {
    driverId: string;
    driverName: string;
    vehiclePlate: string;
  };
  deliveryWindow: string;
  priority: 'normal' | 'high' | 'urgent';
  notes?: string;
  deliveredAt?: string;
}

