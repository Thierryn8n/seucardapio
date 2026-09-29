import { useState } from "react";
import { Loader2, Trash2 } from "lucide-react";
import { Sheet, SheetContent, SheetDescription, SheetHeader, SheetTitle } from "@/components/ui/sheet";
import { Button } from "@/components/ui/button";
import { Input } from "@/components/ui/input";
import { Label } from "@/components/ui/label";
import { Textarea } from "@/components/ui/textarea";
import { cn } from "@/lib/utils";
import { formatBRL, PAYMENT_METHODS, type CustomerInfo, type MenuItem, type Restaurant } from "@/lib/daily-menu";
import type { CartMarmita } from "./MarmitaBuilder";

const STORAGE_KEY = "seucardapio:customer";

export function loadSavedCustomer(): CustomerInfo {
  const base: CustomerInfo = { name: "", phone: "", delivery_type: "delivery", address: "", neighborhood: "", payment_method: "pix", notes: "" };
  try {
    return { ...base, ...JSON.parse(localStorage.getItem(STORAGE_KEY) || "{}"), notes: "" };
  } catch {
    return base;
  }
}

interface Props {
  open: boolean;
  onOpenChange: (o: boolean) => void;
  restaurant: Restaurant;
  marmitas: CartMarmita[];
  extras: { item: MenuItem; qty: number }[];
  onRemoveMarmita: (key: string) => void;
  onSubmit: (c: CustomerInfo) => Promise<void>;
  submitting: boolean;
}

function Toggle({ active, onClick, children }: { active: boolean; onClick: () => void; children: React.ReactNode }) {
  return (
    <button
      type="button"
      onClick={onClick}
      aria-pressed={active}
      className={cn("flex-1 rounded-lg border-2 px-3 py-2 text-sm font-medium transition-colors", active ? "border-primary bg-primary/10 text-foreground" : "border-border text-muted-foreground")}
    >
      {children}
    </button>
  );
}

