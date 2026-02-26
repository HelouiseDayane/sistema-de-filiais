import { createContext, useContext, useEffect, useState, ReactNode } from 'react';
import { API_BASE_URL } from '../api';
import { toast } from 'sonner';
import { OrderStatus } from '../types/orders';

interface StockUpdateEvent {
  type: 'stock_update';
  data: {
    product_id: string;
    total_stock: number;
    reserved_stock: number;
    available_stock: number;
  };
}

interface CartExpiredEvent {
  type: 'cart_expired';
  data: {
    session_id: string;
    product_ids: string[];
  };
}

interface OrderStatusEvent {
  type: 'order_status';
  data: {
    order_id: string;
    status: OrderStatus;
    customer_phone?: string;
  };
}

interface WhatsAppStatusEvent {
  type: 'whatsapp_status';
  data: {
    branch_id: string;
    status: 'connected' | 'connecting' | 'disconnected';
    number?: string;
    connected_at?: string;
    instance_name?: string;
  };
}

type RealTimeEvent = StockUpdateEvent | CartExpiredEvent | OrderStatusEvent | WhatsAppStatusEvent;

interface RealTimeContextProps {
  isConnected: boolean;
  lastEvent: RealTimeEvent | null;
  connectionError: string | null;
  connect: () => void;
  disconnect: () => void;
}

const RealTimeContext = createContext<RealTimeContextProps>({
  isConnected: false,
  lastEvent: null,
  connectionError: null,
  connect: () => {},
  disconnect: () => {},
});

export const useRealTime = () => useContext(RealTimeContext);

interface RealTimeProviderProps {
  children: ReactNode;
  onStockUpdate?: (data: StockUpdateEvent['data']) => void;
  onCartExpired?: (data: CartExpiredEvent['data']) => void;
  onOrderStatusUpdate?: (data: OrderStatusEvent['data']) => void;
  autoConnect?: boolean;
}

export const RealTimeProvider = ({ 
  children, 
  onStockUpdate,
  onCartExpired,
  onOrderStatusUpdate,
  autoConnect = false,
  onWhatsAppStatusUpdate,
}: RealTimeProviderProps & { onWhatsAppStatusUpdate?: (data: WhatsAppStatusEvent['data']) => void }) => {
  const [isConnected, setIsConnected] = useState(false);
  const [lastEvent, setLastEvent] = useState<RealTimeEvent | null>(null);
  const [connectionError, setConnectionError] = useState<string | null>(null);
  const [eventSource, setEventSource] = useState<EventSource | null>(null);

  const connect = () => {
    if (eventSource) {
      eventSource.close();
    }

    try {
      // URL para SSE no backend (você precisará implementar esta rota no Laravel)
      const sse = new EventSource(`${API_BASE_URL}/api/stream/updates`);
      
      sse.onopen = () => {
        setIsConnected(true);
        setConnectionError(null);
      };

      sse.onmessage = (event) => {
        try {
          const eventData: RealTimeEvent = JSON.parse(event.data);
          setLastEvent(eventData);
          // Processar diferentes tipos de eventos
          switch (eventData.type) {
            case 'stock_update':
              onStockUpdate?.(eventData.data);
              
              // Mostrar notificação se estoque ficou baixo
              if (eventData.data.available_stock <= 3 && eventData.data.available_stock > 0) {
                toast.warning(`Estoque baixo! Restam apenas ${eventData.data.available_stock} unidades`);
              } else if (eventData.data.available_stock === 0) {
                toast.error('Produto esgotado!');
              }
              break;

            case 'cart_expired':
              onCartExpired?.(eventData.data);
              toast.info('Um carrinho expirou e o estoque foi liberado');
              break;

            case 'order_status':
              onOrderStatusUpdate?.(eventData.data);
              
              // Notificar sobre mudanças importantes de status
              if (eventData.data.status === 'confirmed') {
                toast.success('Pedido confirmado!');
              } else if (eventData.data.status === 'canceled') {
                toast.error('Pedido cancelado');
              }
              break;

            case 'whatsapp_status':
              onWhatsAppStatusUpdate?.(eventData.data);
              // Notificação opcional
              if (eventData.data.status === 'connected') {
                toast.success('WhatsApp conectado!');
              } else if (eventData.data.status === 'disconnected') {
                toast.error('WhatsApp desconectado!');
              } else {
                toast.info('WhatsApp conectando...');
              }
              break;
          }
        } catch (error) {
          console.error('Erro ao processar evento SSE:', error);
        }
      };

      sse.onerror = (error) => {
        console.error('❌ Erro na conexão SSE:', error);
        setIsConnected(false);
        setConnectionError('Erro na conexão em tempo real');
        
        // Tentar reconectar após 5 segundos
        setTimeout(() => {
          if (sse.readyState === EventSource.CLOSED) {
            connect();
          }
        }, 5000);
      };

      setEventSource(sse);
    } catch (error) {
      console.error('Erro ao estabelecer conexão SSE:', error);
      setConnectionError('Não foi possível conectar ao servidor em tempo real');
    }
  };

  const disconnect = () => {
    if (eventSource) {
      eventSource.close();
      setEventSource(null);
    }
    setIsConnected(false);
    setConnectionError(null);
  };

  useEffect(() => {
    if (autoConnect) {
      connect();
    }

    return () => {
      disconnect();
    };
  }, [autoConnect]);

  // Cleanup na desmontagem
  useEffect(() => {
    return () => {
      if (eventSource) {
        eventSource.close();
      }
    };
  }, [eventSource]);

  const value: RealTimeContextProps = {
    isConnected,
    lastEvent,
    connectionError,
    connect,
    disconnect,
  };

  return (
    <RealTimeContext.Provider value={value}>
      {children}
    </RealTimeContext.Provider>
  );
};

export default RealTimeProvider;