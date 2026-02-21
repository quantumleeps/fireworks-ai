import { mkdirSync, readFileSync, writeFileSync } from "node:fs";
import { extname, join, normalize, resolve } from "node:path";
import { serve } from "@hono/node-server";
import { createAgentRouter, MessageTranslator, SessionManager } from "@neeter/server";
import { Hono } from "hono";

// The Agent SDK spawns a Claude Code subprocess. If we're running inside
// a Claude Code session, CLAUDECODE causes the subprocess to refuse to start.
delete process.env.CLAUDECODE;

const SANDBOXES_DIR = resolve("sandboxes");

const SCAFFOLD_HTML = `<!doctype html>
<html lang="en">
<head>
  <meta charset="UTF-8" />
  <meta name="viewport" content="width=device-width, initial-scale=1.0" />
  <title>Preview</title>
  <script src="https://cdn.tailwindcss.com"></script>
</head>
<body>
  <div class="min-h-screen flex items-center justify-center">
    <p class="text-gray-400 text-lg">Send a message to get started.</p>
  </div>
</body>
</html>`;

const MIME_TYPES: Record<string, string> = {
  ".html": "text/html",
  ".css": "text/css",
  ".js": "application/javascript",
  ".json": "application/json",
  ".svg": "image/svg+xml",
  ".png": "image/png",
  ".jpg": "image/jpeg",
  ".ico": "image/x-icon",
};

interface SessionContext {
  sandboxDir: string;
}

const sessions = new SessionManager<SessionContext>(() => {
  const sandboxId = crypto.randomUUID();
  const sandboxDir = resolve(SANDBOXES_DIR, sandboxId);
  mkdirSync(sandboxDir, { recursive: true });
  writeFileSync(join(sandboxDir, "index.html"), SCAFFOLD_HTML);

  return {
    context: { sandboxDir },
    model: "claude-sonnet-4-6",
    cwd: sandboxDir,
    tools: ["Bash", "Read", "Write", "Edit", "Glob", "Grep"],
    disallowedTools: ["WebFetch", "WebSearch", "NotebookEdit", "TodoWrite"],
    permissionMode: "bypassPermissions",
    systemPrompt: `You are a creative web developer. Your workspace is ${sandboxDir}.

Rules:
- Build everything in a single index.html file (unless the user asks for more files)
- Tailwind CSS is available via CDN — use utility classes for all styling
- You may add inline <script> and <style> tags for interactivity and custom CSS
- NEVER read, write, or reference files outside your workspace directory
- NEVER use Bash to install packages, run servers, or modify anything outside your workspace
- When the user describes a page, build it immediately — don't ask clarifying questions

You are building a live preview that the user can see updating in real time.`,
  };
});

const translator = new MessageTranslator<SessionContext>({
  onToolResult: (toolName) => {
    if (toolName === "Write" || toolName === "Edit") {
      return [{ name: "preview_reload", value: {} }];
    }
    return [];
  },
});

const agentRouter = createAgentRouter({ sessions, translator });

const app = new Hono();
app.route("/", agentRouter);

// Serve sandbox files for the preview iframe
app.get("/api/sessions/:id/preview/*", (c) => {
  const session = sessions.get(c.req.param("id"));
  if (!session) return c.json({ error: "Session not found" }, 404);

  const requestedPath = c.req.param("*") || "index.html";
  const filePath = normalize(join(session.context.sandboxDir, requestedPath));

  // Prevent path traversal
  if (!filePath.startsWith(session.context.sandboxDir)) {
    return c.json({ error: "Forbidden" }, 403);
  }

  try {
    const content = readFileSync(filePath);
    const mime = MIME_TYPES[extname(filePath)] || "application/octet-stream";
    return c.body(content, 200, {
      "Content-Type": mime,
      "Cache-Control": "no-cache",
    });
  } catch {
    return c.json({ error: "Not found" }, 404);
  }
});

const port = Number(process.env.PORT ?? 3000);
console.log(`Server listening on http://localhost:${port}`);
serve({ fetch: app.fetch, port });
