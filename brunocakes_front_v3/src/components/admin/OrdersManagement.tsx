import { useState } from 'react';
import { Button } from '../ui/button';
import { Input } from '../ui/input';
import { Card, CardContent, CardHeader, CardTitle } from '../ui/card';
import { Badge } from '../ui/badge';
import { Checkbox } from '../ui/checkbox';
import { Select, SelectContent, SelectItem, SelectTrigger, SelectValue } from '../ui/select';
import { Table, TableBody, TableCell, TableHead, TableHeader, TableRow } from '../ui/table';
import { Dialog, DialogContent, DialogHeader, DialogTitle, DialogTrigger } from '../ui/dialog';
import { Separator } from '../ui/separator';
import { Search, Eye, CheckCircle, Clock, Package, XCircle, MessageCircle, DollarSign, Ban, Flag } from 'lucide-react';
import { toast } from 'sonner';
import { useApp } from '../../App';
import adminApi from '../../api/admin';

import { Order, OrderUpdate, OrderStatus } from '../../types/orders';

export const OrdersManagement = () => {
  // Marcar pedidos como entregues em lote (chama API)
  const handleBulkDelivered = async () => {
    setIsBulkLoading(true);
    try {
      const promises = selectedIds.map(id => adminApi.markAsDelivered(id));
      await Promise.all(promises);
      selectedIds.forEach(id => updateOrder(id, { status: 'delivered' }));
      toast.success('Pedidos marcados como entregues com sucesso!');
      setSelectedIds([]);
    } catch (error) {
      toast.error('Erro ao marcar pedidos como entregues em lote');
  console.error(error);
    } finally {
      setIsBulkLoading(false);
    }
  };
  const { orders = [], updateOrder, admin } = useApp();
  const [searchTerm, setSearchTerm] = useState('');
  const [statusFilter, setStatusFilter] = useState<string>('all');
  const [selectedOrder, setSelectedOrder] = useState<Order | null>(null);
  const [selectedIds, setSelectedIds] = useState<string[]>([]);
  const [isBulkLoading, setIsBulkLoading] = useState(false);

  const isAdminAuthenticated = admin && ['master', 'admin', 'employee'].includes(admin.role);

  // Marcar pedidos como concluídos em lote
  const handleBulkComplete = async () => {
    setIsBulkLoading(true);
    try {
      await adminApi.markAsCompleted(selectedIds);
      // Atualiza localmente o status dos pedidos marcados
      selectedIds.forEach(id => updateOrder(id, { status: 'completed' }));
      toast.success('Pedidos marcados como concluídos com sucesso!');
      setSelectedIds([]);
    } catch (error) {
      toast.error('Erro ao concluir pedidos em lote');
      console.error(error);
    } finally {
      setIsBulkLoading(false);
    }
  };

  // Aprovar pagamento individual
  const handleApprovePayment = async (orderId: string) => {
    try {
      await adminApi.approvePayments([orderId]);
      updateOrder(orderId, { status: 'confirmed' } as OrderUpdate);
      toast.success('Pagamento aprovado!');
    } catch (error) {
      toast.error('Erro ao aprovar pagamento');
    }
  };

  // Marcar pedido como completo
  const handleMarkAsCompleted = async (orderId: string) => {
    try {
      await adminApi.markAsCompleted([orderId]);
      updateOrder(orderId, { status: 'completed' } as OrderUpdate);
      toast.success('Pedido marcado como completo!');
    } catch (error) {
      toast.error('Erro ao marcar pedido como completo');
    }
  };

  // Marcar pedido como entregue
  const handleMarkAsDelivered = async (orderId: string) => {
    try {
      await adminApi.markAsDelivered(orderId);
      const updatedOrder = { status: 'delivered' } as Partial<Order>;
      updateOrder(orderId, updatedOrder as OrderUpdate);
      
      // Atualiza localmente se este for o pedido selecionado
      if (selectedOrder?.id === orderId) {
        setSelectedOrder({ ...selectedOrder, ...updatedOrder });
      }
      
      toast.success('Pedido marcado como entregue!');
    } catch (error) {
      toast.error('Erro ao marcar pedido como entregue');
    }
  };

  // Filtrar pedidos
  const filteredOrders = orders
    .filter(order => !!order)
    .filter(order => {
      const matchesSearch = (order.id?.toLowerCase() || '').includes(searchTerm.toLowerCase()) ||
                         (order.clientName?.toLowerCase() || '').includes(searchTerm.toLowerCase()) ||
                         (order.email && order.email.toLowerCase().includes(searchTerm.toLowerCase()));
      const matchesStatus = statusFilter === 'all' || order.status === statusFilter;
      return matchesSearch && matchesStatus;
    });

  // IDs selecionáveis
  // Permite seleção para pedidos aguardando confirmação, confirmados, concluídos e entregues
  const selectableIds = filteredOrders
    .filter(o => o.status === 'awaiting_seller_confirmation' || o.status === 'confirmed' || o.status === 'completed' || o.status === 'delivered')
    .map(o => o.id);

  const isAllSelected = selectableIds.length > 0 && selectableIds.every(id => selectedIds.includes(id));

  const handleSelectAll = () => {
    if (isAllSelected) {
      setSelectedIds(ids => ids.filter(id => !selectableIds.includes(id)));
    } else {
      setSelectedIds(ids => Array.from(new Set([...ids, ...selectableIds])));
    }
  };

  const handleSelectOne = (orderId: string) => {
    setSelectedIds((prev) => {
      if (prev.includes(orderId)) {
        return prev.filter((id) => id !== orderId);
      }
      return [...prev, orderId];
    });
  };

  const handleBulkApprove = async () => {
    if (selectedIds.length === 0) return;
    
    setIsBulkLoading(true);
    try {
      for (const id of selectedIds) {
        await updateOrder(id, { status: 'confirmed' });
      }
      toast.success(`${selectedIds.length} pedidos aprovados com sucesso!`);
      setSelectedIds([]);
    } catch (error) {
      toast.error('Erro ao aprovar pedidos em lote');
      console.error(error);
    } finally {
      setIsBulkLoading(false);
    }
  };



  if (!isAdminAuthenticated) {
    return (
      <div>
        <h1>Acesso Negado</h1>
        <p>Você não tem permissão para acessar esta página.</p>
      </div>
    );
  }

  const getStatusInfo = (status: string) => {
    switch (status) {
      case 'pending':
        return {
          color: 'bg-yellow-100 text-yellow-800',
          label: 'Pendente'
        };
      case 'awaiting_seller_confirmation':
        return {
          color: 'bg-yellow-100 text-yellow-800',
          label: 'Aguardando Confirmação'
        };
      case 'confirmed':
        return {
          color: 'bg-blue-100 text-blue-800',
          label: 'Confirmado'
        };
      case 'preparing':
        return {
          color: 'bg-blue-100 text-blue-800',
          label: 'Em Preparação'
        };
      case 'completed':
        return {
          color: 'bg-green-100 text-green-800',
          label: 'Pronto pra retirada'
        };
      case 'delivered':
        return {
          color: 'bg-purple-100 text-purple-800',
          label: 'Pedido entregue'
        };
      case 'canceled':
        return {
          color: 'bg-red-100 text-red-800',
          label: 'Cancelado'
        };
      default:
        return {
          color: 'bg-gray-100 text-gray-800',
          label: status
        };
    }
  };

  return (
    <div className="space-y-6">
      {/* Log visual para depuração dos IDs selecionados */}
      <div style={{ fontSize: '12px', color: '#666', marginBottom: '8px' }}>
        <strong>Pedidos selecionados:</strong> {JSON.stringify(selectedIds)}
      </div>
      <div>
        <h1 className="bruno-text-gradient mb-2">Gestão de Pedidos</h1>
        <p className="text-muted-foreground">Gerencie todos os pedidos da loja</p>
      </div>

      <div className="flex flex-col gap-4 sm:flex-row sm:justify-between">
        <div className="flex gap-2">
          <div className="relative">
            <Search className="absolute left-2 top-2.5 h-4 w-4 text-muted-foreground" />
            <Input
              placeholder="Buscar pedidos..."
              value={searchTerm}
              onChange={(e) => setSearchTerm(e.target.value)}
              className="pl-8"
            />
          </div>
        </div>
        <div className="flex gap-2 items-end">
          <Select value={statusFilter} onValueChange={setStatusFilter}>
            <SelectTrigger className="w-[180px]">
              <SelectValue placeholder="Status" />
            </SelectTrigger>
            <SelectContent>
              <SelectItem value="all">Todos os Status</SelectItem>
              <SelectItem value="pending">Pendente</SelectItem>
              <SelectItem value="pending_payment">Aguardando Pagamento</SelectItem>
              <SelectItem value="awaiting_seller_confirmation">Aguardando Confirmação</SelectItem>
              <SelectItem value="confirmed">Confirmado</SelectItem>
              <SelectItem value="preparing">Preparando</SelectItem>
              <SelectItem value="ready">Pronto</SelectItem>
              <SelectItem value="completed">Concluído</SelectItem>
              <SelectItem value="canceled">Cancelado</SelectItem>
               <SelectItem value="delivered">Entregue</SelectItem>
            </SelectContent>
          </Select>
          {/* Botões de ação em lote sempre visíveis, desabilitados individualmente */}
          <div className="flex gap-2">
            {/* Botão para marcar como concluído */}
            <Button
              variant="default"
              size="sm"
              disabled={isBulkLoading || selectedIds.length === 0}
              onClick={handleBulkComplete}
              className="gap-1"
            >
              <CheckCircle className="w-4 h-4" />
              Marcar ({selectedIds.length}) como Concluídos
            </Button>
            {/* Botão para marcar como entregue */}
            <Button
              variant="default"
              size="sm"
              disabled={isBulkLoading || selectedIds.length === 0}
              onClick={handleBulkDelivered}
              className="gap-1"
            >
              <Package className="w-4 h-4" />
              Marcar ({selectedIds.length}) como Entregues
            </Button>
          </div>
        </div>
      </div>

      <Card>
        <CardHeader>
          <CardTitle>Pedidos ({filteredOrders.length})</CardTitle>
        </CardHeader>
        <CardContent>

          {filteredOrders.length === 0 ? (
            <div className="text-center py-8">
              <Package className="w-12 h-12 mx-auto text-muted-foreground mb-3" />
              <p className="text-muted-foreground">Nenhum pedido encontrado</p>
            </div>
          ) : (
            <div className="overflow-x-auto">
              <Table>
                <TableHeader>
                  <TableRow>
                    <TableHead>
                      <Checkbox
                        checked={isAllSelected}
                        onCheckedChange={handleSelectAll}
                        aria-label="Selecionar todos"
                        disabled={selectableIds.length === 0}
                      />
                    </TableHead>
                    <TableHead>ID</TableHead>
                    <TableHead>Cliente</TableHead>
                    <TableHead>Total</TableHead>
                    <TableHead>Status</TableHead>
                    <TableHead>Data</TableHead>
                    <TableHead>Ações</TableHead>
                  </TableRow>
                </TableHeader>
                <TableBody>
                  {filteredOrders.map((order) => (
                    <TableRow key={order.id}>
                      <TableCell>
                        {(order.status === 'confirmed' || order.status === 'completed' || order.status === 'delivered') && (
                          <Checkbox
                            checked={selectedIds.includes(order.id)}
                            onCheckedChange={() => handleSelectOne(order.id)}
                            aria-label={`Selecionar pedido ${order.id}`}
                          />
                        )}
                      </TableCell>
                      <TableCell className="font-mono">#{order.id}</TableCell>
                      <TableCell>
                        <div>
                          <p className="font-medium">{order.clientName}</p>
                          <p className="text-sm text-muted-foreground">{order.email || order.whatsapp}</p>
                        </div>
                      </TableCell>
                      <TableCell className="font-medium">R$ {order.total.toFixed(2)}</TableCell>
                      <TableCell>
                        <Badge className={getStatusInfo(order.status).color}>
                          {getStatusInfo(order.status).label}
                        </Badge>
                      </TableCell>

                      <TableCell>
                        {order.createdAt ? new Date(order.createdAt).toLocaleDateString('pt-BR') : '-'}
                      </TableCell>
                      <TableCell>
                        <div className="flex gap-2">
                          {order.status === 'completed' && (
                            <Button
                              size="sm"
                              variant="default"
                              onClick={() => handleMarkAsDelivered(order.id)}
                              className="gap-1 bg-green-600 hover:bg-green-700 text-white"
                            >
                              <Package className="w-4 h-4" />
                              Entregar
                            </Button>
                          )}
                          <Dialog>
                            <DialogTrigger asChild>
                              <Button 
                                variant="outline" 
                                size="sm"
                                onClick={() => setSelectedOrder(order)}
                              >
                                <Eye className="w-4 h-4 mr-1" />
                                Detalhes
                              </Button>
                            </DialogTrigger>
                            <DialogContent>
                              <DialogHeader>
                                <DialogTitle>Pedido #{order.id}</DialogTitle>
                              </DialogHeader>
                              <div className="space-y-4">
                                <div>
                                  <h3 className="font-medium mb-2">Cliente</h3>
                                  <p>{order.clientName}</p>
                                  <p className="text-sm text-muted-foreground">{order.email}</p>
                                  {order.whatsapp && (
                                    <p className="text-sm text-muted-foreground">{order.whatsapp}</p>
                                  )}
                                </div>
                                <Separator />
                                <div>
                                  <h3 className="font-medium mb-2">Endereço</h3>
                                  <p>{order.address}</p>
                                  {order.neighborhood && (
                                    <p className="text-sm text-muted-foreground">
                                      Bairro: {order.neighborhood}
                                    </p>
                                  )}
                                  {order.additionalInfo && (
                                    <p className="text-sm text-muted-foreground">
                                      Complemento: {order.additionalInfo}
                                    </p>
                                  )}
                                </div>
                                <Separator />
                                <div>
                                  <h3 className="font-medium mb-2">Itens do Pedido</h3>
                                  <div className="space-y-2">
                                    {order.items?.map((item) => (
                                      <div key={item.id} className="flex justify-between">
                                        <span>
                                          {item.quantity}x {item.name}
                                        </span>
                                        <span>R$ {item.price.toFixed(2)}</span>
                                      </div>
                                    ))}
                                  </div>
                                </div>
                                <Separator />
                                <div className="flex justify-between font-medium">
                                  <span>Total</span>
                                  <span>R$ {order.total.toFixed(2)}</span>
                                </div>
                              </div>
                            </DialogContent>
                          </Dialog>
                        </div>
                      </TableCell>
                    </TableRow>
                  ))}
                </TableBody>
              </Table>
            </div>
          )}
        </CardContent>
      </Card>
    </div>
  );
};