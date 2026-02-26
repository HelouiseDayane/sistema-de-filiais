import { useStoreConfig } from '../hooks/useStoreConfig';
import { useEffect } from 'react';

// Componente principal que deve ser usado na raiz da aplicação
// para garantir que as configurações da loja sejam aplicadas globalmente
export const AppThemeProvider = ({ children }: { children: React.ReactNode }) => {
  // Aplica as configurações da loja globalmente
  const { loadStoreConfig } = useStoreConfig();
  
  // Carregamento inicial das configurações (apenas uma vez)
  useEffect(() => {
    loadStoreConfig();
    // Não recarrega automaticamente - configurações são globais e não mudam por filial
    // Se precisar recarregar, use forceReload manualmente
  }, []); // Dependência vazia para executar apenas no mount
  
  return <>{children}</>;
};