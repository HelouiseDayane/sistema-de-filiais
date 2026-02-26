import { useState, useEffect } from 'react';
import { Card, CardContent, CardHeader, CardTitle } from '../ui/card';
import { Button } from '../ui/button';
import { Badge } from '../ui/badge';
import { Input } from '../ui/input';
import { Label } from '../ui/label';
import { Textarea } from '../ui/textarea';
import { Dialog, DialogContent, DialogHeader, DialogTitle } from '../ui/dialog';
import { toast } from 'sonner';
import adminApi from '../../api/admin';
import { DollarSign, TrendingUp, Clock, CheckCircle, Copy } from 'lucide-react';

interface BranchDashboard {
  branch: {
    id: number;
    name: string;
    code: string;
    pix_key: string | null;
    payment_frequency: string;
    profit_percentage: number;
  };
  total_sales: number;
  pending_amount: number;
  paid_amount: number;
}

interface Payment {
  id: number;
  branch: {
    id: number;
    name: string;
    code: string;
    pix_key: string | null;
  };
  period_start: string;
  period_end: string;
  total_sales: number;
  profit_percentage: number;
  commission_amount: number;
  paid_amount: number;
  status: 'pendente' | 'pago' | 'cancelado';
  paid_at: string | null;
  notes: string | null;
}

