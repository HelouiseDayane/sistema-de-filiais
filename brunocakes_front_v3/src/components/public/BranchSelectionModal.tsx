import { useState, useEffect } from 'react';
import { MapPin, Clock, CheckCircle2, XCircle, AlertCircle } from 'lucide-react';
import { Dialog, DialogContent, DialogHeader, DialogTitle, DialogDescription } from '../ui/dialog';
import { Card, CardContent } from '../ui/card';
import { Button } from '../ui/button';
import { Branch } from '../../types/admin';
import { apiRequest } from '../../api/common/request';
import { toast } from 'sonner';

interface BranchWithAddress extends Branch {
  address_info?: {
    id: number;
    rua: string;
    numero: string;
    bairro: string;
    cidade: string;
    estado: string;
    ponto_referencia?: string;
    horarios?: string;
    checkout_active: boolean;
    store_status?: {
      is_open: boolean;
      message: string;
      next_opening?: string;
    };
  };
}

interface BranchSelectionModalProps {
  open: boolean;
  onBranchSelect: (branch: Branch) => void;
  allowClose?: boolean;
}

export function BranchSelectionModal({
  open,
  onBranchSelect,
  allowClose = false
}: BranchSelectionModalProps) {
  const [branches, setBranches] = useState<BranchWithAddress[]>([]);
  const [loading, setLoading] = useState(true);
  const [selectedBranch, setSelectedBranch] = useState<BranchWithAddress | null>(null);

  // Log para debug
  console.log('🎭 BranchSelectionModal renderizado:', { open, allowClose, branches: branches.length });

  useEffect(() => {
    if (open) {
      console.log('🎭 Modal aberto, buscando filiais...');
      setSelectedBranch(null);
      fetchBranches();
    }
  }, [open]);

  const fetchBranches = async () => {
    setLoading(true);
    try {
      console.log('🔍 Buscando filiais e endereços...');
      // Buscar filiais
      const branchesResponse = await apiRequest('/branches');
      const branchList = Array.isArray(branchesResponse)
        ? branchesResponse
        : (branchesResponse?.data ?? []);

      // Buscar endereços ativos com status
      const addressesResponse = await apiRequest('/addresses/active');
      const addressList = Array.isArray(addressesResponse) 
        ? addressesResponse 
        : (addressesResponse?.data ?? []);

      // Se não houver branches, não mostrar erro - pode estar carregando
      if (!branchList || branchList.length === 0) {
        console.log('⚠️ Nenhuma filial encontrada');
        setBranches([]);
        setLoading(false);
        return;
      }

      // Combinar filiais com endereços
      const merged: BranchWithAddress[] = branchList.map((branch: Branch) => {
        const address = addressList.find((a: any) => a.branch_id === branch.id);
        return {
          ...branch,
          address_info: address
            ? {
                id: address.id,
                rua: address.rua,
                numero: address.numero,
                bairro: address.bairro,
                cidade: address.cidade,
                estado: address.estado,
                ponto_referencia: address.ponto_referencia,
                horarios: address.horarios,
                checkout_active: address.checkout_active ?? true,
                store_status: address.store_status
              }
            : undefined
        };
      });

      // Debug: log das listas e do merge para inspecionar no console do navegador
      try {
        console.log('🔎 branchList (fetched):', branchList);
        console.log('🔎 addressList (fetched):', addressList);
        console.log('🔎 merged branches with addresses:', merged);
      } catch (e) {
        // ignore
      }

      setBranches(merged);
    } catch (error: any) {
      // Log silencioso - não mostrar toast de erro para não assustar o usuário
      console.log('ℹ️ Problema ao carregar filiais (pode ser OPTIONS ou rede):', error?.message || error);
      setBranches([]);
    } finally {
      setLoading(false);
    }
  };

  const handleSelectBranch = (branch: BranchWithAddress) => {
    // Verificar se o checkout está ativo
    if (branch.address_info && !branch.address_info.checkout_active) {
      toast.error('Esta filial está com fechada no momento');
      return;
    }
    setSelectedBranch(branch);
  };

  const handleConfirm = () => {
    if (!selectedBranch) return;
    // Remover address_info antes de passar para callback
    const { address_info, ...branchData } = selectedBranch;
    console.log('✅ Confirmando filial:', branchData);
    onBranchSelect(branchData as Branch);
  };

  return (
    <Dialog
      open={open}
      onOpenChange={(isOpen) => {
        // Só permite fechar se allowClose for true OU selectedBranch for válido
        if (!isOpen && !(allowClose || selectedBranch)) {
          return;
        }
      }}
    >
      <DialogContent
        className="max-w-4xl max-h-[90vh] overflow-y-auto"
        onInteractOutside={(e) => {
          if (!(allowClose || selectedBranch)) e.preventDefault();
        }}
        onEscapeKeyDown={(e) => {
          if (!(allowClose || selectedBranch)) e.preventDefault();
        }}
      >
        <DialogHeader>
          <DialogTitle className="text-2xl text-center">
            🏪 Escolha sua filial preferida
          </DialogTitle>
          <DialogDescription>
            Selecione a filial mais próxima para realizar seu pedido
          </DialogDescription>
        </DialogHeader>

        <div className="py-4">
          {loading ? (
            <div className="text-center py-12">
              <div className="animate-spin rounded-full h-12 w-12 border-b-2 border-primary mx-auto mb-4"></div>
              <p className="text-muted-foreground">Carregando filiais...</p>
            </div>
          ) : branches.length === 0 ? (
            <div className="text-center py-12">
              <p className="text-muted-foreground mb-4">Nenhuma filial disponível no momento.</p>
              <Button onClick={fetchBranches}>Tentar novamente</Button>
            </div>
          ) : (
            <>
              <div className="grid gap-4 md:grid-cols-2 lg:grid-cols-3">
                {branches.map((branch) => {
                  const isCheckoutActive = branch.address_info?.checkout_active ?? false;
                  const storeStatus = branch.address_info?.store_status;
                  const isStoreOpen = storeStatus?.is_open ?? false;
                  const canSelect = isCheckoutActive && isStoreOpen;

                  const addressText = branch.address_info
                    ? `${branch.address_info.rua}, ${branch.address_info.numero} - ${branch.address_info.bairro}, ${branch.address_info.cidade}/${branch.address_info.estado}`
                    : branch.address || 'Endereço não disponível';

                  return (
                    <Card
                      key={branch.id}
                      className={`cursor-pointer transition-all ${
                        canSelect ? 'hover:shadow-lg' : 'opacity-60 cursor-not-allowed'
                      } ${
                        selectedBranch?.id === branch.id
                          ? 'ring-2 ring-primary shadow-lg bg-primary/5'
                          : ''
                      }`}
                      onClick={() => canSelect && handleSelectBranch(branch)}
                    >
                      <CardContent className="p-4">
                        <div className="flex items-start justify-between mb-3">
                          <div>
                            <h3 className="font-bold text-base">{branch.name}</h3>
                            <span className="text-xs text-muted-foreground">{branch.code}</span>
                          </div>
                          <div className="flex flex-col gap-1 items-end">
                            {canSelect ? (
                              <div className="flex items-center gap-1 text-green-600">
                                <CheckCircle2 className="w-4 h-4" />
                                <span className="text-xs font-medium">Aberta</span>
                              </div>
                            ) : (
                              <div className="flex items-center gap-1 text-red-600">
                                <XCircle className="w-4 h-4" />
                                <span className="text-xs font-medium">Fechada</span>
                              </div>
                            )}
                          
                          </div>
                        </div>

                        <div className="space-y-2 text-xs">
                          <div className="flex items-start gap-2">
                            <MapPin className="w-3 h-3 mt-0.5 text-muted-foreground flex-shrink-0" />
                            <span className="text-muted-foreground line-clamp-2">{addressText}</span>
                          </div>

                          {branch.phone && (
                            <div className="flex items-center gap-2">
                              <span className="text-muted-foreground">📞 {branch.phone}</span>
                            </div>
                          )}

                          {(branch.opening_hours || branch.address_info?.horarios) && (
                            <div className="flex items-start gap-2">
                              <Clock className="w-3 h-3 mt-0.5 text-muted-foreground flex-shrink-0" />
                              <div className="flex flex-col">
                                <span className="text-muted-foreground text-xs line-clamp-2">
                                  {typeof branch.opening_hours === 'string'
                                    ? branch.opening_hours
                                    : branch.address_info?.horarios || 'Horário não informado'}
                                </span>
                                {storeStatus && (
                                  <span
                                    className={`text-xs font-medium mt-1 ${
                                      isStoreOpen ? 'text-green-600' : 'text-red-600'
                                    }`}
                                  >
                                    {storeStatus.message}
                                  </span>
                                )}
                              </div>
                            </div>
                          )}
                        </div>

                        {!canSelect && (
                          <div className="mt-3 pt-3 border-t">
                            <div className="flex items-center gap-2 text-orange-600">
                              <AlertCircle className="w-4 h-4" />
                              <span className="font-medium text-sm">Indisponível para pedidos</span>
                            </div>
                          </div>
                        )}

                        {selectedBranch?.id === branch.id && canSelect && (
                          <div className="mt-3 pt-3 border-t">
                            <div className="flex items-center gap-2 text-primary">
                              <CheckCircle2 className="w-4 h-4" />
                              <span className="font-medium text-sm">Selecionada</span>
                            </div>
                          </div>
                        )}
                      </CardContent>
                    </Card>
                  );
                })}
              </div>

              <div className="flex justify-center pt-4 border-t mt-4">
                <Button
                  onClick={handleConfirm}
                  disabled={!selectedBranch}
                  size="lg"
                  className="w-full md:w-auto min-w-[200px]"
                >
                  {selectedBranch
                    ? `Continuar com ${selectedBranch.name}`
                    : 'Selecione uma filial'}
                </Button>
              </div>
            </>
          )}
        </div>
      </DialogContent>
    </Dialog>
  );
}
