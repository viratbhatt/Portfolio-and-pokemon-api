import { defineConfig, loadEnv } from 'vite'
import react from '@vitejs/plugin-react'
import tailwindcss from '@tailwindcss/vite'
import { geminiChat } from './server/geminiChat.ts'

export default defineConfig(({ mode }) => {
  const env = loadEnv(mode, process.cwd(), '')

  return {
    plugins: [react(), tailwindcss(), geminiChat(env.GEMINI_API_KEY, env.GEMINI_MODEL || undefined)],
    server: {
      allowedHosts: ['viratbhatt.com'],
    },
  }
})
