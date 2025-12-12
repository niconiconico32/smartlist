import { serve } from "https://deno.land/std@0.168.0/http/server.ts";

const corsHeaders = {
  "Access-Control-Allow-Origin": "*",
  "Access-Control-Allow-Headers": "authorization, x-client-info, apikey, content-type",
};

interface Subtask {
  title: string;
  duration: number;
}

interface TaskDivisionResult {
  title: string;
  tasks: Subtask[];
}

serve(async (req) => {
  // CORS
  if (req.method === "OPTIONS") {
    return new Response("ok", { headers: corsHeaders });
  }

  try {
    const { task } = await req.json();

    if (!task || !task.trim()) {
      throw new Error("Se requiere una tarea");
    }

    console.log(`[1/2] Dividiendo tarea: "${task}"`);

    // Obtener API key de variables de entorno
    const apiKey = Deno.env.get("OPENAI_API_KEY");
    if (!apiKey) {
      throw new Error("Falta OPENAI_API_KEY en variables de entorno");
    }

    const systemPrompt = `Eres un asistente experto en dividir tareas complejas en subtareas simples y accionables.

REGLAS:
1. Divide la tarea en pasos específicos, concretos y secuenciales
2. Cada subtarea debe ser UNA acción clara (ej: "Recoger objetos del suelo", "Limpiar el espejo")
3. Estima la duración de cada paso en minutos (tareas simples 3-5min, medias 8-12min, largas 15-20min)
4. Genera entre 4-8 subtareas normalmente
5. Mantén el título de la tarea original (sin decoración)

FORMATO DE SALIDA (JSON puro):
{
  "title": "Título de la tarea original",
  "tasks": [
    { "title": "Primera subtarea", "duration": 5 },
    { "title": "Segunda subtarea", "duration": 8 }
  ]
}`;

    const userPrompt = `Divide esta tarea en subtareas específicas y accionables:

"${task.trim()}"

Responde ÚNICAMENTE con el JSON, sin explicaciones.`;

    console.log(`[2/2] Enviando a OpenAI...`);

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
          { role: "user", content: userPrompt },
        ],
        temperature: 0.3,
        max_tokens: 1000,
        response_format: { type: "json_object" },
      }),
    });

    if (!response.ok) {
      const errorData = await response.json();
      throw new Error(`OpenAI error: ${errorData.error?.message || response.statusText}`);
    }

    const data = await response.json();
    let rawContent = data.choices[0].message.content;

    console.log(`Respuesta IA (raw): ${rawContent.substring(0, 200)}...`);

    // Limpiar markdown
    rawContent = rawContent
      .replace(/```json\n?/g, "")
      .replace(/```\n?/g, "")
      .trim();

    // Parse y validación
    let result: TaskDivisionResult;
    try {
      result = JSON.parse(rawContent);
    } catch (parseError) {
      console.error("Error parseando JSON de IA:", parseError);
      throw new Error("La IA no devolvió JSON válido");
    }

    // Validar estructura
    if (!result.tasks || !Array.isArray(result.tasks)) {
      throw new Error("Formato de respuesta inválido");
    }

    result.title = result.title || task;
    result.tasks = result.tasks.map(subtask => ({
      title: subtask.title || "Subtarea sin nombre",
      duration: subtask.duration || 5,
    }));

    console.log(`✅ Tarea dividida: ${result.title} - ${result.tasks.length} subtareas`);

    return new Response(JSON.stringify(result, null, 2), {
      headers: { ...corsHeaders, "Content-Type": "application/json" },
      status: 200,
    });

  } catch (error) {
    console.error("❌ Error en divide-task:", error);
    return new Response(
      JSON.stringify({
        error: error.message,
        title: "Error al dividir tarea",
        tasks: [],
      }),
      {
        status: 500,
        headers: { ...corsHeaders, "Content-Type": "application/json" },
      }
    );
  }
});
