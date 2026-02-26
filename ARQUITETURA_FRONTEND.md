# 📘 ARQUITETURA DO FRONTEND - BrunoCakes v3

## 📋 ÍNDICE

1. [Estrutura de Pastas](#estrutura-de-pastas)
2. [Componentes](#componentes)
3. [Hooks Personalizados](#hooks-personalizados)
4. [API Layer](#api-layer)
5. [Rotas](#rotas)
6. [Context & Estado Global](#context--estado-global)
7. [Tipos TypeScript](#tipos-typescript)
8. [Fluxos de Dados](#fluxos-de-dados)
9. [Features Principais](#features-principais)
10. [Tecnologias](#tecnologias)

---

## 📁 ESTRUTURA DE PASTAS

```
brunocakes_front_v3/
├── src/
│   ├── api/                    # Camada de comunicação com backend
│   │   ├── admin/              # APIs administrativas
│   │   │   ├── analytics.ts    # Métricas e dashboards
│   │   │   ├── auth.ts         # Autenticação admin
│   │   │   ├── clients.ts      # Gerenciamento de clientes
│   │   │   ├── orders.ts       # Gerenciamento de pedidos
│   │   │   ├── products.ts     # CRUD de produtos
│   │   │   └── utils.ts        # Utilitários admin
│   │   ├── common/             # Configurações compartilhadas
│   │   │   ├── config.ts       # Constantes de configuração
│   │   │   ├── endpoints.ts    # URLs centralizadas da API
│   │   │   ├── request.ts      # Funções de requisição HTTP
│   │   │   └── utils.ts        # Utilitários compartilhados
│   │   ├── public/             # APIs públicas
│   │   │   └── index.ts        # Produtos, pedidos, carrinho
│   │   └── index.ts            # Export principal da API
│   │
│   ├── components/             # Componentes React
│   │   ├── admin/              # Área administrativa
│   │   │   ├── AdminDashboard.tsx       # Dashboard com métricas
│   │   │   ├── AddressesManagement.tsx  # Gerenciar endereços
│   │   │   ├── BranchesManagement.tsx   # Gerenciar filiais
│   │   │   ├── BranchSelector.tsx       # Seletor de filial admin
│   │   │   ├── ClientsManagement.tsx    # Gerenciar clientes
│   │   │   ├── OrdersManagement.tsx     # Gerenciar pedidos
│   │   │   ├── ProductsManagement.tsx   # CRUD produtos
│   │   │   ├── ProductStockModal.tsx    # Modal estoque por filial
│   │   │   ├── Settings.tsx             # Configurações gerais
│   │   │   ├── StoreSettings.tsx        # Configurações da loja
│   │   │   └── UsersManagement.tsx      # Gerenciar usuários
│   │   │
│   │   ├── auth/               # Autenticação
│   │   │   ├── AdminLogin.tsx           # Login admin
│   │   │   ├── ClientLogin.tsx          # Login cliente
│   │   │   ├── ForgotPassword.tsx       # Recuperar senha
│   │   │   ├── Login.tsx                # Login genérico
│   │   │   ├── ProtectedRoute.tsx       # HOC para rotas protegidas
│   │   │   └── Register.tsx             # Cadastro
│   │   │
│   │   ├── layouts/            # Layouts da aplicação
│   │   │   ├── AdminLayout.tsx          # Layout área admin
│   │   │   ├── ClientLayout.tsx         # Layout área cliente
│   │   │   ├── PublicLayout.tsx         # Layout área pública
│   │   │   └── Layout.tsx               # Layout base
│   │   │
│   │   ├── public/             # Área pública (cardápio)
│   │   │   ├── BranchSelectionModal.tsx # Modal seleção de filial
│   │   │   ├── Cart.tsx                 # Carrinho de compras
│   │   │   ├── Checkout.tsx             # Finalização pedido
│   │   │   ├── OrderTracking.tsx        # Acompanhar pedido
│   │   │   ├── PublicBranchSelector.tsx # Seletor filial público
│   │   │   └── PublicMenu.tsx           # Cardápio público
│   │   │
│   │   ├── ui/                 # Componentes base (shadcn/ui)
│   │   │   ├── button.tsx      # Botões
│   │   │   ├── card.tsx        # Cards
│   │   │   ├── dialog.tsx      # Modais
│   │   │   ├── input.tsx       # Inputs
│   │   │   ├── select.tsx      # Selects
│   │   │   ├── toast.tsx       # Notificações
│   │   │   └── ...             # 40+ componentes UI
│   │   │
│   │   ├── AppThemeProvider.tsx         # Provider de tema
│   │   ├── DynamicMetadata.tsx          # Metadados dinâmicos
│   │   ├── ExpirationNotification.tsx   # Notificação expiração
│   │   ├── PWAInstallButton.tsx         # Botão instalar PWA
│   │   └── ThemeTestComponent.tsx       # Testes de tema
│   │
│   ├── hooks/                  # Custom React Hooks
│   │   ├── useCartExpiration.ts         # Expiração carrinho/checkout
│   │   ├── useExpiration.ts             # Hook genérico de expiração
│   │   ├── usePWA.ts                    # Detectar e instalar PWA
│   │   ├── useRealTime.tsx              # WebSocket/tempo real (legado)
│   │   ├── useRealtimeUpdates.ts        # Server-Sent Events (SSE)
│   │   ├── useStockSync.ts              # Sincronização estoque
│   │   ├── useStoreConfig.ts            # Configurações da loja
│   │   └── useStoreConfigState.ts       # Estado global config loja
│   │
│   ├── routes/                 # Configuração de rotas
│   │   ├── AdminRoutes.tsx     # Rotas administrativas
│   │   └── PublicRoutes.tsx    # Rotas públicas
│   │
│   ├── types/                  # TypeScript interfaces
│   │   ├── admin.ts            # Types área admin
│   │   ├── orders.ts           # Types pedidos
│   │   └── product.ts          # Types produtos
│   │
│   ├── utils/                  # Funções utilitárias
│   │   └── format.ts           # Formatadores (moeda, data, etc)
│   │
│   ├── styles/                 # Estilos globais
│   │   └── globals.css         # CSS global + Tailwind
│   │
│   ├── App.tsx                 # Componente raiz + Context Provider
│   ├── main.tsx                # Entry point do React
│   └── vite-env.d.ts          # Types do Vite
│
├── public/                     # Assets estáticos
│   ├── manifest.json           # PWA manifest
│   └── sw.js                   # Service Worker
│
├── scripts/                    # Scripts utilitários
│   ├── postbuild.sh           # Pós-processamento build
│   └── updateManifestFromStoreSettings.js
│
├── .env                        # Variáveis de ambiente
├── Dockerfile                  # Container Docker
├── nginx.conf                  # Configuração Nginx
├── vite.config.ts             # Configuração Vite
└── package.json               # Dependências
```

---

## 🧩 COMPONENTES

### 📂 `/components/public/` - Área Pública

#### **PublicMenu.tsx**
**Objetivo**: Cardápio público com produtos e seleção de filiais.

**Responsabilidades**:
- ✅ Exibir produtos disponíveis por filial selecionada
- ✅ Filtrar por categoria e termo de busca
- ✅ **Atualização de estoque em tempo real via SSE** (sem polling)
- ✅ Adicionar produtos ao carrinho com atualização otimista
- ✅ Controlar quantidades respeitando estoque disponível
- ✅ Validar horário de funcionamento da filial
- ✅ Gerenciar filial selecionada (localStorage + sync entre abas)
- ✅ Detectar expiração de carrinho via eventos

**Hooks Utilizados**:
- `useApp()` - Estado global (produtos, carrinho, filial)
- `useStockUpdates(branchId, callback, enabled)` - SSE para estoque
- `useStoreConfigState()` - Configurações da loja
- `useCallback()` - Otimizar callbacks SSE

**Estado Local**:
```typescript
searchTerm: string              // Busca de produtos
categoryFilter: string          // Filtro por categoria  
selectedBranch: Branch | null   // Filial selecionada
quantities: {[id]: number}      // Quantidades por produto
branchData: any                 // Dados da filial ativa
footerData: {                   // Dados rodapé
  workingHours: string,
  isOpen: boolean,
  checkoutActive: boolean
}
```

**Fluxo SSE**:
1. Usuário seleciona filial → `useStockUpdates(branch.id, handleStockUpdate, true)`
2. Backend envia evento `stock_update` via Redis Pub/Sub
3. `handleStockUpdate` recarrega produtos da API
4. UI atualiza automaticamente sem polling

**Atualização Otimista do Carrinho**:
- Ao adicionar produto, decrementa `available_stock` localmente
- Não aguarda resposta do backend
- SSE sincroniza valor real posteriormente

---

#### **Cart.tsx**
**Objetivo**: Carrinho de compras persistente.

**Responsabilidades**:
- ✅ Listar itens do carrinho (Context Global)
- ✅ Atualizar quantidades
- ✅ Remover itens
- ✅ Calcular subtotal, taxa de entrega e total
- ✅ Aplicar promoções automaticamente
- ✅ Validar estoque antes de checkout
- ✅ Navegar para `/checkout`

**Integração**:
- `useApp()` para acessar `cart`, `removeFromCart`, `updateCartQuantity`
- LocalStorage para persistência (24h de validade)
- Sync entre abas via `storage` event

---

#### **Checkout.tsx**
**Objetivo**: Finalização de pedido com validação completa.

**Responsabilidades**:
- ✅ Coletar dados: nome, telefone, endereço, complemento
- ✅ Escolher método de pagamento (PIX, cartão, dinheiro)
- ✅ **Validar estoque disponível** antes de confirmar
- ✅ **Reservar produtos no Redis** (15 min de validade)
- ✅ Criar pedido no backend
- ✅ Limpar carrinho após sucesso
- ✅ Redirecionar para `/order-tracking/:orderId`
- ✅ Mostrar timer de expiração da reserva

**Hooks Utilizados**:
- `useExpiration({ expiresAt, onExpired, onWarning })`
- `useCartExpiration()` para gerenciar reservas

**Fluxo**:
1. Valida formulário
2. `POST /api/checkout` → Reserva estoque (15 min)
3. Retorna `order_id` + `expires_at`
4. Timer countdo

---

#### **OrderTracking.tsx**
**Objetivo**: Acompanhamento de pedido em tempo real.

**Responsabilidades**:
- Buscar pedido por ID
- Exibir status atual
- Timeline de progresso
- Detalhes do pedido (produtos, endereço, pagamento)
- Atualizar automaticamente via SSE

**Estados do Pedido**:
- `pending` - Aguardando confirmação
- `confirmed` - Confirmado
- `preparing` - Em preparo
- `ready` - Pronto para entrega
- `out_for_delivery` - Saiu para entrega
- `delivered` - Entregue
- `cancelled` - Cancelado

---

#### **PublicBranchSelector.tsx**
**Objetivo**: Modal/seletor de filial.

**Responsabilidades**:
- Listar filiais disponíveis
- Mostrar horário de funcionamento
- Salvar filial no localStorage
- Emitir evento `branch-updated`

---

### 📂 `/components/admin/` - Área Administrativa

#### **AdminDashboard.tsx**
**Objetivo**: Dashboard com métricas e KPIs.

**Responsabilidades**:
- Exibir cards de métricas (vendas, pedidos, estoque baixo)
- Gráfico de vendas por período
- Lista de pedidos recentes
- Ações rápidas

**Métricas**:
- Total de vendas (hoje, mês, ano)
- Número de pedidos
- Produtos com estoque baixo
- Taxa de conversão

---

#### **ProductsManagement.tsx**
**Objetivo**: Gerenciamento completo de produtos.

**Responsabilidades**:
- Listar todos os produtos
- Criar novos produtos
- Editar produtos existentes
- Ativar/desativar produtos
- Upload de imagens
- Gerenciar categorias
- Definir preços e promoções

**Formulário de Produto**:
```typescript
- name: string
- description: string
- price: number
- promotionPrice?: number
- category: string
- image: File
- isActive: boolean
- isNew: boolean
- isPromotion: boolean
```

---

#### **ProductStockModal.tsx**
**Objetivo**: Gerenciamento de estoque por filial.

**Responsabilidades**:
- Visualizar estoque de um produto em todas as filiais
- Atualizar estoque (adicionar/remover)
- Ver histórico de movimentação
- Alertas de estoque baixo

**Dados Exibidos**:
```typescript
- Filial
- Estoque total
- Estoque reservado
- Estoque disponível
- Ações (adicionar/remover)
```

---

#### **OrdersManagement.tsx**
**Objetivo**: Gerenciamento de todos os pedidos.

**Responsabilidades**:
- Listar pedidos com filtros (status, filial, data)
- Visualizar detalhes do pedido
- Atualizar status
- Confirmar pagamento
- Marcar como entregue
- Cancelar pedidos
- Imprimir/exportar

**Filtros**:
- Por status
- Por filial
- Por período
- Por cliente

---

#### **BranchesManagement.tsx**
**Objetivo**: Gerenciamento de filiais.

**Responsabilidades**:
- Criar nova filial
- Editar informações (nome, endereço, telefone)
- Definir horário de funcionamento
- Ativar/desativar
- Ver estatísticas por filial

---

#### **ClientsManagement.tsx**
**Objetivo**: Gerenciamento de clientes.

**Responsabilidades**:
- Listar clientes
- Ver histórico de pedidos
- Editar dados cadastrais
- Ver métricas (total gasto, frequência)

---

#### **UsersManagement.tsx**
**Objetivo**: Gerenciamento de usuários do sistema (admins).

**Responsabilidades**:
- Criar usuários admin
- Definir permissões
- Ativar/desativar
- Resetar senhas

---

### 📂 `/components/auth/` - Autenticação

#### **AdminLogin.tsx**
**Objetivo**: Login administrativo.

**Responsabilidades**:
- Autenticar admin
- Salvar token no localStorage
- Redirecionar para dashboard

---

#### **Login.tsx / ClientLogin.tsx**
**Objetivo**: Login de clientes (se implementado).

---

### 📂 `/components/layouts/` - Layouts

#### **PublicLayout.tsx**
**Objetivo**: Layout padrão para área pública.

**Componentes**:
- Header com logo e seletor de filial
- Navegação (menu, carrinho)
- Footer com informações da loja
- Container para conteúdo

---

#### **AdminLayout.tsx**
**Objetivo**: Layout para área administrativa.

**Componentes**:
- Sidebar com menu
- Header com perfil do admin
- Breadcrumbs
- Container para conteúdo

---

### 📂 `/components/ui/` - Componentes Base

Componentes reutilizáveis baseados em **shadcn/ui**:

- **Button** - Botões estilizados
- **Card** - Cards para conteúdo
- **Input** - Inputs de formulário
- **Select** - Dropdowns
- **Dialog** - Modais
- **Alert** - Alertas e notificações
- **Badge** - Tags/badges
- **Skeleton** - Loading states
- **Toast** - Notificações temporárias

---

## 🪝 HOOKS

### **useRealtimeUpdates.ts**
**Objetivo**: Hook para Server-Sent Events (SSE).

**Funções Exportadas**:

```typescript
// Hook principal
useRealtimeUpdates(
  branchId?: number,
  callbacks?: {
    onStockUpdate?: (event) => void,
    onOrderUpdate?: (event) => void,
    onConnect?: () => void,
    onError?: (error) => void
  },
  enabled?: boolean
)

// Hook específico para estoque
useStockUpdates(
  branchId: number,
  onUpdate: (event) => void,
  enabled?: boolean
)

// Hook específico para pedidos
useOrderUpdates(
  onUpdate: (event) => void,
  enabled?: boolean
)
```

**Como Funciona**:
1. Cria conexão EventSource com `/api/stream/updates`
2. Subscribe em eventos: `stock_update`, `order_update`, `heartbeat`
3. Reconexão automática com backoff exponencial
4. Callbacks estáveis via `useRef` (evita reconexões)

**Eventos Recebidos**:
```typescript
// stock_update
{
  product_id: number,
  branch_id: number,
  type: 'stock_change' | 'low_stock' | 'out_of_stock',
  available_stock: number,
  total_stock: number,
  reserved_stock: number,
  timestamp: string
}

// heartbeat (a cada 30s)
{
  timestamp: string
}
```

---

### **useStoreConfigState.ts**
**Objetivo**: Gerenciar configurações da loja (nome, horários, etc).

**Retorna**:
```typescript
{
  name: string,
  slogan: string,
  address: string,
  phone: string,
  workingHours: string,
  isOpen: boolean,
  logoHorizontal: string,
  logoIcon: string,
  primaryColor: string
}
```

---

### **useApp.tsx**
**Objetivo**: Estado global da aplicação (Context API).

**Estado Global**:
```typescript
{
  publicProducts: Product[],       // Produtos disponíveis
  cart: CartItem[],                 // Itens no carrinho
  selectedBranch: Branch | null,    // Filial selecionada
  
  // Funções
  setPublicProducts: (products) => void,
  addToCart: (product, quantity) => void,
  removeFromCart: (productId) => void,
  updateCartQuantity: (productId, quantity) => void,
  clearCart: () => void
}
```

---

### **usePWA.ts**
**Objetivo**: Detectar se é mobile/PWA e gerenciar instalação.

**Retorna**:
```typescript
{
  isMobile: boolean,
  isInstalled: boolean,
  canInstall: boolean,
  installApp: () => void
}
```

---

## 🌐 API

### 📂 `/api/common/` - Configurações Compartilhadas

#### **config.ts**
**Objetivo**: Constantes de configuração.

```typescript
export const API_BASE_URL = import.meta.env.VITE_API_BASE_URL;
export const DOMAIN_BASE_URL = import.meta.env.VITE_DOMAIN_BASE_URL;

export const STORE_CONFIG = {
  name: '',
  slogan: '',
  phone: '(84) 99127-7973',
  instagram: '@brunocakee',
  // ...
}
```

---

#### **endpoints.ts**
**Objetivo**: Centralizar todas as URLs da API.

**Estrutura**:
```typescript
export const PUBLIC_API_ENDPOINTS = {
  products: {
    listPublic: `${API_BASE_URL}/products`,
    showPublic: (id) => `${API_BASE_URL}/products/${id}`,
    withStock: `${API_BASE_URL}/products/with-stock`,
    stock: (id) => `${API_BASE_URL}/products/${id}/stock`,
  },
  orders: {
    create: `${API_BASE_URL}/orders`,
    show: (id) => `${API_BASE_URL}/orders/${id}`,
  },
  checkout: {
    create: `${API_BASE_URL}/checkout`,
  },
  cart: {
    add: `${API_BASE_URL}/cart/add`,
    get: (sessionId) => `${API_BASE_URL}/cart/session/${sessionId}`,
  },
  stream: {
    updates: (branchId?) => branchId 
      ? `${API_BASE_URL}/stream/updates?branch_id=${branchId}`
      : `${API_BASE_URL}/stream/updates`,
  },
  store: {
    publicSettings: `${API_BASE_URL}/store/settings`,
  },
};

export const ADMIN_API_ENDPOINTS = {
  auth: {
    login: `${API_BASE_URL}/admin/login`,
    logout: `${API_BASE_URL}/admin/logout`,
  },
  products: {
    list: `${API_BASE_URL}/admin/products`,
    create: `${API_BASE_URL}/admin/products`,
    update: (id) => `${API_BASE_URL}/admin/products/${id}`,
    updateStock: (id) => `${API_BASE_URL}/admin/products/${id}/stock`,
  },
  orders: {
    list: `${API_BASE_URL}/admin/orders`,
    updateStatus: (id) => `${API_BASE_URL}/admin/orders/${id}/status`,
  },
  branches: {
    list: `${API_BASE_URL}/admin/branches`,
    create: `${API_BASE_URL}/admin/branches`,
  },
  // ...
};
```

---

#### **request.ts**
**Objetivo**: Funções helper para fazer requisições HTTP.

**Funções**:
```typescript
// Requisição pública
export const apiRequest = async (url, options) => {
  const response = await fetch(url, {
    ...options,
    headers: getPublicHeaders(),
  });
  return response.json();
}

// Requisição administrativa (com token)
export const adminApiRequest = async (url, options) => {
  const token = localStorage.getItem('admin_token');
  const response = await fetch(url, {
    ...options,
    headers: {
      ...getAdminAuthHeaders(),
      ...options.headers,
    },
  });
  return response.json();
}
```

---

#### **utils.ts**
**Objetivo**: Utilitários compartilhados.

**Funções**:
```typescript
// Gerar URL completa de imagem
export const getProductImageUrl = (image: string) => {
  if (image.startsWith('http')) return image;
  return `${API_BASE_URL}/storage/products/${image}`;
}

// Buscar configurações da loja
export const fetchStoreSettings = async () => {
  return apiRequest(PUBLIC_API_ENDPOINTS.store.publicSettings);
}

// Buscar endereço ativo
export const fetchAndSetActiveAddress = async () => {
  // ...
}
```

---

### 📂 `/api/public/` - APIs Públicas

#### **index.ts**
**Objetivo**: Funções para área pública.

```typescript
export const publicApi = {
  // Listar produtos públicos
  getPublicProducts: async (branchId?: number) => {
    const url = branchId 
      ? `${PUBLIC_API_ENDPOINTS.products.withStock}?branch_id=${branchId}`
      : PUBLIC_API_ENDPOINTS.products.listPublic;
    return apiRequest(url);
  },
  
  // Criar pedido
  createOrder: async (orderData) => {
    return apiRequest(PUBLIC_API_ENDPOINTS.orders.create, {
      method: 'POST',
      body: JSON.stringify(orderData),
    });
  },
  
  // Buscar pedido
  getOrder: async (orderId) => {
    return apiRequest(PUBLIC_API_ENDPOINTS.orders.show(orderId));
  },
  
  // Adicionar ao carrinho
  addToCart: async (productId, quantity, sessionId) => {
    return apiRequest(PUBLIC_API_ENDPOINTS.cart.add, {
      method: 'POST',
      body: JSON.stringify({ product_id: productId, quantity, session_id: sessionId }),
    });
  },
};
```

---

### 📂 `/api/admin/` - APIs Administrativas

#### **index.ts**
**Objetivo**: Funções para área administrativa.

```typescript
export const adminApi = {
  // Produtos
  listProducts: () => adminApiRequest(ADMIN_API_ENDPOINTS.products.list),
  createProduct: (data) => adminApiRequest(ADMIN_API_ENDPOINTS.products.create, {
    method: 'POST',
    body: data, // FormData para upload de imagem
  }),
  updateProduct: (id, data) => adminApiRequest(ADMIN_API_ENDPOINTS.products.update(id), {
    method: 'PUT',
    body: JSON.stringify(data),
  }),
  updateStock: (id, branchId, quantity) => adminApiRequest(
    ADMIN_API_ENDPOINTS.products.updateStock(id),
    {
      method: 'POST',
      body: JSON.stringify({ branch_id: branchId, quantity }),
    }
  ),
  
  // Pedidos
  listOrders: (filters) => adminApiRequest(
    `${ADMIN_API_ENDPOINTS.orders.list}?${new URLSearchParams(filters)}`
  ),
  updateOrderStatus: (id, status) => adminApiRequest(
    ADMIN_API_ENDPOINTS.orders.updateStatus(id),
    {
      method: 'PUT',
      body: JSON.stringify({ status }),
    }
  ),
  
  // Filiais
  listBranches: () => adminApiRequest(ADMIN_API_ENDPOINTS.branches.list),
  createBranch: (data) => adminApiRequest(ADMIN_API_ENDPOINTS.branches.create, {
    method: 'POST',
    body: JSON.stringify(data),
  }),
};
```

---

## 🛣️ ROTAS

### **PublicRoutes.tsx**
**Objetivo**: Rotas da área pública.

```typescript
<Routes>
  <Route path="/" element={<PublicMenu />} />
  <Route path="/cart" element={<Cart />} />
  <Route path="/checkout" element={<Checkout />} />
  <Route path="/order-tracking/:orderId" element={<OrderTracking />} />
  <Route path="/login" element={<Login />} />
</Routes>
```

---

### **AdminRoutes.tsx**
**Objetivo**: Rotas da área administrativa (protegidas).

```typescript
<Routes>
  <Route path="/admin/login" element={<AdminLogin />} />
  
  {/* Rotas protegidas */}
  <Route element={<ProtectedRoute />}>
    <Route path="/admin/dashboard" element={<AdminDashboard />} />
    <Route path="/admin/products" element={<ProductsManagement />} />
    <Route path="/admin/orders" element={<OrdersManagement />} />
    <Route path="/admin/branches" element={<BranchesManagement />} />
    <Route path="/admin/clients" element={<ClientsManagement />} />
    <Route path="/admin/users" element={<UsersManagement />} />
  </Route>
</Routes>
```

---

## 🛠️ UTILITÁRIOS

### **formatters.ts**
```typescript
// Formatar moeda
export const formatCurrency = (value: number) => {
  return new Intl.NumberFormat('pt-BR', {
    style: 'currency',
    currency: 'BRL'
  }).format(value);
}

// Formatar data
export const formatDate = (date: string) => {
  return new Date(date).toLocaleDateString('pt-BR');
}

// Formatar telefone
export const formatPhone = (phone: string) => {
  return phone.replace(/(\d{2})(\d{5})(\d{4})/, '($1) $2-$3');
}
```

---

### **validators.ts**
```typescript
// Validar CPF
export const validateCPF = (cpf: string): boolean => { /* ... */ }

// Validar telefone
export const validatePhone = (phone: string): boolean => { /* ... */ }

// Validar email
export const validateEmail = (email: string): boolean => { /* ... */ }
```

---

## 📊 TIPOS (TypeScript)

### **admin.ts**
```typescript
export interface Branch {
  id: number;
  name: string;
  address: string;
  phone: string;
  is_active: boolean;
  working_hours: string;
}

export interface User {
  id: number;
  name: string;
  email: string;
  role: 'admin' | 'manager';
}
```

---

### **product.ts**
```typescript
export interface Product {
  id: number;
  name: string;
  description: string;
  price: number;
  promotion_price?: number;
  category: string;
  image_url: string;
  is_active: boolean;
  is_new: boolean;
  is_promotion: boolean;
  available_stock?: number;
}
```

---

### **order.ts**
```typescript
export interface Order {
  id: number;
  customer_name: string;
  customer_phone: string;
  delivery_address: string;
  payment_method: 'pix' | 'credit_card' | 'money';
  status: 'pending' | 'confirmed' | 'preparing' | 'ready' | 'out_for_delivery' | 'delivered' | 'cancelled';
  total: number;
  items: OrderItem[];
  branch_id: number;
  created_at: string;
}

export interface OrderItem {
  product_id: number;
  product_name: string;
  quantity: number;
  price: number;
  subtotal: number;
}
```

---

### **cart.ts**
```typescript
export interface CartItem {
  product: Product;
  quantity: number;
  subtotal: number;
}
```

---

## 🔄 FLUXO DE DADOS

### **1. Fluxo de Compra (Cliente)**

```
┌─────────────────┐
│  PublicMenu     │ → Usuário seleciona filial
└────────┬────────┘
         │ SSE conecta: useStockUpdates(branchId)
         ▼
┌─────────────────┐
│ Produtos Listados│ → Exibe produtos com estoque da filial
└────────┬────────┘
         │ Adiciona ao carrinho
         ▼
┌─────────────────┐
│     Cart        │ → Visualiza itens, atualiza quantidades
└────────┬────────┘
         │ Vai para checkout
         ▼
┌─────────────────┐
│   Checkout      │ → Preenche dados, escolhe pagamento
└────────┬────────┘
         │ Submete pedido
         ▼
┌─────────────────┐
│  Backend API    │ → Valida estoque, reserva, cria pedido
└────────┬────────┘
         │ Retorna orderId
         ▼
┌─────────────────┐
│ OrderTracking   │ → Acompanha status via SSE
└─────────────────┘
```

---

### **2. Fluxo de Atualização em Tempo Real (SSE)**

```
┌──────────────────┐
│  useStockUpdates │ → EventSource('/api/stream/updates?branch_id=X')
└────────┬─────────┘
         │ Conexão persistente
         ▼
┌──────────────────┐
│ StreamController │ → Redis Pub/Sub: subscribe('stock-updates')
└────────┬─────────┘
         │ Aguarda eventos
         ▼
┌──────────────────┐
│  VENDA OCORRE    │ → Produto vendido em qualquer filial
└────────┬─────────┘
         │ event(StockUpdated) → broadcast
         ▼
┌──────────────────┐
│  Redis Pub/Sub   │ → publish('stock-updates', {product_id, branch_id, ...})
└────────┬─────────┘
         │
         ▼
┌──────────────────┐
│ StreamController │ → Recebe evento, envia SSE
└────────┬─────────┘
         │ data: {...}
         ▼
┌──────────────────┐
│ useStockUpdates  │ → onStockUpdate(event)
└────────┬─────────┘
         │ Callback executado
         ▼
┌──────────────────┐
│   PublicMenu     │ → Recarrega produtos, atualiza UI
└──────────────────┘
```

---

### **3. Fluxo Administrativo**

```
┌─────────────────┐
│  AdminLogin     │ → Autentica admin
└────────┬────────┘
         │ Token salvo
         ▼
┌─────────────────┐
│ AdminDashboard  │ → Visualiza métricas
└────────┬────────┘
         │
         ├──► ProductsManagement → CRUD de produtos
         ├──► OrdersManagement → Gerencia pedidos, atualiza status
         ├──► BranchesManagement → Gerencia filiais
         └──► ProductStockModal → Atualiza estoque por filial
                    │
                    │ updateStock(productId, branchId, quantity)
                    ▼
            ┌──────────────────┐
            │   Backend API    │ → Atualiza Redis
            └────────┬─────────┘
                     │ event(StockUpdated)
                     ▼
            ┌──────────────────┐
            │ Redis Broadcasting│ → Notifica todos os clientes via SSE
            └──────────────────┘
```

---

## 🎯 PRINCIPAIS FEATURES

### ✅ Server-Sent Events (SSE)
- Conexão persistente do cliente ao backend
- Push de eventos em tempo real
- Reconexão automática
- Heartbeat a cada 30s
- **Sem polling** - economia de 99% das requisições

### ✅ Multi-Filial
- Seleção de filial obrigatória
- Estoque isolado por filial
- Pedidos vinculados à filial
- Relatórios por filial

### ✅ Gestão de Estoque Inteligente
- Reserva temporária (15 min)
- Liberação automática via Jobs
- Validação antes do checkout
- Alertas de estoque baixo

### ✅ Carrinho Persistente
- Session ID no localStorage
- Expira em 24h
- Sincronização entre abas
- Reserva ao finalizar pedido

### ✅ PWA Ready
- Service Worker
- Cache de assets
- Funciona offline (limitado)
- Instalável em mobile

---

## 🚀 TECNOLOGIAS UTILIZADAS

- **React 18** - Framework UI
- **TypeScript** - Type safety
- **Vite** - Build tool (rápido)
- **React Router** - Roteamento SPA
- **TanStack Query** - Cache e sincronização de dados
- **Zustand** - Estado global leve
- **shadcn/ui** - Componentes UI
- **Tailwind CSS** - Estilização
- **Sonner** - Notificações toast
- **EventSource** - SSE nativo

---

## 📈 PERFORMANCE

### Otimizações Implementadas

1. **Code Splitting**
   - Lazy loading de rotas
   - Imports dinâmicos

2. **Caching**
   - React Query para cache de API
   - Service Worker para assets

3. **SSE vs Polling**
   - **Antes**: 9.000 req/min (300 clientes)
   - **Depois**: 300 conexões persistentes
   - **Redução**: 97%

4. **Imagens**
   - Lazy loading
   - WebP quando possível
   - Placeholder blur

---

## 🔒 SEGURANÇA

1. **Autenticação**
   - JWT token no localStorage
   - Expiração automática
   - Rotas protegidas

2. **Validação**
   - Client-side validation
   - Server-side validation (backend)

3. **CORS**
   - Configurado no backend
   - Headers corretos

4. **XSS Protection**
   - Sanitização de inputs
   - React escapa HTML automaticamente

---

## 📝 CONVENÇÕES DE CÓDIGO

### Nomenclatura
- **Componentes**: PascalCase (`PublicMenu.tsx`)
- **Hooks**: camelCase com prefixo `use` (`useStockUpdates.ts`)
- **Utilitários**: camelCase (`formatCurrency`)
- **Tipos**: PascalCase (`Product`, `Order`)

### Estrutura de Componente
```typescript
// 1. Imports
import { useState } from 'react';
import { Button } from '../ui/button';

// 2. Types
interface Props {
  title: string;
}

// 3. Component
export function MyComponent({ title }: Props) {
  // 3.1. Hooks
  const [state, setState] = useState();
  
  // 3.2. Handlers
  const handleClick = () => { /* ... */ };
  
  // 3.3. Effects
  useEffect(() => { /* ... */ }, []);
  
  // 3.4. Render
  return <div>{title}</div>;
}
```

---

## 🧪 TESTES

### Áreas Críticas para Testar

1. **Fluxo de compra completo**
2. **SSE connection/reconnection**
3. **Gerenciamento de carrinho**
4. **Validação de estoque**
5. **Autenticação admin**

---

## 📞 SUPORTE

**Documentação**: Este arquivo  
**Backend**: Ver `ARQUITETURA_BACKEND.md`  
**Infraestrutura**: Ver `docker-compose.yml`

---

**Última Atualização**: 5 de Janeiro de 2026  
**Versão**: 3.0  
**Status**: ✅ Produção
