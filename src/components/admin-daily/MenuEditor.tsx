import { useRef, useState } from "react";
import { useQuery, useQueryClient } from "@tanstack/react-query";
import { Camera, ClipboardPaste, Copy, ImagePlus, Loader2, MoreVertical, Plus, Sparkles, Trash2, Upload, X } from "lucide-react";
import { Button } from "@/components/ui/button";
import { Input } from "@/components/ui/input";
import { Label } from "@/components/ui/label";
import { Switch } from "@/components/ui/switch";
import { Textarea } from "@/components/ui/textarea";
import { Select, SelectContent, SelectItem, SelectTrigger, SelectValue } from "@/components/ui/select";
import { Dialog, DialogContent, DialogDescription, DialogFooter, DialogHeader, DialogTitle } from "@/components/ui/dialog";
import { DropdownMenu, DropdownMenuContent, DropdownMenuItem, DropdownMenuTrigger } from "@/components/ui/dropdown-menu";
import {
  AlertDialog, AlertDialogAction, AlertDialogCancel, AlertDialogContent, AlertDialogDescription,
  AlertDialogFooter, AlertDialogHeader, AlertDialogTitle,
} from "@/components/ui/alert-dialog";
import { useToast } from "@/hooks/use-toast";
import { db } from "@/lib/db";
import { uploadImage } from "@/lib/upload";
import { parseMenuPhoto, generateFoodImage, readFileAsDataUrl } from "@/lib/menu-images";
import {
  fetchMenuByDate, fetchSizes, formatBRL, isPaidKind, kindLabel, MENU_SELECT, normalizeMenu, parseMenuText, SECTION_KINDS, todayISO,
  type DailyMenu, type MenuItem, type MenuSection, type ParsedMenu, type SectionKind,
} from "@/lib/daily-menu";

const EXAMPLE = `📌PROTEINAS
Frango no Forno
Carne de panela

📌GUARNIÇÕES
Arroz Branco
Feijão Carioca

Sobremesa
Musse maracujá $5.00

📌VALORES DAS MARMITAS
(G) 2 Proteínas = 14,00R$
(GG) 3 Proteínas = 18,00R$`;

type DbError = { message: string } | null;

function ItemThumb({ url, busy, onGenerate, onUpload, onRemove }: {
  url: string | null;
  busy: boolean;
  onGenerate: () => void;
  onUpload: (f: File) => void;
  onRemove: () => void;
}) {
  const fileRef = useRef<HTMLInputElement>(null);
  return (
    <>
      <DropdownMenu>
        <DropdownMenuTrigger asChild>
          <button
            type="button"
            disabled={busy}
            className="relative flex h-10 w-10 shrink-0 items-center justify-center overflow-hidden rounded-md border border-border bg-muted disabled:opacity-60"
            aria-label="Imagem do item"
          >
            {busy ? (
              <Loader2 className="h-4 w-4 animate-spin text-muted-foreground" />
            ) : url ? (
              <img src={url} alt="" className="h-full w-full object-cover" />
            ) : (
              <ImagePlus className="h-4 w-4 text-muted-foreground" aria-hidden />
            )}
          </button>
        </DropdownMenuTrigger>
        <DropdownMenuContent align="start">
          <DropdownMenuItem onSelect={() => onGenerate()} className="gap-2">
            <Sparkles className="h-4 w-4" aria-hidden />Gerar imagem com IA
          </DropdownMenuItem>
          <DropdownMenuItem onSelect={() => fileRef.current?.click()} className="gap-2">
            <Upload className="h-4 w-4" aria-hidden />Enviar do dispositivo
          </DropdownMenuItem>
          {url && (
            <DropdownMenuItem onSelect={() => onRemove()} className="gap-2 text-destructive">
              <X className="h-4 w-4" aria-hidden />Remover imagem
            </DropdownMenuItem>
          )}
        </DropdownMenuContent>
      </DropdownMenu>
      <input
        ref={fileRef}
        type="file"
        accept="image/*"
        className="hidden"
        onChange={(e) => {
          const f = e.target.files?.[0];
          if (f) onUpload(f);
          e.target.value = "";
        }}
      />
    </>
  );
}

