import { useEffect } from "react";
import { useAuth } from "@/contexts/AuthContext";
import { useNavigate, Link } from "react-router-dom";
import { Button } from "@/components/ui/button";
import { Card, CardContent, CardDescription, CardHeader, CardTitle } from "@/components/ui/card";
import { LogOut, Calendar, Plus, List, Settings, MessageSquare } from "lucide-react";

const Admin = () => {
  const { user, signOut, isAdmin, loading } = useAuth();
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

          <Link to={isAdmin ? "/admin/suggestions" : "#"} className={!isAdmin ? "pointer-events-none opacity-50" : ""}>
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
      </main>
    </div>
  );
};

export default Admin;
