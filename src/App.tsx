import { useState, useEffect } from "react";
import { Toaster } from "@/components/ui/toaster";
import { Toaster as Sonner } from "@/components/ui/sonner";
import { TooltipProvider } from "@/components/ui/tooltip";
import { QueryClient, QueryClientProvider } from "@tanstack/react-query";
import { BrowserRouter, Routes, Route } from "react-router-dom";
import { AuthProvider } from "./contexts/AuthContext";
import ErrorBoundary from "./components/ErrorBoundary";
import Landing from "./pages/Landing";
import Menu from "./pages/Menu";
import Auth from "./pages/Auth";
import Admin from "./pages/Admin";
import AdminMenus from "./pages/AdminMenus";
import AdminMenuForm from "./pages/AdminMenuForm";
import AdminSettings from "./pages/AdminSettings";
import AdminGallery from "./pages/AdminGallery";
import NotFound from "./pages/NotFound";

const queryClient = new QueryClient();

const App = () => {
  // Adicionar estado de loading para debug
  const [isLoading, setIsLoading] = useState(true);
  const [hasError, setHasError] = useState(false);

  useEffect(() => {
    console.log('🎯 App component mounted');
    console.log('📍 Current path:', window.location.pathname);
    
    // Simular loading para teste
    const timer = setTimeout(() => {
      setIsLoading(false);
    }, 1000);

    // Capturar erros de montagem
    const handleError = (error: ErrorEvent) => {
      console.error('❌ App level error:', error);
      setHasError(true);
    };

    window.addEventListener('error', handleError);

    return () => {
      clearTimeout(timer);
      window.removeEventListener('error', handleError);
    };
  }, []);

  if (hasError) {
    return (
      <div style={{ padding: '20px', fontFamily: 'Arial, sans-serif', textAlign: 'center' }}>
        <h1>❌ Erro na Aplicação</h1>
        <p>Por favor, verifique o console do navegador para mais detalhes.</p>
        <button onClick={() => window.location.reload()}>Recarregar Página</button>
      </div>
    );
  }

  if (isLoading) {
    return (
      <div style={{ padding: '50px', textAlign: 'center', fontFamily: 'Arial, sans-serif' }}>
        <h1>🍽️ Cardápio Semanal</h1>
        <p>Iniciando aplicação...</p>
      </div>
    );
  }

  return (
    <QueryClientProvider client={queryClient}>
      <TooltipProvider>
        <Toaster />
        <Sonner />
        <ErrorBoundary>
          <BrowserRouter
            future={{
              v7_startTransition: true,
              v7_relativeSplatPath: true,
            }}
            basename={import.meta.env.BASE_URL || '/'}>
            <AuthProvider>
              <Routes>
                <Route path="/" element={<Landing />} />
                <Route path="/:id/cardapio" element={<Menu />} />
                <Route path="/auth" element={<Auth />} />
              <Route path="/admin" element={<Admin />} />
              <Route path="/admin/menus" element={<AdminMenus />} />
              <Route path="/admin/menus/new" element={<AdminMenuForm />} />
              <Route path="/admin/menus/:id" element={<AdminMenuForm />} />
              <Route path="/admin/settings" element={<AdminSettings />} />
              <Route path="/admin/gallery" element={<AdminGallery />} />
                {/* ADD ALL CUSTOM ROUTES ABOVE THE CATCH-ALL "*" ROUTE */}
                <Route path="*" element={<NotFound />} />
              </Routes>
            </AuthProvider>
          </BrowserRouter>
        </ErrorBoundary>
      </TooltipProvider>
    </QueryClientProvider>
  );
};

export default App;
