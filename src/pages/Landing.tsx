import { useEffect, useState } from "react";
import { Link } from "react-router-dom";
import { Button } from "@/components/ui/button";
import { Card, CardContent } from "@/components/ui/card";
import Background from "@/components/Background";
import Header from "@/components/Header";
import { Logo } from "@/components/Logo";
import { 
  Sparkles, 
  Calendar, 
  ChefHat, 
  Users, 
  TrendingUp, 
  CheckCircle,
  ArrowRight,
  Heart,
  Star,
  Clock,
  Shield,
  Zap,
  Mobile,
  Palette,
  BarChart3,
  MessageCircle,
  Award,
  Play
} from "lucide-react";

const Landing = () => {
  const [isVisible, setIsVisible] = useState(false);

  useEffect(() => {
    setIsVisible(true);
  }, []);

  const features = [
    {
      icon: Calendar,
      title: "Planejamento Inteligente",
      description: "Organize refeições para toda a semana com interface visual intuitiva e navegação simplificada.",
      gradient: "from-primary/20 to-accent/20",
      iconColor: "text-primary"
    },
    {
      icon: ChefHat,
      title: "Gestão Completa",
      description: "Cadastre pratos com fotos, descrições detalhadas e informações nutricionais completas.",
      gradient: "from-secondary/20 to-accent/20",
      iconColor: "text-secondary"
    },
    {
      icon: Users,
      title: "Acesso Colaborativo",
      description: "Compartilhe cardápios através de links públicos. Acesso fácil de qualquer dispositivo.",
      gradient: "from-accent/20 to-primary/20",
      iconColor: "text-accent"
    },
    {
      icon: Shield,
      title: "Segurança Garantida",
      description: "Dados protegidos com criptografia avançada e backups automáticos diários.",
      gradient: "from-green-500/20 to-blue-500/20",
      iconColor: "text-green-600"
    },
    {
      icon: Zap,
      title: "Performance Ultra",
      description: "Carregamento instantâneo e interface responsiva que se adapta a qualquer tela.",
      gradient: "from-yellow-500/20 to-orange-500/20",
      iconColor: "text-yellow-600"
    },
    {
      icon: BarChart3,
      title: "Analytics Integrado",
      description: "Acompanhe visualizações, preferências e feedback dos colaboradores em tempo real.",
      gradient: "from-purple-500/20 to-pink-500/20",
      iconColor: "text-purple-600"
    }
  ];

  const benefits = [
    "Interface moderna e intuitiva",
    "Totalmente responsivo para mobile",
    "Personalização completa de cores e layout",
    "Exportação de dados em CSV",
    "Gerenciamento de múltiplas refeições",
    "Upload de imagens otimizado",
    "Sistema de notificações inteligentes",
    "Suporte técnico prioritário"
  ];

  const testimonials = [
    {
      name: "Mariana Silva",
      role: "Gerente de RH - TechCorp",
      content: "Reduzimos em 70% o tempo de planejamento de refeições. O sistema é incrívelmente fácil de usar!",
      rating: 5
    },
    {
      name: "Carlos Oliveira",
      role: "Coordenador - FoodService",
      content: "Nossos colaboradores adoraram a transparência do cardápio. Aumentou a satisfação geral.",
      rating: 5
    },
    {
      name: "Ana Costa",
      role: "Nutricionista - HealthyCo",
      content: "A ferramenta perfeita para manter todos informados sobre as opções nutritivas disponíveis.",
      rating: 5
    }
  ];



  return (
    <div className="min-h-screen relative overflow-hidden bg-transparent">
      <Background />
      <Header />
      
      {/* Hero Section */}
      <section className="relative pt-32 pb-20 lg:pt-40 lg:pb-32">
        <div className="container mx-auto px-4 sm:px-6 lg:px-8">
          <div className="max-w-5xl mx-auto text-center">
            <div className={`transform transition-all duration-1000 ${isVisible ? 'translate-y-0 opacity-100' : 'translate-y-10 opacity-0'}`}>
              <div className="inline-flex items-center gap-2 px-4 py-2 rounded-full bg-primary/10 border border-primary/20 mb-8 animate-pulse">
                <Sparkles className="w-4 h-4 text-primary" />
                <span className="text-sm font-semibold text-primary">
                  🎉 Novo! Recursos de IA para planejamento inteligente
                </span>
              </div>
              
              <h1 className="text-5xl md:text-7xl font-bold leading-tight mb-6">
                <span className="bg-gradient-to-r from-primary via-accent to-secondary bg-clip-text text-transparent animate-gradient">
                  Transforme seu
                </span>
                <br />
                <span className="text-gray-900">
                  cardápio corporativo
                </span>
              </h1>
              
              <p className="text-xl md:text-2xl text-gray-600 max-w-3xl mx-auto leading-relaxed mb-10">
                Sistema completo de gestão de cardápios semanais. 
                <strong className="text-primary">Reduza em 70%</strong> o tempo de planejamento e 
                <strong className="text-secondary">aumente a satisfação</strong> dos seus colaboradores.
              </p>
              
              <div className="flex flex-col sm:flex-row gap-4 justify-center items-center mb-12">
                <Link to="/auth">
                  <Button 
                    size="lg" 
                    className="gap-3 text-lg px-8 h-14 shadow-xl hover:shadow-2xl transition-all hover:scale-105 bg-gradient-to-r from-primary to-accent"
                  >
                    <Heart className="w-5 h-5" />
                    Comece Gratuitamente
                    <ArrowRight className="w-5 h-5" />
                  </Button>
                </Link>
                <Button 
                  size="lg" 
                  variant="outline" 
                  className="gap-3 text-lg px-8 h-14 hover:scale-105 transition-transform border-2"
                  onClick={() => document.getElementById('demo')?.scrollIntoView({ behavior: 'smooth' })}
                >
                  <Play className="w-5 h-5" />
                  Ver Demonstração
                </Button>
              </div>

              <div className="flex flex-wrap justify-center gap-8 text-sm text-gray-600">
                <div className="flex items-center gap-2">
                  <CheckCircle className="w-4 h-4 text-green-500" />
                  <span>Sem cartão de crédito</span>
                </div>
                <div className="flex items-center gap-2">
                  <CheckCircle className="w-4 h-4 text-green-500" />
                  <span>Setup em 5 minutos</span>
                </div>
                <div className="flex items-center gap-2">
                  <CheckCircle className="w-4 h-4 text-green-500" />
                  <span>Cancelamento fácil</span>
                </div>
              </div>
            </div>
          </div>
        </div>
      </section>

      {/* Features Section */}
      <section id="recursos" className="py-20 lg:py-32">
        <div className="container mx-auto px-4 sm:px-6 lg:px-8">
          <div className="text-center mb-16">
            <h2 className="text-4xl lg:text-5xl font-bold text-gray-900 mb-4">
              Recursos que <span className="bg-gradient-to-r from-primary to-accent bg-clip-text text-transparent">transformam</span>
            </h2>
            <p className="text-xl text-gray-600 max-w-2xl mx-auto">
              Tudo que você precisa para gerenciar cardápios profissionalmente, em uma plataforma única
            </p>
          </div>
          
          <div className="grid md:grid-cols-2 lg:grid-cols-3 gap-8">
            {features.map((feature, index) => (
              <Card key={index} className="group hover:shadow-2xl hover:-translate-y-2 transition-all duration-300 bg-gradient-to-br from-white/10 to-gray-50/10 backdrop-blur-sm">
                <CardContent className="p-8 space-y-6">
                  <div className={`w-16 h-16 rounded-2xl bg-gradient-to-br ${feature.gradient} flex items-center justify-center group-hover:scale-110 transition-transform`}>
                    <feature.icon className={`w-8 h-8 ${feature.iconColor}`} />
                  </div>
                  <div>
                    <h3 className="text-2xl font-bold text-gray-900 mb-3">{feature.title}</h3>
                    <p className="text-gray-600 leading-relaxed">{feature.description}</p>
                  </div>
                </CardContent>
              </Card>
            ))}
          </div>
        </div>
      </section>

      {/* Benefits Section */}
      <section className="py-20 lg:py-32 bg-white/5 backdrop-blur-sm">
        <div className="container mx-auto px-4 sm:px-6 lg:px-8">
          <div className="grid lg:grid-cols-2 gap-16 items-center">
            <div className="space-y-8">
              <div>
                <h3 className="text-4xl lg:text-5xl font-bold text-gray-900 mb-4">
                  Por que milhares de empresas nos escolhem?
                </h3>
                <p className="text-xl text-gray-600">
                  Solução completa que atende desde pequenas empresas até grandes corporações
                </p>
              </div>
              
              <div className="space-y-4">
                {benefits.map((benefit, index) => (
                  <div key={index} className="flex items-start gap-4 group hover:bg-white/10 p-3 rounded-lg transition-colors">
                    <div className="w-6 h-6 rounded-full bg-gradient-to-br from-primary to-accent flex items-center justify-center shrink-0 mt-0.5">
                      <CheckCircle className="w-3 h-3 text-white" />
                    </div>
                    <span className="text-lg text-gray-700 group-hover:text-gray-900">{benefit}</span>
                  </div>
                ))}
              </div>

              <Link to="/auth">
                <Button 
                  size="lg" 
                  className="gap-3 text-lg px-8 h-14 shadow-lg hover:shadow-xl transition-all hover:scale-105 bg-gradient-to-r from-primary to-accent">
                  <Zap className="w-5 h-5" />
                  Começar Agora
                </Button>
              </Link>
            </div>

            <div className="relative">
              <div className="absolute -top-20 -right-20 w-40 h-40 bg-gradient-to-br from-primary/20 to-accent/20 rounded-full blur-3xl" />
              <div className="absolute -bottom-20 -left-20 w-40 h-40 bg-gradient-to-br from-secondary/20 to-primary/20 rounded-full blur-3xl" />
              
              <Card className="relative bg-white/10 backdrop-blur-sm border-2 border-primary/20 shadow-2xl">
                <CardContent className="p-10 space-y-8">
                  <div className="flex items-center gap-4">
                    <TrendingUp className="w-8 h-8 text-primary" />
                    <div>
                      <h4 className="text-2xl font-bold text-gray-900">Resultados Comprovados</h4>
                      <p className="text-gray-600">Aumente a satisfação e reduza custos</p>
                    </div>
                  </div>
                  
                  <div className="space-y-4">
                    <div className="flex justify-between items-center">
                      <span className="text-gray-700">Satisfação dos Colaboradores</span>
                      <span className="font-bold text-green-600">+85%</span>
                    </div>
                    <div className="w-full bg-gray-200 rounded-full h-3">
                      <div className="bg-gradient-to-r from-green-400 to-green-600 h-3 rounded-full" style={{width: '85%'}} />
                    </div>
                    
                    <div className="flex justify-between items-center">
                      <span className="text-gray-700">Redução de Custos</span>
                      <span className="font-bold text-blue-600">-40%</span>
                    </div>
                    <div className="w-full bg-gray-200 rounded-full h-3">
                      <div className="bg-gradient-to-r from-blue-400 to-blue-600 h-3 rounded-full" style={{width: '60%'}} />
                    </div>
                    
                    <div className="flex justify-between items-center">
                      <span className="text-gray-700">Tempo Economizado</span>
                      <span className="font-bold text-purple-600">-70%</span>
                    </div>
                    <div className="w-full bg-gray-200 rounded-full h-3">
                      <div className="bg-gradient-to-r from-purple-400 to-purple-600 h-3 rounded-full" style={{width: '70%'}} />
                    </div>
                  </div>
                </CardContent>
              </Card>
            </div>
          </div>
        </div>
      </section>

      {/* Testimonials Section */}
      <section className="py-20 lg:py-32 bg-white/10 backdrop-blur-sm">
        <div className="container mx-auto px-4 sm:px-6 lg:px-8">
          <div className="text-center mb-16">
            <h2 className="text-4xl lg:text-5xl font-bold text-gray-900 mb-4">
              O que nossos <span className="bg-gradient-to-r from-primary to-accent bg-clip-text text-transparent">clientes</span> dizem
            </h2>
            <p className="text-xl text-gray-600 max-w-2xl mx-auto">
              Histórias reais de empresas que transformaram sua gestão de refeições
            </p>
          </div>
          
          <div className="grid md:grid-cols-3 gap-8">
            {testimonials.map((testimonial, index) => (
              <Card key={index} className="group hover:shadow-2xl hover:-translate-y-2 transition-all duration-300 bg-gradient-to-br from-white/10 to-gray-50/10 backdrop-blur-sm">
                <CardContent className="p-8 space-y-6">
                  <div className="flex gap-1">
                    {[...Array(testimonial.rating)].map((_, i) => (
                      <Star key={i} className="w-5 h-5 fill-yellow-400 text-yellow-400" />
                    ))}
                  </div>
                  <p className="text-gray-700 leading-relaxed italic">"{testimonial.content}"</p>
                  <div>
                    <p className="font-bold text-gray-900">{testimonial.name}</p>
                    <p className="text-sm text-gray-600">{testimonial.role}</p>
                  </div>
                </CardContent>
              </Card>
            ))}
          </div>
        </div>
      </section>

      {/* CTA Final */}
      <section id="precos" className="py-20 lg:py-32 bg-gradient-to-br from-primary via-accent to-secondary">
        <div className="container mx-auto px-4 sm:px-6 lg:px-8">
          <div className="max-w-4xl mx-auto text-center text-white space-y-8">
            <div>
              <h3 className="text-4xl lg:text-6xl font-bold mb-6">
                Pronto para revolucionar seu cardápio?
              </h3>
              <p className="text-xl lg:text-2xl text-white/90 max-w-2xl mx-auto">
                Junte-se a mais de 500 empresas que já otimizaram suas refeições corporativas
              </p>
            </div>
            
            <div className="flex flex-col sm:flex-row gap-4 justify-center">
              <Link to="/auth">
                <Button 
                  size="lg" 
                  className="gap-3 text-lg px-8 h-14 shadow-2xl hover:shadow-3xl transition-all hover:scale-105 bg-white/20 backdrop-blur-sm text-primary hover:bg-white/30"
                >
                  Começar Agora
                  <ArrowRight className="w-5 h-5" />
                </Button>
              </Link>
              <Button 
                size="lg" 
                variant="outline" 
                className="gap-3 text-lg px-8 h-14 border-white text-white hover:bg-white/10 hover:text-white hover:border-white/50 transition-all"
              >
                Ver Demonstração
              </Button>
            </div>
            
            <div className="flex flex-wrap justify-center gap-6 text-sm text-white/80">
              <div className="flex items-center gap-2">
                <Award className="w-4 h-4" />
                <span>14 dias grátis</span>
              </div>
              <div className="flex items-center gap-2">
                <Shield className="w-4 h-4" />
                <span>Sem compromisso</span>
              </div>
              <div className="flex items-center gap-2">
                <Clock className="w-4 h-4" />
                <span>Suporte 24/7</span>
              </div>
            </div>
          </div>
        </div>
      </section>

      {/* Footer */}
      <footer className="bg-gray-900 text-white py-16">
        <div className="container mx-auto px-4 sm:px-6 lg:px-8">
          <div className="grid md:grid-cols-4 gap-8">
            <div className="space-y-4">
              <div className="flex items-center gap-3">
                <Logo variant="colored" size="sm" />
                <div>
                  <h4 className="font-bold">Cardápio Semanal</h4>
                  <p className="text-sm text-gray-400">Gestão Inteligente</p>
                </div>
              </div>
              <p className="text-gray-400 leading-relaxed">
                A solução completa para empresas que querem otimizar seus cardápios corporativos.
              </p>
            </div>
            
            <div>
              <h5 className="font-semibold mb-4">Produto</h5>
              <ul className="space-y-2 text-gray-400">
                <li><a href="#recursos" className="hover:text-white transition-colors">Recursos</a></li>
                <li><a href="#precos" className="hover:text-white transition-colors">Preços</a></li>
                <li><a href="#" className="hover:text-white transition-colors">Demonstração</a></li>
                <li><a href="#" className="hover:text-white transition-colors">API</a></li>
              </ul>
            </div>
            
            <div>
              <h5 className="font-semibold mb-4">Empresa</h5>
              <ul className="space-y-2 text-gray-400">
                <li><a href="#" className="hover:text-white transition-colors">Sobre Nós</a></li>
                <li><a href="#" className="hover:text-white transition-colors">Carreiras</a></li>
                <li><a href="#" className="hover:text-white transition-colors">Blog</a></li>
                <li><a href="#" className="hover:text-white transition-colors">Contato</a></li>
              </ul>
            </div>
            
            <div>
              <h5 className="font-semibold mb-4">Suporte</h5>
              <ul className="space-y-2 text-gray-400">
                <li><a href="#" className="hover:text-white transition-colors">Ajuda</a></li>
                <li><a href="#" className="hover:text-white transition-colors">Privacidade</a></li>
                <li><a href="#" className="hover:text-white transition-colors">Termos</a></li>
                <li><a href="#" className="hover:text-white transition-colors">Status</a></li>
              </ul>
            </div>
          </div>
          
          <div className="border-t border-gray-800 mt-12 pt-8 text-center text-gray-400">
            <p>&copy; 2024 Cardápio Semanal. Todos os direitos reservados.</p>
          </div>
        </div>
      </footer>
    </div>
  );
};

export default Landing;
