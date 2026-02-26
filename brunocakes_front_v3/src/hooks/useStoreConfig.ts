import { useEffect, useRef, useState } from 'react';
import { fetchStoreSettings, updateStoreConfig, apiRequest } from '../api';

// Variável global para armazenar a última cor aplicada
let lastAppliedColor: string | null = null;

// Função para converter hex para oklch de forma mais precisa
const hexToOklch = (hex: string) => {
  // Remove o # se presente
  hex = hex.replace('#', '');
  
  // Para cores específicas conhecidas, usar valores precisos
  const colorMap: { [key: string]: string } = {
    '005ef5': 'oklch(0.55 0.25 264)', // Azul preciso
    '1f71f4': 'oklch(0.58 0.24 258)', // Azul claro
    '0066ff': 'oklch(0.56 0.26 265)', // Azul puro
    '007bff': 'oklch(0.62 0.23 255)', // Azul Bootstrap
  };
  
  // Se temos um mapeamento direto, usa ele
  if (colorMap[hex.toLowerCase()]) {
    return colorMap[hex.toLowerCase()];
  }
  
  // Converte para RGB
  const r = parseInt(hex.substr(0, 2), 16) / 255;
  const g = parseInt(hex.substr(2, 2), 16) / 255;
  const b = parseInt(hex.substr(4, 2), 16) / 255;
  
  // Conversão mais simples que preserva a cor visual
  // Para azuis, usar valores que mantêm a aparência
  const isBlue = b > r && b > g;
  const isRed = r > g && r > b;
  const isGreen = g > r && g > b;
  
  let lightness, chroma, hue;
  
  if (isBlue) {
    // Para azuis, manter valores que preservam a cor
    lightness = 0.5 + (r + g + b) * 0.15;
    chroma = 0.2 + Math.max(b - Math.max(r, g), 0) * 0.3;
    hue = 260 + (g - r) * 20;
  } else if (isRed) {
    lightness = 0.45 + (r + g + b) * 0.2;
    chroma = 0.18 + Math.max(r - Math.max(g, b), 0) * 0.35;
    hue = 15 + (g - b) * 30;
  } else if (isGreen) {
    lightness = 0.55 + (r + g + b) * 0.15;
    chroma = 0.16 + Math.max(g - Math.max(r, b), 0) * 0.3;
    hue = 130 + (b - r) * 25;
  } else {
    // Cores neutras ou mistas
    lightness = (r + g + b) / 3;
    chroma = Math.max(r, g, b) - Math.min(r, g, b);
    hue = 0;
  }
  
  return `oklch(${lightness.toFixed(3)} ${chroma.toFixed(3)} ${hue.toFixed(0)})`;
};

