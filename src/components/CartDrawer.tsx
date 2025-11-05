import React, { useState } from 'react';
import { Card, CardContent } from '@/components/ui/card';
import { Button } from '@/components/ui/button';
import { Badge } from '@/components/ui/badge';
import { ShoppingCart, Plus, Minus, X, Trash2, CreditCard, MapPin, Clock } from 'lucide-react';
import { cn } from '@/lib/utils';
import { useCart } from '@/hooks/useCart';
import { useToast } from '@/hooks/use-toast';
import { useNavigate } from 'react-router-dom';

interface CartDrawerProps {
  isOpen: boolean;
  onClose: () => void;
  className?: string;
}

export const CartDrawer: React.FC<CartDrawerProps> = ({
  isOpen,
  onClose,
  className
}) => {
  const { items, removeItem, updateQuantity, total, clearCart } = useCart();
  const { toast } = useToast();
  const navigate = useNavigate();
  const [isCheckingOut, setIsCheckingOut] = useState(false);

  const handleCheckout = () => {
    if (items.length === 0) {
      toast({
        title: 'Carrinho vazio',
        description: 'Adicione produtos ao carrinho antes de finalizar.',
        variant: 'destructive'
      });
      return;
    }

    setIsCheckingOut(true);
    // Navegar para a página de checkout
    navigate('/checkout', { state: { cartItems: items, total } });
    onClose();
  };

  const handleQuantityChange = (id: string, newQuantity: number) => {
    if (newQuantity <= 0) {
      removeItem(id);
      return;
    }
    updateQuantity(id, newQuantity);
  };

  const deliveryFee = 5; // Taxa de entrega fixa (pode vir das configurações)
  const finalTotal = total + deliveryFee;

  if (!isOpen) return null;

  return (
    <div className={cn("fixed inset-0 z-50 bg-black/50 backdrop-animate animate-fade-in", className)}>
      <div className="absolute inset-0" onClick={onClose} />
      
      {/* Container para animação slide-up com cantos arredondados */}
      <div className="absolute inset-x-0 bottom-0 w-full max-w-md mx-auto md:mx-0 md:right-4 md:bottom-4 md:top-auto md:max-w-lg md:w-[500px]">
        <div className="bg-white rounded-t-3xl md:rounded-3xl shadow-2xl transform transition-transform duration-300 ease-out animate-slide-up max-h-[90vh] md:max-h-[80vh] flex flex-col">
          {/* Handle indicator para mobile */}
          <div className="md:hidden flex justify-center pt-3 pb-1">
            <div className="w-12 h-1 bg-gray-300 rounded-full"></div>
          </div>
              {/* Header */}
          <div className="flex items-center justify-between p-4 md:p-6 border-b flex-shrink-0">
            <div className="flex items-center gap-3 md:gap-4">
              <ShoppingCart className="w-5 h-5 md:w-6 md:h-6 text-orange-600" />
              <h2 className="text-lg md:text-xl font-semibold">Carrinho</h2>
              <Badge variant="secondary" className="bg-orange-100 text-orange-800 text-sm md:text-base">
                {items.length} {items.length === 1 ? 'item' : 'itens'}
              </Badge>
            </div>
            <button
              onClick={onClose}
              className="p-2 md:p-3 hover:bg-gray-100 rounded-full transition-smooth"
            >
              <X className="w-5 h-5 md:w-6 md:h-6" />
            </button>
          </div>
          
          {/* Lista de itens */}
          <div className="flex-1 overflow-y-auto p-4 min-h-0">
            {items.length === 0 ? (
              <div className="flex flex-col items-center justify-center h-full text-gray-500 animate-fade-in">
                <ShoppingCart className="w-16 h-16 mb-4 text-gray-300" />
                <p className="text-lg font-medium">Carrinho vazio</p>
                <p className="text-sm text-center">Adicione produtos para começar</p>
              </div>
            ) : (
              <div className="space-y-4">
                {items.map((item) => (
                  <Card key={item.id} className="border-gray-200 animate-scale-in">
                    <CardContent className="p-4">
                      <div className="flex gap-4 md:gap-5">
                        {/* Imagem do produto */}
                        <div className="w-16 h-16 md:w-20 md:h-20 bg-gray-100 rounded-lg flex-shrink-0 overflow-hidden">
                          {item.image_url ? (
                            <img
                              src={item.image_url}
                              alt={item.name}
                              className="w-full h-full object-cover transition-smooth hover:scale-105"
                              onError={(e) => {
                                e.currentTarget.src = '';
                                e.currentTarget.className = 'hidden';
                              }}
                            />
                          ) : null}
                          {!item.image_url && (
                            <div className="w-full h-full flex items-center justify-center">
                              <span className="text-2xl md:text-3xl">🍽️</span>
                            </div>
                          )}
                        </div>
                        
                        {/* Informações do produto */}
                        <div className="flex-1 min-w-0">
                          <div className="flex items-start justify-between mb-2">
                            <h3 className="font-medium text-gray-900 truncate text-base md:text-lg">{item.name}</h3>
                            <button
                              onClick={() => removeItem(item.id)}
                              className="p-1 md:p-2 hover:bg-gray-100 rounded transition-smooth hover:scale-110"
                            >
                              <Trash2 className="w-4 h-4 md:w-5 md:h-5 text-red-500" />
                            </button>
                          </div>
                          
                          {item.observations && (
                            <p className="text-xs md:text-sm text-gray-500 mb-3">{item.observations}</p>
                          )}
                          
                          <div className="flex items-center justify-between">
                            {/* Controles de quantidade */}
                            <div className="flex items-center gap-2 md:gap-3">
                              <button
                                onClick={() => handleQuantityChange(item.id, item.quantity - 1)}
                                className="w-8 h-8 md:w-10 md:h-10 rounded-full bg-gray-100 flex items-center justify-center hover:bg-gray-200 transition-smooth"
                              >
                                <Minus className="w-3 h-3 md:w-4 md:h-4" />
                              </button>
                              
                              <span className="text-sm md:text-base font-medium w-8 md:w-10 text-center">
                                {item.quantity}
                              </span>
                              
                              <button
                                onClick={() => handleQuantityChange(item.id, item.quantity + 1)}
                                className="w-8 h-8 md:w-10 md:h-10 rounded-full bg-gray-100 flex items-center justify-center hover:bg-gray-200 transition-smooth"
                              >
                                <Plus className="w-3 h-3 md:w-4 md:h-4" />
                              </button>
                            </div>
                            
                            {/* Preço */}
                            <span className="text-sm md:text-base font-semibold text-gray-900">
                              R$ {(item.price * item.quantity).toFixed(2)}
                            </span>
                          </div>
                        </div>
                      </div>
                    </CardContent>
                  </Card>
                ))}
              </div>
            )}
          </div>
          
          {/* Resumo e botões */}
          {items.length > 0 && (
            <div className="border-t bg-gray-50 p-4 md:p-6 space-y-4 md:space-y-5 animate-fade-in flex-shrink-0 rounded-b-3xl md:rounded-b-none">
              {/* Resumo */}
              <div className="space-y-3">
                <div className="flex justify-between text-sm md:text-base">
                  <span>Subtotal</span>
                  <span>R$ {total.toFixed(2)}</span>
                </div>
                <div className="flex justify-between text-sm md:text-base">
                  <span>Taxa de entrega</span>
                  <span>R$ {deliveryFee.toFixed(2)}</span>
                </div>
                <div className="flex justify-between font-semibold text-lg md:text-xl border-t pt-3">
                  <span>Total</span>
                  <span className="text-orange-600">R$ {finalTotal.toFixed(2)}</span>
                </div>
              </div>
              
              {/* Informações de entrega */}
              <div className="flex items-center gap-2 text-sm md:text-base text-gray-600">
                <MapPin className="w-4 h-4 md:w-5 md:h-5" />
                <span>Entrega em até 40 minutos</span>
              </div>
              
              {/* Botões */}
              <div className="space-y-3">
                <Button
                  onClick={handleCheckout}
                  className="w-full bg-orange-500 hover:bg-orange-600 text-white py-3 md:py-4 font-semibold transition-smooth hover:shadow-lg text-base md:text-lg"
                  disabled={isCheckingOut}
                >
                  <CreditCard className="w-4 h-4 md:w-5 md:h-5 mr-2" />
                  Finalizar Pedido
                </Button>
                
                <Button
                  onClick={() => {
                    clearCart();
                    toast({
                      title: 'Carrinho limpo',
                      description: 'Todos os produtos foram removidos.'
                    });
                  }}
                  variant="outline"
                  className="w-full border-red-300 text-red-600 hover:bg-red-50 py-3 md:py-4 transition-smooth text-base md:text-lg"
                >
                  <Trash2 className="w-4 h-4 md:w-5 md:h-5 mr-2" />
                  Limpar Carrinho
                </Button>
              </div>
            </div>
          )}
        </div>
      </div>
      
      <style jsx>{`
        @keyframes slide-right {
          from {
            transform: translateX(100%);
          }
          to {
            transform: translateX(0);
          }
        }
        
        .animate-slide-right {
          animation: slide-right 0.3s ease-out;
        }
        /* Animação slide-up para o carrinho */
        @keyframes slide-up {
          from {
            transform: translateY(100%);
          }
          to {
            transform: translateY(0);
          }
        }
        .animate-slide-up {
          animation: slide-up 0.3s ease-out;
        }
      `}</style>
    </div>
  );
};