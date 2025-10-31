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
    
    // Validate presence and type
    if (!imageBase64 || typeof imageBase64 !== 'string') {
      throw new Error('Dados de imagem inválidos');
    }

    // Validate size (10MB limit to prevent DoS)
    const MAX_SIZE = 10 * 1024 * 1024;
    if (imageBase64.length > MAX_SIZE) {
      throw new Error('Imagem muito grande (máximo 10MB)');
    }

    // Validate image format
    if (!imageBase64.match(/^data:image\/(png|jpeg|jpg|webp);base64,/)) {
      throw new Error('Formato de imagem inválido. Use PNG, JPEG ou WEBP');
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
            content: `Você é um assistente especializado em extrair informações de cardápios escolares.
Analise a imagem e extraia TODOS os itens do cardápio com máxima precisão.

REGRAS CRÍTICAS PARA IDENTIFICAÇÃO:

1. CATEGORIZAÇÃO AUTOMÁTICA (meal_number):
   - MERENDA/CAFÉ DA MANHÃ: qualquer refeição matinal, lanche da manhã (meal_number: 1)
   - ALMOÇO: refeição principal do meio-dia (meal_number: 2)  
   - LANCHE DA TARDE: lanche vespertino, café da tarde (meal_number: 3)
   - IDENTIFIQUE AUTOMATICAMENTE a categoria baseado no contexto e horário

2. ESTRUTURA DO TÍTULO (meal_name):
   - SEMPRE extraia APENAS o ingrediente/prato PRINCIPAL
   - Exemplos CORRETOS: "Frango", "Macarrão à Bolonhesa", "Sopa de Legumes"
   - Exemplos INCORRETOS: "Frango com arroz e feijão" (muito detalhado)
   - O título deve ter no máximo 3-4 palavras

3. ESTRUTURA DA DESCRIÇÃO (description):
   - Coloque TODOS os acompanhamentos, condimentos e guarnições
   - Separe os itens com vírgulas
   - Exemplos: "arroz, feijão, batata frita, salada de alface e tomate"
   - Se não houver acompanhamentos, deixe vazio

4. DIAS DA SEMANA (day_of_week):
   - 0=Domingo, 1=Segunda, 2=Terça, 3=Quarta, 4=Quinta, 5=Sexta, 6=Sábado
   - Identifique o dia mencionado no cardápio

5. MÚLTIPLAS OPÇÕES:
   - Se houver opções alternativas (ex: "Frango OU Peixe"), crie itens SEPARADOS
   - Cada opção deve ser um objeto individual no array

FORMATO DE RETORNO (JSON puro, sem markdown):
{
  "weekStartDate": "YYYY-MM-DD",
  "menus": [
    {
      "dayOfWeek": 0-6,
      "mealNumber": 1-3,
      "mealName": "Prato Principal",
      "description": "acompanhamento 1, acompanhamento 2, acompanhamento 3"
    }
  ]
}

CRÍTICO: Retorne APENAS o JSON. Sem explicações, sem markdown, sem texto adicional.`
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
