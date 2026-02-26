import { useState } from 'react';
import { Button } from './ui/button';
import { Card, CardContent } from './ui/card';
import { Download, Smartphone, X, Star, Zap, Wifi, Share } from 'lucide-react';
import { usePWA } from '../hooks/usePWA';
import { useStoreConfigState } from '../hooks/useStoreConfigState';
import { toast } from 'sonner';

// Detecta iOS via userAgent
function isIOSDevice() {
  if (typeof navigator === "undefined") return false;
  return /iphone|ipad|ipod/i.test(navigator.userAgent);
}

// Componente que mostra o botão ou banner para instalar o PWA
export const PWAInstallButton = () => {
  const { isInstallable, installApp, isMobile } = usePWA();
  const storeConfig = useStoreConfigState();
  const [showBanner, setShowBanner] = useState(true);
  const [isInstalling, setIsInstalling] = useState(false);

  const isIOS = isMobile && isIOSDevice();

  // Só renderiza se pode instalar ou for iOS e o banner não foi fechado
  if ((!isInstallable && !isIOS) || !showBanner) return null;

  const handleInstall = async () => {
    setIsInstalling(true);
    try {
      const success = await installApp();
      if (success) {
        toast.success(`🎉 ${storeConfig.storeName} instalado com sucesso!`);
        setShowBanner(false);
      } else {
        toast.error('Instalação cancelada');
      }
    } catch (error) {
      toast.error('Erro ao instalar o app');
    } finally {
      setIsInstalling(false);
    }
  };

  // Banner instrução para iOS (Safari)
  if (isIOS) {
    return (
      <Card className="sticky top-0 z-50 border-l-4 border-l-primary bg-gradient-to-r from-primary/10 to-orange-50 shadow-lg">
        <CardContent className="p-4">
          <div className="flex items-center justify-between">
            <div className="flex items-center gap-3 flex-1">
              <div className="p-2 bg-primary rounded-full">
                <Smartphone className="w-5 h-5 text-white" />
              </div>
              <div className="flex-1">
                <p className="font-semibold text-sm text-primary">
                  🍰 Instale o {storeConfig.storeName}
                </p>
                <p className="text-xs text-muted-foreground">
                  No iPhone/iPad, toque em <b>Compartilhar</b> <Share className="inline w-4 h-4" /> e depois <b>Adicionar à Tela de Início</b>.
                </p>
              </div>
            </div>
            <Button
              onClick={() => setShowBanner(false)}
              variant="ghost"
              size="sm"
              className="p-1 h-auto text-muted-foreground hover:text-primary"
              aria-label="Fechar banner de instalação"
            >
              <X className="w-4 h-4" />
            </Button>
          </div>
          <div className="flex items-center gap-4 mt-3 text-xs text-muted-foreground">
            <div className="flex items-center gap-1">
              <Zap className="w-3 h-3" />
              <span>Rápido</span>
            </div>
            <div className="flex items-center gap-1">
              <Wifi className="w-3 h-3" />
              <span>Offline</span>
            </div>
            <div className="flex items-center gap-1">
              <Star className="w-3 h-3" />
              <span>Notificações</span>
            </div>
          </div>
        </CardContent>
      </Card>
    );
  }

  // Mobile Android: mostra o banner de instalação real
  if (isMobile) {
    return (
      <Card className="sticky top-0 z-50 border-l-4 border-l-primary bg-gradient-to-r from-primary/10 to-orange-50 shadow-lg">
        <CardContent className="p-4">
          <div className="flex items-center justify-between">
            <div className="flex items-center gap-3 flex-1">
              <div className="p-2 bg-primary rounded-full">
                <Smartphone className="w-5 h-5 text-white" />
              </div>
              <div className="flex-1">
                <p className="font-semibold text-sm text-primary">
                  🍰 Instale o {storeConfig.storeName}
                </p>
                <p className="text-xs text-muted-foreground">
                  Acesso rápido, sem ocupar espaço!
                </p>
              </div>
            </div>
            <div className="flex items-center gap-2">
              <Button
                onClick={handleInstall}
                disabled={isInstalling}
                size="sm"
                className="bruno-gradient text-white hover:opacity-90 text-xs px-3 py-1.5"
              >
                <Download className="w-3 h-3 mr-1" />
                {isInstalling ? 'Instalando...' : 'Instalar'}
              </Button>
              <Button
                onClick={() => setShowBanner(false)}
                variant="ghost"
                size="sm"
                className="p-1 h-auto text-muted-foreground hover:text-primary"
                aria-label="Fechar banner de instalação"
              >
                <X className="w-4 h-4" />
              </Button>
            </div>
          </div>
          <div className="flex items-center gap-4 mt-3 text-xs text-muted-foreground">
            <div className="flex items-center gap-1">
              <Zap className="w-3 h-3" />
              <span>Rápido</span>
            </div>
            <div className="flex items-center gap-1">
              <Wifi className="w-3 h-3" />
              <span>Offline</span>
            </div>
            <div className="flex items-center gap-1">
              <Star className="w-3 h-3" />
              <span>Notificações</span>
            </div>
          </div>
        </CardContent>
      </Card>
    );
  }

  // Desktop: mostra só um botão discreto
  return (
    <Button
      onClick={handleInstall}
      disabled={isInstalling}
      size="sm"
      variant="outline"
      className="hidden md:flex items-center gap-2 text-primary border-primary hover:bg-primary hover:text-white transition-colors"
    >
      <Download className="w-4 h-4" />
      {isInstalling ? 'Instalando...' : 'Baixar App'}
    </Button>
  );
};