function ItemRow({ item, paid, kind, onUpdate, onRemove }: {
  item: MenuItem;
  paid: boolean;
  kind: SectionKind;
  onUpdate: (p: Partial<MenuItem>) => Promise<void> | void;
  onRemove: () => void;
}) {
  const { toast } = useToast();
  const [editing, setEditing] = useState(false);
  const [name, setName] = useState(item.name);
  const [price, setPrice] = useState(String(item.price));
  const [imgBusy, setImgBusy] = useState(false);

  const save = async () => {
    const trimmed = name.trim();
    if (!trimmed) return setEditing(false);
    await onUpdate({ name: trimmed, price: paid ? Number(price.replace(",", ".")) || 0 : item.price });
    setEditing(false);
  };

  const generate = async () => {
    setImgBusy(true);
    try {
      const url = await generateFoodImage(item.name, kind);
      await onUpdate({ image_url: url });
    } catch (e) {
      toast({ title: "Erro ao gerar imagem", description: (e as Error).message, variant: "destructive" });
    } finally {
      setImgBusy(false);
    }
  };

  const upload = async (file: File) => {
    setImgBusy(true);
    try {
      const url = await uploadImage(item.section_id, file, "item");
      await onUpdate({ image_url: url });
    } catch (e) {
      toast({ title: "Erro ao enviar imagem", description: (e as Error).message, variant: "destructive" });
    } finally {
      setImgBusy(false);
    }
  };

  if (editing) {
    return (
      <li className="flex items-center gap-2 py-2">
        <ItemThumb url={item.image_url} busy={imgBusy} onGenerate={generate} onUpload={upload} onRemove={() => onUpdate({ image_url: null })} />
        <Input autoFocus value={name} onChange={(e) => setName(e.target.value)} onKeyDown={(e) => e.key === "Enter" && save()} className="flex-1" aria-label="Nome do item" />
        {paid && <Input value={price} onChange={(e) => setPrice(e.target.value)} onKeyDown={(e) => e.key === "Enter" && save()} inputMode="decimal" className="w-20" aria-label="Preço" />}
        <Button size="sm" onClick={save}>Salvar</Button>
        <Button size="sm" variant="ghost" onClick={() => setEditing(false)}>Cancelar</Button>
      </li>
    );
  }

  return (
    <li className="flex items-center gap-2 py-2">
      <ItemThumb url={item.image_url} busy={imgBusy} onGenerate={generate} onUpload={upload} onRemove={() => onUpdate({ image_url: null })} />
      <Switch checked={item.available} onCheckedChange={(v) => onUpdate({ available: v })} aria-label={`${item.name} disponível`} />
      <button type="button" onClick={() => setEditing(true)} className={item.available ? "flex-1 text-left" : "flex-1 text-left text-muted-foreground line-through"}>
        {item.name}
      </button>
      {paid && <span className="text-sm tabular-nums text-muted-foreground">{formatBRL(item.price)}</span>}
      <Button variant="ghost" size="icon" onClick={onRemove} aria-label={`Remover ${item.name}`}><Trash2 className="h-4 w-4" /></Button>
    </li>
  );
}

function SectionCard({ section, onAddItem, onUpdateItem, onRemoveItem, onRemove }: {
  section: MenuSection;
  onAddItem: (name: string, price: number) => Promise<boolean>;
  onUpdateItem: (i: MenuItem, p: Partial<MenuItem>) => void;
  onRemoveItem: (i: MenuItem) => void;
  onRemove: () => void;
}) {
  const [name, setName] = useState("");
  const [price, setPrice] = useState("");
  const paid = isPaidKind(section.kind);
  const add = async (e: React.FormEvent) => {
    e.preventDefault();
    if (await onAddItem(name.trim(), paid ? Number(price.replace(",", ".")) || 0 : 0)) { setName(""); setPrice(""); }
  };
  return (
    <div className="flex flex-col gap-2 rounded-xl border border-border bg-card p-4">
      <div className="flex items-center justify-between gap-3">
        <div className="flex flex-col">
          <h3 className="font-playfair text-lg font-bold">{section.name}</h3>
          <span className="text-xs uppercase tracking-wide text-muted-foreground">{kindLabel(section.kind)}</span>
        </div>
        <Button variant="ghost" size="sm" onClick={onRemove} className="text-destructive">Remover seção</Button>
      </div>
      <ul className="flex flex-col divide-y divide-border">
        {section.items.map((i) => (
          <ItemRow key={i.id} item={i} paid={paid} kind={section.kind} onUpdate={(p) => onUpdateItem(i, p)} onRemove={() => onRemoveItem(i)} />
        ))}
      </ul>
      <form onSubmit={add} className="flex gap-2">
        <Input required maxLength={80} placeholder="Novo item" value={name} onChange={(e) => setName(e.target.value)} aria-label={`Novo item em ${section.name}`} />
        {paid && <Input required className="w-24" inputMode="decimal" placeholder="5,00" value={price} onChange={(e) => setPrice(e.target.value)} aria-label="Preço" />}
        <Button type="submit" size="icon" aria-label="Adicionar item"><Plus className="h-4 w-4" /></Button>
      </form>
    </div>
  );
}

