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
  emoji: string;
}

serve(async (req) => {
  // CORS
  if (req.method === "OPTIONS") {
    return new Response("ok", { headers: corsHeaders });
  }

  try {
    // ✅ Validate authentication header
    const authHeader = req.headers.get('Authorization');
    if (!authHeader) {
      console.error('❌ No authorization header provided');
      return new Response(
        JSON.stringify({ error: 'Unauthorized: Missing authorization header' }),
        { 
          status: 401, 
          headers: { ...corsHeaders, 'Content-Type': 'application/json' } 
        }
      );
    }

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

REGLAS CRÍTICAS:
1. CAPTURA TODOS LOS DETALLES mencionados en la tarea (números, especificaciones, requisitos)
2. Convierte CADA detalle en una subtarea específica (ej: si dice "10 abdominales, 5 lagartijas, correr 5km", crea UNA subtarea por cada ejercicio con el número exacto)
3. Mantén los números y especificaciones en el título de cada subtarea
4. Estima la duración realista de cada subtarea específica en minutos
5. Genera entre 3-10 subtareas basadas en la complejidad
6. Resume el título principal a MÁXIMO 50 caracteres
7. Selecciona UN emoji que represente la tarea completa

EJEMPLO - Input: "Quiero hacer ejercicio: 10 abdominales, 5 lagartijas y correr 5 kilómetros"
Output:
{
  "title": "Plan de ejercicio completo",
  "emoji": "💪",
  "tasks": [
    { "title": "Hacer 10 abdominales", "duration": 3 },
    { "title": "Hacer 5 lagartijas", "duration": 3 },
    { "title": "Correr 5 kilómetros", "duration": 30 }
  ]
}

FORMATO DE SALIDA:
{
  "title": "Título resumido",
  "emoji": "🎯",
  "tasks": [
    { "title": "Subtarea con detalles específicos", "duration": número }
  ]
}`;

    const userPrompt = `Divide COMPLETAMENTE esta tarea en subtareas específicas. IMPORTANTE: Captura TODOS los números, especificaciones y detalles mencionados en cada subtarea:

"${task.trim()}"

Responde ÚNICAMENTE con JSON válido, sin explicaciones.`;

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
    result.emoji = result.emoji || "✨";
    result.tasks = result.tasks.map(subtask => ({
      title: subtask.title || "Subtarea sin nombre",
      duration: subtask.duration || 5,
    }));

    console.log(`✅ Tarea dividida: ${result.emoji} ${result.title} - ${result.tasks.length} subtareas`);

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
