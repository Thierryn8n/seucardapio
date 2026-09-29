import { generateObject } from "ai";
import { z } from "zod";
import { requireUser } from "./_lib/auth";

export const config = { runtime: "nodejs" };

const sectionKind = z.enum(["protein", "side", "drink", "dessert", "extra"]);

const schema = z.object({
  sections: z.array(
    z.object({
      name: z.string(),
      kind: sectionKind,
      items: z.array(z.object({ name: z.string(), price: z.number() })),
    }),
  ),
  sizes: z.array(
    z.object({
      name: z.string(),
      description: z.string(),
      price: z.number(),
      max_proteins: z.number().int(),
    }),
  ),
});

const PROMPT = `Você é um assistente que lê fotos de cardápios de marmitaria escritos à mão ou impressos (em português do Brasil) e extrai os dados estruturados.

Regras:
- "kind" de cada seção deve ser um destes valores: "protein" (proteínas/carnes/misturas), "side" (guarnições/acompanhamentos/saladas, incluídas na marmita), "drink" (bebidas/sucos/refrigerantes), "dessert" (sobremesas/doces), "extra" (adicionais que não se encaixam nos anteriores).
- Preços: converta para número decimal (ex: "12,50" -> 12.5, "10" -> 10). Se um item não tiver preço visível, use 0.
- Tamanhos de marmita (ex: "P - 2 proteínas - R$ 18", "G = 3 misturas = 25,00") vão em "sizes", não em "sections". "max_proteins" é a quantidade de proteínas incluída.
- Ignore texto que não seja item de cardápio (propaganda, telefone, endereço, decoração).
- Corrija erros óbvios de grafia mantendo o nome reconhecível, mas não invente itens que não estão na imagem.
- Capitalize o nome de cada item (primeira letra maiúscula).`;

export default async function handler(req: any, res: any) {
  if (req.method !== "POST") {
    res.status(405).json({ error: "Method not allowed" });
    return;
  }
  try {
    await requireUser(req);
  } catch {
    res.status(401).json({ error: "Não autorizado." });
    return;
  }

  const { imageDataUrl } = req.body ?? {};
  if (typeof imageDataUrl !== "string" || !imageDataUrl.startsWith("data:image/")) {
    res.status(400).json({ error: "Envie uma foto válida." });
    return;
  }

  try {
    const { object } = await generateObject({
      model: "google/gemini-2.5-flash",
      schema,
      messages: [
        {
          role: "user",
          content: [
            { type: "text", text: PROMPT },
            { type: "image", image: imageDataUrl },
          ],
        },
      ],
    });
    res.status(200).json(object);
  } catch (err) {
    console.error("[parse-menu-photo]", err);
    res.status(500).json({ error: "Não foi possível ler o cardápio na foto. Tente outra foto ou cole o texto manualmente." });
  }
}
