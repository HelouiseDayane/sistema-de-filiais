import { adminApiRequest, getAdminAuthHeaders } from '../common/request';
import { ADMIN_API_ENDPOINTS } from '../common/endpoints';

export const authApi = {
  login: async (email: string, password: string) => {
    const response = await adminApiRequest(ADMIN_API_ENDPOINTS.auth.login, {
      method: 'POST',
      body: JSON.stringify({ email, password }),
      headers: {
        'Content-Type': 'application/json',
      },
    });
    
    // Persistir token e dados do admin
    if (response && response.token) {
      localStorage.setItem('admin_token', response.token);
      
      // Salvar dados do admin se retornados
      if (response.user) {
        const adminData = {
          id: String(response.user.id || '1'),
          name: response.user.name || 'Admin',
          email: response.user.email || email,
          role: response.user.role || 'employee', // Pega role real do backend
          branch_id: response.user.branch_id || null,
          created_at: response.user.created_at || new Date().toISOString(),
          updated_at: response.user.updated_at || new Date().toISOString(),
        };
        localStorage.setItem('bruno_admin', JSON.stringify(adminData));
      } else {
        // Fallback se backend não retornar user
        const fallbackAdminData = {
          id: '1',
          name: 'Admin',
          email: email,
          role: 'employee', // Fallback para employee
          branch_id: null,
          created_at: new Date().toISOString(),
          updated_at: new Date().toISOString(),
        };
        localStorage.setItem('bruno_admin', JSON.stringify(fallbackAdminData));
      }
    } else {
      console.error('❌ Login falhou - token não encontrado na resposta');
    }
    
    return response;
  },

  logout: async () => {
    try {
      await adminApiRequest(ADMIN_API_ENDPOINTS.auth.logout, { method: 'POST' });
    } catch (error) {
      console.warn('Erro ao fazer logout no servidor:', error);
    } finally {
      // Sempre limpar dados locais
      localStorage.removeItem('admin_token');
      localStorage.removeItem('bruno_admin');
    }
  },

  getMe: () => adminApiRequest(ADMIN_API_ENDPOINTS.auth.me),
};