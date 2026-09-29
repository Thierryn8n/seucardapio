import { Toaster } from "@/components/ui/toaster";
import { Toaster as Sonner } from "@/components/ui/sonner";
import { TooltipProvider } from "@/components/ui/tooltip";
import { QueryClient, QueryClientProvider } from "@tanstack/react-query";
import { BrowserRouter, Routes, Route } from "react-router-dom";
import { PlatformBranding } from "@/components/PlatformBranding";
import { AuthProvider } from "./contexts/AuthContext";
import { Level3Route } from "./components/Level3Route";
import { AdminRoute, SimpleOnlyRoute } from "./components/routes";
import Landing from "./pages/Landing";
import Menu from "./pages/Menu";
import DailyMenu from "./pages/DailyMenu";
import AdminDailyMenu from "./pages/admin/AdminDailyMenu";
import Auth from "./pages/Auth";
import AuthCallback from "./pages/AuthCallback";
import CustomerDelivery from "./pages/CustomerDelivery";
import CustomerOrderTracking from "./pages/CustomerOrderTracking";
import Checkout from "./pages/Checkout";
import NotFound from "./pages/NotFound";

// Admin Simples Pages
import AdminDashboard from "./pages/admin/AdminDashboard";
import AdminUsers from "./pages/admin/AdminUsers";
import AdminPlans from "./pages/admin/AdminPlans";
import AdminDashboardSelector from "./pages/admin/AdminDashboardSelector";
import AdminMenus from "./pages/admin/AdminMenus";
import AdminMenuForm from "./pages/admin/AdminMenuForm";
import AdminSettings from "./pages/admin/AdminSettings";
import AdminGallery from "./pages/admin/AdminGallery";
import AdminMealSuggestions from "./pages/admin/AdminMealSuggestions";
import AdminProducts from "./pages/admin/AdminProducts";
import AdminOrders from "./pages/admin/AdminOrders";
import AdminCoupons from "./pages/admin/AdminCoupons";
// import AdminLevelConfig from "./pages/admin/AdminLevelConfig"; // Arquivo não existe
import AdminProductForm from "./pages/admin/AdminProductForm";

// Mercado Pago Pages
import { AdminMercadoPago } from "./pages/admin";
const queryClient = new QueryClient();

const App = () => (
  <QueryClientProvider client={queryClient}>
    <TooltipProvider>
        <Toaster />
        <PlatformBranding />
      <Sonner />
      <BrowserRouter>
        <AuthProvider>
          <Routes>
            <Route path="/" element={<Landing />} />
            <Route path="/:id/cardapio" element={<DailyMenu />} />
            <Route path="/:id/semanal" element={<Menu />} />
            <Route path="/auth" element={<Auth />} />
 <Route path="/auth/callback" element={<AuthCallback />} />
            <Route path="/admin/cardapio-do-dia" element={
              <AdminRoute>
                <AdminDailyMenu />
              </AdminRoute>
            } />
            
            {/* Rotas do Admin Simples - Protegidas por AdminRoute */}
            <Route path="/admin" element={
              <AdminRoute>
                <AdminDashboardSelector />
              </AdminRoute>
            } />
            <Route path="/admin/selector" element={
              <AdminRoute>
                <AdminDashboard />
              </AdminRoute>
            } />
            <Route path="/admin/dashboard" element={
              <AdminRoute>
                <AdminDashboard />
              </AdminRoute>
            } />
            <Route path="/admin/users" element={
              <AdminRoute>
                <AdminUsers />
              </AdminRoute>
            } />
            <Route path="/admin/plans" element={
              <AdminRoute>
                <AdminPlans />
              </AdminRoute>
            } />
            <Route path="/admin/menus" element={
              <AdminRoute>
                <AdminMenus />
              </AdminRoute>
            } />
            <Route path="/admin/menus/new" element={
              <AdminRoute>
                <AdminMenuForm />
              </AdminRoute>
            } />
            <Route path="/admin/menus/:id" element={
              <AdminRoute>
                <AdminMenuForm />
              </AdminRoute>
            } />
            
            {/* Rotas exclusivas do Admin Simples - Bloqueiam acesso do Master */}
            <Route path="/admin/settings" element={
              <SimpleOnlyRoute>
                <AdminSettings />
              </SimpleOnlyRoute>
            } />
            <Route path="/admin/orders" element={
              <SimpleOnlyRoute>
                <AdminOrders />
              </SimpleOnlyRoute>
            } />
            <Route path="/admin/coupons" element={
              <SimpleOnlyRoute>
                <AdminCoupons />
              </SimpleOnlyRoute>
            } />
            {/* Mercado Pago - Admin Simples */}
             {/* Mercado Pago - Admin Simples */}
             <Route path="/admin/mercadopago" element={
               <SimpleOnlyRoute>
                 <AdminMercadoPago />
               </SimpleOnlyRoute>
             } />
            
            <Route path="/admin/gallery" element={
              <AdminRoute>
                <AdminGallery />
              </AdminRoute>
            } />
            <Route path="/admin/suggestions" element={
              <AdminRoute>
                <AdminMealSuggestions />
              </AdminRoute>
            } />
            <Route path="/admin/products" element={
              <AdminRoute>
                <AdminProducts />
              </AdminRoute>
            } />
            <Route path="/admin/products/new" element={
              <AdminRoute>
                <Level3Route>
                  <AdminProductForm />
                </Level3Route>
              </AdminRoute>
            } />
            <Route path="/admin/products/:id" element={
              <AdminRoute>
                <Level3Route>
                  <AdminProductForm />
                </Level3Route>
              </AdminRoute>
            } />
            {/* <Route path="/admin/level-config" element={
              <AdminRoute>
                <AdminLevelConfig />
              </AdminRoute>
            } /> */}



            <Route path="/delivery" element={<CustomerDelivery />} />
            <Route path="/delivery/orders/:orderId" element={<CustomerOrderTracking />} />
            <Route path="/checkout" element={<Checkout />} />
            
            {/* ADD ALL CUSTOM ROUTES ABOVE THE CATCH-ALL "*" ROUTE */}
            <Route path="*" element={<NotFound />} />
          </Routes>
        </AuthProvider>
      </BrowserRouter>
    </TooltipProvider>
  </QueryClientProvider>
);

export default App;
