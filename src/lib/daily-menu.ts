import { format } from "date-fns";
import { db } from "@/lib/db";

export type SectionKind = "protein" | "side" | "drink" | "dessert" | "extra";

export const SECTION_KINDS: { value: SectionKind; label: string; hint: string }[] = [
  { value: "protein", label: "Proteínas", hint: "Limitado pelo tamanho da marmita" },
  { value: "side", label: "Guarnições", hint: "Incluídas na marmita" },
  { value: "drink", label: "Bebidas", hint: "Cobradas à parte" },
  { value: "dessert", label: "Sobremesas", hint: "Cobradas à parte" },
  { value: "extra", label: "Adicionais", hint: "Cobrados à parte" },
];

export const kindLabel = (k: SectionKind) => SECTION_KINDS.find((s) => s.value === k)?.label ?? k;
export const isPaidKind = (k: SectionKind) => k === "drink" || k === "dessert" || k === "extra";

export interface MenuItem { id: string; section_id: string; name: string; price: number; available: boolean; display_order: number; image_url: string | null }
export interface MenuSection { id: string; daily_menu_id: string; name: string; kind: SectionKind; display_order: number; items: MenuItem[] }
export interface DailyMenu { id: string; user_id: string; menu_date: string; notes: string | null; is_published: boolean; sections: MenuSection[] }
export interface MarmitaSize { id: string; user_id: string; name: string; description: string | null; price: number; max_proteins: number; active: boolean; display_order: number }

export interface Restaurant {
  id: string;
  name: string;
  logo_url: string | null;
  whatsapp: string | null;
  address: string | null;
  accepts_delivery: boolean;
  accepts_pickup: boolean;
  delivery_fee: number;
  delivery_enabled: boolean;
  estimated_time: string | null;
}

export interface OrderLine {
  type: "marmita" | SectionKind;
  size?: string;
  name?: string;
  price: number;
  quantity: number;
  proteins?: string[];
  sides?: string[];
  notes?: string;
}

export interface OrderRow {
  id: string;
  order_number: number;
  customer_name: string;
  customer_phone: string;
  customer_address: string | null;
  customer_neighborhood: string | null;
  customer_notes: string | null;
  items: OrderLine[];
  status: string;
  subtotal: number;
  delivery_fee: number;
  total: number;
  payment_method: string | null;
  delivery_type: "delivery" | "pickup";
  created_at: string;
}

export const ORDER_STATUSES = [
  { value: "received", label: "Recebido" },
  { value: "preparing", label: "Preparando" },
  { value: "delivering", label: "Saiu p/ entrega" },
  { value: "delivered", label: "Entregue" },
  { value: "cancelled", label: "Cancelado" },
];

export const PAYMENT_METHODS = [
  { value: "pix", label: "Pix" },
  { value: "dinheiro", label: "Dinheiro" },
  { value: "cartao", label: "Cartão (na entrega)" },
];

const brl = new Intl.NumberFormat("pt-BR", { style: "currency", currency: "BRL" });
export const formatBRL = (v: number | string | null | undefined) => brl.format(Number(v ?? 0));
export const todayISO = () => format(new Date(), "yyyy-MM-dd");
export const onlyDigits = (s: string) => s.replace(/\D/g, "");

const UUID_RE = /^[0-9a-f]{8}-[0-9a-f]{4}-[0-9a-f]{4}-[0-9a-f]{4}-[0-9a-f]{12}$/i;

const sortByOrder = <T extends { display_order: number }>(a: T, b: T) => a.display_order - b.display_order;

type RawSection = Omit<MenuSection, "items"> & { menu_section_items: MenuItem[] | null };
type RawMenu = Omit<DailyMenu, "sections"> & { menu_sections: RawSection[] | null };

export function normalizeMenu(raw: RawMenu | null): DailyMenu | null {
  if (!raw) return null;
  const { menu_sections, ...rest } = raw;
  return {
    ...rest,
    sections: (menu_sections ?? [])
      .map(({ menu_section_items, ...s }) => ({
        ...s,
        items: (menu_section_items ?? []).map((i) => ({ ...i, price: Number(i.price) })).sort(sortByOrder),
      }))
      .sort(sortByOrder),
  };
}

