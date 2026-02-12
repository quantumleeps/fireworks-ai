import { useCallback, useEffect, useRef, useSyncExternalStore } from "react";
import type { ChatStore } from "./store.js";

export interface UseAgentConfig {
  endpoint?: string;
  customEvents?: string[];
  onEvent?: (event: { type: string; data: unknown }) => void;
}

export interface UseAgentReturn {
  sessionId: string | null;
  sendMessage: (text: string) => Promise<void>;
}

export function useAgent(store: ChatStore, config?: UseAgentConfig): UseAgentReturn {
  const endpoint = config?.endpoint ?? "/api";
  const onEvent = config?.onEvent;
  const customEvents = config?.customEvents;
  const eventSourceRef = useRef<EventSource | null>(null);

  const sessionId = useSyncExternalStore(store.subscribe, () => store.getState().sessionId);

  useEffect(() => {
    let cancelled = false;
    async function init() {
      const res = await fetch(`${endpoint}/sessions`, { method: "POST" });
      const data = await res.json();
      if (!cancelled) store.getState().setSessionId(data.sessionId);
    }
    init();
    return () => {
      cancelled = true;
    };
  }, [endpoint, store]);

  useEffect(() => {
    if (!sessionId) return;

    const es = new EventSource(`${endpoint}/sessions/${sessionId}/events`);
    eventSourceRef.current = es;

    es.addEventListener("message_start", () => {
      store.getState().setThinking(true);
    });

    es.addEventListener("text_delta", (e) => {
      store.getState().setThinking(false);
      const { text } = JSON.parse(e.data);
      store.getState().appendStreamingText(text);
    });

    es.addEventListener("tool_start", (e) => {
      store.getState().setThinking(false);
      store.getState().flushStreamingText();
      const { id, name } = JSON.parse(e.data);
      store.getState().startToolCall(id, name);
    });

    es.addEventListener("tool_input_delta", (e) => {
      const { id, partialJson } = JSON.parse(e.data);
      store.getState().appendToolInput(id, partialJson);
    });

    es.addEventListener("tool_call", (e) => {
      store.getState().flushStreamingText();
      const { id, name, input } = JSON.parse(e.data);
      store.getState().finalizeToolCall(id, name, input);
    });

    es.addEventListener("tool_result", (e) => {
      const { toolUseId, result } = JSON.parse(e.data);
      store.getState().completeToolCall(toolUseId, result);
      if (store.getState().isStreaming) {
        store.getState().setThinking(true);
      }
    });

    es.addEventListener("session_error", (e) => {
      store.getState().flushStreamingText();
      store.getState().setThinking(false);
      const { subtype } = JSON.parse(e.data);
      store.getState().addSystemMessage(`Session ended: ${subtype}`);
      store.getState().setStreaming(false);
    });

    es.addEventListener("turn_complete", () => {
      store.getState().flushStreamingText();
      store.getState().setThinking(false);
      store.getState().setStreaming(false);
    });

    es.addEventListener("error", () => {
      if (es.readyState === EventSource.CLOSED) {
        store.getState().flushStreamingText();
        store.getState().setStreaming(false);
      }
    });

    if (onEvent && customEvents) {
      for (const eventType of customEvents) {
        es.addEventListener(eventType, (e) => {
          try {
            onEvent({ type: eventType, data: JSON.parse(e.data) });
          } catch {
            onEvent({ type: eventType, data: e.data });
          }
        });
      }
    }

    return () => {
      es.close();
      eventSourceRef.current = null;
    };
  }, [sessionId, endpoint, store, onEvent, customEvents]);

  const sendMessage = useCallback(
    async (text: string) => {
      if (!sessionId) return;
      store.getState().addUserMessage(text);
      store.getState().setStreaming(true);
      store.getState().setThinking(true);
      await fetch(`${endpoint}/sessions/${sessionId}/messages`, {
        method: "POST",
        headers: { "Content-Type": "application/json" },
        body: JSON.stringify({ text }),
      });
    },
    [sessionId, endpoint, store],
  );

  return { sessionId, sendMessage };
}
