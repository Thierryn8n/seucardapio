import { db } from "@/lib/db";

const MAX_BYTES = 2 * 1024 * 1024;

export async function uploadImage(userId: string, file: File, kind: string) {
  if (!file.type.startsWith("image/")) throw new Error("Envie um arquivo de imagem.");
  if (file.size > MAX_BYTES) throw new Error("A imagem deve ter no máximo 2 MB.");
  const ext = file.name.split(".").pop()?.toLowerCase() || "png";
  const path = `${userId}/${kind}-${Date.now()}.${ext}`;
  const { error } = await db.storage.from("menu-images").upload(path, file, { upsert: true, contentType: file.type });
  if (error) throw error;
  return db.storage.from("menu-images").getPublicUrl(path).data.publicUrl;
}

export function slugify(value: string) {
  return value
    .normalize("NFD")
    .replace(/[\u0300-\u036f]/g, "")
    .toLowerCase()
    .replace(/[^a-z0-9]+/g, "-")
    .replace(/^-|-$/g, "")
    .slice(0, 40);
}

export function formatPhone(value: string) {
  const d = value.replace(/\D/g, "").slice(0, 11);
  if (d.length <= 2) return d;
  if (d.length <= 7) return `(${d.slice(0, 2)}) ${d.slice(2)}`;
  return `(${d.slice(0, 2)}) ${d.slice(2, d.length - 4)}-${d.slice(-4)}`;
}

export function formatCnpj(value: string) {
  const d = value.replace(/\D/g, "").slice(0, 14);
  return d
    .replace(/^(\d{2})(\d)/, "$1.$2")
    .replace(/^(\d{2})\.(\d{3})(\d)/, "$1.$2.$3")
    .replace(/\.(\d{3})(\d)/, ".$1/$2")
    .replace(/(\d{4})(\d)/, "$1-$2");
}
