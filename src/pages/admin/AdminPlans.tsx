import { useEffect, useState } from "react";
import { useMutation, useQuery, useQueryClient } from "@tanstack/react-query";
import { ExternalLink, Loader2, MessageCircle } from "lucide-react";
import { Button } from "@/components/ui/button";
import { Card, CardContent, CardDescription, CardHeader, CardTitle } from "@/components/ui/card";
import { Input } from "@/components/ui/input";
import { Label } from "@/components/ui/label";
import { Textarea } from "@/components/ui/textarea";
import { useToast } from "@/hooks/use-toast";
import { buildWhatsAppLink, usePlatformSettings } from "@/hooks/usePlanAccess";
import { db } from "@/lib/db";

type Plan = { id: string; name: string; display_name: string; price: number; interval: string; active: boolean };

function RenewalSettingsCard() {
  const { toast } = useToast();
  const queryClient = useQueryClient();
  const { data: settings, isLoading } = usePlatformSettings();
  const [whatsapp, setWhatsapp] = useState("");
  const [message, setMessage] = useState("");
  const [warnDays, setWarnDays] = useState(7);

  useEffect(() => {
    if (!settings) return;
    setWhatsapp(settings.admin_whatsapp ?? "");
    setMessage(settings.renewal_message);
    setWarnDays(settings.warn_days);
  }, [settings]);

  const save = useMutation({
    mutationFn: async () => {
      const digits = whatsapp.replace(/\D/g, "");
      if (digits && (digits.length < 10 || digits.length > 15)) throw new Error("Número inválido. Use DDI + DDD + número, ex: 5511999999999");
      const { error } = await db
        .from("platform_settings")
        .update({ admin_whatsapp: digits || null, renewal_message: message.trim(), warn_days: warnDays, updated_at: new Date().toISOString() })
        .eq("id", true);
      if (error) throw error;
    },
    onSuccess: () => {
      queryClient.invalidateQueries({ queryKey: ["platform-settings"] });
      toast({ title: "Configurações salvas" });
    },
    onError: (e: Error) => toast({ title: "Erro ao salvar", description: e.message, variant: "destructive" }),
  });

  const preview = buildWhatsAppLink(whatsapp, message);

  return (
    <Card>
      <CardHeader>
        <CardTitle className="flex items-center gap-2">
          <MessageCircle className="h-5 w-5 text-primary" aria-hidden />
          Renovação pelo WhatsApp
        </CardTitle>
        <CardDescription>
          Quando o plano estiver perto de vencer ou vencido, a marmitaria é enviada para este WhatsApp.
        </CardDescription>
      </CardHeader>
      <CardContent>
        {isLoading ? (
          <Loader2 className="h-5 w-5 animate-spin text-primary" aria-label="Carregando" />
        ) : (
          <form
            className="flex flex-col gap-4"
            onSubmit={(e) => {
              e.preventDefault();
              save.mutate();
            }}
          >
            <div className="flex flex-col gap-2">
              <Label htmlFor="admin-whatsapp">WhatsApp do administrador</Label>
              <Input
                id="admin-whatsapp"
                inputMode="tel"
                placeholder="5511999999999"
                value={whatsapp}
                onChange={(e) => setWhatsapp(e.target.value)}
              />
              <span className="text-xs text-muted-foreground">Com código do país e DDD, só números.</span>
            </div>
            <div className="flex flex-col gap-2">
              <Label htmlFor="renewal-message">Mensagem inicial</Label>
              <Textarea id="renewal-message" rows={3} value={message} onChange={(e) => setMessage(e.target.value)} />
              <span className="text-xs text-muted-foreground">O e-mail e o plano da marmitaria são adicionados automaticamente.</span>
            </div>
            <div className="flex flex-col gap-2">
              <Label htmlFor="warn-days">Avisar quantos dias antes do vencimento</Label>
              <Input
                id="warn-days"
                type="number"
                min={1}
                max={60}
                value={warnDays}
                onChange={(e) => setWarnDays(Math.min(60, Math.max(1, Number(e.target.value) || 1)))}
                className="max-w-32"
              />
            </div>
            <div className="flex flex-wrap gap-2">
              <Button type="submit" disabled={save.isPending}>
                {save.isPending && <Loader2 className="mr-2 h-4 w-4 animate-spin" aria-hidden />}
                Salvar
              </Button>
              {preview && (
                <Button asChild type="button" variant="outline" className="gap-2">
                  <a href={preview} target="_blank" rel="noopener noreferrer">
                    Testar link
                    <ExternalLink className="h-4 w-4" aria-hidden />
                  </a>
                </Button>
              )}
            </div>
          </form>
        )}
      </CardContent>
    </Card>
  );
}

function PlansCard() {
  const { data: plans = [] } = useQuery({
    queryKey: ["plans"],
    queryFn: async () => {
      const { data, error } = await db.from("plans").select("id,name,display_name,price,interval,active").order("price");
      if (error) throw error;
      return data as Plan[];
    },
  });

  return (
    <Card>
      <CardHeader>
        <CardTitle>Planos disponíveis</CardTitle>
        <CardDescription>
          A cobrança é manual: combine o pagamento pelo WhatsApp e libere o plano em Usuários.
        </CardDescription>
      </CardHeader>
      <CardContent>
        <ul className="flex flex-col gap-2">
          {plans.map((p) => (
            <li key={p.id} className="flex items-center justify-between rounded-xl border px-4 py-3">
              <span className="font-medium">{p.display_name}</span>
              <span className="tabular-nums text-muted-foreground">
                {Number(p.price) > 0
                  ? `${Number(p.price).toLocaleString("pt-BR", { style: "currency", currency: "BRL" })}/${p.interval === "yearly" ? "ano" : "mês"}`
                  : "Grátis"}
              </span>
            </li>
          ))}
        </ul>
      </CardContent>
    </Card>
  );
}

const AdminPlans = () => (
  <div className="grid gap-6 lg:grid-cols-2">
    <RenewalSettingsCard />
    <PlansCard />
  </div>
);

export default AdminPlans;
