import { useState, useEffect } from 'react';
import { Card, CardContent } from '../ui/card';
import { Store, Users, Building2, ChevronRight, Wallet } from 'lucide-react';
import { StoreSettings } from './StoreSettings';
import { UsersManagement } from './UsersManagement';
import { BranchesManagement } from './BranchesManagement';
import { BankDataSettings } from './BankDataSettings';
import { useApp } from '../../App';

type SettingsSection = 'menu' | 'store' | 'users' | 'branches' | 'bank';

export function Settings() {
  const { admin } = useApp();
  const [activeSection, setActiveSection] = useState<SettingsSection>('menu');
  const [mounted, setMounted] = useState(false);
  const [sectionMounted, setSectionMounted] = useState(false);

  useEffect(() => {
    setMounted(true);
    return () => {
      setMounted(false);
      setSectionMounted(false);
    };
  }, []);

  useEffect(() => {
    // Reset section mount state when changing sections
    setSectionMounted(false);
    const timer = setTimeout(() => {
      setSectionMounted(true);
    }, 10);
    return () => clearTimeout(timer);
  }, [activeSection]);

  if (!mounted) {
    return <div className="p-6">Carregando...</div>;
  }

  const allSections = [
    {
      id: 'store' as const,
      title: 'Configurações da Loja',
      description: 'Nome, logo, cores, redes sociais e informações gerais',
      icon: Store,
      color: 'bg-blue-500',
      roles: ['master', 'admin'] as const,
    },
    {
      id: 'branches' as const,
      title: 'Filiais',
      description: 'Cadastre e gerencie as filiais da sua loja',
      icon: Building2,
      color: 'bg-green-500',
      roles: ['master'] as const,
    },
    {
      id: 'bank' as const,
      title: 'Dados Bancários',
      description: 'Configure chaves PIX e periodicidade de pagamento por filial',
      icon: Wallet,
      color: 'bg-orange-500',
      roles: ['master', 'admin'] as const,
    },

    {
      id: 'users' as const,
      title: 'Usuários',
      description: 'Gerencie usuários do sistema (master, admin, funcionários)',
      icon: Users,
      color: 'bg-purple-500',
      roles: ['master'] as const,
    },
  ];

  // Filtrar sections baseado no role do admin
  const sections = allSections.filter(section => 
    section.roles.includes(admin?.role as any)
  );

  // Menu principal
  if (activeSection === 'menu') {
    return (
      <div className="space-y-6">
        <div>
          <h1 className="text-3xl font-bold">Configurações</h1>
          <p className="text-muted-foreground mt-1">Gerencie as configurações do sistema</p>
        </div>

        <div className="grid gap-4 md:grid-cols-2 lg:grid-cols-3">
          {sections.map((section) => {
            const IconComponent = section.icon;
            return (
              <Card
                key={section.id}
                className="cursor-pointer hover:shadow-lg transition-all hover:scale-[1.02] border-2 hover:border-primary"
                onClick={() => setActiveSection(section.id)}
              >
                <CardContent className="p-6">
                  <div className="flex items-start justify-between mb-4">
                    <div 
                      className={`w-12 h-12 rounded-lg ${section.color} flex items-center justify-center shadow-md`} 
                      style={{ backgroundColor: section.id === 'users' ? '#a855f7' : section.id === 'branches' ? '#22c55e' : '#3b82f6' }}
                      title={`Ícone: ${section.id}`}
                    >
                      {IconComponent ? (
                        <IconComponent className="w-6 h-6 text-white" strokeWidth={2.5} />
                      ) : (
                        <span className="text-white text-xl font-bold">
                          {section.id === 'store' ? '🏪' : section.id === 'users' ? '👥' : '🏢'}
                        </span>
                      )}
                    </div>
                    <ChevronRight className="w-5 h-5 text-muted-foreground" />
                  </div>
                  <h3 className="font-semibold text-lg mb-2">{section.title}</h3>
                  <p className="text-sm text-muted-foreground">{section.description}</p>
                </CardContent>
              </Card>
            );
          })}
        </div>
      </div>
    );
  }

  // Seções internas
  const currentSection = sections.find(s => s.id === activeSection);
  
  if (!currentSection) {
    return <div className="p-6">Erro ao carregar seção</div>;
  }

  const Icon = currentSection.icon;

  return (
    <div className="space-y-6">
      {/* Breadcrumb */}
      <div className="flex items-center gap-2 text-sm">
        <button
          onClick={() => setActiveSection('menu')}
          className="text-muted-foreground hover:text-foreground transition-colors"
        >
          Configurações
        </button>
        <ChevronRight className="w-4 h-4 text-muted-foreground" />
        <span className="font-medium">{currentSection.title}</span>
      </div>

      {/* Header */}
      <div className="flex items-center gap-4">
        <div className={`w-14 h-14 rounded-xl ${currentSection.color} flex items-center justify-center`}>
          <Icon className="w-7 h-7 text-white" />
        </div>
        <div>
          <h1 className="text-3xl font-bold">{currentSection.title}</h1>
          <p className="text-muted-foreground">{currentSection.description}</p>
        </div>
      </div>

      {/* Conteúdo */}
      <div className="mt-6">
        {sectionMounted && activeSection === 'store' && <StoreSettings key="store" onBack={() => setActiveSection('menu')} />}
        {sectionMounted && activeSection === 'users' && <UsersManagement key="users" onBack={() => setActiveSection('menu')} />}
        {sectionMounted && activeSection === 'branches' && <BranchesManagement key="branches" onBack={() => setActiveSection('menu')} />}
        {sectionMounted && activeSection === 'bank' && <BankDataSettings key="bank" onBack={() => setActiveSection('menu')} />}

        {!sectionMounted && <div className="p-6">Carregando...</div>}
      </div>
    </div>
  );
}