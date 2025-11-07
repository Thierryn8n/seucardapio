import React, { useState, useEffect } from 'react';
import { Card, CardContent } from '@/components/ui/card';
import { Button } from '@/components/ui/button';
import { Badge } from '@/components/ui/badge';
import { ShoppingCart, Plus, Minus, X, Package, Star, Clock } from 'lucide-react';
import { cn } from '@/lib/utils';
import { useCart } from '@/hooks/useCart';
import { useToast } from '@/hooks/use-toast';
import { useProductOptions, ProductOptionGroup, ProductOption } from '@/hooks/useProductOptions';

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

interface SelectedOption {
  groupId: string;
  optionId: string;
  name: string;
  additionalPrice: number;
}

interface TransformedProductCardProps {
  product: TransformedProduct;
  onClose: () => void;
  className?: string;
  cartEnabled?: boolean;
}

export const TransformedProductCard: React.FC<TransformedProductCardProps> = ({
  product,
  onClose,
  className,
  cartEnabled = true
}) => {
  const [quantity, setQuantity] = useState(1);
  const [observations, setObservations] = useState('');
  const [showObservations, setShowObservations] = useState(false);
  const [selectedOptions, setSelectedOptions] = useState<SelectedOption[]>([]);
  const { addItem, items } = useCart();
  const { toast } = useToast();
  const { optionGroups, loading: loadingOptions, loadOptionGroups } = useProductOptions();

  const currentPrice = product.promotionalPrice || product.price;
  const isOnSale = product.promotionalPrice && product.promotionalPrice < product.price;
  const discount = isOnSale ? Math.round(((product.price - product.promotionalPrice) / product.price) * 100) : 0;

  // Carregar opções do produto ao montar o componente
  useEffect(() => {
    loadOptionGroups(product.id);
  }, [product.id]);

  // Calcular preço total com base nas opções selecionadas
  const totalPrice = currentPrice + selectedOptions.reduce((sum, option) => sum + option.additionalPrice, 0);

  const handleAddToCart = () => {
    // Validar seleções obrigatórias e regras de mínimo/máximo
    const validationErrors: string[] = [];
    
    optionGroups.forEach(group => {
      const groupSelections = selectedOptions.filter(option => option.groupId === group.id);
      
      // Validar obrigatório
      if (group.required && groupSelections.length === 0) {
        validationErrors.push(`Selecione pelo menos uma opção de "${group.name}"`);
      }
      
      // Validar mínimo
      if (group.min_selections > 0 && groupSelections.length < group.min_selections) {
        validationErrors.push(`"${group.name}" requer no mínimo ${group.min_selections} seleção(ões)`);
      }
      
      // Validar máximo
      if (group.max_selections > 0 && groupSelections.length > group.max_selections) {
        validationErrors.push(`"${group.name}" permite no máximo ${group.max_selections} seleção(ões)`);
      }
    });

    if (validationErrors.length > 0) {
      toast({
        title: 'Seleções inválidas',
        description: validationErrors.join('. '),
        variant: 'destructive',
      });
      return;
    }

    // Criar descrição com opções selecionadas
    let fullDescription = product.description;
    if (selectedOptions.length > 0) {
      const optionsDescription = selectedOptions.map(opt => opt.name).join(', ');
      fullDescription += ` (${optionsDescription})`;
    }

    addItem({
      productId: product.id,
      name: product.name,
      description: fullDescription,
      price: totalPrice,
      quantity,
      image_url: product.image_url,
      category: product.category,
      observations: observations || undefined,
      selectedOptions: selectedOptions
    });
    
    toast({
      title: 'Adicionado ao carrinho!',
      description: `${product.name} foi adicionado ao seu carrinho.`,
    });
    
    onClose();
  };

  const incrementQuantity = () => setQuantity(prev => prev + 1);
  const decrementQuantity = () => setQuantity(prev => Math.max(1, prev - 1));

  const handleOptionSelect = (group: ProductOptionGroup, option: ProductOption) => {
    setSelectedOptions(prev => {
      // Verificar se já atingiu o máximo de seleções para este grupo
      const currentGroupSelections = prev.filter(opt => opt.groupId === group.id);
      
      // Se já atingiu o máximo e tem limite definido, não adicionar mais
      if (group.max_selections > 0 && currentGroupSelections.length >= group.max_selections) {
        return prev;
      }
      
      // Se max_selections for 1 (ou não definido), substituir a seleção atual
      if (group.max_selections === 1) {
        const filtered = prev.filter(opt => opt.groupId !== group.id);
        return [...filtered, {
          groupId: group.id!,
          optionId: option.id!,
          name: option.name,
          additionalPrice: option.additional_price
        }];
      }
      
      // Se permitir múltiplas seleções, adicionar sem remover as existentes
      return [...prev, {
        groupId: group.id!,
        optionId: option.id!,
        name: option.name,
        additionalPrice: option.additional_price
      }];
    });
  };

  const handleOptionDeselect = (groupId: string, optionId: string) => {
    setSelectedOptions(prev => prev.filter(opt => !(opt.groupId === groupId && opt.optionId === optionId)));
  };

  const isOptionSelected = (groupId: string, optionId: string) => {
    return selectedOptions.some(opt => opt.groupId === groupId && opt.optionId === optionId);
  };

  return (
    <div className={cn("fixed inset-0 z-50 bg-black/50 backdrop-blur-sm flex items-end sm:items-center justify-center", className)}>
      <div className="absolute inset-0" onClick={onClose} />
      
      <div className={cn(
        "relative w-full bg-white rounded-t-3xl shadow-2xl transform transition-all duration-300 ease-out max-h-[90vh] overflow-y-auto sm:rounded-3xl sm:max-w-lg md:max-w-2xl lg:max-w-3xl",
        "animate-slide-up sm:animate-scale-in"
      )}>
        <div className="relative">
          {/* Header com imagem */}
          <div className="relative h-48 sm:h-56 md:h-64 lg:h-72 bg-gradient-to-br from-orange-100 to-amber-100 rounded-t-3xl sm:rounded-t-3xl overflow-hidden">
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
                <Package className="w-16 h-16 sm:w-20 sm:h-20 text-orange-300" />
              </div>
            )}
            
            {/* Badge de desconto */}
            {isOnSale && (
              <div className="absolute top-3 right-3 sm:top-4 sm:right-4 bg-red-500 text-white px-2 py-1 sm:px-3 sm:py-1 rounded-full text-xs sm:text-sm font-bold">
                -{discount}%
              </div>
            )}
            
            {/* Botão de fechar */}
            <button
              onClick={onClose}
              className="absolute top-3 left-3 sm:top-4 sm:left-4 bg-white/90 backdrop-blur-sm rounded-full p-1.5 sm:p-2 shadow-lg hover:bg-white transition-colors"
            >
              <X className="w-4 h-4 sm:w-5 sm:h-5 text-gray-700" />
            </button>
          </div>
          
          {/* Conteúdo */}
          <div className="p-4 sm:p-6">
            <div className="flex items-start justify-between mb-3 sm:mb-4">
              <div className="flex-1">
                <h2 className="text-xl sm:text-2xl font-bold text-gray-900 mb-1 sm:mb-2">{product.name}</h2>
                <p className="text-sm sm:text-base text-gray-600 mb-3 sm:mb-4">{product.description}</p>
                
                <div className="flex items-center gap-2 sm:gap-4 mb-3 sm:mb-4">
                  {product.rating && (
                    <div className="flex items-center gap-1">
                      <Star className="w-3 h-3 sm:w-4 sm:h-4 text-yellow-400 fill-current" />
                      <span className="text-xs sm:text-sm text-gray-600">{product.rating}</span>
                    </div>
                  )}
                  
                  {product.preparation_time && (
                    <div className="flex items-center gap-1 text-xs sm:text-sm text-gray-600">
                      <span>⏱️</span>
                      <span>{product.preparation_time}</span>
                    </div>
                  )}
                  
                  <Badge variant="outline" className="text-[10px] sm:text-xs">
                    {product.category}
                  </Badge>
                </div>
              </div>
            </div>
            
            {/* Preço */}
            <div className="mb-4 sm:mb-6">
              {isOnSale ? (
                <div className="flex items-center gap-2 sm:gap-3">
                  <span className="text-2xl sm:text-3xl font-bold text-green-600">
                    R$ {totalPrice.toFixed(2)}
                  </span>
                  <span className="text-base sm:text-lg text-gray-400 line-through">
                    R$ {product.price.toFixed(2)}
                  </span>
                </div>
              ) : (
                <span className="text-2xl sm:text-3xl font-bold text-green-600">
                  R$ {totalPrice.toFixed(2)}
                </span>
              )}
            </div>

            {/* Opções Personalizáveis */}
            {loadingOptions ? (
              <div className="mb-4 sm:mb-6">
                <div className="flex items-center justify-center py-4">
                  <div className="animate-spin rounded-full h-5 sm:h-6 w-5 sm:w-6 border-b-2 border-primary"></div>
                </div>
              </div>
            ) : optionGroups.length > 0 ? (
              <div className="mb-4 sm:mb-6 space-y-3 sm:space-y-4">
                <h3 className="text-base sm:text-lg font-semibold text-gray-900">Opções Personalizáveis</h3>
                {optionGroups.map((group) => (
                  <div key={group.id} className="border border-gray-200 rounded-lg p-3 sm:p-4">
                    <div className="flex items-center justify-between mb-2 sm:mb-3">
                      <h4 className="text-sm sm:text-base font-medium text-gray-900">{group.name}</h4>
                      {group.required && (
                        <Badge variant="destructive" className="text-[10px] sm:text-xs">Obrigatório</Badge>
                      )}
                    </div>
                    <p className="text-xs sm:text-sm text-gray-600 mb-2 sm:mb-3">
                      {group.min_selections > 0 && `Mínimo: ${group.min_selections}`}
                      {group.max_selections > 0 && ` Máximo: ${group.max_selections}`}
                    </p>
                    <div className="space-y-1 sm:space-y-2">
                      {group.options?.map((option) => (
                        <div
                          key={option.id}
                          className={cn(
                            "flex items-center justify-between p-2 sm:p-3 border rounded-lg cursor-pointer transition-colors",
                            isOptionSelected(group.id!, option.id!)
                              ? "border-orange-500 bg-orange-50"
                              : "border-gray-200 hover:border-gray-300"
                          )}
                          onClick={() => {
                            if (isOptionSelected(group.id!, option.id!)) {
                              handleOptionDeselect(group.id!, option.id!);
                            } else {
                              handleOptionSelect(group, option);
                            }
                          }}
                        >
                          <div className="flex items-center">
                            <div className={cn(
                              "w-3 h-3 sm:w-4 sm:h-4 mr-2 sm:mr-3 flex items-center justify-center",
                              group.max_selections === 1 ? "rounded-full border-2" : "rounded border",
                              isOptionSelected(group.id!, option.id!)
                                ? group.max_selections === 1 
                                  ? "border-orange-500 bg-orange-500"
                                  : "border-orange-500 bg-orange-500 rounded"
                                : "border-gray-300"
                            )}>
                              {isOptionSelected(group.id!, option.id!) && (
                                <div className={cn(
                                  "bg-white",
                                  group.max_selections === 1 ? "w-1.5 h-1.5 sm:w-2 sm:h-2 rounded-full" : "w-2 h-2 sm:w-2.5 sm:h-2.5 rounded"
                                )}></div>
                              )}
                            </div>
                            <span className="text-sm sm:font-medium">{option.name}</span>
                          </div>
                          <div className="text-right">
                            {option.additional_price > 0 && (
                              <span className="text-xs sm:text-sm font-semibold text-green-600">
                                + R$ {option.additional_price.toFixed(2)}
                              </span>
                            )}
                            {option.additional_price === 0 && (
                              <span className="text-xs sm:text-sm text-gray-500">Incluído</span>
                            )}
                          </div>
                        </div>
                      ))}
                    </div>
                  </div>
                ))}
              </div>
            ) : null}
            
            {/* Observações */}
            <div className="mb-4 sm:mb-6">
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
                  className="w-full mt-2 p-2 sm:p-3 border border-gray-200 rounded-lg resize-none focus:ring-2 focus:ring-orange-500 focus:border-transparent"
                  rows={2}
                />
              )}
            </div>
            
            {/* Quantidade */}
            <div className="mb-4 sm:mb-6">
              <label className="block text-sm font-medium text-gray-700 mb-2">
                Quantidade
              </label>
              <div className="flex items-center gap-2 sm:gap-3">
                <button
                  onClick={decrementQuantity}
                  className="w-8 h-8 sm:w-10 sm:h-10 rounded-full bg-gray-100 flex items-center justify-center hover:bg-gray-200 transition-colors"
                >
                  <Minus className="w-3 h-3 sm:w-4 sm:h-4" />
                </button>
                
                <span className="text-lg sm:text-xl font-semibold w-8 sm:w-12 text-center">{quantity}</span>
                
                <button
                  onClick={incrementQuantity}
                  className="w-8 h-8 sm:w-10 sm:h-10 rounded-full bg-gray-100 flex items-center justify-center hover:bg-gray-200 transition-colors"
                >
                  <Plus className="w-3 h-3 sm:w-4 sm:h-4" />
                </button>
              </div>
            </div>
            
            {/* Botões de ação */}
            <div className="space-y-2 sm:space-y-3">
              <Button
                onClick={handleAddToCart}
                disabled={!cartEnabled}
                className="w-full bg-orange-500 hover:bg-orange-600 text-white py-3 sm:py-4 text-base sm:text-lg font-semibold disabled:opacity-50 disabled:cursor-not-allowed"
              >
                <ShoppingCart className="w-4 h-4 sm:w-5 sm:h-5 mr-2" />
                {cartEnabled ? 'Adicionar ao Carrinho' : 'Carrinho Indisponível'}
              </Button>
              
              <Button
                onClick={onClose}
                variant="outline"
                className="w-full border-gray-300 text-gray-700 py-3 sm:py-4 text-sm sm:text-base"
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