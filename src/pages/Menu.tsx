import React, { useState, useRef } from "react";
import { UtensilsCrossed, ChevronLeft, ChevronRight, Camera, FileText, Share, Settings, MessageSquare, X } from "lucide-react";
import { format, addDays, startOfWeek, addWeeks } from "date-fns";
import { ptBR } from "date-fns/locale";
import clsx from "clsx";
import { useParams } from "react-router-dom";
import { useQuery } from "@tanstack/react-query";
import { supabase } from "@/integrations/supabase/client";
import { useToast } from "@/hooks/use-toast";
import html2canvas from "html2canvas";
import jsPDF from "jspdf";
import { useSettings } from "@/hooks/useSettings";
import Background from "@/components/Background";

// Interfaces
interface Meal {
  id: string;
  title: string;
  description: string;
  image_url?: string;
  type: "breakfast" | "lunch" | "dinner" | "snack";
  meal_number: number;
}

interface Day {
  date: Date;
  meals: Meal[];
  visible?: boolean;
}

// Configurações para tipos de refeição
const mealTypeConfig = {
  breakfast: {
    label: "Café da manhã",
    gradient: "from-amber-500 to-yellow-500",
    badgeColor: "bg-amber-100 text-amber-800"
  },
  lunch: {
    label: "Almoço",
    gradient: "from-emerald-500 to-green-500",
    badgeColor: "bg-emerald-100 text-emerald-800"
  },
  dinner: {
    label: "Jantar",
    gradient: "from-indigo-500 to-blue-500",
    badgeColor: "bg-indigo-100 text-indigo-800"
  },
  snack: {
    label: "Lanche",
    gradient: "from-orange-500 to-red-500",
    badgeColor: "bg-orange-100 text-orange-800"
  }
};

// Função para determinar se um dia deve ser exibido com base nas configurações
const shouldShowDay = (dayIndex: number, settings?: Settings | null): boolean => {
  if (!settings) return true; // Se não houver configurações, mostrar todos os dias
  
  switch (dayIndex) {
    case 0: return settings.show_sunday;
    case 1: return settings.show_monday;
    case 2: return settings.show_tuesday;
    case 3: return settings.show_wednesday;
    case 4: return settings.show_thursday;
    case 5: return settings.show_friday;
    case 6: return settings.show_saturday;
    default: return true;
  }
};

// Função para determinar o tipo de refeição com base no meal_number
const getMealType = (mealNumber: number): "breakfast" | "lunch" | "dinner" | "snack" => {
  switch (mealNumber) {
    case 1: return "breakfast";
    case 2: return "lunch";
    case 3: return "dinner";
    default: return "snack";
  }
};

