import { useState, useEffect } from 'react';
import { Dialog, DialogContent, DialogHeader, DialogTitle } from '../ui/dialog';
import { Button } from '../ui/button';
import { Input } from '../ui/input';
import { Label } from '../ui/label';
import adminApi from '../../api/admin';
import { toast } from 'sonner';
import { Package, Save } from 'lucide-react';

interface Branch {
  id: number;
  name: string;
  code: string;
}

interface ProductStock {
  id?: number;
  product_id: number;
  branch_id: number;
  quantity: number;
  branch?: Branch;
}

interface ProductStockModalProps {
  open: boolean;
  onClose: () => void;
  productId: string;
  productName: string;
  userRole: string;
  userBranchId?: number;
}

export function ProductStockModal({ open, onClose, productId, productName, userRole, userBranchId }: ProductStockModalProps) {
  const [stocks, setStocks] = useState<ProductStock[]>([]);
  const [loading, setLoading] = useState(false);
  const isMaster = userRole === 'master';

  useEffect(() => {
    if (open && productId) {
      fetchStocks();
    }
  }, [open, productId]);

  const fetchStocks = async () => {
    try {
      setLoading(true);
      const response = await adminApi.get(`/admin/products/${productId}/stocks`);
      setStocks(response.stocks || []);
    } catch (error) {
      console.error('Erro ao carregar estoques:', error);
      toast.error('Erro ao carregar estoques');
    } finally {
      setLoading(false);
    }
  };

  const handleQuantityChange = (branchId: number, value: string) => {
    const quantity = parseInt(value) || 0;
    setStocks(prev =>
      prev.map(stock =>
        stock.branch_id === branchId ? { ...stock, quantity } : stock
      )
    );
  };

  const handleSave = async () => {
    try {
      setLoading(true);
      
      // Se for master, atualizar todos de uma vez
      if (isMaster) {
        await adminApi.post(`/admin/products/${productId}/stocks/bulk`, {
          stocks: stocks.map(s => ({ branch_id: s.branch_id, quantity: s.quantity }))
        });
      } else {
        // Se for admin, atualizar apenas sua filial
        const myStock = stocks.find(s => s.branch_id === userBranchId);
        if (myStock) {
          await adminApi.put(`/admin/products/${productId}/stocks/${userBranchId}`, {
            quantity: myStock.quantity
          });
        }
      }
      
      toast.success('Estoques atualizados com sucesso');
      onClose();
    } catch (error: any) {
      console.error('Erro ao atualizar estoques:', error);
      toast.error(error.response?.data?.message || 'Erro ao atualizar estoques');
    } finally {
      setLoading(false);
    }
  };

  // Filtrar apenas a filial do admin se não for master
  const displayStocks = isMaster ? stocks : stocks.filter(s => s.branch_id === userBranchId);

  return (
    <Dialog open={open} onOpenChange={onClose}>
      <DialogContent className="max-w-2xl">
        <DialogHeader>
          <DialogTitle className="flex items-center gap-2">
            <Package className="w-5 h-5" />
            Gerenciar Estoque - {productName}
          </DialogTitle>
        </DialogHeader>

        <div className="space-y-4">
          {loading ? (
            <div className="text-center py-8 text-muted-foreground">Carregando...</div>
          ) : displayStocks.length === 0 ? (
            <div className="text-center py-8 text-muted-foreground">
              Nenhum estoque encontrado
            </div>
          ) : (
            <>
              <div className="bg-blue-50 border border-blue-200 rounded-lg p-3 text-sm text-blue-800">
                <p className="font-medium">
                  {isMaster 
                    ? '💡 Você pode gerenciar o estoque em todas as filiais' 
                    : '💡 Você pode gerenciar apenas o estoque da sua filial'
                  }
                </p>
              </div>

              <div className="space-y-3">
                {displayStocks.map((stock) => (
                  <div key={stock.branch_id} className="flex items-center gap-4 p-3 border rounded-lg">
                    <div className="flex-1">
                      <Label className="font-medium">
                        {stock.branch?.name || `Filial ${stock.branch_id}`}
                      </Label>
                      <p className="text-sm text-muted-foreground">
                        Código: {stock.branch?.code || '-'}
                      </p>
                    </div>
                    <div className="w-32">
                      <Input
                        type="number"
                        min="0"
                        value={stock.quantity}
                        onChange={(e) => handleQuantityChange(stock.branch_id, e.target.value)}
                        className="text-center"
                        disabled={!isMaster && stock.branch_id !== userBranchId}
                      />
                    </div>
                  </div>
                ))}
              </div>

              <div className="flex justify-end gap-2 pt-4 border-t">
                <Button variant="outline" onClick={onClose} disabled={loading}>
                  Cancelar
                </Button>
                <Button onClick={handleSave} disabled={loading}>
                  <Save className="w-4 h-4 mr-2" />
                  {loading ? 'Salvando...' : 'Salvar Estoques'}
                </Button>
              </div>
            </>
          )}
        </div>
      </DialogContent>
    </Dialog>
  );
}
