import { DOMAIN_BASE_URL, STORE_CONFIG } from './config';
import { updateStoreConfigState } from '../../hooks/useStoreConfigState';
import { PUBLIC_API_ENDPOINTS } from './endpoints';

// Função utilitária para montar a URL da imagem do produto
export const getProductImageUrl = (image: string | undefined | null) => {
  if (!image) return undefined;
  
  // Remove barras iniciais
  const cleanPath = image.replace(/^\/+/, '');
  
  // Se já começa com http, retorna direto
  if (cleanPath.startsWith('http')) return cleanPath;
  
  // Para admin e produção, usar path relativo para aproveitar o proxy nginx
  // que está configurado para servir /storage/ do backend
  
  // Se já começa com storage, retorna path relativo
  if (cleanPath.startsWith('storage/')) {
    return `/${cleanPath}`;
  }
  
  // Se começa com products/, retorna storage/products
  if (cleanPath.startsWith('products/')) {
    return `/storage/${cleanPath}`;
  }
  
  // Caso contrário, assume storage/products
  return `/storage/products/${cleanPath}`;
};

// Função para verificar se está aberto agora, dado o texto de horários
function isOpenNow(horarios: string): boolean {
  // Suporta formatos:
  // "Sábado: 05:00h às 14:00h" ou "05:00 até 14:00" (sem dia e sem 'h')
  const now = new Date();
  const nowBrasilia = new Date(now.toLocaleString('en-US', { timeZone: 'America/Sao_Paulo' }));
  const dias = [
    'Domingo', 'Segunda', 'Terça', 'Quarta', 'Quinta', 'Sexta', 'Sábado'
  ];
  const diaAtual = dias[nowBrasilia.getDay()];

  // 1. Tenta encontrar formato com dia da semana
  let regex = new RegExp(`${diaAtual}[^:]*: ?([0-9]{1,2})[:h]?([0-9]{2})? ?[h]? ?(?:às|ate|até) ?([0-9]{1,2})[:h]?([0-9]{2})?`, 'i');
  let match = horarios.match(regex);
  
  if (!match) {
    // 2. Tenta formato sem dia da semana: "05:00 até 14:00" ou "05:00h às 14:00h"
    regex = /([0-9]{1,2}):?([0-9]{2})? ?[h]? ?(?:às|ate|até) ?([0-9]{1,2}):?([0-9]{2})?/i;
    match = horarios.match(regex);
  }
  
  if (match) {
    // match[1]=horaIni, match[2]=minIni, match[3]=horaFim, match[4]=minFim
    const hA = parseInt(match[1], 10);
    const mA = match[2] ? parseInt(match[2], 10) : 0;
    const hF = parseInt(match[3], 10);
    const mF = match[4] ? parseInt(match[4], 10) : 0;
    const abertura = new Date(nowBrasilia);
    abertura.setHours(hA, mA, 0, 0);
    const fechamento = new Date(nowBrasilia);
    fechamento.setHours(hF, mF, 0, 0);
    
    // Aberto se: nowBrasilia >= abertura && nowBrasilia < fechamento
    const isOpen = nowBrasilia >= abertura && nowBrasilia < fechamento;
    return isOpen;
  }
  // Se não encontrar, assume fechado
  return false;
}

