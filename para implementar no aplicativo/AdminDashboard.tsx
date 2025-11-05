import { useEffect } from "react";
import { useNavigate } from "react-router-dom";
import { useAuth } from "@/contexts/AuthContext";
import { Card, CardContent, CardDescription, CardHeader, CardTitle } from "@/components/ui/card";
import { Button } from "@/components/ui/button";
import { 
  LayoutDashboard, 
  Settings, 
  Menu as MenuIcon, 
  MessageSquare, 
  Image,
  ArrowLeft,
  Users,
  CreditCard
} from "lucide-react";
import { Skeleton } from "@/components/ui/skeleton";

const AdminDashboard = () => {
  const { user, loading, isAdmin } = useAuth();
  const navigate = useNavigate();

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

  const adminSections = [
    {
      title: "Dashboard",
      description: "Visão geral do sistema",
      icon: LayoutDashboard,
      path: "/admin",
      color: "from-blue-500 to-cyan-500"
    },
    {
      title: "Cardápios",
      description: "Gerenciar cardápios",
      icon: MenuIcon,
      path: "/admin/menus",
      color: "from-green-500 to-emerald-500"
    },
    {
      title: "Sugestões",
      description: "Gerenciar sugestões de refeições",
      icon: MessageSquare,
      path: "/admin/suggestions",
      color: "from-purple-500 to-pink-500"
    },
    {
      title: "Galeria",
      description: "Gerenciar imagens",
      icon: Image,
      path: "/admin/gallery",
      color: "from-orange-500 to-red-500"
    },
    {
      title: "Usuários",
      description: "Gerenciar usuários e permissões",
      icon: Users,
      path: "/admin/users",
      color: "from-indigo-500 to-purple-500"
    },
    {
      title: "Planos",
      description: "Gerenciar planos e assinaturas",
      icon: CreditCard,
      path: "/admin/plans",
      color: "from-yellow-500 to-orange-500"
    },
    {
      title: "Configurações",
      description: "Configurações do sistema",
      icon: Settings,
      path: "/admin/settings",
      color: "from-gray-500 to-slate-500"
    }
  ];

  return (
    <div className="min-h-screen bg-background">
      <div className="container mx-auto p-6">
        <div className="flex items-center gap-4 mb-8">
          <Button
            variant="ghost"
            size="icon"
            onClick={() => navigate("/")}
          >
            <ArrowLeft className="h-5 w-5" />
          </Button>
          <div>
            <h1 className="text-4xl font-bold bg-gradient-to-r from-primary to-accent bg-clip-text text-transparent">
              Painel Administrativo
            </h1>
            <p className="text-muted-foreground mt-2">
              Bem-vindo ao painel de controle completo
            </p>
          </div>
        </div>

        {!isAdmin && (
          <Card className="mb-6 border-destructive">
            <CardHeader>
              <CardTitle className="text-destructive">Acesso Restrito</CardTitle>
              <CardDescription>
                Você não tem permissões de administrador para acessar essas funcionalidades.
              </CardDescription>
            </CardHeader>
          </Card>
        )}

        <div className="grid grid-cols-1 md:grid-cols-2 lg:grid-cols-3 gap-6">
          {adminSections.map((section) => (
            <Card
              key={section.path}
              className={`cursor-pointer transition-all hover:shadow-lg ${
                !isAdmin ? "opacity-50 pointer-events-none" : ""
              }`}
              onClick={() => isAdmin && navigate(section.path)}
            >
              <CardHeader>
                <div className={`w-12 h-12 rounded-lg bg-gradient-to-br ${section.color} flex items-center justify-center mb-4`}>
                  <section.icon className="h-6 w-6 text-white" />
                </div>
                <CardTitle>{section.title}</CardTitle>
                <CardDescription>{section.description}</CardDescription>
              </CardHeader>
            </Card>
          ))}
        </div>
      </div>
    </div>
  );
};

export default AdminDashboard;
