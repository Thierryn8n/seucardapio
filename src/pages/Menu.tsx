import { useState } from "react";
import { Button } from "@/components/ui/button";
import { WeeklyMenu } from "@/components/WeeklyMenu";
import { useSettings } from "@/hooks/useSettings";
import { ChevronLeft, ChevronRight, Sparkles, Heart, Download, Share2, FileText, Image } from "lucide-react";
import { startOfWeek, addWeeks, format } from "date-fns";
import { ptBR } from "date-fns/locale";
import { useParams } from "react-router-dom";
import { useQuery } from "@tanstack/react-query";
import { supabase } from "@/integrations/supabase/client";
import { useToast } from "@/hooks/use-toast";
import html2canvas from "html2canvas";
import jsPDF from "jspdf";

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

  const { toast } = useToast();

  const { data: menus = [] } = useQuery({
    queryKey: ["menus", currentWeekStart, id],
    queryFn: async () => {
      const weekStart = format(currentWeekStart, "yyyy-MM-dd");
      const { data, error } = await supabase
        .from("menus")
        .select("*")
        .eq("user_id", id)
        .eq("week_start_date", weekStart)
        .order("day_of_week")
        .order("meal_number");

      if (error) throw error;
      return data;
    },
  });

  const exportAsPNG = async () => {
    const element = document.getElementById("weekly-menu-content");
    if (!element) return;

    try {
      const canvas = await html2canvas(element, {
        useCORS: true,
        allowTaint: true,
        scale: 2,
        logging: false,
        backgroundColor: '#ffffff'
      });
      const link = document.createElement("a");
      link.download = `cardapio-${format(currentWeekStart, "dd-MM-yyyy")}.png`;
      link.href = canvas.toDataURL();
      link.click();
      toast({ title: "PNG baixado com sucesso!" });
    } catch (error) {
      toast({ title: "Erro ao gerar PNG", variant: "destructive" });
    }
  };

  const exportAsPDF = async () => {
    const element = document.getElementById("weekly-menu-content");
    if (!element) return;

    try {
      const canvas = await html2canvas(element, {
        useCORS: true,
        allowTaint: true,
        scale: 2,
        logging: false,
        backgroundColor: '#ffffff'
      });
      const imgData = canvas.toDataURL("image/png");
      const pdf = new jsPDF("p", "mm", "a4");
      const imgWidth = 210;
      const imgHeight = (canvas.height * imgWidth) / canvas.width;
      pdf.addImage(imgData, "PNG", 0, 0, imgWidth, imgHeight);
      pdf.save(`cardapio-${format(currentWeekStart, "dd-MM-yyyy")}.pdf`);
      toast({ title: "PDF baixado com sucesso!" });
    } catch (error) {
      toast({ title: "Erro ao gerar PDF", variant: "destructive" });
    }
  };

  const exportAsText = () => {
    if (!menus.length) {
      toast({ title: "Nenhum cardápio para exportar", variant: "destructive" });
      return;
    }

    const daysOfWeek = ["Domingo", "Segunda", "Terça", "Quarta", "Quinta", "Sexta", "Sábado"];
    let textContent = `CARDÁPIO SEMANAL - ${format(currentWeekStart, "dd/MM/yyyy")}\n`;
    textContent += `${settings?.company_name || ""}\n\n`;
    
    const groupedMenus = menus.reduce((acc: any, menu) => {
      if (!acc[menu.day_of_week]) acc[menu.day_of_week] = [];
      acc[menu.day_of_week].push(menu);
      return acc;
    }, {});

    Object.keys(groupedMenus).sort().forEach((day) => {
      textContent += `\n${daysOfWeek[Number(day)]}\n`;
      textContent += "=".repeat(30) + "\n";
      groupedMenus[day].forEach((menu: any) => {
        textContent += `\nRefeição ${menu.meal_number}:\n`;
        textContent += `${menu.meal_name}\n`;
        if (menu.description) {
          textContent += `${menu.description}\n`;
        }
      });
    });

    const blob = new Blob([textContent], { type: "text/plain" });
    const link = document.createElement("a");
    link.download = `cardapio-${format(currentWeekStart, "dd-MM-yyyy")}.txt`;
    link.href = URL.createObjectURL(blob);
    link.click();
    toast({ title: "Arquivo TXT baixado com sucesso!" });
  };

  const shareWhatsApp = () => {
    if (!menus.length) {
      toast({ title: "Nenhum cardápio para compartilhar", variant: "destructive" });
      return;
    }

    const daysOfWeek = ["Domingo", "Segunda", "Terça", "Quarta", "Quinta", "Sexta", "Sábado"];
    let message = `*CARDÁPIO SEMANAL*\n${format(currentWeekStart, "dd/MM/yyyy")}\n\n`;
    
    const groupedMenus = menus.reduce((acc: any, menu) => {
      if (!acc[menu.day_of_week]) acc[menu.day_of_week] = [];
      acc[menu.day_of_week].push(menu);
      return acc;
    }, {});

    Object.keys(groupedMenus).sort().forEach((day) => {
      message += `\n*${daysOfWeek[Number(day)]}*\n`;
      groupedMenus[day].forEach((menu: any) => {
        message += `• ${menu.meal_name}`;
        if (menu.description) {
          message += ` - ${menu.description}`;
        }
        message += "\n";
      });
    });

    const whatsappUrl = `https://wa.me/?text=${encodeURIComponent(message)}`;
    window.open(whatsappUrl, "_blank");
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
              <div className="flex flex-col md:flex-row items-center justify-center gap-3 md:gap-4">
                {settings?.logo_url && (
                  <img 
                    src={settings.logo_url} 
                    alt="Logo" 
                    className="w-24 h-24 md:w-36 md:h-36 object-contain"
                  />
                )}
                {!settings?.logo_url && (
                  <div className="w-24 h-24 md:w-36 md:h-36 rounded-xl bg-gradient-to-br from-primary to-accent flex items-center justify-center shadow-lg">
                    <Sparkles className="w-12 h-12 md:w-18 md:h-18 text-white" />
                  </div>
                )}
                <h1 className="text-3xl md:text-4xl lg:text-5xl font-bold bg-gradient-to-r from-primary via-accent to-secondary bg-clip-text text-transparent text-center">
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

      {/* Share Actions */}
      <div className="sticky top-[200px] z-10 bg-card/80 backdrop-blur-md border-b py-4 shadow-sm animate-fade-in" style={{ animationDelay: "0.15s" }}>
        <div className="container mx-auto px-4">
          <div className="flex flex-wrap items-center justify-center gap-3 max-w-4xl mx-auto">
            <Button
              variant="outline"
              size="sm"
              onClick={exportAsPNG}
              className="hover:bg-primary hover:text-primary-foreground transition-all"
            >
              <Image className="h-4 w-4 mr-2" />
              Baixar PNG
            </Button>
            <Button
              variant="outline"
              size="sm"
              onClick={exportAsPDF}
              className="hover:bg-primary hover:text-primary-foreground transition-all"
            >
              <Download className="h-4 w-4 mr-2" />
              Baixar PDF
            </Button>
            <Button
              variant="outline"
              size="sm"
              onClick={exportAsText}
              className="hover:bg-primary hover:text-primary-foreground transition-all"
            >
              <FileText className="h-4 w-4 mr-2" />
              Baixar TXT
            </Button>
            <Button
              variant="outline"
              size="sm"
              onClick={shareWhatsApp}
              className="hover:bg-green-600 hover:text-white transition-all"
            >
              <Share2 className="h-4 w-4 mr-2" />
              Compartilhar WhatsApp
            </Button>
          </div>
        </div>
      </div>

      {/* Content */}
      <main className="container mx-auto px-4 py-12 relative z-0">
        <div id="weekly-menu-content" className="animate-fade-in" style={{ animationDelay: "0.2s" }}>
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
