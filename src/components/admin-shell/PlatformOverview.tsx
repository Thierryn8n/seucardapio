import { Link } from "react-router-dom";
import { useQuery } from "@tanstack/react-query";
import {
  ArrowUpRight, CalendarCheck, CalendarDays, Crown, ExternalLink, Image, MessageSquare, Package,
  Receipt, Settings, Store, Ticket, Truck, UtensilsCrossed, Users, CreditCard, type LucideIcon,
} from "lucide-react";
import { db } from "@/lib/db";
import { useStorePath } from "./AdminShell";
import { cn } from "@/lib/utils";

const todayISO = () => new Date().toLocaleDateString("en-CA");
const brl = (v: number) => v.toLocaleString("pt-BR", { style: "currency", currency: "BRL" });

async function count(table: string, apply: (q: any) => any = (q) => q) {
  const { count: c } = await apply(db.from(table).select("id", { count: "exact", head: true }));
  return c ?? 0;
}

function usePlatformStats() {
  return useQuery({
    queryKey: ["platform-stats", todayISO()],
    queryFn: async () => {
      const start = new Date();
      start.setHours(0, 0, 0, 0);
      const [stores, paid, ordersToday, menusToday, revenue] = await Promise.all([
        count("profiles", (q) => q.eq("is_admin", false)),
        count("subscriptions", (q) => q.neq("plan", "free").eq("status", "active")),
        count("orders", (q) => q.gte("created_at", start.toISOString())),
        count("daily_menus", (q) => q.eq("menu_date", todayISO()).eq("is_published", true)),
        db.from("orders").select("total").gte("created_at", start.toISOString()),
      ]);
      const revenueToday = (revenue.data ?? []).reduce((s: number, o: { total: number | null }) => s + Number(o.total ?? 0), 0);
      return { stores, paid, ordersToday, menusToday, revenueToday };
    },
  });
}

function useRecent() {
  return useQuery({
    queryKey: ["platform-recent"],
    queryFn: async () => {
      const [stores, orders] = await Promise.all([
        db.from("profiles").select("id,name,email,plan,logo_url,created_at,onboarding_completed").order("created_at", { ascending: false }).limit(6),
        db.from("orders").select("id,order_number,customer_name,total,status,created_at").order("created_at", { ascending: false }).limit(6),
      ]);
      return { stores: stores.data ?? [], orders: orders.data ?? [] };
    },
  });
}

function Stat({ label, value, icon: Icon, loading }: { label: string; value: string | number; icon: LucideIcon; loading: boolean }) {
  return (
    <div className="glass flex items-center gap-4 rounded-2xl p-4">
      <span className="skeuo-inset flex h-11 w-11 shrink-0 items-center justify-center rounded-xl">
        <Icon className="h-5 w-5 text-primary" aria-hidden />
      </span>
      <div className="flex min-w-0 flex-col">
        <span className="text-xs font-medium uppercase tracking-wider text-muted-foreground">{label}</span>
        {loading ? (
          <span className="mt-1 h-6 w-16 animate-pulse rounded-md bg-muted" />
        ) : (
          <span className="truncate text-2xl font-semibold tabular-nums">{value}</span>
        )}
      </div>
    </div>
  );
}

const STATUS: Record<string, string> = {
  received: "Recebido", preparing: "Preparando", ready: "Pronto", delivering: "Saiu p/ entrega",
  delivered: "Entregue", completed: "Concluído", cancelled: "Cancelado",
};

function Panel({ title, action, children }: { title: string; action?: { to: string; label: string }; children: React.ReactNode }) {
  return (
    <section className="glass flex flex-col rounded-3xl" aria-label={title}>
      <header className="flex items-center justify-between gap-3 border-b border-foreground/5 px-5 py-4">
        <h2 className="font-playfair text-lg font-bold">{title}</h2>
        {action && (
          <Link to={action.to} className="flex items-center gap-1 text-sm font-medium text-primary hover:underline">
            {action.label}
            <ArrowUpRight className="h-4 w-4" aria-hidden />
          </Link>
        )}
      </header>
      <div className="flex flex-col p-2">{children}</div>
    </section>
  );
}

function Empty({ text }: { text: string }) {
  return <p className="px-3 py-8 text-center text-sm text-muted-foreground">{text}</p>;
}

const TOOLS: { to: string; label: string; icon: LucideIcon; group: string }[] = [
  { to: "/admin/users", label: "Usuários", icon: Users, group: "Plataforma" },
  { to: "/admin/plans", label: "Planos", icon: Crown, group: "Plataforma" },
  { to: "/admin/gallery", label: "Galeria", icon: Image, group: "Plataforma" },
  { to: "/admin/settings", label: "Configurações", icon: Settings, group: "Plataforma" },
  { to: "/admin/cardapio-do-dia", label: "Cardápio do dia", icon: UtensilsCrossed, group: "Marmitaria" },
  { to: "/admin/menus", label: "Cardápio semanal", icon: CalendarDays, group: "Marmitaria" },
  { to: "/admin/suggestions", label: "Sugestões", icon: MessageSquare, group: "Marmitaria" },
  { to: "/admin/orders", label: "Pedidos", icon: Truck, group: "Delivery" },
  { to: "/admin/products", label: "Produtos", icon: Package, group: "Delivery" },
  { to: "/admin/coupons", label: "Cupons", icon: Ticket, group: "Delivery" },
  { to: "/admin/mercadopago", label: "Mercado Pago", icon: CreditCard, group: "Delivery" },
];

