import { useState, useEffect } from 'react';
import { useApp } from '../../App';
import adminApi from '../../api/admin';
import { getProductImageUrl } from '../../api';
import { Button } from '../ui/button';
import { Card, CardContent, CardHeader, CardTitle } from '../ui/card';
import { Badge } from '../ui/badge';
import { Input } from '../ui/input';
import { Label } from '../ui/label';
import { Textarea } from '../ui/textarea';
import { ProductStockModal } from './ProductStockModal';

interface Branch {
  id: number;
  name: string;
  code: string;
}

interface Product {
  id: string;
  name: string;
  description: string;
  price: number;
  category: string;
  stock?: number;
  quantity?: number;
  is_active: boolean | number | string;
  is_promo?: boolean;
  is_new?: boolean;
  image_url?: string;
  image?: string;
  promotionPrice?: number;
  promotion_price?: number;
  expiryDate?: string;
  expires_at?: string;
  available?: boolean;
  isPromotion?: boolean;
  isNew?: boolean;
  branch_id?: number;
  stocks?: Array<{
    id: number;
    product_id: number;
    branch_id: number;
    quantity: number;
    branch?: Branch;
  }>;
}

// Função auxiliar para converter is_active para boolean real
const isProductActive = (product: Product): boolean => {
  const value = product.is_active;
  
  // Se já é boolean, retorna direto
  if (typeof value === 'boolean') {
    return value;
  }
  
  // Se é número, considera 1 como true e 0 como false
  if (typeof value === 'number') {
    return value === 1;
  }
  
  // Se é string, verifica valores comuns
  if (typeof value === 'string') {
    const str = value.toLowerCase().trim();
    return str === '1' || str === 'true' || str === 'yes';
  }
  
  // Fallback: considera falso
  return false;
};

import { Select, SelectContent, SelectItem, SelectTrigger, SelectValue } from '../ui/select';
import { Dialog, DialogContent, DialogHeader, DialogTitle, DialogTrigger } from '../ui/dialog';
import { Table, TableBody, TableCell, TableHead, TableHeader, TableRow } from '../ui/table';
import { Checkbox } from '../ui/checkbox';
import { ImageWithFallback } from '../figma/ImageWithFallback';
import { toast } from 'sonner';
import { Plus, Edit, Search, Package, Calendar, Star, Percent, AlertTriangle, RefreshCw } from 'lucide-react';

