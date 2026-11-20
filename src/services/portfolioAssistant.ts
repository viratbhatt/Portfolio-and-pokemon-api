export type ChatMessage = {
  role: 'user' | 'assistant'
  content: string
}

export type ConversationContext = {
  summary: string
  summarizedMessageCount: number
}

export type AssistantResult = {
  answer: string
  context: ConversationContext
}

type ChatResponse = {
  answer?: unknown
  summary?: unknown
  summarizedMessageCount?: unknown
  error?: unknown
}

export async function askPortfolioAssistant(
  messages: ChatMessage[],
  signal: AbortSignal | undefined,
  context: ConversationContext,
): Promise<AssistantResult> {
  let response: Response

  try {
    response = await fetch('/api/chat', {
      method: 'POST',
      headers: { 'Content-Type': 'application/json' },
      body: JSON.stringify({
        messages: messages.slice(context.summarizedMessageCount),
        summary: context.summary,
        summarizedMessageCount: context.summarizedMessageCount,
      }),
      signal,
    })
  } catch (error) {
    if (signal?.aborted) throw error
    throw new Error('The AI assistant is unavailable. Please try again.')
  }

  const data = (await response.json().catch(() => null)) as ChatResponse | null

  if (!response.ok) {
    const message = typeof data?.error === 'string' ? data.error : null
    throw new Error(message || `The assistant returned an error (${response.status}).`)
  }

  if (typeof data?.answer !== 'string' || !data.answer.trim()) {
    throw new Error('The assistant returned an empty response. Please try again.')
  }
  if (
    typeof data.summary !== 'string' ||
    typeof data.summarizedMessageCount !== 'number' ||
    !Number.isInteger(data.summarizedMessageCount) ||
    data.summarizedMessageCount < 0 ||
    data.summarizedMessageCount > messages.length
  ) {
    throw new Error('The assistant returned invalid conversation context. Please start a new chat.')
  }

  return {
    answer: data.answer.trim(),
    context: {
      summary: data.summary,
      summarizedMessageCount: data.summarizedMessageCount,
    },
  }
}
