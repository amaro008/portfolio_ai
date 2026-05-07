import Anthropic from '@anthropic-ai/sdk'

const anthropic = new Anthropic({ apiKey: process.env.ANTHROPIC_API_KEY })

export async function POST(req: Request) {
  const { question, context } = await req.json()

  const stream = await anthropic.messages.stream({
    model: 'claude-haiku-4-20250514',
    max_tokens: 1024,
    system: `Eres un asesor financiero conciso que analiza portafolios de inversión mexicanos.
Responde SIEMPRE en español. Sé específico con los números del portafolio.
Usa máximo 4 párrafos cortos. Usa **negrita** para números y conceptos clave.
No incluyas disclaimers legales largos.

Contexto del portafolio:
${context}`,
    messages: [{ role: 'user', content: question }],
  })

  const encoder = new TextEncoder()

  const readable = new ReadableStream({
    async start(controller) {
      for await (const chunk of stream) {
        if (
          chunk.type === 'content_block_delta' &&
          chunk.delta.type === 'text_delta'
        ) {
          controller.enqueue(encoder.encode(chunk.delta.text))
        }
      }
      controller.close()
    },
  })

  return new Response(readable, {
    headers: { 'Content-Type': 'text/plain; charset=utf-8' },
  })
}
