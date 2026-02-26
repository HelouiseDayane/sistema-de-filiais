// Headers básicos sem autenticação
export const getPublicHeaders = () => ({
  'Accept': 'application/json',
});

// Headers com token de admin
export const getAdminAuthHeaders = () => {
  const token = localStorage.getItem('admin_token');
  const headers = {
    'Accept': 'application/json',
    'Content-Type': 'application/json',
    ...(token ? { Authorization: `Bearer ${token}` } : {}),
  };
  return headers;
};

// Headers específicos para FormData (sem Content-Type)
export const getAdminAuthHeadersForFormData = () => {
  const token = localStorage.getItem('admin_token');
  return {
    ...(token ? { Authorization: `Bearer ${token}` } : {}),
    // Não incluir Accept nem Content-Type para FormData
  };
};

// Função genérica de requisição pública
export const apiRequest = async (url: string, options: RequestInit = {}) => {
  try {
    // Adiciona o base URL se não for uma URL completa
    const API_BASE_URL = (import.meta as any).env?.VITE_API_BASE_URL || '/api';
    const fullUrl = url.startsWith('http') ? url : `${API_BASE_URL}${url}`;
    
    const defaultOptions: RequestInit = { 
      headers: { ...getPublicHeaders(), ...options.headers }, 
      ...options 
    };

    const response = await fetch(fullUrl, defaultOptions);

    if (response.status === 204) return null; // sem conteúdo
    if (!response.ok) {
      const errorData = await response.json().catch(() => ({}));
      const error: any = new Error(errorData.message || `HTTP error! status: ${response.status}`);
      error.status = response.status;
      error.response = response;
      error.data = errorData;
      throw error;
    }
    return await response.json();
  } catch (error) {
    throw error;
  }
};

// Função genérica de requisição admin
export const adminApiRequest = async (url: string, options: RequestInit = {}) => {
  try {
    // Adiciona o base URL se não for uma URL completa
    const API_BASE_URL = (import.meta as any).env?.VITE_API_BASE_URL || '/api';
    const fullUrl = url.startsWith('http') ? url : `${API_BASE_URL}${url}`;
    
    const defaultOptions: RequestInit = { 
      headers: { ...getAdminAuthHeaders(), ...options.headers }, 
      mode: 'cors',
      ...options 
    };

    const response = await fetch(fullUrl, defaultOptions);

    // 204 é um sucesso para operações que não retornam conteúdo
    if (response.status === 204) {
      return { success: true };
    }
    
    if (!response.ok) {
      const errorData = await response.json().catch(() => ({}));
      console.error(`❌ Erro na API: ${response.status} - ${JSON.stringify(errorData)}`);
      throw new Error(errorData.message || `HTTP error! status: ${response.status}`);
    }
    
    const responseData = await response.json();
    return responseData;
  } catch (error) {
    throw error;
  }
};