const Menu = () => {
  const { id } = useParams();
  const { settings } = useSettings();
  const exportRef = useRef(null);
  const [currentWeekStart, setCurrentWeekStart] = useState(() => {
    return startOfWeek(new Date(), { weekStartsOn: 0 });
  });
  
  // Estados para controles de interface
  const [showWhatsAppOptions, setShowWhatsAppOptions] = useState(false);
  const [showPersonalizationModal, setShowPersonalizationModal] = useState(false);
  const [personalizationSettings, setPersonalizationSettings] = useState({
    includeLogo: true,
    includeBackground: true,
    format: 'png' as 'png' | 'pdf' | 'txt',
    emojiStyle: 'modern' as 'modern' | 'classic' | 'minimal'
  });
  
  // Logos do aplicativo
  const logoColorido = "/logo -seu cardapio- para fundo bege.png";
  const logoPretoBranco = "/logo preto e branco -seu cardapio- para fundo bege.png";

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

  const { data: menus = [], isLoading } = useQuery({
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

  // Processar dados para o formato necessário
  const days: Day[] = Array.from({ length: 7 }, (_, i) => {
    const date = addDays(currentWeekStart, i);
    const dayOfWeek = i; // Usando o índice como dia da semana (0 = domingo, 1 = segunda, etc.)
    
    const dayMeals = menus
      .filter(menu => parseInt(menu.day_of_week) === dayOfWeek)
      .map(menu => ({
        id: menu.id,
        title: menu.meal_name, // Corrigido para usar meal_name do banco
        description: menu.description || "",
        image_url: menu.image_url,
        type: getMealType(menu.meal_number), // Função para determinar o tipo com base no meal_number
        meal_number: menu.meal_number
      }));
    
    return {
      date,
      meals: dayMeals,
      visible: shouldShowDay(i, settings) // Verificando se o dia deve ser exibido com base nas configurações
    };
  });

  // Componente para exibir um card de refeição
  const MealCard = ({ meal }: { meal: Meal }) => {
    const config = mealTypeConfig[meal.type];
    
    return (
      <div className="group relative overflow-hidden rounded-xl bg-white shadow-md transition-all hover:shadow-lg">
        <div className={`absolute inset-0 opacity-0 transition-opacity group-hover:opacity-100 bg-gradient-to-r ${config.gradient} mix-blend-overlay`}></div>
        
        <div className="absolute top-2 right-2">
          <span className={`inline-flex items-center rounded-full px-2.5 py-0.5 text-xs font-medium ${config.badgeColor}`}>
            {config.label}
          </span>
        </div>
        
        <div className="flex">
          {meal.image_url ? (
            <div className="relative h-24 w-24 flex-shrink-0 overflow-hidden">
              <img 
                src={meal.image_url} 
                alt={meal.title}
                className="h-full w-full object-cover transition-transform group-hover:scale-110"
                onError={(e) => {
                  (e.target as HTMLImageElement).src = "https://placehold.co/100x100/orange/white?text=Sem+Imagem";
                }}
              />
            </div>
          ) : (
            <div className="flex h-24 w-24 flex-shrink-0 items-center justify-center bg-gradient-to-br from-amber-50 to-orange-100">
              <UtensilsCrossed className="h-10 w-10 text-orange-300" />
            </div>
          )}
          
          <div className="flex flex-1 flex-col p-3">
            <h3 className="font-medium text-gray-900 line-clamp-1">{meal.title}</h3>
            <p className="mt-1 text-sm text-gray-500 line-clamp-2">{meal.description}</p>
          </div>
        </div>
      </div>
    );
  };

  // Componente para exibir um card de dia vazio
  const EmptyDayCard = () => (
    <div className="flex flex-col items-center justify-center rounded-xl bg-gradient-to-b from-blue-50 to-blue-100 p-6 text-center">
      <div className="mb-3 rounded-full bg-white p-3 shadow-sm">
        <UtensilsCrossed className="h-8 w-8 text-blue-300" />
      </div>
      <h3 className="text-lg font-medium text-gray-700">Nenhum cardápio cadastrado para este dia</h3>
      <p className="mt-1 text-sm text-gray-500">Em breve teremos novidades deliciosas!</p>
    </div>
  );

  // Componente para exibir um card de dia
  const DayCard = ({ day }: { day: Day }) => {
    const dayName = format(day.date, 'EEEE', { locale: ptBR });
    const dayNumber = format(day.date, 'd', { locale: ptBR });
    const monthName = format(day.date, 'MMMM', { locale: ptBR });
    
    return (
      <div className="overflow-hidden rounded-xl bg-white shadow-md">
        <div className="flex items-center border-l-4 border-orange-500 bg-gradient-to-r from-orange-50 to-transparent p-4">
          <div className="mr-4 flex h-12 w-12 items-center justify-center rounded-full bg-white shadow-sm">
            <span className="text-lg font-bold text-gray-700">{dayNumber}</span>
          </div>
          <div>
            <h3 className="text-lg font-medium capitalize text-gray-900">{dayName}</h3>
            <p className="text-sm text-gray-500 capitalize">{dayNumber} de {monthName}</p>
          </div>
        </div>
        
        <div className="p-4">
          {isLoading ? (
            <div className="flex justify-center p-4">
              <div className="h-8 w-8 animate-spin rounded-full border-4 border-orange-500 border-t-transparent"></div>
            </div>
          ) : day.meals.length > 0 ? (
            <ul className="space-y-3">
              {day.meals.map(meal => (
                <li key={meal.id}>
                  <MealCard meal={meal} />
                </li>
              ))}
            </ul>
          ) : (
            <EmptyDayCard />
          )}
        </div>
      </div>
    );
  };

  const exportAsPNG = async () => {
    if (!menus.length) {
      toast({ title: "Nenhum cardápio para exportar", variant: "destructive" });
      return;
    }
    
    try {
      // Ocultar a div sticky temporariamente
      const stickyElement = document.querySelector('.sticky.top-4.z-10');
      if (stickyElement) {
        (stickyElement as HTMLElement).style.display = 'none';
      }
      
      // Capturar toda a página com o background
      const element = document.querySelector('.min-h-screen');
      if (!element) return;
      
      const canvas = await html2canvas(element as HTMLElement, {
        scale: 2,
        useCORS: true,
        allowTaint: true,
        backgroundColor: null, // Manter background transparente para capturar orbes
        width: element.clientWidth,
        height: element.clientHeight,
        windowWidth: element.clientWidth,
        windowHeight: element.clientHeight,
      });
      
      // Restaurar a visibilidade da div sticky
      if (stickyElement) {
        (stickyElement as HTMLElement).style.display = '';
      }
      
      const link = document.createElement("a");
      link.download = `cardapio-${format(currentWeekStart, "yyyy-MM-dd")}.png`;
      link.href = canvas.toDataURL("image/png");
      link.click();
      
      toast({ title: "Cardápio exportado com sucesso!" });
    } catch (error) {
      console.error("Erro ao exportar PNG:", error);
      toast({ title: "Erro ao exportar cardápio", variant: "destructive" });
    }
  };

  const exportAsPDF = async () => {
    if (!menus.length) {
      toast({ title: "Nenhum cardápio para exportar", variant: "destructive" });
      return;
    }
    
    try {
      // Ocultar a div sticky temporariamente
      const stickyElement = document.querySelector('.sticky.top-4.z-10');
      if (stickyElement) {
        (stickyElement as HTMLElement).style.display = 'none';
      }
      
      // Capturar toda a página com o background para PDF
      const element = document.querySelector('.min-h-screen');
      if (!element) return;
      
      const canvas = await html2canvas(element as HTMLElement, {
        scale: 2,
        useCORS: true,
        allowTaint: true,
        backgroundColor: null, // Manter background transparente para capturar orbes
        width: element.clientWidth,
        height: element.clientHeight,
        windowWidth: element.clientWidth,
        windowHeight: element.clientHeight,
      });
      
      // Restaurar a visibilidade da div sticky
      if (stickyElement) {
        (stickyElement as HTMLElement).style.display = '';
      }
      
      const imgData = canvas.toDataURL("image/png");
      
      // Criar PDF no formato A4 retrato (vertical)
      const pdf = new jsPDF({
        orientation: "portrait", // Mudar para retrato (vertical)
        unit: "mm",
        format: "a4", // Formato A4 padrão
      });
      
      // Calcular dimensões para caber a imagem no A4 retrato
      const pdfWidth = pdf.internal.pageSize.getWidth();
      const pdfHeight = pdf.internal.pageSize.getHeight();
      
      // Calcular proporção para caber a imagem na página
      const canvasWidth = canvas.width;
      const canvasHeight = canvas.height;
      const canvasRatio = canvasWidth / canvasHeight;
      const pdfRatio = pdfWidth / pdfHeight;
      
      let imgWidth, imgHeight, x, y;
      
      if (canvasRatio > pdfRatio) {
        // Imagem mais larga que a página - ajustar largura
        imgWidth = pdfWidth - 20; // Margem de 10mm de cada lado
        imgHeight = imgWidth / canvasRatio;
        x = 10; // Margem esquerda
        y = (pdfHeight - imgHeight) / 2; // Centralizar verticalmente
      } else {
        // Imagem mais alta que a página - ajustar altura
        imgHeight = pdfHeight - 20; // Margem de 10mm em cima e embaixo
        imgWidth = imgHeight * canvasRatio;
        y = 10; // Margem superior
        x = (pdfWidth - imgWidth) / 2; // Centralizar horizontalmente
      }
      
      pdf.addImage(imgData, "PNG", x, y, imgWidth, imgHeight);
      pdf.save(`cardapio-${format(currentWeekStart, "yyyy-MM-dd")}.pdf`);
      
      toast({ title: "PDF exportado com sucesso!" });
    } catch (error) {
      console.error("Erro ao exportar PDF:", error);
      toast({ title: "Erro ao exportar PDF", variant: "destructive" });
    }
  };

  const shareOnWhatsApp = async () => {
    if (!menus.length) {
      toast({ title: "Nenhum cardápio para compartilhar", variant: "destructive" });
      return;
    }
    
    try {
      const element = document.getElementById("export-container");
      if (!element) return;
      
      element.style.display = "block";
      
      const canvas = await html2canvas(element.firstChild as HTMLElement, {
        scale: 2,
        useCORS: true,
        allowTaint: true,
        backgroundColor: "#ffffff",
      });
      
      element.style.display = "none";
      
      // Converter para Blob
      canvas.toBlob(blob => {
        if (!blob) {
          toast({ title: "Erro ao gerar imagem", variant: "destructive" });
          return;
        }
        
        // Criar URL temporária
        const file = new File([blob], "cardapio.png", { type: "image/png" });
        const fileUrl = URL.createObjectURL(file);
        
        // Compartilhar via Web Share API se disponível
        if (navigator.share) {
          navigator
            .share({
              title: "Cardápio Semanal",
              text: `Cardápio da semana de ${format(currentWeekStart, "dd/MM", { locale: ptBR })} a ${format(
                addDays(currentWeekStart, 6),
                "dd/MM",
                { locale: ptBR }
              )}`,
              files: [file],
            })
            .then(() => toast({ title: "Compartilhado com sucesso!" }))
            .catch(error => {
              console.error("Erro ao compartilhar:", error);
              // Fallback para WhatsApp
              shareViaWhatsApp(fileUrl);
            });
        } else {
          // Fallback para WhatsApp
          shareViaWhatsApp(fileUrl);
        }
      }, "image/png");
    } catch (error) {
      console.error("Erro ao compartilhar:", error);
      toast({ title: "Erro ao compartilhar cardápio", variant: "destructive" });
    }
  };

  const shareViaWhatsApp = (fileUrl: string) => {
    const text = `Cardápio da semana de ${format(currentWeekStart, "dd/MM", { locale: ptBR })} a ${format(
      addDays(currentWeekStart, 6),
      "dd/MM",
      { locale: ptBR }
    )}`;
    
    const whatsappUrl = `https://wa.me/?text=${encodeURIComponent(text)}`;
    window.open(whatsappUrl, "_blank");
    
    // Como não podemos enviar a imagem diretamente via URL, oferecemos download
    const link = document.createElement("a");
    link.href = fileUrl;
    link.download = `cardapio-${format(currentWeekStart, "yyyy-MM-dd")}.png`;
    link.click();
    
    toast({ title: "Imagem baixada para compartilhamento" });
  };

  // Função para gerar texto formatado com emojis para WhatsApp
  const generateWhatsAppText = (): string => {
    const emojiStyles = {
      modern: {
        breakfast: "🥐☕",
        lunch: "🍽️🥗",
        dinner: "🍽️🍷",
        snack: "🍎🥜",
        separator: "•",
        title: "📋",
        week: "📅",
        logo: "🍽️"
      },
      classic: {
        breakfast: "🌅",
        lunch: "☀️",
        dinner: "🌙",
        snack: "🍎",
        separator: "-",
        title: "📄",
        week: "📆",
        logo: "🏪"
      },
      minimal: {
        breakfast: "🥄",
        lunch: "🍴",
        dinner: "🍴",
        snack: "🥨",
        separator: "•",
        title: "",
        week: "",
        logo: ""
      }
    };

    const emojis = emojiStyles[personalizationSettings.emojiStyle];
    
    let text = "";
    
    // Cabeçalho
    if (personalizationSettings.includeLogo) {
      text += `${emojis.logo} *SEU CARDÁPIO* ${emojis.logo}\\n\\n`;
    }
    
    text += `${emojis.week} *Cardápio da semana:*\\n`;
    text += `*${format(currentWeekStart, "dd/MM", { locale: ptBR })}* a *${format(
      addDays(currentWeekStart, 6),
      "dd/MM",
      { locale: ptBR }
    )}*\\n\\n`;
    
    // Adicionar refeições por dia
    days.forEach((day, index) => {
      if (!day.visible || day.meals.length === 0) return;
      
      const dayName = format(day.date, "EEEE", { locale: ptBR });
      const capitalizedDay = dayName.charAt(0).toUpperCase() + dayName.slice(1);
      
      text += `*${capitalizedDay}* ${emojis.separator} *${format(day.date, "dd/MM")}*\\n`;
      
      day.meals.forEach(meal => {
        const config = mealTypeConfig[meal.type];
        const mealEmoji = emojis[meal.type as keyof typeof emojis];
        
        text += `  ${mealEmoji} *${config.label}:* ${meal.title}\\n`;
        if (meal.description) {
          text += `    _${meal.description}_\\n`;
        }
      });
      
      text += "\\n";
    });
    
    // Rodapé
    text += "\\n*${emojis.title} Bom apetite!* 🍽️\\n";
    if (settings?.companyName) {
      text += `_${settings.companyName}_`;
    }
    
    return text;
  };

  // Função para compartilhar via WhatsApp com opções
  const handleWhatsAppShare = async (format: 'png' | 'pdf' | 'txt') => {
    if (!menus.length) {
      toast({ title: "Nenhum cardápio para compartilhar", variant: "destructive" });
      return;
    }
    
    setShowWhatsAppOptions(false);
    
    try {
      if (format === 'txt') {
        // Compartilhar texto diretamente
        const text = generateWhatsAppText();
        const whatsappUrl = `https://wa.me/?text=${encodeURIComponent(text)}`;
        window.open(whatsappUrl, "_blank");
        toast({ title: "Cardápio em texto enviado para WhatsApp!" });
      } else if (format === 'png') {
        // Compartilhar como imagem
        await shareOnWhatsApp();
      } else if (format === 'pdf') {
        // Gerar PDF e compartilhar
        await shareWhatsAppPDF();
      }
    } catch (error) {
      console.error("Erro ao compartilhar:", error);
      toast({ title: "Erro ao compartilhar cardápio", variant: "destructive" });
    }
  };

  // Função para compartilhar PDF via WhatsApp
  const shareWhatsAppPDF = async () => {
    try {
      // Ocultar a div sticky temporariamente
      const stickyElement = document.querySelector('.sticky.top-4.z-10');
      if (stickyElement) {
        (stickyElement as HTMLElement).style.display = 'none';
      }
      
      // Capturar toda a página com o background para PDF
      const element = document.querySelector('.min-h-screen');
      if (!element) return;
      
      const canvas = await html2canvas(element as HTMLElement, {
        scale: 2,
        useCORS: true,
        allowTaint: true,
        backgroundColor: null,
        width: element.clientWidth,
        height: element.clientHeight,
        windowWidth: element.clientWidth,
        windowHeight: element.clientHeight,
      });
      
      // Restaurar a visibilidade da div sticky
      if (stickyElement) {
        (stickyElement as HTMLElement).style.display = '';
      }
      
      const imgData = canvas.toDataURL("image/png");
      
      // Criar PDF no formato A4 retrato
      const pdf = new jsPDF({
        orientation: "portrait",
        unit: "mm",
        format: "a4",
      });
      
      const pdfWidth = pdf.internal.pageSize.getWidth();
      const pdfHeight = pdf.internal.pageSize.getHeight();
      
      const canvasWidth = canvas.width;
      const canvasHeight = canvas.height;
      const canvasRatio = canvasWidth / canvasHeight;
      const pdfRatio = pdfWidth / pdfHeight;
      
      let imgWidth, imgHeight, x, y;
      
      if (canvasRatio > pdfRatio) {
        imgWidth = pdfWidth - 20;
        imgHeight = imgWidth / canvasRatio;
        x = 10;
        y = (pdfHeight - imgHeight) / 2;
      } else {
        imgHeight = pdfHeight - 20;
        imgWidth = imgHeight * canvasRatio;
        y = 10;
        x = (pdfWidth - imgWidth) / 2;
      }
      
      pdf.addImage(imgData, "PNG", x, y, imgWidth, imgHeight);
      
      // Salvar PDF e criar link para download
      const pdfBlob = pdf.output('blob');
      const file = new File([pdfBlob], `cardapio-${format(currentWeekStart, "yyyy-MM-dd")}.pdf`, { type: 'application/pdf' });
      const fileUrl = URL.createObjectURL(file);
      
      // Criar mensagem com link para download
      const text = `Cardápio da semana de ${format(currentWeekStart, "dd/MM", { locale: ptBR })} a ${format(
        addDays(currentWeekStart, 6),
        "dd/MM",
        { locale: ptBR }
      )}\\n\\nPDF anexado! 📄`;
      
      const whatsappUrl = `https://wa.me/?text=${encodeURIComponent(text)}`;
      window.open(whatsappUrl, "_blank");
      
      // Oferecer download do PDF
      const link = document.createElement("a");
      link.href = fileUrl;
      link.download = `cardapio-${format(currentWeekStart, "yyyy-MM-dd")}.pdf`;
      link.click();
      
      toast({ title: "PDF gerado e link enviado para WhatsApp!" });
    } catch (error) {
      console.error("Erro ao gerar PDF para WhatsApp:", error);
      toast({ title: "Erro ao gerar PDF", variant: "destructive" });
    }
  };

  // Componente do Modal de Personalização
  const PersonalizationModal = () => {
    return (
      <div className="fixed inset-0 bg-black bg-opacity-50 flex items-center justify-center z-50">
        <div className="bg-white rounded-lg p-6 max-w-md w-full mx-4 max-h-[80vh] overflow-y-auto">
          <div className="flex items-center justify-between mb-4">
            <h2 className="text-xl font-bold text-gray-900">Personalizar Exportação</h2>
            <button
              onClick={() => setShowPersonalizationModal(false)}
              className="text-gray-400 hover:text-gray-600"
            >
              <X className="h-5 w-5" />
            </button>
          </div>
          
          <div className="space-y-4">
            <div>
              <label className="flex items-center space-x-3">
                <input
                  type="checkbox"
                  checked={personalizationSettings.includeLogo}
                  onChange={(e) => setPersonalizationSettings(prev => ({ ...prev, includeLogo: e.target.checked }))}
                  className="rounded border-gray-300 text-blue-600 focus:ring-blue-500"
                />
                <span className="text-gray-700">Incluir logo/título</span>
              </label>
            </div>
            
            <div>
              <label className="flex items-center space-x-3">
                <input
                  type="checkbox"
                  checked={personalizationSettings.includeBackground}
                  onChange={(e) => setPersonalizationSettings(prev => ({ ...prev, includeBackground: e.target.checked }))}
                  className="rounded border-gray-300 text-blue-600 focus:ring-blue-500"
                />
                <span className="text-gray-700">Incluir background</span>
              </label>
            </div>
            
            <div>
              <label className="block text-sm font-medium text-gray-700 mb-2">
                Formato padrão para exportação
              </label>
              <select
                value={personalizationSettings.format}
                onChange={(e) => setPersonalizationSettings(prev => ({ ...prev, format: e.target.value as 'png' | 'pdf' | 'txt' }))}
                className="w-full rounded-md border-gray-300 shadow-sm focus:border-blue-500 focus:ring-blue-500"
              >
                <option value="png">PNG</option>
                <option value="pdf">PDF</option>
                <option value="txt">TXT</option>
              </select>
            </div>
            
            <div>
              <label className="block text-sm font-medium text-gray-700 mb-2">
                Estilo de emojis
              </label>
              <select
                value={personalizationSettings.emojiStyle}
                onChange={(e) => setPersonalizationSettings(prev => ({ ...prev, emojiStyle: e.target.value as 'modern' | 'classic' | 'minimal' }))}
                className="w-full rounded-md border-gray-300 shadow-sm focus:border-blue-500 focus:ring-blue-500"
              >
                <option value="modern">Moderno (🥐☕ 🍽️🥗)</option>
                <option value="classic">Clássico (🌅 ☀️ 🌙)</option>
                <option value="minimal">Minimalista (🥄 🍴)</option>
              </select>
            </div>
            
            <div className="flex space-x-3 pt-4">
              <button
                onClick={() => setShowPersonalizationModal(false)}
                className="flex-1 px-4 py-2 text-gray-700 bg-gray-200 rounded-md hover:bg-gray-300 transition-colors"
              >
                Cancelar
              </button>
              <button
                onClick={() => {
                  setShowPersonalizationModal(false);
                  toast({ title: "Configurações salvas com sucesso!" });
                }}
                className="flex-1 px-4 py-2 bg-blue-600 text-white rounded-md hover:bg-blue-700 transition-colors"
              >
                Salvar
              </button>
            </div>
          </div>
        </div>
      </div>
    );
  };

  return (
    <div className="min-h-screen">
      {/* Componente Background com orbes animadas */}
      <Background />
      
      {/* Cabeçalho centralizado com logo */}
      <div className="mx-auto max-w-4xl px-4 py-8">
        <div className="mb-8 flex flex-col items-center justify-center">
          <div className="mb-4 flex items-center space-x-64">
            <img src={logoColorido} alt="Seu Cardápio" className="h-16 w-auto" />
            {settings?.logo_url && (
              <img src={settings.logo_url} alt={settings?.companyName || "Logo da Empresa"} className="h-16 w-auto" />
            )}
          </div>
          <h2 className="text-4xl font-bold text-gray-900">Cardápio Semanal</h2>
          <p className="mt-2 text-center text-gray-600">Refeições deliciosas e balanceadas para sua semana</p>
        </div>
        
        {/* Barra de navegação fixa */}
        <div className="sticky top-4 z-10 mb-6 flex items-center justify-between rounded-xl bg-white/80 p-3 shadow-md backdrop-blur-md">
          <div className="flex items-center space-x-1">
            <button
              onClick={goToPreviousWeek}
              className="rounded-lg p-2 text-gray-700 hover:bg-gray-100"
            >
              <ChevronLeft className="h-5 w-5" />
            </button>
            
            <div className="text-sm font-medium">
              Semana de {format(currentWeekStart, 'd', { locale: ptBR })} a {format(addDays(currentWeekStart, 6), 'd', { locale: ptBR })}
            </div>
            
            <button
              onClick={goToNextWeek}
              className="rounded-lg p-2 text-gray-700 hover:bg-gray-100"
            >
              <ChevronRight className="h-5 w-5" />
            </button>
            
            <button
              onClick={goToCurrentWeek}
              className="ml-1 rounded-lg px-2 py-1 text-xs text-blue-600 hover:bg-blue-50"
            >
              Voltar para semana atual
            </button>
          </div>
          
          <div className="flex items-center space-x-1">
            <button
              onClick={exportAsPNG}
              className="flex items-center rounded-lg p-2 text-gray-700 hover:bg-gray-100"
              title="Exportar como PNG"
            >
              <Camera className="h-5 w-5" />
              <span className="ml-1 hidden sm:inline">PNG</span>
            </button>
            
            <button
              onClick={exportAsPDF}
              className="flex items-center rounded-lg p-2 text-gray-700 hover:bg-gray-100"
              title="Exportar como PDF"
            >
              <FileText className="h-5 w-5" />
              <span className="ml-1 hidden sm:inline">PDF</span>
            </button>
            
            <div className="relative">
              <button
                onClick={() => setShowWhatsAppOptions(!showWhatsAppOptions)}
                className="flex items-center rounded-lg p-2 text-gray-700 hover:bg-gray-100"
                title="Compartilhar no WhatsApp"
              >
                <Share className="h-5 w-5" />
                <span className="ml-1 hidden sm:inline">WhatsApp</span>
              </button>
              
              {showWhatsAppOptions && (
                <div className="absolute right-0 mt-2 w-48 bg-white rounded-lg shadow-lg border border-gray-200 z-20">
                  <div className="py-1">
                    <button
                      onClick={() => handleWhatsAppShare('png')}
                      className="flex items-center w-full px-4 py-2 text-sm text-gray-700 hover:bg-gray-100"
                    >
                      <Camera className="h-4 w-4 mr-2" />
                      Compartilhar como PNG
                    </button>
                    <button
                      onClick={() => handleWhatsAppShare('pdf')}
                      className="flex items-center w-full px-4 py-2 text-sm text-gray-700 hover:bg-gray-100"
                    >
                      <FileText className="h-4 w-4 mr-2" />
                      Compartilhar como PDF
                    </button>
                    <button
                      onClick={() => handleWhatsAppShare('txt')}
                      className="flex items-center w-full px-4 py-2 text-sm text-gray-700 hover:bg-gray-100"
                    >
                      <MessageSquare className="h-4 w-4 mr-2" />
                      Compartilhar como Texto
                    </button>
                  </div>
                </div>
              )}
            </div>
            
            {/* Botão Personalizar - apenas para ADM */}
            {isAdmin && (
              <button
                onClick={() => setShowPersonalizationModal(true)}
                className="flex items-center rounded-lg p-2 text-gray-700 hover:bg-gray-100"
                title="Personalizar"
              >
                <Settings className="h-5 w-5" />
                <span className="ml-1 hidden sm:inline">Personalizar</span>
              </button>
            )}
          </div>
        </div>
        
        {/* Lista de dias da semana */}
        <div className="space-y-4">
          {days
            .filter(day => day.visible !== false)
            .map((day, index) => (
              <DayCard key={index} day={day} />
            ))}
        </div>
      </div>
      
      {/* Elemento para exportação */}
      <div id="export-container" className="fixed left-[-9999px] top-[-9999px] hidden">
        <div
          ref={exportRef}
          className="w-[800px] bg-white p-8"
          style={{ fontFamily: "system-ui, sans-serif" }}
        >
          <div className="mb-6 flex items-center justify-between">
            <div className="flex items-center">
              <img src={logoPretoBranco} alt="Seu Cardápio" className="mr-2 h-12 w-auto" />
              <div>
                <h1 className="text-2xl font-bold text-gray-900">Seu Cardápio</h1>
                <p className="text-sm text-gray-500">
                  Semana de {format(currentWeekStart, 'dd/MM/yyyy', { locale: ptBR })} a{" "}
                  {format(addDays(currentWeekStart, 6), 'dd/MM/yyyy', { locale: ptBR })}
                </p>
              </div>
            </div>
            <div className="text-right">
              <h2 className="text-lg font-medium text-gray-900">{settings?.companyName || "Sua Empresa"}</h2>
            </div>
          </div>
          
          <div className="grid grid-cols-7 gap-4">
            {days.map((day, index) => (
              <div key={index} className="rounded border border-gray-200 bg-white">
                <div className="border-b border-gray-200 bg-gray-50 p-2">
                  <h3 className="text-center font-medium capitalize text-gray-900">
                    {format(day.date, 'EEEE', { locale: ptBR })}
                  </h3>
                  <p className="text-center text-sm text-gray-500">
                    {format(day.date, 'd/MM', { locale: ptBR })}
                  </p>
                </div>
                <div className="p-3">
                  {day.meals.length > 0 ? (
                    <div className="space-y-3">
                      {day.meals.map(meal => (
                        <div key={meal.id} className="border-b border-gray-100 pb-2 last:border-0">
                          <h4 className="font-medium text-gray-900">{mealTypeConfig[meal.type].label}</h4>
                          <p className="text-sm font-medium">{meal.title}</p>
                          <p className="text-xs text-gray-500">{meal.description}</p>
                        </div>
                      ))}
                    </div>
                  ) : (
                    <p className="py-2 text-center text-sm text-gray-500">Sem refeições</p>
                  )}
                </div>
              </div>
            ))}
          </div>
        </div>
      </div>
      
      {/* Modais */}
      {showPersonalizationModal && <PersonalizationModal />}
      
      {/* Overlay para fechar o toggle do WhatsApp */}
      {showWhatsAppOptions && (
        <div 
          className="fixed inset-0 z-10" 
          onClick={() => setShowWhatsAppOptions(false)}
        />
      )}
    </div>
  );
};

export default Menu;
