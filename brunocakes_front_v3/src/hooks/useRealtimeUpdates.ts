import { useEffect, useCallback, useRef } from 'react';
import { PUBLIC_API_ENDPOINTS } from '../api/common/endpoints';

export interface StockUpdateEvent {
  product_id: number;
  branch_id: number;
  type: 'stock_decreased' | 'stock_increased' | 'stock_change';
  timestamp: string;
}

export interface OrderStatusEvent {
  order_id: number;
  status: string;
  timestamp: string;
}

type EventCallback = (event: StockUpdateEvent | OrderStatusEvent) => void;

/**
 * Hook para receber atualizações em tempo real via Server-Sent Events (SSE)
 * 
 * @param branchId - ID da filial para filtrar eventos
 * @param onStockUpdate - Callback chamado quando estoque é atualizado
 * @param onOrderUpdate - Callback chamado quando status de pedido muda
 * @param enabled - Se deve estabelecer conexão (padrão: true)
 */
export function useRealtimeUpdates(
  branchId?: number | null,
  callbacks?: {
    onStockUpdate?: (event: StockUpdateEvent) => void;
    onOrderUpdate?: (event: OrderStatusEvent) => void;
    onConnect?: () => void;
    onError?: (error: Error) => void;
    onGatewayTimeout?: () => void; // Novo callback para erro 504
  },
  enabled: boolean = true
) {
  const eventSourceRef = useRef<EventSource | null>(null);
  const reconnectTimeoutRef = useRef<NodeJS.Timeout | null>(null);
  const reconnectAttempts = useRef(0);
  
  // Usar refs para callbacks para evitar reconexões
  const callbacksRef = useRef(callbacks);
  
  useEffect(() => {
    callbacksRef.current = callbacks;
  }, [callbacks]);

  const connect = useCallback(() => {
    if (!enabled) return;

    const url = PUBLIC_API_ENDPOINTS.stream.updates(branchId ?? undefined);

    try {
      const eventSource = new EventSource(url);
      eventSourceRef.current = eventSource;

      eventSource.onopen = () => {
        reconnectAttempts.current = 0;
        callbacksRef.current?.onConnect?.();
      };

      eventSource.addEventListener('stock_update', (event: MessageEvent) => {
        try {
          const data: StockUpdateEvent = JSON.parse(event.data);
          callbacksRef.current?.onStockUpdate?.(data);
        } catch (error) {}
      });

      eventSource.addEventListener('order_update', (event: MessageEvent) => {
        try {
          const data: OrderStatusEvent = JSON.parse(event.data);
          callbacksRef.current?.onOrderUpdate?.(data);
        } catch (error) {}
      });

      eventSource.addEventListener('heartbeat', () => {});

      eventSource.onerror = (event: any) => {
        eventSource.close();

        // Detecta erro 504 (Gateway Timeout)
        if (event && event.target && event.target.readyState === EventSource.CLOSED) {
          // Pode ser erro de rede, mas vamos tentar detectar pelo status
          // Se disponível, verifica status
          if (event.status === 504 || (event.target.status && event.target.status === 504)) {
            callbacksRef.current?.onGatewayTimeout?.();
          }
        }

        // Reconectar com backoff exponencial
        const delay = Math.min(1000 * Math.pow(2, reconnectAttempts.current), 30000);
        reconnectAttempts.current++;
        reconnectTimeoutRef.current = setTimeout(() => {
          connect();
        }, delay);
        callbacksRef.current?.onError?.(new Error('SSE connection error'));
      };

    } catch (error) {
      callbacksRef.current?.onError?.(error as Error);
    }
  }, [branchId, enabled]); // Removido callbacks das dependências

  const disconnect = useCallback(() => {
    if (eventSourceRef.current) {
      eventSourceRef.current.close();
      eventSourceRef.current = null;
    }

    if (reconnectTimeoutRef.current) {
      clearTimeout(reconnectTimeoutRef.current);
      reconnectTimeoutRef.current = null;
    }
  }, []);

  useEffect(() => {
    if (enabled) {
      connect();
    }

    return () => {
      disconnect();
    };
  }, [enabled, connect, disconnect]);

  return { disconnect };
}

/**
 * Hook simplificado para atualização de estoque
 */
export function useStockUpdates(
  branchId: number | null,
  onUpdate: (event: StockUpdateEvent) => void,
  enabled: boolean = true
) {
  return useRealtimeUpdates(
    branchId,
    { onStockUpdate: onUpdate },
    enabled
  );
}

/**
 * Hook simplificado para atualização de pedidos
 */
export function useOrderUpdates(
  onUpdate: (event: OrderStatusEvent) => void,
  enabled: boolean = true
) {
  return useRealtimeUpdates(
    null,
    { onOrderUpdate: onUpdate },
    enabled
  );
}