// Função para buscar o endereço ativo do backend e atualizar STORE_CONFIG
export const fetchAndSetActiveAddress = async (apiRequest: (url: string, options?: RequestInit) => Promise<any>) => {
  try {
    // Busca todos os endereços públicos
    const addresses = await apiRequest(`${PUBLIC_API_ENDPOINTS.addresses.list || PUBLIC_API_ENDPOINTS.addresses.public || PUBLIC_API_ENDPOINTS.addresses.all || PUBLIC_API_ENDPOINTS.addresses}`, {
      method: 'GET',
      headers: { 'Accept': 'application/json' },
    });
    // Filtra o endereço ativo
    const active = Array.isArray(addresses) ? addresses.find((a: any) => a.ativo) : null;
    if (active && active.rua) {
      const fullAddress = `${active.rua}, ${active.numero} - ${active.bairro}, ${active.cidade} - ${active.estado}`;
      STORE_CONFIG.address = fullAddress;
      let horarios = active.horarios || '';
      STORE_CONFIG.workingHours = horarios;
      const isOpen = horarios ? isOpenNow(horarios) : false;
      STORE_CONFIG.isOpen = isOpen;
      return fullAddress;
    }
    STORE_CONFIG.address = '';
    STORE_CONFIG.workingHours = '';
    STORE_CONFIG.isOpen = false;
    return '';
  } catch (e) {
    STORE_CONFIG.address = '';
    STORE_CONFIG.workingHours = '';
    STORE_CONFIG.isOpen = false;
    return '';
  }
};

// Busca todos os endereços públicos
export const fetchAllAddresses = async (apiRequest: (url: string, options?: RequestInit) => Promise<any>) => {
  try {
    // Busca todos os endereços públicos
    const addresses = await apiRequest(`${PUBLIC_API_ENDPOINTS.addresses.list || PUBLIC_API_ENDPOINTS.addresses.public || PUBLIC_API_ENDPOINTS.addresses.all || PUBLIC_API_ENDPOINTS.addresses}`, {
      method: 'GET',
      headers: { 'Accept': 'application/json' },
    });
    return Array.isArray(addresses) ? addresses : [];
  } catch (e) {
    return [];
  }
};

// Busca as configurações dinâmicas da loja
// OTIMIZADO: Esta função é chamada apenas uma vez no mount inicial e quando há eventos específicos:
// - Mudança de filial (evento 'branch-updated')
// - Atualização de status de checkout (evento 'checkout-status-changed')
// Usa cache de 5 minutos para evitar requisições desnecessárias
export const fetchStoreSettings = async (apiRequest: (url: string, options?: RequestInit) => Promise<any>) => {
  try {
    // Usar a URL completa da API
    const API_URL = (import.meta as any).env?.VITE_API_BASE_URL || 'http://localhost:8191/api';
    const url = `${API_URL}/store/settings`;
    
    const res = await fetch(url, {
      method: 'GET',
      headers: { 
        'Accept': 'application/json',
        'Content-Type': 'application/json'
      },
    });
    
    if (!res.ok) {
      console.error(`❌ Erro na API de configurações: ${res.status} - ${res.statusText}`);
      return null;
    }
    
    const data = await res.json();
    return data;
  } catch (e) {
    console.error('❌ Erro ao buscar configurações da loja:', e);
    return null;
  }
};

// Atualiza as configurações da loja no STORE_CONFIG
export const updateStoreConfig = (settings: any) => {
  if (settings) {
    STORE_CONFIG.name = settings.store_name || STORE_CONFIG.name;
    STORE_CONFIG.slogan = settings.store_slogan || STORE_CONFIG.slogan; // Corrigido de settings.slogan para settings.store_slogan
    STORE_CONFIG.instagram = settings.instagram ? `@${settings.instagram}` : STORE_CONFIG.instagram;
    
    // Adiciona as configurações de logos e cor primária
    STORE_CONFIG.logoHorizontal = settings.logo_horizontal || STORE_CONFIG.logoHorizontal;
    STORE_CONFIG.logoIcon = settings.logo_icon || STORE_CONFIG.logoIcon;
    STORE_CONFIG.primaryColor = settings.primary_color || STORE_CONFIG.primaryColor;

    // Atualiza o estado reativo para notificar componentes
    updateStoreConfigState({
      storeName: STORE_CONFIG.name,
      slogan: STORE_CONFIG.slogan,
      instagram: STORE_CONFIG.instagram,
      logoHorizontal: STORE_CONFIG.logoHorizontal,
      logoIcon: STORE_CONFIG.logoIcon,
      primaryColor: STORE_CONFIG.primaryColor,
    });
  }
};