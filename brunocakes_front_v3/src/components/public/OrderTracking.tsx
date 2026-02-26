import { useState, useEffect } from 'react';
import { fetchAndSetActiveAddress, STORE_CONFIG, API_BASE_URL } from '../../api';
import { useRealTime } from '../../hooks/useRealTime';
import { Order } from '../../types/orders';
import { useNavigate } from 'react-router-dom';
import { Button } from '../ui/button';
import { Input } from '../ui/input';
import { Card, CardContent, CardHeader, CardTitle } from '../ui/card';
import { Badge } from '../ui/badge';
import { Separator } from '../ui/separator';
import { Search, Package, Clock, CheckCircle, XCircle, ArrowLeft, Home } from 'lucide-react';
import { api } from '../../api';
import { toast } from 'sonner';

export const OrderTracking = () => {
  const { lastEvent } = useRealTime();
  const [activeAddress, setActiveAddress] = useState<any>(null);
  const [activeLatLng, setActiveLatLng] = useState<{ latitude: number, longitude: number } | null>(null);
  // Buscar todos os endereços e filtrar pelo ativo
  const fetchActiveAddress = async () => {
    try {
      const res = await fetch(`${API_BASE_URL}/addresses/active`);
      if (res.ok) {
        const active = await res.json();
        if (active) {
          const addressString = `${active.rua}, ${active.numero} - ${active.bairro}, ${active.cidade} - ${active.estado}`;
          setActiveAddress({
            address: addressString,
            workingHours: active.horarios || '',
          });
          if (active.latitude && active.longitude) {
            setActiveLatLng({ latitude: Number(active.latitude), longitude: Number(active.longitude) });
          } else {
            setActiveLatLng(null);
          }
        } else {
          setActiveAddress(null);
          setActiveLatLng(null);
        }
      }
    } catch (err) {
      setActiveAddress(null);
      setActiveLatLng(null);
    }
  };

  useEffect(() => {
    fetchActiveAddress();
  }, []);
  const navigate = useNavigate();
  const [email, setEmail] = useState('');
  const [phone, setPhone] = useState('');
  // Preencher telefone da query string se existir
  useEffect(() => {
    const params = new URLSearchParams(window.location.search);
    const phoneParam = params.get('phone');
    if (phoneParam) {
      setPhone(phoneParam);
    }
  }, []);
  const [searchResults, setSearchResults] = useState<any[]>([]);
  // Atualiza status do pedido em tempo real
  useEffect(() => {
    if (lastEvent && lastEvent.type === 'order_status') {
      setSearchResults((prev) => {
        const exists = prev.some(order => order.id === lastEvent.data.order_id);
        if (exists) {
          return prev.map(order =>
            order.id === lastEvent.data.order_id
              ? { ...order, status: lastEvent.data.status as Order['status'] }
              : order
          );
        } else {
          // Buscar dados completos do pedido na API
          api.getOrder(lastEvent.data.order_id)
            .then(orderData => {
              setSearchResults(current => [
                ...current,
                { ...orderData, status: lastEvent.data.status }
              ]);
            })
            .catch(() => {
              // Se falhar, adiciona só dados mínimos
              setSearchResults(current => [
                ...current,
                {
                  id: lastEvent.data.order_id,
                  status: lastEvent.data.status,
                  items: [],
                  customer_phone: lastEvent.data.customer_phone || '',
                }
              ]);
            });
          return prev;
        }
      });
    }
  }, [lastEvent]);
  const [isSearching, setIsSearching] = useState(false);

  const formatPhoneInput = (value: string) => {
    // Remove all non-digits
    const digits = value.replace(/\D/g, '');
    
    // Apply mask: (11) 99999-9999
    if (digits.length <= 2) {
      return `(${digits}`;
    } else if (digits.length <= 7) {
      return `(${digits.slice(0, 2)}) ${digits.slice(2)}`;
    } else {
      return `(${digits.slice(0, 2)}) ${digits.slice(2, 7)}-${digits.slice(7, 11)}`;
    }
  };

  const handlePhoneChange = (value: string) => {
    const formatted = formatPhoneInput(value);
    setPhone(formatted);
  };

  const searchOrders = async () => {
    if (!email && !phone) {
      toast.error('Preencha pelo menos um campo para buscar');
      return;
    }

    setIsSearching(true);
    
    try {
  // ...
      
      // Tentar múltiplos formatos de telefone
      const phoneFormats = [];
      if (phone) {
        phoneFormats.push(phone); 
        phoneFormats.push(phone.replace(/\D/g, '')); 
        phoneFormats.push('+55' + phone.replace(/\D/g, '')); 
        phoneFormats.push(phone.replace(/\D/g, ''));
        // Adicionar formato com DDD sem máscara
        if (phone.startsWith('(')) {
          const ddd = phone.slice(1, 3);
          const rest = phone.replace(/\D/g, '').slice(2);
          phoneFormats.push(ddd + rest);
        }
      }
      
      //console.log('Formatos de telefone a testar:', phoneFormats);
      
      let results = null;
      let foundWithFormat = null;
      
      // Tentar primeiro com o formato original
      try {
        results = await api.getOrdersByContact(email, phone);
        foundWithFormat = phone;
       //onsole.log('Encontrado com formato original:', phone);
      } catch (error) {

      }
      
      // Se não encontrou e tem telefone, tentar outros formatos
      if ((!results || (Array.isArray(results) && results.length === 0)) && phoneFormats.length > 1) {
        for (const phoneFormat of phoneFormats.slice(1)) {
          try {
          //console.log('Tentando formato:', phoneFormat);
            const testResults = await api.getOrdersByContact(email, phoneFormat);
            if (testResults && ((Array.isArray(testResults) && testResults.length > 0) || 
                              (testResults.data && testResults.data.length > 0))) {
              results = testResults;
              foundWithFormat = phoneFormat;
           // console.log('Encontrado com formato:', phoneFormat);
              break;
            }
          } catch (error) {

          }
        }
      }
      
     // console.log('Resposta final da API:', results);
     // console.log('Formato que funcionou:', foundWithFormat);
      
      // Tratar diferentes formatos de resposta da API
      let orders = [];
      if (Array.isArray(results)) {
        orders = results;
      } else if (results && Array.isArray(results.data)) {
        orders = results.data;
      } else if (results && results.orders && Array.isArray(results.orders)) {
        orders = results.orders;
      } else {
  // ...
        orders = [];
      }
      
      setSearchResults(orders);
      
      if (orders.length === 0) {
        toast.info('Nenhum pedido encontrado com esses dados');
      } else {
       // toast.success(`${orders.length} pedido(s) encontrado(s)`);
        if (foundWithFormat && foundWithFormat !== phone) {
          // console.log(`💡 Dica: Pedidos encontrados com formato ${foundWithFormat} em vez de ${phone}`);
        }
      }
    } catch (error) {
      console.error('Erro ao buscar pedidos:', error);
      toast.error('Erro ao buscar pedidos');
      setSearchResults([]);
    } finally {
      setIsSearching(false);
    }
  };

  const getStatusIcon = (status: string) => {
    switch (status) {
      case 'pending':
      case 'pending_payment':
      case 'awaiting_seller_confirmation':
        return <Clock className="w-4 h-4" />;
      case 'confirmed':
      case 'preparing':
        return <Package className="w-4 h-4" />;
      case 'ready':
      case 'completed':
        return <CheckCircle className="w-4 h-4" />;
      case 'cancelled':
      case 'canceled':
        return <XCircle className="w-4 h-4" />;
      default:
        return <Clock className="w-4 h-4" />;
    }
  };

  const getStatusText = (status: string) => {
    switch (status) {
      case 'pending':
        return 'Aguardando confirmação';
      case 'pending_payment':
        return 'Pagamento pendente';
      case 'awaiting_seller_confirmation':
        return 'Aguardando confirmação do vendedor';
      case 'confirmed':
        return 'Pedido confirmado';
      case 'preparing':
        return 'Preparando';
      case 'ready':
        return 'Pronto para retirada';
      case 'completed':
        return 'Concluído';
      case 'delivered':
        return 'Pedido entregue';
      case 'cancelled':
      case 'canceled':
        return 'Cancelado';
      default:
        return status;
    }
  };

  const getStatusColor = (status: string) => {
    switch (status) {
      case 'pending':
      case 'pending_payment':
      case 'awaiting_seller_confirmation':
        return 'bg-yellow-100 text-yellow-800';
      case 'confirmed':
      case 'preparing':
        return 'bg-blue-100 text-blue-800';
      case 'ready':
        return 'bg-green-100 text-green-800';
      case 'completed':
        return 'bg-primary/10 text-primary';
      case 'cancelled':
      case 'canceled':
        return 'bg-red-100 text-red-800';
      default:
        return 'bg-gray-100 text-gray-800';
    }
  };

  return (
    <div className="container mx-auto px-4 py-6 max-w-4xl">
      {/* Header com navegação */}
      <div className="mb-6 flex items-center justify-between">
        <Button 
          variant="outline" 
          onClick={() => navigate('/')}
          className="flex items-center gap-2"
        >
          <ArrowLeft className="w-4 h-4" />
          Voltar ao Menu
        </Button>
        
        <Button 
          variant="default" 
          onClick={() => navigate('/')}
          className="flex items-center gap-2"
        >
          <Home className="w-4 h-4" />
          Menu Principal
        </Button>
      </div>

      <div className="mb-8 text-center">
        <h1 className="bruno-text-gradient mb-2">Acompanhe seu Pedido</h1>
        <p className="text-muted-foreground">
          Digite seu email ou telefone para encontrar seus pedidos
        </p>
      </div>

      <Card className="mb-6">
        <CardHeader>
          <CardTitle className="flex items-center gap-2">
            <Search className="w-5 h-5" />
            Buscar Pedidos
          </CardTitle>
        </CardHeader>
        <CardContent className="space-y-4">
          <div className="grid grid-cols-1 md:grid-cols-2 gap-4">
            <div>
              <label className="text-sm font-medium mb-1 block">Email</label>
              <Input
                type="email"
                placeholder="seu@email.com"
                value={email}
                onChange={(e) => setEmail(e.target.value)}
              />
            </div>
            <div>
              <label className="text-sm font-medium mb-1 block">Telefone</label>
              <Input
                type="tel"
                placeholder="(11) 99999-9999"
                value={phone}
                onChange={(e) => handlePhoneChange(e.target.value)}
              />
            </div>
          </div>
          <Button 
            onClick={searchOrders} 
            disabled={isSearching || (!email && !phone)}
            className="w-full bruno-gradient text-white hover:opacity-90"
          >
            {isSearching ? 'Buscando...' : 'Buscar Pedidos'}
          </Button>
        </CardContent>
      </Card>

      {searchResults.length > 0 && (
        <div className="space-y-4">
          <h2 className="text-xl font-semibold">Seus Pedidos</h2>
          {searchResults.map((order) => (
            <Card key={order.id} className="overflow-hidden">
              <CardHeader className="pb-3">
                <div className="flex items-center justify-between">
                  <div>
                    <CardTitle className="text-lg">Pedido #{order.id}</CardTitle>
                    <p className="text-sm text-muted-foreground">
                      {new Date(order.created_at || order.createdAt).toLocaleDateString('pt-BR', {
                        day: '2-digit',
                        month: '2-digit',
                        year: 'numeric',
                        hour: '2-digit',
                        minute: '2-digit',
                      })}
                    </p>
                    {/* Link para abrir localização no Google Maps sempre usando o endereço ativo se não houver no pedido */}

                  </div>
                  <Badge className={getStatusColor(order.status)}>
                    {getStatusIcon(order.status)}
                    <span className="ml-1">{getStatusText(order.status)}</span>
                  </Badge>
                </div>
              </CardHeader>
              <CardContent className="space-y-4">
                <div>
                  <h4 className="font-medium mb-2">Itens do Pedido</h4>
                  <div className="space-y-2">
                    {(order.items || []).map((item: any, index: number) => (
                      <div key={index} className="flex justify-between items-center text-sm">
                        <span>
                          {item.quantity}x {item.product?.name || item.product_name || 'Produto'}
                        </span>
                        <span className="font-medium">
                          R$ {((item.unit_price || item.price || 0) * item.quantity).toFixed(2)}
                        </span>
                      </div>
                    ))}
                  </div>
                  <Separator className="my-2" />
                  <div className="flex justify-between items-center font-semibold">
                    <span>Total</span>
                    <span className="text-primary">R$ {Number(order.total_real ?? order.total_amount ?? order.total ?? 0).toFixed(2)}</span>
                  </div>
                </div>

                <div className="grid grid-cols-1 md:grid-cols-2 gap-4 text-sm">
                  <div>
                    <h4 className="font-medium mb-1">Cliente</h4>
                    <p>{order.customer_name || order.customer?.name}</p>
                    <p>{order.customer_email || order.customer?.email}</p>
                    <p>{order.customer_phone || order.customer?.phone}</p>
                  </div>
                  <div>
                    <h4 className="font-medium mb-1">Endereço</h4>
                    <p>{order.address_street || order.customer?.address}</p>
                    <p>{order.address_neighborhood || order.customer?.neighborhood}</p>
                    {(order.additional_info || order.customer?.additionalInfo) && (
                      <p className="text-muted-foreground">{order.additional_info || order.customer?.additionalInfo}</p>
                    )}
                  </div>
                </div>

                {(order.status === 'ready' || order.status === 'completed') && (
                  <div className="bg-green-50 border border-green-200 rounded-lg p-4">
                    <p className="text-green-800 font-medium">
                      🎉 Seu pedido está pronto! Venha buscar em
                      <br />
                      {activeAddress && activeAddress.address ? (
                        <>
                          <div style={{ display: 'flex', alignItems: 'center', flexWrap: 'wrap', gap: 8 }}>
                            <strong>{activeAddress.address}</strong>
                            {activeLatLng && (
                              <a
                                href={`https://www.google.com/maps/search/?api=1&query=${activeLatLng.latitude},${activeLatLng.longitude}`}
                                target="_blank"
                                rel="noopener noreferrer"
                                style={{ color: '#2563eb', textDecoration: 'underline', fontWeight: 500 }}
                              >
                              Ver localização de retirada do produto
                              </a>
                            )}
                          </div>
                          <br />
                          <span>Horário: {activeAddress.workingHours}</span>
                        </>
                      ) : (
                        <>nossa loja durante o horário de funcionamento.</>
                      )}
                      <br />Estamos já te aguardando!
                    </p>
                  </div>
                )}
              </CardContent>
            </Card>
          ))}
        </div>
      )}

      {searchResults.length === 0 && (email || phone) && !isSearching && (
        <div className="text-center py-8">
          <Package className="w-12 h-12 mx-auto text-muted-foreground mb-3" />
          <p className="text-muted-foreground">
            Nenhum pedido encontrado com os dados informados.
            <br />
            Verifique se as informações estão corretas.
          </p>
        </div>
      )}

      {/* Footer com botão para voltar ao menu */}
      <div className="mt-8 text-center">
        <Button 
          variant="outline" 
          size="lg"
          onClick={() => navigate('/')}
          className="flex items-center gap-2 mx-auto"
        >
          <Home className="w-4 h-4" />
          Voltar ao Menu Principal
        </Button>
        <p className="text-muted-foreground text-sm mt-2">
          Continue navegando pelos nossos deliciosos produtos
        </p>
      </div>
    </div>
  );
};