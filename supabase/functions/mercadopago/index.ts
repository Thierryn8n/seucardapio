import { createClient } from "npm:@supabase/supabase-js@2";

const MP_API = "https://api.mercadopago.com";
const MP_AUTH = "https://auth.mercadopago.com/authorization";
const SUPABASE_URL = Deno.env.get("SUPABASE_URL")!;
const SERVICE_KEY = Deno.env.get("SUPABASE_SERVICE_ROLE_KEY")!;
const CALLBACK_URL = `${SUPABASE_URL}/functions/v1/mercadopago/oauth/callback`;
const STATE_TTL_MS = 15 * 60 * 1000;
const REFRESH_WINDOW_MS = 7 * 24 * 60 * 60 * 1000;

const db = createClient(SUPABASE_URL, SERVICE_KEY, { auth: { persistSession: false } });

const cors = {
  "Access-Control-Allow-Origin": "*",
  "Access-Control-Allow-Headers": "authorization, x-client-info, apikey, content-type",
  "Access-Control-Allow-Methods": "GET, POST, OPTIONS",
};

const json = (body: unknown, status = 200) =>
  new Response(JSON.stringify(body), { status, headers: { ...cors, "Content-Type": "application/json" } });

class HttpError extends Error {
  constructor(public status: number, message: string) {
    super(message);
  }
}

async function requireUser(req: Request) {
  const token = req.headers.get("Authorization")?.replace(/^Bearer\s+/i, "");
  if (!token) throw new HttpError(401, "Não autenticado");
  const { data, error } = await db.auth.getUser(token);
  if (error || !data.user) throw new HttpError(401, "Sessão inválida");
  return data.user;
}

async function requireAdmin(req: Request) {
  const user = await requireUser(req);
  const { data } = await db.from("user_roles").select("role").eq("user_id", user.id).eq("role", "admin").maybeSingle();
  if (!data) throw new HttpError(403, "Apenas administradores");
  return user;
}

function safeReturnUrl(value: unknown): string {
  try {
    const url = new URL(String(value));
    if (url.protocol === "https:" || url.hostname === "localhost") return url.toString();
  } catch {
    // fall through
  }
  throw new HttpError(400, "return_url inválida");
}

async function getAppConfig() {
  const { data } = await db.from("mp_app_config").select("*").maybeSingle();
  if (!data) throw new HttpError(400, "Credenciais do aplicativo Mercado Pago não configuradas");
  return data as { client_id: string; client_secret: string; webhook_secret: string | null };
}

async function mpFetch(path: string, token: string, init: RequestInit = {}) {
  const res = await fetch(`${MP_API}${path}`, {
    ...init,
    headers: { Authorization: `Bearer ${token}`, "Content-Type": "application/json", ...(init.headers ?? {}) },
  });
  const body = await res.json().catch(() => ({}));
  if (!res.ok) {
    console.error("[mercadopago] API error", path, res.status, body);
    throw new HttpError(502, body?.message || `Mercado Pago respondeu ${res.status}`);
  }
  return body;
}

async function exchangeToken(params: Record<string, string>) {
  const cfg = await getAppConfig();
  const res = await fetch(`${MP_API}/oauth/token`, {
    method: "POST",
    headers: { "Content-Type": "application/json", Accept: "application/json" },
    body: JSON.stringify({ client_id: cfg.client_id, client_secret: cfg.client_secret, ...params }),
  });
  const body = await res.json().catch(() => ({}));
  if (!res.ok || !body.access_token) {
    console.error("[mercadopago] token error", res.status, body);
    throw new HttpError(502, body?.message || "Falha ao obter token do Mercado Pago");
  }
  return body as {
    access_token: string;
    refresh_token?: string;
    public_key?: string;
    user_id: number;
    live_mode?: boolean;
    expires_in?: number;
  };
}

async function getAccessToken(): Promise<string> {
  const { data: conn } = await db.from("mp_connection").select("*").maybeSingle();
  if (!conn) throw new HttpError(400, "Pagamentos indisponíveis: conta Mercado Pago não conectada");
  const expiresAt = conn.expires_at ? new Date(conn.expires_at).getTime() : Infinity;
  if (conn.refresh_token && expiresAt - Date.now() < REFRESH_WINDOW_MS) {
    const t = await exchangeToken({ grant_type: "refresh_token", refresh_token: conn.refresh_token });
    await db.from("mp_connection").update({
      access_token: t.access_token,
      refresh_token: t.refresh_token ?? conn.refresh_token,
      public_key: t.public_key ?? conn.public_key,
      expires_at: t.expires_in ? new Date(Date.now() + t.expires_in * 1000).toISOString() : null,
    }).eq("id", true);
    return t.access_token;
  }
  return conn.access_token;
}

