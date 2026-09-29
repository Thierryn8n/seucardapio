import { generateImage } from "ai";
import { adminClient, requireUser } from "./_lib/auth";

export const config = { runtime: "nodejs" };

const KIND_HINT: Record<string, string> = {
  protein: "prato de proteína/carne brasileira",
  side: "guarnição ou acompanhamento brasileiro",
  drink: "bebida/refrigerante ou suco",
  dessert: "sobremesa ou doce brasileiro",
  extra: "item de comida",
};

function slugify(value: string) {
  return value
    .normalize("NFD")
    .replace(/[\u0300-\u036f]/g, "")
    .toLowerCase()
    .replace(/[^a-z0-9]+/g, "-")
    .replace(/^-|-$/g, "")
    .slice(0, 40);
}

export default async function handler(req: any, res: any) {
  if (req.method !== "POST") {
    res.status(405).json({ error: "Method not allowed" });
    return;
  }

  let userId: string;
  try {
    userId = (await requireUser(req)).id;
  } catch {
    res.status(401).json({ error: "Não autorizado." });
    return;
  }

  const { name, kind } = req.body ?? {};
  if (typeof name !== "string" || !name.trim()) {
    res.status(400).json({ error: "Informe o nome do item." });
    return;
  }

  try {
    const hint = KIND_HINT[kind as string] ?? "item de comida";
    const { image } = await generateImage({
      model: "google/gemini-2.5-flash-image",
      prompt: `Fotografia profissional de comida, apetitosa, bem iluminada, fundo neutro desfocado, vista de perto, estilo cardápio de restaurante: ${hint} chamado "${name}". Sem texto, sem logotipos, sem talheres desnecessários.`,
      aspectRatio: "1:1",
    });

    const bytes = image.uint8Array;
    const path = `${userId}/ai/${slugify(name)}-${Date.now()}.png`;
    const { error: uploadError } = await adminClient.storage
      .from("menu-images")
      .upload(path, bytes, { contentType: "image/png", upsert: true });
    if (uploadError) throw uploadError;

    const { data } = adminClient.storage.from("menu-images").getPublicUrl(path);
    res.status(200).json({ url: data.publicUrl });
  } catch (err) {
    console.error("[generate-food-image]", err);
    res.status(500).json({ error: "Não foi possível gerar a imagem agora. Tente novamente ou envie uma foto do dispositivo." });
  }
}
