import { Toaster } from "@/components/ui/toaster";
import { Toaster as Sonner } from "@/components/ui/sonner";
import { TooltipProvider } from "@/components/ui/tooltip";
import { QueryClient, QueryClientProvider } from "@tanstack/react-query";
import { BrowserRouter, Routes, Route } from "react-router-dom";
import { PlatformBranding } from "@/components/PlatformBranding";
import { AuthProvider } from "./contexts/AuthContext";
import { Level3Route } from "./components/Level3Route";
import { AdminRoute, SimpleOnlyRoute } from "./components/routes";
import HomeRoute from "./components/HomeRoute";
import { LegacyAdminPage } from "./components/admin-shell/AdminShell";
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
            <Route path="/" element={<HomeRoute />} />
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
                <LegacyAdminPage title="Usuários" subtitle="Contas, planos e permissões"><AdminUsers /></LegacyAdminPage>
              </AdminRoute>
            } />
            <Route path="/admin/plans" element={
              <AdminRoute>
                <LegacyAdminPage title="Planos" subtitle="Preços e recursos da plataforma"><AdminPlans /></LegacyAdminPage>
              </AdminRoute>
            } />
            <Route path="/admin/menus" element={
              <AdminRoute>
                <LegacyAdminPage title="Cardápio semanal" subtitle="Planeje as refeições da semana"><AdminMenus /></LegacyAdminPage>
              </AdminRoute>
            } />
            <Route path="/admin/menus/new" element={
              <AdminRoute>
                <LegacyAdminPage title="Refeição" subtitle="Criar ou editar refeição"><AdminMenuForm /></LegacyAdminPage>
              </AdminRoute>
            } />
            <Route path="/admin/menus/:id" element={
              <AdminRoute>
                <LegacyAdminPage title="Refeição" subtitle="Criar ou editar refeição"><AdminMenuForm /></LegacyAdminPage>
              </AdminRoute>
            } />
            
            {/* Rotas exclusivas do Admin Simples - Bloqueiam acesso do Master */}
            <Route path="/admin/settings" element={
              <SimpleOnlyRoute>
                <LegacyAdminPage title="Configurações" subtitle="Marca, cores e funcionamento"><AdminSettings /></LegacyAdminPage>
              </SimpleOnlyRoute>
            } />
            <Route path="/admin/orders" element={
              <SimpleOnlyRoute>
                <LegacyAdminPage title="Pedidos" subtitle="Pedidos de delivery"><AdminOrders /></LegacyAdminPage>
              </SimpleOnlyRoute>
            } />
            <Route path="/admin/coupons" element={
              <SimpleOnlyRoute>
                <LegacyAdminPage title="Cupons" subtitle="Descontos e promoções"><AdminCoupons /></LegacyAdminPage>
              </SimpleOnlyRoute>
            } />
            {/* Mercado Pago - Admin Simples */}
             {/* Mercado Pago - Admin Simples */}
             <Route path="/admin/mercadopago" element={
               <SimpleOnlyRoute>
                 <LegacyAdminPage title="Mercado Pago" subtitle="Pagamentos online"><AdminMercadoPago /></LegacyAdminPage>
               </SimpleOnlyRoute>
             } />
            
            <Route path="/admin/gallery" element={
              <AdminRoute>
                <LegacyAdminPage title="Galeria" subtitle="Imagens da plataforma"><AdminGallery /></LegacyAdminPage>
              </AdminRoute>
            } />
            <Route path="/admin/suggestions" element={
              <AdminRoute>
                <LegacyAdminPage title="Sugestões" subtitle="O que os clientes querem comer"><AdminMealSuggestions /></LegacyAdminPage>
              </AdminRoute>
            } />
            <Route path="/admin/products" element={
              <AdminRoute>
                <LegacyAdminPage title="Produtos" subtitle="Itens, adicionais e opções"><AdminProducts /></LegacyAdminPage>
              </AdminRoute>
            } />
            <Route path="/admin/products/new" element={
              <AdminRoute>
                <Level3Route>
                  <LegacyAdminPage title="Produto" subtitle="Criar ou editar produto"><AdminProductForm /></LegacyAdminPage>
                </Level3Route>
              </AdminRoute>
            } />
            <Route path="/admin/products/:id" element={
              <AdminRoute>
                <Level3Route>
                  <LegacyAdminPage title="Produto" subtitle="Criar ou editar produto"><AdminProductForm /></LegacyAdminPage>
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