function PhotoImportDialog({ open, onOpenChange, onConfirm }: {
  open: boolean;
  onOpenChange: (v: boolean) => void;
  onConfirm: (parsed: ParsedMenu) => Promise<void>;
}) {
  const { toast } = useToast();
  const fileRef = useRef<HTMLInputElement>(null);
  const [preview, setPreview] = useState<string | null>(null);
  const [parsed, setParsed] = useState<ParsedMenu | null>(null);
  const [reading, setReading] = useState(false);
  const [importing, setImporting] = useState(false);

  const reset = () => { setPreview(null); setParsed(null); setReading(false); setImporting(false); };

  const handleFile = async (file: File) => {
    setReading(true);
    setParsed(null);
    try {
      const dataUrl = await readFileAsDataUrl(file);
      setPreview(dataUrl);
      const result = await parseMenuPhoto(dataUrl);
      if (!result.sections.length && !result.sizes.length) {
        toast({ title: "Nada reconhecido na foto", description: "Tente uma foto mais nítida ou cole o texto manualmente.", variant: "destructive" });
      }
      setParsed(result);
    } catch (e) {
      toast({ title: "Erro ao ler a foto", description: (e as Error).message, variant: "destructive" });
    } finally {
      setReading(false);
    }
  };

  const confirm = async () => {
    if (!parsed) return;
    setImporting(true);
    await onConfirm(parsed);
    setImporting(false);
    reset();
    onOpenChange(false);
  };

  const totalItems = parsed?.sections.reduce((s, x) => s + x.items.length, 0) ?? 0;

  return (
    <Dialog open={open} onOpenChange={(v) => { onOpenChange(v); if (!v) reset(); }}>
      <DialogContent className="max-w-lg">
        <DialogHeader>
          <DialogTitle>Tirar foto do cardápio</DialogTitle>
          <DialogDescription>Fotografe o cardápio escrito à mão ou impresso. Identificamos as seções, itens e valores automaticamente.</DialogDescription>
        </DialogHeader>

        {!preview ? (
          <button
            type="button"
            onClick={() => fileRef.current?.click()}
            className="flex flex-col items-center justify-center gap-3 rounded-xl border-2 border-dashed border-border p-10 text-center text-sm text-muted-foreground hover:border-primary hover:text-foreground"
          >
            <Camera className="h-8 w-8" aria-hidden />
            Tirar foto ou escolher da galeria
          </button>
        ) : (
          <div className="flex flex-col gap-3">
            <img src={preview} alt="Cardápio fotografado" className="max-h-48 w-full rounded-lg object-contain" />
            {reading && (
              <p className="flex items-center gap-2 text-sm text-muted-foreground"><Loader2 className="h-4 w-4 animate-spin" />Lendo o cardápio...</p>
            )}
            {parsed && (parsed.sections.length > 0 || parsed.sizes.length > 0) && (
              <div className="flex flex-col gap-2 rounded-lg border border-border bg-muted p-3 text-sm">
                <p className="font-medium">{totalItems} itens em {parsed.sections.length} seções{parsed.sizes.length ? ` · ${parsed.sizes.length} tamanhos` : ""}</p>
                <ul className="flex flex-col gap-1 text-muted-foreground">
                  {parsed.sections.map((s, idx) => (
                    <li key={idx}>{kindLabel(s.kind)}: {s.items.map((i) => i.name).join(", ")}</li>
                  ))}
                </ul>
              </div>
            )}
            <Button variant="outline" size="sm" onClick={() => fileRef.current?.click()} className="gap-2 self-start">
              <Camera className="h-4 w-4" aria-hidden />Trocar foto
            </Button>
          </div>
        )}

        <input
          ref={fileRef}
          type="file"
          accept="image/*"
          capture="environment"
          className="hidden"
          onChange={(e) => {
            const f = e.target.files?.[0];
            if (f) handleFile(f);
            e.target.value = "";
          }}
        />

        <DialogFooter>
          <Button variant="outline" onClick={() => onOpenChange(false)}>Cancelar</Button>
          <Button onClick={confirm} disabled={!parsed || reading || importing || (!parsed?.sections.length && !parsed?.sizes.length)} className="gap-2">
            {importing && <Loader2 className="h-4 w-4 animate-spin" />}Importar cardápio
          </Button>
        </DialogFooter>
      </DialogContent>
    </Dialog>
  );
}