// Função para aplicar a cor primária dinamicamente no CSS
export const applyPrimaryColor = (primaryColor: string) => {
  if (!primaryColor || !primaryColor.startsWith('#')) return;
  
  try {
    // Usar a cor hex diretamente para máxima precisão
    const hexColor = primaryColor;
    
    // Converte para RGB para calcular variações
    const hex = hexColor.replace('#', '');
    const r = parseInt(hex.substr(0, 2), 16);
    const g = parseInt(hex.substr(2, 2), 16);
    const b = parseInt(hex.substr(4, 2), 16);
    
    // Gera variações da cor usando hex
    const lighterColor = `rgb(${Math.min(255, r + 40)}, ${Math.min(255, g + 40)}, ${Math.min(255, b + 40)})`;
    const darkerColor = `rgb(${Math.max(0, r - 40)}, ${Math.max(0, g - 40)}, ${Math.max(0, b - 40)})`;
    const accentColor = `rgba(${r}, ${g}, ${b}, 0.1)`;
    
    // Remove estilos anteriores 
    const existingStyle = document.getElementById('bruno-dynamic-styles');
    if (existingStyle) {
      existingStyle.remove();
    }
    
    // Aplica as cores diretamente com !important para garantir prioridade
    const style = document.createElement('style');
    style.innerHTML = `
      :root {
        --primary: ${hexColor} !important;
        --primary-rgb: ${r}, ${g}, ${b} !important;
        --secondary: ${lighterColor} !important;
        --secondary-foreground: ${darkerColor} !important;
        --accent: ${accentColor} !important;
        --ring: ${hexColor} !important;
        --sidebar-primary: ${hexColor} !important;
        --sidebar-ring: ${hexColor} !important;
      }
      
      /* Força aplicação APENAS em elementos que já usam classes primárias */
      .text-primary:not(.product-badge-promocao):not(.product-badge-novo):not(.force-red-bg):not(.force-green-bg) {
        color: ${hexColor} !important;
      }
      
      .bg-primary:not(.product-badge-promocao):not(.product-badge-novo):not(.force-red-bg):not(.force-green-bg) {
        background-color: ${hexColor} !important;
      }
      
      .border-primary:not(.product-badge-promocao):not(.product-badge-novo):not(.force-red-bg):not(.force-green-bg) {
        border-color: ${hexColor} !important;
      }
      
      /* Gradientes Bruno - elementos que já usam essas classes */
      .bruno-gradient:not(.product-badge-promocao):not(.product-badge-novo):not(.force-red-bg):not(.force-green-bg) {
        background: linear-gradient(135deg, ${hexColor} 0%, ${darkerColor} 100%) !important;
        color: white !important;
      }
      
      .bruno-text-gradient:not(.product-badge-promocao):not(.product-badge-novo):not(.force-red-bg):not(.force-green-bg) {
        background: linear-gradient(135deg, ${hexColor} 0%, ${darkerColor} 100%) !important;
        -webkit-background-clip: text !important;
        -webkit-text-fill-color: transparent !important;
        background-clip: text !important;
      }
      
      /* Botões específicos que já têm classe bg-primary */
      button.bg-primary,
      .btn-primary {
        background-color: ${hexColor} !important;
        border-color: ${hexColor} !important;
        color: white !important;
      }
      
      /* FORÇA RESET de badges de promoção - maior especificidade */
      .product-badge-promocao,
      [data-badge="promocao"],
      .force-red-bg,
      span.product-badge-promocao,
      div .product-badge-promocao {
        background-color: #ef4444 !important;
        background: #ef4444 !important;
        color: white !important;
        border-color: #ef4444 !important;
        border: 1px solid #ef4444 !important;
      }

      .product-badge-novo,
      [data-badge="novo"], 
      .force-green-bg,
      span.product-badge-novo,
      div .product-badge-novo {
        background-color: #22c55e !important;
        background: #22c55e !important;
        color: white !important;
        border-color: #22c55e !important;
        border: 1px solid #22c55e !important;
      }
      
      button.bg-primary:hover,
      .btn-primary:hover {
        background-color: ${darkerColor} !important;
        border-color: ${darkerColor} !important;
      }
      
      /* Links específicos que já têm classe text-primary */
      a.text-primary {
        color: ${hexColor} !important;
      }
      
      a.text-primary:hover {
        color: ${darkerColor} !important;
      }
      
      /* Badges específicos que já têm classes primárias */
      .badge-primary {
        background-color: ${hexColor} !important;
        color: white !important;
      }
      
      /* Elementos de ring/focus específicos */
      .ring-primary {
        --tw-ring-color: ${hexColor} !important;
      }
      
      /* Tailwind específicos que já usam primary */
      .decoration-primary {
        text-decoration-color: ${hexColor} !important;
      }
      
      .fill-primary {
        fill: ${hexColor} !important;
      }
      
      .stroke-primary {
        stroke: ${hexColor} !important;
      }
      
      /* Navegação ativa com bruno-gradient */
      .bruno-gradient {
        background: linear-gradient(135deg, ${hexColor} 0%, ${darkerColor} 100%) !important;
        color: white !important;
      }
      
      /* NÃO aplicar em campos de input, selects, etc - manter cores originais */
      input, select, textarea {
        background-color: initial !important;
        color: initial !important;
        border-color: initial !important;
      }
      
      /* NÃO aplicar em containers de formulário */
      .form-control, .form-input, .form-select {
        background-color: initial !important;
        color: initial !important;
        border-color: initial !important;
      }
    `;
    
    style.id = 'bruno-dynamic-styles';
    document.head.appendChild(style);
    
  } catch (error) {
    console.error('❌ Erro ao aplicar cor primária:', error);
  }
};

