import { AlertTriangle, Lock, LogOut, MessageCircle } from "lucide-react";
import { Button } from "@/components/ui/button";
import { useAuth } from "@/contexts/AuthContext";
import type { usePlanAccess } from "@/hooks/usePlanAccess";

type Access = ReturnType<typeof usePlanAccess>;

function WhatsAppButton({ href, children }: { href: string | null; children: React.ReactNode }) {
  if (!href) {
    return (
      <p className="text-sm text-muted-foreground">
        O administrador ainda não cadastrou o WhatsApp de contato. Tente novamente mais tarde.
      </p>
    );
  }
  return (
    <Button asChild size="lg" className="skeuo-primary skeuo-press gap-2">
      <a href={href} target="_blank" rel="noopener noreferrer">
        <MessageCircle className="h-5 w-5" aria-hidden />
        {children}
      </a>
    </Button>
  );
}

export function PlanRenewalScreen({ access }: { access: Access }) {
  const { signOut, user } = useAuth();
  const title = access.suspended ? "Seu painel está pausado" : "Seu plano expirou";
  const description = access.suspended
    ? "O acesso ao painel da sua marmitaria foi pausado pelo administrador. Fale com a gente pelo WhatsApp para reativar."
    : `O plano ${access.planLabel} venceu${
        access.expiresAt ? ` em ${access.expiresAt.toLocaleDateString("pt-BR")}` : ""
      }. Renove pelo WhatsApp para voltar a editar seus cardápios.`;

  return (
    <main className="flex min-h-dvh items-center justify-center bg-background px-4 py-10 font-poppins text-foreground">
      <section className="glass flex w-full max-w-md flex-col items-center gap-6 rounded-3xl p-8 text-center">
        <span className="skeuo-raised flex h-16 w-16 items-center justify-center rounded-2xl text-primary">
          <Lock className="h-7 w-7" aria-hidden />
        </span>
        <div className="flex flex-col gap-2">
          <h1 className="text-balance font-playfair text-2xl font-bold">{title}</h1>
          <p className="text-pretty leading-relaxed text-muted-foreground">{description}</p>
        </div>
        <p className="text-sm text-muted-foreground">
          Seu cardápio público continua salvo. Nada foi apagado.
        </p>
        <WhatsAppButton href={access.whatsappLink}>Renovar pelo WhatsApp</WhatsAppButton>
        <div className="flex flex-col items-center gap-1 text-xs text-muted-foreground">
          <span>{user?.email}</span>
          <Button variant="ghost" size="sm" onClick={signOut} className="gap-2">
            <LogOut className="h-4 w-4" aria-hidden />
            Sair
          </Button>
        </div>
      </section>
    </main>
  );
}

export function PlanExpiryBanner({ access }: { access: Access }) {
  const days = access.daysLeft ?? 0;
  const when = days <= 1 ? "vence amanhã" : `vence em ${days} dias`;
  return (
    <div
      role="status"
      className="skeuo-raised mx-3 mt-3 flex flex-col gap-3 rounded-2xl px-4 py-3 sm:flex-row sm:items-center sm:justify-between lg:mx-6"
    >
      <div className="flex items-start gap-3">
        <AlertTriangle className="mt-0.5 h-5 w-5 shrink-0 text-primary" aria-hidden />
        <p className="text-sm leading-relaxed">
          <strong className="font-semibold">Seu plano {access.planLabel} {when}.</strong>{" "}
          <span className="text-muted-foreground">Renove para não perder o acesso ao painel.</span>
        </p>
      </div>
      {access.whatsappLink && (
        <Button asChild size="sm" className="skeuo-primary skeuo-press shrink-0 gap-2">
          <a href={access.whatsappLink} target="_blank" rel="noopener noreferrer">
            <MessageCircle className="h-4 w-4" aria-hidden />
            Renovar
          </a>
        </Button>
      )}
    </div>
  );
}
