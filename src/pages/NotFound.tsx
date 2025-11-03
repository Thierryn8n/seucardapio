import { useLocation, Link } from "react-router-dom";
import { useEffect } from "react";
import { Button } from "@/components/ui/button";
import { Home, ArrowLeft, AlertTriangle } from "lucide-react";
import { Card, CardContent, CardDescription, CardHeader, CardTitle } from "@/components/ui/card";

const NotFound = () => {
  const location = useLocation();

  useEffect(() => {
    console.error("404 Error: User attempted to access non-existent route:", location.pathname);
  }, [location.pathname]);

  return (
    <div className="min-h-screen bg-gradient-to-br from-background via-primary/5 to-secondary/5 flex items-center justify-center p-4">
      <Card className="max-w-md w-full">
        <CardHeader className="text-center">
          <div className="inline-flex items-center justify-center w-16 h-16 rounded-full bg-destructive/10 mb-4 mx-auto">
            <AlertTriangle className="w-8 h-8 text-destructive" />
          </div>
          <CardTitle className="text-2xl">Página Não Encontrada</CardTitle>
          <CardDescription>
            A página que você está tentando acessar não existe ou foi movida.
          </CardDescription>
        </CardHeader>
        <CardContent className="space-y-4">
          <div className="bg-muted rounded-lg p-3">
            <p className="text-sm text-muted-foreground">
              <strong>Caminho:</strong> {location.pathname}
            </p>
          </div>
          <div className="space-y-3">
            <Link to="/" className="w-full">
              <Button className="w-full">
                <Home className="w-4 h-4 mr-2" />
                Voltar para Home
              </Button>
            </Link>
            <Button 
              variant="outline" 
              onClick={() => window.history.back()} 
              className="w-full"
            >
              <ArrowLeft className="w-4 h-4 mr-2" />
              Voltar
            </Button>
          </div>
          <div className="text-xs text-muted-foreground text-center space-y-1">
            <p>• Use os links de navegação dentro da aplicação</p>
            <p>• Evite usar os botões voltar/avançar do navegador</p>
            <p>• Em caso de dúvidas, acesse a página inicial</p>
          </div>
        </CardContent>
      </Card>
    </div>
  );
};

export default NotFound;