// Função para atualizar elementos de logo na página
export const updateLogoElements = (type: 'horizontal' | 'icon', logoUrl: string) => {
  try {
    if (type === 'horizontal') {
      // Seletores específicos para logos horizontais (desktop)
      const selectors = [
        'img[src*="Logo horizontal"]',
        'img[src*="/Logo%20horizontal"]', 
        'img.hidden.sm\\:block', // Logo que aparece apenas no desktop
        'img[alt*="Logo Horizontal"]'
      ];
      
      let elementsFound = 0;
      selectors.forEach(selector => {
        const elements = document.querySelectorAll(selector);
        elementsFound += elements.length;
        
        elements.forEach((img) => {
          const element = img as HTMLImageElement;
          // Só atualiza se não for um ícone
          if (!element.src.includes('icone-') && !element.classList.contains('block')) {
            element.src = logoUrl;
            element.onerror = () => console.error(`❌ Erro ao carregar logo horizontal: ${logoUrl}`);
          }
        });
      });
      
      if (elementsFound > 0) {
        console.log(`✅ ${elementsFound} logos horizontais atualizados`);
      }
      
    } else if (type === 'icon') {
      // Seletores específicos para ícones (mobile)
      const selectors = [
        'img[src*="icone-selobrunocakes"]',
        'img[src*=".ico"]',
        'img.block.sm\\:hidden', // Logo que aparece apenas no mobile
        'img.h-16.w-16', // Ícones quadrados
        'img[alt*="Logo Ícone"]'
      ];
      
      let elementsFound = 0;
      selectors.forEach(selector => {
        const elements = document.querySelectorAll(selector);
        elementsFound += elements.length;
        
        elements.forEach((img) => {
          const element = img as HTMLImageElement;
          // Só atualiza se for realmente um ícone
          if (element.classList.contains('block') || element.src.includes('icone-') || element.classList.contains('h-16')) {
            element.src = logoUrl;
            element.onerror = () => console.error(`❌ Erro ao carregar ícone: ${logoUrl}`);
          }
        });
      });
      
      if (elementsFound > 0) {
        console.log(`✅ ${elementsFound} ícones atualizados`);
      }
    }
    
    // Método alternativo: buscar todas as imagens e verificar o src atual
    const allImages = document.querySelectorAll('img');
    let alternativeUpdates = 0;
    
    allImages.forEach((img) => {
      const element = img as HTMLImageElement;
      const currentSrc = element.src;
      const altText = element.alt || '';
      
      if (type === 'horizontal' && 
          (currentSrc.includes('Logo horizontal') || 
           currentSrc.includes('Logo%20horizontal') ||
           element.className.includes('hidden sm:block') ||
           altText.includes('Meu Delivery') ||
           altText.includes('Logo Horizontal'))) {
        element.src = logoUrl;
        alternativeUpdates++;
      }
      
      if (type === 'icon' && 
          (currentSrc.includes('icone-selobrunocakes') || 
           currentSrc.includes('.ico') ||
           element.className.includes('block sm:hidden') ||
           altText.includes('Logo Ícone'))) {
        element.src = logoUrl;
        alternativeUpdates++;
      }
    });
    
    // NOVO: Força atualização das imagens específicas na página de configurações
    if (window.location.pathname.includes('/admin') || window.location.pathname.includes('/settings')) {
      setTimeout(() => {
        const allImgs = document.querySelectorAll('img');
        let adminUpdates = 0;
        
        allImgs.forEach((img) => {
          const element = img as HTMLImageElement;
          const alt = element.alt || '';
          
          if (type === 'horizontal' && alt.toLowerCase().includes('logo horizontal')) {
            element.src = logoUrl;
            adminUpdates++;
          }
          
          if (type === 'icon' && alt.toLowerCase().includes('logo ícone')) {
            element.src = logoUrl;
            adminUpdates++;
          }
        });
        
        if (adminUpdates > 0) {
          console.log(`✅ ${adminUpdates} previews atualizados na página admin`);
        }
      }, 500);
    }
    
  } catch (error) {
    console.error(`❌ Erro ao atualizar logo ${type}:`, error);
  }
};

