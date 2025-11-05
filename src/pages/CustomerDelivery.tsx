import React, { useState, useEffect } from 'react';
import { Link, useNavigate } from 'react-router-dom';
import { Button } from '@/components/ui/button';
import { Card, CardContent, CardHeader, CardTitle } from '@/components/ui/card';
import { Badge } from '@/components/ui/badge';
import { Avatar, AvatarFallback, AvatarImage } from '@/components/ui/avatar';
import { 
  Clock, 
  MapPin, 
  Star, 
  ShoppingCart, 
  Search, 
  Filter,
  ChefHat,
  Phone,
  Info,
  TrendingUp,
  Tag,
  ArrowLeft,
  Trash2
} from 'lucide-react';
import { useAuth } from '@/contexts/AuthContext';
import { supabase } from '@/integrations/supabase/client';
import { format } from 'date-fns';
import { ptBR } from 'date-fns/locale';

interface Restaurant {
  id: string;
  name: string;
  description: string;
  image_url: string;
  rating: number;
  delivery_time: string;
  delivery_fee: number;
  min_order: number;
  categories: string[];
  is_open: boolean;
  address: string;
  phone: string;
}

interface MenuItem {
  id: string;
  name: string;
  description: string;
  price: number;
  image_url: string;
  category: string;
  is_available: boolean;
  preparation_time: string;
}

interface CartItem {
  id: string;
  item: MenuItem;
  quantity: number;
  observations?: string;
}

