import { useNavigate } from "react-router-dom";
import { useAuth } from "@/contexts/AuthContext";
import { Card, CardContent, CardDescription, CardHeader, CardTitle } from "@/components/ui/card";
import { Button } from "@/components/ui/button";
import { BarChart3, Users, CreditCard, Settings, Image, Lightbulb, FileText, Package, ShoppingCart, Tag, Crown, LogOut, ArrowLeft } from "lucide-react";

const AdminDashboard = () => {
  const navigate = useNavigate();
  const { user, loading, isAdmin, isAdminMaster, signOut } = useAuth();

  if (loading) {
    return (
      <div className="min-h-screen bg-gray-50 flex items-center justify-center">
        <div className="text-center">
          <div className="animate-spin rounded-full h-12 w-12 border-b-2 border-orange-500 mx-auto"></div>
          <p className="mt-4 text-gray-600">Carregando...</p>
        </div>
      </div>
    );
  }

  if (!user || !isAdminMaster) {
    return (
      <div className="min-h-screen bg-gray-50 flex items-center justify-center">
        <div className="text-center">
          <h1 className="text-2xl font-bold text-gray-900">Acesso Negado</h1>
          <p className="mt-2 text-gray-600">Você não tem permissão para acessar esta área. Apenas administradores master têm acesso.</p>
          <Button 
            onClick={() => navigate("/admin/selector")}
            className="mt-4 bg-orange-500 hover:bg-orange-600"
          >
            Voltar para Dashboard
          </Button>
        </div>
      </div>
    );
  }

  const adminSections = [
    {
      title: "Dashboard",
      description: "Visão geral do sistema e métricas",
      icon: BarChart3,
      path: "/admin/dashboard",
      color: "text-blue-600"
    },
    {
      title: "Cardápios",
      description: "Gerencie os cardápios do restaurante",
      icon: FileText,
      path: "/admin/menus",
      color: "text-green-600"
    },
    {
      title: "Produtos",
      description: "Gerencie os produtos do delivery",
      icon: Package,
      path: "/admin/products",
      color: "text-emerald-600"
    },
    {
      title: "Pedidos",
      description: "Gerencie os pedidos do delivery",
      icon: ShoppingCart,
      path: "/admin/orders",
      color: "text-orange-600"
    },
    {
      title: "Cupons",
      description: "Gerencie cupons de desconto",
      icon: Tag,
      path: "/admin/coupons",
      color: "text-purple-600"
    },
    {
      title: "Sugestões de Refeições",
      description: "Gerencie as sugestões de refeições",
      icon: Lightbulb,
      path: "/admin/suggestions",
      color: "text-yellow-600"
    },
    {
      title: "Galeria",
      description: "Gerencie as imagens da galeria",
      icon: Image,
      path: "/admin/gallery",
      color: "text-pink-600"
    },
    {
      title: "Usuários",
      description: "Gerencie os usuários do sistema",
      icon: Users,
      path: "/admin/users",
      color: "text-indigo-600"
    },
    {
      title: "Planos e Assinaturas",
      description: "Gerencie planos e assinaturas",
      icon: CreditCard,
      path: "/admin/plans",
      color: "text-red-600"
    },
    {
      title: "Configurações de Níveis",
      description: "Configure acessos por plano e nível",
      icon: Settings,
      path: "/admin/level-config",
      color: "text-indigo-600"
    },
    {
      title: "Configurações Gerais",
      description: "Configurações do sistema",
      icon: Settings,
      path: "/admin/settings",
      color: "text-gray-600"
    }
  ];

  return (
    <div className="min-h-screen bg-gray-50">
      {/* Header Exclusivo do Painel Administrativo Master */}
      <header className="bg-gradient-to-r from-purple-900 via-purple-800 to-indigo-900 text-white shadow-2xl">
        <div className="max-w-7xl mx-auto px-4 sm:px-6 lg:px-8">
          <div className="flex items-center justify-between py-6">
            <div className="flex items-center space-x-4">
              <div className="bg-white/10 p-3 rounded-full">
                <Crown className="h-8 w-8 text-yellow-300" />
              </div>
              <div>
                <div className="flex items-center gap-3">
                  <h1 className="text-3xl font-bold text-white">Painel Administrativo Master</h1>
                  <span className="bg-gradient-to-r from-yellow-400 to-orange-400 text-purple-900 px-3 py-1 rounded-full text-sm font-bold shadow-lg">
                    MASTER
                  </span>
                </div>
                <p className="text-purple-200 mt-1">
                  Controle total do sistema • Acesso irrestrito
                </p>
              </div>
            </div>
            <div className="flex items-center space-x-4">
              <div className="text-right">
                <p className="text-sm text-purple-200">Administrador</p>
                <p className="font-semibold text-white">{user.email}</p>
              </div>
              <div className="flex space-x-2">
                <Button 
                  onClick={() => navigate("/admin/selector")}
                  variant="outline" 
                  className="bg-white/10 border-white/20 text-white hover:bg-white/20"
                >
                  <ArrowLeft className="h-4 w-4 mr-2" />
                  Voltar
                </Button>
                <Button 
                  onClick={() => {
                    signOut();
                    navigate("/");
                  }}
                  variant="outline" 
                  className="bg-red-500/20 border-red-400/30 text-red-200 hover:bg-red-500/30"
                >
                  <LogOut className="h-4 w-4 mr-2" />
                  Sair
                </Button>
              </div>
            </div>
          </div>
        </div>
        
        {/* Barra de navegação secundária */}
        <div className="bg-black/20 backdrop-blur-sm">
          <div className="max-w-7xl mx-auto px-4 sm:px-6 lg:px-8">
            <nav className="flex space-x-8 py-3">
              <button 
                onClick={() => navigate("/admin/dashboard")}
                className="text-yellow-300 border-b-2 border-yellow-300 pb-2 font-medium"
              >
                Dashboard Master
              </button>
              <button 
                onClick={() => navigate("/admin/selector")}
                className="text-purple-200 hover:text-white transition-colors"
              >
                Painel de Delivery
              </button>
              <button 
                onClick={() => navigate("/")}
                className="text-purple-200 hover:text-white transition-colors"
              >
                Site Principal
              </button>
            </nav>
          </div>
        </div>
      </header>

      <div className="max-w-7xl mx-auto px-4 sm:px-6 lg:px-8 py-8">
        <div className="mb-8">
          <h2 className="text-2xl font-bold text-gray-900">Visão Geral do Sistema</h2>
          <p className="mt-2 text-gray-600">
            Bem-vindo ao Painel Administrativo Master, {user.email}. Você tem acesso completo a todas as funcionalidades.
          </p>
        </div>

        <div className="grid grid-cols-1 md:grid-cols-2 lg:grid-cols-3 gap-6">
          {adminSections.map((section) => {
            const Icon = section.icon;
            return (
              <Card 
                key={section.title}
                className="hover:shadow-lg transition-shadow cursor-pointer"
                onClick={() => navigate(section.path)}
              >
                <CardHeader>
                  <div className="flex items-center space-x-3">
                    <div className={`p-2 rounded-lg bg-gray-100 ${section.color}`}>
                      <Icon className="h-6 w-6" />
                    </div>
                    <CardTitle className="text-lg">{section.title}</CardTitle>
                  </div>
                </CardHeader>
                <CardContent>
                  <CardDescription className="text-sm text-gray-600">
                    {section.description}
                  </CardDescription>
                  <Button 
                    className="mt-4 w-full bg-orange-500 hover:bg-orange-600"
                    onClick={(e) => {
                      e.stopPropagation();
                      navigate(section.path);
                    }}
                  >
                    Acessar
                  </Button>
                </CardContent>
              </Card>
            );
          })}
        </div>
      </div>
    </div>
  );
};

export default AdminDashboard;