export function PlatformOverview() {
  const stats = usePlatformStats();
  const recent = useRecent();
  const storePath = useStorePath();
  const s = stats.data;

  return (
    <div className="mx-auto flex max-w-7xl flex-col gap-6">
      <div className="grid grid-cols-2 gap-3 lg:grid-cols-5">
        <Stat label="Marmitarias" value={s?.stores ?? 0} icon={Store} loading={stats.isLoading} />
        <Stat label="Assinantes" value={s?.paid ?? 0} icon={Crown} loading={stats.isLoading} />
        <Stat label="Pedidos hoje" value={s?.ordersToday ?? 0} icon={Receipt} loading={stats.isLoading} />
        <Stat label="Cardápios hoje" value={s?.menusToday ?? 0} icon={CalendarCheck} loading={stats.isLoading} />
        <div className="col-span-2 lg:col-span-1">
          <Stat label="Faturado hoje" value={brl(s?.revenueToday ?? 0)} icon={ArrowUpRight} loading={stats.isLoading} />
        </div>
      </div>

      <div className="grid grid-cols-1 gap-6 lg:grid-cols-3">
        <div className="flex flex-col gap-6 lg:col-span-2">
          <Panel title="Pedidos recentes" action={{ to: "/admin/cardapio-do-dia", label: "Ver pedidos" }}>
            {recent.isLoading ? (
              <Empty text="Carregando..." />
            ) : recent.data!.orders.length === 0 ? (
              <Empty text="Nenhum pedido ainda. Assim que um cliente enviar, ele aparece aqui." />
            ) : (
              <ul className="flex flex-col">
                {recent.data!.orders.map((o: any) => (
                  <li key={o.id} className="flex items-center gap-3 rounded-xl px-3 py-3 hover:bg-foreground/5">
                    <span className="skeuo-inset flex h-9 w-9 shrink-0 items-center justify-center rounded-lg font-mono text-xs font-semibold">
                      #{o.order_number ?? "—"}
                    </span>
                    <div className="flex min-w-0 flex-1 flex-col">
                      <span className="truncate text-sm font-medium">{o.customer_name}</span>
                      <span className="text-xs text-muted-foreground">
                        {new Date(o.created_at).toLocaleString("pt-BR", { day: "2-digit", month: "2-digit", hour: "2-digit", minute: "2-digit" })}
                      </span>
                    </div>
                    <span className="hidden rounded-full bg-foreground/5 px-2.5 py-1 text-xs font-medium sm:inline">
                      {STATUS[o.status] ?? o.status}
                    </span>
                    <span className="w-20 text-right text-sm font-semibold tabular-nums">{brl(Number(o.total ?? 0))}</span>
                  </li>
                ))}
              </ul>
            )}
          </Panel>

          <section className="flex flex-col gap-3" aria-label="Ferramentas">
            <h2 className="font-playfair text-lg font-bold">Ferramentas</h2>
            <div className="grid grid-cols-2 gap-3 sm:grid-cols-3 xl:grid-cols-4">
              {TOOLS.map(({ to, label, icon: Icon, group }) => (
                <Link key={to} to={to} className="skeuo-raised skeuo-press group flex flex-col gap-3 rounded-2xl p-4">
                  <span className="flex items-center justify-between">
                    <Icon className="h-5 w-5 text-primary" aria-hidden />
                    <ArrowUpRight className="h-4 w-4 text-muted-foreground opacity-0 transition-opacity group-hover:opacity-100" aria-hidden />
                  </span>
                  <span className="flex flex-col">
                    <span className="text-sm font-semibold">{label}</span>
                    <span className="text-xs text-muted-foreground">{group}</span>
                  </span>
                </Link>
              ))}
            </div>
          </section>
        </div>

        <div className="flex flex-col gap-6">
          <Panel title="Novas marmitarias" action={{ to: "/admin/users", label: "Todas" }}>
            {recent.isLoading ? (
              <Empty text="Carregando..." />
            ) : recent.data!.stores.length === 0 ? (
              <Empty text="Nenhuma marmitaria cadastrada." />
            ) : (
              <ul className="flex flex-col">
                {recent.data!.stores.map((p: any) => (
                  <li key={p.id} className="flex items-center gap-3 rounded-xl px-3 py-3">
                    {p.logo_url ? (
                      <img src={p.logo_url} alt="" className="h-9 w-9 shrink-0 rounded-lg object-cover" />
                    ) : (
                      <span className="skeuo-inset flex h-9 w-9 shrink-0 items-center justify-center rounded-lg text-sm font-semibold uppercase">
                        {(p.name || p.email || "?").charAt(0)}
                      </span>
                    )}
                    <div className="flex min-w-0 flex-1 flex-col">
                      <span className="truncate text-sm font-medium">{p.name || "Sem nome"}</span>
                      <span className="truncate text-xs text-muted-foreground">{p.email}</span>
                    </div>
                    <span
                      className={cn(
                        "rounded-full px-2 py-0.5 text-[11px] font-semibold capitalize",
                        p.plan === "free" ? "bg-foreground/5 text-muted-foreground" : "bg-primary/15 text-primary",
                      )}
                    >
                      {p.plan}
                    </span>
                  </li>
                ))}
              </ul>
            )}
          </Panel>

          <div className="skeuo-raised flex flex-col gap-3 rounded-3xl p-5">
            <p className="text-sm font-semibold">Sua vitrine</p>
            <p className="text-sm leading-relaxed text-muted-foreground">Veja o cardápio público exatamente como o cliente vê.</p>
            <a href={storePath} target="_blank" rel="noopener noreferrer" className="skeuo-primary skeuo-press flex items-center justify-center gap-2 rounded-xl px-4 py-2.5 text-sm font-semibold">
              <ExternalLink className="h-4 w-4" aria-hidden />
              Abrir cardápio
            </a>
          </div>
        </div>
      </div>
    </div>
  );
}
