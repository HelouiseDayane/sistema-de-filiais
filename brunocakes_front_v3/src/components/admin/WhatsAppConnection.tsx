import { useState, useEffect } from 'react';
import { Card, CardContent, CardDescription, CardHeader, CardTitle } from '../ui/card';
import { Button } from '../ui/button';
import { toast } from 'sonner';
import { MessageSquare, RefreshCw, QrCode, Power, CheckCircle2, XCircle, Loader2 } from 'lucide-react';
import { Dialog, DialogContent, DialogDescription, DialogHeader, DialogTitle } from '../ui/dialog';
import { adminApiRequest } from '../../api/common/request';
import { Branch } from '../../types/admin';
import { useRealTime } from '../../hooks/useRealTime';

interface WhatsAppConnectionProps {
  branchId?: number;
  branchName?: string;
  userRole?: 'master' | 'admin' | 'employee';
}

export function WhatsAppConnection({ branchId: initialBranchId, branchName: initialBranchName, userRole }: WhatsAppConnectionProps) {
  const [status, setStatus] = useState<'disconnected' | 'connecting' | 'connected'>('disconnected');
  const [loading, setLoading] = useState(false);
  const [qrCode, setQrCode] = useState<string | null>(null);
  const [showQrDialog, setShowQrDialog] = useState(false);
  const [whatsappNumber, setWhatsappNumber] = useState<string | null>(null);
  const [connectedAt, setConnectedAt] = useState<string | null>(null);
  const [autoRefresh, setAutoRefresh] = useState<NodeJS.Timeout | null>(null);
  const [branches, setBranches] = useState<Branch[]>([]);
  const [selectedBranchId, setSelectedBranchId] = useState<number | undefined>(initialBranchId);
  const [selectedBranchName, setSelectedBranchName] = useState<string | undefined>(initialBranchName);
  const [qrCodeTimer, setQrCodeTimer] = useState<number>(30);
  const [qrCodeTimerInterval, setQrCodeTimerInterval] = useState<NodeJS.Timeout | null>(null);
  const [checkTimeoutId, setCheckTimeoutId] = useState<NodeJS.Timeout | null>(null);
  const { isConnected: realTimeConnected, lastEvent } = useRealTime();

  // Buscar filiais se for master sem branch_id
  useEffect(() => {
    if (userRole === 'master' && !initialBranchId) {
      fetchBranches();
    }
  }, [userRole, initialBranchId]);

  const fetchBranches = async () => {
    try {
      const response = await adminApiRequest('/admin/branches');
      setBranches(response.data || []);
      if (response.data?.length > 0) {
        setSelectedBranchId(response.data[0].id);
        setSelectedBranchName(response.data[0].name);
      }
    } catch (error: any) {
      console.error('Erro ao buscar filiais:', error);
    }
  };

  useEffect(() => {
    // Só verificar status ao conectar, sem polling
    if (!selectedBranchId || selectedBranchId === null || selectedBranchId === undefined) {
      return;
    }
    // Não faz polling automático
  }, [selectedBranchId]);

  // Timer do QR Code
  useEffect(() => {
    if (showQrDialog && qrCode && status !== 'connected') {
      // Resetar timer
      setQrCodeTimer(30);
      
      // Countdown de 1 em 1 segundo
      const countdownInterval = setInterval(() => {
        setQrCodeTimer((prev) => {
          if (prev <= 1) {
            // Quando chegar a 0, atualizar QR Code automaticamente (só se não conectou ainda)
            if (status !== 'connected') {
              refreshQrCode();
            }
            return 30;
          }
          return prev - 1;
        });
      }, 1000);
      
      setQrCodeTimerInterval(countdownInterval);
      
      return () => {
        if (countdownInterval) clearInterval(countdownInterval);
      };
    } else {
      if (qrCodeTimerInterval) {
        clearInterval(qrCodeTimerInterval);
        setQrCodeTimerInterval(null);
      }
      setQrCodeTimer(30);
    }
  }, [showQrDialog, qrCode]);

  useEffect(() => {
    if (!selectedBranchId) return;
    if (!lastEvent) return;
    // Corrige comparação: branch_id pode ser string ou number
    const eventBranchId = typeof lastEvent.data.branch_id === 'string' ? Number(lastEvent.data.branch_id) : lastEvent.data.branch_id;
    if (lastEvent.type === 'whatsapp_status' && eventBranchId === selectedBranchId) {
      setStatus(lastEvent.data.status as 'disconnected' | 'connecting' | 'connected');
      setWhatsappNumber(lastEvent.data.number || null);
      setConnectedAt(lastEvent.data.connected_at || null);
    }
  }, [lastEvent, selectedBranchId]);

  const checkStatus = async () => {
    if (!selectedBranchId || selectedBranchId === null || selectedBranchId === undefined) {
      return;
    }
    
    try {
      const response = await adminApiRequest(`/admin/whatsapp/status/${selectedBranchId}`);
      
      const previousStatus = status;
      setStatus(response.status);
      setWhatsappNumber(response.number);
      setConnectedAt(response.connected_at);
      
      // Se conectou com sucesso, fechar modal e mostrar mensagem
      if (response.status === 'connected') {
        // Fechar modal se estiver aberto
        if (showQrDialog) {
          setShowQrDialog(false);
          toast.success(`WhatsApp conectado com sucesso! 🎉\nNúmero: ${response.number}`);
        }
        
        // Limpar interval de verificação rápida se estava conectando
        if (checkTimeoutId && previousStatus === 'connecting') {
          clearInterval(checkTimeoutId);
          setCheckTimeoutId(null);
        }
      }
    } catch (error: any) {
      console.error('Erro ao verificar status do WhatsApp:', error);
      // Não mostrar erro se for warning de API indisponível
      if (!error.message?.includes('indisponível')) {
        // Silencioso para não poluir UI
      }
    }
  };

  const handleConnect = async () => {
    if (!selectedBranchId) {
      toast.error('Selecione uma filial primeiro');
      return;
    }
    
    setLoading(true);
    toast.loading('Conectando ao WhatsApp... Aguarde!', { id: 'whatsapp-connect' });
    try {
      const response = await adminApiRequest('/admin/whatsapp/connect', {
        method: 'POST',
        body: JSON.stringify({ branch_id: selectedBranchId }),
      });
      toast.dismiss('whatsapp-connect');
      if (response.status === 'connected') {
        toast.success('WhatsApp já está conectado!');
        setStatus('connected');
        setWhatsappNumber(response.number);
      } else {
        setQrCode(response.qrcode);
        setStatus('connecting');
        setShowQrDialog(true);
        toast.success('QR Code gerado! Escaneie com seu WhatsApp');
        // Iniciar verificação automática sem polling global
        let attempts = 0;
        const maxAttempts = 60; // 2 minutos
        const checkInterval = setInterval(async () => {
          attempts++;
          const statusResponse = await adminApiRequest(`/admin/whatsapp/status/${selectedBranchId}`);
          if (statusResponse.status === 'connected') {
            setStatus('connected');
            setWhatsappNumber(statusResponse.number);
            setConnectedAt(statusResponse.connected_at);
            setShowQrDialog(false);
            toast.success('WhatsApp conectado com sucesso!');
            clearInterval(checkInterval);
            setCheckTimeoutId(null);
          }
          if (attempts >= maxAttempts) {
            clearInterval(checkInterval);
            setCheckTimeoutId(null);
            const finalCheck = await adminApiRequest(`/admin/whatsapp/status/${selectedBranchId}`);
            if (finalCheck.status !== 'connected') {
              setShowQrDialog(false);
              toast.warning('Tempo esgotado. Por favor, tente conectar novamente.');
            }
          }
        }, 2000);
        setCheckTimeoutId(checkInterval as any);
      }
    } catch (error: any) {
      toast.dismiss('whatsapp-connect');
      toast.error(error.message || 'Erro ao conectar WhatsApp');
    } finally {
      setLoading(false);
    }
  };

  const handleDisconnect = async () => {
    if (!selectedBranchId) return;
    
    if (!confirm('Deseja realmente desconectar o WhatsApp desta filial?')) return;
    
    setLoading(true);
    try {
      await adminApiRequest(`/admin/whatsapp/disconnect/${selectedBranchId}`, {
        method: 'POST',
      });
      
      setStatus('disconnected');
      setWhatsappNumber(null);
      setConnectedAt(null);
      setQrCode(null);
      toast.success('WhatsApp desconectado com sucesso');
    } catch (error: any) {
      toast.error(error.message || 'Erro ao desconectar WhatsApp');
    } finally {
      setLoading(false);
    }
  };

  const refreshQrCode = async () => {
    if (!selectedBranchId) return;
    
    // Verificar status primeiro
    try {
      const statusResponse = await adminApiRequest(`/admin/whatsapp/status/${selectedBranchId}`);
      
      // Se já está conectado, não precisa atualizar QR Code
      if (statusResponse.status === 'connected') {
        toast.success('WhatsApp já está conectado!');
        setShowQrDialog(false);
        setStatus('connected');
        setWhatsappNumber(statusResponse.number);
        setConnectedAt(statusResponse.connected_at);
        return;
      }
      
      // Se não conectou ainda, atualizar QR Code
      const response = await adminApiRequest(`/admin/whatsapp/refresh-qr/${selectedBranchId}`);
      setQrCode(response.qrcode);
      toast.success('QR Code atualizado');
    } catch (error: any) {
      console.error('Erro ao atualizar QR Code:', error);
      toast.error('Erro ao atualizar QR Code');
    }
  };

  const getStatusBadge = () => {
    switch (status) {
      case 'connected':
        return (
          <div className="flex items-center gap-2 text-green-600">
            <CheckCircle2 className="w-5 h-5" />
            <span className="font-medium">Conectado</span>
          </div>
        );
      case 'connecting':
        return (
          <div className="flex items-center gap-2 text-yellow-600">
            <Loader2 className="w-5 h-5 animate-spin" />
            <span className="font-medium">Aguardando conexão...</span>
          </div>
        );
      default:
        return (
          <div className="flex items-center gap-2 text-gray-500">
            <XCircle className="w-5 h-5" />
            <span className="font-medium">Desconectado</span>
          </div>
        );
    }
  };

  return (
    <>
      <Card>
        <CardHeader>
          <div className="flex items-center justify-between">
            <div className="flex items-center gap-3">
              <div className="p-2 bg-green-100 rounded-lg">
                <MessageSquare className="w-6 h-6 text-green-600" />
              </div>
              <div>
                <CardTitle>WhatsApp Business</CardTitle>
                <CardDescription>
                  {selectedBranchName || 'Selecione uma filial'}
                </CardDescription>
              </div>
            </div>
            {getStatusBadge()}
          </div>
        </CardHeader>
        
        <CardContent className="space-y-4">
          {/* Seletor de filial para master sem branch_id */}
          {userRole === 'master' && !initialBranchId && branches.length > 0 && (
            <div className="p-4 bg-blue-50 rounded-lg">
              <label className="block text-sm font-medium text-gray-700 mb-2">
                Selecione a filial:
              </label>
              <select
                value={selectedBranchId || ''}
                onChange={(e) => {
                  const branchId = Number(e.target.value);
                  const branch = branches.find(b => b.id === branchId);
                  setSelectedBranchId(branchId);
                  setSelectedBranchName(branch?.name);
                  setStatus('disconnected');
                  setWhatsappNumber(null);
                  setConnectedAt(null);
                }}
                className="w-full p-2 border border-gray-300 rounded-md focus:ring-2 focus:ring-blue-500 focus:border-transparent"
              >
                {branches.map((branch) => (
                  <option key={branch.id} value={branch.id}>
                    {branch.name} ({branch.code})
                  </option>
                ))}
              </select>
            </div>
          )}

          {status === 'connected' && (
            <div className="p-4 bg-green-50 rounded-lg space-y-2">
              <p className="text-sm text-green-800">
                <strong>Número conectado:</strong> {whatsappNumber}
              </p>
              {connectedAt && (
                <p className="text-xs text-green-600">
                  Conectado em: {new Date(connectedAt).toLocaleString('pt-BR')}
                </p>
              )}
            </div>
          )}

          {status === 'disconnected' && (
            <div className="p-4 bg-gray-50 rounded-lg">
              <p className="text-sm text-gray-600 mb-3">
                Conecte o WhatsApp desta filial para habilitar notificações automáticas de pedidos e comunicação com clientes.
              </p>
            </div>
          )}

          <div className="flex gap-2">
            {status === 'disconnected' && (
              <Button
                onClick={handleConnect}
                disabled={loading}
                className="flex-1"
              >
                {loading ? (
                  <>
                    <Loader2 className="w-4 h-4 mr-2 animate-spin" />
                    Aguarde, conectando...
                  </>
                ) : (
                  <>
                    <QrCode className="w-4 h-4 mr-2" />
                    Conectar WhatsApp
                  </>
                )}
              </Button>
            )}

            {status === 'connecting' && (
              <Button
                onClick={() => setShowQrDialog(true)}
                variant="outline"
                className="flex-1"
              >
                <QrCode className="w-4 h-4 mr-2" />
                Ver QR Code
              </Button>
            )}

            {status === 'connected' && (
              <Button
                onClick={handleDisconnect}
                disabled={loading}
                variant="destructive"
                className="flex-1"
              >
                {loading ? (
                  <Loader2 className="w-4 h-4 mr-2 animate-spin" />
                ) : (
                  <Power className="w-4 h-4 mr-2" />
                )}
                Desconectar
              </Button>
            )}

            <Button
              onClick={checkStatus}
              disabled={loading}
              variant="outline"
              size="icon"
            >
              <RefreshCw className="w-4 h-4" />
            </Button>
          </div>
        </CardContent>
      </Card>

      <Dialog open={showQrDialog} onOpenChange={setShowQrDialog}>
        <DialogContent className="max-w-md">
          <DialogHeader>
            <DialogTitle>Conectar WhatsApp</DialogTitle>
            <DialogDescription>
              Escaneie o QR Code com seu WhatsApp para conectar
            </DialogDescription>
          </DialogHeader>

          <div className="space-y-4">
            {qrCode ? (
              <div className="flex flex-col items-center gap-4">
                <div className="p-4 bg-white rounded-lg border-2 border-gray-200">
                  <img
                    src={qrCode}
                    alt="QR Code WhatsApp"
                    className="w-64 h-64"
                  />
                </div>
                
                <div className="text-center space-y-2">
                  <p className="text-sm text-gray-600">
                    1. Abra o WhatsApp no seu celular
                  </p>
                  <p className="text-sm text-gray-600">
                    2. Toque em <strong>Mais opções</strong> ou <strong>Configurações</strong>
                  </p>
                  <p className="text-sm text-gray-600">
                    3. Toque em <strong>Aparelhos conectados</strong>
                  </p>
                  <p className="text-sm text-gray-600">
                    4. Toque em <strong>Conectar um aparelho</strong>
                  </p>
                  <p className="text-sm text-gray-600">
                    5. Aponte seu telefone para esta tela
                  </p>
                  
                  <div className="mt-4 p-3 bg-amber-50 border border-amber-200 rounded-lg">
                    <p className="text-sm text-amber-800 font-medium">
                      ⏱️ QR Code expira em: <span className="text-lg font-bold">{qrCodeTimer}s</span>
                    </p>
                    <p className="text-xs text-amber-600 mt-1">
                      O QR Code será atualizado automaticamente
                    </p>
                  </div>
                </div>

                <Button
                  onClick={refreshQrCode}
                  variant="outline"
                  size="sm"
                  className="mt-2"
                >
                  <RefreshCw className="w-4 h-4 mr-2" />
                  Atualizar QR Code Agora
                </Button>
              </div>
            ) : (
              <div className="flex justify-center py-8">
                <Loader2 className="w-8 h-8 animate-spin text-gray-400" />
              </div>
            )}
          </div>
        </DialogContent>
      </Dialog>
    </>
  );
}
