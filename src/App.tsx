import { Toaster } from "@/components/ui/toaster";
import { Toaster as Sonner } from "@/components/ui/sonner";
import { TooltipProvider } from "@/components/ui/tooltip";
import { QueryClient, QueryClientProvider } from "@tanstack/react-query";
import { BrowserRouter, Routes, Route } from "react-router-dom";
import { AuthProvider } from "./contexts/AuthContext";
import Landing from "./pages/Landing";
import Menu from "./pages/Menu";
import Auth from "./pages/Auth";
import AdminDashboard from "./pages/AdminDashboard";
import AdminUsers from "./pages/AdminUsers";
import AdminPlans from "./pages/AdminPlans";
import Admin from "./pages/Admin";
import AdminDashboardSelector from "./pages/AdminDashboardSelector";
import AdminMenus from "./pages/AdminMenus";
import AdminMenuForm from "./pages/AdminMenuForm";
import AdminSettings from "./pages/AdminSettings";
import AdminGallery from "./pages/AdminGallery";
import AdminMealSuggestions from "./pages/AdminMealSuggestions";
import AdminProducts from "./pages/AdminProducts";
import AdminOrders from "./pages/AdminOrders";
import AdminCoupons from "./pages/AdminCoupons";
import AdminLevelConfig from "./pages/AdminLevelConfig";
import CustomerDelivery from "./pages/CustomerDelivery";
import CustomerOrderTracking from "./pages/CustomerOrderTracking";
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
            <Route path="/admin/selector" element={<AdminDashboardSelector />} />
            <Route path="/admin/dashboard" element={<AdminDashboard />} />
            <Route path="/admin/users" element={<AdminUsers />} />
            <Route path="/admin/plans" element={<AdminPlans />} />
            <Route path="/admin/menus" element={<AdminMenus />} />
            <Route path="/admin/menus/new" element={<AdminMenuForm />} />
            <Route path="/admin/menus/:id" element={<AdminMenuForm />} />
            <Route path="/admin/settings" element={<AdminSettings />} />
            <Route path="/admin/gallery" element={<AdminGallery />} />
            <Route path="/admin/suggestions" element={<AdminMealSuggestions />} />
            <Route path="/admin/products" element={<AdminProducts />} />
            <Route path="/admin/orders" element={<AdminOrders />} />
            <Route path="/admin/coupons" element={<AdminCoupons />} />
            <Route path="/admin/level-config" element={<AdminLevelConfig />} />
            <Route path="/delivery" element={<CustomerDelivery />} />
            <Route path="/delivery/orders/:orderId" element={<CustomerOrderTracking />} />
            {/* ADD ALL CUSTOM ROUTES ABOVE THE CATCH-ALL "*" ROUTE */}
            <Route path="*" element={<NotFound />} />
          </Routes>
        </AuthProvider>
      </BrowserRouter>
    </TooltipProvider>
  </QueryClientProvider>
);

export default App;
