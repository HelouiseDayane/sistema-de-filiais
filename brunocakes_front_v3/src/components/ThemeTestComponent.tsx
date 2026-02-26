import React from 'react';
import { Button } from './ui/button';
import { useStoreConfig } from '../hooks/useStoreConfig';

// Componente para testar as funcionalidades de tema dinâmico
// Só deve ser usado em desenvolvimento
export const ThemeTestComponent = () => {
  const { applyPrimaryColor, updateLogoElements, loadStoreConfig } = useStoreConfig();

  const testColors = [
    '#8B4513', // Verde padrão Bruno Cake
    '#ff6b6b', // Vermelho
    '#4ecdc4', // Azul turquesa  
    '#45b7d1', // Azul
    '#96ceb4', // Verde claro
    '#ffeaa7', // Amarelo
    '#dda0dd', // Roxo claro
    '#ff9ff3', // Rosa
    '#54a0ff', // Azul royal
    '#5f27cd', // Roxo escuro
  ];

  const testLogos = {
    horizontal: 'https://via.placeholder.com/200x80/8B4513/FFFFFF?text=Logo+Horizontal',
    icon: 'https://via.placeholder.com/64x64/8B4513/FFFFFF?text=Icon'
  };

  return (
    <div className="fixed bottom-4 right-4 bg-white p-4 rounded-lg shadow-lg border max-w-sm z-50">
      <h3 className="font-bold mb-2 text-sm">🎨 Teste de Tema</h3>
      
      <div className="space-y-2">
        <div>
          <p className="text-xs font-medium mb-1">Cores:</p>
          <div className="grid grid-cols-5 gap-1">
            {testColors.map((color) => (
              <button
                key={color}
                className="w-6 h-6 rounded-full border border-gray-300 hover:scale-110 transition-transform"
                style={{ backgroundColor: color }}
                onClick={() => applyPrimaryColor(color)}
                title={`Aplicar cor ${color}`}
              />
            ))}
          </div>
        </div>

        <div className="space-y-1">
          <Button
            size="sm"
            className="w-full text-xs"
            onClick={() => updateLogoElements('horizontal', testLogos.horizontal)}
          >
            🖼️ Testar Logo Horizontal
          </Button>
          
          <Button
            size="sm"
            className="w-full text-xs"
            onClick={() => updateLogoElements('icon', testLogos.icon)}
          >
            🏷️ Testar Logo Ícone
          </Button>
          
          <Button
            size="sm"
            className="w-full text-xs"
            onClick={loadStoreConfig}
          >
            🔄 Recarregar Configurações
          </Button>
        </div>

        <div className="border-t pt-2">
          <div className="flex items-center gap-2 mb-1">
            <div className="w-4 h-4 bg-primary rounded"></div>
            <span className="text-xs">Cor Primária</span>
          </div>
          <div className="flex items-center gap-2">
            <div className="w-4 h-4 bg-secondary rounded"></div>
            <span className="text-xs">Cor Secundária</span>
          </div>
        </div>
      </div>
    </div>
  );
};

// Hook para mostrar/ocultar o componente de teste
export const useThemeTest = () => {
  const [showThemeTest, setShowThemeTest] = React.useState(false);

  React.useEffect(() => {
    const handleKeyPress = (e: KeyboardEvent) => {
      // Ctrl + Shift + T para alternar o teste de tema
      if (e.ctrlKey && e.shiftKey && e.key === 'T') {
        setShowThemeTest(prev => !prev);
      }
    };

    window.addEventListener('keydown', handleKeyPress);
    return () => window.removeEventListener('keydown', handleKeyPress);
  }, []);

  return { showThemeTest, setShowThemeTest };
};