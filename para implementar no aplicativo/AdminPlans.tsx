import { useEffect } from "react";
import { useNavigate } from "react-router-dom";
import { useAuth } from "@/contexts/AuthContext";
import { useSubscription } from "@/hooks/useSubscription";
import { Card, CardContent, CardDescription, CardHeader, CardTitle } from "@/components/ui/card";
import { Button } from "@/components/ui/button";
import { Badge } from "@/components/ui/badge";
import { ArrowLeft, Check, Crown, Zap } from "lucide-react";
import { Skeleton } from "@/components/ui/skeleton";

const AdminPlans = () => {
  const { user, loading, isAdmin, userPlan } = useAuth();
  const navigate = useNavigate();
  const { subscription } = useSubscription();

  useEffect(() => {
    if (!loading && !user) {
      navigate("/auth");
    }
  }, [user, loading, navigate]);

  if (loading) {
    return (
      <div className="min-h-screen flex items-center justify-center">
        <Skeleton className="w-12 h-12 rounded-full" />
      </div>
    );
  }

  if (!isAdmin) {
    return (
      <div className="min-h-screen flex items-center justify-center">
        <Card className="border-destructive">
          <CardHeader>
            <CardTitle className="text-destructive">Acesso Negado</CardTitle>
            <CardDescription>
              Você não tem permissão para acessar esta página.
            </CardDescription>
          </CardHeader>
        </Card>
      </div>
    );
  }

  const plans = [
    {
      name: "Gratuito",
      value: "free",
      price: "R$ 0",
      description: "Ideal para começar",
      icon: Check,
      color: "from-gray-500 to-slate-500",
      features: [
        "Cardápios básicos",
        "Sugestões de refeições",
        "Marca 'Feito com amor por Seu Cardápio'"
      ]
    },
    {
      name: "Profissional",
      value: "professional",
      price: "R$ 29,90/mês",
      description: "Para profissionais",
      icon: Crown,
      color: "from-blue-500 to-cyan-500",
      features: [
        "Todas as funcionalidades do Gratuito",
        "Remove a marca do sistema",
        "Suporte prioritário",
        "Customização avançada"
      ]
    },
    {
      name: "Premium",
      value: "premium",
      price: "R$ 99,90/mês",
      description: "Delivery completo",
      icon: Zap,
      color: "from-purple-500 to-pink-500",
      features: [
        "Todas as funcionalidades do Profissional",
        "Sistema de delivery completo",
        "Carrinho de compras",
        "Checkout automatizado",
        "Gestão de pedidos",
        "Cupons de desconto",
        "Integração Mercado Pago"
      ]
    }
  ];

  return (
    <div className="min-h-screen bg-background">
      <div className="container mx-auto p-6">
        <div className="flex items-center gap-4 mb-8">
          <Button
            variant="ghost"
            size="icon"
            onClick={() => navigate("/admin")}
          >
            <ArrowLeft className="h-5 w-5" />
          </Button>
          <div>
            <h1 className="text-4xl font-bold bg-gradient-to-r from-primary to-accent bg-clip-text text-transparent">
              Planos e Assinaturas
            </h1>
            <p className="text-muted-foreground mt-2">
              Gerencie seu plano e assinaturas
            </p>
          </div>
        </div>

        {subscription && (
          <Card className="mb-8">
            <CardHeader>
              <CardTitle>Seu Plano Atual</CardTitle>
              <CardDescription>
                Você está no plano: <Badge className="ml-2">{subscription.plan}</Badge>
              </CardDescription>
            </CardHeader>
          </Card>
        )}

        <div className="grid grid-cols-1 md:grid-cols-3 gap-6">
          {plans.map((plan) => (
            <Card
              key={plan.value}
              className={`${
                userPlan === plan.value ? "border-primary ring-2 ring-primary" : ""
              }`}
            >
              <CardHeader>
                <div className={`w-12 h-12 rounded-lg bg-gradient-to-br ${plan.color} flex items-center justify-center mb-4`}>
                  <plan.icon className="h-6 w-6 text-white" />
                </div>
                <CardTitle className="flex items-center gap-2">
                  {plan.name}
                  {userPlan === plan.value && (
                    <Badge variant="secondary">Atual</Badge>
                  )}
                </CardTitle>
                <CardDescription>{plan.description}</CardDescription>
              </CardHeader>
              <CardContent>
                <div className="mb-6">
                  <p className="text-3xl font-bold">{plan.price}</p>
                </div>
                <ul className="space-y-2 mb-6">
                  {plan.features.map((feature, index) => (
                    <li key={index} className="flex items-start gap-2">
                      <Check className="h-5 w-5 text-primary mt-0.5 flex-shrink-0" />
                      <span className="text-sm">{feature}</span>
                    </li>
                  ))}
                </ul>
                <Button
                  className="w-full"
                  variant={userPlan === plan.value ? "secondary" : "default"}
                  disabled={userPlan === plan.value || plan.value === 'free'}
                >
                  {userPlan === plan.value ? "Plano Atual" : plan.value === 'free' ? "Plano Básico" : "Assinar Agora"}
                </Button>
              </CardContent>
            </Card>
          ))}
        </div>

        <Card className="mt-8">
          <CardHeader>
            <CardTitle>Integração Mercado Pago</CardTitle>
            <CardDescription>
              Configure sua integração com o Mercado Pago para processar pagamentos automaticamente
            </CardDescription>
          </CardHeader>
          <CardContent>
            <Button variant="outline">
              Configurar Mercado Pago
            </Button>
          </CardContent>
        </Card>
      </div>
    </div>
  );
};

export default AdminPlans;
