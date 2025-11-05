interface LogoProps {
  variant?: "default" | "colored";
  size?: "sm" | "md" | "lg";
  className?: string;
}

export function Logo({ variant = "default", size = "md", className = "" }: LogoProps) {
  const sizeClasses = {
    sm: "w-20 h-20",
    md: "w-32 h-32", 
    lg: "w-40 h-40",
  };

  return (
    <img 
      src="/logo -seu cardapio- para fundo bege.png" 
      alt="Seu Cardápio" 
      className={`${sizeClasses[size]} ${className} object-contain`}
    />
  );
}