export function CheckoutSheet({ open, onOpenChange, restaurant, marmitas, extras, onRemoveMarmita, onSubmit, submitting }: Props) {
  const [c, setC] = useState<CustomerInfo>(() => {
    const saved = loadSavedCustomer();
    if (!restaurant.accepts_delivery) saved.delivery_type = "pickup";
    if (!restaurant.accepts_pickup) saved.delivery_type = "delivery";
    return saved;
  });
  const set = <K extends keyof CustomerInfo>(k: K, v: CustomerInfo[K]) => setC((p) => ({ ...p, [k]: v }));

  const subtotal = marmitas.reduce((s, m) => s + m.size.price, 0) + extras.reduce((s, e) => s + e.item.price * e.qty, 0);
  const fee = c.delivery_type === "delivery" && restaurant.delivery_enabled ? restaurant.delivery_fee : 0;
  const empty = marmitas.length === 0 && extras.length === 0;

  const submit = async (e: React.FormEvent) => {
    e.preventDefault();
    const { notes: _n, ...persist } = c;
    localStorage.setItem(STORAGE_KEY, JSON.stringify(persist));
    await onSubmit(c);
  };

  return (
    <Sheet open={open} onOpenChange={onOpenChange}>
      <SheetContent side="bottom" className="max-h-[92vh] overflow-y-auto rounded-t-2xl sm:mx-auto sm:max-w-lg">
        <SheetHeader className="text-left">
          <SheetTitle className="font-playfair text-2xl">Seu pedido</SheetTitle>
          <SheetDescription>Confira os itens e informe seus dados para enviar pelo WhatsApp.</SheetDescription>
        </SheetHeader>

        <form onSubmit={submit} className="mt-4 flex flex-col gap-6">
          <ul className="flex flex-col gap-2">
            {marmitas.map((m, idx) => (
              <li key={m.key} className="flex items-start justify-between gap-3 rounded-lg border border-border bg-muted/40 p-3">
                <div className="flex min-w-0 flex-col gap-1 text-sm">
                  <span className="font-semibold text-foreground">Marmita {idx + 1} · {m.size.name} · {formatBRL(m.size.price)}</span>
                  <span className="text-muted-foreground">{m.proteins.map((p) => p.name).join(", ")}</span>
                  {m.sides.length > 0 && <span className="text-muted-foreground">{m.sides.map((p) => p.name).join(", ")}</span>}
                  {m.notes && <span className="italic text-muted-foreground">Obs: {m.notes}</span>}
                </div>
                <Button type="button" variant="ghost" size="icon" onClick={() => onRemoveMarmita(m.key)} aria-label={`Remover marmita ${idx + 1}`}>
                  <Trash2 className="h-4 w-4" />
                </Button>
              </li>
            ))}
            {extras.map(({ item, qty }) => (
              <li key={item.id} className="flex justify-between gap-3 px-1 text-sm">
                <span>{qty}x {item.name}</span>
                <span className="tabular-nums">{formatBRL(item.price * qty)}</span>
              </li>
            ))}
            {empty && <li className="text-sm text-muted-foreground">Seu pedido está vazio.</li>}
          </ul>

          <fieldset className="flex flex-col gap-4">
            <legend className="mb-2 font-semibold text-foreground">Seus dados</legend>
            <div className="flex flex-col gap-2">
              <Label htmlFor="c-name">Nome</Label>
              <Input id="c-name" required minLength={2} maxLength={120} autoComplete="name" value={c.name} onChange={(e) => set("name", e.target.value)} />
            </div>
            <div className="flex flex-col gap-2">
              <Label htmlFor="c-phone">WhatsApp / Telefone</Label>
              <Input id="c-phone" required type="tel" inputMode="tel" autoComplete="tel" placeholder="(00) 00000-0000" pattern="[\d\s()+-]{10,20}" value={c.phone} onChange={(e) => set("phone", e.target.value)} />
            </div>

            {restaurant.accepts_delivery && restaurant.accepts_pickup && (
              <div className="flex gap-2" role="group" aria-label="Forma de recebimento">
                <Toggle active={c.delivery_type === "delivery"} onClick={() => set("delivery_type", "delivery")}>Entrega</Toggle>
                <Toggle active={c.delivery_type === "pickup"} onClick={() => set("delivery_type", "pickup")}>Retirar no local</Toggle>
              </div>
            )}

            {c.delivery_type === "delivery" ? (
              <>
                <div className="flex flex-col gap-2">
                  <Label htmlFor="c-address">Endereço (rua, número, complemento)</Label>
                  <Input id="c-address" required minLength={5} maxLength={300} autoComplete="street-address" value={c.address} onChange={(e) => set("address", e.target.value)} />
                </div>
                <div className="flex flex-col gap-2">
                  <Label htmlFor="c-neigh">Bairro / ponto de referência</Label>
                  <Input id="c-neigh" maxLength={120} value={c.neighborhood} onChange={(e) => set("neighborhood", e.target.value)} />
                </div>
              </>
            ) : (
              restaurant.address && <p className="text-sm text-muted-foreground">Retirada em: {restaurant.address}</p>
            )}

            <div className="flex flex-col gap-2">
              <span className="text-sm font-medium">Pagamento</span>
              <div className="flex gap-2" role="group" aria-label="Forma de pagamento">
                {PAYMENT_METHODS.map((p) => (
                  <Toggle key={p.value} active={c.payment_method === p.value} onClick={() => set("payment_method", p.value)}>{p.label}</Toggle>
                ))}
              </div>
            </div>
            <div className="flex flex-col gap-2">
              <Label htmlFor="c-notes">Observações (troco, etc.)</Label>
              <Textarea id="c-notes" rows={2} maxLength={500} value={c.notes} onChange={(e) => set("notes", e.target.value)} />
            </div>
          </fieldset>

          <div className="flex flex-col gap-1 border-t border-border pt-4 text-sm">
            <div className="flex justify-between"><span>Subtotal</span><span className="tabular-nums">{formatBRL(subtotal)}</span></div>
            {c.delivery_type === "delivery" && (
              <div className="flex justify-between"><span>Entrega</span><span className="tabular-nums">{fee > 0 ? formatBRL(fee) : "Grátis"}</span></div>
            )}
            <div className="flex justify-between text-lg font-bold"><span>Total</span><span className="tabular-nums">{formatBRL(subtotal + fee)}</span></div>
          </div>

          <Button type="submit" size="lg" disabled={empty || submitting} className="h-12 gap-2 bg-secondary text-base text-secondary-foreground hover:bg-secondary/90">
            {submitting && <Loader2 className="h-5 w-5 animate-spin" aria-hidden />}
            Enviar pedido no WhatsApp
          </Button>
        </form>
      </SheetContent>
    </Sheet>
  );
}
