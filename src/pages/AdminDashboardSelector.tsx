import { useEffect } from "react";
import { useAuth } from "@/contexts/AuthContext";
import { useNavigate, Link } from "react-router-dom";
import { Button } from "@/components/ui/button";
import { Card, CardContent, CardDescription, CardHeader, CardTitle } from "@/components/ui/card";
import { LogOut, Calendar, Plus, List, Settings, MessageSquare, Crown, Truck } from "lucide-react";

const AdminDashboardSelector = () => {
  const { user, signOut, isAdmin, isAdminMaster, isAdminDelivery, userPlan, loading } = useAuth();
  const navigate = useNavigate();

  useEffect(() => {
    if (!loading && !user) {
      navigate("/auth");
    }
  }, [user, loading, navigate]);

  if (loading) {
    return (
      <div className="min-h-screen flex items-center justify-center">
        <p>Carregando...</p>
      </div>
    );
  }

  if (!user) return null;

  // Admin Master também começa no painel de delivery, mas com acesso ao painel geral

  return (
    <div className="min-h-screen bg-background">
      <header className="border-b bg-card">
        <div className="container mx-auto px-4 py-4 flex justify-between items-center">
          <div>
            <h1 className="text-2xl font-bold">Painel Administrativo</h1>
            <p className="text-sm text-muted-foreground">{user.email}</p>
          </div>
          <Button variant="outline" onClick={signOut} className="gap-2">
            <LogOut className="w-4 h-4" />
            Sair
          </Button>
        </div>
      </header>

      <main className="container mx-auto px-4 py-8">
        {!isAdmin && (
          <Card className="mb-8 border-yellow-500 bg-yellow-50 dark:bg-yellow-950">
            <CardHeader>
              <CardTitle className="text-yellow-800 dark:text-yellow-200">
                Acesso Restrito
              </CardTitle>
              <CardDescription className="text-yellow-700 dark:text-yellow-300">
                Sua conta não possui permissões de administrador. Entre em contato com o administrador do sistema para obter acesso.
              </CardDescription>
            </CardHeader>
          </Card>
        )}

        {/* Seção Admin Delivery (Plano 3) */}
        {isAdminDelivery && userPlan === 'premium' && (
          <div className="mb-8">
            <div className="flex items-center gap-2 mb-4">
              <Truck className="w-6 h-6 text-blue-600" />
              <h2 className="text-xl font-bold text-blue-600">Painel de Delivery</h2>
              <span className="bg-blue-100 text-blue-800 text-xs font-medium px-2.5 py-0.5 rounded">Plano 3</span>
            </div>
            <div className="grid grid-cols-1 md:grid-cols-2 lg:grid-cols-3 gap-6">
              <Link to="/admin/orders">
                <Card className="hover:shadow-lg transition-shadow cursor-pointer h-full border-blue-200">
                  <CardHeader>
                    <List className="w-8 h-8 mb-2 text-blue-600" />
                    <CardTitle>Gerenciar Pedidos</CardTitle>
                    <CardDescription>
                      Visualize e gerencie os pedidos de delivery
                    </CardDescription>
                  </CardHeader>
                </Card>
              </Link>

              <Link to="/admin/delivery">
                <Card className="hover:shadow-lg transition-shadow cursor-pointer h-full border-blue-200">
                  <CardHeader>
                    <Truck className="w-8 h-8 mb-2 text-blue-600" />
                    <CardTitle>Controle de Entregas</CardTitle>
                    <CardDescription>
                      Gerencie as entregas e entregadores
                    </CardDescription>
                  </CardHeader>
                </Card>
              </Link>

              <Link to="/admin/products">
                <Card className="hover:shadow-lg transition-shadow cursor-pointer h-full border-blue-200">
                  <CardHeader>
                    <Plus className="w-8 h-8 mb-2 text-blue-600" />
                    <CardTitle>Produtos</CardTitle>
                    <CardDescription>
                      Gerencie o cardápio de produtos
                    </CardDescription>
                  </CardHeader>
                </Card>
              </Link>
            </div>
          </div>
        )}

        {/* Seção Admin Básico (Cardápios) */}
        <div className="mb-8">
          <div className="flex items-center gap-2 mb-4">
            <Calendar className="w-6 h-6 text-green-600" />
            <h2 className="text-xl font-bold text-green-600">Gerenciamento de Cardápios</h2>
          </div>
          <div className="grid grid-cols-1 md:grid-cols-2 lg:grid-cols-4 gap-6">
            <Link to={`/${user?.id}/cardapio`}>
              <Card className="hover:shadow-lg transition-shadow cursor-pointer h-full">
                <CardHeader>
                  <Calendar className="w-8 h-8 mb-2 text-primary" />
                  <CardTitle>Ver Cardápios</CardTitle>
                  <CardDescription>
                    Visualize os cardápios semanais publicados
                  </CardDescription>
                </CardHeader>
              </Card>
            </Link>

            <Link to={isAdmin ? "/admin/menus" : "#"} className={!isAdmin ? "pointer-events-none opacity-50" : ""}>
              <Card className="hover:shadow-lg transition-shadow cursor-pointer h-full">
                <CardHeader>
                  <List className="w-8 h-8 mb-2 text-secondary" />
                  <CardTitle>Gerenciar Cardápios</CardTitle>
                  <CardDescription>
                    Edite, adicione ou remova cardápios existentes
                  </CardDescription>
                </CardHeader>
              </Card>
            </Link>

            <Link to={isAdmin ? "/admin/menus/new" : "#"} className={!isAdmin ? "pointer-events-none opacity-50" : ""}>
              <Card className="hover:shadow-lg transition-shadow cursor-pointer h-full">
                <CardHeader>
                  <Plus className="w-8 h-8 mb-2 text-accent" />
                  <CardTitle>Novo Cardápio</CardTitle>
                  <CardDescription>
                    Adicione um novo item ao cardápio semanal
                  </CardDescription>
                </CardHeader>
              </Card>
            </Link>

            <Link to={isAdmin ? "/admin/settings" : "#"} className={!isAdmin ? "pointer-events-none opacity-50" : ""}>
              <Card className="hover:shadow-lg transition-shadow cursor-pointer h-full">
                <CardHeader>
                  <Settings className="w-8 h-8 mb-2 text-primary" />
                  <CardTitle>Configurações</CardTitle>
                  <CardDescription>
                    Personalize cores, fontes, dias da semana e mais
                  </CardDescription>
                </CardHeader>
              </Card>
            </Link>
          </div>
        </div>

        {/* Seção Admin Master - Botão para Painel Geral */}
        {isAdminMaster && (
          <div className="bg-gradient-to-r from-purple-50 to-pink-50 rounded-lg p-6 border border-purple-200">
            <div className="flex items-center gap-2 mb-4">
              <Crown className="w-6 h-6 text-purple-600" />
              <h2 className="text-xl font-bold text-purple-600">Acesso Administrativo Avançado</h2>
            </div>
            <p className="text-purple-700 mb-4">
              Você tem acesso ao painel de administrador master com controle total sobre o aplicativo.
            </p>
            <Link to="/admin/dashboard">
              <Button className="bg-purple-600 hover:bg-purple-700 text-white">
                <Crown className="w-4 h-4 mr-2" />
                Acessar Painel Master
              </Button>
            </Link>
          </div>
        )}

        {/* Sugestões */}
        {isAdmin && (
          <div className="mt-8">
            <Link to="/admin/suggestions" className={!isAdmin ? "pointer-events-none opacity-50" : ""}>
              <Card className="hover:shadow-lg transition-shadow cursor-pointer h-full">
                <CardHeader>
                  <MessageSquare className="w-8 h-8 mb-2 text-purple-500" />
                  <CardTitle>Sugestões de Refeições</CardTitle>
                  <CardDescription>
                    Gerencie as sugestões enviadas pelos colaboradores
                  </CardDescription>
                </CardHeader>
              </Card>
            </Link>
          </div>
        )}
      </main>
    </div>
  );
};

export default AdminDashboardSelector;