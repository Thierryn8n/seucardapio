import { useNavigate } from "react-router-dom";
import { useAuth } from "@/contexts/AuthContext";
import { useSubscription } from "@/hooks/useSubscription";
import { usePlanValidation } from "@/hooks/usePlanValidation";
import { subscribeToPlan } from "@/lib/mercadopago";
import { Card, CardContent, CardDescription, CardHeader, CardTitle } from "@/components/ui/card";
import { Button } from "@/components/ui/button";
import { Badge } from "@/components/ui/badge";
import { Check, CreditCard, Star, Crown, AlertCircle, RefreshCw } from "lucide-react";
import { useToast } from "@/hooks/use-toast";
import { useEffect, useState } from "react";

const AdminPlans = () => {
  const navigate = useNavigate();
  const { user, loading, isAdmin } = useAuth();
  const { subscription, isLoading } = useSubscription();
  const { isValid, planStatus, validatePlan } = usePlanValidation();
  const { toast } = useToast();
  const [isProcessingUpgrade, setIsProcessingUpgrade] = useState(false);

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
      description: 'Ideal para pequenos restaurantes',
      features: [
        'Até 50 produtos',
        '3 cardápios ativos',
        'Suporte prioritário',
        'Integração com Mercado Pago',
        'Cupons de desconto',
        'Relatórios básicos'
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
      description: 'Completo para grandes negócios',
      features: [
        'Produtos ilimitados',
        'Cardápios ilimitados',
        'Suporte VIP 24/7',
        'Integração completa com Mercado Pago',
        'Cupons avançados',
        'Relatórios completos',
        'Sistema de delivery completo',
        'Múltiplos usuários administradores'
      ],
      icon: Crown,
      color: 'text-purple-600',
      bgColor: 'bg-purple-100',
      popular: true
    }
  ];

  const handleUpgradePlan = async (planId: string) => {
    setIsProcessingUpgrade(true);
    
    try {
      const initPoint = await subscribeToPlan(planId, `${window.location.origin}/admin/plans`, user?.email ?? undefined);
      if (window.self !== window.top) window.open(initPoint, "_blank", "noopener");
      else window.location.href = initPoint;
    } catch (error) {
      toast({
        title: "Erro ao processar upgrade",
        description: error instanceof Error ? error.message : "Tente novamente.",
        variant: "destructive"
      });
    } finally {
      setIsProcessingUpgrade(false);
    }
  };

  return (
    <div className="min-h-screen bg-gray-50 py-8">
      <div className="container mx-auto px-4">
        <div className="text-center mb-8">
          <h1 className="text-4xl font-bold text-gray-900 mb-4">Planos e Preços</h1>
          <p className="text-lg text-gray-600">Escolha o plano perfeito para seu restaurante</p>
        </div>

        <div className="grid grid-cols-1 md:grid-cols-3 gap-8 max-w-6xl mx-auto">
          {plans.map((plan) => {
            const Icon = plan.icon;
            const isCurrentPlan = subscription?.plan === plan.id;
            
            return (
              <Card key={plan.id} className={`relative ${plan.popular ? 'ring-2 ring-purple-500' : ''}`}>
                {plan.popular && (
                  <Badge className="absolute -top-3 left-1/2 transform -translate-x-1/2 bg-purple-500">
                    Mais Popular
                  </Badge>
                )}
                
                <CardHeader className="text-center">
                  <div className={`p-3 rounded-full ${plan.bgColor} w-fit mx-auto mb-4`}>
                    <Icon className={`h-6 w-6 ${plan.color}`} />
                  </div>
                  <CardTitle className="text-2xl">{plan.name}</CardTitle>
                  <div className="mt-4">
                    <span className="text-4xl font-bold">{plan.price}</span>
                    <span className="text-gray-500">/mês</span>
                  </div>
                  <CardDescription className="mt-2">{plan.description}</CardDescription>
                </CardHeader>

                <CardContent>
                  <ul className="space-y-3 mb-6">
                    {plan.features.map((feature, index) => (
                      <li key={index} className="flex items-start">
                        <Check className="h-5 w-5 text-green-500 mr-2 mt-0.5 flex-shrink-0" />
                        <span className="text-gray-700">{feature}</span>
                      </li>
                    ))}
                  </ul>

                  {isCurrentPlan ? (
                    <Button 
                      className="w-full bg-green-500 hover:bg-green-600"
                      disabled
                    >
                      <Check className="w-4 h-4 mr-2" />
                      Plano Atual
                    </Button>
                  ) : (
                    <Button 
                      className="w-full bg-orange-500 hover:bg-orange-600"
                      onClick={() => handleUpgradePlan(plan.id)}
                      disabled={isProcessingUpgrade}
                    >
                      {isProcessingUpgrade ? (
                        <>
                          <RefreshCw className="w-4 h-4 mr-2 animate-spin" />
                          Processando...
                        </>
                      ) : (
                        <>
                          <CreditCard className="w-4 h-4 mr-2" />
                          Assinar Plano
                        </>
                      )}
                    </Button>
                  )}
                </CardContent>
              </Card>
            );
          })}
        </div>

        {/* Status da Assinatura Atual */}
        {subscription && (
          <div className="mt-12 max-w-2xl mx-auto">
            <Card>
              <CardHeader>
                <CardTitle>Status da Sua Assinatura</CardTitle>
                <CardDescription>Informações sobre seu plano atual</CardDescription>
              </CardHeader>
              <CardContent>
                <div className="space-y-4">
                  <div className="flex justify-between items-center">
                    <span className="font-medium">Plano Atual:</span>
                    <Badge variant="outline">{subscription.plan}</Badge>
                  </div>
                  <div className="flex justify-between items-center">
                    <span className="font-medium">Status:</span>
                    <Badge 
                      variant={subscription.status === 'active' ? 'default' : 'destructive'}
                    >
                      {subscription.status}
                    </Badge>
                  </div>
                  <div className="flex justify-between items-center">
                    <span className="font-medium">Validade:</span>
                    <span>{subscription.expires_at ? new Date(subscription.expires_at).toLocaleDateString() : 'Indefinido'}</span>
                  </div>
                  {planStatus && (
                    <div className="flex justify-between items-center">
                      <span className="font-medium">Validação:</span>
                      <Badge variant={isValid ? 'default' : 'destructive'}>
                        {isValid ? 'Válido' : 'Inválido'}
                      </Badge>
                    </div>
                  )}
                </div>
              </CardContent>
            </Card>
          </div>
        )}

        {/* Alerta de Validação */}
        {!isValid && (
          <div className="mt-8 max-w-2xl mx-auto">
            <Card className="border-red-200 bg-red-50">
              <CardHeader>
                <div className="flex items-center gap-2">
                  <AlertCircle className="h-5 w-5 text-red-500" />
                  <CardTitle className="text-red-800">Problema com Assinatura</CardTitle>
                </div>
              </CardHeader>
              <CardContent>
                <p className="text-red-700 mb-4">
                  Sua assinatura não está válida. Isso pode ocorrer por:
                </p>
                <ul className="list-disc list-inside text-red-700 space-y-1">
                  <li>Assinatura expirada</li>
                  <li>Pagamento pendente</li>
                  <li>Cancelamento da assinatura</li>
                </ul>
                <div className="mt-4 flex gap-2">
                  <Button 
                    onClick={validatePlan}
                    variant="outline"
                    className="border-red-300 text-red-700 hover:bg-red-100"
                  >
                    <RefreshCw className="w-4 h-4 mr-2" />
                    Validar Novamente
                  </Button>
                </div>
              </CardContent>
            </Card>
          </div>
        )}
      </div>
    </div>
  );
};

export default AdminPlans;
