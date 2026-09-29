import { useMemo, useState, type CSSProperties } from "react";
import { useParams } from "react-router-dom";
import { useQuery } from "@tanstack/react-query";
import { format, parseISO } from "date-fns";
import { ptBR } from "date-fns/locale";
import { CheckCircle2, Clock, Loader2, ShoppingBag, UtensilsCrossed } from "lucide-react";
import { Button } from "@/components/ui/button";
import { useToast } from "@/hooks/use-toast";
import { db } from "@/lib/db";
import {
  buildOrderMessage, fetchMenuByDate, fetchRestaurant, fetchSizes, formatBRL, todayISO, whatsappLink,
  type CustomerInfo, type OrderLine,
} from "@/lib/daily-menu";
import { MarmitaBuilder, type CartMarmita } from "@/components/daily-menu/MarmitaBuilder";
import { ExtrasSection } from "@/components/daily-menu/ExtrasSection";
import { CheckoutSheet } from "@/components/daily-menu/CheckoutSheet";

interface PlacedOrder { order_number: number; total: number; link: string }

export default function DailyMenu() {
  const { id = "" } = useParams();
  const { toast } = useToast();
  const date = todayISO();

  const { data: restaurant, isLoading: loadingR } = useQuery({ queryKey: ["restaurant", id], queryFn: () => fetchRestaurant(id), enabled: !!id });
  const rid = restaurant?.id;
  const { data: menu, isLoading: loadingM } = useQuery({ queryKey: ["daily-menu", rid, date], queryFn: () => fetchMenuByDate(rid!, date), enabled: !!rid });
  const { data: sizes = [] } = useQuery({ queryKey: ["sizes", rid], queryFn: () => fetchSizes(rid!), enabled: !!rid });

  const [marmitas, setMarmitas] = useState<CartMarmita[]>([]);
  const [qty, setQty] = useState<Record<string, number>>({});
  const [open, setOpen] = useState(false);
  const [submitting, setSubmitting] = useState(false);
  const [placed, setPlaced] = useState<PlacedOrder | null>(null);

  const sections = menu?.sections ?? [];
  const activeSizes = sizes.filter((s) => s.active);
  const proteinSections = sections.filter((s) => s.kind === "protein");
  const sideSections = sections.filter((s) => s.kind === "side");
  const paidSections = sections.filter((s) => s.kind === "drink" || s.kind === "dessert" || s.kind === "extra");

  const extras = useMemo(
    () => paidSections.flatMap((s) => s.items).filter((i) => (qty[i.id] ?? 0) > 0).map((item) => ({ item, qty: qty[item.id] })),
    [paidSections, qty],
  );
  const count = marmitas.length + extras.reduce((s, e) => s + e.qty, 0);
  const subtotal = marmitas.reduce((s, m) => s + m.size.price, 0) + extras.reduce((s, e) => s + e.item.price * e.qty, 0);

  const addMarmita = (m: CartMarmita) => {
    setMarmitas((p) => [...p, m]);
    toast({ title: `Marmita ${m.size.name} adicionada`, description: "Monte outra ou finalize o pedido." });
  };

  const submit = async (c: CustomerInfo) => {
    if (!menu || !restaurant) return;
    setSubmitting(true);
    const popup = window.self === window.top ? window.open("", "_blank") : null;
    const { data, error } = await db.rpc("place_daily_order", {
      p_menu_id: menu.id,
      p_customer: c,
      p_marmitas: marmitas.map((m) => ({ size_id: m.size.id, protein_ids: m.proteins.map((p) => p.id), side_ids: m.sides.map((s) => s.id), notes: m.notes })),
      p_extras: extras.map((e) => ({ item_id: e.item.id, quantity: e.qty })),
    });
    setSubmitting(false);
    if (error) {
      popup?.close();
      toast({ title: "Não foi possível enviar", description: error.message, variant: "destructive" });
      return;
    }
    const res = data as { order_number: number; items: OrderLine[]; subtotal: number; delivery_fee: number; total: number };
    const text = buildOrderMessage({
      company: restaurant.name, orderNumber: res.order_number, items: res.items, customer: c,
      subtotal: Number(res.subtotal), deliveryFee: Number(res.delivery_fee), total: Number(res.total),
    });
    const link = whatsappLink(restaurant.whatsapp, text);
    if (popup) popup.location.href = link;
    else window.open(link, "_blank");
    setPlaced({ order_number: res.order_number, total: Number(res.total), link });
    setMarmitas([]);
    setQty({});
    setOpen(false);
  };

  if (loadingR || (rid && loadingM)) {
    return <div className="flex min-h-screen items-center justify-center bg-background"><Loader2 className="h-8 w-8 animate-spin text-primary" aria-label="Carregando" /></div>;
  }

  if (!restaurant) {
    return (
      <main className="flex min-h-screen flex-col items-center justify-center gap-2 bg-background p-6 text-center">
        <h1 className="font-playfair text-2xl font-bold">Marmitaria não encontrada</h1>
        <p className="text-muted-foreground">Confira o link que você recebeu.</p>
      </main>
    );
  }

  const dateLabel = format(parseISO(date), "EEEE, d 'de' MMMM", { locale: ptBR });

  const themeVars = {
    "--background": restaurant.background_color,
    "--foreground": restaurant.foreground_color,
    "--card": restaurant.card_color,
    "--card-foreground": restaurant.foreground_color,
    "--primary": restaurant.primary_color,
    "--secondary": restaurant.secondary_color,
    "--accent": restaurant.accent_color,
    "--ring": restaurant.primary_color,
  } as CSSProperties;

  return (
    <div className="min-h-screen bg-background font-poppins text-foreground" style={themeVars}>
      <header className="border-b border-border bg-card">
        <div className="mx-auto flex max-w-2xl items-center gap-4 px-4 py-5">
          {restaurant.logo_url ? (
            <img
              src={restaurant.logo_url}
              alt={`Logo ${restaurant.name}`}
              className="h-[168px] w-[168px] shrink-0 object-contain"
            />
          ) : (
            <div className="flex h-14 w-14 shrink-0 items-center justify-center rounded-2xl bg-primary text-primary-foreground">
              <UtensilsCrossed className="h-6 w-6" aria-hidden />
            </div>
          )}
          <div className="flex min-w-0 flex-col">
            {restaurant.show_company_name && (
              <h1 className="font-playfair text-2xl font-bold leading-tight text-balance">{restaurant.name}</h1>
            )}
            <p className="text-sm capitalize text-muted-foreground">Cardápio de {dateLabel}</p>
          </div>
        </div>
      </header>

      <main className="mx-auto flex max-w-2xl flex-col gap-10 px-4 pb-32 pt-6">
        {placed && (
          <div role="status" className="flex flex-col gap-3 rounded-xl border-2 border-secondary bg-secondary/10 p-5">
            <div className="flex items-center gap-2">
              <CheckCircle2 className="h-6 w-6 text-secondary" aria-hidden />
              <h2 className="text-lg font-bold">Pedido #{placed.order_number} recebido!</h2>
            </div>
            <p className="text-sm text-muted-foreground leading-relaxed">
              Total de {formatBRL(placed.total)}. Seu pedido já chegou no painel da marmitaria. Se o WhatsApp não abriu, toque abaixo para enviar a confirmação.
            </p>
            <Button asChild className="self-start bg-secondary text-secondary-foreground hover:bg-secondary/90">
              <a href={placed.link} target="_blank" rel="noopener noreferrer">Abrir WhatsApp</a>
            </Button>
          </div>
        )}

        {!menu ? (
          <div className="flex flex-col items-center gap-3 rounded-xl border border-dashed border-border p-10 text-center">
            <Clock className="h-8 w-8 text-muted-foreground" aria-hidden />
            <h2 className="font-playfair text-xl font-bold">O cardápio de hoje ainda não saiu</h2>
            <p className="text-sm text-muted-foreground">Volte mais tarde ou fale com a marmitaria pelo WhatsApp.</p>
            {restaurant.whatsapp && (
              <Button asChild variant="outline"><a href={whatsappLink(restaurant.whatsapp, "Olá! Qual o cardápio de hoje?")} target="_blank" rel="noopener noreferrer">Chamar no WhatsApp</a></Button>
            )}
          </div>
        ) : (
          <>
            {menu.notes && <p className="rounded-lg bg-muted p-4 text-sm leading-relaxed">{menu.notes}</p>}
            <section aria-labelledby="monte" className="flex flex-col gap-6">
              <h2 id="monte" className="font-playfair text-3xl font-bold text-balance">Monte sua marmita</h2>
              <MarmitaBuilder sizes={activeSizes} proteinSections={proteinSections} sideSections={sideSections} onAdd={addMarmita} />
            </section>
            {paidSections.length > 0 && (
              <section aria-label="Bebidas, sobremesas e adicionais" className="flex flex-col gap-6">
                <h2 className="font-playfair text-3xl font-bold">Para acompanhar</h2>
                {paidSections.map((s) => (
                  <ExtrasSection key={s.id} section={s} quantities={qty} onChange={(itemId, q) => setQty((p) => ({ ...p, [itemId]: q }))} />
                ))}
              </section>
            )}
          </>
        )}
      </main>

      {count > 0 && (
        <div className="fixed inset-x-0 bottom-0 z-40 border-t border-border bg-card/95 backdrop-blur">
          <div className="mx-auto flex max-w-2xl items-center justify-between gap-4 px-4 py-3">
            <div className="flex flex-col">
              <span className="text-sm text-muted-foreground">{count} {count === 1 ? "item" : "itens"}</span>
              <span className="text-lg font-bold tabular-nums">{formatBRL(subtotal)}</span>
            </div>
            <Button size="lg" className="h-12 gap-2" onClick={() => setOpen(true)}>
              <ShoppingBag className="h-5 w-5" aria-hidden />
              Finalizar pedido
            </Button>
          </div>
        </div>
      )}

      {restaurant && (
        <CheckoutSheet
          open={open}
          onOpenChange={setOpen}
          restaurant={restaurant}
          marmitas={marmitas}
          extras={extras}
          onRemoveMarmita={(key) => setMarmitas((p) => p.filter((m) => m.key !== key))}
          onSubmit={submit}
          submitting={submitting}
        />
      )}
    </div>
  );
}
