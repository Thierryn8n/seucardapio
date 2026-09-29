import { useEffect } from "react";
import { Link, useNavigate } from "react-router-dom";
import {
  ArrowRight, CalendarDays, CreditCard, ExternalLink, Lock, MessageSquare, Package, Settings,
  ShieldAlert, Ticket, Truck, UtensilsCrossed, type LucideIcon,
} from "lucide-react";
import { useAuth } from "@/contexts/AuthContext";
import { AdminShell, useStorePath } from "@/components/admin-shell/AdminShell";
import { cn } from "@/lib/utils";

type Tile = { to: string; title: string; description: string; icon: LucideIcon; locked?: boolean };

function greeting() {
  const h = new Date().getHours();
  return h < 12 ? "Bom dia" : h < 18 ? "Boa tarde" : "Boa noite";
}

function ToolTile({ to, title, description, icon: Icon, locked }: Tile) {
  const body = (
    <>
      <span className="skeuo-inset flex h-12 w-12 shrink-0 items-center justify-center rounded-2xl">
        <Icon className="h-5 w-5 text-primary" aria-hidden />
      </span>
      <span className="flex min-w-0 flex-1 flex-col gap-1">
        <span className="flex items-center gap-2 font-semibold">
          {title}
          {locked && <Lock className="h-3.5 w-3.5 text-muted-foreground" aria-label="Bloqueado" />}
        </span>
        <span className="text-sm leading-relaxed text-muted-foreground text-pretty">{description}</span>
      </span>
      {!locked && <ArrowRight className="h-4 w-4 shrink-0 text-muted-foreground transition-transform group-hover:translate-x-1" aria-hidden />}
    </>
  );
  const cls = "group skeuo-raised flex items-start gap-4 rounded-3xl p-5";
  return locked ? (
    <div aria-disabled className={cn(cls, "cursor-not-allowed opacity-50")}>{body}</div>
  ) : (
    <Link to={to} className={cn(cls, "skeuo-press")}>{body}</Link>
  );
}

function TileGroup({ title, tiles }: { title: string; tiles: Tile[] }) {
  return (
    <section className="flex flex-col gap-4" aria-labelledby={`g-${title}`}>
      <h2 id={`g-${title}`} className="font-playfair text-xl font-bold">{title}</h2>
      <div className="grid grid-cols-1 gap-4 md:grid-cols-2 xl:grid-cols-3">
        {tiles.map((t) => <ToolTile key={t.to} {...t} />)}
      </div>
    </section>
  );
}

const AdminDashboardSelector = () => {
  const { user, isAdmin, userPlan, loading } = useAuth();
  const navigate = useNavigate();
  const storePath = useStorePath();

  useEffect(() => {
    if (!loading && !user) navigate("/auth");
  }, [user, loading, navigate]);

  if (loading) {
    return (
      <div className="flex min-h-screen items-center justify-center bg-background text-muted-foreground">
        Carregando...
      </div>
    );
  }
  if (!user) return null;

  const locked = !isAdmin;
  const showDelivery = isAdmin || userPlan === "premium";
  const name = (user.user_metadata?.full_name as string | undefined)?.split(" ")[0];

  return (
    <AdminShell title={`${greeting()}${name ? `, ${name}` : ""}`} subtitle="O que vamos servir hoje?">
      <div className="mx-auto flex max-w-6xl flex-col gap-10">
        {!isAdmin && (
          <div role="alert" className="glass flex items-start gap-4 rounded-3xl p-5">
            <span className="skeuo-inset flex h-11 w-11 shrink-0 items-center justify-center rounded-2xl">
              <ShieldAlert className="h-5 w-5 text-accent" aria-hidden />
            </span>
            <div className="flex flex-col gap-1">
              <p className="font-semibold">Acesso restrito</p>
              <p className="text-sm leading-relaxed text-muted-foreground">
                Sua conta ainda não possui permissões de administrador. Fale com o administrador do sistema para liberar o acesso.
              </p>
            </div>
          </div>
        )}

        <section className="glass relative overflow-hidden rounded-[2rem] p-6 md:p-10">
          <div className="flex flex-col gap-6 md:flex-row md:items-center md:justify-between">
            <div className="flex max-w-xl flex-col gap-3">
              <span className="skeuo-inset self-start rounded-full px-3 py-1 text-xs font-semibold uppercase tracking-widest text-primary">
                Cardápio do dia
              </span>
              <h2 className="font-playfair text-3xl font-bold leading-tight md:text-4xl text-balance">
                Publique as marmitas de hoje e receba pedidos direto no painel
              </h2>
              <p className="leading-relaxed text-muted-foreground text-pretty">
                Monte proteínas, acompanhamentos, bebidas e sobremesas. O cliente escolhe, envia pelo WhatsApp e o pedido cai aqui automaticamente.
              </p>
            </div>
            <div className="flex flex-col gap-3 sm:flex-row md:flex-col">
              <Link
                to={locked ? "#" : "/admin/cardapio-do-dia"}
                aria-disabled={locked}
                className={cn(
                  "skeuo-primary skeuo-press flex items-center justify-center gap-2 rounded-2xl px-6 py-4 font-semibold",
                  locked && "pointer-events-none opacity-50",
                )}
              >
                <UtensilsCrossed className="h-5 w-5" aria-hidden />
                Abrir painel do dia
              </Link>
              <a
                href={storePath}
                target="_blank"
                rel="noopener noreferrer"
                className="skeuo-raised skeuo-press flex items-center justify-center gap-2 rounded-2xl px-6 py-4 font-medium"
              >
                <ExternalLink className="h-4 w-4" aria-hidden />
                Ver como cliente
              </a>
            </div>
          </div>
        </section>

        <TileGroup
          title="Gestão da marmitaria"
          tiles={[
            { to: "/admin/menus", title: "Cardápio semanal", description: "Planeje as refeições da semana inteira.", icon: CalendarDays, locked },
            { to: "/admin/suggestions", title: "Sugestões", description: "Veja o que seus clientes gostariam de comer.", icon: MessageSquare, locked },
            { to: "/admin/settings", title: "Configurações", description: "Cores, fontes, logo e dias de funcionamento.", icon: Settings, locked },
          ]}
        />

        {showDelivery && (
          <TileGroup
            title="Delivery"
            tiles={[
              { to: "/admin/orders", title: "Pedidos", description: "Acompanhe e atualize os pedidos de entrega.", icon: Truck },
              { to: "/admin/products", title: "Produtos", description: "Itens avulsos, adicionais e opções.", icon: Package },
              { to: "/admin/coupons", title: "Cupons", description: "Crie descontos e promoções.", icon: Ticket },
              { to: "/admin/mercadopago", title: "Mercado Pago", description: "Receba pagamentos online.", icon: CreditCard },
            ]}
          />
        )}
      </div>
    </AdminShell>
  );
};

export default AdminDashboardSelector;
