import { Button } from "@/components/ui/button";
import { Card, CardContent } from "@/components/ui/card";
import { Link } from "react-router-dom";
import { 
  Sparkles, 
  Calendar, 
  ChefHat, 
  Users, 
  TrendingUp, 
  CheckCircle,
  ArrowRight,
  Heart
} from "lucide-react";

const Landing = () => {
  return (
    <div className="min-h-screen bg-gradient-to-br from-background via-primary/5 to-secondary/10 relative overflow-hidden">
      {/* Decorative gradient orbs */}
      <div className="absolute top-0 right-0 w-96 h-96 bg-primary/10 rounded-full blur-3xl opacity-50 animate-pulse" />
      <div className="absolute bottom-0 left-0 w-96 h-96 bg-secondary/10 rounded-full blur-3xl opacity-50 animate-pulse" style={{ animationDelay: "1s" }} />
      
      {/* Header */}
      <header className="sticky top-0 z-10 bg-card/80 backdrop-blur-md border-b shadow-lg">
        <div className="container mx-auto px-4 py-6">
          <div className="flex items-center justify-between">
            <div className="flex items-center gap-3">
              <div className="w-12 h-12 rounded-xl bg-gradient-to-br from-primary to-accent flex items-center justify-center shadow-lg">
                <Sparkles className="w-6 h-6 text-white" />
              </div>
              <h1 className="text-2xl md:text-3xl font-bold bg-gradient-to-r from-primary via-accent to-secondary bg-clip-text text-transparent">
                Cardápio Semanal
              </h1>
            </div>
            <Link to="/auth">
              <Button variant="outline" size="sm" className="gap-2 hover:scale-105 transition-transform">
                Login
                <ArrowRight className="w-4 h-4" />
              </Button>
            </Link>
          </div>
        </div>
      </header>

      {/* Hero Section */}
      <section className="container mx-auto px-4 py-20 relative z-0">
        <div className="max-w-4xl mx-auto text-center space-y-8 animate-fade-in">
          <div className="inline-flex items-center gap-2 px-4 py-2 rounded-full bg-primary/10 border border-primary/20 mb-4">
            <Sparkles className="w-4 h-4 text-primary" />
            <span className="text-sm font-medium text-primary">
              Planeje refeições de forma inteligente
            </span>
          </div>
          
          <h2 className="text-5xl md:text-7xl font-bold leading-tight">
            <span className="bg-gradient-to-r from-primary via-accent to-secondary bg-clip-text text-transparent">
              Organize o cardápio
            </span>
            <br />
            <span className="text-foreground">da sua empresa</span>
          </h2>
          
          <p className="text-xl text-muted-foreground max-w-2xl mx-auto leading-relaxed">
            Sistema completo para gestão de cardápios semanais. 
            Simplifique o planejamento alimentar e melhore a experiência dos seus colaboradores.
          </p>
          
          <div className="flex flex-col sm:flex-row gap-4 justify-center pt-4">
            <Link to="/auth">
              <Button size="lg" className="gap-2 text-lg px-8 shadow-lg hover:shadow-xl transition-all hover:scale-105">
                <Heart className="w-5 h-5" />
                Comece Gratuitamente
              </Button>
            </Link>
            <Button size="lg" variant="outline" className="gap-2 text-lg px-8 hover:scale-105 transition-transform">
              Ver Demonstração
              <ArrowRight className="w-5 h-5" />
            </Button>
          </div>
        </div>
      </section>

      {/* Features */}
      <section className="container mx-auto px-4 py-20">
        <div className="max-w-6xl mx-auto">
          <h3 className="text-4xl font-bold text-center mb-4">
            Recursos Poderosos
          </h3>
          <p className="text-center text-muted-foreground text-lg mb-16">
            Tudo que você precisa para gerenciar cardápios profissionalmente
          </p>
          
          <div className="grid md:grid-cols-3 gap-8">
            <Card className="border-2 hover:border-primary/50 transition-all hover:shadow-xl hover:-translate-y-2">
              <CardContent className="p-8 space-y-4">
                <div className="w-14 h-14 rounded-xl bg-gradient-to-br from-primary/20 to-accent/20 flex items-center justify-center">
                  <Calendar className="w-7 h-7 text-primary" />
                </div>
                <h4 className="text-2xl font-bold">Planejamento Semanal</h4>
                <p className="text-muted-foreground leading-relaxed">
                  Organize refeições para toda a semana de forma visual e intuitiva. 
                  Visualize o cardápio completo com navegação simples.
                </p>
              </CardContent>
            </Card>

            <Card className="border-2 hover:border-primary/50 transition-all hover:shadow-xl hover:-translate-y-2">
              <CardContent className="p-8 space-y-4">
                <div className="w-14 h-14 rounded-xl bg-gradient-to-br from-secondary/20 to-accent/20 flex items-center justify-center">
                  <ChefHat className="w-7 h-7 text-secondary" />
                </div>
                <h4 className="text-2xl font-bold">Gestão Completa</h4>
                <p className="text-muted-foreground leading-relaxed">
                  Cadastre pratos com fotos, descrições detalhadas e informações nutricionais. 
                  Edite e atualize facilmente.
                </p>
              </CardContent>
            </Card>

            <Card className="border-2 hover:border-primary/50 transition-all hover:shadow-xl hover:-translate-y-2">
              <CardContent className="p-8 space-y-4">
                <div className="w-14 h-14 rounded-xl bg-gradient-to-br from-accent/20 to-primary/20 flex items-center justify-center">
                  <Users className="w-7 h-7 text-accent" />
                </div>
                <h4 className="text-2xl font-bold">Acesso Público</h4>
                <p className="text-muted-foreground leading-relaxed">
                  Compartilhe cardápios através de links públicos. 
                  Seus colaboradores acessam de qualquer dispositivo.
                </p>
              </CardContent>
            </Card>
          </div>
        </div>
      </section>

      {/* Benefits */}
      <section className="container mx-auto px-4 py-20">
        <div className="max-w-4xl mx-auto">
          <div className="grid md:grid-cols-2 gap-8">
            <div className="space-y-6">
              <h3 className="text-4xl font-bold">
                Por que escolher nosso sistema?
              </h3>
              <div className="space-y-4">
                {[
                  "Interface moderna e intuitiva",
                  "Totalmente responsivo para mobile",
                  "Personalização completa de cores e layout",
                  "Exportação de dados em CSV",
                  "Gerenciamento de múltiplas refeições",
                  "Upload de imagens otimizado",
                ].map((benefit, index) => (
                  <div key={index} className="flex items-start gap-3 animate-fade-in" style={{ animationDelay: `${index * 0.1}s` }}>
                    <CheckCircle className="w-6 h-6 text-primary shrink-0 mt-1" />
                    <span className="text-lg text-muted-foreground">{benefit}</span>
                  </div>
                ))}
              </div>
            </div>
            
            <Card className="bg-gradient-to-br from-primary/10 to-accent/10 border-2 border-primary/20">
              <CardContent className="p-10 space-y-6">
                <TrendingUp className="w-12 h-12 text-primary" />
                <h4 className="text-3xl font-bold">Aumente a Satisfação</h4>
                <p className="text-lg text-muted-foreground leading-relaxed">
                  Colaboradores bem alimentados são mais produtivos e felizes. 
                  Nosso sistema ajuda a criar uma experiência alimentar excepcional.
                </p>
                <Link to="/auth">
                  <Button size="lg" className="w-full gap-2 text-lg">
                    Começar Agora
                    <ArrowRight className="w-5 h-5" />
                  </Button>
                </Link>
              </CardContent>
            </Card>
          </div>
        </div>
      </section>

      {/* CTA Final */}
      <section className="container mx-auto px-4 py-20">
        <Card className="max-w-4xl mx-auto bg-gradient-to-r from-primary via-accent to-secondary p-1">
          <div className="bg-card rounded-lg p-12 text-center space-y-6">
            <h3 className="text-4xl font-bold">
              Pronto para transformar seu cardápio?
            </h3>
            <p className="text-xl text-muted-foreground max-w-2xl mx-auto">
              Junte-se a empresas que já otimizaram o gerenciamento de suas refeições
            </p>
            <Link to="/auth">
              <Button size="lg" className="gap-2 text-lg px-8 shadow-lg hover:shadow-xl transition-all hover:scale-105">
                <Sparkles className="w-5 h-5" />
                Criar Conta Gratuita
              </Button>
            </Link>
          </div>
        </Card>
      </section>

      {/* Footer */}
      <footer className="border-t bg-card/50 backdrop-blur-sm py-8 mt-16">
        <div className="container mx-auto px-4 text-center">
          <p className="text-muted-foreground">
            Feito com ❤️ para empresas que se importam com seus colaboradores
          </p>
        </div>
      </footer>
    </div>
  );
};

export default Landing;
