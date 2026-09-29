import { useEffect, useState, type FormEvent } from "react";
import { useSearchParams } from "react-router-dom";
import useSWR from "swr";
import { CheckCircle2, Copy, ExternalLink, KeyRound, Link2, Loader2, Unplug, Webhook } from "lucide-react";
import { useToast } from "@/hooks/use-toast";
import {
  MP_CALLBACK_URL,
  MP_WEBHOOK_URL,
  disconnectMp,
  getMpStatus,
  saveMpCredentials,
  startMpOAuth,
} from "@/lib/mercadopago";

function CopyField({ label, value }: { label: string; value: string }) {
  const { toast } = useToast();
  return (
    <div className="flex flex-col gap-1.5">
      <span className="text-xs font-medium uppercase tracking-wider text-muted-foreground">{label}</span>
      <div className="skeuo-inset flex items-center gap-2 rounded-xl px-3 py-2">
        <code className="min-w-0 flex-1 truncate font-mono text-xs">{value}</code>
        <button
          type="button"
          aria-label={`Copiar ${label}`}
          className="rounded-md p-1.5 text-muted-foreground transition-colors hover:text-foreground"
          onClick={() => {
            navigator.clipboard.writeText(value);
            toast({ title: "Copiado" });
          }}
        >
          <Copy className="h-4 w-4" />
        </button>
      </div>
    </div>
  );
}

