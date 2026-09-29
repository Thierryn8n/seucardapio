import { useMemo, useRef, useState, type CSSProperties } from "react";
import { useAuth } from "@/contexts/AuthContext";
import { useAdminStatus } from "@/hooks/useAdminStatus";
import {
  UtensilsCrossed,
  ChevronLeft,
  ChevronRight,
  Camera,
  FileText,
  Settings as SettingsIcon,
  MessageSquare,
  X,
  ShoppingBag,
} from "lucide-react";
import { format, addDays, startOfWeek, addWeeks } from "date-fns";
import { ptBR } from "date-fns/locale";
import { useParams, Link } from "react-router-dom";
import { useQuery } from "@tanstack/react-query";
import { supabase } from "@/integrations/supabase/client";
import { useToast } from "@/hooks/use-toast";
import html2canvas from "html2canvas";
import jsPDF from "jspdf";
import { useSettings, type Settings } from "@/hooks/useSettings";
import { MealSuggestions } from "@/components/MealSuggestions";
import "@/styles/animations.css";

interface Meal {
  id: string;
  title: string;
  description: string;
  image_url?: string;
  type: "breakfast" | "lunch" | "dinner" | "snack";
  meal_number: number;
  isProduct?: boolean;
  price?: number;
}

interface Day {
  date: Date;
  meals: Meal[];
  visible?: boolean;
}

const weekDays = ["Domingo", "Segunda", "Terça", "Quarta", "Quinta", "Sexta", "Sábado"];

const mealTypeConfig = {
  breakfast: { label: "Café da manhã", badgeColor: "bg-secondary/20 text-secondary-foreground" },
  lunch: { label: "Almoço", badgeColor: "bg-primary/15 text-primary" },
  dinner: { label: "Jantar", badgeColor: "bg-accent/20 text-accent-foreground" },
  snack: { label: "Lanche", badgeColor: "bg-muted text-muted-foreground" },
} as const;

