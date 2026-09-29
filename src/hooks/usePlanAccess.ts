import { useQuery } from "@tanstack/react-query";
import { useAuth } from "@/contexts/AuthContext";
import { db } from "@/lib/db";

export type PlatformSettings = {
  admin_whatsapp: string | null;
  renewal_message: string;
  warn_days: number;
};

const DAY_MS = 24 * 60 * 60 * 1000;

export function usePlatformSettings() {
  return useQuery({
    queryKey: ["platform-settings"],
    queryFn: async () => {
      const { data, error } = await db
        .from("platform_settings")
        .select("admin_whatsapp, renewal_message, warn_days")
        .maybeSingle();
      if (error) throw error;
      return (data ?? { admin_whatsapp: null, renewal_message: "", warn_days: 7 }) as PlatformSettings;
    },
    staleTime: 5 * 60 * 1000,
  });
}

export function buildWhatsAppLink(phone: string | null | undefined, message: string) {
  const digits = (phone ?? "").replace(/\D/g, "");
  if (!digits) return null;
  return `https://wa.me/${digits}?text=${encodeURIComponent(message)}`;
}

export function usePlanAccess() {
  const { user, isAdmin } = useAuth();
  const settings = usePlatformSettings();
  const subscription = useQuery({
    queryKey: ["plan-access", user?.id],
    enabled: !!user,
    refetchInterval: 5 * 60 * 1000,
    queryFn: async () => {
      const { data, error } = await db
        .from("subscriptions")
        .select("plan, plan_name, expires_at, panels_enabled")
        .eq("user_id", user!.id)
        .maybeSingle();
      if (error) throw error;
      return data as { plan: string; plan_name: string | null; expires_at: string | null; panels_enabled: boolean } | null;
    },
  });

  const sub = subscription.data;
  const expiresAt = sub?.expires_at ? new Date(sub.expires_at) : null;
  const daysLeft = expiresAt ? Math.ceil((expiresAt.getTime() - Date.now()) / DAY_MS) : null;
  const warnDays = settings.data?.warn_days ?? 7;

  const suspended = sub?.panels_enabled === false;
  const expired = daysLeft !== null && daysLeft <= 0;
  const blocked = !isAdmin && (suspended || expired);
  const expiringSoon = !isAdmin && !blocked && daysLeft !== null && daysLeft <= warnDays;

  const planLabel = sub?.plan_name || sub?.plan || "free";
  const message = [
    settings.data?.renewal_message || "Olá! Quero renovar o plano da minha marmitaria.",
    user?.email ? `Conta: ${user.email}` : null,
    `Plano: ${planLabel}`,
  ]
    .filter(Boolean)
    .join("\n");

  return {
    isLoading: subscription.isLoading || settings.isLoading,
    blocked,
    suspended,
    expired,
    expiringSoon,
    daysLeft,
    expiresAt,
    planLabel,
    whatsappLink: buildWhatsAppLink(settings.data?.admin_whatsapp, message),
  };
}
