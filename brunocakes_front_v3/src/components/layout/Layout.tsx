import { Outlet, Link, useLocation, useNavigate } from 'react-router-dom';
import { useApp } from '../../App';
import { Button } from '../ui/button';
import { Badge } from '../ui/badge';
import { 
  LayoutDashboard, 
  Package, 
  ShoppingBag, 
  Truck, 
  Users, 
  ShoppingCart,
  LogOut,
  Menu,
  X
} from 'lucide-react';
import { useState } from 'react';

export function Layout() {
  const { userType, logout, cart } = useApp();
  const location = useLocation();
  const navigate = useNavigate();
  const [isSidebarOpen, setIsSidebarOpen] = useState(false);

  const adminNavItems = [
    { path: '/dashboard', label: 'Dashboard', icon: LayoutDashboard },
    { path: '/products', label: 'Produtos', icon: Package },
    { path: '/orders', label: 'Pedidos', icon: ShoppingBag },
    { path: '/deliveries', label: 'Entregas', icon: Truck },
    { path: '/clients', label: 'Clientes', icon: Users },
  ];

  const clientNavItems = [
    { path: '/dashboard', label: 'Início', icon: LayoutDashboard },
    { path: '/products', label: 'Doces', icon: Package },
    { path: '/my-orders', label: 'Meus Pedidos', icon: ShoppingBag },
  ];

  const navItems = userType === 'admin' ? adminNavItems : clientNavItems;

  const handleLogout = () => {
    logout();
    navigate('/login');
  };

  return (
    <div className="min-h-screen bg-gray-50">
      {/* Mobile Header */}
      <div className="lg:hidden bg-white shadow-sm border-b px-4 py-3 flex items-center justify-between">
        <div className="flex items-center gap-3">
          <Button
            variant="ghost"
            size="sm"
            onClick={() => setIsSidebarOpen(!isSidebarOpen)}
          >
            {isSidebarOpen ? <X className="h-5 w-5" /> : <Menu className="h-5 w-5" />}
          </Button>
          <div className="flex items-center gap-2">
            <div className="w-8 h-8 bg-gradient-to-br from-orange-400 to-red-500 rounded-lg flex items-center justify-center">
              <Package className="h-4 w-4 text-white" />
            </div>
            <span className="text-lg">Sweet Delivery</span>
          </div>
        </div>
        
        <div className="flex items-center gap-2">
          {userType === 'client' && (
            <Button
              variant="ghost"
              size="sm"
              onClick={() => navigate('/checkout')}
              className="relative"
            >
              <ShoppingCart className="h-5 w-5" />
              {cart.length > 0 && (
                <Badge className="absolute -top-2 -right-2 h-5 w-5 p-0 flex items-center justify-center bg-orange-500">
                  {cart.reduce((sum, item) => sum + item.quantity, 0)}
                </Badge>
              )}
            </Button>
          )}
          <Button variant="ghost" size="sm" onClick={handleLogout}>
            <LogOut className="h-5 w-5" />
          </Button>
        </div>
      </div>

      <div className="flex">
        {/* Sidebar */}
        <div className={`
          fixed lg:static inset-y-0 left-0 z-50 w-64 bg-white shadow-lg transform transition-transform duration-200 ease-in-out
          ${isSidebarOpen ? 'translate-x-0' : '-translate-x-full lg:translate-x-0'}
        `}>
          <div className="flex flex-col h-full">
            {/* Logo */}
            <div className="p-6 border-b">
              <div className="flex items-center gap-3">
                <div className="w-10 h-10 bg-gradient-to-br from-orange-400 to-red-500 rounded-xl flex items-center justify-center">
                  <Package className="h-5 w-5 text-white" />
                </div>
                <div>
                  <h1 className="text-xl">Sweet Delivery</h1>
                  <p className="text-sm text-muted-foreground">
                    {userType === 'admin' ? 'Painel Admin' : 'Loja de Doces'}
                  </p>
                </div>
              </div>
            </div>

            {/* Navigation */}
            <nav className="flex-1 p-4">
              <ul className="space-y-2">
                {navItems.map((item) => {
                  const Icon = item.icon;
                  const isActive = location.pathname === item.path || 
                    (item.path !== '/dashboard' && location.pathname.startsWith(item.path));
                  
                  return (
                    <li key={item.path}>
                      <Link
                        to={item.path}
                        onClick={() => setIsSidebarOpen(false)}
                        className={`
                          flex items-center gap-3 px-3 py-2 rounded-lg transition-colors
                          ${isActive 
                            ? 'bg-orange-50 text-orange-600 border border-orange-200' 
                            : 'text-gray-600 hover:bg-gray-50'
                          }
                        `}
                      >
                        <Icon className="h-5 w-5" />
                        <span>{item.label}</span>
                      </Link>
                    </li>
                  );
                })}
              </ul>
            </nav>

            {/* Bottom Actions */}
            <div className="p-4 border-t">
              {userType === 'client' && (
                <Button
                  onClick={() => {
                    navigate('/checkout');
                    setIsSidebarOpen(false);
                  }}
                  className="w-full mb-3 bg-orange-500 hover:bg-orange-600 relative"
                >
                  <ShoppingCart className="h-4 w-4 mr-2" />
                  Carrinho
                  {cart.length > 0 && (
                    <Badge className="absolute -top-2 -right-2 h-5 w-5 p-0 flex items-center justify-center bg-red-500">
                      {cart.reduce((sum, item) => sum + item.quantity, 0)}
                    </Badge>
                  )}
                </Button>
              )}
              <Button
                variant="ghost"
                onClick={handleLogout}
                className="w-full justify-start text-gray-600"
              >
                <LogOut className="h-4 w-4 mr-2" />
                Sair
              </Button>
            </div>
          </div>
        </div>

        {/* Overlay for mobile */}
        {isSidebarOpen && (
          <div 
            className="fixed inset-0 bg-black bg-opacity-50 z-40 lg:hidden"
            onClick={() => setIsSidebarOpen(false)}
          />
        )}

        {/* Main Content */}
        <div className="flex-1 lg:ml-0">
          <main className="p-4 lg:p-6">
            <Outlet />
          </main>
        </div>
      </div>
    </div>
  );
}