import { adminApiRequest } from '../common/request';
import { ADMIN_API_ENDPOINTS } from '../common/endpoints';

export const adminUtilsApi = {
  getProfile: () => adminApiRequest(ADMIN_API_ENDPOINTS.admin.profile),

  testQueue: () => {
    return adminApiRequest(ADMIN_API_ENDPOINTS.admin.testQueue, {
      method: 'POST',
      headers: {
        'Accept': 'application/json',
      },
    });
  },
};