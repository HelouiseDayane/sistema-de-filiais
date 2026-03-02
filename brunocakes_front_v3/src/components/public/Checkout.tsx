import React, { useState, useEffect } from 'react';
import { useRealTime } from '../../hooks/useRealTime';
import { Copy } from 'lucide-react';
import { useNavigate } from 'react-router-dom';
import { Button } from '../ui/button';
import { Input } from '../ui/input';
import { Textarea } from '../ui/textarea';
import { Card, CardContent, CardHeader, CardTitle } from '../ui/card';
import { Separator } from '../ui/separator';
import { Dialog, DialogContent, DialogDescription, DialogFooter, DialogHeader, DialogTitle, DialogTrigger } from '../ui/dialog';
import { Label } from '../ui/label';
import { Checkbox } from '../ui/checkbox';
import { Alert, AlertDescription } from '../ui/alert';
import { ArrowLeft, MessageCircle, User, Mail, Phone, MapPin, Users, Clock, AlertCircle, RefreshCw } from 'lucide-react';
import { useApp } from '../../App';
import { toast } from 'sonner';
import { api } from '../../api';
import { useCartExpiration } from '../../hooks/useCartExpiration';

interface CustomerData {
  id: number
  name: string;
  email: string;
  phone: string;
  address: string;
  order_number: string;
  neighborhood: string;
  additionalInfo?: string;
}

