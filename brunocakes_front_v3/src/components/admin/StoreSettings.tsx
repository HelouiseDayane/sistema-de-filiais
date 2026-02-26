import React, { useState, useEffect } from 'react';
import { Card, CardContent, CardHeader, CardTitle } from '../ui/card';
import { Button } from '../ui/button';
import { Input } from '../ui/input';
import { Label } from '../ui/label';
import { Textarea } from '../ui/textarea';
import { AlertCircle, Save, Upload, RotateCcw, ArrowLeft } from 'lucide-react';
import { adminApiRequest, ADMIN_API_ENDPOINTS } from '../../api';
import adminApi from '../../api/admin';
import { toast } from 'sonner';
import { WhatsAppConnection } from './WhatsAppConnection';

interface StoreSettingsProps {
  onBack?: () => void;
}

interface StoreSettingsData {
  store_name: string;
  store_slogan: string; // Corrigido de 'slogan' para 'store_slogan'
  instagram: string;
  phone: string;
  whatsapp: string;
  primary_color: string;
  mercado_pago_key: string;
  logo_horizontal: string;
  logo_icon: string;
  logo_horizontal_url?: string;
  logo_icon_url?: string;
}

export const StoreSettings: React.FC<StoreSettingsProps> = ({ onBack }) => {
  const [settings, setSettings] = useState<StoreSettingsData>({
    store_name: '',
    store_slogan: '',
    instagram: '',
    phone: '',
    whatsapp: '',
    primary_color: '#FFFF',
    mercado_pago_key: '',
    logo_horizontal: '',
    logo_icon: '',
  });
  const [loading, setLoading] = useState(true);
  const [saving, setSaving] = useState(false);
  const [resetting, setResetting] = useState(false);
  const [message, setMessage] = useState<{ type: 'success' | 'error'; text: string } | null>(null);
  const [logoHorizontalFile, setLogoHorizontalFile] = useState<File | null>(null);
  const [logoIconFile, setLogoIconFile] = useState<File | null>(null);
  const [isExistingSettings, setIsExistingSettings] = useState(false);
  const [masterContact, setMasterContact] = useState<{ phone?: string; email?: string } | null>(null);
  const [branchContact, setBranchContact] = useState<string>('');
  const [branchesList, setBranchesList] = useState<any[]>([]);
  const [selectedBranchId, setSelectedBranchId] = useState<number | null>(null);

  const currentAdmin = JSON.parse(localStorage.getItem('bruno_admin') || '{}');
  const isMaster = currentAdmin?.role === 'master';

  // Carregar configurações
  useEffect(() => {
    loadSettings();
  }, []);

  const loadSettings = async () => {
    try {
      setLoading(true);
      
      const data = await adminApiRequest(ADMIN_API_ENDPOINTS.store.settings, {
        method: 'GET',
      });

      setSettings({
        ...data,
        store_slogan: data.store_slogan || '',
        instagram: data.instagram || '',
        phone: data.phone || '',
        whatsapp: data.whatsapp || '',
        mercado_pago_key: data.mercado_pago_key || '',
        logo_horizontal: data.logo_horizontal || '',
        logo_icon: data.logo_icon || '',
        logo_horizontal_url: data.logo_horizontal_url || '', // URL completa vinda do backend
        logo_icon_url: data.logo_icon_url || '', // URL completa vinda do backend
      });
      
      // Verificar se já existe configurações salvas (tem ID)
      setIsExistingSettings(!!data.id);

      // Determina contato da filial/master e, se for master, busca lista de filiais
      try {
        if (!isMaster) {
          const branchId = currentAdmin?.branch_id;
          let contactPhone: string | undefined = undefined;

          if (branchId) {
            try {
              const branchesResp = await adminApi.get('/admin/branches');
              const branchesListResp = Array.isArray(branchesResp) ? branchesResp : (branchesResp.data || []);
              const myBranch = branchesListResp.find((b: any) => b.id === branchId);
              if (myBranch) {
                contactPhone = myBranch.phone || myBranch.whatsapp || undefined;
              }
            } catch (e) {
              console.warn('Não foi possível buscar filial do usuário:', e);
            }
          }

          // Se não encontrou telefone na filial, usa whatsapp/phone das configurações da loja
          if (!contactPhone) {
            contactPhone = data.whatsapp || data.phone || undefined;
          }

          setMasterContact({ phone: contactPhone || '', email: data.email || '' });
          setBranchContact(contactPhone || '');
        } else {
          // Se for master, buscar lista de filiais para permitir selecionar qual filial conectar
          try {
            const branchesResp = await adminApi.get('/admin/branches');
            const list = Array.isArray(branchesResp) ? branchesResp : (branchesResp.data || []);
            setBranchesList(list);
            if (list.length > 0) {
              setSelectedBranchId(list[0].id);
              const firstPhone = list[0].phone || list[0].whatsapp || data.whatsapp || data.phone || '';
              setBranchContact(firstPhone);
            }
          } catch (e) {
            console.warn('Não foi possível buscar lista de filiais para master:', e);
          }
        }
      } catch (e) {
        console.warn('Não foi possível determinar o contato da filial/master:', e);
      }
    } catch (error) {
      console.error('Erro ao carregar configurações:', error);
      setMessage({ type: 'error', text: 'Erro ao carregar configurações' });
    } finally {
      setLoading(false);
    }
  };

  const handleSave = async () => {
    try {
      setSaving(true);
      setMessage(null);

      // Verificar se há arquivos para upload
      const hasFiles = logoHorizontalFile || logoIconFile;

      if (hasFiles) {
        // TEMPORÁRIO: Impedir upload de arquivos até corrigir
        setMessage({ 
          type: 'error', 
          text: 'Upload de imagens temporariamente desabilitado. Salvando apenas texto...' 
        });
        // Continue sem os arquivos por enquanto
      }

      // Usar adminApiRequest que já funciona
      const jsonData = {
        store_name: settings.store_name,
        store_slogan: settings.store_slogan,
        instagram: settings.instagram,
        primary_color: settings.primary_color || '#8B4513',
        mercado_pago_key: settings.mercado_pago_key,
      };

      console.log('=== STORE SETTINGS DEBUG ===');
      console.log('Sending data:', jsonData);
      console.log('============================');

      const result = await adminApiRequest(ADMIN_API_ENDPOINTS.store.settings, {
        method: 'POST',
        body: JSON.stringify(jsonData),
      });

      setMessage({ type: 'success', text: 'Configurações salvas com sucesso!' });
      setLogoHorizontalFile(null);
      setLogoIconFile(null);
      loadSettings(); // Recarregar para pegar URLs das imagens
      
      // Força a aplicação das configurações na página
      setTimeout(() => {
        if ((window as any).reloadStoreConfig) {
          (window as any).reloadStoreConfig();
        }
        
        // Força atualização das imagens de preview nesta própria página
        const previewImages = document.querySelectorAll('img[alt*="Logo"]');
        
        previewImages.forEach((img) => {
          const element = img as HTMLImageElement;
          const currentSrc = element.src;
          // Força reload adicionando timestamp para quebrar cache
          element.src = currentSrc + '?t=' + Date.now();
        });
      }, 1000);
    } catch (error) {
      console.error('Erro completo ao salvar:', error);
      setMessage({ 
        type: 'error', 
        text: `Erro ao salvar configurações: ${error instanceof Error ? error.message : 'Erro desconhecido'}` 
      });
    } finally {
      setSaving(false);
    }
  };

  const handleInputChange = (field: keyof StoreSettingsData, value: string) => {
    setSettings(prev => ({ ...prev, [field]: value }));
  };

  const handleReset = async () => {
    if (!confirm('Tem certeza que deseja resetar todas as configurações para os valores padrão? Esta ação não pode ser desfeita.')) {
      return;
    }

    try {
      setResetting(true);
      setMessage(null);

      const token = localStorage.getItem('admin_token');
      if (!token) {
        setMessage({ type: 'error', text: 'Token de autenticação não encontrado. Faça login novamente.' });
        return;
      }

      const apiBase = (import.meta as any).env?.VITE_API_BASE_URL || '/api';
      const response = await fetch(`${apiBase}${ADMIN_API_ENDPOINTS.store.settings}`, {
        method: 'DELETE',
        headers: {
          'Authorization': `Bearer ${token}`,
          'Accept': 'application/json',
        },
      });

      if (!response.ok) {
        const errorText = await response.text();
        throw new Error(`Erro ${response.status}: ${errorText || response.statusText}`);
      }

      const result = await response.json();
      setMessage({ type: 'success', text: 'Configurações resetadas com sucesso!' });
      
      // Limpar arquivos selecionados
      setLogoHorizontalFile(null);
      setLogoIconFile(null);
      
      // Recarregar configurações
      loadSettings();
    } catch (error) {
      console.error('Erro ao resetar:', error);
      setMessage({ 
        type: 'error', 
        text: `Erro ao resetar configurações: ${error instanceof Error ? error.message : 'Erro desconhecido'}` 
      });
    } finally {
      setResetting(false);
    }
  };

  if (loading) {
    return (
      <div className="flex items-center justify-center h-64">
        <div className="animate-spin rounded-full h-8 w-8 border-b-2 border-primary"></div>
      </div>
    );
  }

  return (
    <div className="max-w-4xl mx-auto p-6 space-y-6">
      <div className="flex items-center justify-between">
        <div className="flex items-center gap-3">
          {onBack && (
            <Button variant="outline" size="sm" onClick={onBack}>
              <ArrowLeft className="w-4 h-4 mr-2" />
              Voltar
            </Button>
          )}
          <div>
            <h1 className="text-3xl font-bold">Configurações da Loja</h1>
            <p className="text-sm text-gray-600 mt-1">
              {isExistingSettings ? 'Editando configurações existentes' : 'Criando novas configurações'}
            </p>
          </div>
        </div>
        <div className="flex items-center gap-2">
          {/* Apenas master pode resetar/atualizar configurações globais */}
          {isMaster ? (
            <>
              {isExistingSettings && (
                <Button 
                  onClick={handleReset} 
                  disabled={resetting || saving} 
                  variant="outline"
                  className="flex items-center gap-2 text-red-600 border-red-200 hover:bg-red-50"
                >
                  <RotateCcw className="w-4 h-4" />
                  {resetting ? 'Resetando...' : 'Resetar'}
                </Button>
              )}
              <Button onClick={handleSave} disabled={saving || resetting} className="flex items-center gap-2">
                <Save className="w-4 h-4" />
                {saving ? 'Salvando...' : (isExistingSettings ? 'Atualizar' : 'Criar')}
              </Button>
            </>
          ) : (
            <div className="text-sm text-muted-foreground">Dados do administrador de filial </div>
          )}
        </div>
      </div>

      {message && (
        <div className={`p-4 rounded-md flex items-center gap-2 ${
          message.type === 'success' ? 'bg-green-50 text-green-700 border border-green-200' : 'bg-red-50 text-red-700 border border-red-200'
        }`}>
          <AlertCircle className="w-4 h-4" />
          {message.text}
        </div>
      )}

      <div className="grid grid-cols-1 md:grid-cols-2 gap-6">
        {isMaster ? (
          <>
            {/* Informações Básicas */}
            <Card>
              <CardHeader>
                <CardTitle>Informações Básicas</CardTitle>
              </CardHeader>
              <CardContent className="space-y-4">
                <div>
                  <Label htmlFor="store_name">Nome da Loja</Label>
                  <Input
                    id="store_name"
                    value={settings.store_name}
                    onChange={(e) => handleInputChange('store_name', e.target.value)}
                    placeholder={settings.store_name || 'Nome da loja'}
                  />
                </div>

                <div>
                  <Label htmlFor="store_slogan">Slogan</Label>
                  <Textarea
                    id="store_slogan"
                    value={settings.store_slogan}
                    onChange={(e) => handleInputChange('store_slogan', e.target.value)}
                    placeholder={settings.store_slogan || 'Slogan da loja'}
                    rows={3}
                  />
                </div>

                <div>
                  <Label htmlFor="instagram">Instagram (sem @)</Label>
                  <Input
                    id="instagram"
                    value={settings.instagram}
                    onChange={(e) => handleInputChange('instagram', e.target.value)}
                    placeholder="Ex: brunocakee"
                  />
                </div>

                <div>
                  <Label htmlFor="primary_color">Cor Primária</Label>
                  <div className="flex items-center gap-2">
                    <Input
                      id="primary_color"
                      type="color"
                      value={settings.primary_color}
                      onChange={(e) => handleInputChange('primary_color', e.target.value)}
                      className="w-20 h-10"
                    />
                    <Input
                      value={settings.primary_color}
                      onChange={(e) => handleInputChange('primary_color', e.target.value)}
                      placeholder="#8B4513"
                    />
                  </div>
                </div>
              </CardContent>
            </Card>

            {/* Logos */}
            <Card className="md:col-span-2">
              <CardHeader>
                <CardTitle> Telefones Logos e Imagens</CardTitle>
              </CardHeader>
              <CardContent className="space-y-4">
                <div>
                  <Label htmlFor="phone">Telefone</Label>
                  <Input
                    id="phone"
                    value={settings.phone}
                    onChange={(e) => handleInputChange('phone', e.target.value)}
                    placeholder="Ex: (84) 99999-9999"
                  />
                </div>

                <div>
                  <Label htmlFor="whatsapp">WhatsApp</Label>
                  <Input
                    id="whatsapp"
                    value={settings.whatsapp}
                    onChange={(e) => handleInputChange('whatsapp', e.target.value)}
                    placeholder="Ex: (84) 99999-9999"
                  />
                </div>
                <div className="grid grid-cols-1 md:grid-cols-2 gap-4">
                  <div>
                    <Label htmlFor="logo_horizontal">Logo Horizontal</Label>
                    {settings.logo_horizontal_url && (
                      <div className="mt-2 mb-2">
                        <img 
                          src={settings.logo_horizontal_url} 
                          alt="Logo Horizontal Atual" 
                          className="h-16 w-auto border rounded"
                        />
                      </div>
                    )}
                    <Input
                      id="logo_horizontal"
                      type="file"
                      accept="image/*"
                      onChange={(e) => setLogoHorizontalFile(e.target.files?.[0] || null)}
                    />
                  </div>

                  <div>
                    <Label htmlFor="logo_icon">Logo Ícone</Label>
                    {settings.logo_icon_url && (
                      <div className="mt-2 mb-2">
                        <img 
                          src={settings.logo_icon_url} 
                          alt="Logo Ícone Atual" 
                          className="h-16 w-16 border rounded"
                        />
                      </div>
                    )}
                    <Input
                      id="logo_icon"
                      type="file"
                      accept="image/*"
                      onChange={(e) => setLogoIconFile(e.target.files?.[0] || null)}
                    />
                  </div>
                </div>
              </CardContent>
            </Card>

            {/* Conectar WhatsApp (visível também para master) */}
            <Card className="md:col-span-2">
              <CardHeader>
                <CardTitle>Conectar WhatsApp (Pedidos e Impressão)</CardTitle>
              </CardHeader>
              <CardContent className="space-y-4">
                <p className="text-sm text-muted-foreground">Conecte o WhatsApp da filial para receber pedidos e habilitar impressão de pedidos diretamente pelo WhatsApp.</p>
                <div>
                  <Label htmlFor="branch_whatsapp">WhatsApp da Filial</Label>
                  <div className="flex items-center gap-2">
                    {isMaster ? (
                      <Input
                        id="branch_whatsapp"
                        value={branchContact}
                        onChange={(e) => setBranchContact(e.target.value)}
                        placeholder="Ex: +5584999953363"
                      />
                    ) : (
                      <>
                        <select
                          value={selectedBranchId ?? ''}
                          onChange={(e) => {
                            const id = Number(e.target.value) || null;
                            setSelectedBranchId(id);
                            const branch = branchesList.find(b => b.id === id);
                            const phone = branch ? (branch.phone || branch.whatsapp) : (settings.whatsapp || settings.phone || '');
                            setBranchContact(phone || '');
                          }}
                          className="border rounded p-2"
                        >
                          {branchesList.map(b => (
                            <option key={b.id} value={b.id}>{b.name} ({b.code})</option>
                          ))}
                        </select>
                        <Input
                          id="branch_whatsapp"
                          value={branchContact}
                          onChange={(e) => setBranchContact(e.target.value)}
                          placeholder="Ex: +5584999953363"
                        />
                      </>
                    )}
                  </div>
                </div>
                <div className="flex items-center gap-3">
                  <Button onClick={async () => {
                    try {
                      if (isMaster) {
                        // Atualiza o whatsapp nas configurações da loja (master)
                        const payload = { whatsapp: branchContact };
                        await adminApiRequest(ADMIN_API_ENDPOINTS.store.settings, {
                          method: 'POST',
                          body: JSON.stringify(payload),
                        });
                        toast.success('WhatsApp das informações da loja atualizado com sucesso');
                        loadSettings();
                        return;
                      }

                      // Para admins de filial: atualiza a filial específica
                      const branchId = currentAdmin?.branch_id;
                      if (!branchId) {
                        toast.error('Filial não encontrada para seu usuário.');
                        return;
                      }
                      const payload = { phone: branchContact };
                      await adminApi.put(`/admin/branches/${branchId}`, payload);
                      toast.success('WhatsApp da filial atualizado com sucesso');
                      loadSettings();
                    } catch (err: any) {
                      console.error('Erro ao conectar WhatsApp da filial:', err);
                      toast.error(err.response?.data?.message || 'Erro ao conectar WhatsApp');
                    }
                  }}>
                    Conectar
                  </Button>

                  {branchContact ? (
                    <>
                      <a
                        className="inline-flex items-center gap-2 btn btn-outline"
                        href={`https://wa.me/${branchContact.replace(/\D/g, '')}`}
                        target="_blank"
                        rel="noreferrer"
                      >
                        Testar WhatsApp
                      </a>
                      <img
                        src={`https://chart.googleapis.com/chart?cht=qr&chs=150x150&chl=${encodeURIComponent(`https://wa.me/${branchContact.replace(/\D/g, '')}`)}`}
                        alt="QR WhatsApp Filial"
                        className="h-28 w-28 border"
                      />
                    </>
                  ) : (
                    <p className="text-sm text-muted-foreground">Nenhum número configurado.</p>
                  )}
                </div>
                <p className="text-xs text-muted-foreground">Se não tiver número local, o sistema usará o WhatsApp de configuração da loja como fallback.</p>
              </CardContent>
            </Card>
          </>
        ) : (
          // Visão reduzida para admins de filial: apenas WhatsApp Business
          <>
            {/* WhatsApp Business Integration com Evolution API */}
            <WhatsAppConnection
              branchId={currentAdmin?.branch_id}
              branchName={currentAdmin?.branch?.name || 'Filial'}
              userRole={currentAdmin?.role}
            />
          </>
        )}
      </div>
    </div>
  );
};

export default StoreSettings;