export const MENU_SELECT = "*, menu_sections(*, menu_section_items(*))";

export async function fetchMenuByDate(userId: string, date: string) {
  const { data, error } = await db.from("daily_menus").select(MENU_SELECT).eq("user_id", userId).eq("menu_date", date).maybeSingle();
  if (error) throw error;
  return normalizeMenu(data as RawMenu | null);
}

export async function fetchSizes(userId: string) {
  const { data, error } = await db.from("marmita_sizes").select("*").eq("user_id", userId).order("display_order");
  if (error) throw error;
  return (data as MarmitaSize[]).map((s) => ({ ...s, price: Number(s.price) }));
}

export async function fetchRestaurant(idOrSlug: string): Promise<Restaurant | null> {
  const col = UUID_RE.test(idOrSlug) ? "id" : "slug";
  const { data: profile, error } = await db.from("profiles").select("id, name, full_name, logo_url, phone, address").eq(col, idOrSlug).maybeSingle();
  if (error) throw error;
  if (!profile) return null;
  const [{ data: s }, { data: d }] = await Promise.all([
    db.from("settings").select("company_name, logo_url, whatsapp_number, accepts_delivery, accepts_pickup").eq("user_id", profile.id).maybeSingle(),
    db.from("delivery_settings").select("delivery_fee, delivery_enabled, estimated_time").eq("user_id", profile.id).maybeSingle(),
  ]);
  return {
    id: profile.id,
    name: s?.company_name && s.company_name !== "Nossa Empresa" ? s.company_name : profile.name || profile.full_name || "Marmitaria",
    logo_url: s?.logo_url || profile.logo_url,
    whatsapp: s?.whatsapp_number || profile.phone,
    address: profile.address,
    accepts_delivery: s?.accepts_delivery ?? true,
    accepts_pickup: s?.accepts_pickup ?? true,
    delivery_fee: Number(d?.delivery_fee ?? 0),
    delivery_enabled: d?.delivery_enabled ?? true,
    estimated_time: d?.estimated_time ?? null,
  };
}

export function whatsappLink(phone: string | null | undefined, text: string) {
  let digits = onlyDigits(phone ?? "");
  if (digits && digits.length <= 11) digits = `55${digits}`;
  return `https://wa.me/${digits}?text=${encodeURIComponent(text)}`;
}

export interface CustomerInfo {
  name: string;
  phone: string;
  delivery_type: "delivery" | "pickup";
  address: string;
  neighborhood: string;
  payment_method: string;
  notes: string;
}

