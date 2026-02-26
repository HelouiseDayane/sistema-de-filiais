import { adminApiRequest, getAdminAuthHeaders, getAdminAuthHeadersForFormData } from '../common/request';
import { ADMIN_API_ENDPOINTS } from '../common/endpoints';

export const productsApi = {
  getProducts: () => adminApiRequest(ADMIN_API_ENDPOINTS.products.list),

  getProduct: (id: string) => adminApiRequest(ADMIN_API_ENDPOINTS.products.show(id)),

  createProduct: (data: any) => {
    const formData = new FormData();
    Object.entries(data).forEach(([key, value]) => {
      if (key === 'file' && value instanceof File) {
        formData.append('image', value);
      } else if (key === 'stock') {
        // Mapear 'stock' do frontend para 'quantity' do backend
        formData.append('quantity', String(value));
      } else if (key === 'available') {
        // Mapear 'available' do frontend para 'is_active' do backend
        formData.append('is_active', String(value));
      } else if (value !== undefined && value !== null) {
        if (typeof value === 'boolean' || typeof value === 'number') {
          formData.append(key, String(value));
        } else {
          formData.append(key, value as string);
        }
      }
    });
    return adminApiRequest(ADMIN_API_ENDPOINTS.products.create, {
      method: 'POST',
      body: formData,
      headers: getAdminAuthHeadersForFormData(), // Headers específicos para FormData
    });
  },

  updateProduct: (id: string, data: any) => {
    const formData = new FormData();
    
    // Adicionar _method=PUT para compatibilidade com alguns backends PHP/Laravel
    formData.append('_method', 'PUT');
    
    Object.entries(data).forEach(([key, value]) => {
      if (key === 'file' && value instanceof File) {
        formData.append('image', value);
      } else if (key === 'stock') {
        // Mapear 'stock' do frontend para 'quantity' do backend
        formData.append('quantity', String(value));
      } else if (key === 'available') {
        // Mapear 'available' do frontend para 'is_active' do backend
        formData.append('is_active', String(value));
      } else if (value !== undefined && value !== null && value !== '') {
        const stringValue = typeof value === 'boolean' || typeof value === 'number' 
          ? String(value) 
          : value as string;
        formData.append(key, stringValue);
      }
    });
    
    // Usar POST com _method=PUT para melhor compatibilidade
    return adminApiRequest(ADMIN_API_ENDPOINTS.products.update(id), {
      method: 'POST',
      body: formData,
      headers: getAdminAuthHeadersForFormData(),
    });
  },

  toggleProduct: (id: string) => adminApiRequest(ADMIN_API_ENDPOINTS.products.toggle(id), { method: 'PATCH' }),

  updateProductStock: (id: string, quantity: number) => {
    return adminApiRequest(ADMIN_API_ENDPOINTS.products.updateStock(id), {
      method: 'PATCH',
      body: JSON.stringify({ quantity }),
      headers: {
        'Content-Type': 'application/json',
        'Accept': 'application/json',
      },
    });
  },

  // === ESTOQUE ===
  checkStock: (productId: string) => adminApiRequest(ADMIN_API_ENDPOINTS.products.stock(productId)),

  reserveStock: (productId: string, quantity: number) => {
    return adminApiRequest(ADMIN_API_ENDPOINTS.products.reserveStock(productId), {
      method: 'POST',
      body: JSON.stringify({ quantity }),
      headers: {
        'Content-Type': 'application/json',
        'Accept': 'application/json',
      },
    });
  },

  syncStock: () => {
    return adminApiRequest(ADMIN_API_ENDPOINTS.products.syncStock, {
      method: 'POST',
      headers: {
        'Content-Type': 'application/json',
        'Accept': 'application/json',
      },
    });
  },

  getLowStockProducts: () => adminApiRequest(ADMIN_API_ENDPOINTS.products.lowStock),

  getStockReport: () => adminApiRequest(ADMIN_API_ENDPOINTS.products.stockReport),
};