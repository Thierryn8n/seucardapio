import type { ReactNode } from "react";
import { Link, useLocation } from "react-router-dom";
import { useQuery } from "@tanstack/react-query";
import {
  BarChart3, CalendarDays, CreditCard, Crown, Image, LayoutGrid, Loader2, Lock, LogOut, Menu,
  MessageSquare, Package, Settings, Ticket, Truck, UtensilsCrossed, Users, type LucideIcon,
} from "lucide-react";
import { Sheet, SheetContent, SheetTitle, SheetTrigger } from "@/components/ui/sheet";
import { Button } from "@/components/ui/button";
import { Onboarding } from "@/components/onboarding/Onboarding";
import { useAuth } from "@/contexts/AuthContext";
import { db } from "@/lib/db";
import { cn } from "@/lib/utils";

type NavItem = { to: string; label: string; icon: LucideIcon; locked?: boolean };
type NavSection = { title: string; items: NavItem[] };

export function useStorePath() {
  const { user } = useAuth();
  const { data: slug } = useQuery({
    queryKey: ["my-slug", user?.id],
    enabled: !!user,
    queryFn: async () =>
      (await db.from("profiles").select("slug").eq("id", user!.id).maybeSingle()).data?.slug as string | null,
  });
  return user ? `/${slug || user.id}/cardapio` : "/";
}

function useSections(): NavSection[] {
  const { isAdmin, userPlan } = useAuth();
  const locked = !isAdmin;
  const sections: NavSection[] = [
    {
      title: "Marmitaria",
      items: [
        { to: "/admin", label: "Início", icon: LayoutGrid },
        { to: "/admin/cardapio-do-dia", label: "Cardápio do dia", icon: UtensilsCrossed, locked },
        { to: "/admin/menus", label: "Cardápio semanal", icon: CalendarDays, locked },
        { to: "/admin/suggestions", label: "Sugestões", icon: MessageSquare, locked },
        { to: "/admin/settings", label: "Configurações", icon: Settings, locked },
      ],
    },
  ];
  if (isAdmin || userPlan === "premium") {
    sections.push({
      title: "Delivery",
      items: [
        { to: "/admin/orders", label: "Pedidos", icon: Truck },
        { to: "/admin/products", label: "Produtos", icon: Package },
        { to: "/admin/coupons", label: "Cupons", icon: Ticket },
        { to: "/admin/mercadopago", label: "Mercado Pago", icon: CreditCard },
      ],
    });
  }
  if (isAdmin) {
    sections.push({
      title: "Plataforma",
      items: [
        { to: "/admin/dashboard", label: "Dashboard", icon: BarChart3 },
        { to: "/admin/users", label: "Usuários", icon: Users },
        { to: "/admin/plans", label: "Planos", icon: Crown },
        { to: "/admin/gallery", label: "Galeria", icon: Image },
      ],
    });
  }
  return sections;
}

function SidebarContent() {
  const { pathname } = useLocation();
  const { user, userPlan, isAdmin, signOut } = useAuth();
  const sections = useSections();

  return (
    <div className="flex h-full flex-col gap-6 p-4">
      <Link to="/admin" className="flex items-center gap-3 rounded-xl px-2 py-1">
        <span className="skeuo-primary flex h-10 w-10 items-center justify-center rounded-xl">
          <UtensilsCrossed className="h-5 w-5" aria-hidden />
        </span>
        <span className="flex flex-col leading-tight">
          <span className="font-playfair text-lg font-bold">Seu Cardápio</span>
          <span className="text-xs text-muted-foreground">{isAdmin ? "Administrador" : "Marmitaria"}</span>
        </span>
      </Link>

      <nav aria-label="Menu do painel" className="flex flex-1 flex-col gap-5 overflow-y-auto">
        {sections.map((section) => (
          <div key={section.title} className="flex flex-col gap-1">
            <p className="px-3 pb-1 text-[11px] font-semibold uppercase tracking-widest text-muted-foreground">
              {section.title}
            </p>
            {section.items.map(({ to, label, icon: Icon, locked }) => {
              const active = pathname === to;
              const base = "flex items-center gap-3 rounded-xl px-3 py-2 text-sm font-medium";
              if (locked) {
                return (
                  <span key={to} aria-disabled className={cn(base, "cursor-not-allowed text-muted-foreground/60")}>
                    <Icon className="h-4 w-4" aria-hidden />
                    <span className="flex-1">{label}</span>
                    <Lock className="h-3.5 w-3.5" aria-label="Bloqueado" />
                  </span>
                );
              }
              return (
                <Link
                  key={to}
                  to={to}
                  aria-current={active ? "page" : undefined}
                  className={cn(
                    base,
                    "skeuo-press",
                    active ? "skeuo-raised text-foreground" : "text-muted-foreground hover:bg-foreground/5 hover:text-foreground",
                  )}
                >
                  <Icon className={cn("h-4 w-4", active && "text-primary")} aria-hidden />
                  {label}
                </Link>
              );
            })}
          </div>
        ))}
      </nav>

      <div className="skeuo-inset flex flex-col gap-3 rounded-2xl p-3">
        <div className="flex flex-col">
          <span className="truncate text-sm font-medium">{user?.email}</span>
          <span className="text-xs capitalize text-muted-foreground">Plano {userPlan || "free"}</span>
        </div>
        <Button variant="ghost" size="sm" onClick={signOut} className="skeuo-raised skeuo-press justify-start gap-2">
          <LogOut className="h-4 w-4" aria-hidden />
          Sair
        </Button>
      </div>
    </div>
  );
}

