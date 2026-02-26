import { Outlet, NavLink, useLocation } from 'react-router-dom';
import { useApp } from '../../App';
import { Button } from '../ui/button';
import { Badge } from '../ui/badge';
import { 
  ShoppingBag, 
  MenuIcon, 
  ShoppingCart, 
  Receipt, 
  LogOut,
  Menu,
  X,
  User
} from 'lucide-react';
import { useState } from 'react';

export function ClientLayout() {
  const { user, logout, cart } = useApp();
  const location = useLocation();
  const [sidebarOpen, setSidebarOpen] = useState(false);

  const cartItemsCount = cart.reduce((total, item) => total + item.quantity, 0);

  const navigation = [
    { name: 'Cardápio', href: '/menu', icon: MenuIcon },
    { name: 'Carrinho', href: '/cart', icon: ShoppingCart, badge: cartItemsCount || null },
    { name: 'Meus Pedidos', href: '/orders', icon: Receipt },
  ];

  const isActive = (path: string) => {
    if (path === '/menu') {
      return location.pathname === '/menu' || location.pathname === '/';
    }
    return location.pathname.startsWith(path);
  };

  return (
    <div className="min-h-screen bg-orange-50">
      {/* Mobile menu button */}
      <div className="lg:hidden fixed top-4 left-4 z-50">
        <Button
          variant="outline"
          size="icon"
          onClick={() => setSidebarOpen(!sidebarOpen)}
          className="bg-white shadow-md"
        >
          {sidebarOpen ? <X className="h-4 w-4" /> : <Menu className="h-4 w-4" />}
        </Button>
      </div>

      {/* Top bar for mobile */}
      <div className="lg:hidden bg-white border-b border-orange-200 p-4 pl-16">
        <div className="flex items-center justify-between">
          <div className="flex items-center gap-3">
            <div className="w-8 h-8 bg-orange-500 rounded-full flex items-center justify-center">
              <ShoppingBag className="w-4 h-4 text-white" />
            </div>
            <h1 className="font-semibold text-orange-900">Restaurante</h1>
          </div>
          <div className="flex items-center gap-2">
            <User className="w-4 h-4 text-orange-700" />
            <span className="text-sm text-orange-800">{user?.name}</span>
          </div>
        </div>
      </div>

      {/* Sidebar */}
      <div className={`
        fixed inset-y-0 left-0 z-40 w-64 bg-white border-r border-orange-200 transition-transform duration-300 ease-in-out
        ${sidebarOpen ? 'translate-x-0' : '-translate-x-full'}
        lg:translate-x-0 lg:static lg:inset-0
      `}>
        <div className="flex flex-col h-full">
          {/* Header */}
          <div className="flex items-center gap-3 p-6 border-b border-orange-200">
            <div className="w-8 h-8 bg-orange-500 rounded-full flex items-center justify-center">
              <ShoppingBag className="w-4 h-4 text-white" />
            </div>
            <div>
              <h2 className="font-semibold text-orange-900">Restaurante</h2>
              <p className="text-sm text-orange-600">{user?.name}</p>
            </div>
          </div>

          {/* Navigation */}
          <nav className="flex-1 p-4 space-y-2">
            {navigation.map((item) => {
              const Icon = item.icon;
              return (
                <NavLink
                  key={item.name}
                  to={item.href}
                  onClick={() => setSidebarOpen(false)}
                  className={`
                    flex items-center gap-3 px-3 py-2 rounded-md transition-colors relative
                    ${isActive(item.href)
                      ? 'bg-orange-500 text-white'
                      : 'text-orange-700 hover:bg-orange-100'
                    }
                  `}
                >
                  <Icon className="w-5 h-5" />
                  {item.name}
                  {item.badge && (
                    <Badge 
                      className={`ml-auto ${
                        isActive(item.href) 
                          ? 'bg-white text-orange-500' 
                          : 'bg-orange-500 text-white'
                      }`}
                    >
                      {item.badge}
                    </Badge>
                  )}
                </NavLink>
              );
            })}
          </nav>

          {/* Logout */}
          <div className="p-4 border-t border-orange-200">
            <Button
              variant="outline"
              onClick={logout}
              className="w-full justify-start gap-3 border-orange-300 text-orange-700 hover:bg-orange-100"
            >
              <LogOut className="w-4 h-4" />
              Sair
            </Button>
          </div>
        </div>
      </div>

      {/* Overlay for mobile */}
      {sidebarOpen && (
        <div 
          className="fixed inset-0 bg-black/20 z-30 lg:hidden"
          onClick={() => setSidebarOpen(false)}
        />
      )}

      {/* Main content */}
      <div className="lg:ml-64">
        <main className="p-6 lg:p-8 pt-6 lg:pt-8">
          <Outlet />
        </main>
      </div>
    </div>
  );
}