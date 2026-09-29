import { db } from "@/lib/db";
import type { ParsedMenu } from "@/lib/daily-menu";

async function authHeader() {
  const { data } = await db.auth.getSession();
  const token = data.session?.access_token;
  if (!token) throw new Error("Sessão expirada. Atualize a página e tente novamente.");
  return { Authorization: `Bearer ${token}` };
}

export async function parseMenuPhoto(imageDataUrl: string): Promise<ParsedMenu> {
  const res = await fetch("/api/parse-menu-photo", {
    method: "POST",
    headers: { "Content-Type": "application/json", ...(await authHeader()) },
    body: JSON.stringify({ imageDataUrl }),
  });
  const json = await res.json();
  if (!res.ok) throw new Error(json.error || "Não foi possível ler a foto do cardápio.");
  return json as ParsedMenu;
}

export async function generateFoodImage(name: string, kind: string): Promise<string> {
  const res = await fetch("/api/generate-food-image", {
    method: "POST",
    headers: { "Content-Type": "application/json", ...(await authHeader()) },
    body: JSON.stringify({ name, kind }),
  });
  const json = await res.json();
  if (!res.ok) throw new Error(json.error || "Não foi possível gerar a imagem.");
  return json.url as string;
}

export function readFileAsDataUrl(file: File): Promise<string> {
  return new Promise((resolve, reject) => {
    const reader = new FileReader();
    reader.onload = () => resolve(reader.result as string);
    reader.onerror = reject;
    reader.readAsDataURL(file);
  });
}
