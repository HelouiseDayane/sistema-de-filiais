import { useState, useEffect, useCallback, useRef } from 'react';
import { toast } from 'sonner';

export interface ExpirationItem {
  id: string;
  type: 'cart' | 'checkout';
  productId?: string;
  quantity?: number;
  expiresAt: Date;
  sessionId: string;
}

export interface ExpirationStatus {
  timeRemaining: number;
  isExpired: boolean;
  isWarning: boolean; // < 2 minutos restantes
  isCritical: boolean; // < 30 segundos restantes
  formattedTime: string;
}

const CART_EXPIRATION_MINUTES = 5;
const CHECKOUT_EXPIRATION_MINUTES = 5;
const WARNING_THRESHOLD_MINUTES = 2;
const CRITICAL_THRESHOLD_SECONDS = 30;

export const useCartExpiration = () => {
  const [expirationItems, setExpirationItems] = useState<ExpirationItem[]>([]);
  const [currentStatus, setCurrentStatus] = useState<ExpirationStatus | null>(null);
  const intervalsRef = useRef<Map<string, NodeJS.Timeout>>(new Map());

  // Função para formatar tempo restante
  const formatTimeRemaining = (milliseconds: number): string => {
    if (milliseconds <= 0) return '00:00';
    
    const minutes = Math.floor(milliseconds / (1000 * 60));
    const seconds = Math.floor((milliseconds % (1000 * 60)) / 1000);
    
    return `${String(minutes).padStart(2, '0')}:${String(seconds).padStart(2, '0')}`;
  };

  // Calcular status de expiração
  const calculateExpirationStatus = useCallback((expiresAt: Date): ExpirationStatus => {
    const now = new Date();
    const timeRemaining = expiresAt.getTime() - now.getTime();
    const isExpired = timeRemaining <= 0;
    const isWarning = timeRemaining <= WARNING_THRESHOLD_MINUTES * 60 * 1000;
    const isCritical = timeRemaining <= CRITICAL_THRESHOLD_SECONDS * 1000;

    return {
      timeRemaining: Math.max(0, timeRemaining),
      isExpired,
      isWarning: !isExpired && isWarning,
      isCritical: !isExpired && isCritical,
      formattedTime: formatTimeRemaining(timeRemaining)
    };
  }, []);

  // Adicionar item para rastreamento de expiração
  const addExpirationItem = useCallback((item: Omit<ExpirationItem, 'expiresAt'> & { expiresAt?: Date }) => {
    const expiresAt = item.expiresAt || new Date(Date.now() + (item.type === 'cart' ? CART_EXPIRATION_MINUTES : CHECKOUT_EXPIRATION_MINUTES) * 60 * 1000);
    
    const newItem: ExpirationItem = {
      ...item,
      expiresAt
    };

    setExpirationItems(prev => {
      // Remove item existente se houver
      const filtered = prev.filter(existing => existing.id !== newItem.id);
      return [...filtered, newItem];
    });


  }, []);

  // Remover item do rastreamento
  const removeExpirationItem = useCallback((itemId: string) => {
    setExpirationItems(prev => prev.filter(item => item.id !== itemId));
    
    // Limpar interval se existir
    const interval = intervalsRef.current.get(itemId);
    if (interval) {
      clearInterval(interval);
      intervalsRef.current.delete(itemId);
    }
  }, []);

  // Limpar todos os itens de expiração
  const clearAllExpirationItems = useCallback(() => {
    setExpirationItems([]);
    setCurrentStatus(null);
    
    // Limpar todos os intervals
    intervalsRef.current.forEach(interval => clearInterval(interval));
    intervalsRef.current.clear();
  }, []);

  // Obter o item que expira mais cedo
  const getEarliestExpiration = useCallback((): ExpirationItem | null => {
    if (expirationItems.length === 0) return null;
    
    return expirationItems.reduce((earliest, current) => 
      current.expiresAt < earliest.expiresAt ? current : earliest
    );
  }, [expirationItems]);

  // Adicionar item ao carrinho com expiração
  const addToCartWithExpiration = useCallback((productId: string, quantity: number, sessionId: string) => {
    const itemId = `cart_${productId}_${sessionId}`;
    addExpirationItem({
      id: itemId,
      type: 'cart',
      productId,
      quantity,
      sessionId
    });
  }, [addExpirationItem]);

  // Iniciar rastreamento de checkout
  const startCheckoutExpiration = useCallback((orderId: string, sessionId: string) => {
    const itemId = `checkout_${orderId}_${sessionId}`;
    addExpirationItem({
      id: itemId,
      type: 'checkout',
      sessionId
    });
  }, [addExpirationItem]);

  // Callback chamado quando um item expira
  const handleItemExpired = useCallback((item: ExpirationItem, onCartExpired?: () => void, onCheckoutExpired?: () => void) => {
    if (item.type === 'cart') {
      toast.error(`❌ Produto removido do carrinho (tempo limite de ${CART_EXPIRATION_MINUTES} minutos atingido)`);
      // Callback customizado para expiração do carrinho
      if (onCartExpired) {
        onCartExpired();
      }
    } else if (item.type === 'checkout') {
      toast.error(`❌ Checkout expirado (tempo limite de ${CHECKOUT_EXPIRATION_MINUTES} minutos atingido)`);
      // Callback customizado para expiração do checkout
      if (onCheckoutExpired) {
        onCheckoutExpired();
      }
    }

    // Remover item do rastreamento
    removeExpirationItem(item.id);
  }, [removeExpirationItem, CART_EXPIRATION_MINUTES, CHECKOUT_EXPIRATION_MINUTES]);

  // Callback para avisos antes da expiração
  const handleExpirationWarning = useCallback((item: ExpirationItem, status: ExpirationStatus) => {
    if (status.isCritical && !status.isExpired) {
      toast.warning(`⚠️ ${item.type === 'cart' ? 'Carrinho' : 'Checkout'} expira em ${status.formattedTime}!`);
    } else if (status.isWarning && !status.isCritical && !status.isExpired) {
      toast.info(`⏰ ${item.type === 'cart' ? 'Carrinho' : 'Checkout'} expira em ${status.formattedTime}`);
    }
  }, []);

  // Atualizar status em tempo real
  useEffect(() => {
    const earliestItem = getEarliestExpiration();
    
    if (!earliestItem) {
      setCurrentStatus(null);
      return;
    }

    const updateStatus = () => {
      const status = calculateExpirationStatus(earliestItem.expiresAt);
      setCurrentStatus(status);

      if (status.isExpired) {
        handleItemExpired(earliestItem);
      } else {
        // Mostrar avisos apenas uma vez por threshold
        const itemId = earliestItem.id;
        const warningKey = `${itemId}_warning`;
        const criticalKey = `${itemId}_critical`;
        
        if (status.isCritical && !localStorage.getItem(criticalKey)) {
          handleExpirationWarning(earliestItem, status);
          localStorage.setItem(criticalKey, 'shown');
        } else if (status.isWarning && !localStorage.getItem(warningKey)) {
          handleExpirationWarning(earliestItem, status);
          localStorage.setItem(warningKey, 'shown');
        }
      }
    };

    // Atualizar imediatamente
    updateStatus();

    // Configurar interval para atualizações
    const interval = setInterval(updateStatus, 1000);

    // Limpar interval anterior se existir
    const existingInterval = intervalsRef.current.get(earliestItem.id);
    if (existingInterval) {
      clearInterval(existingInterval);
    }

    intervalsRef.current.set(earliestItem.id, interval);

    return () => {
      clearInterval(interval);
      intervalsRef.current.delete(earliestItem.id);
    };
  }, [expirationItems, getEarliestExpiration, calculateExpirationStatus, handleItemExpired, handleExpirationWarning]);

  // Limpar localStorage quando componente é desmontado
  useEffect(() => {
    return () => {
      // Limpar flags de aviso do localStorage
      expirationItems.forEach(item => {
        localStorage.removeItem(`${item.id}_warning`);
        localStorage.removeItem(`${item.id}_critical`);
      });
    };
  }, [expirationItems]);

  return {
    expirationItems,
    currentStatus,
    addExpirationItem,
    removeExpirationItem,
    clearAllExpirationItems,
    addToCartWithExpiration,
    startCheckoutExpiration,
    getEarliestExpiration,
    CART_EXPIRATION_MINUTES,
    CHECKOUT_EXPIRATION_MINUTES
  };
};

export default useCartExpiration;