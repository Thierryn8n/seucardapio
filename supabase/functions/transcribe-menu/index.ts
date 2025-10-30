import "https://deno.land/x/xhr@0.1.0/mod.ts";
import { serve } from "https://deno.land/std@0.168.0/http/server.ts";

const corsHeaders = {
  'Access-Control-Allow-Origin': '*',
  'Access-Control-Allow-Headers': 'authorization, x-client-info, apikey, content-type',
};

serve(async (req) => {
  if (req.method === 'OPTIONS') {
    return new Response(null, { headers: corsHeaders });
  }

  try {
    const { imageBase64 } = await req.json();
    
    if (!imageBase64) {
      throw new Error('Imagem não fornecida');
    }

    const LOVABLE_API_KEY = Deno.env.get('LOVABLE_API_KEY');
    if (!LOVABLE_API_KEY) {
      throw new Error('LOVABLE_API_KEY não configurada');
    }

    const response = await fetch('https://ai.gateway.lovable.dev/v1/chat/completions', {
      method: 'POST',
      headers: {
        'Authorization': `Bearer ${LOVABLE_API_KEY}`,
        'Content-Type': 'application/json',
      },
      body: JSON.stringify({
        model: 'google/gemini-2.5-flash',
        messages: [
          {
            role: 'system',
            content: `Você é um assistente especializado em transcrever cardápios de restaurantes. 
Analise a imagem fornecida e extraia TODOS os dados do cardápio de forma estruturada.

IMPORTANTE: Retorne APENAS um objeto JSON válido, sem texto adicional, com esta estrutura exata:
{
  "weekStartDate": "YYYY-MM-DD",
  "menus": [
    {
      "dayOfWeek": 0-6,
      "mealNumber": 1-3,
      "mealName": "nome da refeição",
      "description": "descrição detalhada"
    }
  ]
}

Regras:
- dayOfWeek: 0=Domingo, 1=Segunda, 2=Terça, 3=Quarta, 4=Quinta, 5=Sexta, 6=Sábado
- mealNumber: 1=Café da Manhã, 2=Almoço, 3=Jantar
- Se não encontrar data, use a próxima segunda-feira
- Extraia TODAS as refeições visíveis na imagem
- Mantenha os nomes e descrições exatamente como aparecem
- Se não houver descrição, use string vazia ""
- Não invente dados que não estão na imagem`
          },
          {
            role: 'user',
            content: [
              {
                type: 'text',
                text: 'Transcreva este cardápio escrito à mão. Retorne APENAS o JSON, sem texto adicional.'
              },
              {
                type: 'image_url',
                image_url: {
                  url: imageBase64
                }
              }
            ]
          }
        ],
        temperature: 0.1,
      }),
    });

    if (!response.ok) {
      const errorText = await response.text();
      console.error('Erro na API Lovable AI:', response.status, errorText);
      
      if (response.status === 429) {
        return new Response(
          JSON.stringify({ error: 'Limite de requisições excedido. Tente novamente em alguns instantes.' }),
          { status: 429, headers: { ...corsHeaders, 'Content-Type': 'application/json' } }
        );
      }
      
      if (response.status === 402) {
        return new Response(
          JSON.stringify({ error: 'Créditos insuficientes. Adicione créditos em Settings -> Workspace -> Usage.' }),
          { status: 402, headers: { ...corsHeaders, 'Content-Type': 'application/json' } }
        );
      }
      
      throw new Error(`Erro na API: ${response.status}`);
    }

    const data = await response.json();
    let content = data.choices?.[0]?.message?.content;
    
    if (!content) {
      throw new Error('Resposta vazia da IA');
    }

    // Remove markdown code blocks se existirem
    content = content.replace(/```json\n?/g, '').replace(/```\n?/g, '').trim();
    
    // Tenta fazer parse do JSON
    let parsedData;
    try {
      parsedData = JSON.parse(content);
    } catch (e) {
      console.error('Erro ao fazer parse do JSON:', content);
      throw new Error('Resposta da IA não está no formato JSON válido');
    }

    // Valida estrutura básica
    if (!parsedData.weekStartDate || !parsedData.menus || !Array.isArray(parsedData.menus)) {
      throw new Error('Estrutura de dados inválida retornada pela IA');
    }

    return new Response(
      JSON.stringify(parsedData),
      { headers: { ...corsHeaders, 'Content-Type': 'application/json' } }
    );

  } catch (error) {
    console.error('Erro na função transcribe-menu:', error);
    return new Response(
      JSON.stringify({ 
        error: error instanceof Error ? error.message : 'Erro desconhecido ao transcrever cardápio',
        details: error instanceof Error ? error.stack : undefined
      }),
      {
        status: 500,
        headers: { ...corsHeaders, 'Content-Type': 'application/json' },
      }
    );
  }
});
