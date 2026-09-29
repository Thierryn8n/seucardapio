import { Minus, Plus } from "lucide-react";
import { Button } from "@/components/ui/button";
import { formatBRL, type MenuSection } from "@/lib/daily-menu";

interface Props {
  section: MenuSection;
  quantities: Record<string, number>;
  onChange: (itemId: string, qty: number) => void;
}

export function ExtrasSection({ section, quantities, onChange }: Props) {
  const items = section.items.filter((i) => i.available);
  if (!items.length) return null;
  return (
    <section className="flex flex-col gap-3" aria-labelledby={`sec-${section.id}`}>
      <h3 id={`sec-${section.id}`} className="font-playfair text-lg font-bold text-foreground">{section.name}</h3>
      <ul className="flex flex-col divide-y divide-border rounded-xl border border-border bg-card">
        {items.map((i) => {
          const qty = quantities[i.id] ?? 0;
          return (
            <li key={i.id} className="flex items-center justify-between gap-3 p-3">
              <div className="flex min-w-0 flex-col">
                <span className="font-medium text-foreground">{i.name}</span>
                <span className="text-sm text-primary">{formatBRL(i.price)}</span>
              </div>
              <div className="flex items-center gap-2">
                {qty > 0 && (
                  <>
                    <Button type="button" size="icon" variant="outline" className="h-9 w-9 rounded-full" onClick={() => onChange(i.id, qty - 1)} aria-label={`Remover ${i.name}`}>
                      <Minus className="h-4 w-4" />
                    </Button>
                    <span className="w-6 text-center font-semibold tabular-nums" aria-live="polite">{qty}</span>
                  </>
                )}
                <Button type="button" size="icon" className="h-9 w-9 rounded-full" onClick={() => onChange(i.id, Math.min(qty + 1, 50))} aria-label={`Adicionar ${i.name}`}>
                  <Plus className="h-4 w-4" />
                </Button>
              </div>
            </li>
          );
        })}
      </ul>
    </section>
  );
}