export function AdminShell({
  title,
  subtitle,
  actions,
  children,
}: {
  title: string;
  subtitle?: string;
  actions?: ReactNode;
  children: ReactNode;
}) {
  const { user, isAdmin } = useAuth();
  const { data: onboarded, isLoading } = useQuery({
    queryKey: ["onboarding", user?.id],
    enabled: !!user,
    queryFn: async () =>
      (await db.from("profiles").select("onboarding_completed").eq("id", user!.id).maybeSingle()).data
        ?.onboarding_completed ?? false,
  });

  if (user && isLoading) {
    return (
      <div className="flex min-h-dvh items-center justify-center bg-background">
        <Loader2 className="h-6 w-6 animate-spin text-primary" aria-label="Carregando" />
      </div>
    );
  }
  if (user && onboarded === false) return <Onboarding userId={user.id} isAdmin={isAdmin} />;

  return (
    <div className="admin-shell relative min-h-dvh bg-background font-poppins text-foreground">
      <aside className="glass fixed inset-y-3 left-3 z-30 hidden w-64 rounded-3xl lg:block">
        <SidebarContent />
      </aside>

      <div className="flex min-h-dvh flex-col pb-20 lg:pb-0 lg:pl-72">
        <header className="sticky top-0 z-20 px-3 pt-3 lg:px-6">
          <div className="glass flex flex-wrap items-center justify-between gap-3 rounded-2xl px-3 py-2.5 sm:px-4 sm:py-3">
            <div className="flex min-w-0 flex-1 items-center gap-3">
              <Sheet>
                <SheetTrigger asChild>
                  <Button variant="ghost" size="icon" className="skeuo-raised skeuo-press lg:hidden" aria-label="Abrir menu">
                    <Menu className="h-5 w-5" />
                  </Button>
                </SheetTrigger>
                <SheetContent side="left" className="w-72 border-none bg-background/80 p-0 backdrop-blur-xl">
                  <SheetTitle className="sr-only">Menu do painel</SheetTitle>
                  <SidebarContent />
                </SheetContent>
              </Sheet>
              <div className="min-w-0">
                <h1 className="truncate font-playfair text-lg font-bold sm:text-xl md:text-2xl">{title}</h1>
                {subtitle && <p className="hidden truncate text-sm text-muted-foreground sm:block">{subtitle}</p>}
              </div>
            </div>
            {actions && <div className="flex w-full items-center gap-2 overflow-x-auto sm:w-auto sm:shrink-0">{actions}</div>}
          </div>
        </header>
        <main className="flex-1 px-3 py-4 sm:py-6 lg:px-6">{children}</main>
      </div>

      <MobileTabBar />
    </div>
  );
}

function MobileTabBar() {
  const { pathname } = useLocation();
  const items = useSections()
    .flatMap((s) => s.items)
    .filter((i) => !i.locked)
    .slice(0, 4);
  if (items.length < 2) return null;
  return (
    <nav
      aria-label="Navegação rápida"
      className="glass fixed inset-x-3 bottom-3 z-30 flex items-stretch justify-around rounded-2xl p-1.5 lg:hidden"
      style={{ paddingBottom: "max(0.375rem, env(safe-area-inset-bottom))" }}
    >
      {items.map(({ to, label, icon: Icon }) => {
        const active = pathname === to;
        return (
          <Link
            key={to}
            to={to}
            aria-current={active ? "page" : undefined}
            className={cn(
              "skeuo-press flex min-w-0 flex-1 flex-col items-center gap-1 rounded-xl px-1 py-2 text-[11px] font-medium",
              active ? "skeuo-raised text-foreground" : "text-muted-foreground",
            )}
          >
            <Icon className={cn("h-5 w-5", active && "text-primary")} aria-hidden />
            <span className="w-full truncate text-center">{label}</span>
          </Link>
        );
      })}
    </nav>
  );
}
