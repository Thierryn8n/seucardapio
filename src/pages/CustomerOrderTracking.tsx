import React, { useState, useEffect } from 'react';
import { useParams, Link } from 'react-router-dom';
import { Card, CardContent, CardHeader, CardTitle } from '@/components/ui/card';
import { Button } from '@/components/ui/button';
import { Badge } from '@/components/ui/badge';
import { Progress } from '@/components/ui/progress';
import { 
  Clock, 
  MapPin, 
  Package, 
  Truck, 
  CheckCircle, 
  AlertCircle,
  Phone,
  MessageCircle,
  RefreshCw,
  Home,
  Receipt,
  Star
} from 'lucide-react';
import { ReviewForm, ReviewList } from '@/components/reviews';
import { useAuth } from '@/contexts/AuthContext';
import { supabase } from '@/integrations/supabase/client';
import { format } from 'date-fns';
import { ptBR } from 'date-fns/locale';

interface Order {
  id: string;
  user_id: string;
  restaurant_id: string;
  restaurant_name: string;
  status: 'pending' | 'confirmed' | 'preparing' | 'ready' | 'delivering' | 'delivered' | 'cancelled';
  total_amount: number;
  delivery_fee: number;
  delivery_address: string;
  delivery_time: string;
  items: OrderItem[];
  created_at: string;
  updated_at: string;
  estimated_delivery_time?: string;
  driver_name?: string;
  driver_phone?: string;
  tracking_code?: string;
}

interface OrderItem {
  id: string;
  name: string;
  quantity: number;
  price: number;
  observations?: string;
}

interface OrderStatus {
  key: string;
  label: string;
  description: string;
  icon: React.ReactNode;
  color: string;
}

const orderStatuses: Record<string, OrderStatus> = {
  pending: {
    key: 'pending',
    label: 'Pedido Realizado',
    description: 'Aguardando confirmação do restaurante',
    icon: <Clock className="h-5 w-5" />,
    color: 'bg-yellow-500'
  },
  confirmed: {
    key: 'confirmed',
    label: 'Pedido Confirmado',
    description: 'Seu pedido foi confirmado',
    icon: <CheckCircle className="h-5 w-5" />,
    color: 'bg-blue-500'
  },
  preparing: {
    key: 'preparing',
    label: 'Em Preparação',
    description: 'Seu pedido está sendo preparado',
    icon: <Package className="h-5 w-5" />,
    color: 'bg-orange-500'
  },
  ready: {
    key: 'ready',
    label: 'Pronto para Entrega',
    description: 'Seu pedido está pronto',
    icon: <Package className="h-5 w-5" />,
    color: 'bg-purple-500'
  },
  delivering: {
    key: 'delivering',
    label: 'Saiu para Entrega',
    description: 'Seu pedido está a caminho',
    icon: <Truck className="h-5 w-5" />,
    color: 'bg-indigo-500'
  },
  delivered: {
    key: 'delivered',
    label: 'Entregue',
    description: 'Pedido entregue com sucesso',
    icon: <CheckCircle className="h-5 w-5" />,
    color: 'bg-green-500'
  },
  cancelled: {
    key: 'cancelled',
    label: 'Cancelado',
    description: 'Pedido cancelado',
    icon: <AlertCircle className="h-5 w-5" />,
    color: 'bg-red-500'
  }
};

