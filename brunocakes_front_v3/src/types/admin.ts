export interface Branch {
  id: number;
  name: string;
  code: string;
  address: string;
  phone: string;
  email: string;
  opening_hours: any;
  is_open: boolean;
  is_active: boolean;
  created_at?: string;
  updated_at?: string;
}

export interface Admin {
  id: number;
  name: string;
  email: string;
  role: 'master' | 'admin' | 'employee';
  branch_id?: number;
  branch?: Branch;
  email_verified_at?: string;
  created_at: string;
  updated_at: string;
}

export interface CreateUserData {
  name: string;
  email: string;
  password: string;
  password_confirmation: string;
  role: 'master' | 'admin' | 'employee';
  branch_id?: number;
}

export interface UpdateUserData {
  name?: string;
  email?: string;
  password?: string;
  password_confirmation?: string;
  role?: 'master' | 'admin' | 'employee';
  branch_id?: number;
}
