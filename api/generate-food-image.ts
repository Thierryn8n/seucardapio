import { adminClient, requireUser } from "./_lib/auth";

export const config = { runtime: "nodejs" };

const KIND_HINT: Record<string, string> = {
  protein: "prato de proteína/carne brasileira",
  side: "guarnição ou acompanhamento brasileiro",
  drink: "bebida/refrigerante ou suco",
  dessert: "sobremesa ou doce brasileiro",
  extra: "item de comida",
};

const NVIDIA_FLUX_URL = "https://ai.api.nvidia.com/v1/genai/black-forest-labs/flux.1-schnell";

function slugify(value: string) {
  return value
    .normalize("NFD")
    .replace(/[\u0300-\u036f]/g, "")
    .toLowerCase()
    .replace(/[^a-z0-9]+/g, "-")
    .replace(/^-|-$/g, "")
    .slice(0, 40);
}

async function generateWithNvidia(prompt: string): Promise<Buffer> {
  const apiKey = process.env.NVIDIA_API_KEY;
  if (!apiKey) {
    throw new Error("NVIDIA_API_KEY não configurada.");
  }

  const response = await fetch(NVIDIA_FLUX_URL, {
    method: "POST",
    headers: {
      Authorization: `Bearer ${apiKey}`,
      Accept: "application/json",
      "Content-Type": "application/json",
    },
    body: JSON.stringify({
      prompt,
      mode: "base",
      width: 1024,
      height: 1024,
      cfg_scale: 0,
      samples: 1,
      seed: 0,
      steps: 4,
    }),
  });

  if (!response.ok) {
    const text = await response.text().catch(() => "");
    throw new Error(`NVIDIA API error ${response.status}: ${text.slice(0, 300)}`);
  }

  const data: any = await response.json();
  const base64: string | undefined =
    data?.artifacts?.[0]?.base64 ?? data?.data?.[0]?.b64_json ?? data?.image;

  if (!base64) {
    throw new Error("Resposta da NVIDIA sem imagem.");
  }

  return Buffer.from(base64, "base64");
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
    const prompt = `Fotografia profissional de comida, apetitosa, bem iluminada, fundo neutro desfocado, vista de perto, estilo cardápio de restaurante: ${hint} chamado "${name}". Sem texto, sem logotipos, sem talheres desnecessários.`;
    const bytes = await generateWithNvidia(prompt);
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