const CustomerOrderTracking: React.FC = () => {
  const { orderId } = useParams<{ orderId: string }>();
  const { user } = useAuth();
  
  const [order, setOrder] = useState<Order | null>(null);
  const [isLoading, setIsLoading] = useState(true);
  const [isRefreshing, setIsRefreshing] = useState(false);
  const [currentStatusIndex, setCurrentStatusIndex] = useState(0);
  const [showReviewForm, setShowReviewForm] = useState(false);

  // Buscar detalhes do pedido
  const fetchOrderDetails = async () => {
    if (!orderId || !user) return;

    try {
      // Buscar pedido
      const { data: orderData, error: orderError } = await supabase
        .from('orders')
        .select('*')
        .eq('id', orderId)
        .eq('user_id', user.id)
        .single();

      if (orderError) throw orderError;

      // Buscar itens do pedido
      const { data: itemsData, error: itemsError } = await supabase
        .from('order_items')
        .select('*')
        .eq('order_id', orderId);

      if (itemsError) throw itemsError;

      const orderWithItems: Order = {
        ...orderData,
        items: itemsData || []
      };

      setOrder(orderWithItems);

      // Calcular índice do status atual
      const statusKeys = Object.keys(orderStatuses);
      const currentIndex = statusKeys.indexOf(orderData.status);
      setCurrentStatusIndex(currentIndex);

      // Verificar se já existe avaliação para este pedido
      if (orderData.status === 'delivered') {
        const { data: existingReview } = await supabase
          .from('reviews')
          .select('id')
          .eq('user_id', user.id)
          .eq('order_id', orderId)
          .single();
        
        setShowReviewForm(!existingReview);
      }

    } catch (error) {
      console.error('Erro ao buscar detalhes do pedido:', error);
    } finally {
      setIsLoading(false);
      setIsRefreshing(false);
    }
  };

  // Atualizar status do pedido
  const refreshOrder = async () => {
    setIsRefreshing(true);
    await fetchOrderDetails();
  };

  // Configurar subscription para mudanças no pedido
  useEffect(() => {
    if (!orderId) return;

    const subscription = supabase
      .channel(`order:${orderId}`)
      .on(
        'postgres_changes',
        {
          event: '*',
          schema: 'public',
          table: 'orders',
          filter: `id=eq.${orderId}`
        },
        (payload) => {
          if (payload.new) {
            setOrder(payload.new as Order);
            const statusKeys = Object.keys(orderStatuses);
            const currentIndex = statusKeys.indexOf(payload.new.status);
            setCurrentStatusIndex(currentIndex);
          }
        }
      )
      .subscribe();

    return () => {
      subscription.unsubscribe();
    };
  }, [orderId]);

  useEffect(() => {
    fetchOrderDetails();
  }, [orderId, user]);

  if (isLoading) {
    return (
      <div className="min-h-screen flex items-center justify-center">
        <div className="text-center">
          <RefreshCw className="h-12 w-12 mx-auto mb-4 text-gray-400 animate-spin" />
          <p className="text-gray-600">Carregando detalhes do pedido...</p>
        </div>
      </div>
    );
  }

  if (!order) {
    return (
      <div className="min-h-screen flex items-center justify-center">
        <div className="text-center">
          <AlertCircle className="h-12 w-12 mx-auto mb-4 text-red-500" />
          <p className="text-gray-600 mb-4">Pedido não encontrado</p>
          <Link to="/delivery">
            <Button variant="outline">
              <Home className="h-4 w-4 mr-2" />
              Voltar para Delivery
            </Button>
          </Link>
        </div>
      </div>
    );
  }

  const statusKeys = Object.keys(orderStatuses);
  const progressPercentage = ((currentStatusIndex + 1) / statusKeys.length) * 100;

  return (
    <div className="min-h-screen bg-gray-50">
      {/* Header */}
      <header className="bg-white shadow-sm sticky top-0 z-40">
        <div className="max-w-4xl mx-auto px-4 py-4">
          <div className="flex items-center justify-between">
            <div className="flex items-center space-x-4">
              <Link to="/delivery">
                <Button variant="ghost" size="icon">
                  <Home className="h-5 w-5" />
                </Button>
              </Link>
              <h1 className="text-xl font-bold text-gray-900">
                Acompanhamento do Pedido
              </h1>
            </div>
            
            <Button
              variant="outline"
              size="sm"
              onClick={refreshOrder}
              disabled={isRefreshing}
            >
              <RefreshCw className={`h-4 w-4 mr-2 ${isRefreshing ? 'animate-spin' : ''}`} />
              Atualizar
            </Button>
          </div>
        </div>
      </header>

      {/* Conteúdo Principal */}
      <main className="max-w-4xl mx-auto px-4 py-6">
        {/* Status do Pedido */}
        <Card className="mb-6">
          <CardHeader>
            <div className="flex items-center justify-between">
              <CardTitle className="text-lg">
                Pedido #{order.id.slice(0, 8)}
              </CardTitle>
              <Badge className={orderStatuses[order.status]?.color || 'bg-gray-500'}>
                {orderStatuses[order.status]?.label || order.status}
              </Badge>
            </div>
            <p className="text-sm text-gray-600">
              {format(new Date(order.created_at), 'PPP \à\s HH:mm', { locale: ptBR })}
            </p>
          </CardHeader>
          
          <CardContent>
            {/* Barra de Progresso */}
            <div className="mb-6">
              <Progress value={progressPercentage} className="h-2" />
            </div>

            {/* Timeline de Status */}
            <div className="space-y-4">
              {statusKeys.map((statusKey, index) => {
                const status = orderStatuses[statusKey];
                const isCompleted = index <= currentStatusIndex;
                const isCurrent = index === currentStatusIndex;

                return (
                  <div key={statusKey} className="flex items-start space-x-4">
                    <div className={`flex-shrink-0 w-10 h-10 rounded-full flex items-center justify-center ${
                      isCompleted ? status.color : 'bg-gray-200'
                    }`}>
                      <div className={`${isCompleted ? 'text-white' : 'text-gray-400'}`}>
                        {status.icon}
                      </div>
                    </div>
                    
                    <div className="flex-1">
                      <h3 className={`font-semibold ${
                        isCurrent ? 'text-gray-900' : isCompleted ? 'text-gray-700' : 'text-gray-400'
                      }`}>
                        {status.label}
                      </h3>
                      <p className={`text-sm ${
                        isCurrent ? 'text-gray-600' : isCompleted ? 'text-gray-500' : 'text-gray-400'
                      }`}>
                        {status.description}
                      </p>
                    </div>

                    {isCompleted && index < currentStatusIndex && (
                      <CheckCircle className="h-5 w-5 text-green-500 flex-shrink-0" />
                    )}
                  </div>
                );
              })}
            </div>
          </CardContent>
        </Card>

        <div className="grid grid-cols-1 lg:grid-cols-2 gap-6">
          {/* Detalhes do Pedido */}
          <Card>
            <CardHeader>
              <CardTitle>Detalhes do Pedido</CardTitle>
            </CardHeader>
            <CardContent>
              <div className="space-y-4">
                <div>
                  <h3 className="font-semibold text-gray-900 mb-2">Itens</h3>
                  <div className="space-y-2">
                    {order.items.map((item) => (
                      <div key={item.id} className="flex justify-between items-start">
                        <div className="flex-1">
                          <p className="text-sm font-medium">{item.name}</p>
                          <p className="text-xs text-gray-600">
                            Quantidade: {item.quantity}
                          </p>
                          {item.observations && (
                            <p className="text-xs text-gray-500">
                              Obs: {item.observations}
                            </p>
                          )}
                        </div>
                        <p className="text-sm font-medium">
                          R$ {(item.price * item.quantity).toFixed(2)}
                        </p>
                      </div>
                    ))}
                  </div>
                </div>

                <div className="border-t pt-4">
                  <div className="flex justify-between text-sm">
                    <span>Subtotal</span>
                    <span>R$ {order.total_amount.toFixed(2)}</span>
                  </div>
                  <div className="flex justify-between text-sm">
                    <span>Taxa de entrega</span>
                    <span>R$ {order.delivery_fee.toFixed(2)}</span>
                  </div>
                  <div className="flex justify-between font-semibold text-lg pt-2 border-t">
                    <span>Total</span>
                    <span>R$ {(order.total_amount + order.delivery_fee).toFixed(2)}</span>
                  </div>
                </div>
              </div>
            </CardContent>
          </Card>

          {/* Informações de Entrega */}
          <Card>
            <CardHeader>
              <CardTitle>Informações de Entrega</CardTitle>
            </CardHeader>
            <CardContent>
              <div className="space-y-4">
                <div>
                  <p className="text-sm text-gray-600">Endereço de Entrega</p>
                  <p className="font-medium">{order.delivery_address}</p>
                </div>

                {order.estimated_delivery_time && (
                  <div>
                    <p className="text-sm text-gray-600">Tempo Estimado</p>
                    <p className="font-medium">{order.estimated_delivery_time}</p>
                  </div>
                )}

                {order.driver_name && (
                  <div>
                    <p className="text-sm text-gray-600">Entregador</p>
                    <p className="font-medium">{order.driver_name}</p>
                    {order.driver_phone && (
                      <div className="flex space-x-2 mt-2">
                        <Button variant="outline" size="sm">
                          <Phone className="h-4 w-4 mr-2" />
                          Ligar
                        </Button>
                        <Button variant="outline" size="sm">
                          <MessageCircle className="h-4 w-4 mr-2" />
                          Mensagem
                        </Button>
                      </div>
                    )}
                  </div>
                )}

                {order.tracking_code && (
                  <div>
                    <p className="text-sm text-gray-600">Código de Rastreamento</p>
                    <p className="font-mono text-sm bg-gray-100 px-2 py-1 rounded">
                      {order.tracking_code}
                    </p>
                  </div>
                )}

                <div className="pt-4 border-t">
                  <p className="text-sm text-gray-600 mb-2">Restaurante</p>
                  <p className="font-medium">{order.restaurant_name}</p>
                </div>
              </div>
            </CardContent>
          </Card>
        </div>

        {/* Ações */}
        <div className="flex flex-wrap gap-4 mt-6">
          {order.status === 'delivered' && (
            <>
              <Button variant="default">
                <Receipt className="h-4 w-4 mr-2" />
                Ver Recibo
              </Button>
              {showReviewForm && (
                <Button variant="outline" onClick={() => setShowReviewForm(true)}>
                  <Star className="h-4 w-4 mr-2" />
                  Avaliar Pedido
                </Button>
              )}
            </>
          )}
          
          {['pending', 'confirmed', 'preparing'].includes(order.status) && (
            <Button variant="destructive">
              <AlertCircle className="h-4 w-4 mr-2" />
              Cancelar Pedido
            </Button>
          )}

          <Link to="/delivery">
            <Button variant="outline">
              <Home className="h-4 w-4 mr-2" />
              Voltar para Delivery
            </Button>
          </Link>
        </div>

        {/* Sistema de Avaliações */}
        {order.status === 'delivered' && (
          <div className="mt-8">
            {showReviewForm ? (
              <ReviewForm
                orderId={order.id}
                restaurantId={order.restaurant_id}
                restaurantName={order.restaurant_name}
                onReviewSubmitted={() => {
                  setShowReviewForm(false);
                  // Recarregar avaliações após enviar
                  window.location.reload();
                }}
              />
            ) : (
              <ReviewList
                restaurantId={order.restaurant_id}
                currentUserId={user?.id}
                canEdit={true}
              />
            )}
          </div>
        )}
      </main>
    </div>
  );
};

export default CustomerOrderTracking;