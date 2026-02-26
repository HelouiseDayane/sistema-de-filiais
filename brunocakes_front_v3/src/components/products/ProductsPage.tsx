import { useState } from 'react';
import { useNavigate } from 'react-router-dom';
import { useApp } from '../../App';
import { getProductImageUrl } from '../../api';
import { useStoreConfigState } from '../../hooks/useStoreConfigState';
import { Button } from '../ui/button';
import { Card, CardContent } from '../ui/card';
import { Badge } from '../ui/badge';
import { Input } from '../ui/input';
import { Select, SelectContent, SelectItem, SelectTrigger, SelectValue } from '../ui/select';
import { ImageWithFallback } from '../figma/ImageWithFallback';
import { 
  Plus, 
  Search, 
  Star, 
  ShoppingCart, 
  Edit3, 
  Trash2,
  Filter,
  Heart
} from 'lucide-react';
import { toast } from 'sonner';

const categories = [
  { value: 'all', label: 'Todos os Produtos' },
  { value: 'bolos', label: 'Bolos' },
  { value: 'cupcakes', label: 'Cupcakes' },
  { value: 'trufas', label: 'Trufas & Brigadeiros' },
  { value: 'tortas', label: 'Tortas' }
];

export function ProductsPage() {
  const { products, publicProducts, adminProducts, addToCart, admin } = useApp();
  const navigate = useNavigate();
  const [searchTerm, setSearchTerm] = useState('');
  const [selectedCategory, setSelectedCategory] = useState('all');
  const [favorites, setFavorites] = useState<string[]>(['1', '3']);

  // Hook para acessar configurações de tema dinâmico sem novas requisições
  const storeConfigState = useStoreConfigState();
  const storeSettings = storeConfigState?.storeSettings;

  const isAdmin = admin !== null;
  
  // Usar apenas publicProducts para usuário público, evitando duplicação
  const productsList = isAdmin ? products : publicProducts;

  // Remover duplicatas baseado no nome + categoria (mais seguro que apenas nome)
  const uniqueProducts = productsList.filter((product, index, self) => 
    index === self.findIndex(p => p.name === product.name && p.category === product.category)
  );

  const filteredProducts = uniqueProducts.filter(product => {
    const matchesSearch = product.name.toLowerCase().includes(searchTerm.toLowerCase()) ||
                         product.description.toLowerCase().includes(searchTerm.toLowerCase());
    const matchesCategory = selectedCategory === 'all' || product.category === selectedCategory;
    return matchesSearch && matchesCategory;
  });

  const handleAddToCart = (product: any) => {
    addToCart(product, 1);
    //toast.success(`${product.name} adicionado ao carrinho!`);
  };

  const toggleFavorite = (productId: string) => {
    setFavorites(prev => 
      prev.includes(productId) 
        ? prev.filter(id => id !== productId)
        : [...prev, productId]
    );
    toast.success('Favoritos atualizados!');
  };

  return (
    <div className="space-y-6">
      {/* Header */}
      <div className="flex flex-col sm:flex-row justify-between items-start sm:items-center gap-4">
        <div>
          <h1 className="text-2xl">
            {isAdmin ? 'Gerenciar Produtos' : 'Nossos Doces'}
          </h1>
          <p className="text-muted-foreground">
            {isAdmin 
              ? 'Adicione, edite e gerencie seus produtos' 
              : 'Descubra sabores únicos feitos com carinho'
            }
          </p>
        </div>
        
        {isAdmin && (
          <Button 
            onClick={() => navigate('/products/new')}
            className="bg-orange-500 hover:bg-orange-600 force-orange-bg force-white-text"
          >
            <Plus className="h-4 w-4 mr-2" />
            Novo Produto
          </Button>
        )}
      </div>

      {/* Filters */}
      <div className="flex flex-col sm:flex-row gap-4">
        <div className="relative flex-1">
          <Search className="absolute left-3 top-1/2 transform -translate-y-1/2 text-muted-foreground h-4 w-4" />
          <Input
            placeholder="Buscar produtos..."
            value={searchTerm}
            onChange={(e) => setSearchTerm(e.target.value)}
            className="pl-10"
          />
        </div>
        
        <Select value={selectedCategory} onValueChange={setSelectedCategory}>
          <SelectTrigger className="w-full sm:w-[200px]">
            <Filter className="h-4 w-4 mr-2" />
            <SelectValue />
          </SelectTrigger>
          <SelectContent>
            {categories.map(category => (
              <SelectItem key={category.value} value={category.value}>
                {category.label}
              </SelectItem>
            ))}
          </SelectContent>
        </Select>
      </div>

      {/* Products Grid */}
      <div className="grid grid-cols-1 sm:grid-cols-2 lg:grid-cols-3 xl:grid-cols-4 gap-6">
        {filteredProducts.map(product => {
          // Usar apenas o campo available_stock para exibir e validar estoque
          let estoque = 0;
          if (product.available_stock !== undefined && product.available_stock !== null) {
            estoque = typeof product.available_stock === 'string' ? parseInt(product.available_stock, 10) : Number(product.available_stock);
          }
          const isAvailable = estoque > 0;
          return (
            <Card key={product.id} className="group hover:shadow-lg transition-shadow">
              <div className="relative flex justify-center items-center bg-white" style={{height: '140px'}}>
                <ImageWithFallback
                  src={product.imageUrl || getProductImageUrl(product.image)}
                  alt={product.name}
                  className="max-h-32 max-w-[80%] object-contain mx-auto block"
                  style={{margin: 'auto', display: 'block'}}
                />
                {/* Badges */}
              <div className="absolute top-2 left-2 flex flex-col gap-1">
                {(product.isNew || product.is_new) && (
                  <Badge 
                    variant="outline" 
                    className="product-badge-novo force-green-bg !bg-green-500 !text-white !border-green-500"
                    data-badge="novo"
                    style={{ 
                      backgroundColor: '#22c55e !important', 
                      color: 'white !important', 
                      borderColor: '#22c55e !important',
                      border: '1px solid #22c55e !important'
                    }}
                  >
                    Novo
                  </Badge>
                )}
                {(product.isPromotion || product.is_promo) && (
                  <Badge 
                    variant="outline" 
                    className="product-badge-promocao force-red-bg !bg-red-500 !text-white !border-red-500"
                    data-badge="promocao"
                    style={{ 
                      backgroundColor: '#ef4444 !important', 
                      color: 'white !important', 
                      borderColor: '#ef4444 !important',
                      border: '1px solid #ef4444 !important'
                    }}
                  >
                    Promoção
                  </Badge>
                )}
                {isAvailable ? (
                  <Badge className="bg-yellow-400 text-black">Estoque: {estoque}</Badge>
                ) : (
                  <Badge variant="secondary">Esgotado</Badge>
                )}
              </div>


              {/* Favorite Button (Client only) */}
              {!isAdmin && (
                <Button
                  variant="ghost"
                  size="sm"
                  className="absolute top-2 right-2 h-8 w-8 p-0 bg-white/80 hover:bg-white"
                  onClick={() => toggleFavorite(product.id)}
                >
                  <Heart 
                    className={`h-4 w-4 ${
                      favorites.includes(product.id) 
                        ? 'text-red-500 fill-current' 
                        : 'text-gray-500'
                    }`} 
                  />
                </Button>
              )}

              {/* Admin Actions */}
              {isAdmin && (
                <div className="absolute top-2 right-2 flex gap-1 opacity-0 group-hover:opacity-100 transition-opacity">
                  <Button
                    variant="ghost"
                    size="sm"
                    className="h-8 w-8 p-0 bg-white/80 hover:bg-white"
                    onClick={() => navigate(`/products/${product.id}/edit`)}
                  >
                    <Edit3 className="h-4 w-4" />
                  </Button>
                  <Button
                    variant="ghost"
                    size="sm"
                    className="h-8 w-8 p-0 bg-white/80 hover:bg-white text-red-600"
                  >
                    <Trash2 className="h-4 w-4" />
                  </Button>
                </div>
              )}
            </div>

            <CardContent className="p-4">
              <div className="space-y-2">
                <div className="flex items-start justify-between">
                  <h3 className="text-lg line-clamp-1">{product.name}</h3>
                  {/* Rating temporariamente removido - não temos esses dados */}
                </div>
                
                <p className="text-sm text-muted-foreground line-clamp-2">
                  {product.description}
                </p>
                
                <div className="flex items-center justify-between pt-2">
                  <div className="flex items-center gap-2">
                    <span className="text-lg text-orange-600">
                      R$ {product.price.toFixed(2)}
                    </span>
                    {(product.isPromotion || product.is_promo) && (product.promotionPrice || product.promotion_price) && (
                      <span className="text-sm text-muted-foreground line-through">
                        R$ {Number(product.promotionPrice || product.promotion_price || 0).toFixed(2)}
                      </span>
                    )}
                  </div>
                  
                  {!isAdmin && (
                    <Button
                        size="sm"
                        onClick={() => handleAddToCart(product)}
                        disabled={!isAvailable}
                        className="bg-orange-500 hover:bg-orange-600 force-orange-bg force-white-text !text-white"
                        style={{ backgroundColor: '#f97316', color: 'white' }}
                      >
                        <ShoppingCart className="h-4 w-4 mr-1" style={{ color: 'white' }} />
                        <span style={{ color: 'white' }}>Adicionar</span>
                      </Button>
                  )}
                </div>
              </div>
            </CardContent>
          </Card>
  );
  })}
      </div>

      {/* Empty State */}
      {filteredProducts.length === 0 && (
        <div className="text-center py-12">
          <div className="w-16 h-16 bg-gray-100 rounded-full flex items-center justify-center mx-auto mb-4">
            <Search className="h-8 w-8 text-gray-400" />
          </div>
          <h3 className="text-lg mb-2">Nenhum produto encontrado</h3>
          <p className="text-muted-foreground">
            Tente ajustar os filtros ou termos de busca
          </p>
        </div>
      )}
    </div>
  );
}