export function buildOrderMessage(opts: {
  company: string;
  orderNumber?: number;
  items: OrderLine[];
  customer: CustomerInfo;
  subtotal: number;
  deliveryFee: number;
  total: number;
}) {
  const { company, orderNumber, items, customer, subtotal, deliveryFee, total } = opts;
  const lines: string[] = [];
  lines.push(`*Novo pedido${orderNumber ? ` #${orderNumber}` : ""} - ${company}*`);
  lines.push("");
  let n = 0;
  for (const it of items) {
    if (it.type === "marmita") {
      n += 1;
      lines.push(`*Marmita ${n} (${it.size})* - ${formatBRL(it.price)}`);
      if (it.proteins?.length) lines.push(`  Proteínas: ${it.proteins.join(", ")}`);
      if (it.sides?.length) lines.push(`  Guarnições: ${it.sides.join(", ")}`);
      if (it.notes) lines.push(`  Obs: ${it.notes}`);
    } else {
      lines.push(`${it.quantity}x ${it.name} - ${formatBRL(it.price * it.quantity)}`);
    }
  }
  lines.push("");
  lines.push(`Subtotal: ${formatBRL(subtotal)}`);
  if (customer.delivery_type === "delivery") lines.push(`Entrega: ${deliveryFee > 0 ? formatBRL(deliveryFee) : "Grátis"}`);
  lines.push(`*Total: ${formatBRL(total)}*`);
  lines.push("");
  lines.push(`*Cliente:* ${customer.name}`);
  lines.push(`*Telefone:* ${customer.phone}`);
  if (customer.delivery_type === "delivery") {
    lines.push(`*Entrega em:* ${customer.address}${customer.neighborhood ? ` - ${customer.neighborhood}` : ""}`);
  } else {
    lines.push("*Retirada no local*");
  }
  const pay = PAYMENT_METHODS.find((p) => p.value === customer.payment_method)?.label ?? customer.payment_method;
  lines.push(`*Pagamento:* ${pay}`);
  if (customer.notes) lines.push(`*Obs:* ${customer.notes}`);
  return lines.join("\n");
}

// ---------- Parser for pasted WhatsApp-style menus ----------

export interface ParsedMenu {
  sections: { name: string; kind: SectionKind; items: { name: string; price: number }[] }[];
  sizes: { name: string; description: string; price: number; max_proteins: number }[];
}

const HEADING_RE = /^(prote[ií]nas?|misturas?|carnes?|guarni[cç](?:[oõ]es|ao|ão)|acompanhamentos?|bebidas?|sucos?|refrigerantes?|sobremesas?|doces?|extras?|adicionais|saladas?|valores.*|pre[cç]os?.*|marmitas?.*|tamanhos?.*)$/i;
const PRICE_RE = /(?:R\$\s*|\$\s*)?(\d{1,4}(?:[.,]\d{2}))\s*(?:R\$|reais)?/i;

function cleanLine(line: string) {
  return line.replace(/^[^\p{L}\p{N}(]+/u, "").replace(/[:\s]+$/, "").trim();
}

function kindFromHeading(h: string): SectionKind | "sizes" {
  const t = h.toLowerCase();
  if (/valor|pre[cç]o|marmita|tamanho/.test(t)) return "sizes";
  if (/prote|mistura|carne/.test(t)) return "protein";
  if (/guarni|acompanh|salada/.test(t)) return "side";
  if (/bebida|suco|refri/.test(t)) return "drink";
  if (/sobremesa|doce/.test(t)) return "dessert";
  return "extra";
}

const parsePrice = (s: string) => Number(s.replace(",", "."));

export function parseMenuText(text: string): ParsedMenu {
  const result: ParsedMenu = { sections: [], sizes: [] };
  let current: ParsedMenu["sections"][number] | null = null;
  let inSizes = false;

  for (const raw of text.split(/\r?\n/)) {
    if (!raw.trim()) continue;
    const pinned = /^\s*📌/u.test(raw);
    const line = cleanLine(raw);
    if (!line) continue;
    const priceMatch = line.match(PRICE_RE);
    const isHeading = !priceMatch && (pinned || HEADING_RE.test(line) || /:\s*$/.test(raw.trim()));

    if (isHeading) {
      const kind = kindFromHeading(line);
      inSizes = kind === "sizes";
      if (kind !== "sizes") {
        current = { name: line.charAt(0).toUpperCase() + line.slice(1).toLowerCase(), kind, items: [] };
        result.sections.push(current);
      }
      continue;
    }

    if (inSizes) {
      const m = line.match(/^\(?\s*([^)=]+?)\s*\)?\s+(\d+)\s*prote/i);
      if (m && priceMatch) {
        const max = Number(m[2]);
        result.sizes.push({ name: m[1].trim().toUpperCase(), description: `${max} proteína${max > 1 ? "s" : ""}`, price: parsePrice(priceMatch[1]), max_proteins: max });
      }
      continue;
    }

    if (!current) {
      current = { name: "Proteínas", kind: "protein", items: [] };
      result.sections.push(current);
    }
    const name = (priceMatch ? line.replace(priceMatch[0], "") : line).replace(/[-–=:]+\s*$/, "").trim();
    if (name) current.items.push({ name: name.charAt(0).toUpperCase() + name.slice(1), price: priceMatch ? parsePrice(priceMatch[1]) : 0 });
  }
  result.sections = result.sections.filter((s) => s.items.length > 0);
  return result;
}
