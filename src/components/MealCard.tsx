import { Card, CardContent } from "@/components/ui/card";
import { Badge } from "@/components/ui/badge";
import { UtensilsCrossed } from "lucide-react";

interface MealCardProps {
  mealNumber: number;
  mealName: string;
  description?: string;
  imageUrl?: string;
}

const mealLabels = ["Café da Manhã", "Almoço", "Lanche", "Jantar"];

export const MealCard = ({ mealNumber, mealName, description, imageUrl }: MealCardProps) => {
  return (
    <Card className="overflow-hidden transition-all duration-300 hover:shadow-lg">
      {imageUrl ? (
        <div className="relative h-48 overflow-hidden">
          <img
            src={imageUrl}
            alt={mealName}
            className="w-full h-full object-cover transition-transform duration-300 hover:scale-105"
          />
          <Badge className="absolute top-3 left-3 bg-primary text-primary-foreground font-medium">
            {mealLabels[mealNumber - 1]}
          </Badge>
        </div>
      ) : (
        <div className="relative h-48 bg-gradient-to-br from-primary/10 to-secondary/10 flex items-center justify-center">
          <UtensilsCrossed className="w-16 h-16 text-muted-foreground" />
          <Badge className="absolute top-3 left-3 bg-primary text-primary-foreground font-medium">
            {mealLabels[mealNumber - 1]}
          </Badge>
        </div>
      )}
      <CardContent className="p-4">
        <h3 className="font-playfair text-xl font-bold mb-2 text-card-foreground">
          {mealName}
        </h3>
        {description && (
          <p className="text-sm text-muted-foreground line-clamp-2">
            {description}
          </p>
        )}
      </CardContent>
    </Card>
  );
};
