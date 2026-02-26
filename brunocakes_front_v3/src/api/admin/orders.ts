import { adminApiRequest, getAdminAuthHeaders } from '../common/request';
import { ADMIN_API_ENDPOINTS } from '../common/endpoints';

export const ordersApi = {
  getOrders: () => adminApiRequest(ADMIN_API_ENDPOINTS.orders.list),

  getOrder: (id: string) => adminApiRequest(ADMIN_API_ENDPOINTS.orders.show(id)),

  updateOrder: (id: string, data: any) => {
    return adminApiRequest(ADMIN_API_ENDPOINTS.orders.update(id), { 
      method: 'PUT', 
      body: JSON.stringify(data),
      headers: {
        'Content-Type': 'application/json',
        'Accept': 'application/json',
      }
    });
  },

  updateOrderStatus: (id: string, status: string) => {
    return adminApiRequest(ADMIN_API_ENDPOINTS.orders.updateStatus(id), {
      method: 'PATCH',
      body: JSON.stringify({ status }),
      headers: {
        'Content-Type': 'application/json',
        'Accept': 'application/json',
      },
    });
  },

  markAsDelivered: (orderId: string) => {
    return adminApiRequest(ADMIN_API_ENDPOINTS.orders.markDelivered(orderId), {
      method: 'PATCH',
      headers: {
        'Content-Type': 'application/json',
        ...getAdminAuthHeaders(),
      },
    });
  },

  confirmManyOrders: (orderIds: string[] | number[]) => {
    if (orderIds.length === 0) {
      throw new Error('Nenhum ID de pedido fornecido para confirmação.');
    }
    
    return adminApiRequest(ADMIN_API_ENDPOINTS.orders.confirmMany, {
      method: 'PATCH',
      body: JSON.stringify({ order_ids: orderIds }),
      headers: {
        'Content-Type': 'application/json',
        ...getAdminAuthHeaders(),
      },
    });
  },

  approvePayments: (orderIds: string[] | number[]) => {
    if (orderIds.length === 0) {
      throw new Error('A lista de IDs de pedidos está vazia.');
    }
    return adminApiRequest(ADMIN_API_ENDPOINTS.orders.approvePayment, {
      method: 'PATCH',
      body: JSON.stringify({ order_ids: orderIds }),
      headers: {
        'Content-Type': 'application/json',
        ...getAdminAuthHeaders(),
      },
    });
  },

  cancelPayments: (orderIds: string[] | number[]) => {
    return adminApiRequest(ADMIN_API_ENDPOINTS.orders.cancelPayment, {
      method: 'PATCH',
      body: JSON.stringify({ order_ids: orderIds }),
      headers: {
        'Content-Type': 'application/json',
        ...getAdminAuthHeaders(), // garante que o Authorization vá
      },
    });
  },

  markAsCompleted: (orderIds: string[] | number[]) => {
    if (!Array.isArray(orderIds) || orderIds.length === 0) {
      throw new Error('A lista de IDs de pedidos está vazia.');
    }
    return adminApiRequest(ADMIN_API_ENDPOINTS.orders.finish, {
      method: 'PATCH',
      body: JSON.stringify({ order_ids: orderIds }),
      headers: {
        'Content-Type': 'application/json',
        ...getAdminAuthHeaders(),
      },
    });
  },
};