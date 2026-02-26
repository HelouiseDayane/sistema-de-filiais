import { Branch } from './admin';

export interface ProductStock {
  id: number;
  product_id: number;
  branch_id: number;
  quantity: number;
  branch?: Branch;
}

export interface Product {
  id: string | number;
  name: string;
  description: string;
  price: number;
  image: string;
  image_url?: string;
  imageUrl?: string;
  file?: File;
  category: string;
  available: boolean;
  stock: number;
  available_stock?: number;
  total_stock?: number;
  reserved_stock?: number;
  quantity?: number;
  expiryDate?: string;
  expires_at?: string;
  expiresAt?: string | null;
  promotionPrice?: number;
  promotion_price?: number;
  isPromotion?: boolean;
  is_promo?: boolean;
  isPromo?: boolean;
  isNew?: boolean;
  is_new?: boolean;
  is_active?: boolean;
  branch_id?: number;
  branch?: Branch;
  stocks?: ProductStock[];
}

export interface Address {
  id: number;
  rua: string;
  bairro: string;
  numero?: string;
  complemento?: string;
  cep?: string;
  ativo: boolean;
  branch_id?: number;
  branch?: Branch;
  created_at?: string;
  updated_at?: string;
}
