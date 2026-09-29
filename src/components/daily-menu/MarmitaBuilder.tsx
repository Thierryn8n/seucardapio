import { useMemo, useState } from "react";
import { Check, Plus } from "lucide-react";
import { Button } from "@/components/ui/button";
import { Textarea } from "@/components/ui/textarea";
import { cn } from "@/lib/utils";
import { formatBRL, type MarmitaSize, type MenuItem, type MenuSection } from "@/lib/daily-menu";

export interface CartMarmita {
  key: string;
  size: MarmitaSize;
  proteins: MenuItem[];
  sides: MenuItem[];
  notes: string;
}

interface Props {
  sizes: MarmitaSize[];
  proteinSections: MenuSection[];
  sideSections: MenuSection[];
  onAdd: (m: CartMarmita) => void;
}

function Step({ n, title, hint, children }: { n: number; title: string; hint?: string; children: React.ReactNode }) {
  return (
    <section className="flex flex-col gap-3">
      <div className="flex items-baseline gap-3">
        <span className="flex h-7 w-7 shrink-0 items-center justify-center rounded-full bg-foreground text-sm font-semibold text-background">{n}</span>
        <div className="flex flex-col">
          <h3 className="font-playfair text-lg font-bold leading-tight text-foreground">{title}</h3>
          {hint && <p className="text-sm text-muted-foreground">{hint}</p>}
        </div>
      </div>
      {children}
    </section>
  );
}

function Chip({ selected, disabled, onClick, children }: { selected: boolean; disabled?: boolean; onClick: () => void; children: React.ReactNode }) {
  return (
    <button
      type="button"
      onClick={onClick}
      disabled={disabled}
      aria-pressed={selected}
      className={cn(
        "flex min-h-11 items-center gap-2 rounded-full border px-4 py-2 text-left text-sm font-medium transition-colors",
        selected ? "border-primary bg-primary text-primary-foreground" : "border-border bg-card text-foreground hover:border-primary/60",
        disabled && !selected && "cursor-not-allowed opacity-40",
      )}
    >
      {selected && <Check className="h-4 w-4 shrink-0" aria-hidden />}
      <span className="text-pretty">{children}</span>
    </button>
  );
}

export function MarmitaBuilder({ sizes, proteinSections, sideSections, onAdd }: Props) {
  const [sizeId, setSizeId] = useState<string | null>(sizes[0]?.id ?? null);
  const [proteins, setProteins] = useState<string[]>([]);
  const [sides, setSides] = useState<string[]>([]);
  const [notes, setNotes] = useState("");

  const size = sizes.find((s) => s.id === sizeId) ?? null;
  const max = size?.max_proteins ?? 0;
  const proteinItems = useMemo(() => proteinSections.flatMap((s) => s.items.filter((i) => i.available)), [proteinSections]);
  const sideItems = useMemo(() => sideSections.flatMap((s) => s.items.filter((i) => i.available)), [sideSections]);

  const chooseSize = (id: string) => {
    setSizeId(id);
    const next = sizes.find((s) => s.id === id);
    if (next) setProteins((p) => p.slice(0, next.max_proteins));
  };

  const toggle = (list: string[], set: (v: string[]) => void, id: string, limit?: number) => {
    if (list.includes(id)) return set(list.filter((x) => x !== id));
    if (limit && list.length >= limit) {
      if (limit === 1) return set([id]);
      return;
    }
    set([...list, id]);
  };

  const canAdd = !!size && proteins.length >= 1;

  const add = () => {
    if (!size) return;
    onAdd({
      key: crypto.randomUUID(),
      size,
      proteins: proteinItems.filter((i) => proteins.includes(i.id)),
      sides: sideItems.filter((i) => sides.includes(i.id)),
      notes: notes.trim(),
    });
    setProteins([]);
    setSides([]);
    setNotes("");
  };

  if (!sizes.length) {
    return <p className="rounded-lg border border-dashed border-border p-4 text-sm text-muted-foreground">A marmitaria ainda não cadastrou os tamanhos de marmita.</p>;
  }

  return (
    <div className="flex flex-col gap-8">
      <Step n={1} title="Escolha o tamanho">
        <div role="radiogroup" aria-label="Tamanho da marmita" className="grid grid-cols-1 gap-2 sm:grid-cols-3">
          {sizes.map((s) => {
            const selected = s.id === sizeId;
            return (
              <button
                key={s.id}
                type="button"
                role="radio"
                aria-checked={selected}
                onClick={() => chooseSize(s.id)}
                className={cn(
                  "flex items-center justify-between gap-3 rounded-xl border-2 p-4 text-left transition-colors sm:flex-col sm:items-start",
                  selected ? "border-primary bg-primary/10" : "border-border bg-card hover:border-primary/50",
                )}
              >
                <div className="flex flex-col">
                  <span className="font-playfair text-2xl font-bold text-foreground">{s.name}</span>
                  <span className="text-sm text-muted-foreground">{s.description || `${s.max_proteins} proteínas`}</span>
                </div>
                <span className="text-lg font-semibold text-primary">{formatBRL(s.price)}</span>
              </button>
            );
          })}
        </div>
      </Step>

      <Step n={2} title="Proteínas" hint={size ? `Escolha até ${max} (${proteins.length}/${max})` : undefined}>
        {proteinItems.length ? (
          <div className="flex flex-wrap gap-2">
            {proteinItems.map((i) => (
              <Chip
                key={i.id}
                selected={proteins.includes(i.id)}
                disabled={max > 1 && proteins.length >= max}
                onClick={() => toggle(proteins, setProteins, i.id, max)}
              >
                {i.name}
              </Chip>
            ))}
          </div>
        ) : (
          <p className="text-sm text-muted-foreground">Nenhuma proteína disponível hoje.</p>
        )}
      </Step>

      {sideItems.length > 0 && (
        <Step n={3} title="Guarnições" hint="Incluídas no preço. Marque o que quiser.">
          <div className="flex flex-wrap gap-2">
            {sideItems.map((i) => (
              <Chip key={i.id} selected={sides.includes(i.id)} onClick={() => toggle(sides, setSides, i.id)}>
                {i.name}
              </Chip>
            ))}
          </div>
          <button
            type="button"
            className="self-start text-sm font-medium text-primary underline-offset-4 hover:underline"
            onClick={() => setSides(sides.length === sideItems.length ? [] : sideItems.map((i) => i.id))}
          >
            {sides.length === sideItems.length ? "Desmarcar todas" : "Marcar todas"}
          </button>
        </Step>
      )}

      <div className="flex flex-col gap-3">
        <label htmlFor="marmita-notes" className="text-sm font-medium text-foreground">Observação (opcional)</label>
        <Textarea id="marmita-notes" value={notes} onChange={(e) => setNotes(e.target.value)} maxLength={300} placeholder="Ex.: pouco feijão, sem cebola..." rows={2} />
        <Button size="lg" onClick={add} disabled={!canAdd} className="h-12 gap-2 text-base">
          <Plus className="h-5 w-5" aria-hidden />
          {canAdd ? `Adicionar marmita ${size?.name} · ${formatBRL(size?.price)}` : "Escolha ao menos 1 proteína"}
        </Button>
      </div>
    </div>
  );
}
