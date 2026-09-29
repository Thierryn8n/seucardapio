import { useMemo, useRef, useState } from "react";
import { useQueryClient } from "@tanstack/react-query";
import { ArrowLeft, ArrowRight, Check, ImagePlus, Loader2, UtensilsCrossed } from "lucide-react";
import { Button } from "@/components/ui/button";
import { Input } from "@/components/ui/input";
import { Label } from "@/components/ui/label";
import { useToast } from "@/hooks/use-toast";
import { db } from "@/lib/db";
import { formatCnpj, formatPhone, slugify, uploadImage } from "@/lib/upload";
import { cn } from "@/lib/utils";

interface Props {
  userId: string;
  isAdmin: boolean;
}

function ImagePicker({
  id, label, hint, preview, onPick, round,
}: { id: string; label: string; hint: string; preview: string | null; onPick: (f: File) => void; round?: boolean }) {
  const ref = useRef<HTMLInputElement>(null);
  return (
    <div className="flex items-center gap-4">
      <button
        type="button"
        onClick={() => ref.current?.click()}
        className={cn(
          "skeuo-inset skeuo-press flex h-20 w-20 shrink-0 items-center justify-center overflow-hidden",
          round ? "rounded-full" : "rounded-2xl",
        )}
        aria-label={`Escolher ${label.toLowerCase()}`}
      >
        {preview ? (
          <img src={preview} alt="" className="h-full w-full object-cover" />
        ) : (
          <ImagePlus className="h-6 w-6 text-muted-foreground" aria-hidden />
        )}
      </button>
      <div className="flex min-w-0 flex-col gap-1">
        <Label htmlFor={id}>{label}</Label>
        <p className="text-xs leading-relaxed text-muted-foreground">{hint}</p>
        <input
          ref={ref}
          id={id}
          type="file"
          accept="image/*"
          className="sr-only"
          onChange={(e) => { const f = e.target.files?.[0]; if (f) onPick(f); }}
        />
      </div>
    </div>
  );
}

