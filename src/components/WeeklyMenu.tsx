import { useQuery } from "@tanstack/react-query";
import { supabase } from "@/integrations/supabase/client";
import { MealCard } from "./MealCard";
import { Skeleton } from "@/components/ui/skeleton";
import { startOfWeek, addDays, format } from "date-fns";
import { ptBR } from "date-fns/locale";

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
}

const weekDays = ["Domingo", "Segunda", "Terça", "Quarta", "Quinta", "Sexta", "Sábado"];

export const WeeklyMenu = ({ weekStartDate }: WeeklyMenuProps) => {
  const { data: menus, isLoading } = useQuery({
    queryKey: ["menus", weekStartDate.toISOString()],
    queryFn: async () => {
      const { data, error } = await supabase
        .from("menus")
        .select("*")
        .eq("week_start_date", format(weekStartDate, "yyyy-MM-dd"))
        .order("day_of_week")
        .order("meal_number");

      if (error) throw error;
      return data as Menu[];
    },
  });

  if (isLoading) {
    return (
      <div className="space-y-8">
        {[0, 1, 2, 3, 4, 5, 6].map((day) => (
          <div key={day} className="space-y-4">
            <Skeleton className="h-8 w-40" />
            <div className="grid grid-cols-1 md:grid-cols-2 lg:grid-cols-4 gap-4">
              {[1, 2, 3, 4].map((meal) => (
                <Skeleton key={meal} className="h-64" />
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

  return (
    <div className="space-y-10">
      {[0, 1, 2, 3, 4, 5, 6].map((dayIndex) => {
        const currentDate = addDays(weekStartDate, dayIndex);
        const dayMenus = menusByDay[dayIndex] || [];

        return (
          <div key={dayIndex} className="space-y-4">
            <div className="border-l-4 border-primary pl-4">
              <h2 className="text-3xl font-bold text-foreground">
                {weekDays[dayIndex]}
              </h2>
              <p className="text-sm text-muted-foreground">
                {format(currentDate, "d 'de' MMMM", { locale: ptBR })}
              </p>
            </div>

            {dayMenus.length > 0 ? (
              <div className="grid grid-cols-1 md:grid-cols-2 lg:grid-cols-4 gap-4">
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
              <div className="text-center py-12 bg-muted/30 rounded-lg border-2 border-dashed border-border">
                <p className="text-muted-foreground">
                  Nenhum cardápio cadastrado para este dia
                </p>
              </div>
            )}
          </div>
        );
      })}
    </div>
  );
};
