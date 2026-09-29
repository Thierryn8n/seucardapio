import { useState } from "react";
import { useQuery, useQueryClient } from "@tanstack/react-query";
import { Plus, Trash2 } from "lucide-react";
import { Button } from "@/components/ui/button";
import { Input } from "@/components/ui/input";
import { Label } from "@/components/ui/label";
import { Switch } from "@/components/ui/switch";
import { useToast } from "@/hooks/use-toast";
import { db } from "@/lib/db";
import { fetchSizes, formatBRL, type MarmitaSize } from "@/lib/daily-menu";

export function SizesEditor({ userId }: { userId: string }) {
  const qc = useQueryClient();
  const { toast } = useToast();
  const { data: sizes = [] } = useQuery({ queryKey: ["sizes", userId], queryFn: () => fetchSizes(userId) });
  const [form, setForm] = useState({ name: "", price: "", max: "2" });
  const refresh = () => qc.invalidateQueries({ queryKey: ["sizes", userId] });
  const fail = (e: { message: string } | null) => { if (e) toast({ title: "Erro", description: e.message, variant: "destructive" }); return !!e; };

  const add = async (e: React.FormEvent) => {
    e.preventDefault();
    const max = Number(form.max);
    const { error } = await db.from("marmita_sizes").insert({
      user_id: userId, name: form.name.trim(), price: Number(form.price.replace(",", ".")), max_proteins: max,
      description: `${max} proteína${max > 1 ? "s" : ""}`, display_order: sizes.length,
    });
    if (fail(error)) return;
    setForm({ name: "", price: "", max: "2" });
    refresh();
  };

  const update = async (s: MarmitaSize, patch: Partial<MarmitaSize>) => {
    if (!fail((await db.from("marmita_sizes").update(patch).eq("id", s.id).eq("user_id", userId)).error)) refresh();
  };
  const remove = async (s: MarmitaSize) => {
    if (!confirm(`Remover o tamanho ${s.name}?`)) return;
    if (!fail((await db.from("marmita_sizes").delete().eq("id", s.id).eq("user_id", userId)).error)) refresh();
  };

  return (
    <div className="flex flex-col gap-6">
      <div>
        <h2 className="text-lg font-semibold">Tamanhos e preços</h2>
        <p className="text-sm text-muted-foreground">Valem para todos os dias. O cliente escolhe o tamanho e a quantidade de proteínas fica limitada.</p>
      </div>
      <ul className="flex flex-col gap-2">
        {sizes.map((s) => (
          <li key={s.id} className="flex flex-wrap items-center gap-3 rounded-xl border border-border bg-card p-3">
            <span className="w-16 font-playfair text-xl font-bold">{s.name}</span>
            <span className="flex-1 text-sm text-muted-foreground">{s.max_proteins} proteína(s) · {formatBRL(s.price)}</span>
            <label className="flex items-center gap-2 text-sm">
              <Switch checked={s.active} onCheckedChange={(v) => update(s, { active: v })} aria-label={`Ativar ${s.name}`} />
              Ativo
            </label>
            <Button variant="ghost" size="icon" onClick={() => remove(s)} aria-label={`Remover ${s.name}`}><Trash2 className="h-4 w-4" /></Button>
          </li>
        ))}
        {!sizes.length && <li className="text-sm text-muted-foreground">Nenhum tamanho cadastrado. Adicione abaixo ou cole sua lista na aba Cardápio.</li>}
      </ul>
      <form onSubmit={add} className="grid grid-cols-2 items-end gap-3 rounded-xl border border-dashed border-border p-4 sm:grid-cols-4">
        <div className="flex flex-col gap-2"><Label htmlFor="s-name">Nome</Label><Input id="s-name" required maxLength={20} placeholder="G, GG..." value={form.name} onChange={(e) => setForm({ ...form, name: e.target.value })} /></div>
        <div className="flex flex-col gap-2"><Label htmlFor="s-price">Preço</Label><Input id="s-price" required inputMode="decimal" pattern="\d+([.,]\d{1,2})?" placeholder="14,00" value={form.price} onChange={(e) => setForm({ ...form, price: e.target.value })} /></div>
        <div className="flex flex-col gap-2"><Label htmlFor="s-max">Máx. proteínas</Label><Input id="s-max" required type="number" min={1} max={10} value={form.max} onChange={(e) => setForm({ ...form, max: e.target.value })} /></div>
        <Button type="submit" className="gap-2"><Plus className="h-4 w-4" aria-hidden />Adicionar</Button>
      </form>
    </div>
  );
}