export function PaymentsManagement() {
  const [dashboard, setDashboard] = useState<BranchDashboard[]>([]);
  const [payments, setPayments] = useState<Payment[]>([]);
  const [selectedPayment, setSelectedPayment] = useState<Payment | null>(null);
  const [loading, setLoading] = useState(false);
  const [paymentDialogOpen, setPaymentDialogOpen] = useState(false);
  const [paymentForm, setPaymentForm] = useState({
    paid_amount: '',
    notes: ''
  });

  useEffect(() => {
    fetchDashboard();
    fetchPayments();
  }, []);

  const fetchDashboard = async () => {
    try {
      const data = await adminApi.get('/admin/payments/dashboard');
      setDashboard(Array.isArray(data) ? data : []);
    } catch (error) {
      console.error('Erro ao carregar dashboard:', error);
      toast.error('Erro ao carregar dados');
    }
  };

  const fetchPayments = async () => {
    try {
      const data = await adminApi.get('/admin/payments');
      setPayments(Array.isArray(data) ? data : []);
    } catch (error) {
      console.error('Erro ao carregar pagamentos:', error);
    }
  };

  const handleCalculatePayments = async () => {
    setLoading(true);
    try {
      await adminApi.post('/admin/payments/calculate');
      toast.success('Pagamentos calculados com sucesso!');
      fetchPayments();
      fetchDashboard();
    } catch (error: any) {
      toast.error(error?.message || 'Erro ao calcular pagamentos');
    } finally {
      setLoading(false);
    }
  };

  const handleOpenPayment = (payment: Payment) => {
    setSelectedPayment(payment);
    setPaymentForm({
      paid_amount: payment.commission_amount.toString(),
      notes: ''
    });
    setPaymentDialogOpen(true);
  };

  const handleConfirmPayment = async () => {
    if (!selectedPayment) return;

    setLoading(true);
    try {
      await adminApi.patch(`/admin/payments/${selectedPayment.id}/pay`, {
        paid_amount: parseFloat(paymentForm.paid_amount),
        notes: paymentForm.notes
      });
      toast.success('Pagamento confirmado com sucesso!');
      setPaymentDialogOpen(false);
      fetchPayments();
      fetchDashboard();
    } catch (error: any) {
      toast.error(error?.message || 'Erro ao confirmar pagamento');
    } finally {
      setLoading(false);
    }
  };

  const copyPixKey = (pixKey: string) => {
    navigator.clipboard.writeText(pixKey);
    toast.success('Chave PIX copiada!');
  };

  const formatCurrency = (value: number) => {
    return new Intl.NumberFormat('pt-BR', {
      style: 'currency',
      currency: 'BRL'
    }).format(value);
  };

  const formatDate = (date: string) => {
    return new Date(date).toLocaleDateString('pt-BR');
  };

  const getStatusBadge = (status: string) => {
    const variants: Record<string, 'default' | 'secondary' | 'destructive'> = {
      pendente: 'secondary',
      pago: 'default',
      cancelado: 'destructive'
    };
    return <Badge variant={variants[status] || 'default'}>{status.toUpperCase()}</Badge>;
  };

  return (
    <div className="space-y-6">
      <div className="flex items-center justify-between">
        <div>
          <h1 className="text-3xl font-bold">Gestão de Pagamentos</h1>
          <p className="text-muted-foreground">Dashboard de vendas e pagamentos por filial</p>
        </div>
        <Button onClick={handleCalculatePayments} disabled={loading}>
          <TrendingUp className="h-4 w-4 mr-2" />
          Calcular Pagamentos do Período
        </Button>
      </div>

      {/* Dashboard de Vendas por Filial */}
      <div className="grid gap-4 md:grid-cols-2 lg:grid-cols-3">
        {dashboard.map((item) => (
          <Card key={item.branch.id} className="border-l-4 border-l-orange-500">
            <CardHeader>
              <CardTitle className="text-lg">{item.branch.name}</CardTitle>
              <p className="text-sm text-muted-foreground">
                Código: {item.branch.code} | Recebimento: {item.branch.payment_frequency}
              </p>
            </CardHeader>
            <CardContent className="space-y-3">
              <div className="flex justify-between items-center">
                <span className="text-sm font-medium flex items-center gap-1">
                  <DollarSign className="h-4 w-4" />
                  Total Vendido:
                </span>
                <span className="text-lg font-bold text-green-600">
                  {formatCurrency(item.total_sales)}
                </span>
              </div>
              
              <div className="flex justify-between items-center">
                <span className="text-sm font-medium">Percentual:</span>
                <span className="font-semibold">{item.branch.profit_percentage}%</span>
              </div>

              <div className="flex justify-between items-center">
                <span className="text-sm font-medium flex items-center gap-1">
                  <Clock className="h-4 w-4 text-yellow-500" />
                  Pendente:
                </span>
                <span className="text-lg font-bold text-yellow-600">
                  {formatCurrency(item.pending_amount)}
                </span>
              </div>

              <div className="flex justify-between items-center">
                <span className="text-sm font-medium flex items-center gap-1">
                  <CheckCircle className="h-4 w-4 text-green-500" />
                  Pago:
                </span>
                <span className="text-lg font-bold text-green-600">
                  {formatCurrency(item.paid_amount)}
                </span>
              </div>

              {item.branch.pix_key && (
                <div className="pt-2 border-t">
                  <div className="flex items-center justify-between">
                    <span className="text-xs text-muted-foreground">Chave PIX:</span>
                    <Button
                      variant="ghost"
                      size="sm"
                      onClick={() => copyPixKey(item.branch.pix_key!)}
                      className="h-6 text-xs"
                    >
                      <Copy className="h-3 w-3 mr-1" />
                      Copiar
                    </Button>
                  </div>
                  <p className="text-xs font-mono mt-1 truncate">{item.branch.pix_key}</p>
                </div>
              )}
            </CardContent>
          </Card>
        ))}
      </div>

      {/* Lista de Pagamentos */}
      <Card>
        <CardHeader>
          <CardTitle>Histórico de Pagamentos</CardTitle>
        </CardHeader>
        <CardContent>
          <div className="space-y-3">
            {payments.length === 0 ? (
              <p className="text-center text-muted-foreground py-8">
                Nenhum pagamento registrado. Clique em "Calcular Pagamentos do Período" para gerar.
              </p>
            ) : (
              payments.map((payment) => (
                <div
                  key={payment.id}
                  className="flex items-center justify-between p-4 border rounded-lg hover:bg-muted/50 transition"
                >
                  <div className="flex-1">
                    <div className="flex items-center gap-3 mb-2">
                      <h3 className="font-semibold">{payment.branch.name}</h3>
                      {getStatusBadge(payment.status)}
                    </div>
                    <div className="grid grid-cols-2 md:grid-cols-4 gap-2 text-sm">
                      <div>
                        <span className="text-muted-foreground">Período:</span>
                        <p className="font-medium">
                          {formatDate(payment.period_start)} a {formatDate(payment.period_end)}
                        </p>
                      </div>
                      <div>
                        <span className="text-muted-foreground">Vendas:</span>
                        <p className="font-medium text-green-600">
                          {formatCurrency(payment.total_sales)}
                        </p>
                      </div>
                      <div>
                        <span className="text-muted-foreground">Comissão ({payment.profit_percentage}%):</span>
                        <p className="font-medium text-orange-600">
                          {formatCurrency(payment.commission_amount)}
                        </p>
                      </div>
                      {payment.paid_at && (
                        <div>
                          <span className="text-muted-foreground">Pago em:</span>
                          <p className="font-medium">{formatDate(payment.paid_at)}</p>
                        </div>
                      )}
                    </div>
                  </div>
                  {payment.status === 'pendente' && (
                    <Button
                      onClick={() => handleOpenPayment(payment)}
                      className="ml-4"
                    >
                      Dar Baixa
                    </Button>
                  )}
                </div>
              ))
            )}
          </div>
        </CardContent>
      </Card>

      {/* Dialog de Confirmação de Pagamento */}
      <Dialog open={paymentDialogOpen} onOpenChange={setPaymentDialogOpen}>
        <DialogContent>
          <DialogHeader>
            <DialogTitle>Confirmar Pagamento</DialogTitle>
          </DialogHeader>
          {selectedPayment && (
            <div className="space-y-4">
              <div className="p-4 bg-muted rounded-lg space-y-2">
                <h3 className="font-semibold">{selectedPayment.branch.name}</h3>
                <p className="text-sm text-muted-foreground">
                  Período: {formatDate(selectedPayment.period_start)} a {formatDate(selectedPayment.period_end)}
                </p>
                <p className="text-lg font-bold text-green-600">
                  Valor a Pagar: {formatCurrency(selectedPayment.commission_amount)}
                </p>
              </div>

              {selectedPayment.branch.pix_key && (
                <div className="p-4 border rounded-lg">
                  <Label>Chave PIX do Gestor</Label>
                  <div className="flex items-center gap-2 mt-2">
                    <Input value={selectedPayment.branch.pix_key} readOnly className="font-mono" />
                    <Button
                      variant="outline"
                      size="sm"
                      onClick={() => copyPixKey(selectedPayment.branch.pix_key!)}
                    >
                      <Copy className="h-4 w-4" />
                    </Button>
                  </div>
                </div>
              )}

              <div>
                <Label htmlFor="paid_amount">Valor Pago</Label>
                <Input
                  id="paid_amount"
                  type="number"
                  step="0.01"
                  value={paymentForm.paid_amount}
                  onChange={(e) => setPaymentForm({ ...paymentForm, paid_amount: e.target.value })}
                />
              </div>

              <div>
                <Label htmlFor="notes">Observações (opcional)</Label>
                <Textarea
                  id="notes"
                  placeholder="Comprovante: 12345, Data do PIX: 05/02/2026..."
                  value={paymentForm.notes}
                  onChange={(e) => setPaymentForm({ ...paymentForm, notes: e.target.value })}
                />
              </div>

              <div className="flex gap-2">
                <Button
                  onClick={handleConfirmPayment}
                  disabled={loading || !paymentForm.paid_amount}
                  className="flex-1"
                >
                  <CheckCircle className="h-4 w-4 mr-2" />
                  Confirmar Pagamento
                </Button>
                <Button
                  variant="outline"
                  onClick={() => setPaymentDialogOpen(false)}
                  disabled={loading}
                >
                  Cancelar
                </Button>
              </div>
            </div>
          )}
        </DialogContent>
      </Dialog>
    </div>
  );
}
