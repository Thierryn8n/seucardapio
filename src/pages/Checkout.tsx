import React, { useState, useEffect } from 'react';
import { useLocation, useNavigate } from 'react-router-dom';
import { useCart, CartProvider } from '@/hooks/useCart';
import { useAuth } from '@/contexts/AuthContext';
import { useToast } from '@/hooks/use-toast';
import { mercadoPagoService } from '@/integrations/mercadopago/mercadopago.service';
import { supabase } from '@/integrations/supabase/client';
import { Button } from '@/components/ui/button';
import { Input } from '@/components/ui/input';
import { Label } from '@/components/ui/label';
import { Card, CardContent, CardHeader, CardTitle } from '@/components/ui/card';
import { Separator } from '@/components/ui/separator';
import { Loader2, CreditCard, User, Phone, MapPin, Mail } from 'lucide-react';

interface LocationState {
  cart?: any[];
  total?: number;
}

const Checkout: React.FC = () => {
  const location = useLocation();
  const navigate = useNavigate();
  const { user } = useAuth();
  const { toast } = useToast();
  const { items: cartItems, total: cartTotal, clearCart } = useCart();
  
  const [isLoading, setIsLoading] = useState(false);
  const [formData, setFormData] = useState({
    name: user?.name || '',
    email: user?.email || '',
    phone: '',
    address: '',
    number: '',
    complement: '',
    neighborhood: '',
    city: '',
    state: '',
    zipCode: '',
  });

  const state = location.state as LocationState;
  const items = state?.cart || cartItems;
  const total = state?.total || cartTotal;

  console.log('Location state:', state);
  console.log('Items:', items);
  console.log('Total:', total);

  useEffect(() => {
    console.log('Checkout useEffect - items:', items);
    if (!items || items.length === 0) {
      console.log('Carrinho vazio, redirecionando...');
      toast({
        title: 'Carrinho vazio',
        description: 'Adicione itens ao carrinho antes de prosseguir com o checkout.',
        variant: 'destructive',
      });
      navigate('/');
    }
  }, [items, navigate, toast]);

  const handleInputChange = (e: React.ChangeEvent<HTMLInputElement>) => {
    const { name, value } = e.target;
    setFormData(prev => ({ ...prev, [name]: value }));
  };

  const formatPhone = (value: string) => {
    const cleaned = value.replace(/\D/g, '');
    if (cleaned.length <= 10) {
      return cleaned.replace(/(\d{2})(\d{4})(\d{0,4})/, '($1) $2-$3');
    }
    return cleaned.replace(/(\d{2})(\d{5})(\d{0,4})/, '($1) $2-$3');
  };

  const formatZipCode = (value: string) => {
    const cleaned = value.replace(/\D/g, '');
    return cleaned.replace(/(\d{5})(\d{0,3})/, '$1-$2');
  };

  const validateForm = () => {
    const requiredFields = ['name', 'email', 'phone', 'address', 'number', 'neighborhood', 'city', 'state', 'zipCode'];
    const missingFields = requiredFields.filter(field => !formData[field as keyof typeof formData]);
    
    if (missingFields.length > 0) {
      toast({
        title: 'Campos obrigatórios',
        description: `Por favor, preencha todos os campos obrigatórios.`,
        variant: 'destructive',
      });
      return false;
    }

    const emailRegex = /^[^\s@]+@[^\s@]+\.[^\s@]+$/;
    if (!emailRegex.test(formData.email)) {
      toast({
        title: 'Email inválido',
        description: 'Por favor, insira um email válido.',
        variant: 'destructive',
      });
      return false;
    }

    return true;
  };

  const handleSubmit = async (e: React.FormEvent) => {
    e.preventDefault();
    
    if (!validateForm()) return;
    
    setIsLoading(true);

    try {
      // Criar descrição do pedido
      const description = items.map((item: any) => 
        `${item.quantity}x ${item.name || item.item?.name}`
      ).join(', ');

      // Gerar ID único para o pedido
      const orderId = `order-${Date.now()}-${Math.random().toString(36).substr(2, 9)}`;

      // Criar pagamento no Mercado Pago
      const paymentData = await mercadoPagoService.createPayment({
        amount: total,
        description: `Pedido ${orderId} - ${description}`,
        payerEmail: formData.email,
        payerName: formData.name,
        externalReference: orderId,
      });

      // Salvar pedido no banco de dados
      const { error: orderError } = await supabase
        .from('orders')
        .insert({
          id: orderId,
          user_id: user?.id,
          customer_name: formData.name,
          customer_email: formData.email,
          customer_phone: formData.phone,
          customer_address: `${formData.address}, ${formData.number}${formData.complement ? ` - ${formData.complement}` : ''}`,
          customer_neighborhood: formData.neighborhood,
          customer_city: formData.city,
          customer_state: formData.state,
          customer_zipcode: formData.zipCode.replace('-', ''),
          total_amount: total,
          status: 'pending',
          payment_method: 'mercado_pago',
          mercado_pago_preference_id: paymentData.id,
          items: items.map((item: any) => ({
            id: item.id,
            name: item.name || item.item?.name,
            quantity: item.quantity,
            price: item.price || item.item?.price,
            observations: item.observations,
          })),
        });

      if (orderError) {
        throw new Error('Erro ao salvar pedido');
      }

      // Limpar carrinho
      clearCart();

      // Redirecionar para o Mercado Pago
      window.location.href = paymentData.init_point;

    } catch (error) {
      console.error('Erro ao processar checkout:', error);
      toast({
        title: 'Erro no checkout',
        description: 'Ocorreu um erro ao processar seu pedido. Tente novamente.',
        variant: 'destructive',
      });
    } finally {
      setIsLoading(false);
    }
  };

  return (
    <div className="min-h-screen bg-gray-50 py-8">
      <div className="max-w-4xl mx-auto px-4 sm:px-6 lg:px-8">
        <div className="mb-8">
          <h1 className="text-3xl font-bold text-gray-900">Finalizar Pedido</h1>
          <p className="mt-2 text-gray-600">Preencha seus dados para concluir o pedido</p>
        </div>

        <div className="grid grid-cols-1 lg:grid-cols-2 gap-8">
          {/* Formulário de Dados */}
          <div className="space-y-6">
            <Card>
              <CardHeader>
                <CardTitle className="flex items-center">
                  <User className="h-5 w-5 mr-2" />
                  Dados Pessoais
                </CardTitle>
              </CardHeader>
              <CardContent className="space-y-4">
                <div>
                  <Label htmlFor="name">Nome completo *</Label>
                  <Input
                    id="name"
                    name="name"
                    value={formData.name}
                    onChange={handleInputChange}
                    required
                  />
                </div>
                
                <div>
                  <Label htmlFor="email">Email *</Label>
                  <div className="relative">
                    <Mail className="absolute left-3 top-3 h-4 w-4 text-gray-400" />
                    <Input
                      id="email"
                      name="email"
                      type="email"
                      value={formData.email}
                      onChange={handleInputChange}
                      className="pl-10"
                      required
                    />
                  </div>
                </div>
                
                <div>
                  <Label htmlFor="phone">Telefone *</Label>
                  <div className="relative">
                    <Phone className="absolute left-3 top-3 h-4 w-4 text-gray-400" />
                    <Input
                      id="phone"
                      name="phone"
                      value={formData.phone}
                      onChange={(e) => setFormData(prev => ({ 
                        ...prev, 
                        phone: formatPhone(e.target.value) 
                      }))}
                      className="pl-10"
                      placeholder="(00) 00000-0000"
                      maxLength={15}
                      required
                    />
                  </div>
                </div>
              </CardContent>
            </Card>

            <Card>
              <CardHeader>
                <CardTitle className="flex items-center">
                  <MapPin className="h-5 w-5 mr-2" />
                  Endereço de Entrega
                </CardTitle>
              </CardHeader>
              <CardContent className="space-y-4">
                <div>
                  <Label htmlFor="address">Rua *</Label>
                  <Input
                    id="address"
                    name="address"
                    value={formData.address}
                    onChange={handleInputChange}
                    required
                  />
                </div>
                
                <div className="grid grid-cols-2 gap-4">
                  <div>
                    <Label htmlFor="number">Número *</Label>
                    <Input
                      id="number"
                      name="number"
                      value={formData.number}
                      onChange={handleInputChange}
                      required
                    />
                  </div>
                  <div>
                    <Label htmlFor="complement">Complemento</Label>
                    <Input
                      id="complement"
                      name="complement"
                      value={formData.complement}
                      onChange={handleInputChange}
                    />
                  </div>
                </div>
                
                <div>
                  <Label htmlFor="neighborhood">Bairro *</Label>
                  <Input
                    id="neighborhood"
                    name="neighborhood"
                    value={formData.neighborhood}
                    onChange={handleInputChange}
                    required
                  />
                </div>
                
                <div className="grid grid-cols-2 gap-4">
                  <div>
                    <Label htmlFor="city">Cidade *</Label>
                    <Input
                      id="city"
                      name="city"
                      value={formData.city}
                      onChange={handleInputChange}
                      required
                    />
                  </div>
                  <div>
                    <Label htmlFor="state">Estado *</Label>
                    <Input
                      id="state"
                      name="state"
                      value={formData.state}
                      onChange={handleInputChange}
                      placeholder="UF"
                      maxLength={2}
                      required
                    />
                  </div>
                </div>
                
                <div>
                  <Label htmlFor="zipCode">CEP *</Label>
                  <Input
                    id="zipCode"
                    name="zipCode"
                    value={formData.zipCode}
                    onChange={(e) => setFormData(prev => ({ 
                      ...prev, 
                      zipCode: formatZipCode(e.target.value) 
                    }))}
                    placeholder="00000-000"
                    maxLength={9}
                    required
                  />
                </div>
              </CardContent>
            </Card>
          </div>

          {/* Resumo do Pedido */}
          <div className="space-y-6">
            <Card>
              <CardHeader>
                <CardTitle>Resumo do Pedido</CardTitle>
              </CardHeader>
              <CardContent>
                <div className="space-y-4">
                  {items.map((item: any, index: number) => (
                    <div key={index} className="flex justify-between items-start">
                      <div className="flex-1">
                        <p className="font-medium">
                          {item.quantity}x {item.name || item.item?.name}
                        </p>
                        {item.observations && (
                          <p className="text-sm text-gray-600">Obs: {item.observations}</p>
                        )}
                      </div>
                      <p className="font-medium">
                        R$ {((item.price || item.item?.price) * item.quantity).toFixed(2)}
                      </p>
                    </div>
                  ))}
                  
                  <Separator />
                  
                  <div className="flex justify-between items-center text-lg font-bold">
                    <span>Total</span>
                    <span>R$ {total.toFixed(2)}</span>
                  </div>
                </div>
              </CardContent>
            </Card>

            <Button
              type="submit"
              className="w-full bg-orange-500 hover:bg-orange-600 text-white"
              size="lg"
              disabled={isLoading}
              onClick={handleSubmit}
            >
              {isLoading ? (
                <>
                  <Loader2 className="mr-2 h-4 w-4 animate-spin" />
                  Processando...
                </>
              ) : (
                <>
                  <CreditCard className="mr-2 h-4 w-4" />
                  Finalizar Pedido
                </>
              )}
            </Button>

            <p className="text-xs text-gray-500 text-center">
              Você será redirecionado para o Mercado Pago para concluir o pagamento de forma segura.
            </p>
          </div>
        </div>
      </div>
    </div>
  );
};

const CheckoutWrapper: React.FC = () => {
  return (
    <CartProvider>
      <Checkout />
    </CartProvider>
  );
};

export default CheckoutWrapper;