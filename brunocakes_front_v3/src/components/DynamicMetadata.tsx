import { useEffect } from 'react';
import { useStoreConfigState } from '../hooks/useStoreConfigState';

// Componente que atualiza metadados dinamicamente
export const DynamicMetadata = () => {
  const storeConfig = useStoreConfigState();

  useEffect(() => {
    // Atualiza o título da página
    document.title = `${storeConfig.storeName} - ${storeConfig.slogan}`;
    
    // Atualiza a meta description
    const metaDescription = document.querySelector('meta[name="description"]');
    if (metaDescription) {
      metaDescription.setAttribute('content', `${storeConfig.storeName} - ${storeConfig.slogan}`);
    }
    
    // Atualiza o favicon dinamicamente se disponível
    const favicon = document.querySelector('link[rel="icon"]') as HTMLLinkElement;
    if (favicon && storeConfig.logoIcon && storeConfig.logoIcon.startsWith('http')) {
      favicon.href = storeConfig.logoIcon;
    }
    
    // Atualiza a theme-color dinamicamente
    const themeColorMeta = document.querySelector('meta[name="theme-color"]');
    if (themeColorMeta && storeConfig.primaryColor) {
      themeColorMeta.setAttribute('content', storeConfig.primaryColor);
    }
    
    // Cria um manifest dinâmico
    const manifestData = {
      name: `${storeConfig.storeName} - ${storeConfig.slogan}`,
      short_name: storeConfig.storeName,
      description: `${storeConfig.storeName} - ${storeConfig.slogan}`,
      start_url: "/",
      display: "standalone",
      background_color: "#ffffff",
      theme_color: storeConfig.primaryColor || "#005ef5",
      orientation: "portrait-primary",
      icons: [
        {
          src: storeConfig.logoIcon.startsWith('http') ? storeConfig.logoIcon : "/icone-selobrunocakes.ico",
          sizes: "192x192",
          type: storeConfig.logoIcon.endsWith('.png') ? "image/png" : "image/x-icon",
          purpose: "any"
        },
        {
          src: storeConfig.logoIcon.startsWith('http') ? storeConfig.logoIcon : "/icone-selobrunocakes.ico",
          sizes: "512x512",
          type: storeConfig.logoIcon.endsWith('.png') ? "image/png" : "image/x-icon",
          purpose: "any"
        }
      ],
      categories: ["food", "shopping"],
      lang: "pt-BR",
      scope: "/",
      prefer_related_applications: false
    };

    // Remove o manifest existente
    const existingManifest = document.querySelector('link[rel="manifest"]');
    if (existingManifest) {
      existingManifest.remove();
    }

    // Cria blob com o novo manifest
    const manifestBlob = new Blob([JSON.stringify(manifestData, null, 2)], {
      type: 'application/json'
    });
    const manifestURL = URL.createObjectURL(manifestBlob);

    // Adiciona o novo manifest
    const newManifest = document.createElement('link');
    newManifest.rel = 'manifest';
    newManifest.href = manifestURL;
    document.head.appendChild(newManifest);

    // Limpa URL anterior quando componente desmonta
    return () => {
      URL.revokeObjectURL(manifestURL);
    };
  }, [storeConfig.storeName, storeConfig.slogan, storeConfig.logoIcon, storeConfig.primaryColor]);

  return null; // Componente não renderiza nada visualmente
};