# 📁 Nova Estrutura da API - Bruno Cakes

## 🎯 Objetivo

Reorganizar a API em pastas separadas para cada tela/funcionalidade, mantendo as partes comuns centralizadas para reutilização.

## 📂 Estrutura Organizada

```
src/api/
├── common/           # 🔧 Configurações e utilitários comuns
│   ├── config.ts     # Configurações de API e loja
│   ├── endpoints.ts  # Endpoints centralizados
│   ├── request.ts    # Funções de requisição
│   └── utils.ts      # Utilitários comuns
├── public/           # 🌐 API pública (frontend público)
│   └── index.ts      # Todas as funções da API pública
├── admin/            # 🔐 API administrativa
│   ├── auth.ts       # Autenticação admin
│   ├── products.ts   # Gestão de produtos
│   ├── orders.ts     # Gestão de pedidos
│   ├── clients.ts    # Gestão de clientes
│   ├── analytics.ts  # Analytics e relatórios
│   ├── utils.ts      # Utilitários admin
│   └── index.ts      # API admin consolidada
└── index.ts          # Exportações principais
```

## 🔄 Como Usar

### API Pública
```typescript
import { api } from './api';
// ou
import { publicApi } from './api/public';

// Exemplos de uso
const products = await api.getPublicProducts();
const order = await api.createOrder(orderData);
```

### API Admin
```typescript
import adminApi from './api/admin';
// ou funções específicas
import { authApi, productsApi } from './api/admin';

// Exemplos de uso
const loginResult = await adminApi.login(email, password);
const products = await adminApi.getProducts();
```

### Configurações Comuns
```typescript
import { API_BASE_URL, STORE_CONFIG } from './api';
import { getProductImageUrl } from './api';
```

## 📋 O que foi Organizado

### ✅ Common (Comum)
- **config.ts**: Configurações da API e loja
- **endpoints.ts**: URLs dos endpoints centralizados
- **request.ts**: Funções de requisição HTTP
- **utils.ts**: Utilitários para imagens, endereços, etc.

### ✅ Public (Público)
- Produtos públicos
- Carrinho de compras
- Checkout e pedidos
- Sessões de usuário

### ✅ Admin (Administrativo)
- **auth.ts**: Login/logout admin
- **products.ts**: CRUD de produtos e estoque
- **orders.ts**: Gestão completa de pedidos
- **clients.ts**: Gestão de clientes
- **analytics.ts**: Relatórios e estatísticas
- **utils.ts**: Perfil admin e utilitários

## 🔧 Compatibilidade

Para manter a compatibilidade durante a transição:
- `api_legacy.ts` - Compatibilidade com API pública antiga
- `api_admin_legacy.ts` - Compatibilidade com API admin antiga
- Arquivos antigos renomeados para `*_old.ts`

## 📝 Benefícios

1. **🎨 Organização**: Cada tela tem sua seção específica
2. **🔄 Reutilização**: Partes comuns centralizadas
3. **🚀 Manutenibilidade**: Mais fácil encontrar e editar código
4. **📦 Modularidade**: Importar apenas o que precisa
5. **🧹 Código Limpo**: Separação clara de responsabilidades

## 🚀 Próximos Passos

1. ✅ Estrutura criada
2. ✅ APIs reorganizadas
3. ✅ Compatibilidade mantida
4. 🔄 Atualizar imports nos componentes (gradualmente)
5. 🗑️ Remover arquivos de compatibilidade (após testes)

## 💡 Dica de Uso

Use os imports específicos para melhor performance:
```typescript
// ❌ Evitar importar tudo
import * from './api';

// ✅ Preferir imports específicos
import { api } from './api/public';
import { productsApi } from './api/admin/products';
```