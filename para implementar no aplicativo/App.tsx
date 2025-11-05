import { Toaster } from "@/components/ui/toaster";
import { Toaster as Sonner } from "@/components/ui/sonner";
import { TooltipProvider } from "@/components/ui/tooltip";
import { QueryClient, QueryClientProvider } from "@tanstack/react-query";
import { BrowserRouter, Routes, Route } from "react-router-dom";
import { AuthProvider } from "./contexts/AuthContext";
import Landing from "./pages/Landing";
import Menu from "./pages/Menu";
import Auth from "./pages/Auth";
import Admin from "./pages/Admin";
import AdminDashboard from "./pages/AdminDashboard";
import AdminMenus from "./pages/AdminMenus";
import AdminMenuForm from "./pages/AdminMenuForm";
import AdminSettings from "./pages/AdminSettings";
import AdminGallery from "./pages/AdminGallery";
import AdminSuggestions from "./pages/AdminSuggestions";
import AdminPlans from "./pages/AdminPlans";
import AdminUsers from "./pages/AdminUsers";
import NotFound from "./pages/NotFound";

const queryClient = new QueryClient();

const App = () => (
  <QueryClientProvider client={queryClient}>
    <TooltipProvider>
      <Toaster />
      <Sonner />
      <BrowserRouter>
        <AuthProvider>
          <Routes>
            <Route path="/" element={<Landing />} />
            <Route path="/:id/cardapio" element={<Menu />} />
            <Route path="/auth" element={<Auth />} />
          <Route path="/admin" element={<AdminDashboard />} />
          <Route path="/admin/dashboard" element={<Admin />} />
          <Route path="/admin/menus" element={<AdminMenus />} />
          <Route path="/admin/menus/new" element={<AdminMenuForm />} />
          <Route path="/admin/menus/:id" element={<AdminMenuForm />} />
          <Route path="/admin/settings" element={<AdminSettings />} />
          <Route path="/admin/gallery" element={<AdminGallery />} />
          <Route path="/admin/suggestions" element={<AdminSuggestions />} />
          <Route path="/admin/plans" element={<AdminPlans />} />
          <Route path="/admin/users" element={<AdminUsers />} />
            {/* ADD ALL CUSTOM ROUTES ABOVE THE CATCH-ALL "*" ROUTE */}
            <Route path="*" element={<NotFound />} />
          </Routes>
        </AuthProvider>
      </BrowserRouter>
    </TooltipProvider>
  </QueryClientProvider>
);

export default App;
