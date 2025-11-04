import { useQuery } from "@tanstack/react-query";
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
}

interface WeeklyMenuProps {
  weekStartDate: Date;
  userId?: string;
}

const weekDays = ["Domingo", "Segunda", "Terça", "Quarta", "Quinta", "Sexta", "Sábado"];

export const WeeklyMenu = ({ weekStartDate, userId }: WeeklyMenuProps) => {
  const { settings } = useSettings();
  const { data: menus, isLoading } = useQuery({
    queryKey: ["menus", weekStartDate.toISOString(), userId],
    queryFn: async () => {
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

      if (error) throw error;
      return data as Menu[];
    },
  });

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

  const menusByDay = menus?.reduce((acc, menu) => {
    if (!acc[menu.day_of_week]) {
      acc[menu.day_of_week] = [];
    }
    acc[menu.day_of_week].push(menu);
    return acc;
  }, {} as Record<number, Menu[]>) || {};

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

  return (
    <div className="space-y-10">
      {activeDays.map((dayIndex) => {
        const currentDate = addDays(weekStartDate, dayIndex);
        const dayMenus = menusByDay[dayIndex] || [];
        
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

              {dayMenus.length > 0 ? (
                <div className="grid grid-cols-1 md:grid-cols-2 lg:grid-cols-3 xl:grid-cols-4 gap-6">
                  {dayMenus.map((menu) => (
                    <MealCard
                      key={menu.id}
                      mealNumber={menu.meal_number}
                      mealName={menu.meal_name}
                      description={menu.description}
                      imageUrl={menu.image_url}
                    />
                  ))}
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