const shouldShowDay = (dayIndex: number, settings?: Settings | null): boolean => {
  if (!settings) return true;
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

const getMealType = (mealNumber: number): "breakfast" | "lunch" | "dinner" | "snack" => {
  switch (mealNumber) {
    case 1: return "breakfast";
    case 2: return "lunch";
    case 3: return "dinner";
    default: return "snack";
  }
};

const emojiStyles = {
  modern: { breakfast: "🥐☕", lunch: "🍽️🥗", dinner: "🍽️🍷", snack: "🍎🥜", separator: "•", logo: "🍽️" },
  classic: { breakfast: "🌅", lunch: "☀️", dinner: "🌙", snack: "🍎", separator: "-", logo: "🏪" },
  minimal: { breakfast: "🥄", lunch: "🍴", dinner: "🍴", snack: "🥨", separator: "•", logo: "" },
};

const MenuContent = () => {
  const { id } = useParams();
  const { settings } = useSettings();
  const { isAdmin, userPlan } = useAuth();
  const { isMasterAdmin } = useAdminStatus(settings?.user_id || "");
  const { toast } = useToast();
  const exportRef = useRef<HTMLDivElement>(null);

  const [currentWeekStart, setCurrentWeekStart] = useState(() => startOfWeek(new Date(), { weekStartsOn: 0 }));
  const [showWhatsAppOptions, setShowWhatsAppOptions] = useState(false);
  const [showPersonalizationModal, setShowPersonalizationModal] = useState(false);
  const [personalizationSettings, setPersonalizationSettings] = useState({
    includeLogo: true,
    format: "png" as "png" | "pdf" | "txt",
    emojiStyle: "modern" as "modern" | "classic" | "minimal",
  });

  const goToPreviousWeek = () => setCurrentWeekStart((prev) => addWeeks(prev, -1));
  const goToNextWeek = () => setCurrentWeekStart((prev) => addWeeks(prev, 1));
  const goToCurrentWeek = () => setCurrentWeekStart(startOfWeek(new Date(), { weekStartsOn: 0 }));

  const { data: weekProducts = [] } = useQuery({
    queryKey: ["week-products", currentWeekStart, id],
    queryFn: async () => {
      const weekStart = format(currentWeekStart, "yyyy-MM-dd");
      const { data, error } = await supabase
        .from("products")
        .select("*")
        .eq("user_id", id)
        .eq("week_start_date", weekStart)
        .eq("available", true)
        .order("day_of_week")
        .order("meal_number");
      if (error) throw error;
      return data ?? [];
    },
    enabled: !!id,
  });

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
      return data ?? [];
    },
    enabled: !!id,
  });

  const days: Day[] = useMemo(() => {
    const validateMenu = (menu: any) =>
      menu && typeof menu.day_of_week === "number" && menu.day_of_week >= 0 && menu.day_of_week <= 6 &&
      typeof menu.meal_number === "number" && menu.meal_number >= 1 && menu.meal_number <= 5 &&
      menu.meal_name && menu.meal_name.trim() !== "";

    const validateProduct = (product: any) =>
      product && typeof product.day_of_week === "number" && product.day_of_week >= 0 && product.day_of_week <= 6 &&
      typeof product.meal_number === "number" && product.meal_number >= 1 && product.meal_number <= 5 &&
      product.name && product.name.trim() !== "";

    const validMenus = menus.filter(validateMenu);
    const validProducts = weekProducts.filter(validateProduct);

    return Array.from({ length: 7 }, (_, dayOfWeek) => {
      const date = addDays(currentWeekStart, dayOfWeek);

      // Master admin / contas com produtos: substituição total dos menus fixos por produtos
      if (isMasterAdmin && validProducts.some((p) => p.day_of_week === dayOfWeek)) {
        const meals = validProducts
          .filter((p) => p.day_of_week === dayOfWeek)
          .sort((a, b) => a.meal_number - b.meal_number)
          .map((p): Meal => ({
            id: p.id,
            title: p.name,
            description: p.description || "",
            image_url: p.image_url,
            type: getMealType(p.meal_number),
            meal_number: p.meal_number,
            isProduct: true,
            price: p.price,
          }));
        return { date, meals, visible: shouldShowDay(dayOfWeek, settings) };
      }

      const menuMap = new Map<string, Meal>();
      validMenus.filter((m) => m.day_of_week === dayOfWeek).forEach((m) => {
        menuMap.set(`${m.day_of_week}-${m.meal_number}`, {
          id: m.id, title: m.meal_name, description: m.description || "",
          image_url: m.image_url, type: getMealType(m.meal_number), meal_number: m.meal_number,
        });
      });

      const productMap = new Map<string, any>();
      validProducts.filter((p) => p.day_of_week === dayOfWeek).forEach((p) => {
        productMap.set(`${p.day_of_week}-${p.meal_number}`, p);
      });

      const combined: Meal[] = [];
      productMap.forEach((p, key) => {
        combined.push({
          id: p.id, title: p.name, description: p.description || "", image_url: p.image_url,
          type: getMealType(p.meal_number), meal_number: p.meal_number, isProduct: true, price: p.price,
        });
      });
      menuMap.forEach((menu, key) => {
        if (!productMap.has(key)) combined.push(menu);
      });
      combined.sort((a, b) => a.meal_number - b.meal_number);

      return { date, meals: combined, visible: shouldShowDay(dayOfWeek, settings) };
    });
  }, [menus, weekProducts, currentWeekStart, isMasterAdmin, settings]);

  const MealCard = ({ meal }: { meal: Meal }) => {
    if (!meal.title || meal.title.trim() === "") return null;
    const config = mealTypeConfig[meal.type];

    return (
      <div className="group relative flex overflow-hidden rounded-xl border border-border bg-card shadow-sm transition-shadow hover:shadow-md">
        <div className="absolute right-2 top-2 z-10">
          <span className={`inline-flex items-center rounded-full px-2.5 py-0.5 text-xs font-medium ${config.badgeColor}`}>
            {config.label}
          </span>
        </div>
        {meal.image_url ? (
          <div className="relative h-24 w-24 flex-shrink-0 overflow-hidden">
            <img
              src={meal.image_url}
              alt={meal.title}
              crossOrigin="anonymous"
              className="h-full w-full object-cover transition-transform group-hover:scale-105"
              onError={(e) => {
                (e.target as HTMLImageElement).src = "https://placehold.co/100x100?text=Sem+Imagem";
              }}
            />
          </div>
        ) : (
          <div className="flex h-24 w-24 flex-shrink-0 items-center justify-center bg-muted">
            <UtensilsCrossed className="h-8 w-8 text-muted-foreground/50" />
          </div>
        )}
        <div className="flex flex-1 flex-col p-3">
          <h3 className="line-clamp-1 font-medium text-foreground">{meal.title}</h3>
          <p className="mt-1 line-clamp-2 text-sm text-muted-foreground">{meal.description}</p>
          {meal.isProduct && typeof meal.price === "number" && meal.price > 0 && (
            <span className="mt-1 text-sm font-semibold text-primary">
              R$ {meal.price.toFixed(2)}
            </span>
          )}
        </div>
      </div>
    );
  };

  const DayCard = ({ day }: { day: Day }) => {
    const dayName = format(day.date, "EEEE", { locale: ptBR });
    const dayNumber = format(day.date, "d");
    const monthName = format(day.date, "MMMM", { locale: ptBR });
    const validMeals = day.meals.filter((m) => m.title && m.title.trim() !== "");

    return (
      <div className="overflow-hidden rounded-xl border border-border bg-card/60 shadow-sm">
        <div className="flex items-center gap-4 border-l-4 border-primary bg-primary/5 p-4">
          <div className="flex h-12 w-12 items-center justify-center rounded-full bg-card shadow-sm">
            <span className="text-lg font-bold text-foreground">{dayNumber}</span>
          </div>
          <div>
            <h3 className="font-playfair text-lg font-semibold capitalize text-foreground">{dayName}</h3>
            <p className="text-sm capitalize text-muted-foreground">{dayNumber} de {monthName}</p>
          </div>
        </div>
        <div className="p-4">
          {isLoading ? (
            <div className="flex justify-center p-4">
              <div className="h-8 w-8 animate-spin rounded-full border-4 border-primary border-t-transparent" />
            </div>
          ) : validMeals.length > 0 ? (
            <ul className="space-y-3">
              {validMeals.map((meal) => (
                <li key={meal.id}>
                  <MealCard meal={meal} />
                </li>
              ))}
            </ul>
          ) : (
            <div className="flex flex-col items-center justify-center rounded-xl border-2 border-dashed border-border bg-muted/30 p-6 text-center">
              <UtensilsCrossed className="mb-2 h-8 w-8 text-muted-foreground/50" />
              <p className="font-medium text-muted-foreground">Nenhum cardápio cadastrado para este dia</p>
            </div>
          )}
        </div>
      </div>
    );
  };

  const captureCanvas = async () => {
    const stickyElement = document.querySelector(".sticky");
    if (stickyElement) (stickyElement as HTMLElement).style.display = "none";
    const element = document.querySelector(".min-h-screen");
    if (!element) return null;
    const canvas = await html2canvas(element as HTMLElement, {
      scale: 2, useCORS: true, allowTaint: true, backgroundColor: null,
      width: (element as HTMLElement).clientWidth, height: (element as HTMLElement).clientHeight,
    });
    if (stickyElement) (stickyElement as HTMLElement).style.display = "";
    return canvas;
  };

  const exportAsPNG = async () => {
    if (!menus.length && !weekProducts.length) {
      toast({ title: "Nenhum cardápio para exportar", variant: "destructive" });
      return;
    }
    try {
      const canvas = await captureCanvas();
      if (!canvas) return;
      const link = document.createElement("a");
      link.download = `cardapio-${format(currentWeekStart, "yyyy-MM-dd")}.png`;
      link.href = canvas.toDataURL("image/png");
      link.click();
      toast({ title: "Cardápio exportado com sucesso!" });
    } catch (error) {
      toast({ title: "Erro ao exportar cardápio", variant: "destructive" });
    }
  };

  const exportAsPDF = async () => {
    if (!menus.length && !weekProducts.length) {
      toast({ title: "Nenhum cardápio para exportar", variant: "destructive" });
      return;
    }
    try {
      const canvas = await captureCanvas();
      if (!canvas) return;
      const imgData = canvas.toDataURL("image/png");
      const pdf = new jsPDF({ orientation: "portrait", unit: "mm", format: "a4" });
      const pdfWidth = pdf.internal.pageSize.getWidth();
      const pdfHeight = pdf.internal.pageSize.getHeight();
      const canvasRatio = canvas.width / canvas.height;
      const pdfRatio = pdfWidth / pdfHeight;
      let imgWidth: number, imgHeight: number, x: number, y: number;
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
      pdf.save(`cardapio-${format(currentWeekStart, "yyyy-MM-dd")}.pdf`);
      toast({ title: "PDF exportado com sucesso!" });
    } catch (error) {
      toast({ title: "Erro ao exportar PDF", variant: "destructive" });
    }
  };

  const generateWhatsAppText = (): string => {
    const emojis = emojiStyles[personalizationSettings.emojiStyle];
    let text = "";
    if (personalizationSettings.includeLogo) {
      text += `${emojis.logo} *${settings?.companyName || "SEU CARDÁPIO"}* ${emojis.logo}\n\n`;
    }
    text += `📅 *Cardápio da semana:*\n`;
    text += `*${format(currentWeekStart, "dd/MM", { locale: ptBR })}* a *${format(addDays(currentWeekStart, 6), "dd/MM", { locale: ptBR })}*\n\n`;

    days.forEach((day) => {
      if (!day.visible || day.meals.length === 0) return;
      const dayName = format(day.date, "EEEE", { locale: ptBR });
      const capitalizedDay = dayName.charAt(0).toUpperCase() + dayName.slice(1);
      text += `*${capitalizedDay}* ${emojis.separator} *${format(day.date, "dd/MM")}*\n`;
      day.meals.forEach((meal) => {
        const config = mealTypeConfig[meal.type];
        const mealEmoji = emojis[meal.type as keyof typeof emojis];
        text += `  ${mealEmoji} *${config.label}:* ${meal.title}\n`;
        if (meal.description) text += `    _${meal.description}_\n`;
      });
      text += "\n";
    });

    text += `\n🍽️ *Bom apetite!*\n`;
    if (settings?.companyName) text += `_${settings.companyName}_`;
    return text;
  };

  const openWhatsAppWithText = (text: string) => {
    window.open(`https://wa.me/?text=${encodeURIComponent(text)}`, "_blank");
  };

  const handleWhatsAppShare = async (exportFormat: "png" | "pdf" | "txt") => {
    if (!menus.length && !weekProducts.length) {
      toast({ title: "Nenhum cardápio para compartilhar", variant: "destructive" });
      return;
    }
    setShowWhatsAppOptions(false);
    try {
      if (exportFormat === "txt") {
        openWhatsAppWithText(generateWhatsAppText());
        toast({ title: "Cardápio em texto enviado para WhatsApp!" });
      } else if (exportFormat === "png") {
        openWhatsAppWithText(`${generateWhatsAppText()}\n\nA imagem do cardápio será baixada em seguida. Anexe-a na conversa.`);
        await exportAsPNG();
      } else {
        openWhatsAppWithText(`${generateWhatsAppText()}\n\nO PDF do cardápio será baixado em seguida. Anexe-o na conversa.`);
        await exportAsPDF();
      }
    } catch (error) {
      toast({ title: "Erro ao compartilhar cardápio", variant: "destructive" });
    }
  };

  const PersonalizationModal = () => (
    <div className="fixed inset-0 z-50 flex items-center justify-center bg-black/50 p-4">
      <div className="w-full max-w-md rounded-lg bg-card p-6 shadow-xl">
        <div className="mb-4 flex items-center justify-between">
          <h2 className="text-xl font-bold text-foreground">Personalizar Exportação</h2>
          <button onClick={() => setShowPersonalizationModal(false)} className="text-muted-foreground hover:text-foreground">
            <X className="h-5 w-5" />
          </button>
        </div>
        <div className="space-y-4">
          <label className="flex items-center gap-3">
            <input
              type="checkbox"
              checked={personalizationSettings.includeLogo}
              onChange={(e) => setPersonalizationSettings((p) => ({ ...p, includeLogo: e.target.checked }))}
              className="rounded border-border text-primary focus:ring-primary"
            />
            <span className="text-foreground">Incluir logo/título no texto</span>
          </label>
          <div>
            <label className="mb-2 block text-sm font-medium text-foreground">Estilo de emojis</label>
            <select
              value={personalizationSettings.emojiStyle}
              onChange={(e) => setPersonalizationSettings((p) => ({ ...p, emojiStyle: e.target.value as "modern" | "classic" | "minimal" }))}
              className="w-full rounded-md border-border bg-background text-foreground shadow-sm focus:border-primary focus:ring-primary"
            >
              <option value="modern">Moderno (🥐☕ 🍽️🥗)</option>
              <option value="classic">Clássico (🌅 ☀️ 🌙)</option>
              <option value="minimal">Minimalista (🥄 🍴)</option>
            </select>
          </div>
          <div className="flex gap-3 pt-2">
            <button
              onClick={() => setShowPersonalizationModal(false)}
              className="flex-1 rounded-md bg-muted px-4 py-2 text-foreground transition-colors hover:bg-muted/80"
            >
              Cancelar
            </button>
            <button
              onClick={() => {
                setShowPersonalizationModal(false);
                toast({ title: "Configurações salvas com sucesso!" });
              }}
              className="flex-1 rounded-md bg-primary px-4 py-2 text-primary-foreground transition-colors hover:bg-primary/90"
            >
              Salvar
            </button>
          </div>
        </div>
      </div>
    </div>
  );

  const themeVars = settings
    ? ({
        "--background": settings.menu_background,
        "--foreground": settings.menu_foreground,
        "--card": settings.menu_card,
        "--card-foreground": settings.menu_foreground,
        "--primary": settings.primary_color,
        "--secondary": settings.secondary_color,
        "--accent": settings.accent_color,
        "--ring": settings.primary_color,
      } as CSSProperties)
    : undefined;

  return (
    <div className="min-h-screen bg-background font-poppins text-foreground" style={themeVars}>
      <div className="mx-auto max-w-4xl px-4 py-8">
        <div className="mb-8 flex flex-col items-center justify-center text-center">
          {settings?.logo_url && (
            <img
              src={settings.logo_url}
              alt={settings?.companyName || "Logo da empresa"}
              className="mb-4 h-32 w-32 object-contain sm:h-40 sm:w-40"
            />
          )}
          {settings?.show_company_name !== false && settings?.companyName && (
            <h1 className="font-playfair text-2xl font-bold text-foreground">{settings.companyName}</h1>
          )}
          <h2 className="mt-1 font-playfair text-3xl font-bold text-foreground sm:text-4xl">Cardápio Semanal</h2>
          <p className="mt-2 text-muted-foreground">Refeições deliciosas e balanceadas para sua semana</p>
          {id && (
            <Link
              to={`/${id}/cardapio`}
              className="mt-4 inline-flex items-center gap-2 rounded-full bg-primary px-5 py-2 text-sm font-medium text-primary-foreground shadow-sm transition-colors hover:bg-primary/90"
            >
              <ShoppingBag className="h-4 w-4" />
              Peça o cardápio de hoje
            </Link>
          )}
        </div>

        <div className="sticky top-2 z-40 mb-6 flex w-full flex-col items-center justify-between gap-2 rounded-xl border border-border bg-card/90 p-3 text-center shadow-md backdrop-blur-md sm:flex-row">
          <div className="flex w-full flex-wrap items-center justify-center gap-1 sm:w-auto">
            <button onClick={goToPreviousWeek} className="rounded-lg p-2 text-foreground hover:bg-muted">
              <ChevronLeft className="h-5 w-5" />
            </button>
            <div className="text-xs font-medium sm:text-sm">
              Semana do dia <span className="font-semibold">{format(currentWeekStart, "d", { locale: ptBR })}</span> ao dia{" "}
              <span className="font-semibold">{format(addDays(currentWeekStart, 6), "d", { locale: ptBR })}</span>
            </div>
            <button onClick={goToNextWeek} className="rounded-lg p-2 text-foreground hover:bg-muted">
              <ChevronRight className="h-5 w-5" />
            </button>
            <button onClick={goToCurrentWeek} className="ml-1 hidden rounded-lg px-2 py-1 text-xs text-primary hover:bg-primary/10 sm:inline">
              Semana atual
            </button>
          </div>

          <div className="flex w-full flex-wrap items-center justify-center gap-1 sm:w-auto">
            <button onClick={exportAsPNG} className="flex items-center rounded-lg p-2 text-foreground hover:bg-muted" title="Exportar como PNG">
              <Camera className="h-5 w-5" />
              <span className="ml-1 hidden sm:inline">PNG</span>
            </button>
            <button onClick={exportAsPDF} className="flex items-center rounded-lg p-2 text-foreground hover:bg-muted" title="Exportar como PDF">
              <FileText className="h-5 w-5" />
              <span className="ml-1 hidden sm:inline">PDF</span>
            </button>
            <div className="relative">
              <button
                onClick={() => setShowWhatsAppOptions(!showWhatsAppOptions)}
                className="flex items-center rounded-lg p-2 text-foreground hover:bg-muted"
                title="Compartilhar no WhatsApp"
              >
                <MessageSquare className="h-5 w-5" />
                <span className="ml-1 hidden sm:inline">WhatsApp</span>
              </button>
              {showWhatsAppOptions && (
                <div className="absolute right-0 z-50 mt-2 w-48 rounded-lg border border-border bg-card shadow-lg">
                  <div className="py-1">
                    <button onClick={() => handleWhatsAppShare("png")} className="flex w-full items-center px-4 py-2 text-sm text-foreground hover:bg-muted">
                      <Camera className="mr-2 h-4 w-4" /> Compartilhar como PNG
                    </button>
                    <button onClick={() => handleWhatsAppShare("pdf")} className="flex w-full items-center px-4 py-2 text-sm text-foreground hover:bg-muted">
                      <FileText className="mr-2 h-4 w-4" /> Compartilhar como PDF
                    </button>
                    <button onClick={() => handleWhatsAppShare("txt")} className="flex w-full items-center px-4 py-2 text-sm text-foreground hover:bg-muted">
                      <MessageSquare className="mr-2 h-4 w-4" /> Compartilhar como Texto
                    </button>
                  </div>
                </div>
              )}
            </div>
            {isAdmin && (
              <button
                onClick={() => setShowPersonalizationModal(true)}
                className="flex items-center rounded-lg p-2 text-foreground hover:bg-muted"
                title="Personalizar"
              >
                <SettingsIcon className="h-5 w-5" />
                <span className="ml-1 hidden sm:inline">Personalizar</span>
              </button>
            )}
          </div>
        </div>

        <div className="space-y-4">
          {days.filter((day) => day.visible !== false).map((day, index) => (
            <div key={index} className="animate-fade-in" style={{ animationDelay: `${index * 0.05}s` }}>
              <DayCard day={day} />
            </div>
          ))}
        </div>

        <div className="mt-8">
          <MealSuggestions />
        </div>
      </div>

      {showPersonalizationModal && <PersonalizationModal />}

      {showWhatsAppOptions && <div className="fixed inset-0 z-0" onClick={() => setShowWhatsAppOptions(false)} />}

      {userPlan !== "professional" && userPlan !== "premium" && (
        <div className="fixed bottom-6 right-4 z-40 flex items-center gap-2">
          <Link
            to="/auth"
            className="rounded-full bg-primary px-3 py-1 text-xs font-medium text-primary-foreground shadow-sm hover:bg-primary/90"
            title="Crie o seu também"
          >
            Crie o seu também
          </Link>
        </div>
      )}
    </div>
  );
};

const Menu = () => <MenuContent />;

export default Menu;