// Timestamp da última requisição bem-sucedida
let lastFetchTime = 0;
const CACHE_DURATION = 30 * 60 * 1000; // 30 minutos (otimizado)
let ongoingFetch: Promise<any> | null = null; // Promise compartilhada para evitar requisições duplicadas

// Hook personalizado para gerenciar configurações da loja
export const useStoreConfig = () => {
  const [storeSettings, setStoreSettings] = useState<any>(null);

  const loadStoreConfig = async (forceReload = false) => {
    try {
      // Tenta buscar o cache primeiro
      const cachedSettings = localStorage.getItem('store_settings_cache');
      let cached = null;
      if (cachedSettings) {
        try { cached = JSON.parse(cachedSettings); } catch {}
      }

      // Se tem cache válido e não é reload forçado, usa o cache
      const now = Date.now();
      if (!forceReload && cached && (now - lastFetchTime) < CACHE_DURATION) {
        console.log('✅ Usando configurações em cache (válido por', Math.round((CACHE_DURATION - (now - lastFetchTime)) / 1000), 'segundos)');
        setStoreSettings(cached);
        updateStoreConfig(cached);
        
        // Aplica cor do cache se necessário
        if (cached.primary_color && lastAppliedColor !== cached.primary_color) {
          applyPrimaryColor(cached.primary_color);
          lastAppliedColor = cached.primary_color;
        }
        return;
      }

      // Se já tem uma requisição em andamento, espera ela
      if (ongoingFetch) {
        const settings = await ongoingFetch;
        if (settings) {
          setStoreSettings(settings);
          updateStoreConfig(settings);
        }
        return;
      }

      // Faz requisição apenas se necessário
      ongoingFetch = fetchStoreSettings(apiRequest);
      const settings = await ongoingFetch;
      ongoingFetch = null; // Limpa a promise após conclusão

      // Se não veio nada da API, mantém o cache
      if (!settings && cached) {
        setStoreSettings(cached);
        updateStoreConfig(cached);
        return;
      }

      // Se veio settings e tem updated_at
      if (settings && settings.updated_at) {
        // Se for igual ao cache, não atualiza nada
        if (cached && cached.updated_at === settings.updated_at) {
          console.log('✅ Configurações já estão atualizadas');
          setStoreSettings(cached);
          updateStoreConfig(cached);
          lastFetchTime = now;
          return;
        }
        // Se mudou, salva novo cache
        console.log('🆕 Novas configurações recebidas');
        localStorage.setItem('store_settings_cache', JSON.stringify(settings));
        lastFetchTime = now;
      }

      if (settings) {
        setStoreSettings(settings);
        updateStoreConfig(settings);

        // Só aplica a cor se ela for diferente da última aplicada
        if (settings.primary_color) {
          if (lastAppliedColor !== settings.primary_color) {
            console.log(`🎨 Nova cor aplicada: ${settings.primary_color}`);
            applyPrimaryColor(settings.primary_color);
            lastAppliedColor = settings.primary_color;

            setTimeout(() => {
              applyPrimaryColor(settings.primary_color);
            }, 100);
          }
        }
      }
    } catch (error) {
      console.error('❌ Erro ao carregar configurações da loja:', error);
    }
  };

  useEffect(() => {
    // Carrega as configurações da loja apenas no mount inicial
    let mounted = true;
    
    const initConfig = async () => {
      if (!mounted) return;
      
      // Aguarda o DOM estar pronto
      if (document.readyState === 'loading') {
        await new Promise(resolve => {
          document.addEventListener('DOMContentLoaded', resolve, { once: true });
        });
      }
      
      if (mounted) {
        loadStoreConfig();
      }
    };
    
    initConfig();
    
    // Cleanup
    return () => {
      mounted = false;
    };
  }, []); // Array vazio - executa apenas uma vez no mount

  return {
    storeSettings, // Retorna os dados das configurações
    applyPrimaryColor,
    updateLogoElements,
    loadStoreConfig // Expor função para reload manual quando necessário
  };
};