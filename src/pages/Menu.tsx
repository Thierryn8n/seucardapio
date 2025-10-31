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
    if (!menus.length) {
      toast({ title: "Nenhum cardápio para exportar", variant: "destructive" });
      return;
    }

    try {
      const exportContainer = document.createElement("div");
      exportContainer.style.width = "210mm";
      exportContainer.style.minHeight = "297mm";
      exportContainer.style.backgroundColor = "#ffffff";
      exportContainer.style.padding = "15mm";
      exportContainer.style.position = "absolute";
      exportContainer.style.left = "-9999px";
      exportContainer.style.top = "0";
      exportContainer.style.fontFamily = "system-ui, -apple-system, sans-serif";
      
      // Build export HTML with header
      const daysOfWeek = ["Domingo", "Segunda", "Terça", "Quarta", "Quinta", "Sexta", "Sábado"];
      const groupedMenus = menus.reduce((acc: any, menu) => {
        if (!acc[menu.day_of_week]) acc[menu.day_of_week] = [];
        acc[menu.day_of_week].push(menu);
        return acc;
      }, {});

      let html = '<div style="background: white;">';
      
      // Header with logo and title
      html += '<div style="text-align: center; margin-bottom: 20px; border-bottom: 3px solid #f97316; padding-bottom: 15px;">';
      if (settings?.logo_url) {
        html += `<img src="${settings.logo_url}" style="width: ${settings.logo_size || 100}px; height: ${settings.logo_size || 100}px; object-fit: contain; margin: 0 auto 10px;" />`;
      }
      html += `<h1 style="font-size: 32px; font-weight: bold; color: #1a1a1a; margin: 0;">Cardápio Semanal</h1>`;
      html += `<p style="font-size: 16px; color: #666; margin: 5px 0 0 0;">Semana de ${format(currentWeekStart, "dd/MM/yyyy")}</p>`;
      if (settings?.company_name) {
        html += `<p style="font-size: 14px; color: #888; margin: 5px 0 0 0;">${settings.company_name}</p>`;
      }
      html += '</div>';

      // Days and meals
      Object.keys(groupedMenus).sort().forEach((day) => {
        html += `<div style="margin-bottom: 15px; page-break-inside: avoid;">`;
        html += `<h2 style="font-size: 20px; font-weight: bold; color: #1a1a1a; margin: 0 0 8px 0; padding-left: 10px; border-left: 4px solid #f97316;">${daysOfWeek[Number(day)]}</h2>`;
        html += '<div style="display: grid; grid-template-columns: repeat(2, 1fr); gap: 10px;">';
        
        groupedMenus[day].forEach((menu: any) => {
          html += '<div style="background: #f9f9f9; border: 1px solid #e5e5e5; border-radius: 8px; padding: 10px; overflow: hidden;">';
          if (menu.image_url) {
            html += `<img src="${menu.image_url}" style="width: 100%; height: 120px; object-fit: cover; border-radius: 6px; margin-bottom: 8px; display: block;" />`;
          }
          html += `<p style="font-size: 11px; color: #f97316; font-weight: 600; margin: 0 0 4px 0; text-transform: uppercase;">Refeição ${menu.meal_number}</p>`;
          html += `<h3 style="font-size: 15px; font-weight: bold; color: #1a1a1a; margin: 0 0 4px 0;">${menu.meal_name}</h3>`;
          if (menu.description) {
            html += `<p style="font-size: 12px; color: #666; margin: 0; line-height: 1.4;">${menu.description}</p>`;
          }
          html += '</div>';
        });
        
        html += '</div></div>';
      });
      
      html += '</div>';
      exportContainer.innerHTML = html;
      document.body.appendChild(exportContainer);

      const canvas = await html2canvas(exportContainer, {
        useCORS: true,
        allowTaint: true,
        scale: 4,
        logging: false,
        backgroundColor: "#ffffff",
        windowWidth: 794,
        windowHeight: 1123,
      });
      
      document.body.removeChild(exportContainer);

      const link = document.createElement("a");
      link.download = `cardapio-${format(currentWeekStart, "dd-MM-yyyy")}.png`;
      link.href = canvas.toDataURL("image/png", 1.0);
      link.click();
      toast({ title: "PNG baixado com sucesso!" });
    } catch (error) {
      console.error("Export error:", error);
      toast({ title: "Erro ao gerar PNG", variant: "destructive" });
    }
  };

  const exportAsPDF = async () => {
    if (!menus.length) {
      toast({ title: "Nenhum cardápio para exportar", variant: "destructive" });
      return;
    }

    try {
      const exportContainer = document.createElement("div");
      exportContainer.style.width = "210mm";
      exportContainer.style.minHeight = "297mm";
      exportContainer.style.backgroundColor = "#ffffff";
      exportContainer.style.padding = "15mm";
      exportContainer.style.position = "absolute";
      exportContainer.style.left = "-9999px";
      exportContainer.style.top = "0";
      exportContainer.style.fontFamily = "system-ui, -apple-system, sans-serif";
      
      // Build export HTML with header
      const daysOfWeek = ["Domingo", "Segunda", "Terça", "Quarta", "Quinta", "Sexta", "Sábado"];
      const groupedMenus = menus.reduce((acc: any, menu) => {
        if (!acc[menu.day_of_week]) acc[menu.day_of_week] = [];
        acc[menu.day_of_week].push(menu);
        return acc;
      }, {});

      let html = '<div style="background: white;">';
      
      // Header with logo and title
      html += '<div style="text-align: center; margin-bottom: 20px; border-bottom: 3px solid #f97316; padding-bottom: 15px;">';
      if (settings?.logo_url) {
        html += `<img src="${settings.logo_url}" style="width: ${settings.logo_size || 100}px; height: ${settings.logo_size || 100}px; object-fit: contain; margin: 0 auto 10px;" />`;
      }
      html += `<h1 style="font-size: 32px; font-weight: bold; color: #1a1a1a; margin: 0;">Cardápio Semanal</h1>`;
      html += `<p style="font-size: 16px; color: #666; margin: 5px 0 0 0;">Semana de ${format(currentWeekStart, "dd/MM/yyyy")}</p>`;
      if (settings?.company_name) {
        html += `<p style="font-size: 14px; color: #888; margin: 5px 0 0 0;">${settings.company_name}</p>`;
      }
      html += '</div>';

      // Days and meals
      Object.keys(groupedMenus).sort().forEach((day) => {
        html += `<div style="margin-bottom: 15px; page-break-inside: avoid;">`;
        html += `<h2 style="font-size: 20px; font-weight: bold; color: #1a1a1a; margin: 0 0 8px 0; padding-left: 10px; border-left: 4px solid #f97316;">${daysOfWeek[Number(day)]}</h2>`;
        html += '<div style="display: grid; grid-template-columns: repeat(2, 1fr); gap: 10px;">';
        
        groupedMenus[day].forEach((menu: any) => {
          html += '<div style="background: #f9f9f9; border: 1px solid #e5e5e5; border-radius: 8px; padding: 10px; overflow: hidden;">';
          if (menu.image_url) {
            html += `<img src="${menu.image_url}" style="width: 100%; height: 120px; object-fit: cover; border-radius: 6px; margin-bottom: 8px; display: block;" />`;
          }
          html += `<p style="font-size: 11px; color: #f97316; font-weight: 600; margin: 0 0 4px 0; text-transform: uppercase;">Refeição ${menu.meal_number}</p>`;
          html += `<h3 style="font-size: 15px; font-weight: bold; color: #1a1a1a; margin: 0 0 4px 0;">${menu.meal_name}</h3>`;
          if (menu.description) {
            html += `<p style="font-size: 12px; color: #666; margin: 0; line-height: 1.4;">${menu.description}</p>`;
          }
          html += '</div>';
        });
        
        html += '</div></div>';
      });
      
      html += '</div>';
      exportContainer.innerHTML = html;
      document.body.appendChild(exportContainer);

      const canvas = await html2canvas(exportContainer, {
        useCORS: true,
        allowTaint: true,
        scale: 4,
        logging: false,
        backgroundColor: "#ffffff",
        windowWidth: 794,
        windowHeight: 1123,
      });
      
      document.body.removeChild(exportContainer);

      const imgData = canvas.toDataURL("image/png", 1.0);
      const pdf = new jsPDF("p", "mm", "a4");
      const pdfWidth = 210;
      const pdfHeight = 297;
      pdf.addImage(imgData, "PNG", 0, 0, pdfWidth, pdfHeight);
      pdf.save(`cardapio-${format(currentWeekStart, "dd-MM-yyyy")}.pdf`);
      toast({ title: "PDF baixado com sucesso!" });
    } catch (error) {
      console.error("Export error:", error);
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
                    style={{
                      width: `${settings.logo_size || 150}px`,
                      height: `${settings.logo_size || 150}px`,
                      maxWidth: '100%'
                    }}
                    className="object-contain"
                  />
                )}
                {!settings?.logo_url && (
                  <div 
                    style={{
                      width: `${settings?.logo_size || 150}px`,
                      height: `${settings?.logo_size || 150}px`,
                    }}
                    className="rounded-xl bg-gradient-to-br from-primary to-accent flex items-center justify-center shadow-lg"
                  >
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
