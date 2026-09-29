import { useMemo, useState } from "react";
import { useMutation, useQuery, useQueryClient } from "@tanstack/react-query";
import { Loader2, Search } from "lucide-react";
import { Badge } from "@/components/ui/badge";
import { Button } from "@/components/ui/button";
import { Dialog, DialogContent, DialogDescription, DialogFooter, DialogHeader, DialogTitle } from "@/components/ui/dialog";
import { Input } from "@/components/ui/input";
import { Label } from "@/components/ui/label";
import { Select, SelectContent, SelectItem, SelectTrigger, SelectValue } from "@/components/ui/select";
import { Switch } from "@/components/ui/switch";
import { useToast } from "@/hooks/use-toast";
import { db } from "@/lib/db";

type Marmitaria = {
  user_id: string;
  email: string | null;
  name: string | null;
  created_at: string;
  plan: string;
  expires_at: string | null;
  panels_enabled: boolean;
  is_admin: boolean;
};

const PLAN_LABELS: Record<string, string> = { free: "Gratuito", professional: "Profissional", premium: "Premium" };
const DAY_MS = 24 * 60 * 60 * 1000;

function accessState(m: Marmitaria) {
  if (m.is_admin) return { label: "Admin", variant: "secondary" as const };
  if (!m.panels_enabled) return { label: "Pausado", variant: "destructive" as const };
  if (!m.expires_at) return { label: "Sem validade", variant: "outline" as const };
  const days = Math.ceil((new Date(m.expires_at).getTime() - Date.now()) / DAY_MS);
  if (days <= 0) return { label: "Expirado", variant: "destructive" as const };
  if (days <= 7) return { label: `Vence em ${days}d`, variant: "outline" as const };
  return { label: "Ativo", variant: "default" as const };
}

const toDateInput = (iso: string | null) => (iso ? iso.slice(0, 10) : "");
const addDays = (base: string, days: number) => {
  const start = base && new Date(base) > new Date() ? new Date(base) : new Date();
  return new Date(start.getTime() + days * DAY_MS).toISOString().slice(0, 10);
};

function ManagePlanDialog({ item, onClose }: { item: Marmitaria; onClose: () => void }) {
  const { toast } = useToast();
  const queryClient = useQueryClient();
  const [plan, setPlan] = useState(item.plan);
  const [expires, setExpires] = useState(toDateInput(item.expires_at));
  const [enabled, setEnabled] = useState(item.panels_enabled);

  const save = useMutation({
    mutationFn: async () => {
      const { error } = await db.rpc("admin_set_plan", {
        p_user_id: item.user_id,
        p_plan: plan,
        p_expires_at: expires ? new Date(`${expires}T23:59:59`).toISOString() : null,
        p_panels_enabled: enabled,
      });
      if (error) throw error;
    },
    onSuccess: () => {
      queryClient.invalidateQueries({ queryKey: ["admin-marmitarias"] });
      queryClient.invalidateQueries({ queryKey: ["plan-access"] });
      toast({ title: "Plano atualizado", description: item.email ?? undefined });
      onClose();
    },
    onError: (e: Error) => toast({ title: "Erro ao salvar", description: e.message, variant: "destructive" }),
  });

  return (
    <Dialog open onOpenChange={(open) => !open && onClose()}>
      <DialogContent>
        <DialogHeader>
          <DialogTitle>Gerenciar plano</DialogTitle>
          <DialogDescription>{item.name || item.email}</DialogDescription>
        </DialogHeader>

        <div className="flex flex-col gap-5">
          <div className="flex items-center justify-between gap-4 rounded-xl border p-3">
            <div className="flex flex-col">
              <Label htmlFor="panels-enabled">Painel liberado</Label>
              <span className="text-xs text-muted-foreground">Desligado, a marmitaria vê a tela de renovação.</span>
            </div>
            <Switch id="panels-enabled" checked={enabled} onCheckedChange={setEnabled} />
          </div>

          <div className="flex flex-col gap-2">
            <Label htmlFor="plan">Plano</Label>
            <Select value={plan} onValueChange={setPlan}>
              <SelectTrigger id="plan"><SelectValue /></SelectTrigger>
              <SelectContent>
                {Object.entries(PLAN_LABELS).map(([value, label]) => (
                  <SelectItem key={value} value={value}>{label}</SelectItem>
                ))}
              </SelectContent>
            </Select>
          </div>

          <div className="flex flex-col gap-2">
            <Label htmlFor="expires">Válido até</Label>
            <Input id="expires" type="date" value={expires} onChange={(e) => setExpires(e.target.value)} />
            <div className="flex flex-wrap gap-2">
              {[30, 90, 365].map((d) => (
                <Button key={d} type="button" size="sm" variant="outline" onClick={() => setExpires(addDays(expires, d))}>
                  +{d} dias
                </Button>
              ))}
              <Button type="button" size="sm" variant="ghost" onClick={() => setExpires("")}>Sem validade</Button>
            </div>
          </div>
        </div>

        <DialogFooter>
          <Button variant="outline" onClick={onClose}>Cancelar</Button>
          <Button onClick={() => save.mutate()} disabled={save.isPending}>
            {save.isPending && <Loader2 className="mr-2 h-4 w-4 animate-spin" aria-hidden />}
            Salvar
          </Button>
        </DialogFooter>
      </DialogContent>
    </Dialog>
  );
}

