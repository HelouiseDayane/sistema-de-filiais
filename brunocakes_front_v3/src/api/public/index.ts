import { apiRequest } from '../common/request';
import { PUBLIC_API_ENDPOINTS } from '../common/endpoints';

// API pública
export const publicApi = {
  // === PRODUTOS PÚBLICOS ===
  // Retorna produtos com estoque real do Redis
  getPublicProducts: (branchId?: number) => {
    const url = branchId 
      ? `${PUBLIC_API_ENDPOINTS.products.withStock}?branch_id=${branchId}`
      : PUBLIC_API_ENDPOINTS.products.withStock;
    return apiRequest(url);
  },

  getPublicProduct: (id: string) => apiRequest(PUBLIC_API_ENDPOINTS.products.showPublic(id)),

  getProductStock: (productId: string) => apiRequest(PUBLIC_API_ENDPOINTS.products.stock(productId)),

  getAllProductsStock: () => apiRequest(PUBLIC_API_ENDPOINTS.products.allStock),

  // === CHECKOUT E PEDIDOS PÚBLICOS ===
  createOrder: (data: any) => {
    // Monta payload conforme backend espera
    const payload = {
      branch_id: data.branch_id, // IMPORTANTE: branch_id é obrigatório
      customer_name: data.customer_name || data.customer?.name || data.clientName || '',
      customer_email: data.customer_email || data.customer?.email || data.clientEmail || '',
      customer_phone: data.customer_phone || data.customer?.phone || data.clientPhone || '',
      address_street: data.address_street || data.customer?.address || data.clientAddress || '',
      address_neighborhood: data.address_neighborhood || data.customer?.neighborhood || data.clientNeighborhood || '',
      observations: data.observations || data.additionalInfo || '',
      items: Array.isArray(data.items)
        ? data.items.map((item: any) => ({
            product_id: item.product_id || item.product?.id,
            quantity: item.quantity
          }))
        : [],
      session_id: data.session_id || '',
    };
    
    
    
    return apiRequest(PUBLIC_API_ENDPOINTS.checkout.create, {
      method: 'POST',
      body: JSON.stringify(payload),
      headers: {
        'Content-Type': 'application/json',
        'Accept': 'application/json',
      },
    });
  },

  getOrder: (id: string) => apiRequest(PUBLIC_API_ENDPOINTS.orders.show(id)),

  getOrdersByContact: async (email?: string, phone?: string) => {
    const params = new URLSearchParams();
    if (email) params.append('email', email);
    if (phone) params.append('phone', phone);
    const url = `${PUBLIC_API_ENDPOINTS.orders.byContact}?${params.toString()}`;
    
    const response = await apiRequest(url, {
      method: 'GET',
      headers: {
        'Accept': 'application/json',
      },
    });
    
    return response;
  },

  getCustomerLastOrder: async (contact: string) => {
    const params = new URLSearchParams();
    // Backend só aceita telefone por enquanto
    params.append('phone', contact);
    const url = `${PUBLIC_API_ENDPOINTS.customer.lastOrder}?${params.toString()}`;
    return apiRequest(url, {
      method: 'GET',
      headers: {
        'Accept': 'application/json',
      },
    });
  },

  // === CARRINHO ===
  generateSessionId: () => {
    return `session_${Date.now()}_${Math.random().toString(36).substr(2, 9)}`;
  },

  addToCart: (sessionId: string, productId: string, quantity: number) => {
    const selectedBranch = localStorage.getItem('selected_branch');
    const branchId = selectedBranch ? JSON.parse(selectedBranch).id : null;
    
    if (!branchId) {
      throw new Error('Nenhuma filial selecionada');
    }
    
    return apiRequest(PUBLIC_API_ENDPOINTS.cart.add, {
      method: 'POST',
      body: JSON.stringify({ 
        session_id: sessionId,
        product_id: productId,
        quantity,
        branch_id: branchId
      }),
      headers: {
        'Content-Type': 'application/json',
        'Accept': 'application/json',
      },
    });
  },

  removeFromCart: (sessionId: string, productId: string, quantity?: number) => {
    const selectedBranch = localStorage.getItem('selected_branch');
    const branchId = selectedBranch ? JSON.parse(selectedBranch).id : null;
    
    if (!branchId) {
      throw new Error('Nenhuma filial selecionada');
    }
    
    const body: any = { 
      session_id: sessionId,
      product_id: productId,
      branch_id: branchId
    };
    if (quantity) body.quantity = quantity;

    return apiRequest(PUBLIC_API_ENDPOINTS.cart.remove, {
      method: 'POST',
      body: JSON.stringify(body),
      headers: {
        'Content-Type': 'application/json',
        'Accept': 'application/json',
      },
    });
  },

  updateCartQuantity: (sessionId: string, productId: string, quantity: number) => {
    const selectedBranch = localStorage.getItem('selected_branch');
    const branchId = selectedBranch ? JSON.parse(selectedBranch).id : null;
    
    if (!branchId) {
      throw new Error('Nenhuma filial selecionada');
    }
    
    return apiRequest(PUBLIC_API_ENDPOINTS.cart.update, {
      method: 'POST',
      body: JSON.stringify({ 
        session_id: sessionId,
        product_id: productId,
        quantity,
        branch_id: branchId
      }),
      headers: {
        'Content-Type': 'application/json',
        'Accept': 'application/json',
      },
    });
  },

  getCart: (sessionId: string) => {
    return apiRequest(PUBLIC_API_ENDPOINTS.cart.get(sessionId), {
      method: 'GET',
      headers: {
        'Content-Type': 'application/json',
        'Accept': 'application/json',
      },
    });
  },

  clearCart: (sessionId: string) => {
    return apiRequest(PUBLIC_API_ENDPOINTS.cart.clear(sessionId), {
      method: 'DELETE',
      headers: {
        'Content-Type': 'application/json',
        'Accept': 'application/json',
      },
    });
  },

  // === PAGAMENTOS ===
  notifyPaymentWebhook: (providerPaymentId: string, status: string) => {
    return apiRequest(PUBLIC_API_ENDPOINTS.payments.notify, {
      method: 'POST',
      body: JSON.stringify({
        provider_payment_id: providerPaymentId,
        status,
      }),
      headers: {
        'Content-Type': 'application/json',
        'Accept': 'application/json',
      },
    });
  },

  // === FUNÇÕES LEGACY (DEPRECATED) ===
  decrementStock: (productId: string, quantity: number) => {
    return apiRequest(`/products/${productId}/decrement-stock`, {
      method: 'POST',
      body: JSON.stringify({ quantity }),
      headers: {
        'Content-Type': 'application/json',
        'Accept': 'application/json',
      },
    });
  },
};

export default publicApi;