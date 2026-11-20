# Virat Bhatt's portfolio

A React and TypeScript portfolio with a Google Gemini AI assistant that answers questions using the site's profile, experience, skills, and project data.

## Run the site

```bash
npm install
```

Copy the environment template:

```bash
cp .env.example .env.local
```

In `.env.local`, replace `your-google-ai-api-key` with your Google AI API key:

```bash
GEMINI_API_KEY=your-google-ai-api-key
GEMINI_MODEL=gemini-2.5-flash
```

Start the site:

```bash
npm run dev
```

Restart Vite after changing the environment file. Ollama is no longer required.

## How the assistant works

The browser sends chat messages to the same-origin `/api/chat` endpoint. The Vite middleware in `server/geminiChat.ts` adds the portfolio context and calls Google's Gemini API. The key is read by the server and is never included in the browser bundle.

Keep `GEMINI_API_KEY` secret and never rename it with a `VITE_` prefix: Vite exposes variables with that prefix to browser code. `.env.local` is already excluded from Git.

The assistant uses `gemini-2.5-flash` by default. Set `GEMINI_MODEL` to another Gemini model supported by your API key if needed. Chat requests and API responses are not stored by this application.

Conversations keep up to six recent messages, preserving complete exchanges, and condense older context into a rolling summary held in browser memory. New user questions are limited to 500 characters; previous assistant answers can be longer. The server logs Gemini input, output, thinking, and total token counts without logging message contents.

## Deployment

The chat endpoint runs in both `vite` and `vite preview`. The existing Cloudflare tunnel can continue forwarding to port 5173; restart the Vite process after adding the key. Do not deploy only the static `dist` directory unless you also deploy an equivalent `/api/chat` backend, because static hosting cannot keep the API key server-side.
