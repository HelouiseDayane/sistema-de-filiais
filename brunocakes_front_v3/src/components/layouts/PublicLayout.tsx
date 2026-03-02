
import { Outlet, Link, useLocation } from 'react-router-dom';
import { useEffect, useState } from 'react';
import { STORE_CONFIG, fetchAndSetActiveAddress, fetchStoreSettings, updateStoreConfig, apiRequest } from '../../api';
import { ShoppingCart, Package, Search, MapPin } from 'lucide-react';
import { Button } from '../ui/button';
import { Badge } from '../ui/badge';
import { useApp } from '../../App';
import { PWAInstallButton } from '../PWAInstallButton';
import { usePWA } from '../../hooks/usePWA';
import { useStoreConfig } from '../../hooks/useStoreConfig';
import { useStoreConfigState } from '../../hooks/useStoreConfigState';
import { ThemeTestComponent, useThemeTest } from '../ThemeTestComponent';
import { BranchSelectionModal } from '../public/BranchSelectionModal';
import { Branch } from '../../types/admin';

export const PublicLayout = () => {
  // Listener global para garantir atualização dos cards em todas as rotas sem reload
  useEffect(() => {
    const handleCartExpired = () => {
      // Atualiza um valor no localStorage para forçar todos os componentes a reagirem
      localStorage.setItem('bruno_cart_expired', String(Date.now()));
    };
    window.addEventListener('cart-expired', handleCartExpired);
    return () => {
      window.removeEventListener('cart-expired', handleCartExpired);
    };
  }, []);
  const { cart } = useApp();
  const location = useLocation();
  const { isMobile } = usePWA();
  const { showThemeTest } = useThemeTest();
  
  // useStoreConfig removido para evitar múltiplas requisições
  
  // Hook reativo para configurações da loja
  const storeConfigState = useStoreConfigState();

  // Estado local para endereços, sem travar renderização global
  const [loadingAddress, setLoadingAddress] = useState(false);
  const [allAddresses, setAllAddresses] = useState<any[]>([]);
  const [branchAddress, setBranchAddress] = useState<any>(null);
  const [branchStatus, setBranchStatus] = useState<any>(null);
  
  // Estado para controle de seleção de filial
  const [showBranchModal, setShowBranchModal] = useState(false);
  const [selectedBranch, setSelectedBranch] = useState<Branch | null>(null);

  // Verificar se já tem filial selecionada no localStorage e validar
  useEffect(() => {
    let timeoutId: NodeJS.Timeout | null = null;
    let validated = false;

    const validateSavedBranch = async () => {
      const savedBranch = localStorage.getItem('selected_branch');
     

      if (!savedBranch) {
        validated = true;
        setShowBranchModal(true);
        return;
      }

      try {
        const parsed = JSON.parse(savedBranch);
       

        // Validar se a filial ainda existe e está ativa
        const branchesResponse = await apiRequest('/branches');
        const branchList = Array.isArray(branchesResponse) ? branchesResponse : [];
      

        const branchExists = branchList.find((b: any) => b.id === parsed.id && b.is_active !== false);
        

        if (branchExists) {
          validated = true;
          setSelectedBranch(parsed);
          setShowBranchModal(false);
        } else {
          validated = true;
          localStorage.removeItem('selected_branch');
          setShowBranchModal(true);
          console.log('❌ Filial inválida, removendo localStorage e abrindo modal [motivo: filial inválida]');
        }
      } catch (e) {
        validated = true;
        console.error('❌ Erro ao validar filial:', e);
        localStorage.removeItem('selected_branch');
        setShowBranchModal(true);
        console.log('❌ Abrindo modal [motivo: erro ao validar filial]');
      }
    };

    // Timeout de segurança: se após 5s não tiver filial válida, força abertura do modal
    timeoutId = setTimeout(() => {
      if (!validated && !selectedBranch) {
        setShowBranchModal(true);
        console.log('⏰ Timeout: Forçando abertura do modal [motivo: timeout sem filial válida]');
      }
    }, 5000);

    validateSavedBranch().then(() => {
      if (timeoutId) clearTimeout(timeoutId);
    });

    return () => {
      if (timeoutId) clearTimeout(timeoutId);
    };
  }, []);

  // Buscar endereço e status da filial selecionada
  useEffect(() => {
    let lastUpdateTimestamp = 0;
    const DEBOUNCE_TIME = 500; // 500ms para evitar requisições duplicadas
    
    const fetchBranchData = async () => {
      const now = Date.now();
      if (now - lastUpdateTimestamp < DEBOUNCE_TIME) {
        console.log('⏭️ Atualização ignorada (debounce)');
        return;
      }
      lastUpdateTimestamp = now;
      
      if (!selectedBranch) {
        setBranchAddress(null);
        setBranchStatus(null);
        return;
      }

      setLoadingAddress(true);
      try {
        const response = await apiRequest('/addresses/active');
        const addressList = Array.isArray(response) ? response : [];
        
        // Encontrar o endereço da filial selecionada
        const address = addressList.find((a: any) => a.branch_id === selectedBranch.id);
        
        if (address) {
          setBranchAddress(address);
          setBranchStatus(address.store_status);
          setAllAddresses([address]); // Para compatibilidade com o footer
        } else {
          setBranchAddress(null);
          setBranchStatus(null);
          setAllAddresses([]);
        }
      } catch (error) {
        console.error('❌ Erro ao buscar dados da filial:', error);
        setBranchAddress(null);
        setBranchStatus(null);
        setAllAddresses([]);
      } finally {
        setLoadingAddress(false);
      }
    };

    fetchBranchData();

    // Listener para evento de atualização de endereço via localStorage (sincroniza entre abas)
    const handleStorageChange = (e: StorageEvent) => {
      if (e.key === 'address_updated') {
        console.log('🔄 Endereço atualizado (localStorage) - recarregando...');
        fetchBranchData();
      }
    };
    
    window.addEventListener('storage', handleStorageChange);

    return () => {
      window.removeEventListener('storage', handleStorageChange);
    };
  }, [selectedBranch]);

  // Listener para evento de troca de filial
  useEffect(() => {
    const handleBranchChange = () => {
      setSelectedBranch(null);
      setShowBranchModal(true);
    };
    window.addEventListener('branch-change-requested', handleBranchChange);
    return () => {
      window.removeEventListener('branch-change-requested', handleBranchChange);
    };
  }, []);

  const handleBranchSelect = (branch: Branch) => {
    console.log('🏪 Filial selecionada:', branch);
    setSelectedBranch(branch);
    localStorage.setItem('selected_branch', JSON.stringify(branch));
    setShowBranchModal(false);
    // Dispara evento para notificar outros componentes
    window.dispatchEvent(new Event('branch-updated'));
  };

  const cartItemsCount = cart.reduce((total, item) => total + item.quantity, 0);

  const isActive = (path: string) => {
    if (path === '/' && location.pathname === '/') return true;
    if (path !== '/' && location.pathname.startsWith(path)) return true;
    return false;
  };

  return (
    <div className="min-h-screen bg-background">
      {/* Header */}
      <header className="sticky top-0 z-50 w-full border-b bg-background/95 backdrop-blur supports-[backdrop-filter]:bg-background/60">
        <div className="container mx-auto px-4">
          <div className="flex h-14 items-center justify-between">
            {/* Logo + Nome + Slogan */}
              <Link to="/" className="flex items-center space-x-3">
                {/* Mobile: só ícone, Desktop: logo + texto */}
                <img
                  src={storeConfigState.logoIcon}
                  alt={storeConfigState.storeName}
                  className="h-16 w-16 block sm:hidden"
                />
                <img
                  src={storeConfigState.logoHorizontal || "/Logo horizontal.png"}
                  alt={storeConfigState.storeName}
                  className="h-16 w-auto hidden sm:block"
                />
                <div className="hidden sm:flex flex-col">
                  <span className="font-bold text-primary text-lg leading-tight">{storeConfigState.storeName}</span>
                  <span className="text-xs text-muted-foreground">{storeConfigState.slogan}</span>
                </div>
              </Link>

            {/* Navigation - Mobile Friendly */}
            <nav className="flex items-center space-x-2 sm:space-x-4">
              <Link to="/">
                <Button
                  variant={isActive('/') ? 'default' : 'ghost'}
                  size={isMobile ? 'sm' : 'default'}
                  className={isActive('/') ? 'bruno-gradient text-white' : ''}
                >
                  {isMobile ? 'Menu' : 'Cardápio'}
                </Button>
              </Link>

              <Link to="/tracking">
                <Button
                  variant={isActive('/tracking') ? 'default' : 'ghost'}
                  size={isMobile ? 'sm' : 'default'}
                  className={`flex items-center gap-1 ${isActive('/tracking') ? 'bruno-gradient text-white' : ''}`}
                >
                  <Search className="w-4 h-4" />
                  {!isMobile && 'Acompanhe seu pedido'}
                </Button>
              </Link>

              <Link to="/cart" className="relative">
                <Button
                  variant={isActive('/cart') ? 'default' : 'ghost'}
                  size={isMobile ? 'sm' : 'default'}
                  className={`flex items-center gap-1 ${isActive('/cart') ? 'bruno-gradient text-white' : ''}`}
                >
                  <ShoppingCart className="w-4 h-4" />
                  {!isMobile && 'Carrinho'}
                </Button>
                {cartItemsCount > 0 && (
                  <Badge 
                    variant="destructive" 
                    className="absolute -top-2 -right-2 h-5 w-5 flex items-center justify-center p-0 text-xs"
                  >
                    {cartItemsCount}
                  </Badge>
                )}
              </Link>

              <Button
                variant="outline"
                size={isMobile ? 'sm' : 'default'}
                className="flex items-center gap-1"
                onClick={() => setShowBranchModal(true)}
                title="Trocar filial"
              >
                <MapPin className="w-4 h-4" />
                {!isMobile && selectedBranch ? selectedBranch.name : 'Filial'}
              </Button>

            </nav>
          </div>
        </div>
      </header>

      <div className="container mx-auto px-4 py-2 flex justify-end">
      <PWAInstallButton />
    </div>

      {/* Main Content */}
      <main className="flex-1">
        <Outlet />
      </main>

      {/* Footer */}
      <footer className="border-t bg-muted/50 mt-auto">
        <div className="container mx-auto px-4 py-6">
          <div className="grid grid-cols-1 md:grid-cols-3 gap-6 text-sm">
            <div>
              <h3 className="font-semibold mb-2 bruno-text-gradient">
                <img 
                  src={storeConfigState.logoHorizontal} 
                  alt={storeConfigState.storeName} 
                  className="h-12 w-auto max-w-32 object-contain inline-block mr-2 align-middle" 
                />
              </h3>
              <p className="text-muted-foreground">
                {storeConfigState.slogan}
              </p>
            </div>
            <div>
              <h4 className="font-semibold mb-2">Contatos</h4>
              <p className="text-muted-foreground">
                {storeConfigState.phone && (
                  <span>
                    <span role="img" aria-label="telefone">📞</span> <span className="font-semibold">{storeConfigState.phone}</span><br />
                  </span>
                )}
                {storeConfigState.whatsapp && (
                  <span>
                    <span role="img" aria-label="whatsapp">🟢</span> <a href={`https://wa.me/${storeConfigState.whatsapp.replace(/\D/g, '')}`} target="_blank" rel="noopener noreferrer" className="text-primary font-semibold underline hover:opacity-80">WhatsApp: {storeConfigState.whatsapp}</a><br />
                  </span>
                )}
                {storeConfigState.instagram && (
                  <span>
                    <span role="img" aria-label="instagram">📸</span> <a href={`https://instagram.com/${storeConfigState.instagram.replace(/^@+/, '')}`} target="_blank" rel="noopener noreferrer" className="text-purple-600 font-semibold underline hover:opacity-80">{storeConfigState.instagram.replace(/^@+/, '@')}</a><br />
                  </span>
                )}
                {allAddresses.length > 0 ? (
                  <span>
                    {allAddresses.map((addr, idx) => (
                      <span key={addr.id || idx}>
                        📍 {addr.rua}, {addr.numero} - {addr.bairro}, {addr.cidade} - {addr.estado}<br/>
                      </span>
                    ))}
                  </span>
                ) : loadingAddress ? (
                  'Carregando endereço...'
                ) : (
                  'Endereço não disponível'
                )}
              </p>
            </div>
            <div>
              <h4 className="font-semibold mb-2">Horário de Funcionamento</h4>
              <p className="text-muted-foreground">
                {branchAddress?.horarios && branchAddress.horarios.trim() !== ''
                  ? branchAddress.horarios
                  : STORE_CONFIG.workingHours && STORE_CONFIG.workingHours.trim() !== ''
                  ? STORE_CONFIG.workingHours
                  : 'Horário não disponível'}
              </p>
              {branchStatus && (
                <div className="mt-2">
                  <span className={`font-semibold ${branchStatus.is_open ? 'text-green-600' : 'text-red-600'}`}>
                    {branchStatus.message}
                  </span>
                  {!branchAddress?.checkout_active && (
                    <span className="block text-orange-600 font-medium mt-1">
                      ⚠️ Loja Fechada
                    </span>
                  )}
                </div>
              )}
            </div>
          </div>
          <div className="border-t pt-4 mt-4 text-center text-muted-foreground">
            <p>© 2025 <a href="https://www.helosworld.com.br/" target="_blank" rel="noopener noreferrer">Helo's World</a>. Todos os direitos reservados.</p>
          </div>
        </div>
      </footer>
      
      {/* Modal de Seleção de Filial - Obrigatório ao acessar o site */}
      <BranchSelectionModal 
        open={showBranchModal}
        onBranchSelect={handleBranchSelect}
        allowClose={!!selectedBranch}
      />
      
      {/* Componente de teste de tema - só aparece em desenvolvimento */}
      {showThemeTest && (import.meta as any).env.DEV && <ThemeTestComponent />}
    </div>
  );
};
