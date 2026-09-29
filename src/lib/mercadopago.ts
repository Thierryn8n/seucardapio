import { supabase } from "@/integrations/supabase/client";

const SUPABASE_URL = import.meta.env.NEXT_PUBLIC_SUPABASE_URL || import.meta.env.VITE_SUPABASE_URL;
const ANON_KEY =
  import.meta.env.NEXT_PUBLIC_SUPABASE_ANON_KEY ||
  import.meta.env.NEXT_PUBLIC_SUPABASE_PUBLISHABLE_KEY ||
  import.meta.env.VITE_SUPABASE_PUBLISHABLE_KEY;

export const MP_FUNCTION_URL = `${SUPABASE_URL}/functions/v1/mercadopago`;
export const MP_CALLBACK_URL = `${MP_FUNCTION_URL}/oauth/callback`;
export const MP_WEBHOOK_URL = `${MP_FUNCTION_URL}/webhook`;

export interface MpStatus {
  has_credentials: boolean;
  client_id: string | null;
  has_webhook_secret: boolean;
  connected: boolean;
  mp_user_id: string | null;
  account_email: string | null;
  account_nickname: string | null;
  live_mode: boolean | null;
  expires_at: string | null;
  connected_at: string | null;
  active_subscriptions: number;
}

async function callFunction<T>(path: string, body: Record<string, unknown> = {}): Promise<T> {
  const { data } = await supabase.auth.getSession();
  const token = data.session?.access_token;
  if (!token) throw new Error("Faça login novamente");
  const res = await fetch(`${MP_FUNCTION_URL}${path}`, {
    method: "POST",
    headers: { "Content-Type": "application/json", Authorization: `Bearer ${token}`, apikey: ANON_KEY },
    body: JSON.stringify(body),
  });
  const json = await res.json().catch(() => ({}));
  if (!res.ok) throw new Error(json.error || "Falha na comunicação com o Mercado Pago");
  return json as T;
}

export async function getMpStatus(): Promise<MpStatus> {
  const { data, error } = await supabase.rpc("mp_get_status" as never);
  if (error) throw error;
  return data as unknown as MpStatus;
}

export async function saveMpCredentials(clientId: string, clientSecret: string, webhookSecret: string) {
  const { error } = await supabase.rpc("mp_save_app_credentials" as never, {
    p_client_id: clientId,
    p_client_secret: clientSecret,
    p_webhook_secret: webhookSecret,
  } as never);
  if (error) throw error;
}

export async function disconnectMp() {
  const { error } = await supabase.rpc("mp_disconnect" as never);
  if (error) throw error;
}

export async function startMpOAuth(returnUrl: string) {
  const { url } = await callFunction<{ url: string }>("/oauth/start", { return_url: returnUrl });
  return url;
}

export async function subscribeToPlan(planName: string, returnUrl: string, payerEmail?: string) {
  const { data: plan, error } = await supabase.from("plans").select("id").eq("name", planName).maybeSingle();
  if (error || !plan) throw new Error("Plano não encontrado");
  const { init_point } = await callFunction<{ init_point: string }>("/subscribe", {
    plan_id: plan.id,
    return_url: returnUrl,
    payer_email: payerEmail,
  });
  return init_point;
}

export function syncSubscription() {
  return callFunction<{ subscription: Record<string, unknown> | null }>("/sync");
}

export function cancelSubscription() {
  return callFunction<{ subscription: Record<string, unknown> | null }>("/cancel");
}
