import { authApi } from './auth';
import { productsApi } from './products';
import { ordersApi } from './orders';
import { clientsApi } from './clients';
import { analyticsApi } from './analytics';
import { adminUtilsApi } from './utils';
import { adminApiRequest } from '../common/request';

// API administrativa consolidada
export const adminApi = {
  // === AUTENTICAÇÃO ===
  ...authApi,

  // === PRODUTOS ===
  ...productsApi,

  // === PEDIDOS ===
  ...ordersApi,

  // === CLIENTES ===
  ...clientsApi,

  // === ANALYTICS ===
  ...analyticsApi,

  // === PERFIL ADMIN E UTILITÁRIOS ===
  ...adminUtilsApi,
  
  // === MÉTODOS GENÉRICOS ===
  get: async (url: string, options?: any) => {
    return adminApiRequest(url, { method: 'GET', ...options });
  },
  
  post: async (url: string, data?: any, options?: any) => {
    return adminApiRequest(url, { 
      method: 'POST', 
      body: JSON.stringify(data),
      ...options 
    });
  },
  
  put: async (url: string, data?: any, options?: any) => {
    return adminApiRequest(url, { 
      method: 'PUT', 
      body: JSON.stringify(data),
      ...options 
    });
  },
  
  delete: async (url: string, options?: any) => {
    return adminApiRequest(url, { method: 'DELETE', ...options });
  },
};

export default adminApi;