export function Onboarding({ userId, isAdmin }: Props) {
  const qc = useQueryClient();
  const { toast } = useToast();
  const [step, setStep] = useState(0);
  const [saving, setSaving] = useState(false);
  const [name, setName] = useState("");
  const [cnpj, setCnpj] = useState("");
  const [whatsapp, setWhatsapp] = useState("");
  const [address, setAddress] = useState("");
  const [logo, setLogo] = useState<File | null>(null);
  const [favicon, setFavicon] = useState<File | null>(null);
  const logoPreview = useMemo(() => (logo ? URL.createObjectURL(logo) : null), [logo]);
  const faviconPreview = useMemo(() => (favicon ? URL.createObjectURL(favicon) : null), [favicon]);

  const steps = isAdmin ? ["Identidade da plataforma", "Contato"] : ["Sua marmitaria", "Contato e endereço"];
  const canNext = name.trim().length >= 2;
  const canFinish = whatsapp.replace(/\D/g, "").length >= 10;

  const finish = async (e: React.FormEvent) => {
    e.preventDefault();
    if (step === 0) { if (canNext) setStep(1); return; }
    if (!canFinish) return;
    setSaving(true);
    try {
      const [logoUrl, faviconUrl] = await Promise.all([
        logo ? uploadImage(userId, logo, "logo") : Promise.resolve(null),
        favicon ? uploadImage(userId, favicon, "favicon") : Promise.resolve(null),
      ]);
      const phone = whatsapp.replace(/\D/g, "");
      const cleanName = name.trim();

      if (isAdmin) {
        const global = {
          company_name: cleanName,
          whatsapp_number: phone,
          ...(logoUrl && { logo_url: logoUrl }),
          ...(faviconUrl && { favicon_url: faviconUrl }),
        };
        const { error } = await db.from("settings").update(global).is("user_id", null);
        if (error) throw error;
      } else {
        const { error } = await db.from("settings").upsert(
          { user_id: userId, company_name: cleanName, whatsapp_number: phone, ...(logoUrl && { logo_url: logoUrl }) },
          { onConflict: "user_id" },
        );
        if (error) throw error;
      }

      const base = slugify(cleanName) || userId.slice(0, 8);
      const profile = {
        name: cleanName,
        phone,
        address: address.trim() || null,
        cnpj: cnpj.replace(/\D/g, "") || null,
        onboarding_completed: true,
        ...(logoUrl && { logo_url: logoUrl }),
      };
      let { error } = await db.from("profiles").update({ ...profile, slug: base }).eq("id", userId);
      if (error?.code === "23505") {
        ({ error } = await db.from("profiles").update({ ...profile, slug: `${base}-${userId.slice(0, 4)}` }).eq("id", userId));
      }
      if (error) throw error;

      toast({ title: "Tudo pronto!", description: isAdmin ? "Plataforma configurada." : "Sua marmitaria está no ar." });
      qc.invalidateQueries();
    } catch (err) {
      toast({ title: "Não foi possível salvar", description: (err as Error).message, variant: "destructive" });
    } finally {
      setSaving(false);
    }
  };

  return (
    <div className="admin-shell flex min-h-dvh items-center justify-center bg-background px-4 py-8 font-poppins text-foreground">
      <form onSubmit={finish} className="glass flex w-full max-w-md flex-col gap-6 rounded-3xl p-6 sm:p-8">
        <header className="flex flex-col gap-4">
          <span className="skeuo-primary flex h-12 w-12 items-center justify-center rounded-2xl">
            <UtensilsCrossed className="h-6 w-6" aria-hidden />
          </span>
          <div className="flex flex-col gap-1">
            <p className="text-xs font-semibold uppercase tracking-widest text-primary">
              Passo {step + 1} de {steps.length}
            </p>
            <h1 className="font-playfair text-2xl font-bold text-balance">{steps[step]}</h1>
            <p className="text-sm leading-relaxed text-muted-foreground text-pretty">
              {isAdmin
                ? "Essas informações identificam o app para todas as marmitarias e clientes."
                : "Preencha o básico para começar a publicar seu cardápio do dia."}
            </p>
          </div>
          <div className="flex gap-2" aria-hidden>
            {steps.map((s, i) => (
              <span key={s} className={cn("h-1.5 flex-1 rounded-full", i <= step ? "bg-primary" : "bg-foreground/10")} />
            ))}
          </div>
        </header>

        {step === 0 ? (
          <div className="flex flex-col gap-5">
            <ImagePicker
              id="ob-logo"
              label={isAdmin ? "Logo do app" : "Logo da marmitaria"}
              hint="PNG ou JPG quadrado, até 2 MB. Opcional."
              preview={logoPreview}
              onPick={setLogo}
              round={!isAdmin}
            />
            {isAdmin && (
              <ImagePicker
                id="ob-favicon"
                label="Favicon"
                hint="Ícone da aba do navegador. Ideal 64x64 px. Opcional."
                preview={faviconPreview}
                onPick={setFavicon}
              />
            )}
            <div className="flex flex-col gap-2">
              <Label htmlFor="ob-name">{isAdmin ? "Nome do app" : "Nome da marmitaria"}</Label>
              <Input id="ob-name" required autoFocus maxLength={80} value={name} onChange={(e) => setName(e.target.value)} placeholder={isAdmin ? "Seu Cardápio" : "Marmitaria da Dona Maria"} />
            </div>
            {!isAdmin && (
              <div className="flex flex-col gap-2">
                <Label htmlFor="ob-cnpj">
                  CNPJ <span className="font-normal text-muted-foreground">(opcional)</span>
                </Label>
                <Input id="ob-cnpj" inputMode="numeric" value={cnpj} onChange={(e) => setCnpj(formatCnpj(e.target.value))} placeholder="00.000.000/0000-00" />
              </div>
            )}
          </div>
        ) : (
          <div className="flex flex-col gap-5">
            <div className="flex flex-col gap-2">
              <Label htmlFor="ob-wa">{isAdmin ? "WhatsApp de suporte" : "WhatsApp que recebe os pedidos"}</Label>
              <Input id="ob-wa" required autoFocus type="tel" inputMode="tel" value={whatsapp} onChange={(e) => setWhatsapp(formatPhone(e.target.value))} placeholder="(85) 99999-9999" />
            </div>
            <div className="flex flex-col gap-2">
              <Label htmlFor="ob-addr">
                Endereço <span className="font-normal text-muted-foreground">(opcional)</span>
              </Label>
              <Input id="ob-addr" maxLength={200} value={address} onChange={(e) => setAddress(e.target.value)} placeholder="Rua, número, bairro, cidade" />
            </div>
          </div>
        )}

        <div className="flex gap-3">
          {step > 0 && (
            <Button type="button" variant="ghost" onClick={() => setStep(0)} className="skeuo-raised skeuo-press gap-2">
              <ArrowLeft className="h-4 w-4" aria-hidden />
              Voltar
            </Button>
          )}
          <Button
            type="submit"
            disabled={saving || (step === 0 ? !canNext : !canFinish)}
            className="skeuo-primary skeuo-press flex-1 gap-2 border-0"
          >
            {saving ? <Loader2 className="h-4 w-4 animate-spin" aria-hidden /> : step === 0 ? <ArrowRight className="h-4 w-4" aria-hidden /> : <Check className="h-4 w-4" aria-hidden />}
            {step === 0 ? "Continuar" : "Concluir"}
          </Button>
        </div>
      </form>
    </div>
  );
}
