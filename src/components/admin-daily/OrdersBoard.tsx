import { useEffect, useState } from "react";
import { useQuery, useQueryClient } from "@tanstack/react-query";
import { format, startOfDay } from "date-fns";
import { MapPin, Phone, Store } from "lucide-react";
import { Badge } from "@/components/ui/badge";
import { Select, SelectContent, SelectItem, SelectTrigger, SelectValue } from "@/components/ui/select";
import { useToast } from "@/hooks/use-toast";
import { db } from "@/lib/db";
import { formatBRL, ORDER_STATUSES, PAYMENT_METHODS, whatsappLink, type OrderRow } from "@/lib/daily-menu";

const STATUS_STYLE: Record<string, string> = {
  received: "bg-primary text-primary-foreground",
  preparing: "bg-accent text-accent-foreground",
  delivering: "bg-foreground text-background",
  delivered: "bg-secondary text-secondary-foreground",
  cancelled: "bg-destructive text-destructive-foreground",
};

export function OrdersBoard({ userId }: { userId: string }) {
  const qc = useQueryClient();
  const { toast } = useToast();
  const [filter, setFilter] = useState("open");
  const key = ["daily-orders", userId];

  const { data: orders = [], isLoading } = useQuery({
    queryKey: key,
    queryFn: async () => {
      const { data, error } = await db
        .from("orders")
        .select("id, order_number, customer_name, customer_phone, customer_address, customer_neighborhood, customer_notes, items, status, subtotal, delivery_fee, total, payment_method, delivery_type, created_at")
        .eq("user_id", userId)
        .gte("created_at", startOfDay(new Date()).toISOString())
        .order("created_at", { ascending: false });
      if (error) throw error;
      return data as OrderRow[];
    },
  });

  useEffect(() => {
    const ch = db
      .channel(`orders-${userId}`)
      .on("postgres_changes", { event: "*", schema: "public", table: "orders", filter: `user_id=eq.${userId}` }, (p) => {
        qc.invalidateQueries({ queryKey: key });
        if (p.eventType === "INSERT") toast({ title: "Novo pedido!", description: (p.new as OrderRow).customer_name });
      })
      .subscribe();
    return () => { db.removeChannel(ch); };
    // eslint-disable-next-line react-hooks/exhaustive-deps
  }, [userId]);

  const updateStatus = async (id: string, status: string) => {
    const { error } = await db.from("orders").update({ status }).eq("id", id).eq("user_id", userId);
    if (error) return toast({ title: "Erro ao atualizar", description: error.message, variant: "destructive" });
    qc.invalidateQueries({ queryKey: key });
  };

  const visible = orders.filter((o) => (filter === "open" ? !["delivered", "cancelled"].includes(o.status) : filter === "all" ? true : o.status === filter));
  const revenue = orders.filter((o) => o.status !== "cancelled").reduce((s, o) => s + Number(o.total), 0);
  const marmitaCount = orders.filter((o) => o.status !== "cancelled").reduce((s, o) => s + o.items.filter((i) => i.type === "marmita").length, 0);

  return (
    <div className="flex flex-col gap-6">
      <div className="grid grid-cols-3 gap-3">
        <div className="rounded-xl border border-border bg-card p-4"><p className="text-sm text-muted-foreground">Pedidos hoje</p><p className="text-2xl font-bold">{orders.length}</p></div>
        <div className="rounded-xl border border-border bg-card p-4"><p className="text-sm text-muted-foreground">Marmitas</p><p className="text-2xl font-bold">{marmitaCount}</p></div>
        <div className="rounded-xl border border-border bg-card p-4"><p className="text-sm text-muted-foreground">Faturamento</p><p className="text-2xl font-bold tabular-nums">{formatBRL(revenue)}</p></div>
      </div>

      <div className="flex items-center justify-between gap-3">
        <h2 className="text-lg font-semibold">Pedidos de hoje</h2>
        <Select value={filter} onValueChange={setFilter}>
          <SelectTrigger className="w-44"><SelectValue /></SelectTrigger>
          <SelectContent>
            <SelectItem value="open">Em aberto</SelectItem>
            <SelectItem value="all">Todos</SelectItem>
            {ORDER_STATUSES.map((s) => <SelectItem key={s.value} value={s.value}>{s.label}</SelectItem>)}
          </SelectContent>
        </Select>
      </div>

      {isLoading ? (
        <p className="text-sm text-muted-foreground">Carregando pedidos...</p>
      ) : visible.length === 0 ? (
        <p className="rounded-xl border border-dashed border-border p-8 text-center text-sm text-muted-foreground">Nenhum pedido por aqui. Os pedidos chegam automaticamente.</p>
      ) : (
        <ul className="grid gap-4 md:grid-cols-2">
          {visible.map((o) => {
            let n = 0;
            return (
              <li key={o.id} className="flex flex-col gap-3 rounded-xl border border-border bg-card p-4">
                <div className="flex items-start justify-between gap-3">
                  <div className="flex flex-col">
                    <span className="text-lg font-bold">#{o.order_number} · {o.customer_name}</span>
                    <span className="text-sm text-muted-foreground">{format(new Date(o.created_at), "HH:mm")} · {PAYMENT_METHODS.find((p) => p.value === o.payment_method)?.label ?? o.payment_method}</span>
                  </div>
                  <Badge className={STATUS_STYLE[o.status] ?? STATUS_STYLE.received}>{ORDER_STATUSES.find((s) => s.value === o.status)?.label ?? o.status}</Badge>
                </div>

                <ul className="flex flex-col gap-2 text-sm">
                  {o.items.map((it, idx) => {
                    if (it.type === "marmita") n += 1;
                    return it.type === "marmita" ? (
                      <li key={idx} className="rounded-lg bg-muted p-2">
                        <p className="font-semibold">Marmita {n} ({it.size}) · {formatBRL(it.price)}</p>
                        <p>{it.proteins?.join(", ")}</p>
                        {!!it.sides?.length && <p className="text-muted-foreground">{it.sides.join(", ")}</p>}
                        {it.notes && <p className="italic text-muted-foreground">Obs: {it.notes}</p>}
                      </li>
                    ) : (
                      <li key={idx} className="flex justify-between px-2"><span>{it.quantity}x {it.name}</span><span className="tabular-nums">{formatBRL(it.price * it.quantity)}</span></li>
                    );
                  })}
                </ul>

                <div className="flex flex-col gap-1 text-sm">
                  <a href={whatsappLink(o.customer_phone, `Olá ${o.customer_name}! Sobre seu pedido #${o.order_number}:`)} target="_blank" rel="noopener noreferrer" className="flex items-center gap-2 text-primary hover:underline">
                    <Phone className="h-4 w-4" aria-hidden />{o.customer_phone}
                  </a>
                  {o.delivery_type === "delivery" ? (
                    <span className="flex items-start gap-2"><MapPin className="mt-0.5 h-4 w-4 shrink-0" aria-hidden />{o.customer_address}{o.customer_neighborhood ? ` - ${o.customer_neighborhood}` : ""}</span>
                  ) : (
                    <span className="flex items-center gap-2"><Store className="h-4 w-4" aria-hidden />Retirada no local</span>
                  )}
                  {o.customer_notes && <span className="italic text-muted-foreground">Obs: {o.customer_notes}</span>}
                </div>

                <div className="flex items-center justify-between gap-3 border-t border-border pt-3">
                  <span className="text-lg font-bold tabular-nums">{formatBRL(o.total)}</span>
                  <Select value={o.status} onValueChange={(v) => updateStatus(o.id, v)}>
                    <SelectTrigger className="w-44" aria-label={`Status do pedido ${o.order_number}`}><SelectValue /></SelectTrigger>
                    <SelectContent>{ORDER_STATUSES.map((s) => <SelectItem key={s.value} value={s.value}>{s.label}</SelectItem>)}</SelectContent>
                  </Select>
                </div>
              </li>
            );
          })}
        </ul>
      )}
    </div>
  );
}
