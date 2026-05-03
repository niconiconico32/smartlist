import { serve } from "https://deno.land/std@0.168.0/http/server.ts";

const corsHeaders = {
  "Access-Control-Allow-Origin": "*",
  "Access-Control-Allow-Headers": "authorization, x-client-info, apikey, content-type",
};

serve(async (req) => {
  // CORS
  if (req.method === "OPTIONS") {
    return new Response("ok", { headers: corsHeaders });
  }

  try {
    const authHeader = req.headers.get('Authorization');
    if (!authHeader) {
      return new Response(
        JSON.stringify({ error: 'Unauthorized: Missing authorization header' }),
        { status: 401, headers: { ...corsHeaders, 'Content-Type': 'application/json' } }
      );
    }

    const { task } = await req.json();

    if (!task || !task.trim()) {
      throw new Error("Se requiere una tarea");
    }

    const apiKey = Deno.env.get("OPENAI_API_KEY");
    if (!apiKey) {
      throw new Error("Falta OPENAI_API_KEY en variables de entorno");
    }

    const systemPrompt = `Eres un asistente experto en TDAH y productividad.
Tu objetivo es tomar una intención simple del usuario y expandirla en un párrafo de acción detallado (MÁXIMO 300 caracteres) narrado en primera persona ("Necesito...", "Voy a...", "Buscaré...").
Este párrafo debe detallar los pasos lógicos, físicos y preparativos para abordar el problema de forma completa y reducir la fricción mental.

EJEMPLO:
Input: "hacer la colada"
Output JSON:
{
  "expanded_task": "Necesito hacer la colada, para eso buscaré la ropa sucia de mi habitación, recogeré los calcetines e iré a la lavandería de mi edificio, llevaré monedas y programaré las máquinas."
}

REGLAS:
1. DEBE ser en primera persona del singular.
2. DEBE incluir los preparativos físicos (buscar cosas, moverse de habitación).
3. MÁXIMO 300 caracteres.
4. Responde ÚNICAMENTE con JSON válido en el formato especificado.`;

    const response = await fetch("https://api.openai.com/v1/chat/completions", {
      method: "POST",
      headers: {
        "Content-Type": "application/json",
        "Authorization": `Bearer ${apiKey}`,
      },
      body: JSON.stringify({
        model: "gpt-4o-mini",
        messages: [
          { role: "system", content: systemPrompt },
          { role: "user", content: `Expande esta tarea: "${task.trim()}"` },
        ],
        temperature: 0.7,
        max_tokens: 200,
        response_format: { type: "json_object" },
      }),
    });

    if (!response.ok) {
      const errorData = await response.json();
      throw new Error(`OpenAI error: ${errorData.error?.message || response.statusText}`);
    }

    const data = await response.json();
    let rawContent = data.choices[0].message.content;

    rawContent = rawContent.replace(/```json\n?/g, "").replace(/```\n?/g, "").trim();
    
    let result;
    try {
      result = JSON.parse(rawContent);
    } catch (e) {
      throw new Error("La IA no devolvió JSON válido");
    }

    return new Response(JSON.stringify({ expanded_task: result.expanded_task || task }), {
      headers: { ...corsHeaders, "Content-Type": "application/json" },
      status: 200,
    });

  } catch (error) {
    console.error("❌ Error en expand-task:", error);
    return new Response(
      JSON.stringify({ error: error.message, expanded_task: "Hubo un error al expandir la tarea. Puedes editar esto manualmente." }),
      { status: 500, headers: { ...corsHeaders, "Content-Type": "application/json" } }
    );
  }
});
