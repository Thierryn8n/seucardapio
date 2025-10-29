import { useState } from "react";
import { Button } from "@/components/ui/button";
import { WeeklyMenu } from "@/components/WeeklyMenu";
import { useSettings } from "@/hooks/useSettings";
import { ChevronLeft, ChevronRight, Sparkles, Heart } from "lucide-react";
import { startOfWeek, addWeeks, format } from "date-fns";
import { ptBR } from "date-fns/locale";
import { useParams } from "react-router-dom";

const Menu = () => {
  const { id } = useParams();
  const { settings } = useSettings();
  const [currentWeekStart, setCurrentWeekStart] = useState(() => {
    return startOfWeek(new Date(), { weekStartsOn: 0 });
  });

  const goToPreviousWeek = () => {
    setCurrentWeekStart(prev => addWeeks(prev, -1));
  };

  const goToNextWeek = () => {
    setCurrentWeekStart(prev => addWeeks(prev, 1));
  };

  const goToCurrentWeek = () => {
    setCurrentWeekStart(startOfWeek(new Date(), { weekStartsOn: 0 }));
  };

  return (
    <div className="min-h-screen bg-gradient-to-br from-background via-primary/5 to-secondary/10 relative overflow-hidden">
      {/* Decorative gradient orbs */}
      <div className="absolute top-0 right-0 w-96 h-96 bg-primary/10 rounded-full blur-3xl opacity-50 animate-pulse" />
      <div className="absolute bottom-0 left-0 w-96 h-96 bg-secondary/10 rounded-full blur-3xl opacity-50 animate-pulse" style={{ animationDelay: "1s" }} />
      
      {/* Header */}
      <header className="sticky top-0 z-10 bg-card/80 backdrop-blur-md border-b shadow-lg animate-fade-in">
        <div className="container mx-auto px-4 py-6">
          <div className="flex flex-col md:flex-row md:items-center justify-center gap-4">
            <div className="text-center space-y-2">
              <div className="flex items-center justify-center gap-3">
                {settings?.logo_url && (
                  <img 
                    src={settings.logo_url} 
                    alt="Logo" 
                    className="w-12 h-12 object-contain"
                  />
                )}
                {!settings?.logo_url && (
                  <div className="w-12 h-12 rounded-xl bg-gradient-to-br from-primary to-accent flex items-center justify-center shadow-lg">
                    <Sparkles className="w-6 h-6 text-white" />
                  </div>
                )}
                <h1 className="text-4xl md:text-5xl font-bold bg-gradient-to-r from-primary via-accent to-secondary bg-clip-text text-transparent">
                  Cardápio Semanal
                </h1>
              </div>
              <p className="text-muted-foreground text-lg">
                Refeições deliciosas e balanceadas planejadas com carinho
              </p>
            </div>
          </div>
        </div>
      </header>

      {/* Week Navigation */}
      <div className="sticky top-[120px] z-10 bg-gradient-to-r from-card/90 via-card/95 to-card/90 backdrop-blur-md border-b py-6 shadow-lg animate-fade-in" style={{ animationDelay: "0.1s" }}>
        <div className="container mx-auto px-4">
          <div className="flex items-center justify-between gap-4 max-w-3xl mx-auto">
            <Button
              variant="outline"
              size="icon"
              onClick={goToPreviousWeek}
              className="shrink-0 hover:scale-110 transition-all hover:bg-primary hover:text-primary-foreground"
            >
              <ChevronLeft className="h-5 w-5" />
            </Button>

            <div className="text-center space-y-1">
              <h2 className="text-2xl font-bold text-foreground">
                Semana de {format(currentWeekStart, "d 'de' MMMM", { locale: ptBR })}
              </h2>
              <Button
                variant="link"
                size="sm"
                onClick={goToCurrentWeek}
                className="text-muted-foreground hover:text-primary transition-colors"
              >
                Voltar para semana atual
              </Button>
            </div>

            <Button
              variant="outline"
              size="icon"
              onClick={goToNextWeek}
              className="shrink-0 hover:scale-110 transition-all hover:bg-primary hover:text-primary-foreground"
            >
              <ChevronRight className="h-5 w-5" />
            </Button>
          </div>
        </div>
      </div>

      {/* Content */}
      <main className="container mx-auto px-4 py-12 relative z-0">
        <div className="animate-fade-in" style={{ animationDelay: "0.2s" }}>
          <WeeklyMenu weekStartDate={currentWeekStart} userId={id} />
        </div>
      </main>
      
      {/* Footer */}
      <footer className="border-t bg-card/50 backdrop-blur-sm py-8 mt-16">
        <div className="container mx-auto px-4 text-center space-y-6">
          {settings?.donation_enabled && settings?.donation_url && (
            <div className="mb-6">
              <Button
                asChild
                variant="outline"
                size="lg"
                className="group hover:bg-accent hover:text-accent-foreground transition-all"
              >
                <a href={settings.donation_url} target="_blank" rel="noopener noreferrer">
                  <Heart className="mr-2 h-5 w-5 group-hover:fill-current transition-all" />
                  {settings.donation_text}
                </a>
              </Button>
            </div>
          )}
          <p className="text-muted-foreground">
            Feito com ❤️ para {settings?.company_name || "você ter sempre as melhores refeições"}
          </p>
        </div>
      </footer>
    </div>
  );
};

export default Menu;
