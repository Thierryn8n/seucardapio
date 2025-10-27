import { useState } from "react";
import { Button } from "@/components/ui/button";
import { WeeklyMenu } from "@/components/WeeklyMenu";
import { ChevronLeft, ChevronRight, Settings } from "lucide-react";
import { startOfWeek, addWeeks, format } from "date-fns";
import { ptBR } from "date-fns/locale";
import { Link } from "react-router-dom";

const Index = () => {
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
    <div className="min-h-screen bg-background">
      {/* Header */}
      <header className="sticky top-0 z-10 bg-card/95 backdrop-blur-sm border-b shadow-sm">
        <div className="container mx-auto px-4 py-6">
          <div className="flex flex-col md:flex-row md:items-center justify-between gap-4">
            <div>
              <h1 className="text-4xl md:text-5xl font-bold mb-2 bg-gradient-to-r from-primary to-accent bg-clip-text text-transparent">
                Cardápio Semanal
              </h1>
              <p className="text-muted-foreground">
                Confira as refeições planejadas para a semana
              </p>
            </div>
            <Link to="/auth">
              <Button variant="outline" size="sm" className="gap-2">
                <Settings className="w-4 h-4" />
                Admin
              </Button>
            </Link>
          </div>
        </div>
      </header>

      {/* Week Navigation */}
      <div className="sticky top-[88px] z-10 bg-background/95 backdrop-blur-sm border-b py-4 shadow-sm">
        <div className="container mx-auto px-4">
          <div className="flex items-center justify-between gap-4">
            <Button
              variant="outline"
              size="icon"
              onClick={goToPreviousWeek}
              className="shrink-0"
            >
              <ChevronLeft className="h-4 w-4" />
            </Button>

            <div className="text-center">
              <h2 className="text-xl font-semibold text-foreground">
                Semana de {format(currentWeekStart, "d 'de' MMMM", { locale: ptBR })}
              </h2>
              <Button
                variant="link"
                size="sm"
                onClick={goToCurrentWeek}
                className="text-muted-foreground"
              >
                Voltar para semana atual
              </Button>
            </div>

            <Button
              variant="outline"
              size="icon"
              onClick={goToNextWeek}
              className="shrink-0"
            >
              <ChevronRight className="h-4 w-4" />
            </Button>
          </div>
        </div>
      </div>

      {/* Content */}
      <main className="container mx-auto px-4 py-8">
        <WeeklyMenu weekStartDate={currentWeekStart} />
      </main>
    </div>
  );
};

export default Index;
