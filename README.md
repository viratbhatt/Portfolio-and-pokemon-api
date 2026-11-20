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

The browser sends chat messages to the same-origin `/api/chat` endpoint. The shared handler in `server/geminiCore.ts` adds the portfolio context and calls Google's Gemini API. The Vite middleware in `server/geminiChat.ts` adapts that handler for local development, and `worker/index.ts` uses it in production. The key is read by the server or Worker and is never included in the browser bundle.

Keep `GEMINI_API_KEY` secret and never rename it with a `VITE_` prefix: Vite exposes variables with that prefix to browser code. `.env.local` is already excluded from Git.

The assistant uses `gemini-2.5-flash` by default. Set `GEMINI_MODEL` to another Gemini model supported by your API key if needed. Chat requests and API responses are not stored by this application.

Conversations keep up to six recent messages, preserving complete exchanges, and condense older context into a rolling summary held in browser memory. New user questions are limited to 500 characters; previous assistant answers can be longer. The server logs Gemini input, output, thinking, and total token counts without logging message contents.

## Cloudflare Workers deployment

The Worker serves the built `dist` assets and handles `POST /api/chat` before passing all other requests to the assets binding. Client-side routes such as `/pokemon` use the single-page application fallback.

1. In `wrangler.jsonc`, replace `replace-with-your-worker-name` with the exact name of the existing Worker shown in Cloudflare Dashboard. This ensures deployment updates the Worker where the credentials already exist.
2. Confirm the Worker has a `GEMINI_API_KEY` secret and a `GEMINI_MODEL` text variable under **Settings → Variables and Secrets**.
3. Deploy with:

```bash
npm run deploy
```

For Cloudflare Workers Builds, use `npm run build` as the build command and `npx wrangler deploy` as the deploy command. A static-only deployment does not include the chat API.

To run the Worker locally instead of using the Vite middleware, create `.dev.vars` with the same Gemini settings and run `npm run worker:dev`. `.dev.vars` is excluded from Git.