const CustomerDelivery: React.FC = () => {
  const [restaurants, setRestaurants] = useState<Restaurant[]>([]);
  const [selectedRestaurant, setSelectedRestaurant] = useState<Restaurant | null>(null);
  const [menuItems, setMenuItems] = useState<MenuItem[]>([]);
  const [cart, setCart] = useState<CartItem[]>([]);
  const [searchTerm, setSearchTerm] = useState('');
  const [selectedCategory, setSelectedCategory] = useState('all');
  const [isLoading, setIsLoading] = useState(true);
  const [currentView, setCurrentView] = useState<'restaurants' | 'menu' | 'cart'>('restaurants');
  
  const { user } = useAuth();
  const navigate = useNavigate();

  // Buscar restaurantes parceiros
  const fetchRestaurants = async () => {
    try {
      setIsLoading(true);
      
      // Buscar usuários que são restaurantes (têm plano premium/professional)
      const { data: users, error } = await supabase
        .from('profiles')
        .select('*')
        .eq('role', 'restaurant')
        .eq('is_active', true);

      if (error) throw error;

      // Transformar dados dos usuários em restaurantes
      const restaurantsData: Restaurant[] = users?.map(user => ({
        id: user.id,
        name: user.company_name || user.full_name || 'Restaurante',
        description: user.bio || 'Restaurante parceiro do Colab Eats',
        image_url: user.avatar_url || '/restaurant-default.jpg',
        rating: 4.5, // TODO: Implementar sistema de avaliações
        delivery_time: '30-45 min',
        delivery_fee: 5.00,
        min_order: 20.00,
        categories: ['Comida Caseira', 'Brasileira'],
        is_open: true, // TODO: Implementar horário de funcionamento
        address: user.address || 'Endereço não informado',
        phone: user.phone || 'Telefone não informado',
      })) || [];

      setRestaurants(restaurantsData);
    } catch (error) {
      console.error('Erro ao buscar restaurantes:', error);
    } finally {
      setIsLoading(false);
    }
  };

  // Buscar cardápio do restaurante
  const fetchRestaurantMenu = async (restaurantId: string) => {
    try {
      setIsLoading(true);
      
      // Buscar menus ativos do restaurante
      const { data: menus, error: menuError } = await supabase
        .from('menus')
        .select('*')
        .eq('user_id', restaurantId)
        .eq('status', 'active')
        .order('created_at', { ascending: false })
        .limit(1);

      if (menuError) throw menuError;

      if (menus && menus.length > 0) {
        // Buscar itens do cardápio
        const { data: items, error: itemsError } = await supabase
          .from('menu_items')
          .select('*')
          .eq('menu_id', menus[0].id)
          .eq('is_available', true)
          .order('category')
          .order('name');

        if (itemsError) throw itemsError;

        const menuItemsData: MenuItem[] = items?.map(item => ({
          id: item.id,
          name: item.name,
          description: item.description,
          price: item.price,
          image_url: item.image_url,
          category: item.category || 'Prato Principal',
          is_available: item.is_available,
          preparation_time: '20-30 min',
        })) || [];

        setMenuItems(menuItemsData);
      } else {
        setMenuItems([]);
      }
    } catch (error) {
      console.error('Erro ao buscar cardápio:', error);
    } finally {
      setIsLoading(false);
    }
  };

  // Adicionar item ao carrinho
  const addToCart = (item: MenuItem, quantity: number = 1, observations?: string) => {
    setCart(prev => {
      const existingItem = prev.find(cartItem => cartItem.item.id === item.id);
      
      if (existingItem) {
        return prev.map(cartItem => 
          cartItem.item.id === item.id 
            ? { ...cartItem, quantity: cartItem.quantity + quantity, observations }
            : cartItem
        );
      } else {
        return [...prev, { id: `${item.id}-${Date.now()}`, item, quantity, observations }];
      }
    });
  };

  // Remover item do carrinho
  const removeFromCart = (cartItemId: string) => {
    setCart(prev => prev.filter(item => item.id !== cartItemId));
  };

  // Atualizar quantidade do item
  const updateCartItemQuantity = (cartItemId: string, quantity: number) => {
    if (quantity <= 0) {
      removeFromCart(cartItemId);
      return;
    }
    
    setCart(prev => 
      prev.map(item => 
        item.id === cartItemId ? { ...item, quantity } : item
      )
    );
  };

  // Calcular total do carrinho
  const getCartTotal = () => {
    return cart.reduce((total, item) => total + (item.item.price * item.quantity), 0);
  };

  // Obter quantidade no carrinho
  const getCartItemQuantity = (itemId: string) => {
    const cartItem = cart.find(cartItem => cartItem.item.id === itemId);
    return cartItem ? cartItem.quantity : 0;
  };

  // Filtrar restaurantes
  const filteredRestaurants = restaurants.filter(restaurant => {
    const matchesSearch = restaurant.name.toLowerCase().includes(searchTerm.toLowerCase()) ||
                         restaurant.description.toLowerCase().includes(searchTerm.toLowerCase());
    
    const matchesCategory = selectedCategory === 'all' || 
                           restaurant.categories.includes(selectedCategory);
    
    return matchesSearch && matchesCategory;
  });

  // Filtrar itens do cardápio
  const filteredMenuItems = menuItems.filter(item => {
    const matchesSearch = item.name.toLowerCase().includes(searchTerm.toLowerCase()) ||
                         item.description.toLowerCase().includes(searchTerm.toLowerCase());
    
    const matchesCategory = selectedCategory === 'all' || 
                           item.category === selectedCategory;
    
    return matchesSearch && matchesCategory;
  });

  // Agrupar itens por categoria
  const groupedMenuItems = filteredMenuItems.reduce((groups, item) => {
    const category = item.category;
    if (!groups[category]) {
      groups[category] = [];
    }
    groups[category].push(item);
    return groups;
  }, {} as Record<string, MenuItem[]>);

  useEffect(() => {
    fetchRestaurants();
  }, []);

  useEffect(() => {
    if (selectedRestaurant) {
      fetchRestaurantMenu(selectedRestaurant.id);
    }
  }, [selectedRestaurant]);

  if (isLoading && restaurants.length === 0) {
    return (
      <div className="min-h-screen flex items-center justify-center">
        <div className="text-center">
          <ChefHat className="h-12 w-12 mx-auto mb-4 text-gray-400 animate-pulse" />
          <p className="text-gray-600">Carregando restaurantes...</p>
        </div>
      </div>
    );
  }

  return (
    <div className="min-h-screen bg-gray-50">
      {/* Header */}
      <header className="bg-white shadow-sm sticky top-0 z-40">
        <div className="max-w-6xl mx-auto px-4 py-4">
          <div className="flex items-center justify-between">
            <div className="flex items-center space-x-4">
              <Button
                variant="ghost"
                size="icon"
                onClick={() => {
                  if (currentView === 'menu') {
                    setCurrentView('restaurants');
                    setSelectedRestaurant(null);
                  } else if (currentView === 'cart') {
                    setCurrentView('menu');
                  }
                }}
                className={currentView === 'restaurants' ? 'invisible' : ''}
              >
                <ArrowLeft className="h-5 w-5" />
              </Button>
              <h1 className="text-xl font-bold text-gray-900">
                {currentView === 'restaurants' && 'Delivery'}
                {currentView === 'menu' && selectedRestaurant?.name}
                {currentView === 'cart' && 'Carrinho'}
              </h1>
            </div>
            
            {currentView !== 'cart' && (
              <div className="flex items-center space-x-4">
                <div className="relative">
                  <Search className="absolute left-3 top-1/2 transform -translate-y-1/2 h-4 w-4 text-gray-400" />
                  <input
                    type="text"
                    placeholder="Buscar..."
                    value={searchTerm}
                    onChange={(e) => setSearchTerm(e.target.value)}
                    className="pl-10 pr-4 py-2 border border-gray-300 rounded-lg focus:ring-2 focus:ring-orange-500 focus:border-transparent"
                  />
                </div>
                
                {user && (
                  <Button
                    variant="outline"
                    size="icon"
                    onClick={() => setCurrentView('cart')}
                    className="relative"
                  >
                    <ShoppingCart className="h-5 w-5" />
                    {cart.length > 0 && (
                      <Badge className="absolute -top-2 -right-2 h-5 w-5 flex items-center justify-center text-xs p-0">
                        {cart.reduce((sum, item) => sum + item.quantity, 0)}
                      </Badge>
                    )}
                  </Button>
                )}
              </div>
            )}
          </div>
        </div>
      </header>

      {/* Conteúdo Principal */}
      <main className="max-w-6xl mx-auto px-4 py-6">
        {/* Visualização: Lista de Restaurantes */}
        {currentView === 'restaurants' && (
          <div className="space-y-6">
            {/* Categorias */}
            <div className="flex flex-wrap gap-2">
              <Button
                variant={selectedCategory === 'all' ? 'default' : 'outline'}
                size="sm"
                onClick={() => setSelectedCategory('all')}
              >
                Todos
              </Button>
              <Button
                variant={selectedCategory === 'Comida Caseira' ? 'default' : 'outline'}
                size="sm"
                onClick={() => setSelectedCategory('Comida Caseira')}
              >
                Comida Caseira
              </Button>
              <Button
                variant={selectedCategory === 'Brasileira' ? 'default' : 'outline'}
                size="sm"
                onClick={() => setSelectedCategory('Brasileira')}
              >
                Brasileira
              </Button>
            </div>

            {/* Grid de Restaurantes */}
            <div className="grid grid-cols-1 md:grid-cols-2 lg:grid-cols-3 gap-6">
              {filteredRestaurants.map((restaurant) => (
                <Card key={restaurant.id} className="overflow-hidden hover:shadow-lg transition-shadow cursor-pointer"
                      onClick={() => {
                        setSelectedRestaurant(restaurant);
                        setCurrentView('menu');
                      }}>
                  <div className="h-48 bg-gray-200 relative">
                    <img
                      src={restaurant.image_url}
                      alt={restaurant.name}
                      className="w-full h-full object-cover"
                      onError={(e) => {
                        e.currentTarget.src = '/restaurant-default.jpg';
                      }}
                    />
                    <Badge 
                      className={`absolute top-2 right-2 ${
                        restaurant.is_open ? 'bg-green-500' : 'bg-red-500'
                      }`}
                    >
                      {restaurant.is_open ? 'Aberto' : 'Fechado'}
                    </Badge>
                  </div>
                  
                  <CardHeader>
                    <CardTitle className="text-lg">{restaurant.name}</CardTitle>
                    <p className="text-sm text-gray-600 line-clamp-2">{restaurant.description}</p>
                  </CardHeader>
                  
                  <CardContent>
                    <div className="space-y-2">
                      <div className="flex items-center justify-between text-sm">
                        <div className="flex items-center space-x-1">
                          <Star className="h-4 w-4 text-yellow-400 fill-current" />
                          <span>{restaurant.rating}</span>
                        </div>
                        <div className="flex items-center space-x-1">
                          <Clock className="h-4 w-4 text-gray-400" />
                          <span>{restaurant.delivery_time}</span>
                        </div>
                      </div>
                      
                      <div className="flex items-center justify-between text-sm">
                        <div className="flex items-center space-x-1">
                          <MapPin className="h-4 w-4 text-gray-400" />
                          <span className="truncate">{restaurant.address}</span>
                        </div>
                        <span className="text-orange-600 font-medium">
                          R$ {restaurant.delivery_fee.toFixed(2)}
                        </span>
                      </div>
                      
                      <div className="flex flex-wrap gap-1 mt-2">
                        {restaurant.categories.map((category) => (
                          <Badge key={category} variant="outline" className="text-xs">
                            {category}
                          </Badge>
                        ))}
                      </div>
                    </div>
                  </CardContent>
                </Card>
              ))}
            </div>
          </div>
        )}

        {/* Visualização: Cardápio do Restaurante */}
        {currentView === 'menu' && (
          <div className="space-y-6">
            {Object.entries(groupedMenuItems).map(([category, items]) => (
              <div key={category}>
                <h2 className="text-xl font-bold text-gray-900 mb-4">{category}</h2>
                <div className="grid grid-cols-1 md:grid-cols-2 gap-4">
                  {items.map((item) => (
                    <Card key={item.id} className="overflow-hidden">
                      <div className="flex">
                        <div className="w-24 h-24 bg-gray-200 flex-shrink-0">
                          <img
                            src={item.image_url || '/food-default.jpg'}
                            alt={item.name}
                            className="w-full h-full object-cover"
                            onError={(e) => {
                              e.currentTarget.src = '/food-default.jpg';
                            }}
                          />
                        </div>
                        
                        <CardContent className="flex-1 p-4">
                          <div className="flex justify-between items-start mb-2">
                            <h3 className="font-semibold text-gray-900">{item.name}</h3>
                            <span className="text-lg font-bold text-orange-600">
                              R$ {item.price.toFixed(2)}
                            </span>
                          </div>
                          
                          <p className="text-sm text-gray-600 mb-3 line-clamp-2">
                            {item.description}
                          </p>
                          
                          <div className="flex items-center justify-between">
                            <div className="flex items-center space-x-1 text-xs text-gray-500">
                              <Clock className="h-3 w-3" />
                              <span>{item.preparation_time}</span>
                            </div>
                            
                            {getCartItemQuantity(item.id) > 0 ? (
                              <div className="flex items-center space-x-2">
                                <Button
                                  variant="outline"
                                  size="sm"
                                  onClick={() => updateCartItemQuantity(`${item.id}-${Date.now()}`, getCartItemQuantity(item.id) - 1)}
                                >
                                  -
                                </Button>
                                <span className="text-sm font-medium">
                                  {getCartItemQuantity(item.id)}
                                </span>
                                <Button
                                  variant="outline"
                                  size="sm"
                                  onClick={() => updateCartItemQuantity(`${item.id}-${Date.now()}`, getCartItemQuantity(item.id) + 1)}
                                >
                                  +
                                </Button>
                              </div>
                            ) : (
                              <Button
                                variant="default"
                                size="sm"
                                onClick={() => addToCart(item)}
                                className="bg-orange-500 hover:bg-orange-600"
                              >
                                Adicionar
                              </Button>
                            )}
                          </div>
                        </CardContent>
                      </div>
                    </Card>
                  ))}
                </div>
              </div>
            ))}
          </div>
        )}

        {/* Visualização: Carrinho */}
        {currentView === 'cart' && (
          <div className="grid grid-cols-1 lg:grid-cols-3 gap-6">
            <div className="lg:col-span-2 space-y-4">
              {cart.length === 0 ? (
                <Card>
                  <CardContent className="text-center py-8">
                    <ShoppingCart className="h-12 w-12 text-gray-400 mx-auto mb-4" />
                    <p className="text-gray-600">Seu carrinho está vazio</p>
                    <Button
                      variant="outline"
                      onClick={() => setCurrentView('menu')}
                      className="mt-4"
                    >
                      Voltar ao cardápio
                    </Button>
                  </CardContent>
                </Card>
              ) : (
                cart.map((cartItem) => (
                  <Card key={cartItem.id}>
                    <CardContent className="p-4">
                      <div className="flex items-center space-x-4">
                        <div className="w-16 h-16 bg-gray-200 rounded-lg flex-shrink-0">
                          <img
                            src={cartItem.item.image_url || '/food-default.jpg'}
                            alt={cartItem.item.name}
                            className="w-full h-full object-cover rounded-lg"
                          />
                        </div>
                        
                        <div className="flex-1">
                          <h3 className="font-semibold text-gray-900">{cartItem.item.name}</h3>
                          <p className="text-sm text-gray-600">
                            R$ {cartItem.item.price.toFixed(2)} cada
                          </p>
                          {cartItem.observations && (
                            <p className="text-xs text-gray-500 mt-1">
                              Observações: {cartItem.observations}
                            </p>
                          )}
                        </div>
                        
                        <div className="flex items-center space-x-2">
                          <Button
                            variant="outline"
                            size="sm"
                            onClick={() => updateCartItemQuantity(cartItem.id, cartItem.quantity - 1)}
                          >
                            -
                          </Button>
                          <span className="text-sm font-medium w-8 text-center">
                            {cartItem.quantity}
                          </span>
                          <Button
                            variant="outline"
                            size="sm"
                            onClick={() => updateCartItemQuantity(cartItem.id, cartItem.quantity + 1)}
                          >
                            +
                          </Button>
                          <Button
                            variant="ghost"
                            size="sm"
                            onClick={() => removeFromCart(cartItem.id)}
                            className="text-red-600 hover:text-red-700"
                          >
                            <Trash2 className="h-4 w-4" />
                          </Button>
                        </div>
                      </div>
                    </CardContent>
                  </Card>
                ))
              )}
            </div>
            
            {/* Resumo do Pedido */}
            <div className="space-y-4">
              <Card>
                <CardHeader>
                  <CardTitle>Resumo do Pedido</CardTitle>
                </CardHeader>
                <CardContent className="space-y-3">
                  <div className="flex justify-between text-sm">
                    <span>Subtotal</span>
                    <span>R$ {getCartTotal().toFixed(2)}</span>
                  </div>
                  <div className="flex justify-between text-sm">
                    <span>Taxa de entrega</span>
                    <span>R$ {selectedRestaurant?.delivery_fee.toFixed(2)}</span>
                  </div>
                  <div className="border-t pt-3">
                    <div className="flex justify-between font-semibold">
                      <span>Total</span>
                      <span>
                        R$ {(getCartTotal() + (selectedRestaurant?.delivery_fee || 0)).toFixed(2)}
                      </span>
                    </div>
                  </div>
                </CardContent>
              </Card>
              
              {selectedRestaurant && (
                <Card>
                  <CardHeader>
                    <CardTitle>Informações de Entrega</CardTitle>
                  </CardHeader>
                  <CardContent className="space-y-2">
                    <div className="flex items-center space-x-2 text-sm">
                      <MapPin className="h-4 w-4 text-gray-400" />
                      <span>{selectedRestaurant.address}</span>
                    </div>
                    <div className="flex items-center space-x-2 text-sm">
                      <Clock className="h-4 w-4 text-gray-400" />
                      <span>{selectedRestaurant.delivery_time}</span>
                    </div>
                    <div className="flex items-center space-x-2 text-sm">
                      <Phone className="h-4 w-4 text-gray-400" />
                      <span>{selectedRestaurant.phone}</span>
                    </div>
                  </CardContent>
                </Card>
              )}
              
              {cart.length > 0 && (
                <Button 
                  className="w-full bg-orange-500 hover:bg-orange-600"
                  size="lg"
                  onClick={() => {
                    if (!user) {
                      navigate('/auth');
                      return;
                    }
                    // TODO: Implementar finalização do pedido
                    console.log('Finalizar pedido:', cart);
                  }}
                >
                  Finalizar Pedido
                </Button>
              )}
            </div>
          </div>
        )}
      </main>
    </div>
  );
};

export default CustomerDelivery;