// Exportações da API comum
export * from './common/config';
export * from './common/endpoints';
export * from './common/request';
export * from './common/utils';

// Exportações da API pública
export { default as publicApi } from './public';
export { default as api } from './public';

// Exportações da API admin
export { default as adminApi } from './admin';

// Exportações específicas para compatibilidade
export { API_BASE_URL, DOMAIN_BASE_URL, STORE_CONFIG } from './common/config';
export { getProductImageUrl, fetchAndSetActiveAddress, fetchAllAddresses, fetchStoreSettings, updateStoreConfig } from './common/utils';
export { apiRequest, adminApiRequest, getAdminAuthHeaders, getAdminAuthHeadersForFormData } from './common/request';
export { PUBLIC_API_ENDPOINTS as API_ENDPOINTS, ADMIN_API_ENDPOINTS } from './common/endpoints';