import { Branch } from './admin';

export interface CartItem {
  id: string;
  name: string;
  price: number;
  quantity: number;
  product?: any;
}

export type OrderStatus = 
  | 'pending' 
  | 'pending_payment' 
  | 'confirmed' 
  | 'preparing' 
  | 'ready' 
  | 'delivered' 
  | 'completed' 
  | 'canceled' 
  | 'awaiting_seller_confirmation';

export interface Order {
  id: string;
  branch_id?: number;
  branch?: Branch;
  clientName: string;
  email: string;
  whatsapp: string;
  address?: string;
  neighborhood?: string;
  additionalInfo?: string;
  observations?: string;
  status: OrderStatus;
  active: boolean;
  total: number;
  created_at?: string;
  createdAt?: string;
  items?: CartItem[];
  paymentMethod?: 'pix' | 'card' | 'cash';
  payment_method?: string;
  scheduledDate?: string;
  scheduled_date?: string;
}

export type OrderUpdate = Partial<Pick<Order, 'status' | 'active'>>