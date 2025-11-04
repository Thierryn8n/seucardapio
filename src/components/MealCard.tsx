import { Card, CardContent } from "@/components/ui/card";
import { Badge } from "@/components/ui/badge";
import { UtensilsCrossed, Sparkles } from "lucide-react";

interface MealCardProps {
  mealNumber: number;
  mealName: string;
  description?: string;
  imageUrl?: string;
  calories?: number;
  macros?: {
    protein: number;
    carbs: number;
    fat: number;
  };
}

const mealLabels = ["Café da Manhã", "Almoço", "Lanche", "Jantar"];
const mealGradients = [
  "from-orange-500/20 to-yellow-500/20",
  "from-red-500/20 to-orange-500/20", 
  "from-green-500/20 to-emerald-500/20",
  "from-purple-500/20 to-pink-500/20"
];

export const MealCard = ({ mealNumber, mealName, description, imageUrl, calories, macros }: MealCardProps) => {
  return (
    <Card className="group overflow-hidden transition-all duration-500 hover:shadow-2xl hover:-translate-y-2 border-2 hover:border-primary/50 animate-fade-in">
      {imageUrl ? (
        <div className="relative h-52 overflow-hidden">
          <img
            src={imageUrl}
            alt={mealName}
            className="w-full h-full object-cover transition-transform duration-700 group-hover:scale-110"
          />
          <div className="absolute inset-0 bg-gradient-to-t from-black/60 via-transparent to-transparent opacity-0 group-hover:opacity-100 transition-opacity duration-300" />
          <Badge className="absolute top-3 left-3 bg-primary/90 backdrop-blur-sm text-primary-foreground font-semibold shadow-lg border border-white/20 group-hover:scale-110 transition-transform">
            <Sparkles className="w-3 h-3 mr-1" />
            {mealLabels[mealNumber - 1]}
          </Badge>
        </div>
      ) : (
        <div className={`relative h-52 bg-gradient-to-br ${mealGradients[mealNumber - 1]} flex items-center justify-center transition-all duration-500 group-hover:scale-105`}>
          <UtensilsCrossed className="w-20 h-20 text-muted-foreground/40 group-hover:text-muted-foreground/60 transition-all duration-300 group-hover:rotate-12" />
          <Badge className="absolute top-3 left-3 bg-primary/90 backdrop-blur-sm text-primary-foreground font-semibold shadow-lg border border-white/20">
            <Sparkles className="w-3 h-3 mr-1" />
            {mealLabels[mealNumber - 1]}
          </Badge>
        </div>
      )}
      <CardContent className="p-5 space-y-2">
        <h3 className="font-playfair text-2xl font-bold text-card-foreground group-hover:text-primary transition-colors duration-300">
          {mealName}
        </h3>
        {description && (
          <p className="text-sm text-muted-foreground line-clamp-2 leading-relaxed">
            {description}
          </p>
        )}
        {calories && (
          <div className="flex items-center justify-between mt-2 text-xs text-muted-foreground">
            <span className="font-medium">{calories} kcal</span>
            {macros && (
              <div className="flex gap-2">
                <span>P: {macros.protein}g</span>
                <span>C: {macros.carbs}g</span>
                <span>G: {macros.fat}g</span>
              </div>
            )}
          </div>
        )}
      </CardContent>
    </Card>
  );
};
