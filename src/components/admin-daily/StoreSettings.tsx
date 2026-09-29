import { useEffect, useState } from "react";
import { useQuery, useQueryClient } from "@tanstack/react-query";
import { Copy, Loader2 } from "lucide-react";
import { Button } from "@/components/ui/button";
import { Input } from "@/components/ui/input";
import { Label } from "@/components/ui/label";
import { Switch } from "@/components/ui/switch";
import { useToast } from "@/hooks/use-toast";
import { db } from "@/lib/db";

interface FormState {
  company_name: string;
  slug: string;
  whatsapp_number: string;
  address: string;
  accepts_delivery: boolean;
  accepts_pickup: boolean;
  delivery_fee: string;
  estimated_time: string;
}

export function publicMenuUrl(slugOrId: string) {
  return `${window.location.origin}/${slugOrId}/cardapio`;
}

export function StoreSettings({ userId }: { userId: string }) {
  const qc = useQueryClient();
  const { toast } = useToast();
  const [saving, setSaving] = useState(false);
  const { data } = useQuery({
    queryKey: ["store-settings", userId],
    queryFn: async () => {
      const [p, s, d] = await Promise.all([
        db.from("profiles").select("name, slug, address").eq("id", userId).maybeSingle(),
        db.from("settings").select("company_name, whatsapp_number, accepts_delivery, accepts_pickup").eq("user_id", userId).maybeSingle(),
        db.from("delivery_settings").select("delivery_fee, estimated_time").eq("user_id", userId).maybeSingle(),
      ]);
      return {
        company_name: s.data?.company_name === "Nossa Empresa" ? p.data?.name ?? "" : s.data?.company_name ?? "",
        slug: p.data?.slug ?? "",
        whatsapp_number: s.data?.whatsapp_number ?? "",
        address: p.data?.address ?? "",
        accepts_delivery: s.data?.accepts_delivery ?? true,
        accepts_pickup: s.data?.accepts_pickup ?? true,
        delivery_fee: String(d.data?.delivery_fee ?? "0"),
        estimated_time: d.data?.estimated_time ?? "40 minutos",
      } as FormState;
    },
  });
  const [f, setF] = useState<FormState | null>(null);
  useEffect(() => { if (data) setF(data); }, [data]);
  if (!f) return <p className="text-sm text-muted-foreground">Carregando...</p>;
  const set = <K extends keyof FormState>(k: K, v: FormState[K]) => setF({ ...f, [k]: v });

  const save = async (e: React.FormEvent) => {
    e.preventDefault();
    setSaving(true);
    const slug = f.slug.trim().toLowerCase().replace(/[^a-z0-9-]/g, "-").replace(/-+/g, "-").replace(/^-|-$/g, "") || null;
    const results = await Promise.all([
      db.from("profiles").update({ name: f.company_name.trim(), slug, address: f.address.trim() || null }).eq("id", userId),
      db.from("settings").upsert({ user_id: userId, company_name: f.company_name.trim() || "Nossa Empresa", whatsapp_number: f.whatsapp_number.replace(/\D/g, ""), accepts_delivery: f.accepts_delivery, accepts_pickup: f.accepts_pickup }, { onConflict: "user_id" }),
      db.from("delivery_settings").upsert({ user_id: userId, delivery_fee: Number(f.delivery_fee.replace(",", ".")) || 0, estimated_time: f.estimated_time, delivery_enabled: f.accepts_delivery }, { onConflict: "user_id" }),
    ]);
    setSaving(false);
    const err = results.find((r) => r.error)?.error;
    if (err) {
      const msg = err.code === "23505" ? "Esse link já está em uso, escolha outro." : err.message;
      return toast({ title: "Erro ao salvar", description: msg, variant: "destructive" });
    }
    toast({ title: "Configurações salvas" });
    qc.invalidateQueries({ queryKey: ["store-settings", userId] });
  };

  const link = publicMenuUrl(data?.slug || userId);

  return (
    <form onSubmit={save} className="flex max-w-xl flex-col gap-5">
      <div className="flex flex-col gap-2 rounded-xl border border-border bg-muted p-4">
        <span className="text-sm font-medium">Link do seu cardápio</span>
        <div className="flex gap-2">
          <Input readOnly value={link} aria-label="Link público" />
          <Button type="button" variant="outline" size="icon" onClick={() => { navigator.clipboard.writeText(link); toast({ title: "Link copiado" }); }} aria-label="Copiar link"><Copy className="h-4 w-4" /></Button>
        </div>
      </div>
      <div className="flex flex-col gap-2"><Label htmlFor="st-name">Nome da marmitaria</Label><Input id="st-name" required maxLength={80} value={f.company_name} onChange={(e) => set("company_name", e.target.value)} /></div>
      <div className="flex flex-col gap-2">
        <Label htmlFor="st-slug">Link personalizado</Label>
        <Input id="st-slug" maxLength={40} placeholder="minha-marmitaria" value={f.slug} onChange={(e) => set("slug", e.target.value)} />
      </div>
      <div className="flex flex-col gap-2">
        <Label htmlFor="st-wa">WhatsApp que recebe os pedidos</Label>
        <Input id="st-wa" required type="tel" inputMode="tel" placeholder="(85) 99999-9999" value={f.whatsapp_number} onChange={(e) => set("whatsapp_number", e.target.value)} />
      </div>
      <div className="flex flex-col gap-2"><Label htmlFor="st-addr">Endereço (para retirada)</Label><Input id="st-addr" maxLength={200} value={f.address} onChange={(e) => set("address", e.target.value)} /></div>
      <div className="flex flex-wrap gap-6">
        <label className="flex items-center gap-2 text-sm"><Switch checked={f.accepts_delivery} onCheckedChange={(v) => set("accepts_delivery", v)} />Faz entrega</label>
        <label className="flex items-center gap-2 text-sm"><Switch checked={f.accepts_pickup} onCheckedChange={(v) => set("accepts_pickup", v)} />Aceita retirada</label>
      </div>
      {f.accepts_delivery && (
        <div className="grid grid-cols-2 gap-3">
          <div className="flex flex-col gap-2"><Label htmlFor="st-fee">Taxa de entrega</Label><Input id="st-fee" inputMode="decimal" value={f.delivery_fee} onChange={(e) => set("delivery_fee", e.target.value)} /></div>
          <div className="flex flex-col gap-2"><Label htmlFor="st-time">Tempo estimado</Label><Input id="st-time" maxLength={30} value={f.estimated_time} onChange={(e) => set("estimated_time", e.target.value)} /></div>
        </div>
      )}
      <Button type="submit" disabled={saving} className="gap-2 self-start">{saving && <Loader2 className="h-4 w-4 animate-spin" />}Salvar</Button>
    </form>
  );
}
