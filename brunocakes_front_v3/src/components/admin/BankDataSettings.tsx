import { useState, useEffect } from 'react';
import { Card, CardContent, CardHeader, CardTitle } from '../ui/card';
import { Input } from '../ui/input';
import { Label } from '../ui/label';
import { Button } from '../ui/button';
import { Select, SelectContent, SelectItem, SelectTrigger, SelectValue } from '../ui/select';
import { toast } from 'sonner';
import adminApi from '../../api/admin';
import { CreditCard, Save } from 'lucide-react';

interface BranchBankData {
  id: number;
  name: string;
  code: string;
  pix_key: string | null;
  payment_frequency: 'quinzenal' | 'mensal' | 'trimestral';
  profit_percentage: number;
}

export function BankDataSettings() {
  const [branches, setBranches] = useState<BranchBankData[]>([]);
  const [loading, setLoading] = useState(false);
  const [editingBranch, setEditingBranch] = useState<number | null>(null);
  const [formData, setFormData] = useState({
    pix_key: '',
    payment_frequency: 'mensal' as 'quinzenal' | 'mensal' | 'trimestral',
    profit_percentage: 100
  });

  const currentAdmin = JSON.parse(localStorage.getItem('bruno_admin') || '{}');
  const isMaster = currentAdmin?.role === 'master';

  useEffect(() => {
    fetchBranches();
  }, []);

  const fetchBranches = async () => {
    try {
      const data = await adminApi.get('/admin/branches');
      const allBranches = Array.isArray(data) ? data : [];
      
      // Admin de filial vê apenas sua própria filial
      if (!isMaster && currentAdmin?.branch_id) {
        setBranches(allBranches.filter(b => b.id === currentAdmin.branch_id));
      } else {
        setBranches(allBranches);
      }
    } catch (error) {
      console.error('Erro ao carregar filiais:', error);
      toast.error('Erro ao carregar filiais');
    }
  };

  const handleEdit = (branch: BranchBankData) => {
    setEditingBranch(branch.id);
    setFormData({
      pix_key: branch.pix_key || '',
      payment_frequency: branch.payment_frequency || 'mensal',
      profit_percentage: branch.profit_percentage || 100
    });
  };

  const handleSave = async (branchId: number) => {
    setLoading(true);
    try {
      await adminApi.put(`/admin/branches/${branchId}`, formData);
      toast.success('Dados bancários atualizados com sucesso!');
      setEditingBranch(null);
      fetchBranches();
    } catch (error: any) {
      console.error('Erro ao salvar:', error);
      toast.error(error?.message || 'Erro ao salvar dados bancários');
    } finally {
      setLoading(false);
    }
  };

  return (
    <div className="space-y-4">
      <div className="flex items-center gap-2 mb-4">
        <CreditCard className="h-6 w-6 text-orange-600" />
        <h2 className="text-2xl font-bold">
          {isMaster ? 'Dados Bancários das Filiais' : 'Meus Dados Bancários'}
        </h2>
      </div>
      <p className="text-muted-foreground mb-6">
        {isMaster 
          ? 'Configure a chave PIX, periodicidade de recebimento e percentual de lucro para cada filial.'
          : 'Configure sua chave PIX e periodicidade de recebimento para os pagamentos.'
        }
      </p>

      <div className="grid gap-4">
        {branches.map((branch) => (
          <Card key={branch.id} className="border-l-4 border-l-orange-500">
            <CardHeader>
              <CardTitle className="flex items-center justify-between">
                <span>{branch.name} ({branch.code})</span>
                {editingBranch !== branch.id && (
                  <Button
                    variant="outline"
                    size="sm"
                    onClick={() => handleEdit(branch)}
                  >
                    Editar
                  </Button>
                )}
              </CardTitle>
            </CardHeader>
            <CardContent>
              {editingBranch === branch.id ? (
                <div className="space-y-4">
                  <div>
                    <Label htmlFor={`pix-${branch.id}`}>Chave PIX *</Label>
                    <Input
                      id={`pix-${branch.id}`}
                      placeholder="CPF, CNPJ, Email, Telefone ou Chave Aleatória"
                      value={formData.pix_key}
                      onChange={(e) => setFormData({ ...formData, pix_key: e.target.value })}
                    />
                    <p className="text-xs text-muted-foreground mt-1">
                      Esta chave será usada para receber os pagamentos
                    </p>
                  </div>

                  <div>
                    <Label htmlFor={`freq-${branch.id}`}>Periodicidade de Recebimento</Label>
                    <Select
                      value={formData.payment_frequency}
                      onValueChange={(value: 'quinzenal' | 'mensal' | 'trimestral') =>
                        setFormData({ ...formData, payment_frequency: value })
                      }
                    >
                      <SelectTrigger id={`freq-${branch.id}`}>
                        <SelectValue />
                      </SelectTrigger>
                      <SelectContent>
                        <SelectItem value="quinzenal">Quinzenal (a cada 15 dias)</SelectItem>
                        <SelectItem value="mensal">Mensal</SelectItem>
                        <SelectItem value="trimestral">Trimestral (a cada 3 meses)</SelectItem>
                      </SelectContent>
                    </Select>
                  </div>

                  {isMaster && (
                    <div>
                      <Label htmlFor={`profit-${branch.id}`}>Percentual de Lucro (%)</Label>
                      <Input
                        id={`profit-${branch.id}`}
                        type="number"
                        min="0"
                        max="100"
                        step="0.01"
                        value={formData.profit_percentage}
                        onChange={(e) => setFormData({ ...formData, profit_percentage: parseFloat(e.target.value) })}
                      />
                      <p className="text-xs text-muted-foreground mt-1">
                        100% = Recebe todo o valor | 80% = Recebe 80% do valor vendido
                      </p>
                    </div>
                  )}

                  <div className="flex gap-2">
                    <Button
                      onClick={() => handleSave(branch.id)}
                      disabled={loading || !formData.pix_key}
                      className="flex-1"
                    >
                      <Save className="h-4 w-4 mr-2" />
                      Salvar
                    </Button>
                    <Button
                      variant="outline"
                      onClick={() => setEditingBranch(null)}
                      disabled={loading}
                    >
                      Cancelar
                    </Button>
                  </div>
                </div>
              ) : (
                <div className="space-y-2">
                  <div className="flex justify-between">
                    <span className="text-sm font-medium">Chave PIX:</span>
                    <span className="text-sm text-muted-foreground">
                      {branch.pix_key || <span className="text-red-500">Não configurado</span>}
                    </span>
                  </div>
                  <div className="flex justify-between">
                    <span className="text-sm font-medium">Periodicidade:</span>
                    <span className="text-sm text-muted-foreground capitalize">
                      {branch.payment_frequency || 'Mensal'}
                    </span>
                  </div>
                  <div className="flex justify-between">
                    <span className="text-sm font-medium">Percentual de Lucro:</span>
                    <span className="text-sm text-muted-foreground">
                      {branch.profit_percentage || 100}%
                    </span>
                  </div>
                </div>
              )}
            </CardContent>
          </Card>
        ))}
      </div>
    </div>
  );
}
