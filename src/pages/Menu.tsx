import { useState } from "react";
import { Button } from "@/components/ui/button";
import { WeeklyMenu } from "@/components/WeeklyMenu";
import { useSettings } from "@/hooks/useSettings";
import { ChevronLeft, ChevronRight, Sparkles, Heart, Download, Share2, FileText, Image, Settings, Eye } from "lucide-react";
import { startOfWeek, addWeeks, format } from "date-fns";
import { ptBR } from "date-fns/locale";
import { useParams } from "react-router-dom";
import { useQuery } from "@tanstack/react-query";
import { supabase } from "@/integrations/supabase/client.ts";
import { useToast } from "@/hooks/use-toast";
import html2canvas from "html2canvas";
import jsPDF from "jspdf";
import { Dialog, DialogContent, DialogHeader, DialogTitle, DialogTrigger } from "@/components/ui/dialog";
import { Slider } from "@/components/ui/slider";
import { Label } from "@/components/ui/label";
import { Select, SelectContent, SelectItem, SelectTrigger, SelectValue } from "@/components/ui/select";
import { Input } from "@/components/ui/input";
import { Switch } from "@/components/ui/switch";

const Menu = () => {
  const { id } = useParams();
  const { settings } = useSettings();
  const [currentWeekStart, setCurrentWeekStart] = useState(() => {
    return startOfWeek(new Date(), { weekStartsOn: 0 });
  });
  const [previewOpen, setPreviewOpen] = useState(false);
  const [previewImage, setPreviewImage] = useState("");
  const [exportOptions, setExportOptions] = useState({
    resolution: 1920,
    quality: 80,
    backgroundColor: "#F5F5DC",
    aspectRatio: "16:9",
    logoSize: settings?.logo_size || 150,
    showLogo: true,
    fontScale: 1.0
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
      // Configurações para alta resolução (1920x1080 ou superior)
      const aspectRatio = 16/9; // Proporção 16:9
      const baseWidth = 1920;
      const baseHeight = Math.round(baseWidth / aspectRatio);
      
      const exportContainer = document.createElement("div");
      exportContainer.style.width = `${baseWidth}px`;
      exportContainer.style.minHeight = `${baseHeight}px`;
      exportContainer.style.backgroundColor = "#F5F5DC"; // Fundo bege
      exportContainer.style.padding = "60px";
      exportContainer.style.position = "absolute";
      exportContainer.style.left = "-9999px";
      exportContainer.style.top = "0";
      exportContainer.style.fontFamily = "system-ui, -apple-system, sans-serif";
      exportContainer.style.boxSizing = "border-box";
      
      // Build export HTML with header
      const daysOfWeek = ["Domingo", "Segunda", "Terça", "Quarta", "Quinta", "Sexta", "Sábado"];
      const groupedMenus = menus.reduce((acc: any, menu) => {
        if (!acc[menu.day_of_week]) acc[menu.day_of_week] = [];
        acc[menu.day_of_week].push(menu);
        return acc;
      }, {});

      let html = `<div style="background: #F5F5DC; border-radius: 12px; box-shadow: 0 4px 24px rgba(0,0,0,0.08); overflow: hidden;">`;
      
      // Header com logo e título
      html += '<div style="text-align: center; margin-bottom: 30px; border-bottom: 3px solid #f97316; padding-bottom: 20px;">';
      if (settings?.logo_url) {
        // Logo com alta resolução e posicionamento adequado
        const logoSize = settings.logo_size || 150;
        html += `<div style="display: flex; justify-content: center; align-items: center; margin-bottom: 15px;">
          <img src="${settings.logo_url}" style="width: auto; height: ${logoSize}px; object-fit: contain; max-width: 80%;" />
        </div>`;
      }
      html += `<h1 style="font-size: 42px; font-weight: bold; color: #1a1a1a; margin: 0;">Cardápio Semanal</h1>`;
      html += `<p style="font-size: 20px; color: #444; margin: 10px 0 0 0;">Semana de ${format(currentWeekStart, "dd/MM/yyyy")}</p>`;
      if (settings?.company_name) {
        html += `<p style="font-size: 18px; color: #666; margin: 8px 0 0 0;">${settings.company_name}</p>`;
      }
      html += '</div>';

      // Dias e refeições
      Object.keys(groupedMenus).sort().forEach((day) => {
        html += `<div style="margin-bottom: 30px; page-break-inside: avoid;">`;
        html += `<h2 style="font-size: 28px; font-weight: bold; color: #1a1a1a; margin: 0 0 15px 0; padding-left: 15px; border-left: 6px solid #f97316;">${daysOfWeek[Number(day)]}</h2>`;
        html += '<div style="display: grid; grid-template-columns: repeat(2, 1fr); gap: 20px;">';
        
        groupedMenus[day].forEach((menu: any) => {
          html += '<div style="background: #fff; border: 1px solid #e5e5e5; border-radius: 12px; padding: 15px; overflow: hidden; box-shadow: 0 2px 8px rgba(0,0,0,0.05);">';
          if (menu.image_url) {
            // Imagens com proporção 16:9 ou 4:3
            const imageAspectRatio = 16/9; // Proporção 16:9
            const imageHeight = 220; // Altura fixa para manter proporção
            const imageWidth = imageHeight * imageAspectRatio;
            
            html += `<div style="width: 100%; height: ${imageHeight}px; overflow: hidden; border-radius: 8px; margin-bottom: 12px;">
              <img src="${menu.image_url}" style="width: 100%; height: 100%; object-fit: cover; display: block;" />
            </div>`;
          }
          html += `<p style="font-size: 14px; color: #f97316; font-weight: 600; margin: 0 0 6px 0; text-transform: uppercase;">Refeição ${menu.meal_number}</p>`;
          html += `<h3 style="font-size: 20px; font-weight: bold; color: #1a1a1a; margin: 0 0 8px 0;">${menu.meal_name}</h3>`;
          if (menu.description) {
            html += `<p style="font-size: 16px; color: #444; margin: 0; line-height: 1.5;">${menu.description}</p>`;
          }
          html += '</div>';
        });
        
        html += '</div></div>';
      });
      
      html += '</div>';
      exportContainer.innerHTML = html;
      document.body.appendChild(exportContainer);

      // Configuração para alta resolução
      const canvas = await html2canvas(exportContainer, {
        useCORS: true,
        allowTaint: true,
        scale: 2, // Escala para garantir alta resolução
        logging: false,
        backgroundColor: "#F5F5DC",
        width: baseWidth,
        height: Math.max(baseHeight, exportContainer.offsetHeight),
      });
      
      document.body.removeChild(exportContainer);

      // Exportação com qualidade 80%
      const link = document.createElement("a");
      link.download = `cardapio-${format(currentWeekStart, "dd-MM-yyyy")}.png`;
      link.href = canvas.toDataURL("image/png", 0.8);
      link.click();
      toast({ title: "PNG baixado com sucesso!" });
    } catch (error) {
      console.error("Export error:", error);
      toast({ title: "Erro ao gerar PNG", variant: "destructive" });
    }
  };

  // Função para gerar HTML do cardápio com base nas opções
  const generateMenuHTML = (options = exportOptions) => {
    const daysOfWeek = ["Domingo", "Segunda", "Terça", "Quarta", "Quinta", "Sexta", "Sábado"];
    const groupedMenus = menus.reduce((acc: any, menu) => {
      if (!acc[menu.day_of_week]) acc[menu.day_of_week] = [];
      acc[menu.day_of_week].push(menu);
      return acc;
    }, {});

    const aspectRatioValues = options.aspectRatio === "16:9" ? 16/9 : 4/3;

    let html = `<div style="background: ${options.backgroundColor}; border-radius: 12px; box-shadow: 0 4px 24px rgba(0,0,0,0.08); overflow: hidden;">`;
    
    // Header com logo e título
    html += '<div style="text-align: center; margin-bottom: 30px; border-bottom: 3px solid #f97316; padding-bottom: 20px;">';
    if (settings?.logo_url && options.showLogo) {
      html += `<div style="display: flex; justify-content: center; align-items: center; margin-bottom: 15px;">
        <img src="${settings.logo_url}" style="width: auto; height: ${options.logoSize}px; object-fit: contain; max-width: 80%;" />
      </div>`;
    }
    html += `<h1 style="font-size: ${42 * options.fontScale}px; font-weight: bold; color: #1a1a1a; margin: 0;">Cardápio Semanal</h1>`;
    html += `<p style="font-size: ${20 * options.fontScale}px; color: #444; margin: 10px 0 0 0;">Semana de ${format(currentWeekStart, "dd/MM/yyyy")}</p>`;
    if (settings?.company_name) {
      html += `<p style="font-size: ${18 * options.fontScale}px; color: #666; margin: 8px 0 0 0;">${settings.company_name}</p>`;
    }
    html += '</div>';

    // Dias e refeições
    Object.keys(groupedMenus).sort().forEach((day) => {
      html += `<div style="margin-bottom: 30px; page-break-inside: avoid;">`;
      html += `<h2 style="font-size: ${28 * options.fontScale}px; font-weight: bold; color: #1a1a1a; margin: 0 0 15px 0; padding-left: 15px; border-left: 6px solid #f97316;">${daysOfWeek[Number(day)]}</h2>`;
      html += '<div style="display: grid; grid-template-columns: repeat(2, 1fr); gap: 20px;">';
      
      groupedMenus[day].forEach((menu: any) => {
        html += '<div style="background: #fff; border: 1px solid #e5e5e5; border-radius: 12px; padding: 15px; overflow: hidden; box-shadow: 0 2px 8px rgba(0,0,0,0.05);">';
        if (menu.image_url) {
          const imageHeight = 220; // Altura fixa para manter proporção
          
          html += `<div style="width: 100%; height: ${imageHeight}px; overflow: hidden; border-radius: 8px; margin-bottom: 12px;">
            <img src="${menu.image_url}" style="width: 100%; height: 100%; object-fit: cover; display: block;" />
          </div>`;
        }
        html += `<p style="font-size: ${14 * options.fontScale}px; color: #f97316; font-weight: 600; margin: 0 0 6px 0; text-transform: uppercase;">Refeição ${menu.meal_number}</p>`;
        html += `<h3 style="font-size: ${20 * options.fontScale}px; font-weight: bold; color: #1a1a1a; margin: 0 0 8px 0;">${menu.meal_name}</h3>`;
        if (menu.description) {
          html += `<p style="font-size: ${16 * options.fontScale}px; color: #444; margin: 0; line-height: 1.5;">${menu.description}</p>`;
        }
        html += '</div>';
      });
      
      html += '</div></div>';
    });
    
    html += '</div>';
    return html;
  };

  // Gerar pré-visualização em tempo real
  const generatePreview = async () => {
    if (!menus.length) {
      toast({ title: "Nenhum cardápio para pré-visualizar", variant: "destructive" });
      return;
    }

    try {
      const aspectRatioValues = exportOptions.aspectRatio === "16:9" ? 16/9 : 4/3;
      const baseWidth = exportOptions.resolution;
      const baseHeight = Math.round(baseWidth / aspectRatioValues);
      
      const exportContainer = document.createElement("div");
      exportContainer.style.width = `${baseWidth}px`;
      exportContainer.style.minHeight = `${baseHeight}px`;
      exportContainer.style.backgroundColor = exportOptions.backgroundColor;
      exportContainer.style.padding = "60px";
      exportContainer.style.position = "absolute";
      exportContainer.style.left = "-9999px";
      exportContainer.style.top = "0";
      exportContainer.style.fontFamily = "system-ui, -apple-system, sans-serif";
      exportContainer.style.boxSizing = "border-box";
      
      // Gerar HTML com as opções atuais
      exportContainer.innerHTML = generateMenuHTML();
      document.body.appendChild(exportContainer);

      // Configuração para alta resolução
      const canvas = await html2canvas(exportContainer, {
        useCORS: true,
        allowTaint: true,
        scale: 2,
        logging: false,
        backgroundColor: exportOptions.backgroundColor,
        width: baseWidth,
        height: Math.max(baseHeight, exportContainer.offsetHeight),
      });
      
      document.body.removeChild(exportContainer);

      // Gerar imagem de pré-visualização
      const previewDataUrl = canvas.toDataURL("image/png", exportOptions.quality / 100);
      setPreviewImage(previewDataUrl);
      setPreviewOpen(true);
    } catch (error) {
      console.error("Preview error:", error);
      toast({ title: "Erro ao gerar pré-visualização", variant: "destructive" });
    }
  };

  const exportAsPDF = async () => {
    if (!menus.length) {
      toast({ title: "Nenhum cardápio para exportar", variant: "destructive" });
      return;
    }

    try {
      const aspectRatioValues = exportOptions.aspectRatio === "16:9" ? 16/9 : 4/3;
      const baseWidth = exportOptions.resolution;
      const baseHeight = Math.round(baseWidth / aspectRatioValues);
      
      const exportContainer = document.createElement("div");
      exportContainer.style.width = `${baseWidth}px`;
      exportContainer.style.minHeight = `${baseHeight}px`;
      exportContainer.style.backgroundColor = exportOptions.backgroundColor;
      exportContainer.style.padding = "60px";
      exportContainer.style.position = "absolute";
      exportContainer.style.left = "-9999px";
      exportContainer.style.top = "0";
      exportContainer.style.fontFamily = "system-ui, -apple-system, sans-serif";
      exportContainer.style.boxSizing = "border-box";
      
      // Gerar HTML com as opções atuais
      exportContainer.innerHTML = generateMenuHTML();
      document.body.appendChild(exportContainer);

      // Configuração para alta resolução
      const canvas = await html2canvas(exportContainer, {
        useCORS: true,
        allowTaint: true,
        scale: 2, // Escala para garantir alta resolução
        logging: false,
        backgroundColor: exportOptions.backgroundColor,
        width: baseWidth,
        height: Math.max(baseHeight, exportContainer.offsetHeight),
      });
      
      document.body.removeChild(exportContainer);

      // Criação do PDF com marcadores e metadados
      const imgData = canvas.toDataURL("image/png", exportOptions.quality / 100);
      const pdf = new jsPDF({
        orientation: "portrait",
        unit: "mm",
        format: "a4",
        putOnlyUsedFonts: true,
      });
      
      // Adicionar metadados ao PDF
      pdf.setProperties({
        title: `Cardápio Semanal - ${format(currentWeekStart, "dd/MM/yyyy")}`,
        subject: `Cardápio da semana de ${format(currentWeekStart, "dd/MM/yyyy")}`,
        author: settings?.company_name || "Seu Cardápio",
        keywords: "cardápio, menu, refeições, semanal",
        creator: "Seu Cardápio App"
      });
      
      // Configurar marcadores para seções
      const daysOfWeek = ["Domingo", "Segunda", "Terça", "Quarta", "Quinta", "Sexta", "Sábado"];
      const groupedMenus = menus.reduce((acc: any, menu) => {
        if (!acc[menu.day_of_week]) acc[menu.day_of_week] = [];
        acc[menu.day_of_week].push(menu);
        return acc;
      }, {});
      
      pdf.outline.add(null, "Cardápio Semanal", {pageNumber: 1});
      
      // Adicionar dias da semana como marcadores
      Object.keys(groupedMenus).sort().forEach((day) => {
        pdf.outline.add(null, daysOfWeek[Number(day)], {pageNumber: 1});
      });
      
      // Adicionar imagem ao PDF com dimensões adequadas
      const pdfWidth = 210; // A4 width in mm
      const pdfHeight = 297; // A4 height in mm
      
      pdf.addImage(imgData, "PNG", 0, 0, pdfWidth, pdfHeight);
      
      // Gerar duas versões: web (otimizada) e impressão (alta qualidade)
      // Versão web (otimizada para tamanho menor)
      const webPdf = pdf.output('datauristring');
      
      // Versão para impressão (alta qualidade)
      pdf.save(`cardapio-${format(currentWeekStart, "dd-MM-yyyy")}.pdf`);
      
      toast({ 
        title: "PDF gerado com sucesso!", 
        description: "Versão de alta qualidade para impressão foi baixada."
      });
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
            <Dialog>
              <DialogTrigger asChild>
                <Button
                  variant="outline"
                  size="sm"
                  className="hover:bg-primary hover:text-primary-foreground transition-all"
                >
                  <Settings className="h-4 w-4 mr-2" />
                  Personalizar
                </Button>
              </DialogTrigger>
              <DialogContent className="sm:max-w-[500px]">
                <DialogHeader>
                  <DialogTitle>Personalizar Exportação</DialogTitle>
                </DialogHeader>
                <div className="grid gap-4 py-4">
                  <div className="grid gap-2">
                    <Label htmlFor="resolution">Resolução</Label>
                    <Select 
                      value={exportOptions.resolution.toString()} 
                      onValueChange={(value) => setExportOptions({...exportOptions, resolution: parseInt(value)})}
                    >
                      <SelectTrigger>
                        <SelectValue placeholder="Selecione a resolução" />
                      </SelectTrigger>
                      <SelectContent>
                        <SelectItem value="1280">HD (1280px)</SelectItem>
                        <SelectItem value="1920">Full HD (1920px)</SelectItem>
                        <SelectItem value="2560">2K (2560px)</SelectItem>
                        <SelectItem value="3840">4K (3840px)</SelectItem>
                      </SelectContent>
                    </Select>
                  </div>
                  
                  <div className="grid gap-2">
                    <Label htmlFor="aspectRatio">Proporção</Label>
                    <Select 
                      value={exportOptions.aspectRatio} 
                      onValueChange={(value) => setExportOptions({...exportOptions, aspectRatio: value as "16:9" | "4:3"})}
                    >
                      <SelectTrigger>
                        <SelectValue placeholder="Selecione a proporção" />
                      </SelectTrigger>
                      <SelectContent>
                        <SelectItem value="16:9">16:9 (Widescreen)</SelectItem>
                        <SelectItem value="4:3">4:3 (Padrão)</SelectItem>
                      </SelectContent>
                    </Select>
                  </div>
                  
                  <div className="grid gap-2">
                    <Label>Qualidade da Imagem: {exportOptions.quality}%</Label>
                    <Slider 
                      value={[exportOptions.quality]} 
                      min={50} 
                      max={100} 
                      step={5}
                      onValueChange={(value) => setExportOptions({...exportOptions, quality: value[0]})}
                    />
                  </div>
                  
                  <div className="grid gap-2">
                    <Label>Cor de Fundo</Label>
                    <div className="flex items-center space-x-2">
                      <Input 
                        type="color" 
                        value={exportOptions.backgroundColor}
                        onChange={(e) => setExportOptions({...exportOptions, backgroundColor: e.target.value})}
                        className="w-12 h-8 p-1"
                      />
                      <Input 
                        type="text" 
                        value={exportOptions.backgroundColor}
                        onChange={(e) => setExportOptions({...exportOptions, backgroundColor: e.target.value})}
                        className="flex-1"
                      />
                    </div>
                  </div>
                  
                  <div className="grid gap-2">
                    <Label>Tamanho do Logo: {exportOptions.logoSize}px</Label>
                    <Slider 
                      value={[exportOptions.logoSize]} 
                      min={50} 
                      max={300} 
                      step={10}
                      disabled={!exportOptions.showLogo}
                      onValueChange={(value) => setExportOptions({...exportOptions, logoSize: value[0]})}
                    />
                  </div>
                  
                  <div className="flex items-center space-x-2">
                    <Switch 
                      id="show-logo" 
                      checked={exportOptions.showLogo}
                      onCheckedChange={(checked) => setExportOptions({...exportOptions, showLogo: checked})}
                    />
                    <Label htmlFor="show-logo">Mostrar Logo</Label>
                  </div>
                  
                  <div className="grid gap-2">
                    <Label>Escala da Fonte: {exportOptions.fontScale.toFixed(1)}</Label>
                    <Slider 
                      value={[exportOptions.fontScale * 10]} 
                      min={7} 
                      max={15} 
                      step={1}
                      onValueChange={(value) => setExportOptions({...exportOptions, fontScale: value[0] / 10})}
                    />
                  </div>
                </div>
                <div className="flex justify-end space-x-2">
                  <Button variant="outline" onClick={generatePreview}>
                    <Eye className="mr-2 h-4 w-4" />
                    Pré-visualizar
                  </Button>
                </div>
              </DialogContent>
            </Dialog>
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
      
      {/* Preview Dialog */}
      <Dialog open={previewOpen} onOpenChange={setPreviewOpen}>
        <DialogContent className="max-w-4xl">
          <DialogHeader>
            <DialogTitle>Pré-visualização do Cardápio</DialogTitle>
          </DialogHeader>
          <div className="overflow-auto max-h-[70vh]">
            {previewImage && (
              <img 
                src={previewImage} 
                alt="Pré-visualização do cardápio" 
                className="w-full h-auto object-contain"
              />
            )}
          </div>
          <div className="flex justify-end space-x-2 mt-4">
            <Button variant="outline" onClick={() => setPreviewOpen(false)}>
              Fechar
            </Button>
            <Button onClick={exportAsPDF}>
              Exportar PDF
            </Button>
          </div>
        </DialogContent>
      </Dialog>
    </div>
  );
};

export default Menu;
