import { useState, useEffect } from 'react';

// Tipo para as configurações da loja
interface StoreConfigState {
  storeName: string;
  slogan: string;
  instagram: string;
  phone: string;
  whatsapp: string;
  logoHorizontal: string;
  logoIcon: string;
  primaryColor: string;
}

// Estado inicial
const initialState: StoreConfigState = {
  storeName: '', // será preenchido dinamicamente
  slogan: '', // será preenchido dinamicamente
  instagram: '@brunocakee',
  phone: '',
  whatsapp: '',
  logoHorizontal: '/Logo horizontal.png',
  logoIcon: '/icone-selobrunocakes.ico',
  primaryColor: '#005ef5',
};

// Lista de callbacks para notificar mudanças
const listeners: Array<(state: StoreConfigState) => void> = [];

// Estado global reativo
let globalState: StoreConfigState = { ...initialState };

// Função para atualizar o estado global e notificar listeners
export const updateStoreConfigState = (newState: Partial<StoreConfigState>) => {
  globalState = { ...globalState, ...newState };
  
  // Notifica todos os listeners
  listeners.forEach(listener => listener(globalState));
};

// Hook personalizado que retorna o estado reativo
export const useStoreConfigState = () => {
  const [state, setState] = useState<StoreConfigState>(globalState);

  useEffect(() => {
    // Adiciona listener para mudanças no estado global
    const listener = (newState: StoreConfigState) => {
      setState(newState);
    };
    
    listeners.push(listener);
    
    // Remove listener quando o componente desmonta
    return () => {
      const index = listeners.indexOf(listener);
      if (index > -1) {
        listeners.splice(index, 1);
      }
    };
  }, []);

  return state;
};

// Função para obter o estado atual
export const getStoreConfigState = () => globalState;