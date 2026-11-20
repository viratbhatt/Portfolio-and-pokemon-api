import { handleGeminiChat, type GeminiEnvironment } from '../server/geminiCore.ts'

type WorkerEnvironment = GeminiEnvironment & {
  ASSETS: {
    fetch(request: Request): Promise<Response>
  }
}

export default {
  async fetch(request: Request, env: WorkerEnvironment): Promise<Response> {
    if (new URL(request.url).pathname === '/api/chat') {
      return handleGeminiChat(request, env)
    }

    return env.ASSETS.fetch(request)
  },
}
