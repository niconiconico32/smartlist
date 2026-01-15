import { serve } from "https://deno.land/std@0.168.0/http/server.ts"

const corsHeaders = {
  'Access-Control-Allow-Origin': '*',
  'Access-Control-Allow-Headers': 'authorization, x-client-info, apikey, content-type',
}

serve(async (req) => {
  if (req.method === 'OPTIONS') {
    return new Response('ok', { headers: corsHeaders })
  }

  try {
    const body = await req.json()
    const { audio, filename } = body

    if (!audio) {
      throw new Error('No se ha subido ningún archivo de audio')
    }

    const openaiKey = Deno.env.get('OPENAI_API_KEY')
    if (!openaiKey) {
      throw new Error('OPENAI_API_KEY no está configurada')
    }

    // 1. Decodificar base64 a bytes
    const binaryString = atob(audio)
    const bytes = new Uint8Array(binaryString.length)
    for (let i = 0; i < binaryString.length; i++) {
      bytes[i] = binaryString.charCodeAt(i)
    }

    // 2. Enviar directamente a Whisper usando multipart/form-data
    const formData = new FormData()
    formData.append('file', new Blob([bytes], { type: 'audio/m4a' }), filename || 'audio.m4a')
    formData.append('model', 'whisper-1')
    formData.append('language', 'es')

    console.log('Enviando a Whisper...')
    const whisperResponse = await fetch('https://api.openai.com/v1/audio/transcriptions', {
      method: 'POST',
      headers: {
        'Authorization': `Bearer ${openaiKey}`,
      },
      body: formData,
    })

    if (!whisperResponse.ok) {
      const errorText = await whisperResponse.text()
      console.error('Whisper error:', whisperResponse.status, errorText)
      throw new Error(`Whisper error: ${whisperResponse.status} - ${errorText}`)
    }

    const whisperData = await whisperResponse.json()
    const transcribedText = whisperData.text || ''

    console.log('Texto transcrito:', transcribedText)

    // 3. Enviar a GPT para extraer título y duración
    console.log('Enviando a GPT...')
    const gptResponse = await fetch('https://api.openai.com/v1/chat/completions', {
      method: 'POST',
      headers: {
        'Authorization': `Bearer ${openaiKey}`,
        'Content-Type': 'application/json',
      },
      body: JSON.stringify({
        model: "gpt-4o-mini",
        messages: [
          {
            role: "system",
            content: 'Eres un asistente experto en planificación de tareas. Tu job es extraer TODA la información del texto del usuario y crear un título conciso y una duración realista total. Debes capturar todos los detalles mencionados (números, especificaciones, requisitos). Responde ÚNICAMENTE con un JSON válido en este formato exacto: {"title": "nombre descriptivo que incluya los detalles principales", "duration": 120}. La duración debe ser la estimación TOTAL en minutos para completar todo lo mencionado.'
          },
          {
            role: "user",
            content: `Analiza COMPLETAMENTE este texto y extrae un título descriptivo que incluya todos los detalles mencionados, más una duración realista total: "${transcribedText}". Responde solo con JSON.`
          }
        ],
        temperature: 0.5,
      }),
    })

    if (!gptResponse.ok) {
      const errorText = await gptResponse.text()
      console.error('GPT error:', gptResponse.status, errorText)
      throw new Error(`GPT error: ${gptResponse.status} - ${errorText}`)
    }

    const gptData = await gptResponse.json()
    let taskData = { title: transcribedText.substring(0, 100), duration: 25 }

    try {
      const content = gptData.choices[0]?.message?.content || ''
      const parsed = JSON.parse(content)
      if (parsed.title && typeof parsed.duration === 'number') {
        taskData = parsed
      }
    } catch (parseError) {
      console.log('Could not parse GPT response, using fallback')
    }

    console.log('Task data:', taskData)

    return new Response(JSON.stringify({ 
      originalText: transcribedText,
      task: taskData 
    }), {
      headers: { ...corsHeaders, 'Content-Type': 'application/json' },
      status: 200,
    })

  } catch (error) {
    console.error('Function error:', error)
    return new Response(JSON.stringify({ 
      error: error.message,
      details: error.toString()
    }), {
      status: 500,
      headers: { ...corsHeaders, 'Content-Type': 'application/json' },
    })
  }
})