const AdminMercadoPago = () => {
  const { toast } = useToast();
  const [params, setParams] = useSearchParams();
  const { data: status, isLoading, mutate } = useSWR("mp-status", getMpStatus);
  const [clientId, setClientId] = useState("");
  const [clientSecret, setClientSecret] = useState("");
  const [webhookSecret, setWebhookSecret] = useState("");
  const [saving, setSaving] = useState(false);
  const [connecting, setConnecting] = useState(false);
  const [disconnecting, setDisconnecting] = useState(false);

  useEffect(() => {
    if (status?.client_id && !clientId) setClientId(status.client_id);
  }, [status?.client_id, clientId]);

  useEffect(() => {
    const result = params.get("mp");
    if (!result) return;
    if (result === "connected") toast({ title: "Conta Mercado Pago conectada" });
    else toast({ title: "Não foi possível conectar", description: params.get("reason") ?? undefined, variant: "destructive" });
    params.delete("mp");
    params.delete("reason");
    setParams(params, { replace: true });
    mutate();
  }, [params, setParams, toast, mutate]);

  const handleSave = async (e: FormEvent) => {
    e.preventDefault();
    if (!status?.has_credentials && !clientSecret.trim()) {
      toast({ title: "Informe o Client Secret", variant: "destructive" });
      return;
    }
    setSaving(true);
    try {
      await saveMpCredentials(clientId, clientSecret, webhookSecret);
      setClientSecret("");
      setWebhookSecret("");
      await mutate();
      toast({ title: "Credenciais salvas" });
    } catch (err) {
      toast({ title: "Erro ao salvar", description: (err as Error).message, variant: "destructive" });
    } finally {
      setSaving(false);
    }
  };

  const handleConnect = async () => {
    setConnecting(true);
    try {
      const url = await startMpOAuth(`${window.location.origin}/admin/mercadopago`);
      if (window.self !== window.top) window.open(url, "_blank", "noopener");
      else window.location.href = url;
    } catch (err) {
      toast({ title: "Erro ao iniciar conexão", description: (err as Error).message, variant: "destructive" });
    } finally {
      setConnecting(false);
    }
  };

  const handleDisconnect = async () => {
    if (!window.confirm("Desconectar a conta? Novas assinaturas ficarão indisponíveis até reconectar.")) return;
    setDisconnecting(true);
    try {
      await disconnectMp();
      await mutate();
      toast({ title: "Conta desconectada" });
    } catch (err) {
      toast({ title: "Erro ao desconectar", description: (err as Error).message, variant: "destructive" });
    } finally {
      setDisconnecting(false);
    }
  };

  if (isLoading) {
    return (
      <div className="flex items-center justify-center py-20">
        <Loader2 className="h-6 w-6 animate-spin text-muted-foreground" />
      </div>
    );
  }

  const inputClass =
    "skeuo-inset w-full rounded-xl bg-transparent px-3 py-2.5 text-sm outline-none placeholder:text-muted-foreground/60 focus-visible:ring-2 focus-visible:ring-primary/40";

  return (
    <div className="mx-auto flex max-w-5xl flex-col gap-5">
      <section className="skeuo-raised flex flex-col gap-4 rounded-3xl p-5 md:flex-row md:items-center md:justify-between">
        <div className="flex items-center gap-4">
          <div className="skeuo-inset flex h-12 w-12 shrink-0 items-center justify-center rounded-2xl">
            {status?.connected ? <CheckCircle2 className="h-6 w-6 text-primary" /> : <Link2 className="h-6 w-6 text-muted-foreground" />}
          </div>
          <div className="flex min-w-0 flex-col">
            <h2 className="font-playfair text-lg font-bold">
              {status?.connected ? "Conta conectada" : "Nenhuma conta conectada"}
            </h2>
            <p className="truncate text-sm text-muted-foreground">
              {status?.connected
                ? `${status.account_nickname ?? "Conta"} · ${status.account_email ?? `ID ${status.mp_user_id}`}${status.live_mode === false ? " · modo teste" : ""}`
                : "O dinheiro das assinaturas cairá na conta que você autorizar."}
            </p>
          </div>
        </div>
        <div className="flex flex-wrap items-center gap-2">
          {status?.connected && (
            <span className="rounded-full bg-foreground/5 px-3 py-1 text-xs font-medium tabular-nums">
              {status.active_subscriptions} assinatura{status.active_subscriptions === 1 ? "" : "s"} ativa{status.active_subscriptions === 1 ? "" : "s"}
            </span>
          )}
          {status?.connected ? (
            <>
              <button
                type="button"
                onClick={handleConnect}
                disabled={connecting}
                className="skeuo-raised skeuo-press flex items-center gap-2 rounded-xl px-4 py-2.5 text-sm font-semibold disabled:opacity-50"
              >
                {connecting ? <Loader2 className="h-4 w-4 animate-spin" /> : <Link2 className="h-4 w-4" />}
                Trocar conta
              </button>
              <button
                type="button"
                onClick={handleDisconnect}
                disabled={disconnecting}
                className="skeuo-raised skeuo-press flex items-center gap-2 rounded-xl px-4 py-2.5 text-sm font-semibold text-destructive disabled:opacity-50"
              >
                {disconnecting ? <Loader2 className="h-4 w-4 animate-spin" /> : <Unplug className="h-4 w-4" />}
                Desconectar
              </button>
            </>
          ) : (
            <button
              type="button"
              onClick={handleConnect}
              disabled={connecting || !status?.has_credentials}
              className="skeuo-primary skeuo-press flex items-center gap-2 rounded-xl px-5 py-2.5 text-sm font-semibold disabled:opacity-50"
            >
              {connecting ? <Loader2 className="h-4 w-4 animate-spin" /> : <ExternalLink className="h-4 w-4" />}
              Conectar com Mercado Pago
            </button>
          )}
        </div>
      </section>

      <div className="grid grid-cols-1 gap-5 lg:grid-cols-5">
        <form onSubmit={handleSave} className="skeuo-raised flex flex-col gap-4 rounded-3xl p-5 lg:col-span-3">
          <div className="flex items-center gap-3">
            <KeyRound className="h-5 w-5 text-primary" />
            <h3 className="text-sm font-semibold">1. Credenciais do aplicativo</h3>
          </div>
          <p className="text-sm leading-relaxed text-muted-foreground">
            Crie um aplicativo em{" "}
            <a href="https://www.mercadopago.com.br/developers/panel/app" target="_blank" rel="noreferrer" className="font-medium text-primary underline-offset-4 hover:underline">
              Mercado Pago Developers
            </a>{" "}
            e copie o Client ID e o Client Secret. Os segredos ficam guardados apenas no servidor.
          </p>
          <label className="flex flex-col gap-1.5">
            <span className="text-xs font-medium uppercase tracking-wider text-muted-foreground">Client ID</span>
            <input className={inputClass} value={clientId} onChange={(e) => setClientId(e.target.value)} required autoComplete="off" />
          </label>
          <label className="flex flex-col gap-1.5">
            <span className="text-xs font-medium uppercase tracking-wider text-muted-foreground">Client Secret</span>
            <input
              className={inputClass}
              type="password"
              value={clientSecret}
              onChange={(e) => setClientSecret(e.target.value)}
              placeholder={status?.has_credentials ? "•••••••• (mantido — preencha para trocar)" : ""}
              autoComplete="new-password"
            />
          </label>
          <label className="flex flex-col gap-1.5">
            <span className="text-xs font-medium uppercase tracking-wider text-muted-foreground">Assinatura secreta do webhook (opcional)</span>
            <input
              className={inputClass}
              type="password"
              value={webhookSecret}
              onChange={(e) => setWebhookSecret(e.target.value)}
              placeholder={status?.has_webhook_secret ? "•••••••• (mantida)" : "Valida as notificações recebidas"}
              autoComplete="new-password"
            />
          </label>
          <button
            type="submit"
            disabled={saving}
            className="skeuo-primary skeuo-press flex items-center justify-center gap-2 self-start rounded-xl px-5 py-2.5 text-sm font-semibold disabled:opacity-50"
          >
            {saving && <Loader2 className="h-4 w-4 animate-spin" />}
            Salvar credenciais
          </button>
        </form>

        <section className="skeuo-raised flex flex-col gap-4 rounded-3xl p-5 lg:col-span-2">
          <div className="flex items-center gap-3">
            <Webhook className="h-5 w-5 text-primary" />
            <h3 className="text-sm font-semibold">2. Configure no painel do app</h3>
          </div>
          <p className="text-sm leading-relaxed text-muted-foreground">
            Cole a URL de redirecionamento nas configurações de OAuth e a URL de notificações em Webhooks, com os eventos de{" "}
            <strong className="font-medium text-foreground">Planos e assinaturas</strong>.
          </p>
          <CopyField label="URL de redirecionamento" value={MP_CALLBACK_URL} />
          <CopyField label="URL de notificações" value={MP_WEBHOOK_URL} />
          <p className="text-xs leading-relaxed text-muted-foreground">
            Depois, clique em “Conectar com Mercado Pago” e autorize a conta que vai receber os pagamentos.
          </p>
        </section>
      </div>
    </div>
  );
};

export default AdminMercadoPago;
