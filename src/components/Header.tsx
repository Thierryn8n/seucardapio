import { useState, useEffect } from "react";
import { Link, useLocation, useNavigate } from "react-router-dom";
import { Button } from "@/components/ui/button";
import { Logo } from "@/components/Logo";
import { Menu, X, User, Settings, LogOut, ChefHat, Bell, Home, Utensils, Calendar, Truck } from "lucide-react";
import { supabase } from "@/integrations/supabase/client";
import { useToast } from "@/hooks/use-toast";
import { Avatar, AvatarFallback, AvatarImage } from "@/components/ui/avatar";
import {
  DropdownMenu,
  DropdownMenuContent,
  DropdownMenuItem,
  DropdownMenuLabel,
  DropdownMenuSeparator,
  DropdownMenuTrigger,
} from "@/components/ui/dropdown-menu";
import { cn } from "@/lib/utils";
import { TubelightNavbar } from "@/components/TubelightNavbar";
import { NotificationBell } from "@/components/notifications/NotificationBell";
import { PushNotificationService } from "@/services/pushNotificationService";
import "./GrainTexture.css";

const Header = () => {
  const [user, setUser] = useState<any>(null);
  const [profile, setProfile] = useState<any>(null);
  const [isMenuOpen, setIsMenuOpen] = useState(false);
  const location = useLocation();
  const navigate = useNavigate();
  const { toast } = useToast();
  const isLanding = location.pathname === "/";
  const isMenuPage = location.pathname.includes("/cardapio");

  useEffect(() => {
    const checkUser = async () => {
      const { data: { user: currentUser } } = await supabase.auth.getUser();
      setUser(currentUser);

      if (currentUser) {
        const { data: profileData } = await supabase
          .from("profiles")
          .select("*")
          .eq("id", currentUser.id)
          .single();
        setProfile(profileData);
        
        // Configurar notificações push para usuário logado
        await PushNotificationService.requestPermission();
        await PushNotificationService.setupPushSubscription(currentUser.id);
      }
    };

    checkUser();

    const { data: authListener } = supabase.auth.onAuthStateChange(async (_event, session) => {
      setUser(session?.user ?? null);
      if (session?.user) {
        supabase
          .from("profiles")
          .select("*")
          .eq("id", session.user.id)
          .single()
          .then(({ data }) => setProfile(data));
          
        // Configurar notificações push para novo login
        await PushNotificationService.requestPermission();
        await PushNotificationService.setupPushSubscription(session.user.id);
      } else {
        setProfile(null);
      }
    });

    return () => {
      authListener.subscription.unsubscribe();
    };
  }, []);

  const handleLogout = async () => {
    try {
      await supabase.auth.signOut();
      toast({ title: "Logout realizado com sucesso!" });
      navigate("/");
    } catch (error) {
      toast({ title: "Erro ao fazer logout", variant: "destructive" });
    }
  };

  const handleAuthClick = () => {
    navigate("/auth");
  };

  if (isMenuPage) {
    return null;
  }

  return (
    <>
      {/* Tubelight Navbar para a landing page */}
      {isLanding && (
        <TubelightNavbar
          isAuthenticated={!!user}
          onAuthClick={handleAuthClick}
          onLogout={handleLogout}
        />
      )}

      {/* Header tradicional para outras páginas */}
      {!isLanding && (
        <header className="fixed top-0 left-0 right-0 z-50 bg-white/95 backdrop-blur-sm border-b border-gray-200 shadow-sm">
          <div className="container mx-auto px-4 sm:px-6 lg:px-8">
            <div className="flex items-center justify-between h-16">
              {/* Logo */}
              <Link to="/" className="flex items-center gap-2">
                <Logo size="sm" />
                <span className="font-bold text-lg text-gray-900">Seu Cardápio</span>
              </Link>

              {/* Desktop Navigation */}
              <nav className="hidden lg:flex items-center gap-6">
                <Link
                  to="/"
                  className={cn(
                    "text-sm font-medium transition-colors hover:text-primary",
                    location.pathname === "/" ? "text-primary" : "text-gray-600"
                  )}
                >
                  Início
                </Link>
                <Link
                  to="/menu"
                  className={cn(
                    "text-sm font-medium transition-colors hover:text-primary",
                    location.pathname === "/menu" ? "text-primary" : "text-gray-600"
                  )}
                >
                  Cardápio
                </Link>
                <Link
                  to="/delivery"
                  className={cn(
                    "text-sm font-medium transition-colors hover:text-primary",
                    location.pathname.startsWith("/delivery") ? "text-primary" : "text-gray-600"
                  )}
                >
                  Delivery
                </Link>
                {user && profile?.is_admin && (
                  <Link
                    to="/admin"
                    className={cn(
                      "text-sm font-medium transition-colors hover:text-primary",
                      location.pathname.startsWith("/admin") ? "text-primary" : "text-gray-600"
                    )}
                  >
                    Admin
                  </Link>
                )}
              </nav>

              {/* Desktop Actions */}
              <div className="hidden lg:flex items-center gap-3">
                {user ? (
                  <>
                    <NotificationBell />
                    <DropdownMenu>
                      <DropdownMenuTrigger asChild>
                        <Button variant="ghost" className="relative h-8 w-8 rounded-full p-0">
                          <Avatar className="h-8 w-8">
                            <AvatarImage src={profile?.avatar_url} />
                            <AvatarFallback className="bg-primary text-white text-xs">
                              {(profile?.full_name || user.email)?.charAt(0).toUpperCase()}
                            </AvatarFallback>
                          </Avatar>
                        </Button>
                      </DropdownMenuTrigger>
                      <DropdownMenuContent className="w-56" align="end" forceMount>
                        <DropdownMenuLabel className="font-normal">
                          <div className="flex flex-col space-y-1">
                            <p className="text-sm font-medium leading-none">{profile?.full_name || user.email}</p>
                            <p className="text-xs leading-none text-muted-foreground">{user.email}</p>
                          </div>
                        </DropdownMenuLabel>
                        <DropdownMenuSeparator />
                        <DropdownMenuItem onClick={() => navigate("/admin/settings")}>
                          <Settings className="mr-2 h-4 w-4" />
                          Configurações
                        </DropdownMenuItem>
                        {profile?.is_admin && (
                          <DropdownMenuItem onClick={() => navigate("/admin")}>
                            <ChefHat className="mr-2 h-4 w-4" />
                            Painel Admin
                          </DropdownMenuItem>
                        )}
                        <DropdownMenuSeparator />
                        <DropdownMenuItem onClick={handleLogout} className="text-red-600 hover:text-red-700">
                          <LogOut className="mr-2 h-4 w-4" />
                          Sair
                        </DropdownMenuItem>
                      </DropdownMenuContent>
                    </DropdownMenu>
                  </>
                ) : (
                  <Link to="/auth">
                    <Button variant="default" size="sm">
                      Entrar
                    </Button>
                  </Link>
                )}
              </div>

              {/* Mobile menu button */}
              <div className="lg:hidden">
                <Button
                  variant="ghost"
                  size="icon"
                  onClick={() => setIsMenuOpen(!isMenuOpen)}
                >
                  {isMenuOpen ? <X className="h-5 w-5" /> : <Menu className="h-5 w-5" />}
                </Button>
              </div>
            </div>
          </div>

          {/* Mobile menu */}
          {isMenuOpen && (
            <div className="lg:hidden border-t border-gray-200 bg-white">
              <div className="px-4 py-4 space-y-3">
                <Link
                  to="/"
                  className="block text-sm font-medium text-gray-600 hover:text-primary transition-colors"
                  onClick={() => setIsMenuOpen(false)}
                >
                  Início
                </Link>
                <Link
                  to="/menu"
                  className="block text-sm font-medium text-gray-600 hover:text-primary transition-colors"
                  onClick={() => setIsMenuOpen(false)}
                >
                  Cardápio
                </Link>
                <Link
                  to="/delivery"
                  className="block text-sm font-medium text-gray-600 hover:text-primary transition-colors"
                  onClick={() => setIsMenuOpen(false)}
                >
                  Delivery
                </Link>
                {user && profile?.is_admin && (
                  <Link
                    to="/admin"
                    className="block text-sm font-medium text-gray-600 hover:text-primary transition-colors"
                    onClick={() => setIsMenuOpen(false)}
                  >
                    Admin
                  </Link>
                )}
                {!user && (
                  <Link
                    to="/auth"
                    className="block w-full text-center"
                    onClick={() => setIsMenuOpen(false)}
                  >
                    <Button variant="default" size="sm" className="w-full">
                      Entrar
                    </Button>
                  </Link>
                )}
                {user && (
                  <Button
                    variant="ghost"
                    size="sm"
                    onClick={() => {
                      handleLogout()
                      setIsMenuOpen(false)
                    }}
                    className="w-full text-red-600 hover:text-red-700"
                  >
                    Sair
                  </Button>
                )}
              </div>
            </div>
          )}
        </header>
      )}
    </>
  )
}

export default Header;