async function oauthStart(req: Request) {
  const user = await requireAdmin(req);
  const cfg = await getAppConfig();
  const { return_url } = await req.json().catch(() => ({}));
  const returnUrl = safeReturnUrl(return_url);
  const state = crypto.randomUUID();
  await db.from("mp_oauth_states").delete().lt("created_at", new Date(Date.now() - STATE_TTL_MS).toISOString());
  const { error } = await db.from("mp_oauth_states").insert({ state, user_id: user.id, return_url: returnUrl });
  if (error) throw new HttpError(500, error.message);
  const url = new URL(MP_AUTH);
  url.searchParams.set("client_id", cfg.client_id);
  url.searchParams.set("response_type", "code");
  url.searchParams.set("platform_id", "mp");
  url.searchParams.set("state", state);
  url.searchParams.set("redirect_uri", CALLBACK_URL);
  return json({ url: url.toString(), redirect_uri: CALLBACK_URL });
}

async function oauthCallback(req: Request) {
  const params = new URL(req.url).searchParams;
  const state = params.get("state") ?? "";
  const code = params.get("code");
  const { data: row } = await db.from("mp_oauth_states").select("*").eq("state", state).maybeSingle();
  if (!row) return new Response("Estado OAuth inválido ou expirado. Volte ao painel e tente novamente.", { status: 400 });
  await db.from("mp_oauth_states").delete().eq("state", state);

  const back = new URL(row.return_url);
  const redirect = (status: string, reason?: string) => {
    back.searchParams.set("mp", status);
    if (reason) back.searchParams.set("reason", reason.slice(0, 120));
    return Response.redirect(back.toString(), 302);
  };

  if (Date.now() - new Date(row.created_at).getTime() > STATE_TTL_MS) return redirect("error", "Tempo esgotado");
  if (!code) return redirect("error", params.get("error_description") ?? params.get("error") ?? "Autorização negada");

  try {
    const t = await exchangeToken({ grant_type: "authorization_code", code, redirect_uri: CALLBACK_URL });
    const me = await mpFetch("/users/me", t.access_token).catch(() => ({}));
    const { error } = await db.from("mp_connection").upsert({
      id: true,
      mp_user_id: String(t.user_id),
      access_token: t.access_token,
      refresh_token: t.refresh_token ?? null,
      public_key: t.public_key ?? null,
      live_mode: t.live_mode ?? null,
      expires_at: t.expires_in ? new Date(Date.now() + t.expires_in * 1000).toISOString() : null,
      account_email: me?.email ?? null,
      account_nickname: me?.nickname ?? null,
      connected_by: row.user_id,
      connected_at: new Date().toISOString(),
    });
    if (error) throw new Error(error.message);
    return redirect("connected");
  } catch (e) {
    return redirect("error", e instanceof Error ? e.message : "Falha na conexão");
  }
}

const STATUS_MAP: Record<string, string> = {
  authorized: "active",
  pending: "pending",
  paused: "paused",
  cancelled: "cancelled",
};

async function applyPreapproval(pre: any) {
  const [userId, planId] = String(pre.external_reference ?? "").split(":");
  if (!userId || !planId) return;
  const { data: plan } = await db.from("plans").select("id,name,display_name").eq("id", planId).maybeSingle();
  if (!plan) return;
  const status = STATUS_MAP[pre.status] ?? pre.status;
  const active = status === "active";
  const now = new Date().toISOString();
  const patch: Record<string, unknown> = {
    status,
    plan_id: plan.id,
    plan_name: plan.display_name,
    plan: active ? plan.name : "free",
    mercado_pago_subscription_id: pre.id,
    next_payment_date: pre.next_payment_date ?? null,
    updated_at: now,
  };
  if (active) patch.started_at = pre.date_created ?? now;
  if (status === "cancelled") patch.cancelled_at = now;

  const { data: existing } = await db.from("subscriptions").select("id").eq("user_id", userId).order("created_at", { ascending: false }).limit(1).maybeSingle();
  if (existing) await db.from("subscriptions").update(patch).eq("id", existing.id);
  else await db.from("subscriptions").insert({ user_id: userId, ...patch });
}

async function subscribe(req: Request) {
  const user = await requireUser(req);
  const { plan_id, payer_email, return_url } = await req.json().catch(() => ({}));
  const backUrl = safeReturnUrl(return_url);
  const { data: plan } = await db.from("plans").select("*").eq("id", plan_id).eq("active", true).maybeSingle();
  if (!plan) throw new HttpError(404, "Plano não encontrado");
  const amount = Number(plan.price);
  if (!(amount > 0)) throw new HttpError(400, "Este plano é gratuito");
  const email = String(payer_email || user.email || "").trim();
  if (!/^[^\s@]+@[^\s@]+\.[^\s@]+$/.test(email)) throw new HttpError(400, "E-mail do pagador inválido");

  const token = await getAccessToken();
  const pre = await mpFetch("/preapproval", token, {
    method: "POST",
    headers: { "X-Idempotency-Key": `${user.id}:${plan.id}:${new Date().toISOString().slice(0, 13)}` },
    body: JSON.stringify({
      reason: `Assinatura ${plan.display_name}`,
      external_reference: `${user.id}:${plan.id}`,
      payer_email: email,
      back_url: backUrl,
      status: "pending",
      auto_recurring: {
        frequency: plan.interval === "yearly" ? 12 : 1,
        frequency_type: "months",
        transaction_amount: amount,
        currency_id: "BRL",
      },
    }),
  });

  await applyPreapproval(pre);
  await db.from("subscriptions").update({ payer_email: email }).eq("mercado_pago_subscription_id", pre.id);
  return json({ init_point: pre.init_point, id: pre.id });
}

