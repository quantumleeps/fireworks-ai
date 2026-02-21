import { AgentProvider, ChatInput, MessageList, useAgentContext } from "@neeter/react";
import type { CustomEvent } from "@neeter/types";
import { type RefObject, useCallback, useRef } from "react";

function Layout({ iframeRef }: { iframeRef: RefObject<HTMLIFrameElement | null> }) {
  const { sessionId, sendMessage } = useAgentContext();

  const previewSrc = sessionId ? `/api/sessions/${sessionId}/preview/index.html` : "about:blank";

  return (
    <div className="flex h-screen bg-background text-foreground">
      {/* Chat pane */}
      <div className="flex w-[420px] shrink-0 flex-col border-r">
        <header className="border-b px-4 py-3">
          <h1 className="text-lg font-semibold">Live Preview</h1>
        </header>
        <MessageList className="flex-1" />
        <div className="border-t">
          <ChatInput onSend={sendMessage} />
        </div>
      </div>

      {/* Preview pane */}
      <div className="flex flex-1 flex-col">
        <iframe
          ref={iframeRef}
          src={previewSrc}
          className="h-full w-full border-0"
          title="Preview"
        />
      </div>
    </div>
  );
}

export function App() {
  const iframeRef = useRef<HTMLIFrameElement>(null);

  const onCustomEvent = useCallback((event: CustomEvent) => {
    if (event.name === "preview_reload") {
      iframeRef.current?.contentWindow?.location.reload();
    }
  }, []);

  return (
    <AgentProvider onCustomEvent={onCustomEvent}>
      <Layout iframeRef={iframeRef} />
    </AgentProvider>
  );
}
