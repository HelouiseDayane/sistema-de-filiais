import { useState, useEffect, useCallback } from 'react';
import { api } from '../api';

interface StockData {
  [productId: string]: {
    total_stock: number;
    reserved_stock: number;
    available_stock: number;
    is_available?: boolean;
    is_low_stock?: boolean;
  };
}

interface UseStockSyncOptions {
  refreshInterval?: number; // em milissegundos
  enabled?: boolean;
}

export const useStockSync = (options: UseStockSyncOptions = {}) => {
  const { refreshInterval = 10000, enabled = true } = options; // 10 segundos por padrão
  
  const [stockData, setStockData] = useState<StockData>({});
  const [loading, setLoading] = useState(false);
  const [error, setError] = useState<string | null>(null);
  const [lastUpdate, setLastUpdate] = useState<Date | null>(null);

  // Função para buscar estoque de todos os produtos
  const fetchAllStock = useCallback(async () => {
    if (!enabled) {
      console.log('🚫 fetchAllStock: Desabilitado');
      return;
    }
    
    try {
      console.log('🔄 fetchAllStock: Iniciando busca...');
      setLoading(true);
      setError(null);
      
      const response = await api.getAllProductsStock();
      console.log('📥 fetchAllStock: Resposta recebida:', response);
      
      if (response && response.products_stock) {
        // Converter array para objeto indexado por product_id
        const stockMap: StockData = {};
        response.products_stock.forEach((product: any) => {
          stockMap[product.product_id.toString()] = {
            total_stock: product.total_stock,
            reserved_stock: product.reserved_stock,
            available_stock: product.available_stock,
            is_available: product.is_available,
            is_low_stock: product.is_low_stock
          };
        });
        
        console.log('📊 fetchAllStock: StockMap criado:', stockMap);
        setStockData(stockMap);
        setLastUpdate(new Date());
        console.log('📊 Estoque atualizado - stockMap:', stockMap);
        console.log('📊 Produtos com estoque > 0:', Object.entries(stockMap).filter(([id, stock]) => stock.available_stock > 0));
      } else {
        console.log('⚠️ fetchAllStock: Resposta inválida:', response);
      }
    } catch (err: any) {
      console.warn('⚠️ Erro ao buscar estoque:', err.message);
      setError(err.message || 'Erro ao buscar estoque');
    } finally {
      setLoading(false);
    }
  }, [enabled]);

  // Função para buscar estoque de um produto específico
  const fetchProductStock = useCallback(async (productId: string) => {
    try {
      const response = await api.getProductStock(productId);
      
      if (response && typeof response === 'object') {
        setStockData(prev => ({
          ...prev,
          [productId]: {
            total_stock: response.total_stock,
            reserved_stock: response.reserved_stock,
            available_stock: response.available_stock,
            is_available: response.is_available,
            is_low_stock: response.is_low_stock
          }
        }));
        console.log(`📊 Estoque do produto ${productId} atualizado:`, response);
        return response;
      }
    } catch (err: any) {
      console.warn(`⚠️ Erro ao buscar estoque do produto ${productId}:`, err.message);
      throw err;
    }
  }, []);

  // Função para obter estoque disponível de um produto
  const getAvailableStock = useCallback((productId: string | number): number => {
    // Normalizar ID para string
    const id = productId.toString();
    const stock = stockData[id];
    console.log(`🔍 getAvailableStock - ID: ${id}, Stock encontrado:`, stock, 'stockData completo:', stockData);
    return stock?.available_stock ?? 0;
  }, [stockData]);

  // Função para obter estoque total de um produto
  const getTotalStock = useCallback((productId: string | number): number => {
    const id = productId.toString();
    const stock = stockData[id];
    return stock?.total_stock ?? 0;
  }, [stockData]);

  // Função para obter estoque reservado de um produto
  const getReservedStock = useCallback((productId: string | number): number => {
    const id = productId.toString();
    const stock = stockData[id];
    return stock?.reserved_stock ?? 0;
  }, [stockData]);

  // Função para forçar atualização imediata
  const refreshStock = useCallback(() => {
    return fetchAllStock();
  }, [fetchAllStock]);

  // Função para atualizar estoque local (para atualizações otimistas)
  const updateLocalStock = useCallback((productId: string | number, changes: Partial<StockData[string]>) => {
    const id = productId.toString();
    setStockData(prev => ({
      ...prev,
      [id]: {
        ...prev[id],
        ...changes
      }
    }));
  }, []);

  // Efeito para buscar estoque inicial
  useEffect(() => {
    if (enabled) {
      // console.log('🔄 useStockSync: Buscando estoque inicial...');
      fetchAllStock();
    }
  }, [enabled]); // Removeu fetchAllStock da dependência para evitar loops

  // Efeito separado para atualização quando enabled muda
  useEffect(() => {
    if (enabled) {
    //  console.log('🔄 useStockSync: Enabled mudou para true, buscando estoque...');
      fetchAllStock();
    }
  }, [fetchAllStock, enabled]);

  // Efeito para atualização periódica
  useEffect(() => {
    if (!enabled || refreshInterval <= 0) return;

    const interval = setInterval(() => {
      fetchAllStock();
    }, refreshInterval);

    return () => clearInterval(interval);
  }, [fetchAllStock, refreshInterval, enabled]);

  return {
    stockData,
    loading,
    error,
    lastUpdate,
    fetchAllStock,
    fetchProductStock,
    getAvailableStock,
    getTotalStock,
    getReservedStock,
    refreshStock,
    updateLocalStock,
    // Informações úteis
    isStale: lastUpdate ? (Date.now() - lastUpdate.getTime()) > refreshInterval * 2 : true,
    hasStock: (productId: string | number) => getAvailableStock(productId) > 0,
    isLowStock: (productId: string | number, threshold: number = 3) => {
      const id = productId.toString();
      const stock = stockData[id];
      return stock?.is_low_stock || (stock?.available_stock > 0 && stock?.available_stock <= threshold);
    }
  };
};

export default useStockSync;