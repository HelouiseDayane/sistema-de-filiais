import { adminApiRequest } from '../common/request';
import { ADMIN_API_ENDPOINTS } from '../common/endpoints';

export const analyticsApi = {
  getAnalytics: (branchId?: number | null) => {
    const url = branchId 
      ? `${ADMIN_API_ENDPOINTS.analytics.dashboard}?branch_id=${branchId}`
      : ADMIN_API_ENDPOINTS.analytics.dashboard;
    return adminApiRequest(url);
  },
  
  getGeneralAnalytics: () => adminApiRequest(ADMIN_API_ENDPOINTS.analytics.general),

  getCustomerAnalytics: (branchId?: number | null) => {
    const url = branchId
      ? `${ADMIN_API_ENDPOINTS.analytics.customers}?branch_id=${branchId}`
      : ADMIN_API_ENDPOINTS.analytics.customers;
    return adminApiRequest(url);
  },
};

// Função para buscar analytics de clientes (compatibilidade)
export const getCustomerAnalytics = () => adminApiRequest(ADMIN_API_ENDPOINTS.analytics.customers);