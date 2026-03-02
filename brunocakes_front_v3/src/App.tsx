import React from 'react';
import { BrowserRouter as Router, Routes, Route, Navigate } from 'react-router-dom';
import { useState, createContext, useContext, useEffect, ReactNode } from 'react';
import { Toaster } from './components/ui/sonner';
import { api, getProductImageUrl } from './api';
import adminApi from './api/admin';
import { toast } from 'sonner';
import axios from 'axios';
import { RealTimeProvider } from './hooks/useRealTime';

// Components
import { AdminLayout } from './components/layouts/AdminLayout';
import { PublicLayout } from './components/layouts/PublicLayout';
import { AdminLogin } from './components/auth/AdminLogin';
import { AdminDashboard } from './components/admin/AdminDashboard';
import { ProductsManagement } from './components/admin/ProductsManagement';
import { OrdersManagement } from './components/admin/OrdersManagement';
import ClientsManagement from './components/admin/ClientsManagement';
import { Settings } from './components/admin/Settings';
import { PublicMenu } from './components/public/PublicMenu';
import { Cart } from './components/public/Cart';
import { Checkout } from './components/public/Checkout';
import { OrderTracking } from './components/public/OrderTracking';
import { AddressesManagement } from './components/admin/AddressesManagement';
import { PaymentsManagement } from './components/admin/PaymentsManagement';

// Types
interface Admin {
  id: string;
  name: string;
  email: string;
  role: 'master' | 'admin' | 'employee'; // Roles do sistema
  branch_id?: number | null; // ID da filial
}

interface Product {
  id: string;
  name: string;
  description: string;
  price: number;
  image: string;
  image_url?: string;
  imageUrl?: string;
  file?: File;
  category: string;
  available: boolean;
  stock: number;
  available_stock?: number;
  total_stock?: number; // Estoque total no Redis
  reserved_stock?: number; // Estoque reservado no Redis
  quantity?: number; // Campo alternativo do backend
  expiryDate?: string;
  expires_at?: string; // Campo do backend
  expiresAt?: string | null; // Campo camelCase usado no frontend
  promotionPrice?: number;
  promotion_price?: number; // Campo do backend
  isPromotion?: boolean;
  is_promo?: boolean; // Campo do backend
  isPromo?: boolean; // Campo camelCase usado no frontend
  isNew?: boolean;
  is_new?: boolean; // Campo do backend
  is_active?: boolean;
}

import { Order, CartItem } from './types/orders';

interface Client {
  id: string;
  name: string;
  whatsapp: string;
  email?: string;
}

interface Analytics {
  totalRevenue: number;
  salesByDay: Array<{ date: string; amount: number }>;
  salesByMonth: Array<{ month: string; amount: number }>;
  salesByYear: Array<{ year: string; amount: number }>;
  topProductsMonth: Array<{ name: string; quantity: number; revenue: number }>;
  neighborhoodsSales: Array<{ neighborhood: string; sales: number; revenue: number }>;
  statistics?: {
    totalOrders?: number;
    totalProducts?: number;
    averageOrderValue?: number;
    pendingOrders?: number;
    todaySales?: number;
    conversionRate?: number;
    monthSales?: number;
    yearSales?: number;
  };
  period?: {
    generated_at: string;
    last_30_days_revenue: number;
    current_month_revenue: number;
  };
}

interface AppContextType {
  // Admin
  admin: Admin | null | undefined;
  setAdmin: (admin: Admin | null) => void;
  user: Admin | null | undefined; // Alias para compatibilidade
  login: (email: string, password: string, userType?: 'admin' | 'client') => Promise<boolean>;
  logout: () => void; // Função de logout
  
  // Products
  products: Product[];
  setProducts: (products: Product[]) => void;
  addProduct: (product: Product) => void;
  updateProduct: (id: string, product: Partial<Product>) => void;
  deleteProduct: (id: string) => void;
  publicProducts: Product[];
  setPublicProducts: (products: Product[]) => void;
  adminProducts: Product[];
  setAdminProducts: (products: Product[]) => void;
  