const AdminUsers = () => {
  const [search, setSearch] = useState("");
  const [editing, setEditing] = useState<Marmitaria | null>(null);
  const { data = [], isLoading, error } = useQuery({
    queryKey: ["admin-marmitarias"],
    queryFn: async () => {
      const { data, error } = await db.rpc("admin_list_marmitarias");
      if (error) throw error;
      return data as Marmitaria[];
    },
  });

  const filtered = useMemo(() => {
    const q = search.trim().toLowerCase();
    return q ? data.filter((m) => `${m.email} ${m.name}`.toLowerCase().includes(q)) : data;
  }, [data, search]);

  return (
    <div className="flex flex-col gap-4">
      <div className="relative max-w-sm">
        <Search className="absolute left-3 top-1/2 h-4 w-4 -translate-y-1/2 text-muted-foreground" aria-hidden />
        <Input
          aria-label="Buscar marmitaria"
          placeholder="Buscar por nome ou e-mail"
          value={search}
          onChange={(e) => setSearch(e.target.value)}
          className="pl-9"
        />
      </div>

      {isLoading ? (
        <div className="flex justify-center py-12"><Loader2 className="h-6 w-6 animate-spin text-primary" aria-label="Carregando" /></div>
      ) : error ? (
        <p className="text-sm text-destructive">{(error as Error).message}</p>
      ) : filtered.length === 0 ? (
        <p className="py-12 text-center text-sm text-muted-foreground">Nenhuma marmitaria encontrada.</p>
      ) : (
        <ul className="flex flex-col gap-2">
          {filtered.map((m) => {
            const state = accessState(m);
            return (
              <li key={m.user_id} className="skeuo-raised flex flex-col gap-3 rounded-2xl p-4 sm:flex-row sm:items-center sm:justify-between">
                <div className="flex min-w-0 flex-col gap-1">
                  <span className="truncate font-medium">{m.name || m.email}</span>
                  {m.name && <span className="truncate text-sm text-muted-foreground">{m.email}</span>}
                  <div className="flex flex-wrap items-center gap-2 text-xs text-muted-foreground">
                    <Badge variant="outline">{PLAN_LABELS[m.plan] ?? m.plan}</Badge>
                    <Badge variant={state.variant}>{state.label}</Badge>
                    {m.expires_at && <span>até {new Date(m.expires_at).toLocaleDateString("pt-BR")}</span>}
                  </div>
                </div>
                {!m.is_admin && (
                  <Button size="sm" variant="outline" onClick={() => setEditing(m)} className="shrink-0">
                    Gerenciar plano
                  </Button>
                )}
              </li>
            );
          })}
        </ul>
      )}

      {editing && <ManagePlanDialog key={editing.user_id} item={editing} onClose={() => setEditing(null)} />}
    </div>
  );
};

export default AdminUsers;
