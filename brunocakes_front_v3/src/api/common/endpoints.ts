// Endpoints públicos (apenas caminhos, sem API_BASE_URL)
export const PUBLIC_API_ENDPOINTS = {
  products: {
    listPublic: '/products',
    showPublic: (id: string) => `/products/${id}`,
    withStock: '/products/with-stock',
    stock: (id: string) => `/products/${id}/stock`,
    allStock: '/products/stock/all',
  },
  orders: {
    create: '/orders',
    show: (id: string) => `/orders/${id}`,
    byContact: '/checkout/pedidos',
  },
  customer: {
    lastOrder: '/customer/last-order',
  },
  checkout: {
    create: '/checkout',
  },
  cart: {
    add: '/cart/add',
    remove: '/cart/remove',
    update: '/cart/update',
    get: (sessionId: string) => `/cart/session/${sessionId}`,
    clear: (sessionId: string) => `/cart/session/${sessionId}`,
  },
  payments: {
    notify: '/payment/notify',
  },
  addresses: {
  },
  store: {
    publicSettings: '/store/settings',
  },
  stream: {
    updates: (branchId?: number) => branchId 
      ? `/api/stream/updates?branch_id=${branchId}`
      : '/api/stream/updates',
  },
};

// Endpoints administrativos (apenas caminhos, sem API_BASE_URL)
export const ADMIN_API_ENDPOINTS = {
  auth: {
    login: '/admin/login',
    logout: '/admin/logout',
    me: '/admin/me',
  },
  products: {
    list: '/admin/products',
    create: '/admin/products',
    show: (id: string) => `/admin/products/${id}`,
    update: (id: string) => `/admin/products/${id}`,
    toggle: (id: string) => `/admin/products/${id}/toggle`,
    stock: (id: string) => `/admin/products/${id}/stock`,
    updateStock: (id: string) => `/admin/products/${id}/stock`,
    reserveStock: (id: string) => `/admin/products/${id}/reserve-stock`,
    syncStock: '/admin/products/sync-stock',
    lowStock: '/admin/products/low-stock',
    stockReport: '/admin/products/stock-report',
  },
  orders: {
    list: '/admin/orders',
    show: (id: string) => `/admin/orders/${id}`,
    update: (id: string) => `/admin/orders/${id}`,
    updateStatus: (id: string) => `/admin/orders/${id}/status`,
    markDelivered: (id: string) => `/admin/orders/${id}/mark-delivered`,
    cancelPayment: '/admin/orders/cancel-payment',
    finish: '/admin/orders/finish',
    approvePayment: '/admin/orders/finish',
    confirmMany: '/admin/orders/confirm-many',
  },
  clients: {
    list: '/admin/clients',
    unique: '/admin/customers/unique',
    show: (id: string) => `/admin/clients/${id}`,
    update: (id: string) => `/admin/clients/${id}`,
    delete: (id: string) => `/admin/clients/${id}`,
  },
  analytics: {
    dashboard: '/admin/dashboard',
    general: '/analytics',
    customers: '/admin/customers/analytics',
  },
  store: {
    settings: '/admin/settings',
    publicSettings: '/store/settings',
  },
  admin: {
    profile: '/admin/profile',
    testQueue: '/admin/test-queue',
  }
};