  // Cart
  cart: CartItem[];
  addToCart: (product: Product, quantity: number) => void;
  removeFromCart: (productId: string) => void;
  updateCartItemQuantity: (productId: string, quantity: number) => void;
  updateCartQuantity: (productId: string, quantity: number) => void; // Alias
  clearCart: () => void;
  
  // Orders
  orders: Order[];
  setOrders: (orders: Order[]) => void;
  addOrder: (order: Order) => void;
  updateOrder: (id: string, updates: Partial<Order>) => void;
  
  // Clients
  clients: Client[];
  setClients: (clients: Client[]) => void;
  addClient: (client: Client) => void;
  updateClient: (id: string, client: Partial<Client>) => void;
  deleteClient: (id: string) => void;
  
  // Utils
  loading: boolean;
  getAvailableStock: (productId: string) => number;
  hasStock: (productId: string) => boolean;
  refreshProducts: () => Promise<void>;
  
  // Analytics
  analytics: Analytics | null;
  loadAnalytics: () => Promise<void>;
}

const AppContext = createContext<AppContextType | null>(null);

export const useApp = () => {
  const context = useContext(AppContext);
  if (!context) {
    throw new Error('useApp must be used within an AppProvider');
  }
  return context;
};

const ProtectedRoute = ({ children }: { children: React.ReactNode }) => {
  const { admin, loading } = useApp();

  if (loading) return <div>Carregando...</div>;
  if (!admin) return <Navigate to="/admin/login" />;

  return children;
};

