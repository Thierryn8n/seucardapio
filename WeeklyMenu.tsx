import { useQuery } from "@tanstack/react-query";
import { useMemo } from "react";
import { supabase } from "@/integrations/supabase/client";
import { useSettings } from "@/hooks/useSettings";
import { MealCard } from "./MealCard";
import { Skeleton } from "@/components/ui/skeleton";
import { startOfWeek, addDays, format } from "date-fns";
import { ptBR } from "date-fns/locale";
import { UtensilsCrossed } from "lucide-react";

interface Menu {
  id: string;
  day_of_week: number;
  meal_number: number;
  meal_name: string;
  description: string;
  image_url: string;
  product_id?: string;
}

interface Product {
  id: string;
  name: string;
  description: string;
  price: number;
  image_url: string;
  available: boolean;
  week_start_date?: string;
  day_of_week?: number;
  meal_number?: number;
}

interface WeeklyMenuProps {
  weekStartDate: Date;
  userId?: string;
}

const weekDays = ["Domingo", "Segunda", "Terça", "Quarta", "Quinta", "Sexta", "Sábado"];

export const WeeklyMenu = ({ weekStartDate, userId }: WeeklyMenuProps) => {
  const { settings } = useSettings();
  
  // Buscar menus da semana
  const { data: menus, isLoading: isLoadingMenus } = useQuery({
    queryKey: ["menus", weekStartDate.toISOString(), userId],
    queryFn: async () => {
      console.log("Buscando menus para:", format(weekStartDate, "yyyy-MM-dd"), "userId:", userId);
      
      let query = supabase
        .from("menus")
        .select("*")
        .eq("week_start_date", format(weekStartDate, "yyyy-MM-dd"));
      
      if (userId) {
        query = query.eq("user_id", userId);
      }
      
      const { data, error } = await query
        .order("day_of_week")
        .order("meal_number");

      console.log("Resultado menus:", data, "erro:", error);
      if (error) throw error;
      return data as Menu[];
    },
  });

  // Buscar produtos que correspondem a esta semana
  const { data: products, isLoading: isLoadingProducts } = useQuery({
    queryKey: ["products-week", weekStartDate.toISOString(), userId],
    queryFn: async () => {
      console.log("Buscando produtos para:", format(weekStartDate, "yyyy-MM-dd"), "userId:", userId);
      
      let query = supabase
        .from("products")
        .select("*")
        .eq("week_start_date", format(weekStartDate, "yyyy-MM-dd"));
      
      if (userId) {
        query = query.eq("user_id", userId);
      }
      
      const { data, error } = await query
        .order("day_of_week")
        .order("meal_number");

      console.log("Resultado produtos:", data, "erro:", error);
      if (error) throw error;
      return data as Product[];
    },
  });

  // Combinar menus e produtos com lógica de substituição
  const combinedData = useMemo(() => {
    console.log("=== DEBUG WeeklyMenu ===");
    console.log("Menus encontrados:", menus?.length || 0, menus);
    console.log("Produtos encontrados:", products?.length || 0, products);
    console.log("Data da semana:", format(weekStartDate, "yyyy-MM-dd"));
    
    // Se não houver menus, retornar array vazio
    if (!menus || menus.length === 0) {
      console.log("Nenhum menu encontrado!");
      return [];
    }
    
    // Se não houver produtos, retornar apenas os menus
    if (!products || products.length === 0) {
      console.log("Nenhum produto encontrado, retornando apenas menus");
      return menus.map(menu => ({ type: 'menu' as const, data: menu }));
    }

    // Filtrar produtos para a semana corrente
    const currentWeekProducts = products.filter(product =>
      product.week_start_date === format(weekStartDate, "yyyy-MM-dd")
    );

    const menuMap = new Map<string, Menu>();
    menus.forEach(menu => {
      const key = `${menu.day_of_week}-${menu.meal_number}`;
      menuMap.set(key, menu);
    });

    const productMap = new Map<string, Product>();
    currentWeekProducts.forEach(product => {
      const key = `${product.day_of_week}-${product.meal_number}`;
      productMap.set(key, product);
    });

    // Produtos têm prioridade sobre menus
    const result: Array<{ type: 'menu' | 'product'; data: Menu | Product }> = [];

    // Primeiro adicionar todos os produtos
    currentWeekProducts.forEach(product => {
      result.push({ type: 'product', data: product });
    });

    // Depois adicionar menus que não foram substituídos por produtos
    menuMap.forEach((menu, key) => {
      if (!productMap.has(key)) {
        result.push({ type: 'menu', data: menu });
      }
    });

    console.log("Resultado combinado:", result.length, result);
    console.log("Mapa de produtos:", Array.from(productMap.keys()));
    console.log("Mapa de menus:", Array.from(menuMap.keys()));

    // Ordenar por dia da semana e número da refeição
    return result.sort((a, b) => {
      const aDay = a.type === 'menu' ? (a.data as Menu).day_of_week : (a.data as Product).day_of_week!;
      const bDay = b.type === 'menu' ? (b.data as Menu).day_of_week : (b.data as Product).day_of_week!;

      const aMeal = a.type === 'menu' ? (a.data as Menu).meal_number : (a.data as Product).meal_number!;
      const bMeal = b.type === 'menu' ? (b.data as Menu).meal_number : (b.data as Product).meal_number!;

      if (aDay !== bDay) return aDay - bDay;
      return aMeal - bMeal;
    });
  }, [menus, products, weekStartDate]);

  const isLoading = isLoadingMenus || isLoadingProducts;

  console.log("Estado de loading:", isLoading, "isLoadingMenus:", isLoadingMenus, "isLoadingProducts:", isLoadingProducts);

  if (isLoading) {
    return (
      <div className="space-y-12">
        {[0, 1, 2, 3, 4, 5, 6].map((day) => (
          <div key={day} className="space-y-6 animate-fade-in" style={{ animationDelay: `${day * 0.05}s` }}>
            <div className="space-y-2">
              <Skeleton className="h-10 w-48 rounded-xl" />
              <Skeleton className="h-5 w-32 rounded-lg" />
            </div>
            <div className="grid grid-cols-1 md:grid-cols-2 lg:grid-cols-4 gap-6">
              {[1, 2, 3, 4].map((meal) => (
                <Skeleton key={meal} className="h-72 rounded-2xl" />
              ))}
            </div>
          </div>
        ))}
      </div>
    );
  }

  // Se não há dados carregados, mostrar mensagem
  if (!menus && !products) {
    console.log("Nenhum dado disponível");
    return (
      <div className="text-center py-16">
        <p className="text-muted-foreground">Nenhum cardápio disponível</p>
      </div>
    );
  }

  const itemsByDay = useMemo(() => {
    const grouped: Record<number, Array<{ type: 'menu' | 'product'; data: Menu | Product }>> = {};
    
    combinedData.forEach(item => {
      const dayOfWeek = item.type === 'menu' 
        ? (item.data as Menu).day_of_week 
        : (item.data as Product).day_of_week!;
      
      if (!grouped[dayOfWeek]) {
        grouped[dayOfWeek] = [];
      }
      grouped[dayOfWeek].push({ type: item.type, data: item.data });
    });
    
    console.log("Itens agrupados por dia:", grouped);
    return grouped;
  }, [combinedData]);

  // Filter days based on settings
  const activeDays = settings
    ? [
        settings.show_sunday ? 0 : -1,
        settings.show_monday ? 1 : -1,
        settings.show_tuesday ? 2 : -1,
        settings.show_wednesday ? 3 : -1,
        settings.show_thursday ? 4 : -1,
        settings.show_friday ? 5 : -1,
        settings.show_saturday ? 6 : -1,
      ].filter((day) => day !== -1)
    : [0, 1, 2, 3, 4, 5, 6];

  console.log("Dias ativos:", activeDays);
  console.log("Itens por dia:", itemsByDay);

  return (
    <div className="space-y-10">
      {activeDays.map((dayIndex) => {
        const currentDate = addDays(weekStartDate, dayIndex);
        const dayItems = itemsByDay[dayIndex] || [];
        
        console.log(`Dia ${dayIndex}:`, dayItems.length, "itens");
        
        return (
          <div 
            key={dayIndex} 
            className="animate-fade-in relative bg-gradient-to-br from-primary/5 to-transparent rounded-xl p-6 border shadow-sm" 
            style={{ animationDelay: `${dayIndex * 0.1}s` }}
          >
            {/* Barra lateral gradiente */}
            <div className="absolute left-0 top-0 bottom-0 w-2 bg-gradient-to-b from-primary via-accent to-secondary rounded-l-xl"></div>
            
            <div className="pl-4 space-y-6">
              <div className="space-y-1">
                <h2 className="text-4xl font-bold font-playfair">{weekDays[dayIndex]}</h2>
                <p className="text-muted-foreground text-lg">
                  {format(currentDate, "d 'de' MMMM", { locale: ptBR })}
                </p>
              </div>

              {dayItems.length > 0 ? (
                <div className="grid grid-cols-1 md:grid-cols-2 lg:grid-cols-3 xl:grid-cols-4 gap-6">
                  {dayItems.map((item, index) => {
                    if (item.type === 'product') {
                      const product = item.data as Product;
                      return (
                        <MealCard
                          key={`product-${product.id}-${index}`}
                          mealNumber={product.meal_number!}
                          mealName={product.name}
                          description={product.description}
                          imageUrl={product.image_url}
                          product={{
                            id: product.id,
                            price: product.price,
                            available: product.available
                          }}
                          cartEnabled={settings?.plan_level === 2 || settings?.plan_level === 3}
                        />
                      );
                    } else {
                      const menu = item.data as Menu;
                      return (
                        <MealCard
                          key={`menu-${menu.id}-${index}`}
                          mealNumber={menu.meal_number}
                          mealName={menu.meal_name}
                          description={menu.description}
                          imageUrl={menu.image_url}
                          product={menu.product_id ? {
                            id: menu.product_id,
                            price: 0, // Preço será buscado quando necessário
                            available: true
                          } : undefined}
                        />
                      );
                    }
                  })}
                </div>
              ) : (
                <div className="text-center py-16 bg-gradient-to-br from-muted/30 to-muted/10 rounded-2xl border-2 border-dashed border-border hover:border-primary/50 transition-all duration-300">
                  <div className="inline-flex items-center justify-center w-16 h-16 rounded-full bg-gradient-to-br from-primary/20 to-secondary/20 mb-4">
                    <UtensilsCrossed className="w-8 h-8 text-muted-foreground" />
                  </div>
                  <p className="text-muted-foreground text-lg font-medium">
                    Nenhum cardápio cadastrado para este dia
                  </p>
                  <p className="text-muted-foreground/60 text-sm mt-2">
                    Em breve teremos novidades deliciosas!
                  </p>
                </div>
              )}
            </div>
          </div>
        );
      })}
    </div>
  );
};