async function mySubscription(userId: string) {
  const { data } = await db.from("subscriptions").select("*").eq("user_id", userId).order("created_at", { ascending: false }).limit(1).maybeSingle();
  return data;
}

async function sync(req: Request) {
  const user = await requireUser(req);
  const sub = await mySubscription(user.id);
  if (sub?.mercado_pago_subscription_id) {
    const token = await getAccessToken();
    const pre = await mpFetch(`/preapproval/${sub.mercado_pago_subscription_id}`, token);
    await applyPreapproval(pre);
  }
  return json({ subscription: await mySubscription(user.id) });
}

async function cancel(req: Request) {
  const user = await requireUser(req);
  const sub = await mySubscription(user.id);
  if (!sub?.mercado_pago_subscription_id) throw new HttpError(404, "Nenhuma assinatura ativa");
  const token = await getAccessToken();
  const pre = await mpFetch(`/preapproval/${sub.mercado_pago_subscription_id}`, token, {
    method: "PUT",
    body: JSON.stringify({ status: "cancelled" }),
  });
  await applyPreapproval(pre);
  return json({ subscription: await mySubscription(user.id) });
}

async function hmacHex(secret: string, message: string) {
  const key = await crypto.subtle.importKey("raw", new TextEncoder().encode(secret), { name: "HMAC", hash: "SHA-256" }, false, ["sign"]);
  const sig = await crypto.subtle.sign("HMAC", key, new TextEncoder().encode(message));
  return Array.from(new Uint8Array(sig)).map((b) => b.toString(16).padStart(2, "0")).join("");
}

async function webhook(req: Request) {
  const url = new URL(req.url);
  const body = await req.json().catch(() => ({}));
  const type = body.type ?? body.topic ?? url.searchParams.get("type") ?? url.searchParams.get("topic");
  const dataId = String(body?.data?.id ?? url.searchParams.get("data.id") ?? url.searchParams.get("id") ?? "");

  const { data: cfg } = await db.from("mp_app_config").select("webhook_secret").maybeSingle();
  if (cfg?.webhook_secret) {
    const parts = Object.fromEntries((req.headers.get("x-signature") ?? "").split(",").map((p) => p.trim().split("=")));
    const manifest = `id:${dataId.toLowerCase()};request-id:${req.headers.get("x-request-id") ?? ""};ts:${parts.ts ?? ""};`;
    if (!parts.v1 || (await hmacHex(cfg.webhook_secret, manifest)) !== parts.v1) {
      return json({ error: "assinatura inválida" }, 401);
    }
  }

  await db.from("webhook_logs").insert({ source: "mercadopago", event_type: type, resource_id: dataId, payload: body });

  try {
    if (dataId && (type === "subscription_preapproval" || type === "preapproval")) {
      const token = await getAccessToken();
      await applyPreapproval(await mpFetch(`/preapproval/${dataId}`, token));
    } else if (dataId && type === "subscription_authorized_payment") {
      const token = await getAccessToken();
      const payment = await mpFetch(`/authorized_payments/${dataId}`, token);
      if (payment?.preapproval_id) await applyPreapproval(await mpFetch(`/preapproval/${payment.preapproval_id}`, token));
    }
    await db.from("webhook_logs").update({ processed_at: new Date().toISOString() }).eq("resource_id", dataId).is("processed_at", null);
  } catch (e) {
    console.error("[mercadopago] webhook processing failed", e);
  }
  return json({ received: true });
}

Deno.serve(async (req) => {
  if (req.method === "OPTIONS") return new Response("ok", { headers: cors });
  const path = new URL(req.url).pathname.replace(/\/+$/, "");
  try {
    if (path.endsWith("/oauth/start") && req.method === "POST") return await oauthStart(req);
    if (path.endsWith("/oauth/callback") && req.method === "GET") return await oauthCallback(req);
    if (path.endsWith("/subscribe") && req.method === "POST") return await subscribe(req);
    if (path.endsWith("/sync") && req.method === "POST") return await sync(req);
    if (path.endsWith("/cancel") && req.method === "POST") return await cancel(req);
    if (path.endsWith("/webhook")) return await webhook(req);
    return json({ error: "Rota não encontrada" }, 404);
  } catch (e) {
    if (e instanceof HttpError) return json({ error: e.message }, e.status);
    console.error("[mercadopago] unexpected", e);
    return json({ error: "Erro interno" }, 500);
  }
});
