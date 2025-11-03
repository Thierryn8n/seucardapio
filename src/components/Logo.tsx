import { UtensilsCrossed } from "lucide-react";

interface LogoProps {
  variant?: "default" | "colored";
  size?: "sm" | "md" | "lg";
}

export function Logo({ variant = "default", size = "md" }: LogoProps) {
  const sizeClasses = {
    sm: "w-8 h-8",
    md: "w-12 h-12",
    lg: "w-16 h-16",
  };

  const containerClasses = {
    default: "bg-white rounded-full p-2",
    colored: "bg-gradient-to-br from-orange-500 via-green-400 to-blue-500 rounded-full p-2",
  };

  return (
    <div className="flex items-center gap-3">
      <div className={`relative ${sizeClasses[size]} ${containerClasses[variant]}`}>
        <div className="absolute inset-0 flex items-center justify-center">
          <UtensilsCrossed className="w-2/3 h-2/3 text-slate-800" />
        </div>
        <div className="absolute -top-1 left-1/2 transform -translate-x-1/2 -translate-y-1/2">
          <div className="bg-red-500 w-2 h-2 rounded-full" />
        </div>
        <div className="absolute -top-1 left-1/3 transform -translate-x-1/2 -translate-y-1/2">
          <div className="bg-red-500 w-2 h-2 rounded-full" />
        </div>
        <div className="absolute -top-1 left-2/3 transform -translate-x-1/2 -translate-y-1/2">
          <div className="bg-red-500 w-2 h-2 rounded-full" />
        </div>
        <div className="absolute -top-1 right-1/3 transform translate-x-1/2 -translate-y-1/2">
          <div className="bg-red-500 w-2 h-2 rounded-full" />
        </div>
      </div>
      <span className="text-xl font-bold">Seu Cardápio</span>
    </div>
  );
}