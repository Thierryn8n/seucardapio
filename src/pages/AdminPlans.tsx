import { useNavigate } from "react-router-dom";
import { useAuth } from "@/contexts/AuthContext";
import { useSubscription } from "@/hooks/useSubscription";
import { usePlanValidation } from "@/hooks/usePlanValidation";
import { mercadoPagoService } from "@/integrations/mercadopago";
import { Card, CardContent, CardDescription, CardHeader, CardTitle } from "@/components/ui/card";
import { Button } from "@/components/ui/button";
import { Badge } from "@/components/ui/badge";
import { Check, CreditCard, Star, Crown, AlertCircle, RefreshCw } from "lucide-react";
import { useToast } from "@/hooks/use-toast";
import { useState } from "react";

const AdminPlans = () => {
  const navigate = useNavigate();
  const { user, loading, isAdmin, isAdminMaster, isAdminDelivery } = useAuth();
  const { subscription, isLoading } = useSubscription();
  const { isValid, planStatus, validatePlan } = usePlanValidation();
  const { toast } = useToast();
  const [isProcessingUpgrade, setIsProcessingUpgrade] = useState(false);

  useEffect(() => {
    if (user?.id) {
      fetchSubscription();
    }
  }, [user?.id]);

  useEffect(() => {
    if (user?.id) {
      validatePlan();
    }
  }, [user?.id]);

  if (loading || isLoading) {
    return (
      <div className="min-h-screen bg-gray-50 flex items-center justify-center">
        <div className="text-center">
          <div className="animate-spin rounded-full h-12 w-12 border-b-2 border-orange-500 mx-auto"></div>
          <p className="mt-4 text-gray-600">Carregando...</p>
        </div>
      </div>
    );
  }

  if (!user || !isAdmin) {
    return (
      <div className="min-h-screen bg-gray-50 flex items-center justify-center">
        <div className="text-center">
          <h1 className="text-2xl font-bold text-gray-900">Acesso Negado</h1>
          <p className="mt-2 text-gray-600">Você não tem permissão para acessar esta área.</p>
          <Button 
            onClick={() => navigate("/")}
            className="mt-4 bg-orange-500 hover:bg-orange-600"
          >
            Voltar para Home
          </Button>
        </div>
      </div>
    );
  }

  // Verificar se é admin master para acessar esta página
  if (!isAdminMaster) {
    return (
      <div className="min-h-screen bg-gray-50 flex items-center justify-center">
        <div className="text-center">
          <h1 className="text-2xl font-bold text-gray-900">Acesso Restrito</h1>
          <p className="mt-2 text-gray-600">
            {isAdminDelivery ? "❌ Admin não consegue ver configurações de outros usuários" : "Apenas administradores master podem acessar esta página."}
          </p>
          <Button 
            onClick={() => navigate("/admin")}
            className="mt-4 bg-orange-500 hover:bg-orange-600"
          >
            Voltar ao Painel
          </Button>
        </div>
      </div>
    );
  }

  const plans = [
    {
      id: 'free',
      name: 'Gratuito',
      price: 'R$ 0',
      description: 'Perfeito para começar',
      features: [
        'Até 10 produtos',
        '1 cardápio ativo',
        'Suporte básico',
        'Sem integração com Mercado Pago'
      ],
      icon: Star,
      color: 'text-gray-600',
      bgColor: 'bg-gray-100',
      popular: false
    },
    {
      id: 'professional',
      name: 'Profissional',
      price: 'R$ 49',
      period: '/mês',
      description: 'Ideal para restaurantes em crescimento',
      features: [
        'Até 100 produtos',
        '5 cardápios ativos',
        'Suporte prioritário',
        'Integração com Mercado Pago',
        'Relatórios básicos',
        'Sem anúncios'
      ],
      icon: Crown,
      color: 'text-blue-600',
      bgColor: 'bg-blue-100',
      popular: false
    },
    {
      id: 'premium',
      name: 'Premium',
      price: 'R$ 99',
      period: '/mês',
      description: 'Completo para restaurantes estabelecidos',
      features: [
        'Produtos ilimitados',
        'Cardápios ilimitados',
        'Suporte VIP 24/7',
        'Integração completa com Mercado Pago',
        'Relatórios avançados',
        'Sem anúncios',
        'Personalização avançada',
        'API de integração'
      ],
      icon: Crown,
      color: 'text-orange-600',
      bgColor: 'bg-orange-100',
      popular: true
    }
  ];

  const currentPlan = subscription?.plan || 'free';

  const handlePlanUpgrade = async (planId: string) => {
    if (planId === 'free') {
      // Cancelar assinatura atual
      alert('Para cancelar sua assinatura, entre em contato com o suporte.');
      return;
    }

    if (isProcessingUpgrade) return;

    setIsProcessingUpgrade(true);

    try {
      // Validar plano atual antes de permitir upgrade
      await validatePlan();
      
      if (!isValid) {
        toast({
          title: "Plano Inválido",
          description: "Por favor, regularize sua assinatura atual antes de fazer upgrade.",
          variant: "destructive",
        });
        return;
      }

      // Criar assinatura no Mercado Pago
      const planPrices = {
        professional: 49.99,
        premium: 99.99
      };

      const subscriptionData = await mercadoPagoService.createSubscription({
        plan_id: planId,
        user_id: user.id,
        email: user.email,
        amount: planPrices[planId as keyof typeof planPrices],
        currency: 'BRL',
        description: `Plano ${planId} - ${user.email}`,
        payment_method_id: 'pix', // Pode ser alterado conforme necessário
      });

      if (subscriptionData && subscriptionData.init_point) {
        // Redirecionar para o Mercado Pago
        window.location.href = subscriptionData.init_point;
      } else {
        throw new Error('Não foi possível criar a assinatura');
      }

    } catch (error) {
      console.error('Erro ao processar upgrade:', error);
      toast({
        title: "Erro",
        description: error instanceof Error ? error.message : "Erro ao processar upgrade. Tente novamente.",
        variant: "destructive",
      });
    } finally {
      setIsProcessingUpgrade(false);
    }
  };

  return (
    <div className="min-h-screen bg-gray-50">
      <div className="max-w-7xl mx-auto px-4 sm:px-6 lg:px-8 py-8">
        <div className="mb-8">
          <div className="flex items-center justify-between">
            <div>
              <h1 className="text-3xl font-bold text-gray-900">Planos e Assinaturas</h1>
              <p className="mt-2 text-gray-600">
                Gerencie os planos de assinatura e integração com Mercado Pago
              </p>
            </div>
            <Button 
              onClick={() => navigate("/admin")}
              variant="outline"
              className="border-orange-500 text-orange-600 hover:bg-orange-50"
            >
              Voltar
            </Button>
          </div>
        </div>

        {/* Status da Assinatura Atual */}
        <Card className="mb-8">
          <CardHeader>
            <CardTitle>Sua Assinatura Atual</CardTitle>
            <CardDescription>
              Status atual do seu plano e informações de cobrança
            </CardDescription>
          </CardHeader>
          <CardContent>
            <div className="flex items-center justify-between">
              <div>
                <div className="flex items-center space-x-2">
                  <h3 className="text-xl font-semibold capitalize">{currentPlan}</h3>
                  {currentPlan !== 'free' && (
                    <Badge className={`${
                      isValid ? 'bg-green-100 text-green-800' : 'bg-red-100 text-red-800'
                    }`}>
                      {isValid ? 'Plano Ativo' : 'Plano Inválido'}
                    </Badge>
                  )}
                  {planStatus && (
                    <Badge variant="outline">
                      {planStatus}
                    </Badge>
                  )}
                </div>
                <p className="text-gray-600 mt-1">
                  {currentPlan === 'free' ? 'Você está no plano gratuito' : 
                   `Assinatura ${subscription?.status || 'ativa'}`}
                </p>
                {!isValid && currentPlan !== 'free' && (
                  <p className="text-sm text-red-600 mt-1 flex items-center">
                    <AlertCircle className="h-4 w-4 mr-1" />
                    Sua assinatura precisa ser regularizada
                  </p>
                )}
                {subscription?.expires_at && (
                  <p className="text-sm text-gray-500 mt-1">
                    Expira em: {new Date(subscription.expires_at).toLocaleDateString('pt-BR')}
                  </p>
                )}
              </div>
              {subscription?.mercado_pago_payment_id && (
                <div className="text-right">
                  <p className="text-sm text-gray-600">ID do Pagamento:</p>
                  <p className="text-sm font-mono">{subscription.mercado_pago_payment_id}</p>
                </div>
              )}
            </div>
          </CardContent>
        </Card>

        {/* Planos Disponíveis */}
        <div className="grid grid-cols-1 md:grid-cols-3 gap-8">
          {plans.map((plan) => {
            const Icon = plan.icon;
            const isCurrentPlan = currentPlan === plan.id;
            
            return (
              <Card 
                key={plan.id}
                className={`relative ${isCurrentPlan ? 'ring-2 ring-orange-500' : ''} ${plan.popular ? 'shadow-lg' : ''}`}
              >
                {plan.popular && (
                  <div className="absolute -top-3 left-1/2 transform -translate-x-1/2">
                    <Badge className="bg-orange-500 text-white">
                      Mais Popular
                    </Badge>
                  </div>
                )}
                
                <CardHeader className="text-center">
                  <div className={`mx-auto w-12 h-12 rounded-full ${plan.bgColor} flex items-center justify-center mb-4`}>
                    <Icon className={`h-6 w-6 ${plan.color}`} />
                  </div>
                  <CardTitle className="text-xl">{plan.name}</CardTitle>
                  <div className="mt-2">
                    <span className="text-3xl font-bold">{plan.price}</span>
                    {plan.period && <span className="text-gray-600">{plan.period}</span>}
                  </div>
                  <CardDescription>{plan.description}</CardDescription>
                </CardHeader>
                
                <CardContent>
                  <ul className="space-y-3 mb-6">
                    {plan.features.map((feature, index) => (
                      <li key={index} className="flex items-start space-x-2">
                        <Check className="h-5 w-5 text-green-500 flex-shrink-0 mt-0.5" />
                        <span className="text-sm text-gray-700">{feature}</span>
                      </li>
                    ))}
                  </ul>
                  
                  <Button 
                    className={`w-full ${
                      isCurrentPlan 
                        ? 'bg-gray-300 text-gray-700 cursor-not-allowed' 
                        : 'bg-orange-500 hover:bg-orange-600'
                    }`}
                    onClick={() => handlePlanUpgrade(plan.id)}
                    disabled={isCurrentPlan || isProcessingUpgrade}
                  >
                    {isProcessingUpgrade ? (
                      <>
                        <RefreshCw className="h-4 w-4 mr-2 animate-spin" />
                        Processando...
                      </>
                    ) : isCurrentPlan ? (
                      'Plano Atual'
                    ) : plan.id === 'free' ? (
                      'Cancelar Assinatura'
                    ) : (
                      'Assinar Agora'
                    )}
                  </Button>
                </CardContent>
              </Card>
            );
          })}
        </div>

        {/* Informações sobre Mercado Pago */}
        <Card className="mt-8">
          <CardHeader>
            <CardTitle className="flex items-center space-x-2">
              <CreditCard className="h-5 w-5" />
              <span>Integração com Mercado Pago</span>
            </CardTitle>
            <CardDescription>
              Configure a integração com Mercado Pago para processar pagamentos de assinaturas
            </CardDescription>
          </CardHeader>
          <CardContent>
            <div className="grid grid-cols-1 md:grid-cols-2 gap-6">
              <div>
                <h4 className="font-semibold mb-2">Cobranças Recorrentes</h4>
                <p className="text-sm text-gray-600 mb-4">
                  Configure cobranças automáticas mensais para seus assinantes
                </p>
                <Button 
                    variant="outline" 
                    size="sm"
                    onClick={async () => {
                      try {
                        await validatePlan();
                        toast({
                          title: "Webhooks Validados",
                          description: "Configuração de webhooks verificada com sucesso.",
                        });
                      } catch (error) {
                        toast({
                          title: "Erro",
                          description: "Erro ao validar webhooks. Verifique suas configurações.",
                          variant: "destructive",
                        });
                      }
                    }}
                  >
                    Validar Webhooks
                  </Button>
              </div>
              <div>
                <h4 className="font-semibold mb-2">Chaves de API</h4>
                <p className="text-sm text-gray-600 mb-4">
                  Configure suas chaves de API do Mercado Pago
                </p>
                <Button variant="outline" size="sm">
                  Configurar Chaves
                </Button>
              </div>
            </div>
          </CardContent>
        </Card>
      </div>
    </div>
  );
};

export default AdminPlans;