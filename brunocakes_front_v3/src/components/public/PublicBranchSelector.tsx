import { useState, useEffect } from 'react';
import { MapPin, Clock, CheckCircle2, XCircle } from 'lucide-react';
import { Card, CardContent } from '../ui/card';
import { Button } from '../ui/button';
import { Branch } from '../../types/admin';
import { apiRequest } from '../../api/common/request';
import { toast } from 'sonner';

interface PublicBranchSelectorProps {
  selectedBranch: Branch | null;
  onBranchSelect: (branch: Branch) => void;
}

export function PublicBranchSelector({ selectedBranch, onBranchSelect }: PublicBranchSelectorProps) {
  const [branches, setBranches] = useState<Branch[]>([]);
  const [loading, setLoading] = useState(true);


  useEffect(() => {
    fetchBranches();
  }, []);

  const fetchBranches = async () => {
    setLoading(true);
    try {
      const data = await apiRequest('/branches', { method: 'GET', headers: { Accept: 'application/json' } });
      setBranches(Array.isArray(data) ? data : (data?.data || []));
    } catch (error: any) {
      console.log('ℹ️ Problema ao carregar filiais:', error?.message || error);
      // Mostra toast de erro para o usuário
      toast.error('Erro ao carregar filiais. Verifique sua conexão ou tente novamente.');
    } finally {
      setLoading(false);
    }
  };

  if (loading) {
    return <div className="text-center py-8">Carregando filiais...</div>;
  }

  if (!loading && branches.length === 0) {
    return (
      <div className="text-center py-8">
        <p className="text-muted-foreground mb-4">Nenhuma filial disponível no momento.</p>
        <Button onClick={fetchBranches}>Tentar novamente</Button>
      </div>
    );
  }

  return (
    <div className="space-y-4">
      <h2 className="text-2xl font-bold text-center mb-6">Escolha a filial mais próxima</h2>
      <div className="grid gap-4 md:grid-cols-2 lg:grid-cols-3">
        {branches.map((branch) => (
          <Card 
            key={branch.id}
            className={`cursor-pointer transition-all hover:shadow-lg ${
              selectedBranch?.id === branch.id 
                ? 'ring-2 ring-primary shadow-lg' 
                : ''
            }`}
            onClick={() => onBranchSelect(branch)}
          >
            <CardContent className="p-6">
              <div className="flex items-start justify-between mb-4">
                <div>
                  <h3 className="font-bold text-lg">{branch.name}</h3>
                  <span className="text-sm text-muted-foreground">{branch.code}</span>
                </div>
                {branch.is_open ? (
                  <div className="flex items-center gap-1 text-green-600">
                    <CheckCircle2 className="w-5 h-5" />
                    <span className="text-sm font-medium">Aberta</span>
                  </div>
                ) : (
                  <div className="flex items-center gap-1 text-red-600">
                    <XCircle className="w-5 h-5" />
                    <span className="text-sm font-medium">Fechada</span>
                  </div>
                )}
              </div>

              <div className="space-y-2 text-sm">
                <div className="flex items-start gap-2">
                  <MapPin className="w-4 h-4 mt-0.5 text-muted-foreground flex-shrink-0" />
                  <span className="text-muted-foreground">{branch.address}</span>
                </div>

                {branch.opening_hours && (
                  <div className="flex items-start gap-2">
                    <Clock className="w-4 h-4 mt-0.5 text-muted-foreground flex-shrink-0" />
                    <span className="text-muted-foreground">
                      {typeof branch.opening_hours === 'string' 
                        ? branch.opening_hours 
                        : JSON.stringify(branch.opening_hours)}
                    </span>
                  </div>
                )}
              </div>

              {selectedBranch?.id === branch.id && (
                <div className="mt-4 pt-4 border-t">
                  <div className="flex items-center gap-2 text-primary">
                    <CheckCircle2 className="w-5 h-5" />
                    <span className="font-medium">Filial selecionada</span>
                  </div>
                </div>
              )}
            </CardContent>
          </Card>
        ))}
      </div>

      {selectedBranch && !selectedBranch.is_open && (
        <div className="bg-amber-50 border border-amber-200 rounded-lg p-4 text-center">
          <p className="text-amber-800">
            ⚠️ A filial selecionada está fechada no momento. Você pode fazer seu pedido, mas ele só será processado quando a filial reabrir.
          </p>
        </div>
      )}
    </div>
  );
}
