import React, { useState, useEffect } from 'react';
import { useParams, useNavigate } from 'react-router-dom';
import { supabase } from '../integrations/supabase/client';
import { Button } from '../components/ui/button';
import { Input } from '../components/ui/input';
import { Label } from '../components/ui/label';
import { Textarea } from '../components/ui/textarea';
import { Card, CardContent, CardHeader, CardTitle } from '../components/ui/card';
import { Select, SelectContent, SelectItem, SelectTrigger, SelectValue } from '../components/ui/select';
import { Switch } from '../components/ui/switch';
import { useToast } from '../hooks/use-toast';
import { ProductOptionsManager } from '../components/ProductOptionsManager';
import { ArrowLeft, Save, Upload } from 'lucide-react';
import { useAuth } from '../contexts/AuthContext';
import { useUserLevel } from '../hooks/useUserLevel';

interface Product {
  id?: string;
  name: string;
  description: string;
  price: number;
  category: string;
  image_url: string;
  available: boolean;
  display_order: number;
}

const categories = [
  'Pizza',
  'Hambúrguer',
  'Bebida',
  'Sobremesa',
  'Acompanhamento',
  'Prato Principal',
  'Salgado',
  'Doce',
  'Combo',
  'Outro'
];

export const AdminProductForm: React.FC = () => {
  const { id } = useParams<{ id: string }>();
  const navigate = useNavigate();
  const { toast } = useToast();
  const { user, loading: authLoading } = useAuth();
  const { isLevel3, isLevel1or2 } = useUserLevel();
  const [product, setProduct] = useState<Product>({
    name: '',
    description: '',
    price: 0,
    category: 'Outro',
    image_url: '',
    available: true,
    display_order: 0
  });
  const [loading, setLoading] = useState(false);
  const [saving, setSaving] = useState(false);
  const [uploadingImage, setUploadingImage] = useState(false);
  const [activeTab, setActiveTab] = useState<'basic' | 'options'>('basic');

  // Verificar nível de acesso
  useEffect(() => {
    if (!authLoading && !isLevel3) {
      toast({
        title: 'Acesso Negado',
        description: 'Este formulário avançado está disponível apenas para usuários nível 3.',
        variant: 'destructive'
      });
      navigate('/admin/products');
    }
  }, [authLoading, isLevel3, navigate, toast]);

  // Mostrar loading enquanto verifica autenticação
  if (authLoading || !user) {
    return (
      <div className="min-h-screen bg-gray-50 flex items-center justify-center">
        <div className="text-center">
          <div className="animate-spin rounded-full h-12 w-12 border-b-2 border-orange-500 mx-auto"></div>
          <p className="mt-4 text-gray-600">Verificando permissões...</p>
        </div>
      </div>
    );
  }

  // Se não for nível 3, não renderizar o formulário
  if (!isLevel3) {
    return null;
  }

  // Carregar produto existente
  useEffect(() => {
    if (id && id !== 'new') {
      loadProduct();
    }
  }, [id]);

  const loadProduct = async () => {
    setLoading(true);
    try {
      const { data, error } = await supabase
        .from('products')
        .select('*')
        .eq('id', id)
        .single();

      if (error) throw error;
      setProduct(data);
    } catch (error) {
      console.error('Erro ao carregar produto:', error);
      toast({
        title: 'Erro',
        description: 'Não foi possível carregar o produto.',
        variant: 'destructive'
      });
      navigate('/admin/products');
    } finally {
      setLoading(false);
    }
  };

  const handleInputChange = (field: keyof Product, value: any) => {
    setProduct(prev => ({ ...prev, [field]: value }));
  };

  const handleImageUpload = async (event: React.ChangeEvent<HTMLInputElement>) => {
    const file = event.target.files?.[0];
    if (!file) return;

    setUploadingImage(true);
    try {
      const fileName = `${Date.now()}-${file.name}`;
      const { data, error } = await supabase.storage
        .from('products')
        .upload(fileName, file);

      if (error) throw error;

      const { data: { publicUrl } } = supabase.storage
        .from('products')
        .getPublicUrl(fileName);

      setProduct(prev => ({ ...prev, image_url: publicUrl }));
      
      toast({
        title: 'Sucesso',
        description: 'Imagem enviada com sucesso!'
      });
    } catch (error) {
      console.error('Erro ao fazer upload da imagem:', error);
      toast({
        title: 'Erro',
        description: 'Não foi possível fazer upload da imagem.',
        variant: 'destructive'
      });
    } finally {
      setUploadingImage(false);
    }
  };

  const validateProduct = () => {
    if (!product.name.trim()) {
      toast({
        title: 'Erro',
        description: 'Por favor, insira o nome do produto.',
        variant: 'destructive'
      });
      return false;
    }
    if (product.price < 0) {
      toast({
        title: 'Erro',
        description: 'O preço não pode ser negativo.',
        variant: 'destructive'
      });
      return false;
    }
    return true;
  };

  const handleSave = async () => {
    if (!validateProduct()) return;

    setSaving(true);
    try {
      if (id === 'new') {
        // Criar novo produto
        const { data, error } = await supabase
          .from('products')
          .insert([{
            ...product,
            created_at: new Date().toISOString()
          }])
          .select()
          .single();

        if (error) throw error;

        toast({
          title: 'Sucesso',
          description: 'Produto criado com sucesso!'
        });

        // Redirecionar para editar o novo produto
        navigate(`/admin/products/${data.id}`);
      } else {
        // Atualizar produto existente
        const { error } = await supabase
          .from('products')
          .update({
            ...product,
            updated_at: new Date().toISOString()
          })
          .eq('id', id);

        if (error) throw error;

        toast({
          title: 'Sucesso',
          description: 'Produto atualizado com sucesso!'
        });
      }
    } catch (error) {
      console.error('Erro ao salvar produto:', error);
      toast({
        title: 'Erro',
        description: 'Não foi possível salvar o produto.',
        variant: 'destructive'
      });
    } finally {
      setSaving(false);
    }
  };

  if (loading) {
    return (
      <div className="flex items-center justify-center min-h-screen">
        <div className="animate-spin rounded-full h-8 w-8 border-b-2 border-primary"></div>
      </div>
    );
  }

  return (
    <div className="container mx-auto py-6 max-w-6xl">
      <div className="flex items-center justify-between mb-6">
        <div className="flex items-center gap-4">
          <Button variant="outline" size="icon" onClick={() => navigate('/admin/products')}>
            <ArrowLeft className="h-4 w-4" />
          </Button>
          <div>
            <h1 className="text-2xl font-bold">
              {id === 'new' ? 'Criar Novo Produto' : 'Editar Produto'}
            </h1>
            <p className="text-muted-foreground">
              Configure as informações básicas e opções personalizáveis do produto
            </p>
          </div>
        </div>
        <Button onClick={handleSave} disabled={saving}>
          {saving ? (
            <>
              <div className="animate-spin rounded-full h-4 w-4 border-b-2 border-white mr-2"></div>
              Salvando...
            </>
          ) : (
            <>
              <Save className="h-4 w-4 mr-2" />
              Salvar Produto
            </>
          )}
        </Button>
      </div>

      {/* Abas de navegação */}
      <div className="flex space-x-1 mb-6 border-b">
        <Button
          variant={activeTab === 'basic' ? 'default' : 'ghost'}
          onClick={() => setActiveTab('basic')}
          className="rounded-b-none"
        >
          Informações Básicas
        </Button>
        <Button
          variant={activeTab === 'options' ? 'default' : 'ghost'}
          onClick={() => setActiveTab('options')}
          className="rounded-b-none"
        >
          Opções Personalizáveis
        </Button>
      </div>

      {activeTab === 'basic' ? (
        <div className="grid grid-cols-1 lg:grid-cols-2 gap-6">
          <Card>
            <CardHeader>
              <CardTitle>Dados do Produto</CardTitle>
            </CardHeader>
            <CardContent className="space-y-4">
              <div>
                <Label htmlFor="name">Nome do Produto</Label>
                <Input
                  id="name"
                  value={product.name}
                  onChange={(e) => handleInputChange('name', e.target.value)}
                  placeholder="Ex: Pizza Margherita"
                />
              </div>

              <div>
                <Label htmlFor="description">Descrição</Label>
                <Textarea
                  id="description"
                  value={product.description}
                  onChange={(e) => handleInputChange('description', e.target.value)}
                  placeholder="Descreva o produto..."
                  rows={4}
                />
              </div>

              <div>
                <Label htmlFor="category">Categoria</Label>
                <Select
                  value={product.category}
                  onValueChange={(value) => handleInputChange('category', value)}
                >
                  <SelectTrigger id="category">
                    <SelectValue />
                  </SelectTrigger>
                  <SelectContent>
                    {categories.map((category) => (
                      <SelectItem key={category} value={category}>
                        {category}
                      </SelectItem>
                    ))}
                  </SelectContent>
                </Select>
              </div>

              <div className="grid grid-cols-2 gap-4">
                <div>
                  <Label htmlFor="price">Preço (R$)</Label>
                  <Input
                    id="price"
                    type="number"
                    step="0.01"
                    min="0"
                    value={product.price}
                    onChange={(e) => handleInputChange('price', parseFloat(e.target.value) || 0)}
                    placeholder="0.00"
                  />
                </div>
                <div>
                  <Label htmlFor="display_order">Ordem de Exibição</Label>
                  <Input
                    id="display_order"
                    type="number"
                    value={product.display_order}
                    onChange={(e) => handleInputChange('display_order', parseInt(e.target.value) || 0)}
                    placeholder="0"
                  />
                </div>
              </div>

              <div className="flex items-center space-x-2">
                <Switch
                  id="available"
                  checked={product.available}
                  onCheckedChange={(checked) => handleInputChange('available', checked)}
                />
                <Label htmlFor="available">Produto Disponível</Label>
              </div>
            </CardContent>
          </Card>

          <Card>
            <CardHeader>
              <CardTitle>Imagem do Produto</CardTitle>
            </CardHeader>
            <CardContent>
              {product.image_url ? (
                <div className="space-y-4">
                  <img
                    src={product.image_url}
                    alt={product.name}
                    className="w-full h-48 object-cover rounded-lg"
                  />
                  <Input
                    value={product.image_url}
                    onChange={(e) => handleInputChange('image_url', e.target.value)}
                    placeholder="URL da imagem"
                  />
                </div>
              ) : (
                <div className="border-2 border-dashed border-gray-300 rounded-lg p-8 text-center">
                  <Upload className="h-12 w-12 text-gray-400 mx-auto mb-4" />
                  <p className="text-gray-500 mb-4">Nenhuma imagem selecionada</p>
                  <Label htmlFor="image-upload" className="cursor-pointer">
                    <Button asChild>
                      <span>Escolher Imagem</span>
                    </Button>
                  </Label>
                  <Input
                    id="image-upload"
                    type="file"
                    accept="image/*"
                    onChange={handleImageUpload}
                    className="hidden"
                    disabled={uploadingImage}
                  />
                </div>
              )}

              {product.image_url && (
                <div className="mt-4">
                  <Label htmlFor="image-url">Ou insira a URL da imagem</Label>
                  <Input
                    id="image-url"
                    value={product.image_url}
                    onChange={(e) => handleInputChange('image_url', e.target.value)}
                    placeholder="https://exemplo.com/imagem.jpg"
                  />
                </div>
              )}
            </CardContent>
          </Card>
        </div>
      ) : (
        <Card>
          <CardHeader>
            <CardTitle>Opções Personalizáveis</CardTitle>
            <p className="text-sm text-muted-foreground">
              Configure grupos de opções e escolhas disponíveis para este produto
            </p>
          </CardHeader>
          <CardContent>
            {id === 'new' ? (
              <div className="text-center py-8">
                <p className="text-muted-foreground mb-4">
                  Primeiro salve o produto para poder configurar as opções.
                </p>
                <Button onClick={handleSave}>Salvar Produto</Button>
              </div>
            ) : (
              <ProductOptionsManager
                productId={id!}
                onSave={() => {
                  toast({
                    title: 'Sucesso',
                    description: 'Opções salvas com sucesso!'
                  });
                }}
              />
            )}
          </CardContent>
        </Card>
      )}
    </div>
  );
};

export default AdminProductForm;