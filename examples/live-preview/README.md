# Live Preview

A split-pane coding assistant: chat with Claude on the left, watch it build
a webpage in real time on the right.

## Prerequisites

- Node.js 18+
- An `ANTHROPIC_API_KEY` environment variable

## Running

From the monorepo root:

```sh
pnpm install
pnpm build
cd examples/live-preview
pnpm dev
```

This starts:

- **Server** on `http://localhost:3000` (Hono + Claude Agent SDK)
- **Client** on `http://localhost:5173` (Vite + React)

Open `http://localhost:5173` and try prompts like:

- "Make a landing page for a high school student"
- "Fun generative art with spirals and lines"
- "A retro terminal-style portfolio page"

## How it works

Each browser tab gets its own **sandbox directory** (`./sandboxes/{uuid}/`)
with a scaffolded `index.html` that loads Tailwind CSS via CDN.

```
Browser
├── Left pane: chat (MessageList + ChatInput)
└── Right pane: <iframe> showing the sandbox's index.html

Server
├── POST /api/sessions           → create session + sandbox dir
├── POST /api/sessions/:id/messages
├── GET  /api/sessions/:id/events   (SSE stream)
└── GET  /api/sessions/:id/preview/* → serve sandbox files
```

When the agent's Write or Edit tool completes, the server emits a
`preview_reload` custom event via SSE. The client catches it and
reloads the iframe — no file watcher needed.

The agent is restricted to `Bash`, `Read`, `Write`, `Edit`, `Glob`, and
`Grep`, with its `cwd` set to the sandbox directory.
