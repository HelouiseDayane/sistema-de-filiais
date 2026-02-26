import { useState } from 'react';
import { useNavigate, useParams } from 'react-router-dom';
import { Button } from '../ui/button';
import { Input } from '../ui/input';
import { Label } from '../ui/label';
import { Textarea } from '../ui/textarea';
import { Select, SelectContent, SelectItem, SelectTrigger, SelectValue } from '../ui/select';
import { Switch } from '../ui/switch';
import { Card, CardContent, CardDescription, CardHeader, CardTitle } from '../ui/card';
import { ArrowLeft, Upload, X } from 'lucide-react';
import { toast } from 'sonner';

const categories = [
  { value: 'bolos', label: 'Bolos' },
  { value: 'cupcakes', label: 'Cupcakes' },
  { value: 'trufas', label: 'Trufas & Brigadeiros' },
  { value: 'tortas', label: 'Tortas' }
];

export function ProductFormPage() {
  const navigate = useNavigate();
  const { id } = useParams();
  const isEdit = Boolean(id);

  const [formData, setFormData] = useState({
    name: '',
    description: '',
    price: '',
    originalPrice: '',
    category: '',
    image: '',
    inStock: true,
    isNew: false,
    isPromotion: false,
    ingredients: '',
    preparationTime: '',
    allergens: ''
  });

  const [imagePreview, setImagePreview] = useState<string | null>(null);
  const [isLoading, setIsLoading] = useState(false);

  const handleInputChange = (field: string) => (
    e: React.ChangeEvent<HTMLInputElement | HTMLTextAreaElement>
  ) => {
    const value = e.target.type === 'checkbox' ? (e.target as HTMLInputElement).checked : e.target.value;
    setFormData(prev => ({ ...prev, [field]: value }));
  };

  const handleSwitchChange = (field: string) => (checked: boolean) => {
    setFormData(prev => ({ ...prev, [field]: checked }));
  };

  const handleImageUpload = (e: React.ChangeEvent<HTMLInputElement>) => {
    const file = e.target.files?.[0];
    if (file) {
      const reader = new FileReader();
      reader.onload = (e) => {
        const result = e.target?.result as string;
        setImagePreview(result);
        setFormData(prev => ({ ...prev, image: result }));
      };
      reader.readAsDataURL(file);
    }
  };

  const removeImage = () => {
    setImagePreview(null);
    setFormData(prev => ({ ...prev, image: '' }));
  };

  const handleSubmit = async (e: React.FormEvent) => {
    e.preventDefault();
    setIsLoading(true);

    // Simulate API call
    await new Promise(resolve => setTimeout(resolve, 1500));

    if (formData.name && formData.description && formData.price && formData.category) {
      toast.success(
        isEdit 
          ? 'Produto atualizado com sucesso!' 
          : 'Produto criado com sucesso!'
      );
      navigate('/products');
    } else {
      toast.error('Por favor, preencha todos os campos obrigatórios.');
    }
    
    setIsLoading(false);
  };

  return (
    <div className="space-y-6">
      {/* Header */}
      <div className="flex items-center gap-4">
        <Button
          variant="ghost"
          size="sm"
          onClick={() => navigate('/products')}
        >
          <ArrowLeft className="h-4 w-4 mr-2" />
          Voltar
        </Button>
        <div>
          <h1 className="text-2xl">
            {isEdit ? 'Editar Produto' : 'Novo Produto'}
          </h1>
          <p className="text-muted-foreground">
            {isEdit ? 'Atualize as informações do produto' : 'Adicione um novo doce ao cardápio'}
          </p>
        </div>
      </div>

      <form onSubmit={handleSubmit} className="space-y-6">
        <div className="grid grid-cols-1 lg:grid-cols-2 gap-6">
          {/* Basic Information */}
          <Card>
            <CardHeader>
              <CardTitle>Informações Básicas</CardTitle>
              <CardDescription>
                Dados essenciais do produto
              </CardDescription>
            </CardHeader>
            <CardContent className="space-y-4">
              <div className="space-y-2">
                <Label htmlFor="name">Nome do Produto *</Label>
                <Input
                  id="name"
                  type="text"
                  placeholder="Ex: Brigadeiro Premium"
                  value={formData.name}
                  onChange={handleInputChange('name')}
                  required
                />
              </div>

              <div className="space-y-2">
                <Label htmlFor="description">Descrição *</Label>
                <Textarea
                  id="description"
                  placeholder="Descreva o produto, ingredientes especiais, sabor..."
                  value={formData.description}
                  onChange={handleInputChange('description')}
                  rows={3}
                  required
                />
              </div>

              <div className="space-y-2">
                <Label htmlFor="category">Categoria *</Label>
                <Select value={formData.category} onValueChange={(value: string) => 
                  setFormData(prev => ({ ...prev, category: value }))
                }>
                  <SelectTrigger>
                    <SelectValue placeholder="Selecione uma categoria" />
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

              <div className="grid grid-cols-2 gap-4">
                <div className="space-y-2">
                  <Label htmlFor="price">Preço *</Label>
                  <Input
                    id="price"
                    type="number"
                    step="0.01"
                    placeholder="0.00"
                    value={formData.price}
                    onChange={handleInputChange('price')}
                    required
                  />
                </div>

                <div className="space-y-2">
                  <Label htmlFor="originalPrice">Preço Original</Label>
                  <Input
                    id="originalPrice"
                    type="number"
                    step="0.01"
                    placeholder="0.00"
                    value={formData.originalPrice}
                    onChange={handleInputChange('originalPrice')}
                  />
                </div>
              </div>

              <div className="space-y-2">
                <Label htmlFor="preparationTime">Tempo de Preparo</Label>
                <Input
                  id="preparationTime"
                  type="text"
                  placeholder="Ex: 2 horas, 1 dia"
                  value={formData.preparationTime}
                  onChange={handleInputChange('preparationTime')}
                />
              </div>
            </CardContent>
          </Card>

          {/* Image and Settings */}
          <Card>
            <CardHeader>
              <CardTitle>Imagem e Configurações</CardTitle>
              <CardDescription>
                Foto do produto e configurações especiais
              </CardDescription>
            </CardHeader>
            <CardContent className="space-y-4">
              {/* Image Upload */}
              <div className="space-y-2">
                <Label>Imagem do Produto</Label>
                {imagePreview ? (
                  <div className="relative">
                    <img
                      src={imagePreview}
                      alt="Preview"
                      className="w-full h-48 object-cover rounded-lg"
                    />
                    <Button
                      type="button"
                      variant="ghost"
                      size="sm"
                      onClick={removeImage}
                      className="absolute top-2 right-2 h-8 w-8 p-0 bg-black/50 text-white hover:bg-black/70"
                    >
                      <X className="h-4 w-4" />
                    </Button>
                  </div>
                ) : (
                  <div className="border-2 border-dashed border-gray-300 rounded-lg p-6 text-center">
                    <Upload className="h-8 w-8 mx-auto mb-2 text-gray-400" />
                    <p className="text-sm text-gray-500 mb-2">
                      Clique para fazer upload da imagem
                    </p>
                    <Input
                      type="file"
                      accept="image/*"
                      onChange={handleImageUpload}
                      className="hidden"
                      id="image-upload"
                    />
                    <Label htmlFor="image-upload" className="cursor-pointer">
                      <Button type="button" variant="outline" size="sm">
                        Selecionar Arquivo
                      </Button>
                    </Label>
                  </div>
                )}
              </div>

              {/* Status Switches */}
              <div className="space-y-4">
                <div className="flex items-center justify-between">
                  <div>
                    <Label htmlFor="inStock">Em Estoque</Label>
                    <p className="text-sm text-muted-foreground">
                      Produto disponível para venda
                    </p>
                  </div>
                  <Switch
                    id="inStock"
                    checked={formData.inStock}
                    onCheckedChange={handleSwitchChange('inStock')}
                  />
                </div>

                <div className="flex items-center justify-between">
                  <div>
                    <Label htmlFor="isNew">Produto Novo</Label>
                    <p className="text-sm text-muted-foreground">
                      Marcar como novidade
                    </p>
                  </div>
                  <Switch
                    id="isNew"
                    checked={formData.isNew}
                    onCheckedChange={handleSwitchChange('isNew')}
                  />
                </div>

                <div className="flex items-center justify-between">
                  <div>
                    <Label htmlFor="isPromotion">Em Promoção</Label>
                    <p className="text-sm text-muted-foreground">
                      Produto com desconto
                    </p>
                  </div>
                  <Switch
                    id="isPromotion"
                    checked={formData.isPromotion}
                    onCheckedChange={handleSwitchChange('isPromotion')}
                  />
                </div>
              </div>
            </CardContent>
          </Card>
        </div>

        {/* Additional Information */}
        <Card>
          <CardHeader>
            <CardTitle>Informações Adicionais</CardTitle>
            <CardDescription>
              Detalhes extras sobre o produto
            </CardDescription>
          </CardHeader>
          <CardContent className="space-y-4">
            <div className="space-y-2">
              <Label htmlFor="ingredients">Ingredientes</Label>
              <Textarea
                id="ingredients"
                placeholder="Liste os principais ingredientes..."
                value={formData.ingredients}
                onChange={handleInputChange('ingredients')}
                rows={2}
              />
            </div>

            <div className="space-y-2">
              <Label htmlFor="allergens">Alérgenos</Label>
              <Input
                id="allergens"
                type="text"
                placeholder="Ex: Leite, Glúten, Ovos, Amendoim"
                value={formData.allergens}
                onChange={handleInputChange('allergens')}
              />
            </div>
          </CardContent>
        </Card>

        {/* Actions */}
        <div className="flex items-center justify-end gap-4">
          <Button
            type="button"
            variant="outline"
            onClick={() => navigate('/products')}
          >
            Cancelar
          </Button>
          <Button
            type="submit"
            disabled={isLoading}
            className="bg-orange-500 hover:bg-orange-600"
          >
            {isLoading 
              ? (isEdit ? 'Atualizando...' : 'Criando...') 
              : (isEdit ? 'Atualizar Produto' : 'Criar Produto')
            }
          </Button>
        </div>
      </form>
    </div>
  );
}