export const Checkout = () => {
    const { connect, disconnect } = useRealTime();
    const [orderStatus, setOrderStatus] = useState<string>('pending_payment');
    const [paymentSuccess, setPaymentSuccess] = useState(false);
      const [customerData, setCustomerData] = useState<CustomerData>({
        id: 0,
        name: '',
        email: '',
        phone: '',
        address: '',
        order_number: '',
        neighborhood: '',
        additionalInfo: ''
      });
    // Fechar modal e limpar carrinho após pagamento
    useEffect(() => {
      if (paymentSuccess) {
        console.log('[Checkout] paymentSuccess TRUE, executando limpeza e fechamento do modal');
        setShowOrderConfirmationModal(false);
        clearCart();
        setPixQrCodeBase64(null);
        setPixCopiaECola(null);
        toast.success('Pagamento efetuado com sucesso! Aguarde, em instantes confirmaremos a entrega no seu WhatsApp.', { duration: 8000 });
      } else {
        console.log('[Checkout] paymentSuccess FALSE, aguardando confirmação de pagamento...');
      }
    }, [paymentSuccess]);

    // A conexão SSE será controlada pelo RealTimeProvider (autoConnect)

    // Atualiza status do pedido ao receber evento SSE
    const handleOrderStatusUpdate = async (data: { order_id: string; status: string }) => {
      console.log('[Checkout] Evento SSE recebido:', data, 'customerData.id:', customerData.id, 'paymentSuccess:', paymentSuccess);
      if (
        data.order_id &&
        Number(data.order_id) === customerData.id &&
        (data.status === 'confirmed' || data.status === 'paid') &&
        !paymentSuccess
      ) {
        console.log('[Checkout] Status de pagamento confirmado recebido via SSE!', data);
        setOrderStatus('confirmed');
        setPaymentSuccess(true);

        // Limpa o carrinho no backend via API
        const sessionId = localStorage.getItem('bruno_session_id') || '';
        if (sessionId) {
          try {
            await fetch(`/api/cart/session/${sessionId}`, { method: 'DELETE' });
            console.log('[Checkout] Carrinho limpo no backend após confirmação de pagamento via SSE');
          } catch (err) {
            console.error('[Checkout] Erro ao limpar carrinho no backend:', err);
          }
        }
        // Limpa localmente
        clearCart();
      } else {
        console.log('[Checkout] Evento SSE ignorado: order_id não bate ou status não é confirmado/paid ou já está pago.');
      }
    };
  const navigate = useNavigate();
  const { cart, clearCart, refreshProducts, getAvailableStock } = useApp();
  const hasOutOfStock = cart.some(item => {
    const stock = getAvailableStock(item.product.id);
    return stock === 0;
  });
  const { currentStatus, startCheckoutExpiration, clearAllExpirationItems, CHECKOUT_EXPIRATION_MINUTES } = useCartExpiration();
  const [isLoading, setIsLoading] = useState(false);
  const [isExistingCustomerModalOpen, setIsExistingCustomerModalOpen] = useState(false);
  const [customerContact, setCustomerContact] = useState('');
  const [isSearchingCustomer, setIsSearchingCustomer] = useState(false);
  const [searchByPhone, setSearchByPhone] = useState(false); // true = telefone, false = email
  const [foundCustomerData, setFoundCustomerData] = useState<any>(null);
  const [isConfirmCustomerModalOpen, setIsConfirmCustomerModalOpen] = useState(false);
  const [isRefreshingStock, setIsRefreshingStock] = useState(false);
  // ...existing code...

  // Passa o callback para o RealTimeProvider
  // Se estiver usando o RealTimeProvider no App, ajuste para:
  // <RealTimeProvider onOrderStatusUpdate={handleOrderStatusUpdate}>

  // Estado para modal de confirmação do pedido
  const [showOrderConfirmationModal, setShowOrderConfirmationModal] = useState(false);
  // Estados para PIX
  const [pixQrCodeBase64, setPixQrCodeBase64] = useState<string | null>(null);
  const [pixQrCodeUrl, setPixQrCodeUrl] = useState<string | null>(null);
  const [pixCopiaECola, setPixCopiaECola] = useState<string | null>(null);
  const [pixQrCodeError, setPixQrCodeError] = useState<string | null>(null);

  // Logar valor do QR Code quando o modal abrir
  useEffect(() => {
    if (showOrderConfirmationModal) {
      console.log('PIX QR Code (base64 ou URL):', pixQrCodeBase64);
    }
  }, [showOrderConfirmationModal, pixQrCodeBase64]);

  // Redirecionar para o cardápio se o carrinho expirar ou ficar vazio
  useEffect(() => {
    if (cart.length === 0) {
      if (!paymentSuccess) {
        toast.error('Seu carrinho expirou ou ficou vazio. Redirecionando para o cardápio...');
        navigate('/');
      } else {
        // Se pagamento foi feito, não mostrar mensagem de expiração
        // Apenas limpar o carrinho e manter o fluxo de sucesso
      }
    }
  }, [cart.length, navigate, paymentSuccess]);

  // Função para criar pedido
  const createOrder = async (customerData: CustomerData, cart: any[], total: number) => {
    try {
      // Obter session ID do localStorage
      const sessionId = localStorage.getItem('bruno_session_id') || '';
      // Obter filial selecionada
      const savedBranch = localStorage.getItem('selected_branch');
      if (!savedBranch) {
        toast.error('Por favor, selecione uma filial antes de finalizar o pedido');
        navigate('/');
        return;
      }
      const selectedBranch = JSON.parse(savedBranch);
      if (!selectedBranch?.id) {
        toast.error('Filial inválida. Por favor, selecione novamente.');
        navigate('/');
        return;
      }
      // Validar estrutura do carrinho
      const validatedItems = cart.filter(item => item?.product?.id).map(item => {
        const price = item.product.isPromotion ? item.product.promotionPrice || item.product.price : item.product.price;
        return {
          product_id: item.product.id,
          product_name: item.product.name,
          unit_price: price,
          quantity: item.quantity,
          total_price: price * item.quantity
        };
      });
      if (validatedItems.length === 0) {
        throw new Error('Carrinho vazio ou itens inválidos');
      }
      const orderData = {
        session_id: sessionId,
        branch_id: selectedBranch.id,
        customer_name: customerData.name,
        customer_email: customerData.email,
        customer_phone: customerData.phone,
        customer_address: `${customerData.address}, ${customerData.neighborhood}`,
        address_street: customerData.address,
        address_neighborhood: customerData.neighborhood,
        observations: customerData.additionalInfo || '',
        items: validatedItems
      };
      const response = await api.createOrder(orderData);
      // Salva os dados do PIX se existirem
      setPixQrCodeBase64(response?.pix_qr_code_base64 || null);
      setPixQrCodeUrl(response?.pix_qr_code_url || null);
      setPixCopiaECola(response?.pix_copia_e_cola || null);
      setPixQrCodeError(response?.error || null);
        setOrderStatus(response?.order?.status || 'pending_payment');
      // Iniciar timer de expiração do checkout
      if (response?.id) {
        startCheckoutExpiration(response.id.toString(), sessionId);
        setCustomerData(prev => ({
          ...prev,
          id: response.id,
          order_number: response.order_number
        }));
      }
      return response?.id || Date.now().toString();
    } catch (error) {
      console.error('Erro ao criar pedido:', error);
      // Tratar erro de estoque insuficiente ou carrinho expirado
      if (error instanceof Error) {
        if (error.message.includes('Carrinho vazio ou expirado')) {
          clearCart();
          await refreshProducts();
          toast.error('⏰ Seu carrinho expirou ou algum produto ficou sem estoque. Revise seu pedido!', {
            duration: 6000,
          });
          setTimeout(() => {
            navigate('/');
          }, 2000);
          throw new Error('Carrinho expirado - redirecionando para o cardápio');
        }
        if (error.message.includes('Estoque insuficiente')) {
          clearCart();
          await refreshProducts();
          toast.error('❌ Um ou mais produtos do seu carrinho ficaram sem estoque. Seu carrinho foi limpo.', {
            duration: 6000,
          });
          setTimeout(() => {
            navigate('/');
          }, 2000);
          throw new Error('Estoque insuficiente - redirecionando para o cardápio');
        }
      }
      throw error;
    }
  };

  // Função para atualizar estoque
  const handleRefreshStock = async () => {
    setIsRefreshingStock(true);
    try {
      await refreshProducts();
      toast.success('Estoque atualizado!');
    } catch (error) {
      toast.error('Erro ao atualizar estoque');
    } finally {
      setIsRefreshingStock(false);
    }
  };

  // Limpar expiração quando sair do checkout
  useEffect(() => {
    return () => {
      if (cart.length === 0) {
        clearAllExpirationItems();
      }
    };
  }, [cart.length, clearAllExpirationItems]);

  const total = cart.reduce((sum, item) => {
    const price = item.product.isPromotion ? item.product.promotionPrice || item.product.price : item.product.price;
    return sum + (price * item.quantity);
  }, 0);

  const handleInputChange = (field: keyof CustomerData, value: string) => {
    setCustomerData(prev => ({ ...prev, [field]: value }));
  };

  // Função para formatar telefone
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

  // Função para lidar com mudança no campo de contato
  const handleContactChange = (value: string) => {
    // Aplicar máscara de telefone sempre
    const formatted = formatPhoneInput(value);
    setCustomerContact(formatted);
  };

  const handleSearchExistingCustomer = async () => {
    if (!customerContact.trim()) {
      toast.error('Por favor, digite um telefone.');
      return;
    }

    // Validação básica para telefone
    const digits = customerContact.replace(/\D/g, '');
    if (digits.length < 10) {
      toast.error('Por favor, digite um telefone válido com pelo menos 10 dígitos.');
      return;
    }

    setIsSearchingCustomer(true);
    try {
      // Enviar apenas os dígitos do telefone
      const contactToSend = customerContact.replace(/\D/g, '');
      const response = await api.getCustomerLastOrder(contactToSend);
      if (response && response.customer_name) {
        // Salva os dados encontrados para confirmação
        setFoundCustomerData(response);
        setIsConfirmCustomerModalOpen(true);
        setIsExistingCustomerModalOpen(false);
      } else {
        // Cliente não encontrado - mantém o modal aberto para nova tentativa
        toast.error('❌ Cliente não encontrado. Verifique o telefone informado e tente novamente.');
      }
    } catch (error) {
      console.error('Erro ao buscar dados do cliente:', error);
      toast.error('Cliente não encontrado ou erro no servidor. Tente novamente.');
    } finally {
      setIsSearchingCustomer(false);
    }
  };

  const handleConfirmCustomer = () => {
    if (foundCustomerData) {
      // Formatar telefone com máscara antes de setar
      const phoneNumber = foundCustomerData.customer_phone || '';
      const formattedPhone = formatPhoneInput(phoneNumber);
      
      // Preenche os dados do formulário
      setCustomerData((prev: CustomerData) => {
        const newData = {
          ...prev,
          name: foundCustomerData.customer_name || '',
          email: foundCustomerData.customer_email || '',
          phone: formattedPhone, // Usar telefone formatado
          address: foundCustomerData.address_street 
            ? `${foundCustomerData.address_street}${foundCustomerData.address_number ? ', ' + foundCustomerData.address_number : ''}`
            : '',
          neighborhood: foundCustomerData.address_neighborhood || ''
        };
        
        return newData;
      });
      
      toast.success('✅ Dados do cliente preenchidos com sucesso! Verifique os campos abaixo.');
      setIsConfirmCustomerModalOpen(false);
      setFoundCustomerData(null);
      setCustomerContact('');
      // Resetar para telefone sempre, já que só suportamos telefone
    }
  };

  const handleRejectCustomer = () => {
    setIsConfirmCustomerModalOpen(false);
    setFoundCustomerData(null);
    setIsExistingCustomerModalOpen(true); // Volta para o modal de busca
  };



  const handleSubmit = async (e: React.FormEvent) => {

    e.preventDefault();

    // Atualizar produtos antes de validar estoque
    await refreshProducts();

    // Remover itens sem estoque do carrinho
    const outOfStockItems = cart.filter(item => getAvailableStock(item.product.id) === 0);
    if (outOfStockItems.length > 0) {
      outOfStockItems.forEach(item => {
        toast.error(`Produto sem estoque removido: ${item.name}`);
      });
      clearCart();
      toast.error('Um ou mais itens do seu carrinho estavam sem estoque e foram removidos. Adicione novamente para finalizar o pedido.');
      return;
    }

    if (cart.length === 0) {
      toast.error('Seu carrinho está vazio');
      return;
    }

    // Validação básica
    if (!customerData.name || !customerData.phone || !customerData.address || !customerData.neighborhood) {
      toast.error('Preencha todos os campos obrigatórios');
      return;
    }

    setIsLoading(true);

    try {
      const orderId = await createOrder(customerData, cart, total);
      setShowOrderConfirmationModal(true);
      // Limpeza do carrinho e redirecionamento só após o usuário clicar no botão do modal
    } catch (error) {
      if (error instanceof Error && error.message.includes('Carrinho expirado')) {
        // Erro já tratado na função createOrder
        return;
      }
      toast.error('Erro ao processar pedido. Verifique seus dados e tente novamente.');
    } finally {
      setIsLoading(false);
    }
  };

  if (cart.length === 0) {
    return (
      <div className="container mx-auto px-4 py-8 max-w-2xl">
        <div className="text-center">
          <h1 className="bruno-text-gradient mb-4">Carrinho Vazio</h1>
          <p className="text-muted-foreground mb-6">
            Adicione alguns produtos deliciosos ao seu carrinho antes de finalizar o pedido.
          </p>
          <Button onClick={() => navigate('/')} className="bruno-gradient text-white">
            Ir para o Cardápio
          </Button>
        </div>
      </div>
    );
  }

  return (
    <div className="checkout-container">
      {/* Botão de confirmação do pedido (modal) */}
      <Dialog open={showOrderConfirmationModal} onOpenChange={setShowOrderConfirmationModal}>
        {paymentSuccess ? (
          <DialogHeader>
            <DialogTitle>
              <span className="inline-flex items-center gap-2 text-green-700 text-lg font-semibold">
                <svg width="28" height="28" fill="none" viewBox="0 0 24 24"><circle cx="12" cy="12" r="12" fill="#16a34a"/><path d="M8 12.5l2.5 2.5 5-5" stroke="#fff" strokeWidth="2" strokeLinecap="round" strokeLinejoin="round"/></svg>
                Pagamento efetuado com sucesso!
              </span>
            </DialogTitle>
            <DialogDescription>
              Aguarde, em instantes confirmaremos a entrega no seu WhatsApp.
            </DialogDescription>
          </DialogHeader>
        ) : null}
        <DialogContent>
          <DialogHeader>
            <DialogTitle>Pedido realizado com sucesso!</DialogTitle>
            <DialogDescription>
              {(pixCopiaECola || pixQrCodeUrl || pixQrCodeBase64) ? (
                <div className="flex flex-col items-center gap-4 py-2">
                  <span className="inline-flex items-center gap-2 text-green-700 text-lg font-semibold">
                    <svg width="28" height="28" fill="none" viewBox="0 0 24 24"><circle cx="12" cy="12" r="12" fill="#16a34a"/><path d="M8 12.5l2.5 2.5 5-5" stroke="#fff" strokeWidth="2" strokeLinecap="round" strokeLinejoin="round"/></svg>
                    Pagamento via PIX
                  </span>
                  {pixQrCodeUrl ? (
                    <img
                      src={pixQrCodeUrl}
                      alt="QR Code PIX"
                      className="rounded-lg border-2 border-green-200 bg-white shadow-md"
                      style={{ width: 200, height: 200, maxWidth: '80vw', maxHeight: '40vw', objectFit: 'contain' }}
                    />
                  ) : pixQrCodeBase64 ? (
                    <img
                      src={pixQrCodeBase64}
                      alt="QR Code PIX"
                      className="rounded-lg border-2 border-green-200 bg-white shadow-md"
                      style={{ width: 200, height: 200, maxWidth: '80vw', maxHeight: '40vw', objectFit: 'contain' }}
                    />
                  ) : pixQrCodeError ? (
                    <div className="text-center text-red-600 font-semibold mb-2">
                      Erro ao gerar QR Code PIX:<br />
                      <span className="text-xs break-all">{pixQrCodeError}</span>
                    </div>
                  ) : (
                    <span className="text-xs text-red-600 mt-2">QR Code do PIX não foi gerado. Pague usando o código Copia e Cola ou tente novamente.</span>
                  )}
                  {pixCopiaECola && (
                    <div className="w-full flex flex-col items-center gap-2 mt-2">
                      <label className="text-xs font-medium text-green-800">Pix Copia e Cola:</label>
                      <div className="flex items-center gap-2 w-full max-w-full justify-center">
                        <Input
                          value={pixCopiaECola}
                          readOnly
                          className="w-full text-base text-center border-2 border-green-500 bg-green-50 font-mono px-2 py-2"
                          style={{ fontFamily: 'monospace', fontSize: '1em' }}
                        />
                        <Button
                          type="button"
                          size="icon"
                          variant="outline"
                          onClick={() => {
                            navigator.clipboard.writeText(pixCopiaECola);
                            toast.success('Código PIX copiado!');
                          }}
                        >
                          <Copy className="w-4 h-4" />
                        </Button>
                      </div>
                    </div>
                  )}
                  <div className="text-xs text-muted-foreground mt-2 mb-2 text-center">
                    Após o pagamento, você receberá a confirmação no WhatsApp.<br />
                    Você pode acompanhar o status na tela de rastreamento.
                  </div>
                </div>
              ) : (
                <div className="flex flex-col items-center gap-4 py-2">
                  <span className="inline-flex items-center gap-2 text-green-700 text-lg font-semibold">
                    <svg width="28" height="28" fill="none" viewBox="0 0 24 24"><circle cx="12" cy="12" r="12" fill="#16a34a"/><path d="M8 12.5l2.5 2.5 5-5" stroke="#fff" strokeWidth="2" strokeLinecap="round" strokeLinejoin="round"/></svg>
                    Pedido enviado!
                  </span>
                  <div className="text-center text-base text-muted-foreground">
                    Seu pedido foi enviado para o seu WhatsApp!<br />
                    Verifique o aplicativo para confirmar o pedido e aguarde o contato da loja.<br />
                    Você pode acompanhar o status na tela de rastreamento.
                  </div>
                </div>
              )}
            </DialogDescription>
          </DialogHeader>
          <div className="flex justify-center mt-6">
            <Button
              className="w-full sm:w-auto bg-green-600 hover:bg-green-700 text-white text-lg px-8 py-3"
              onClick={() => {
                setShowOrderConfirmationModal(false);
                clearCart();
                setPixQrCodeBase64(null);
                setPixCopiaECola(null);
                if (customerData.phone) {
                  // Enviar telefone com máscara para tracking
                  navigate(`/tracking?phone=${encodeURIComponent(customerData.phone)}`);
                } else {
                  navigate('/tracking');
                }
              }}
            >
              Certo!
            </Button>
          </div>
        </DialogContent>
      </Dialog>

      <div className="mb-6">
        <Button 
          variant="ghost" 
          onClick={() => navigate('/cart')}
          className="mb-4"
        >
          <ArrowLeft className="w-4 h-4 mr-2" />
          Voltar ao Carrinho
        </Button>
        <h1 className="bruno-text-gradient">Finalizar Pedido</h1>
        <p className="text-muted-foreground">
          Preencha seus dados para confirmar o pedido
        </p>
      </div>

      {/* Alerta de Tempo Limite do Carrinho */}
      <Alert className="mb-6 border-2 border-blue-500 bg-blue-50">
        <Clock className="h-4 w-4 text-blue-600" />
        <AlertDescription className="font-medium text-blue-800">
          ⏰ <strong>Atenção:</strong> Você tem apenas <strong>{CHECKOUT_EXPIRATION_MINUTES} minutos</strong> para finalizar sua compra após adicionar itens ao carrinho. 
          Depois desse tempo, o carrinho será limpo automaticamente e você precisará selecionar os produtos novamente.
        </AlertDescription>
      </Alert>

      {/* Checkout Expiration Timer */}
      {currentStatus && (
        <Alert className={`mb-6 border-2 ${
          currentStatus.isCritical ? 'border-red-500 bg-red-50' :
          currentStatus.isWarning ? 'border-yellow-500 bg-yellow-50' :
          'border-orange-500 bg-orange-50'
        }`}>
          <div className="flex items-center gap-2">
            {currentStatus.isCritical ? (
              <AlertCircle className="h-4 w-4 text-red-600" />
            ) : (
              <Clock className="h-4 w-4 text-orange-600" />
            )}
            <AlertDescription className={`font-medium ${
              currentStatus.isCritical ? 'text-red-800' :
              currentStatus.isWarning ? 'text-yellow-800' :
              'text-orange-800'
            }`}>
              {currentStatus.isCritical ? (
                <>🚨 Checkout expira em {currentStatus.formattedTime}! Complete agora ou seus produtos voltarão ao estoque.</>
              ) : currentStatus.isWarning ? (
                <>⚠️ Checkout expira em {currentStatus.formattedTime}. Complete sua compra!</>
              ) : (
                <>⏰ Tempo restante para finalizar: {currentStatus.formattedTime} (Total: {CHECKOUT_EXPIRATION_MINUTES} min)</>
              )}
            </AlertDescription>
          </div>
        </Alert>
      )}

      <div className="grid grid-cols-1 lg:grid-cols-2 gap-6">
        {/* Formulário */}
        <Card>
          <CardHeader>
            <CardTitle className="flex items-center gap-2">
              <User className="w-5 h-5" />
              Dados do Cliente
            </CardTitle>
          </CardHeader>
          <CardContent>
            {/* Botão Já sou cliente */}
            <div className="flex justify-center mb-6">
              <Button 
                type="button" 
                variant="outline" 
                className="flex items-center gap-2 bg-blue-50 border-blue-300 text-blue-700 hover:bg-blue-100"
                onClick={() => setIsExistingCustomerModalOpen(true)}
              >
                <Users className="h-4 w-4" />
                👤 Já sou cliente
              </Button>
            </div>
            <form onSubmit={handleSubmit} className="space-y-4">
              <div>
                <label className="text-sm font-medium mb-1 block">Nome Completo *</label>
                <Input
                  type="text"
                  placeholder="Seu nome completo"
                  value={customerData.name}
                  onChange={(e) => handleInputChange('name', e.target.value)}
                  required
                />
              </div>

              <div className="grid grid-cols-1 sm:grid-cols-2 gap-4">
                <div>
                  <label className="text-sm font-medium mb-1 block">Email</label>
                  <Input
                    type="email"
                    placeholder="seu@email.com"
                    value={customerData.email}
                    onChange={(e) => handleInputChange('email', e.target.value)}
                    
                  />
                </div>
                <div>
                  <label className="text-sm font-medium mb-1 block">Telefone *</label>
                  <Input
                    type="tel"
                    placeholder="(11) 99999-9999"
                    value={customerData.phone}
                    onChange={(e) => handleInputChange('phone', formatPhoneInput(e.target.value))}
                    required
                  />
                </div>
              </div>

              <div>
                <label className="text-sm font-medium mb-1 block">Endereço Completo *</label>
                <Input
                  type="text"
                  placeholder="Rua, número, complemento"
                  value={customerData.address}
                  onChange={(e) => handleInputChange('address', e.target.value)}
                  required
                />
              </div>

              <div>
                <label className="text-sm font-medium mb-1 block">Bairro *</label>
                <Input
                  type="text"
                  placeholder="Nome do bairro"
                  value={customerData.neighborhood}
                  onChange={(e) => handleInputChange('neighborhood', e.target.value)}
                  required
                />
              </div>

              <div>
                <label className="text-sm font-medium mb-1 block">Observações</label>
                <Textarea
                  placeholder="Informações adicionais (opcional)"
                  value={customerData.additionalInfo}
                  onChange={(e) => handleInputChange('additionalInfo', e.target.value)}
                  className="resize-none"
                  rows={3}
                />
              </div>

              <Button 
                type="submit" 
                disabled={isLoading}
                className="w-full bruno-gradient text-white hover:opacity-90"
              >
                <MessageCircle className="w-4 h-4 mr-2" />
                {isLoading ? 'Processando...' : 'Enviar Pedido via WhatsApp'}
              </Button>
            </form>
          </CardContent>
        </Card>

        {/* Resumo do Pedido */}
        <Card>
          <CardHeader>
            <CardTitle>Resumo do Pedido</CardTitle>
          </CardHeader>
          <CardContent className="space-y-4">
            {cart.map((item) => {
              const price = item.product.isPromotion ? item.product.promotionPrice || item.product.price : item.product.price;
              return (
                <div key={item.product.id} className="flex justify-between items-start">
                  <div className="flex-1">
                    <h4 className="font-medium">{item.product.name}</h4>
                    <p className="text-sm text-muted-foreground">
                      {item.quantity}x R$ {price.toFixed(2)}
                    </p>
                  </div>
                  <span className="font-medium">
                    R$ {(price * item.quantity).toFixed(2)}
                  </span>
                </div>
              );
            })}
            <Separator />
            <div className="flex justify-between items-center text-lg font-semibold">
              <span>Total</span>
              <span className="text-primary">R$ {total.toFixed(2)}</span>
            </div>
            <div className="bg-secondary/50 rounded-lg p-4 space-y-2">
              <h4 className="font-medium flex items-center gap-2">
                <MessageCircle className="w-4 h-4" />
                Como funciona?
              </h4>
              <div className="text-sm text-muted-foreground space-y-1">
                <p>1. Preencha seus dados</p>
                <p>2. Clique em "Enviar via WhatsApp"</p>
                <p>3. Confirme o pedido no WhatsApp</p>
                <p>4. Pague via PIX quando confirmado</p>
                <p>5. Retire na loja quando estiver pronto</p>
              </div>
            </div>
          </CardContent>
        </Card>
      </div>

      {/* Modal para buscar cliente existente */}
      <Dialog open={isExistingCustomerModalOpen} onOpenChange={setIsExistingCustomerModalOpen}>
        <DialogContent className="sm:max-w-lg max-h-[90vh] overflow-y-auto w-full">
          <DialogHeader>
            <DialogTitle>Buscar dados do cliente</DialogTitle>
            <DialogDescription>
              Digite o telefone do cliente para buscar os dados de pedidos anteriores.
            </DialogDescription>
          </DialogHeader>
          <div className="space-y-4">
            <div className="space-y-2">
              <Label htmlFor="customer-contact" className="flex items-center gap-2">
                <Phone className="h-4 w-4" />
                Telefone
              </Label>
              <Input
                id="customer-contact"
                type="tel"
                placeholder="(84) 99999-9999"
                value={customerContact}
                onChange={(e) => handleContactChange(e.target.value)}
                className="w-full"
              />
              <p className="text-xs text-muted-foreground">
                Digite apenas números. A máscara será aplicada automaticamente.
              </p>
            </div>
          </div>
          <div className="w-full flex justify-between gap-3 pt-4 border-t bg-gray-50 p-4 -mx-6 -mb-6 mt-4">
            <button 
              type="button" 
              className="flex-1 px-4 py-2 border border-gray-300 rounded bg-white hover:bg-gray-50 font-semibold"
              onClick={() => {
                setIsExistingCustomerModalOpen(false);
                setCustomerContact('');
                setSearchByPhone(false);
              }}
            >
              ❌ Cancelar
            </button>
            <button
              type="button"
              className={`flex-1 min-w-[140px] px-4 py-2 border border-gray-300 rounded bg-white hover:bg-gray-50 font-semibold transition-all ${isSearchingCustomer || !customerContact.trim() ? 'opacity-60 cursor-not-allowed text-gray-500' : 'text-gray-700'}`}
              onClick={handleSearchExistingCustomer}
              disabled={isSearchingCustomer || !customerContact.trim()}
            >
              <span className="whitespace-nowrap">
                {isSearchingCustomer ? '⏳ Buscando...' : '🔍 Buscar Dados'}
              </span>
            </button>
          </div>
        </DialogContent>
      </Dialog>

      {/* Modal de Confirmação dos Dados do Cliente */}
      <Dialog open={isConfirmCustomerModalOpen} onOpenChange={setIsConfirmCustomerModalOpen}>
        <DialogContent className="sm:max-w-lg">
          <DialogHeader>
            <DialogTitle className="flex items-center gap-2">
              <Users className="h-5 w-5 text-green-600" />
              ✅ Cliente encontrado!
            </DialogTitle>
            <DialogDescription>
              Encontramos os dados deste cliente. Deseja preencher o formulário automaticamente com essas informações?
            </DialogDescription>
          </DialogHeader>
          {foundCustomerData && (
            <div className="space-y-4 py-4 border rounded-lg p-4 bg-green-50">
              <div className="grid grid-cols-1 gap-3">
                <div>
                  <Label className="text-sm font-medium text-green-800">Nome:</Label>
                  <p className="text-sm font-semibold text-green-900">{foundCustomerData.customer_name}</p>
                </div>
                <div>
                  <Label className="text-sm font-medium text-green-800">Email:</Label>
                  <p className="text-sm text-green-700">{foundCustomerData.customer_email}</p>
                </div>
                <div>
                  <Label className="text-sm font-medium text-green-800">Telefone:</Label>
                  <p className="text-sm text-green-700">{foundCustomerData.customer_phone}</p>
                </div>
                {foundCustomerData.address_street && (
                  <div>
                    <Label className="text-sm font-medium text-green-800">Endereço:</Label>
                    <p className="text-sm text-green-700">
                      {foundCustomerData.address_street}
                      {foundCustomerData.address_number && `, ${foundCustomerData.address_number}`}
                    </p>
                  </div>
                )}
                {foundCustomerData.address_neighborhood && (
                  <div>
                    <Label className="text-sm font-medium text-green-800">Bairro:</Label>
                    <p className="text-sm text-green-700">{foundCustomerData.address_neighborhood}</p>
                  </div>
                )}
              </div>
            </div>
          )}
          <DialogFooter className="flex-col gap-3 pt-4">
            <Button 
              variant="outline" 
              onClick={handleRejectCustomer}
              className="w-full sm:w-auto border-red-200 text-red-700 hover:bg-red-50"
            >
              ❌ buscar novamente
            </Button>
            <Button
              variant="outline"
              onClick={handleConfirmCustomer}
              className="w-full border-green-200 text-green-700 hover:bg-green-50 flex items-center justify-center gap-2 min-w-[200px] px-4 py-2 text-base font-semibold"
              style={{ whiteSpace: 'normal', wordBreak: 'keep-all' }}
            >
              <span className="text-lg">✅</span>
              <span>Sim, preencher formulário</span>
            </Button>
          </DialogFooter>
        </DialogContent>
      </Dialog>
    </div>
  );
}