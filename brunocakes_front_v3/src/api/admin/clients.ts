import { adminApiRequest } from '../common/request';
import { ADMIN_API_ENDPOINTS } from '../common/endpoints';

export const clientsApi = {
  getClients: () => adminApiRequest(ADMIN_API_ENDPOINTS.clients.list),

  getUniqueClients: () => adminApiRequest(ADMIN_API_ENDPOINTS.clients.unique),

  getClient: (id: string) => adminApiRequest(ADMIN_API_ENDPOINTS.clients.show(id)),

  updateClient: (id: string, data: any) => {
    return adminApiRequest(ADMIN_API_ENDPOINTS.clients.update(id), { 
      method: 'PUT', 
      body: JSON.stringify(data),
      headers: {
        'Content-Type': 'application/json',
      }
    });
  },

  deleteClient: (id: string) => adminApiRequest(ADMIN_API_ENDPOINTS.clients.delete(id), { method: 'DELETE' }),
};