function AppProvider({ children }: { children: ReactNode }) {
  // States
  const [products, setProducts] = useState<Product[]>([]);
  const [cart, setCart] = useState<CartItem[]>([]);
  const [orders, setOrders] = useState<Order[]>([]);
  const [clients, setClients] = useState<Client[]>([]);
  const [publicProducts, setPublicProducts] = useState<Product[]>([]);
  const [adminProducts, setAdminProducts] = useState<Product[]>([]);
  const [loading, setLoading] = useState(true);
  const [admin, setAdmin] = useState<Admin | null>(() => {
  const savedAdmin = localStorage.getItem('bruno_admin');
  return savedAdmin ? (JSON.parse(savedAdmin) as Admin) : null;
});
  
  const [analytics, setAnalytics] = useState<Analytics | null>(null);
  
  // Session ID para o carrinho no backend
  const [sessionId] = useState<string>(() => {
    let savedSessionId = localStorage.getItem('bruno_session_id');
    if (!savedSessionId) {
      savedSessionId = api.generateSessionId();
      localStorage.setItem('bruno_session_id', savedSessionId);
    }
    return savedSessionId;
  });

  const isAdminAuthenticated = admin && ['master', 'admin', 'employee'].includes(admin.role);

  // Load cart from localStorage
  useEffect(() => {
    const savedCart = localStorage.getItem('bruno_cart');
    if (savedCart) {
      try {
        setCart(JSON.parse(savedCart));
      } catch (e) {
        console.error('Error loading cart from localStorage:', e);
      }
    }
  }, []);

  // Save cart to localStorage whenever it changes
  useEffect(() => {
    localStorage.setItem('bruno_cart', JSON.stringify(cart));
  }, [cart]);

  // Verificar se o carrinho backend expirou periodicamente
  useEffect(() => {
    let intervalId: NodeJS.Timeout;

    const checkCartExpiration = async () => {
      if (cart.length > 0) {
        try {
          await api.getCart(sessionId);
        } catch (error: any) {
          // Verifica status HTTP 410 (Gone), 500 (Internal Server Error) ou mensagens conhecidas
          const status = error?.response?.status || error?.status;
          const msg = error?.message || '';
          if (
            status === 410 ||
            status === 500 ||
            msg.includes('expirado') || 
            msg.includes('não encontrado') ||
            msg.includes('Carrinho não encontrado') ||
            (msg.includes('404') && msg.toLowerCase().includes('cart'))
          ) {
            setCart([]);
            localStorage.removeItem('bruno_cart');
            // Chama clearCart para liberar estoque no backend
            await clearCart();
            if (typeof window !== 'undefined') {
              window.dispatchEvent(new CustomEvent('cart-expired', {
                detail: { message: 'Seu carrinho expirou! Você tem apenas 3 minutos para escolher seus produtos.' }
              }));
            }
          }
        }
      }
    };

    // Verificar a cada 30 segundos se há itens no carrinho
    if (cart.length > 0) {
      intervalId = setInterval(checkCartExpiration, 30000);
    }

    return () => {
      if (intervalId) {
        clearInterval(intervalId);
      }
    };
  }, [cart.length, sessionId]);

  // Utility functions for stock
  const getAvailableStock = (productId: string): number => {
    // Primeiro procura nos produtos públicos, que têm o estoque mais atualizado do Redis
    const publicProduct = publicProducts.find(p => String(p.id) === String(productId));
    if (publicProduct) {
      
      // Se tem available_stock, usa ele
      if (publicProduct.available_stock !== undefined && publicProduct.available_stock !== null) {
        const stock = Number(publicProduct.available_stock);
        if (!isNaN(stock)) {
          return stock;
        }
      }
      
      // Se não tem available_stock mas tem total e reserved, calcula
      if (publicProduct.total_stock !== undefined && publicProduct.reserved_stock !== undefined) {
        const total = Number(publicProduct.total_stock);
        const reserved = Number(publicProduct.reserved_stock);
        if (!isNaN(total) && !isNaN(reserved)) {
          const available = Math.max(0, total - reserved);
          return available;
        }
      }

      // Se tem stock, usa ele como fallback
      if (publicProduct.stock !== undefined && publicProduct.stock !== null) {
        const stock = Number(publicProduct.stock);
        if (!isNaN(stock)) {
          return stock;
        }
      }
    }
    
    // Se não achou nos produtos públicos, procura nos produtos normais
    const product = products.find(p => String(p.id) === String(productId));
    if (!product) {
      return 0;
    }
    
    // Mesma lógica para produtos normais
    if (product.available_stock !== undefined && product.available_stock !== null) {
      const stock = Number(product.available_stock);
      if (!isNaN(stock)) {
        return stock;
      }
    }
    
    if (product.stock !== undefined && product.stock !== null) {
      const stock = Number(product.stock);
      if (!isNaN(stock)) {
        return stock;
      }
    }

    return 0;
  };

  const hasStock = (productId: string): boolean => {
    return getAvailableStock(productId) > 0;
  };

    // Cart functions
  const addToCart = async (product: any, quantity: number = 1) => {
    const availableStock = getAvailableStock(product.id);
    
    // Check stock availability
    if (availableStock === 0) {
      toast.error('Produto indisponível! Estoque esgotado.');
      return;
    }
    
    if (availableStock < quantity) {
      toast.error(`Estoque insuficiente. Disponível: ${availableStock}`);
      return;
    }

    setCart(prevCart => {
      const existingItem = prevCart.find(item => String(item.id) === String(product.id));
      
      if (existingItem) {
        const newQuantity = existingItem.quantity + quantity;
        
        // Check if new quantity exceeds stock
        if (newQuantity > availableStock) {
          toast.error(`Estoque insuficiente. Disponível: ${availableStock}`);
          return prevCart;
        }
        
        return prevCart.map(item =>
          String(item.id) === String(product.id)
            ? { ...item, quantity: newQuantity }
            : item
        );
      } else {
        // Garantindo que o produto tem o campo available_stock
        const productWithStock = {
          ...product,
          available_stock: product.available_stock || availableStock
        };
        
        return [...prevCart, {
          id: product.id,
          name: product.name,
          price: product.promotionPrice || product.price,
          quantity,
          image: product.image,
          product: productWithStock
        }];
      }
    });

    // Sincronizar com backend (carrinho com expiração de 3 minutos)
    try {
      await api.addToCart(sessionId, product.id, quantity);
     //  toast.success(`${product.name} adicionado ao carrinho`);
    } catch (error) {
      console.error('Erro ao sincronizar carrinho com backend:', error);
      // Continua funcionando localmente mesmo se o backend falhar
      //toast.success(`${product.name} adicionado ao carrinho (modo offline)`);
    }
  };

  const removeFromCart = async (productId: string) => {
    // Remover do carrinho local
    setCart(prevCart => prevCart.filter(item => item.id !== productId));
    
    // Sincronizar com backend
    try {
      await api.removeFromCart(sessionId, productId);
      toast.success('Item removido do carrinho');
    } catch (error) {
      console.error('Erro ao remover item do carrinho no backend:', error);
      toast.success('Item removido do carrinho (modo offline)');
    }
  };

  const updateCartItemQuantity = async (productId: string, quantity: number) => {
    if (quantity <= 0) {
      removeFromCart(productId);
      return;
    }

    const availableStock = getAvailableStock(productId);
    
    if (quantity > availableStock) {
      toast.error(`Estoque insuficiente. Disponível: ${availableStock}`);
      return;
    }

    // Atualizar carrinho local
    setCart(prevCart =>
      prevCart.map(item =>
        item.id === productId
          ? { ...item, quantity }
          : item
      )
    );

    // Sincronizar com backend
    try {
      await api.updateCartQuantity(sessionId, productId, quantity);
    } catch (error) {
      console.error('Erro ao atualizar quantidade no backend:', error);
      // Continua funcionando localmente
    }
  };

  const clearCart = async () => {
    // Limpar carrinho local
    setCart([]);
    
    // Sincronizar com backend
    try {
      await api.clearCart(sessionId);
    } catch (error) {
      console.error('Erro ao limpar carrinho no backend:', error);
     
    }
  };

  // Product functions
  const addProduct = (product: Product) => {
    setProducts(prev => [...prev, product]);
  };

  const updateProduct = (id: string, productUpdates: Partial<Product>) => {
    setProducts(prev => prev.map(p => p.id === id ? { ...p, ...productUpdates } : p));
  };

  const deleteProduct = (id: string) => {
    setProducts(prev => prev.filter(p => p.id !== id));
  };

  // Refresh products with stock from API
  const refreshProducts = async () => {
    try {
      if (isAdminAuthenticated) {
        const productsFromApi = await adminApi.getProducts();
        const mappedProducts = Array.isArray(productsFromApi) ? productsFromApi.map(mapProductFromBackend) : [];
     
        if (mappedProducts.length > 0) {
          setProducts(mappedProducts);
          setAdminProducts(mappedProducts); // Atualiza também adminProducts
        }
      } else {
        const productsWithStock = await api.getPublicProducts();
        const mappedProducts = Array.isArray(productsWithStock) ? productsWithStock.map(mapProductFromBackend) : [];
        if (mappedProducts.length > 0) {
          setProducts(mappedProducts);
        }
      }
    } catch (error) {
      console.error('❌ Erro ao atualizar produtos:', error);
    }
  };
  // Atualização manual do estoque apenas quando necessário

  // Load analytics data
  const loadAnalytics = async () => {
    try {
      // Usar o endpoint geral de analytics que não requer autenticação especial
      const analyticsData = await adminApi.getGeneralAnalytics();
      
      
      // Verificar se os dados são válidos
      if (!analyticsData || typeof analyticsData !== 'object') {
        console.error('❌ Dados de analytics inválidos:', analyticsData);
        return;
      }
      
      // Os dados já vêm na estrutura correta do /analytics endpoint
      const mappedAnalytics = {
        totalRevenue: parseFloat(analyticsData.totalRevenue || 0),
        salesByDay: analyticsData.salesByDay || [],
        salesByMonth: analyticsData.salesByMonth || [],
        salesByYear: analyticsData.salesByYear || [],
        topProductsMonth: analyticsData.topProductsMonth || [],
        neighborhoodsSales: analyticsData.neighborhoodsSales || [],
        statistics: {
          totalRevenue: parseFloat(analyticsData.totalRevenue || 0),
          totalOrders: parseInt(analyticsData.statistics?.totalOrders || 0),
          totalProducts: parseInt(analyticsData.statistics?.totalProducts || 0),
          averageOrderValue: parseFloat(analyticsData.statistics?.averageOrderValue || 0),
          pendingOrders: parseInt(analyticsData.statistics?.pendingOrders || 0),
          todaySales: parseFloat(analyticsData.statistics?.todaySales || 0),
          monthSales: parseFloat(analyticsData.statistics?.monthSales || 0),
          yearSales: parseFloat(analyticsData.statistics?.yearSales || 0),
          conversionRate: parseFloat(analyticsData.statistics?.conversionRate || 0),
        }
      };
      
      setAnalytics(mappedAnalytics);
    } catch (error) {
      console.error('❌ Erro ao carregar analytics:', error);
      
      // Se for erro de autenticação, mostrar mensagem específica
      if (error instanceof Error && (error.message?.includes('401') || error.message?.includes('Unauthorized'))) {
        console.error('🔒 Erro de autenticação - token pode ter expirado');
      }
      
      // Definir analytics básico para não quebrar a interface
      setAnalytics({
        totalRevenue: 0,
        salesByDay: [],
        salesByMonth: [],
        salesByYear: [],
        topProductsMonth: [],
        neighborhoodsSales: [],
        statistics: {
          totalOrders: 0,
          totalProducts: 0,
          averageOrderValue: 0,
          pendingOrders: 0,
          todaySales: 0,
          monthSales: 0,
          yearSales: 0,
          conversionRate: 0,
        }
      });
    }
  };

  // Load general analytics data  
  const loadGeneralAnalytics = async () => {
    try {
      const generalAnalyticsData = await adminApi.getGeneralAnalytics();
      return generalAnalyticsData;
    } catch (error) {
      console.error('Erro ao carregar analytics gerais:', error);
      return null;
    }
  };

  // Order functions
  const addOrder = (order: Order) => {
    setOrders(prev => [...prev, order]);
  };

  const updateOrder = (id: string, updates: Partial<Order>) => {
    setOrders(prev => prev.map(o => o.id === id ? { ...o, ...updates } : o));
  };

  // Client functions
  const addClient = (client: Client) => {
    setClients(prev => [...prev, client]);
  };

  const updateClient = (id: string, clientUpdates: Partial<Client>) => {
    setClients(prev => prev.map(c => c.id === id ? { ...c, ...clientUpdates } : c));
  };

  const deleteClient = (id: string) => {
    setClients(prev => prev.filter(c => c.id !== id));
  };

  // Função para mapear os dados do backend para camelCase
  function mapProductFromBackend(p: any): Product {
    // Log do produto bruto para depuração
    //console.log('[DEBUG] Produto bruto do backend:', p);
    let stockValue = 0;
    if (p.available_stock !== undefined && p.available_stock !== null && p.available_stock !== '') {
      stockValue = typeof p.available_stock === 'string' ? parseInt(p.available_stock, 10) : Number(p.available_stock);
    } else if (p.quantity !== undefined && p.quantity !== null && p.quantity !== '') {
      stockValue = typeof p.quantity === 'string' ? parseInt(p.quantity, 10) : Number(p.quantity);
    }
    
    // Conversão segura de is_active para boolean
    const isActive = p.is_active === true || p.is_active === 1 || p.is_active === '1' || p.is_active === 'true';

    return {
      id: String(p.id),
      name: p.name || '',
      description: p.description || '',
      price: Number(p.price || 0),
      promotionPrice: p.promotion_price ? Number(p.promotion_price) : undefined,
      category: p.category || '',
      image: p.image || '',
      imageUrl: getProductImageUrl(p.image_url || p.image),
      available: isActive,
      is_active: p.is_active, // Preserva o campo original do backend
      stock: stockValue,
      quantity: p.quantity !== undefined ? (typeof p.quantity === 'string' ? parseInt(p.quantity, 10) : Number(p.quantity)) : 0,
      expiryDate: p.expires_at ? p.expires_at.split(' ')[0] : '',
      expiresAt: p.expires_at || null,
      isPromo: Boolean(p.is_promo),
      isPromotion: Boolean(p.is_promo), // Adicionando isPromotion que está sendo usado no ProductsPage
      isNew: Boolean(p.is_new),
      available_stock: stockValue, // Mantendo para compatibilidade
    };
  }

  // --- Validate admin session on startup ---
  useEffect(() => {
    const validateAdminSession = async () => {
      const savedAdmin = localStorage.getItem('bruno_admin');
      const savedToken = localStorage.getItem('admin_token');

      if (savedAdmin && savedToken) {
        try {
          // Ao invés de verificar /admin/me, vamos usar uma rota que sabemos que existe
          // Por exemplo, tentar carregar produtos (que é uma operação comum)
          await adminApi.getProducts();
          // Se chegou até aqui, o token é válido
           setAdmin(JSON.parse(savedAdmin) as Admin);
         // console.log('✅ Token validado - sessão restaurada');
        } catch (error) {
          console.warn('🔓 Sessão admin expirada, removendo dados:', error);
          // Token inválido, limpar dados
          localStorage.removeItem('bruno_admin');
          localStorage.removeItem('admin_token');
          setAdmin(null);
        }
      } else {
        // Não há dados salvos, definir como null para continuar
        setAdmin(null);
      }
    };

    validateAdminSession();
  }, []);

  // --- Load products for public menu ---
  useEffect(() => {
    const loadPublicProducts = async () => {
      try {
        const productsWithStock = await api.getPublicProducts();
        const mappedProducts = Array.isArray(productsWithStock) ? productsWithStock.map(mapProductFromBackend) : [];
        setPublicProducts(mappedProducts);
      } catch (error) {
        console.error('❌ Erro ao carregar produtos públicos:', error);
        setPublicProducts([]);
      }
      setLoading(false);
    };
    loadPublicProducts();
  }, []);

  // Load orders from backend for admin
  useEffect(() => {
    if (!isAdminAuthenticated) return;

    const fetchOrders = async () => {
      try {
        const backendOrders = await adminApi.getOrders();
        

        // Transform backend data to expected format
        const transformedOrders = backendOrders.map((order: any) => ({
          id: String(order.id),
          clientName: order.customer_name || 'Cliente não informado',
          whatsapp: order.customer_phone || '',
          email: order.customer_email || '',
          items: (order.items || []).map((item: any) => ({
            id: String(item.id || item.product_id),
            name: item.product_name || item.name || 'Produto',
            price: Number(item.unit_price || item.price || 0),
            quantity: Number(item.quantity || 1),
            image: item.image || '',
            product: {
              id: String(item.product_id || item.id),
              name: item.product_name || item.name || 'Produto',
              price: Number(item.unit_price || item.price || 0)
            }
          })),
          total: Number(order.total_amount || 0),
          status: order.status,
          paymentMethod: order.payment_method,
          address: order.address_street || '',
          neighborhood: order.address_neighborhood || '',
          observations: order.observations || '',
          scheduledDate: order.scheduled_date,
          createdAt: order.created_at,
          pixCode: order.payment?.pix_payload ? JSON.parse(order.payment.pix_payload || '{}').copy_paste : null,
          pixExpiresAt: order.checkout_expires_at,
        }));

       // console.log('✅ Pedidos transformados:', transformedOrders);
        setOrders(transformedOrders);
      } catch (error) {
        console.error('Erro ao carregar pedidos:', error);
        toast.error('Erro ao carregar pedidos');
      }
    };

    fetchOrders();
  }, [isAdminAuthenticated]);

    // Load clients from backend for admin
  useEffect(() => {
    if (!isAdminAuthenticated) return;

    const fetchClients = async () => {
      try {
        const backendClients = await adminApi.getUniqueClients();

        // O backend retorna um array direto, não um objeto com propriedade customers
        let clientsData = [];
        
        if (Array.isArray(backendClients)) {
          clientsData = backendClients;
        } else if (backendClients?.customers) {
          // Fallback para formato antigo
          clientsData = backendClients.customers;
        } else {
          clientsData = [];
        }
        
        const transformedClients = clientsData.map((client: any) => ({
          id: String(client.email || client.customer_email || client.phone || client.customer_phone || Math.random()),
          name: client.name || client.customer_name || 'Nome não informado',
          whatsapp: client.phone || client.customer_phone || '',
          email: client.email || client.customer_email || '',
        }));

        setClients(transformedClients);
      } catch (error) {
        console.error('Erro ao carregar clientes:', error);
        // toast.error('Erro ao carregar clientes'); // Comentado para não mostrar erro sempre
      }
    };

    fetchClients();
  }, [isAdminAuthenticated]);

  // Auth functions
  const login = async (email: string, password: string, userType: 'admin' | 'client' = 'admin'): Promise<boolean> => {
    try {
      setLoading(true);
      
      if (userType === 'admin') {
        // Usar a API administrativa em vez de axios direto
        const response = await adminApi.login(email, password);
        
        if (response && response.token) {
          const adminUser: Admin = {
            id: response.user?.id || '1',
            name: response.user?.name || 'Admin',
            email: response.user?.email || email,
            role: response.user?.role || 'employee', // Pega o role real do backend
            branch_id: response.user?.branch_id || null // Adiciona o branch_id também
          };
          setAdmin(adminUser);
          localStorage.setItem('bruno_admin', JSON.stringify(adminUser)); // Salva no localStorage
          return true;
        }
      }
      
      return false;
    } catch (error) {
      toast.error('Erro ao fazer login. Verifique suas credenciais.');
      return false;
    } finally {
      setLoading(false);
    }
  };

  // Logout function
  const logout = async () => {
    try {
      await adminApi.logout();
    } catch (error) {
      console.warn('Erro ao fazer logout:', error);
    } finally {
      setAdmin(null);
      localStorage.removeItem('bruno_admin'); // 👈 Remove do localStorage
      toast.success('Logout realizado com sucesso');
    }
  };

  const contextValue: AppContextType = {
    // Admin
    admin,
    setAdmin,
    user: admin, // Alias para compatibilidade
    login,
    logout,

    // Products
    products: products || [],
    setProducts,
    addProduct,
    updateProduct,
    deleteProduct,
    publicProducts: publicProducts || [],
    setPublicProducts,
    adminProducts: adminProducts || [],
    setAdminProducts,

    // Cart
    cart: cart || [],
    addToCart,
    removeFromCart,
    updateCartItemQuantity,
    updateCartQuantity: updateCartItemQuantity, // Alias
    clearCart,

    // Orders
    orders: orders || [],
    setOrders,
    addOrder,
    updateOrder,

    // Clients
    clients: clients || [],
    setClients,
    addClient,
    updateClient,
    deleteClient,

    // Utils
    loading,
    getAvailableStock,
    hasStock,
    refreshProducts,

    // Analytics
    analytics,
    loadAnalytics,
  };

  return (
    <AppContext.Provider value={contextValue}>
      {children}
    </AppContext.Provider>
  );
}