export function MenuEditor({ userId }: { userId: string }) {
  const qc = useQueryClient();
  const { toast } = useToast();
  const [date, setDate] = useState(todayISO());
  const [pasteOpen, setPasteOpen] = useState(false);
  const [pasteText, setPasteText] = useState("");
  const [photoOpen, setPhotoOpen] = useState(false);
  const [busy, setBusy] = useState(false);
  const [newSec, setNewSec] = useState<{ name: string; kind: SectionKind }>({ name: "", kind: "protein" });
  const [pendingRemoveSection, setPendingRemoveSection] = useState<MenuSection | null>(null);
  const [removingSection, setRemovingSection] = useState(false);

  const menuKey = ["daily-menu", userId, date];
  const { data: menu, isLoading } = useQuery({ queryKey: menuKey, queryFn: () => fetchMenuByDate(userId, date) });
  const refresh = () => qc.invalidateQueries({ queryKey: menuKey });
  const fail = (e: DbError) => { if (e) toast({ title: "Erro", description: e.message, variant: "destructive" }); return !!e; };

  const ensureMenu = async (): Promise<DailyMenu | null> => {
    if (menu) return menu;
    const { data, error } = await db.from("daily_menus").insert({ user_id: userId, menu_date: date }).select(MENU_SELECT).single();
    if (fail(error)) return null;
    return normalizeMenu(data);
  };

  const createSection = async (m: DailyMenu, name: string, kind: SectionKind, order: number) => {
    const { data, error } = await db.from("menu_sections").insert({ daily_menu_id: m.id, user_id: userId, name, kind, display_order: order }).select("id").single();
    return fail(error) ? null : (data.id as string);
  };

  const addSection = async (e: React.FormEvent) => {
    e.preventDefault();
    const m = await ensureMenu();
    if (!m) return;
    if (await createSection(m, newSec.name.trim() || kindLabel(newSec.kind), newSec.kind, m.sections.length)) {
      setNewSec({ name: "", kind: "protein" });
      refresh();
    }
  };

  const importParsed = async (parsed: ParsedMenu) => {
    const m = await ensureMenu();
    if (!m) return;
    let order = m.sections.length;
    for (const s of parsed.sections) {
      const existing = m.sections.find((x) => x.kind === s.kind && x.name.toLowerCase() === s.name.toLowerCase());
      const sectionId = existing?.id ?? (await createSection(m, s.name, s.kind, order++));
      if (!sectionId) return;
      const start = existing?.items.length ?? 0;
      const rows = s.items
        .filter((i) => !existing?.items.some((x) => x.name.toLowerCase() === i.name.toLowerCase()))
        .map((i, idx) => ({ section_id: sectionId, user_id: userId, name: i.name, price: i.price, display_order: start + idx }));
      if (rows.length && fail((await db.from("menu_section_items").insert(rows)).error)) return;
    }
    if (parsed.sizes.length) {
      const current = await fetchSizes(userId);
      for (const [idx, sz] of parsed.sizes.entries()) {
        const found = current.find((c) => c.name.toLowerCase() === sz.name.toLowerCase());
        const res = found
          ? await db.from("marmita_sizes").update({ price: sz.price, max_proteins: sz.max_proteins, description: sz.description, active: true }).eq("id", found.id)
          : await db.from("marmita_sizes").insert({ ...sz, user_id: userId, display_order: current.length + idx });
        if (fail(res.error)) return;
      }
      qc.invalidateQueries({ queryKey: ["sizes", userId] });
    }
  };

  const runPaste = async () => {
    const parsed = parseMenuText(pasteText);
    if (!parsed.sections.length && !parsed.sizes.length) return toast({ title: "Nada reconhecido", description: "Use títulos como PROTEÍNAS, GUARNIÇÕES, BEBIDAS, SOBREMESA.", variant: "destructive" });
    setBusy(true);
    await importParsed(parsed);
    setBusy(false);
    setPasteOpen(false);
    setPasteText("");
    refresh();
    toast({ title: "Cardápio importado", description: `${parsed.sections.reduce((s, x) => s + x.items.length, 0)} itens · ${parsed.sizes.length} tamanhos` });
  };

  const runPhotoImport = async (parsed: ParsedMenu) => {
    await importParsed(parsed);
    refresh();
    toast({ title: "Cardápio importado da foto", description: `${parsed.sections.reduce((s, x) => s + x.items.length, 0)} itens · ${parsed.sizes.length} tamanhos` });
  };

  const copyLast = async () => {
    setBusy(true);
    const { data, error } = await db.from("daily_menus").select(MENU_SELECT).eq("user_id", userId).lt("menu_date", date).order("menu_date", { ascending: false }).limit(1).maybeSingle();
    if (fail(error)) return setBusy(false);
    const prev = normalizeMenu(data);
    if (!prev) { setBusy(false); return toast({ title: "Nenhum cardápio anterior encontrado" }); }
    await importParsed({ sections: prev.sections.map((s) => ({ name: s.name, kind: s.kind, items: s.items.map((i) => ({ name: i.name, price: i.price })) })), sizes: [] });
    setBusy(false);
    refresh();
    toast({ title: "Cardápio copiado", description: `A partir de ${prev.menu_date.split("-").reverse().join("/")}` });
  };

  const updateItem = async (i: MenuItem, p: Partial<MenuItem>) => { if (!fail((await db.from("menu_section_items").update(p).eq("id", i.id).eq("user_id", userId)).error)) refresh(); };
  const removeItem = async (i: MenuItem) => { if (!fail((await db.from("menu_section_items").delete().eq("id", i.id).eq("user_id", userId)).error)) refresh(); };
  const confirmRemoveSection = async () => {
    if (!pendingRemoveSection) return;
    setRemovingSection(true);
    const { error } = await db.from("menu_sections").delete().eq("id", pendingRemoveSection.id).eq("user_id", userId);
    setRemovingSection(false);
    if (fail(error)) return;
    refresh();
    toast({ title: `Seção ${pendingRemoveSection.name} removida` });
    setPendingRemoveSection(null);
  };
  const addItem = async (s: MenuSection, name: string, price: number) => {
    const { error } = await db.from("menu_section_items").insert({ section_id: s.id, user_id: userId, name, price, display_order: s.items.length });
    if (fail(error)) return false;
    refresh();
    return true;
  };
  const togglePublish = async (v: boolean) => { if (menu && !fail((await db.from("daily_menus").update({ is_published: v }).eq("id", menu.id)).error)) refresh(); };
  const saveNotes = async (notes: string) => { if (menu && notes !== (menu.notes ?? "")) { if (!fail((await db.from("daily_menus").update({ notes: notes || null }).eq("id", menu.id)).error)) refresh(); } };

  return (
    <div className="flex flex-col gap-6">
      <div className="flex flex-wrap items-end justify-between gap-4">
        <div className="flex flex-col gap-2">
          <Label htmlFor="menu-date">Data do cardápio</Label>
          <Input id="menu-date" type="date" value={date} onChange={(e) => e.target.value && setDate(e.target.value)} className="w-48" />
        </div>
        <div className="flex flex-wrap gap-2">
          <Button variant="outline" onClick={copyLast} disabled={busy} className="gap-2"><Copy className="h-4 w-4" aria-hidden />Copiar do último dia</Button>
          <Button variant="outline" onClick={() => setPhotoOpen(true)} className="gap-2"><Camera className="h-4 w-4" aria-hidden />Tirar foto do cardápio</Button>
          <Button onClick={() => setPasteOpen(true)} className="gap-2"><ClipboardPaste className="h-4 w-4" aria-hidden />Colar lista do WhatsApp</Button>
        </div>
      </div>

      {menu && (
        <div className="flex flex-col gap-3 rounded-xl border border-border bg-muted p-4">
          <label className="flex items-center gap-3 text-sm font-medium">
            <Switch checked={menu.is_published} onCheckedChange={togglePublish} />
            {menu.is_published ? "Publicado — clientes já podem pedir" : "Rascunho — invisível para clientes"}
          </label>
          <Textarea key={menu.id} defaultValue={menu.notes ?? ""} onBlur={(e) => saveNotes(e.target.value.trim())} rows={2} maxLength={300} placeholder="Aviso para os clientes (ex.: pedidos até 11h)" aria-label="Aviso do dia" />
        </div>
      )}

      {isLoading ? (
        <p className="text-sm text-muted-foreground">Carregando...</p>
      ) : !menu?.sections.length ? (
        <p className="rounded-xl border border-dashed border-border p-8 text-center text-sm leading-relaxed text-muted-foreground">
          Nenhum item para esta data. Tire uma foto do cardápio, cole a lista que você já manda no WhatsApp, copie do último dia ou crie as seções abaixo.
        </p>
      ) : (
        <div className="grid gap-4 md:grid-cols-2">
          {menu.sections.map((s) => (
            <SectionCard key={s.id} section={s} onAddItem={(n, p) => addItem(s, n, p)} onUpdateItem={updateItem} onRemoveItem={removeItem} onRemove={() => setPendingRemoveSection(s)} />
          ))}
        </div>
      )}

      <form onSubmit={addSection} className="flex flex-wrap items-end gap-3 rounded-xl border border-dashed border-border p-4">
        <div className="flex flex-col gap-2">
          <Label>Tipo</Label>
          <Select value={newSec.kind} onValueChange={(v) => setNewSec({ ...newSec, kind: v as SectionKind })}>
            <SelectTrigger className="w-44"><SelectValue /></SelectTrigger>
            <SelectContent>{SECTION_KINDS.map((k) => <SelectItem key={k.value} value={k.value}>{k.label}</SelectItem>)}</SelectContent>
          </Select>
        </div>
        <div className="flex flex-1 flex-col gap-2">
          <Label htmlFor="sec-name">Nome da seção (opcional)</Label>
          <Input id="sec-name" maxLength={40} placeholder={kindLabel(newSec.kind)} value={newSec.name} onChange={(e) => setNewSec({ ...newSec, name: e.target.value })} />
        </div>
        <Button type="submit" variant="outline" className="gap-2"><Plus className="h-4 w-4" aria-hidden />Nova seção</Button>
      </form>

      <PhotoImportDialog open={photoOpen} onOpenChange={setPhotoOpen} onConfirm={runPhotoImport} />

      <Dialog open={pasteOpen} onOpenChange={setPasteOpen}>
        <DialogContent className="max-w-lg">
          <DialogHeader>
            <DialogTitle>Colar lista do WhatsApp</DialogTitle>
            <DialogDescription>Cole o cardápio como você já envia. Reconhecemos proteínas, guarnições, bebidas, sobremesas (com preço) e os valores das marmitas.</DialogDescription>
          </DialogHeader>
          <Textarea rows={12} value={pasteText} onChange={(e) => setPasteText(e.target.value)} placeholder={EXAMPLE} className="font-mono text-sm" />
          <DialogFooter>
            <Button variant="outline" onClick={() => setPasteOpen(false)}>Cancelar</Button>
            <Button onClick={runPaste} disabled={busy || !pasteText.trim()} className="gap-2">{busy && <Loader2 className="h-4 w-4 animate-spin" />}Importar</Button>
          </DialogFooter>
        </DialogContent>
      </Dialog>

      <AlertDialog open={!!pendingRemoveSection} onOpenChange={(open) => !open && setPendingRemoveSection(null)}>
        <AlertDialogContent>
          <AlertDialogHeader>
            <AlertDialogTitle>Remover a seção {pendingRemoveSection?.name}?</AlertDialogTitle>
            <AlertDialogDescription>Todos os itens dessa seção também serão removidos. Essa ação não pode ser desfeita.</AlertDialogDescription>
          </AlertDialogHeader>
          <AlertDialogFooter>
            <AlertDialogCancel disabled={removingSection}>Cancelar</AlertDialogCancel>
            <AlertDialogAction onClick={confirmRemoveSection} disabled={removingSection} className="gap-2 bg-destructive text-destructive-foreground hover:bg-destructive/90">
              {removingSection && <Loader2 className="h-4 w-4 animate-spin" />}Remover
            </AlertDialogAction>
          </AlertDialogFooter>
        </AlertDialogContent>
      </AlertDialog>
    </div>
  );
}
