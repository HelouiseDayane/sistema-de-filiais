// Configurações comuns da API
export const API_BASE_URL = (import.meta as any).env.VITE_API_BASE_URL;
export const DOMAIN_BASE_URL = (import.meta as any).env.VITE_DOMAIN_BASE_URL;


export const STORE_CONFIG = {
  name: '', // será preenchido dinamicamente
  slogan: '', // será preenchido dinamicamente
  address: '', // será preenchido dinamicamente
  phone: '(84) 99127-7973',
  instagram: '@brunocakee',
  workingHours: '', // será preenchido dinamicamente
  isOpen: false, // status aberto/fechado
  logoHorizontal: '/Logo horizontal.png', // logo horizontal padrão
  logoIcon: '/icone-selobrunocakes.ico', // ícone padrão
  primaryColor: '#005ef5', // cor primária padrão
} as {
  name: string;
  slogan: string;
  address: string;
  phone: string;
  instagram: string;
  workingHours: string;
  isOpen: boolean;
  logoHorizontal: string;
  logoIcon: string;
  primaryColor: string;
};