function App() {
  return (
    <Router>
      <RealTimeProvider>
        <AppProvider>
          <div className="min-h-screen bg-gray-50">
            <Routes>
              {/* Admin Routes */}
              <Route path="/admin/login" element={<AdminLogin />} />
              <Route
                path="/admin/*"
                element={
                  <ProtectedRoute>
                    <AdminLayout />
                  </ProtectedRoute>
                }
              >
                <Route index element={<AdminDashboard />} />
                <Route path="dashboard" element={<AdminDashboard />} />
                <Route path="products" element={<ProductsManagement />} />
                <Route path="orders" element={<OrdersManagement />} />
                <Route path="clients" element={<ClientsManagement />} />
                <Route path="addresses" element={<AddressesManagement />} />
                <Route path="payments" element={<PaymentsManagement />} />
                <Route path="settings" element={<Settings />} />
              </Route>
              <Route path="*" element={<Navigate to="/admin/login" />} />

              {/* Public Routes */}
              <Route path="/" element={<PublicLayout />}>
                <Route index element={<PublicMenu />} />
                <Route path="menu" element={<PublicMenu />} />
                <Route path="cart" element={<Cart />} />
                <Route path="checkout" element={<Checkout />} />
                <Route path="tracking" element={<OrderTracking />} />
                <Route path="order/:id" element={<OrderTracking />} />
              </Route>

              {/* Redirect unknown routes to home */}
              <Route path="*" element={<Navigate to="/" replace />} />
            </Routes>
            <Toaster 
              position="top-right"
              richColors
              closeButton
            />
          </div>
        </AppProvider>
      </RealTimeProvider>
    </Router>
  );
}

export default App;