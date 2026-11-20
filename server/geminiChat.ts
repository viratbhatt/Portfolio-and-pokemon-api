import type { IncomingMessage, ServerResponse } from 'node:http'
import { Readable } from 'node:stream'
import type { Plugin } from 'vite'
import { handleGeminiChat } from './geminiCore.ts'

function toWebRequest(request: IncomingMessage): Request {
  const headers = new Headers()
  for (const [name, value] of Object.entries(request.headers)) {
    if (typeof value === 'string') headers.set(name, value)
    if (Array.isArray(value)) headers.set(name, value.join(', '))
  }

  const method = request.method || 'GET'
  const body = method === 'GET' || method === 'HEAD' ? undefined : Readable.toWeb(request)
  return new Request(new URL(request.url || '/', 'http://localhost'), {
    method,
    headers,
    body,
    duplex: 'half',
  } as RequestInit & { duplex: 'half' })
}

async function writeWebResponse(webResponse: Response, response: ServerResponse) {
  if (response.destroyed) return
  response.statusCode = webResponse.status
  webResponse.headers.forEach((value, name) => response.setHeader(name, value))
  response.end(Buffer.from(await webResponse.arrayBuffer()))
}

export function geminiChat(apiKey?: string, model = 'gemini-2.5-flash'): Plugin {
  const middleware = (request: IncomingMessage, response: ServerResponse, next: () => void) => {
    if (request.url?.split('?')[0] !== '/api/chat') {
      next()
      return
    }

    void handleGeminiChat(toWebRequest(request), {
      GEMINI_API_KEY: apiKey,
      GEMINI_MODEL: model,
    }).then(
      (webResponse) => writeWebResponse(webResponse, response),
      (error: unknown) => {
        console.error('The local chat request failed:', error)
        if (!response.destroyed) {
          response.statusCode = 500
          response.setHeader('Content-Type', 'application/json; charset=utf-8')
          response.end(JSON.stringify({ error: 'The AI assistant is unavailable. Please try again.' }))
        }
      },
    )
  }

  return {
    name: 'gemini-chat',
    configureServer(server) {
      server.middlewares.use(middleware)
    },
    configurePreviewServer(server) {
      server.middlewares.use(middleware)
    },
  }
}
