# Virat Bhatt's portfolio

A React and TypeScript portfolio with a local AI assistant that answers questions using the site's profile, experience, skills, and project data.

## Run the site

```bash
npm install
npm run dev
```

## Local AI assistant

The chat widget calls Ollama's `/api/chat` endpoint directly from the browser. Its default configuration is:

```bash
VITE_OLLAMA_URL=http://localhost:11434
VITE_OLLAMA_MODEL=gemma4:12b-mlx
```

Copy `.env.example` to `.env.local` to override either value, then restart Vite. Vite environment variables are public browser configuration, so do not put secrets in them.

Start Ollama and make sure the configured model is installed:

```bash
ollama pull gemma4:12b-mlx
ollama serve
```

If the browser cannot connect because of CORS, restart Ollama with the site's origin allowed:

```bash
OLLAMA_ORIGINS=http://localhost:5173 ollama serve
```

The Ollama request is isolated in `src/services/ollama.ts`. Replace that client with a request to a middle layer when one is available; the chat component does not need to change.

**Local-only limitation:** in direct mode, `localhost` is the device of the person viewing the site. A deployed website will therefore look for Ollama on each visitor's own device. Use a middle layer or a reachable Ollama host before making the assistant publicly available.
