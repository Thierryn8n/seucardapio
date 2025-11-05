import React, { useState } from 'react';
import { Card, CardContent } from '@/components/ui/card';
import { Button } from '@/components/ui/button';
import { Badge } from '@/components/ui/badge';
import { ShoppingCart, Plus, Minus, X, Package, Star, Clock } from 'lucide-react';
import { cn } from '@/lib/utils';
import { useCart } from '@/hooks/useCart';
import { useToast } from '@/hooks/use-toast';

interface TransformedProduct {
  id: string;
  name: string;
  description: string;
  price: number;
  promotionalPrice?: number;
  image_url?: string;
  category: string;
  rating?: number;
  preparation_time?: string;
}

interface TransformedProductCardProps {
  product: TransformedProduct;
  onClose: () => void;
  className?: string;
}

export const TransformedProductCard: React.FC<TransformedProductCardProps> = ({
  product,
  onClose,
  className
}) => {
  const [quantity, setQuantity] = useState(1);
  const [observations, setObservations] = useState('');
  const [showObservations, setShowObservations] = useState(false);
  const { addItem, items } = useCart();
  const { toast } = useToast();

  const currentPrice = product.promotionalPrice || product.price;
  const isOnSale = product.promotionalPrice && product.promotionalPrice < product.price;
  const discount = isOnSale ? Math.round(((product.price - product.promotionalPrice) / product.price) * 100) : 0;

  const handleAddToCart = () => {
    addItem({
      productId: product.id,
      name: product.name,
      description: product.description,
      price: currentPrice,
      quantity,
      image_url: product.image_url,
      category: product.category,
      observations: observations || undefined
    });
    
    toast({
      title: 'Adicionado ao carrinho!',
      description: `${product.name} foi adicionado ao seu carrinho.`,
    });
    
    onClose();
  };

  const incrementQuantity = () => setQuantity(prev => prev + 1);
  const decrementQuantity = () => setQuantity(prev => Math.max(1, prev - 1));

  return (
    <div className={cn("fixed inset-0 z-50 bg-black/50 backdrop-blur-sm", className)}>
      <div className="absolute inset-0" onClick={onClose} />
      
      <div className="absolute bottom-0 left-0 right-0 bg-white rounded-t-3xl shadow-2xl transform transition-transform duration-300 ease-out animate-slide-up">
        <div className="relative">
          {/* Header com imagem */}
          <div className="relative h-64 bg-gradient-to-br from-orange-100 to-amber-100 rounded-t-3xl overflow-hidden">
            {product.image_url ? (
              <img
                src={product.image_url}
                alt={product.name}
                className="w-full h-full object-cover"
                onError={(e) => {
                  (e.target as HTMLImageElement).src = '';
                  e.currentTarget.className = 'hidden';
                }}
              />
            ) : null}
            
            {!product.image_url && (
              <div className="flex items-center justify-center h-full">
                <Package className="w-20 h-20 text-orange-300" />
              </div>
            )}
            
            {/* Badge de desconto */}
            {isOnSale && (
              <div className="absolute top-4 right-4 bg-red-500 text-white px-3 py-1 rounded-full text-sm font-bold">
                -{discount}%
              </div>
            )}
            
            {/* Botão de fechar */}
            <button
              onClick={onClose}
              className="absolute top-4 left-4 bg-white/90 backdrop-blur-sm rounded-full p-2 shadow-lg hover:bg-white transition-colors"
            >
              <X className="w-5 h-5 text-gray-700" />
            </button>
          </div>
          
          {/* Conteúdo */}
          <div className="p-6">
            <div className="flex items-start justify-between mb-4">
              <div className="flex-1">
                <h2 className="text-2xl font-bold text-gray-900 mb-2">{product.name}</h2>
                <p className="text-gray-600 mb-4">{product.description}</p>
                
                <div className="flex items-center gap-4 mb-4">
                  {product.rating && (
                    <div className="flex items-center gap-1">
                      <Star className="w-4 h-4 text-yellow-400 fill-current" />
                      <span className="text-sm text-gray-600">{product.rating}</span>
                    </div>
                  )}
                  
                  {product.preparation_time && (
                    <div className="flex items-center gap-1 text-sm text-gray-600">
                      <span>⏱️</span>
                      <span>{product.preparation_time}</span>
                    </div>
                  )}
                  
                  <Badge variant="outline" className="text-xs">
                    {product.category}
                  </Badge>
                </div>
              </div>
            </div>
            
            {/* Preço */}
            <div className="mb-6">
              {isOnSale ? (
                <div className="flex items-center gap-3">
                  <span className="text-3xl font-bold text-green-600">
                    R$ {currentPrice.toFixed(2)}
                  </span>
                  <span className="text-lg text-gray-400 line-through">
                    R$ {product.price.toFixed(2)}
                  </span>
                </div>
              ) : (
                <span className="text-3xl font-bold text-green-600">
                  R$ {currentPrice.toFixed(2)}
                </span>
              )}
            </div>
            
            {/* Observações */}
            <div className="mb-6">
              <button
                onClick={() => setShowObservations(!showObservations)}
                className="text-sm text-orange-600 hover:text-orange-700 underline"
              >
                {showObservations ? 'Ocultar' : 'Adicionar'} observações
              </button>
              
              {showObservations && (
                <textarea
                  value={observations}
                  onChange={(e) => setObservations(e.target.value)}
                  placeholder="Ex: Sem cebola, bem passado, etc."
                  className="w-full mt-2 p-3 border border-gray-200 rounded-lg resize-none focus:ring-2 focus:ring-orange-500 focus:border-transparent"
                  rows={3}
                />
              )}
            </div>
            
            {/* Quantidade */}
            <div className="mb-6">
              <label className="block text-sm font-medium text-gray-700 mb-2">
                Quantidade
              </label>
              <div className="flex items-center gap-3">
                <button
                  onClick={decrementQuantity}
                  className="w-10 h-10 rounded-full bg-gray-100 flex items-center justify-center hover:bg-gray-200 transition-colors"
                >
                  <Minus className="w-4 h-4" />
                </button>
                
                <span className="text-xl font-semibold w-12 text-center">{quantity}</span>
                
                <button
                  onClick={incrementQuantity}
                  className="w-10 h-10 rounded-full bg-gray-100 flex items-center justify-center hover:bg-gray-200 transition-colors"
                >
                  <Plus className="w-4 h-4" />
                </button>
              </div>
            </div>
            
            {/* Botões de ação */}
            <div className="space-y-3">
              <Button
                onClick={handleAddToCart}
                className="w-full bg-orange-500 hover:bg-orange-600 text-white py-4 text-lg font-semibold"
              >
                <ShoppingCart className="w-5 h-5 mr-2" />
                Adicionar ao Carrinho
              </Button>
              
              <Button
                onClick={onClose}
                variant="outline"
                className="w-full border-gray-300 text-gray-700 py-4"
              >
                Continuar Comprando
              </Button>
            </div>
          </div>
        </div>
      </div>
      
      <style jsx>{`
        @keyframes slide-up {
          from {
            transform: translateY(100%);
          }
          to {
            transform: translateY(0);
          }
        }
        
        @keyframes fade-in {
          from {
            opacity: 0;
          }
          to {
            opacity: 1;
          }
        }
        
        @keyframes scale-in {
          from {
            transform: scale(0.95);
            opacity: 0;
          }
          to {
            transform: scale(1);
            opacity: 1;
          }
        }
        
        .animate-slide-up {
          animation: slide-up 0.3s ease-out;
        }
        
        .animate-fade-in {
          animation: fade-in 0.3s ease-out forwards;
        }
        
        .animate-scale-in {
          animation: scale-in 0.3s ease-out forwards;
        }
        
        .transition-smooth {
          transition: all 0.2s ease-in-out;
        }
        
        .backdrop-animate {
          animation: fade-in 0.2s ease-out;
        }
      `}</style>
    </div>
  );
};