export function ProductsManagement() {
  const { adminProducts, setAdminProducts, refreshProducts } = useApp();
  const [searchTerm, setSearchTerm] = useState('');
  const [selectedCategory, setSelectedCategory] = useState('all');
  const [isDialogOpen, setIsDialogOpen] = useState(false);
  const [editingProduct, setEditingProduct] = useState<any>(null);
  const [editingStock, setEditingStock] = useState<{ productId: string; value: string } | null>(null);
  const [branches, setBranches] = useState<Branch[]>([]);
  const [stockModalOpen, setStockModalOpen] = useState(false);
  const [selectedProductForStock, setSelectedProductForStock] = useState<{ id: string; name: string } | null>(null);
  const [branchStocks, setBranchStocks] = useState<{ [branchId: number]: number }>({});
  const [refreshKey, setRefreshKey] = useState(0);
  
  const currentAdmin = JSON.parse(localStorage.getItem('bruno_admin') || '{}');
  const isMaster = currentAdmin?.role === 'master';
  const isAdmin = currentAdmin?.role === 'admin';
  const isEmployee = currentAdmin?.role === 'employee';
  const userBranchId = currentAdmin?.branch_id;

  const [formData, setFormData] = useState({
    name: '',
    description: '',
    price: '',
    promotionPrice: '',
    category: '',
    file: null as File | null,
    available: true,
    stock: '',
    expiryDate: '',
    isPromotion: false,
    isNew: false,
    branch_id: isMaster ? undefined : userBranchId,
  });

  const categories = [...new Set(adminProducts.map((p: any) => p.category).filter((cat: string) => cat && cat.trim() !== ''))];
  
  // Carregar filiais se for master
  useEffect(() => {
    if (isMaster) {
      fetchBranches();
    }
  }, [isMaster]);
  
  const fetchBranches = async () => {
    try {
      const data = await adminApi.get('/admin/branches');
      // Filtrar apenas filiais ativas
      const branchList = Array.isArray(data) ? data.filter((b: any) => b.is_active) : [];
      setBranches(branchList);
      
      // Inicializar estoques com 0 para cada filial
      const initialStocks: { [key: number]: number } = {};
      branchList.forEach(branch => {
        initialStocks[branch.id] = 0;
      });
      
      // Se não for master, definir estoque apenas para a filial do admin
      if (!isMaster && userBranchId) {
        setBranchStocks({ [userBranchId]: 0 });
      } else {
        setBranchStocks(initialStocks);
      }
    } catch (error) {
      console.error('Erro ao carregar filiais:', error);
    }
  };

  // Função para formatar valor monetário brasileiro
  const formatCurrency = (value: string) => {
    // Remove tudo que não é dígito
    const numericValue = value.replace(/\D/g, '');
    
    // Converte para número e divide por 100 para ter centavos
    const floatValue = parseFloat(numericValue) / 100;
    
    // Formata como moeda brasileira
    return floatValue.toLocaleString('pt-BR', {
      style: 'currency',
      currency: 'BRL'
    });
  };

  // Função para converter valor formatado de volta para número
  const parseCurrency = (value: string) => {
    return value.replace(/[^\d,]/g, '').replace(',', '.');
  };

  // Admin deve ver todos os produtos, inclusive inativos
  useEffect(() => {
    adminApi.getProducts().then((products) => {
      setAdminProducts(products);
    });
  }, []); // Executar apenas uma vez ao montar o componente
  const filteredProducts = adminProducts.filter((product: any) => {
    const matchesSearch = product.name.toLowerCase().includes(searchTerm.toLowerCase());
    const matchesCategory = selectedCategory === 'all' || product.category === selectedCategory;
    // Não filtra por status, sempre mostra todos
    return matchesSearch && matchesCategory;
  });

  const resetForm = () => {
    setFormData({
      name: '',
      description: '',
      price: '',
      promotionPrice: '',
      category: '',
      file: null,
      available: true,
      stock: '',
      expiryDate: '',
      isPromotion: false,
      isNew: false,
    });
    setEditingProduct(null);
    
    // Resetar estoques por filial
    const initialStocks: { [key: number]: number } = {};
    branches.forEach(branch => {
      initialStocks[branch.id] = 0;
    });
    if (!isMaster && userBranchId) {
      setBranchStocks({ [userBranchId]: 0 });
    } else {
      setBranchStocks(initialStocks);
    }
  };

  const handleEdit = (product: any) => {
    setEditingProduct(product);
    setFormData({
      name: product.name || '',
      description: product.description || '',
      price: product.price !== undefined && product.price !== null ? product.price.toString().replace('.', ',') : '',
      promotionPrice: (product.promotionPrice || product.promotion_price) !== undefined && (product.promotionPrice || product.promotion_price) !== null ? ((product.promotionPrice || product.promotion_price).toString().replace('.', ',')) : '',
      category: product.category || '',
      file: null,
      available: product.available || product.is_active || false,
      stock: (product.stock || product.quantity || 0).toString(),
      expiryDate: (product.expiryDate || product.expires_at) ? new Date(product.expiryDate || product.expires_at).toISOString().split('T')[0] : '',
      isPromotion: product.isPromotion || product.is_promo || false,
      isNew: product.isNew || product.is_new || false,
    });
    setIsDialogOpen(true);
  };

const handleSubmit = async (e: React.FormEvent) => {
  e.preventDefault();

  // Validações
  if (!formData.name.trim() || !formData.description.trim() || !formData.price.trim() || !formData.category.trim()) {
    toast.error('Todos os campos obrigatórios devem ser preenchidos');
    return;
  }

  // Validar que pelo menos uma filial tenha estoque > 0
  const totalStock = Object.values(branchStocks).reduce((sum, qty) => sum + qty, 0);
  if (totalStock === 0) {
    toast.error('Adicione quantidade em pelo menos uma filial');
    return;
  }

  const priceValue = parseFloat(formData.price.replace(/[^\d,]/g, '').replace(',', '.'));
  const promotionPriceValue = formData.promotionPrice ? parseFloat(formData.promotionPrice.replace(/[^\d,]/g, '').replace(',', '.')) : null;

  if (isNaN(priceValue) || priceValue <= 0) {
    toast.error('Preço inválido');
    return;
  }
  if (formData.isPromotion && (!promotionPriceValue || promotionPriceValue >= priceValue)) {
    toast.error('Preço promocional deve ser menor que o preço normal');
    return;
  }

  const productData: any = {
    name: formData.name.trim(),
    description: formData.description.trim(),
    price: priceValue,
    category: formData.category.trim(),
    quantity: totalStock, // Total para o produto
    is_promo: formData.isPromotion,
    is_new: formData.isNew,
    is_active: formData.available,
    branch_id: isMaster ? Object.keys(branchStocks)[0] : userBranchId, // Primeira filial ou filial do admin
  };

  if (promotionPriceValue) productData.promotion_price = promotionPriceValue;
  if (formData.expiryDate) productData.expires_at = formData.expiryDate;
  if (formData.file) productData.file = formData.file;

  try {
    if (editingProduct) {
      // Atualiza produto existente
      await adminApi.updateProduct(editingProduct.id, productData);
      toast.success('Produto atualizado com sucesso!');
    } else {
      // Cria novo produto
      const newProduct = await adminApi.createProduct(productData);
      // Criar estoques por filial
      const stocksToCreate = Object.entries(branchStocks)
        .filter(([_, qty]) => qty > 0)
        .map(([branchId, quantity]) => ({ branch_id: parseInt(branchId), quantity }));
      if (stocksToCreate.length > 0) {
        await adminApi.post(`/admin/products/${newProduct.id}/stocks/bulk`, {
          stocks: stocksToCreate
        });
      }
      toast.success('Produto criado com sucesso em todas as filiais!');
    }
    // Refaz o fetch da lista de produtos após criar/editar
    await refreshProducts();
    resetForm();
    setIsDialogOpen(false);
  } catch (error: any) {
    toast.error(`Erro ao salvar produto: ${error?.message || 'Desconhecido'}`);
  }
};


  const handleToggleAvailability = async (productId: string, currentStatus: boolean) => {
    try {
      const newStatus = !currentStatus;
      
      // Atualiza o estado local imediatamente para feedback instantâneo
      const updatedProducts = adminProducts.map(product => {
        if (product.id === productId) {
          return {
            ...product,
            is_active: newStatus,
            available: newStatus // Atualizar ambos os campos
          };
        }
        return product;
      });
      setAdminProducts(updatedProducts);

      // Tentar primeiro o endpoint específico de toggle
      let result;
      try {
        result = await adminApi.toggleProduct(productId);
      } catch (toggleError) {
        // Fallback para update manual
        result = await adminApi.updateProduct(productId, { is_active: newStatus });
      }
      
      // Atualizar com os dados retornados pelo backend
      if (result && result.product) {
        const finalProducts = adminProducts.map(product => {
          if (product.id === productId) {
            return {
              ...product,
              ...result.product,
              is_active: result.product.is_active,
              available: result.product.is_active
            };
          }
          return product;
        });
        setAdminProducts(finalProducts);
      }
      
      toast.success(`Produto ${newStatus ? 'ativado' : 'desativado'} com sucesso!`);
    } catch (error) {
      // Em caso de erro, reverte a alteração local
      const revertedProducts = adminProducts.map(product => {
        if (product.id === productId) {
          return {
            ...product,
            is_active: currentStatus,
            available: currentStatus
          };
        }
        return product;
      });
      setAdminProducts(revertedProducts);
      
      console.error('❌ Erro ao atualizar disponibilidade:', error);
      toast.error(`Erro ao ${!currentStatus ? 'ativar' : 'desativar'} produto: ${error instanceof Error ? error.message : 'Erro desconhecido'}`);
    }
  };

  const handleSyncStock = async () => {
    try {
      await adminApi.syncStock();
      await refreshProducts();
      toast.success('Estoque sincronizado com sucesso!');
    } catch (error) {
      console.error('Erro ao sincronizar estoque:', error);
      toast.error('Erro ao sincronizar estoque');
    }
  };

  const handleQuickStockUpdate = async (productId: string, newStock: number) => {
    try {
  // ...
      await adminApi.updateProductStock(productId, newStock);
      await refreshProducts();
      toast.success('Estoque atualizado com sucesso!');
    } catch (error) {
      console.error('❌ Erro ao atualizar estoque:', error);
      const errorMessage = error instanceof Error ? error.message : 'Erro desconhecido';
      toast.error(`Erro ao atualizar estoque: ${errorMessage}`);
    }
  };

  const formatPrice = (price: number) => {
    return new Intl.NumberFormat('pt-BR', {
      style: 'currency',
      currency: 'BRL'
    }).format(price);
  };

  const getStockBadge = (stock: number) => {
    if (stock === 0) {
      return <Badge variant="destructive">Sem Estoque</Badge>;
    } else if (stock <= 5) {
      return <Badge variant="outline" className="text-yellow-600 border-yellow-600">Estoque Baixo</Badge>;
    } else {
      return <Badge variant="outline" className="text-green-600 border-green-600">Em Estoque</Badge>;
    }
  };

  const lowStockCount = adminProducts.filter((p: any) => p.stock <= 5 && p.stock > 0).length;
  const outOfStockCount = adminProducts.filter((p: any) => p.stock === 0).length;

  return (
    <div className="space-y-6">
      {/* Header */}
      <div className="flex justify-between items-center">
        <div>
          <h1>Gerenciar Doces</h1>
          <p className="text-muted-foreground">Controle total do seu estoque de doces</p>
        </div>
        
        <div className="flex gap-2">
            {(isMaster || isAdmin) && (
              <Dialog open={isDialogOpen} onOpenChange={setIsDialogOpen}>
                <DialogTrigger asChild>
                  <Button onClick={resetForm}>
                    <Plus className="w-4 h-4 mr-2" />
                    Novo Doce
                  </Button>
                </DialogTrigger>
                <DialogContent className="max-w-4xl max-h-[90vh] overflow-y-auto">
                <DialogHeader>
                  <DialogTitle>
                    {editingProduct ? 'Editar Doce' : 'Novo Doce'}
                  </DialogTitle>
                </DialogHeader>
                <form onSubmit={async (e) => {
                  await handleSubmit(e);
                // Atualiza lista de produtos automaticamente após criar/editar
                await refreshProducts();
              }} className="space-y-6">
              {/* Basic Info */}
              <div className="grid grid-cols-1 md:grid-cols-2 gap-4">
                <div>
                  <Label htmlFor="name">Nome do Doce *</Label>
                  <Input
                    id="name"
                    value={formData.name}
                    onChange={(e) => setFormData(prev => ({ ...prev, name: e.target.value }))}
                    placeholder="Ex: Brigadeiro Gourmet"
                    required
                  />
                </div>
                <div>
                  <Label htmlFor="category">Categoria *</Label>
                  <Select 
                    value={formData.category} 
                    onValueChange={(value: string) => setFormData(prev => ({ ...prev, category: value }))}
                  >
                    <SelectTrigger>
                      <SelectValue placeholder="Selecione uma categoria" />
                    </SelectTrigger>
                    <SelectContent>
                      <SelectItem value="Brigadeiros">Brigadeiros</SelectItem>
                      <SelectItem value="Trufas">Trufas</SelectItem>
                      <SelectItem value="Beijinhos">Beijinhos</SelectItem>
                      <SelectItem value="Brownies">Brownies</SelectItem>
                      <SelectItem value="Cupcakes">Cupcakes</SelectItem>
                      <SelectItem value="Bolos">Bolos</SelectItem>
                      <SelectItem value="Docinhos">Docinhos</SelectItem>
                      <SelectItem value="Tortas">Tortas</SelectItem>
                    </SelectContent>
                  </Select>
                </div>
              </div>

              <div>
                <Label htmlFor="description">Descrição *</Label>
                <Textarea
                  id="description"
                  value={formData.description}
                  onChange={(e) => setFormData(prev => ({ ...prev, description: e.target.value }))}
                  placeholder="Descreva o doce, seus ingredientes principais e diferenciais"
                  rows={3}
                  required
                />
              </div>

              {/* Pricing */}
              <div className="grid grid-cols-1 md:grid-cols-2 gap-4">
                <div>
                  <Label htmlFor="price">Preço Normal *</Label>
                  <div className="relative">
                    <span className="absolute left-3 top-1/2 transform -translate-y-1/2 text-muted-foreground text-sm">
                      R$
                    </span>
                    <Input
                      id="price"
                      type="text"
                      value={formData.price}
                      onChange={(e) => {
                        // Remove tudo que não é dígito
                        let value = e.target.value.replace(/\D/g, '');
                        
                        // Adiciona zeros à esquerda se necessário
                        value = value.padStart(3, '0');
                        
                        // Adiciona vírgula para centavos
                        if (value.length > 2) {
                          value = value.slice(0, -2) + ',' + value.slice(-2);
                        }
                        
                        // Remove zeros à esquerda desnecessários
                        value = value.replace(/^0+(?=\d)/, '');
                        
                        setFormData(prev => ({ ...prev, price: value }));
                      }}
                      placeholder="0,00"
                      className="pl-10"
                      required
                    />
                  </div>
                </div>
                <div>
                  <Label htmlFor="promotionPrice">Preço Promocional</Label>
                  <div className="relative">
                    <span className="absolute left-3 top-1/2 transform -translate-y-1/2 text-muted-foreground text-sm">
                      R$
                    </span>
                    <Input
                      id="promotionPrice"
                      type="text"
                      value={formData.promotionPrice}
                      onChange={(e) => {
                        if (!formData.isPromotion) return;
                        
                        // Remove tudo que não é dígito
                        let value = e.target.value.replace(/\D/g, '');
                        
                        // Adiciona zeros à esquerda se necessário
                        value = value.padStart(3, '0');
                        
                        // Adiciona vírgula para centavos
                        if (value.length > 2) {
                          value = value.slice(0, -2) + ',' + value.slice(-2);
                        }
                        
                        // Remove zeros à esquerda desnecessários
                        value = value.replace(/^0+(?=\d)/, '');
                        
                        setFormData(prev => ({ ...prev, promotionPrice: value }));
                      }}
                      placeholder="0,00"
                      className="pl-10"
                      disabled={!formData.isPromotion}
                    />
                  </div>
                </div>
              </div>

              {/* Estoques por Filial */}
              <div>
                <Label className="text-base font-semibold mb-3 block">
                  Estoque por Filial *
                </Label>
                <div className="border rounded-lg p-4 bg-gray-50 space-y-3">
                  {isMaster ? (
                    // Master vê todas as filiais
                    branches.length > 0 ? (
                      <div className="grid grid-cols-1 md:grid-cols-2 gap-3">
                        {branches.map(branch => (
                          <div key={branch.id} className="flex items-center gap-3 bg-white p-3 rounded-md border">
                            <div className="flex-1">
                              <p className="font-medium text-sm">{branch.name}</p>
                              <p className="text-xs text-muted-foreground">{branch.code}</p>
                            </div>
                            <Input
                              type="number"
                              min="0"
                              value={branchStocks[branch.id] || 0}
                              onChange={(e) => setBranchStocks(prev => ({
                                ...prev,
                                [branch.id]: parseInt(e.target.value) || 0
                              }))}
                              className="w-24 text-center"
                              placeholder="0"
                            />
                          </div>
                        ))}
                      </div>
                    ) : (
                      <p className="text-sm text-muted-foreground text-center py-4">
                        Carregando filiais...
                      </p>
                    )
                  ) : (
                    // Admin vê apenas sua filial
                    userBranchId && (
                      <div className="flex items-center gap-3 bg-white p-3 rounded-md border">
                        <div className="flex-1">
                          <p className="font-medium">Sua Filial</p>
                          <p className="text-xs text-muted-foreground">
                            {branches.find(b => b.id === userBranchId)?.name || 'Filial Principal'}
                          </p>
                        </div>
                        <Input
                          type="number"
                          min="0"
                          value={branchStocks[userBranchId] || 0}
                          onChange={(e) => setBranchStocks({
                            [userBranchId]: parseInt(e.target.value) || 0
                          })}
                          className="w-24 text-center"
                          placeholder="0"
                        />
                      </div>
                    )
                  )}
                  <div className="flex items-center justify-between pt-2 border-t">
                    <span className="text-sm font-medium">Total Geral:</span>
                    <span className="text-lg font-bold text-primary">
                      {Object.values(branchStocks).reduce((sum, qty) => sum + qty, 0)} unidades
                    </span>
                  </div>
                </div>
              </div>

              {/* Data de Validade */}
              <div>
                <Label htmlFor="expiryDate">Data de Validade</Label>
                <Input
                  id="expiryDate"
                  type="date"
                  value={formData.expiryDate}
                  onChange={(e) => setFormData(prev => ({ ...prev, expiryDate: e.target.value }))}
                />
              </div>

              {/* Image Upload */}
              <div>
                <Label htmlFor="image">Imagem do Produto</Label>
                <Input
                  id="image"
                  type="file"
                  accept="image/*"
                  onChange={(e) => {
                    const file = e.target.files?.[0];
                    setFormData(prev => ({ ...prev, file: file || null }));
                  }}
                  className="cursor-pointer"
                />
                <p className="text-sm text-gray-500 mt-1">
                  Formatos aceitos: JPG, PNG, GIF (máximo 5MB)
                </p>
              </div>

              {/* Flags */}
              <div className="grid grid-cols-1 md:grid-cols-3 gap-4">
                <div className="flex items-center space-x-2">
                  <Checkbox
                    id="available"
                    checked={formData.available}
                    onCheckedChange={(checked: boolean) => setFormData(prev => ({ ...prev, available: !!checked }))}
                  />
                  <Label htmlFor="available">Produto Disponível</Label>
                </div>
                <div className="flex items-center space-x-2">
                  <Checkbox
                    id="isPromotion"
                    checked={formData.isPromotion}
                    onCheckedChange={(checked: boolean) => setFormData(prev => ({ 
                      ...prev, 
                      isPromotion: !!checked,
                      promotionPrice: !checked ? '' : prev.promotionPrice
                    }))}
                  />
                  <Label htmlFor="isPromotion">Em Promoção</Label>
                </div>
                <div className="flex items-center space-x-2">
                  <Checkbox
                    id="isNew"
                    checked={formData.isNew}
                    onCheckedChange={(checked: boolean) => setFormData(prev => ({ ...prev, isNew: !!checked }))}
                  />
                  <Label htmlFor="isNew">Novidade</Label>
                </div>
              </div>

              <div className="flex gap-2 pt-4">
                <Button type="submit" className="flex-1">
                  {editingProduct ? 'Atualizar' : 'Adicionar'} Doce
                </Button>
                <Button 
                  type="button" 
                  variant="outline" 
                  onClick={() => setIsDialogOpen(false)}
                >
                  Cancelar
                </Button>
              </div>
            </form>
          </DialogContent>
        </Dialog>
      )}
      </div>
      </div>

      {/* Stock Alerts */}
      {(lowStockCount > 0 || outOfStockCount > 0) && (
        <Card className="border-yellow-200 bg-yellow-50">
          <CardContent className="p-4">
            <div className="flex items-center gap-2 text-yellow-800">
              <AlertTriangle className="h-5 w-5" />
              <span className="font-medium">Alertas de Estoque</span>
            </div>
            <div className="mt-2 text-sm text-yellow-700">
              {outOfStockCount > 0 && (
                <p>{outOfStockCount} produtos sem estoque</p>
              )}
              {lowStockCount > 0 && (
                <p>{lowStockCount} produtos com estoque baixo (≤5 unidades)</p>
              )}
            </div>
          </CardContent>
        </Card>
      )}

      {/* Filters */}
      <Card>
        <CardContent className="p-4">
          <div className="flex flex-col sm:flex-row gap-4">
            <div className="relative flex-1">
              <Search className="absolute left-3 top-1/2 transform -translate-y-1/2 text-muted-foreground w-4 h-4" />
              <Input
                placeholder="Buscar doces..."
                value={searchTerm}
                onChange={(e) => setSearchTerm(e.target.value)}
                className="pl-10"
              />
            </div>
            <div className="sm:w-48">
              <Select value={selectedCategory} onValueChange={setSelectedCategory}>
                <SelectTrigger>
                  <SelectValue placeholder="Categoria" />
                </SelectTrigger>
                <SelectContent>
                  <SelectItem value="all">Todas</SelectItem>
                  {categories.map(category => (
                    <SelectItem key={category} value={category}>
                      {category}
                    </SelectItem>
                  ))}
                </SelectContent>
              </Select>
            </div>
          </div>
        </CardContent>
      </Card>

      {/* Products Table */}
      <Card>
        <CardHeader>
          <CardTitle>Doces ({filteredProducts.length})</CardTitle>
        </CardHeader>
        <CardContent>
          <Table>
            <TableHeader>
              <TableRow>
                <TableHead>Produto</TableHead>
                <TableHead>Categoria</TableHead>
                <TableHead>Preço</TableHead>
                <TableHead>Estoque Total</TableHead>
                <TableHead>Status</TableHead>
                <TableHead>Validade</TableHead>
                <TableHead className="text-right">Ações</TableHead>
              </TableRow>
            </TableHeader>
            <TableBody>
              {filteredProducts.map((product: any) => (
                <TableRow key={product.id}>
                  <TableCell>
                    <div className="flex items-center gap-3">
                      <div className="w-12 h-12 rounded-md overflow-hidden">
                        <ImageWithFallback
                          src={product.image_url || getProductImageUrl(product.image)}
                          alt={product.name}
                          className="w-full h-full object-cover"
                        />
                      </div>
                      <div>
                        <div className="flex items-center gap-2">
                          <p className="font-medium">{product.name}</p>
                          {(product.isNew || product.is_new) && (
                            <Badge variant="secondary" className="text-xs">
                              <Star className="h-3 w-3 mr-1" />
                              Novo
                            </Badge>
                          )}
                          {(product.isPromotion || product.is_promo) && (
                            <Badge variant="destructive" className="text-xs">
                              <Percent className="h-3 w-3 mr-1" />
                              Promoção
                            </Badge>
                          )}
                        </div>
                        <p className="text-sm text-muted-foreground max-w-xs truncate">
                          {product.description}
                        </p>
                      </div>
                    </div>
                  </TableCell>
                  <TableCell>
                    <Badge variant="outline">{product.category}</Badge>
                  </TableCell>
                  <TableCell>
                    <div>
                      {(product.isPromotion || product.is_promo) && (product.promotionPrice || product.promotion_price) ? (
                        <div>
                          <div className="font-semibold text-green-600">
                            {formatPrice((product.promotionPrice || product.promotion_price) ?? 0)}
                          </div>
                          <div className="text-sm text-muted-foreground line-through">
                            {formatPrice(product.price)}
                          </div>
                        </div>
                      ) : (
                        <div className="font-semibold">
                          {formatPrice(product.price)}
                        </div>
                      )}
                    </div>
                  </TableCell>
                  <TableCell>
                    <div className="flex items-center gap-2">
                      <Package className="h-4 w-4 text-muted-foreground" />
                      <div className="flex flex-col">
                        <span className="font-medium">
                          {product.stocks?.reduce((sum: number, stock: any) => sum + stock.quantity, 0) || product.stock || product.quantity || 0}
                        </span>
                        {product.stocks && product.stocks.length > 0 && (
                          <span className="text-xs text-muted-foreground">
                            {product.stocks.length} {product.stocks.length === 1 ? 'filial' : 'filiais'}
                          </span>
                        )}
                      </div>
                      {(isMaster || isAdmin) && (
                        <Button
                          variant="outline"
                          size="sm"
                          onClick={() => {
                            setSelectedProductForStock({ id: product.id, name: product.name });
                            setStockModalOpen(true);
                          }}
                          className="h-6 text-xs"
                        >
                          Gerenciar
                        </Button>
                      )}
                    </div>
                  </TableCell>
                  <TableCell>
                    <div className="flex items-center gap-2">
                      <Checkbox
                        checked={isProductActive(product)}
                        onCheckedChange={() => handleToggleAvailability(product.id, isProductActive(product))}
                        aria-label={`${isProductActive(product) ? 'Desativar' : 'Ativar'} produto`}
                      />
                      <Badge 
                        variant={isProductActive(product) ? 'default' : 'secondary'}
                        className={isProductActive(product) ? 'bg-green-100 text-green-800 hover:bg-green-200' : 'bg-red-100 text-red-800 hover:bg-red-200'}
                      >
                        {isProductActive(product) ? 'Ativo' : 'Inativo'}
                      </Badge>
                      <span className="text-xs text-muted-foreground">
                        (Clique para {isProductActive(product) ? 'desativar' : 'ativar'})
                      </span>
                    </div>
                  </TableCell>
                  <TableCell>
                    {(product.expiryDate || product.expires_at) ? (
                      <div className="flex items-center gap-1 text-sm">
                        <Calendar className="h-3 w-3" />
                        {new Date(product.expiryDate || product.expires_at || '').toLocaleDateString('pt-BR')}
                      </div>
                    ) : (
                      <span className="text-muted-foreground text-sm">-</span>
                    )}
                  </TableCell>
                  <TableCell className="text-right">
                    <div className="flex justify-end gap-2">
                      {(isMaster || isAdmin) && (
                        <Button
                          variant="ghost"
                          size="sm"
                          onClick={() => handleEdit(product)}
                          title="Editar produto"
                        >
                          <Edit className="w-4 h-4" />
                        </Button>
                      )}
                    </div>
                  </TableCell>
                </TableRow>
              ))}
            </TableBody>
          </Table>
        </CardContent>
      </Card>

      {/* Modal de Gestão de Estoques */}
      {selectedProductForStock && (
        <ProductStockModal
          key={`stock-modal-${selectedProductForStock.id}-${refreshKey}`}
          open={stockModalOpen}
          onClose={async () => {
            setStockModalOpen(false);
            setSelectedProductForStock(null);
            await refreshProducts(); // Atualizar lista após fechar modal
            setRefreshKey(prev => prev + 1); // Forçar re-renderização
          }}
          productId={selectedProductForStock.id}
          productName={selectedProductForStock.name}
          userRole={currentAdmin?.role || 'employee'}
          userBranchId={userBranchId}
        />
      )}
    </div>
  );
}