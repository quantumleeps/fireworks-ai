// @vitest-environment jsdom
import { act, renderHook, waitFor } from "@testing-library/react";
import { afterEach, beforeEach, describe, expect, it, vi } from "vitest";
import { createChatStore } from "./store.js";
import { useAgent } from "./use-agent.js";

// ---------------------------------------------------------------------------
// Mocks
// ---------------------------------------------------------------------------

interface FetchCall {
  url: string;
  method?: string;
  body?: unknown;
}

let fetchCalls: FetchCall[] = [];
let fetchSessionId = "new-session-1";

const mockFetch = vi.fn(async (url: string | URL | Request, opts?: RequestInit) => {
  const body = opts?.body ? JSON.parse(opts.body as string) : undefined;
  fetchCalls.push({ url: url as string, method: opts?.method, body });
  return { json: async () => ({ sessionId: fetchSessionId }) } as Response;
});

class MockEventSource {
  static instances: MockEventSource[] = [];
  closed = false;
  addEventListener = vi.fn();
  close = vi.fn(() => {
    this.closed = true;
  });
  constructor() {
    MockEventSource.instances.push(this);
  }
}

beforeEach(() => {
  fetchCalls = [];
  fetchSessionId = "new-session-1";
  MockEventSource.instances = [];
  vi.stubGlobal("fetch", mockFetch);
  vi.stubGlobal("EventSource", MockEventSource);
});

afterEach(() => {
  vi.restoreAllMocks();
});

// ---------------------------------------------------------------------------
// Tests
// ---------------------------------------------------------------------------

describe("useAgent", () => {
  describe("mount", () => {
    it("creates a new session by default", async () => {
      const store = createChatStore();
      renderHook(() => useAgent(store, { endpoint: "/api" }));

      await waitFor(() => expect(fetchCalls).toHaveLength(1));
      expect(fetchCalls[0].url).toBe("/api/sessions");
      expect(fetchCalls[0].method).toBe("POST");
      expect(fetchCalls[0].body).toBeUndefined();
      expect(store.getState().sessionId).toBe("new-session-1");
    });

    it("resumes when resumeSessionId is provided", async () => {
      const store = createChatStore();
      renderHook(() => useAgent(store, { endpoint: "/api", resumeSessionId: "sdk-abc" }));

      await waitFor(() => expect(fetchCalls).toHaveLength(1));
      expect(fetchCalls[0].url).toBe("/api/sessions/resume");
      expect(fetchCalls[0].body).toEqual({ sdkSessionId: "sdk-abc" });
      expect(store.getState().sessionId).toBe("new-session-1");
    });
  });

  describe("resumeSession", () => {
    it("uses explicit sdkSessionId over the store value", async () => {
      const store = createChatStore();
      store.getState().setSdkSessionId("store-sdk-id");

      const { result } = renderHook(() => useAgent(store, { endpoint: "/api" }));
      await waitFor(() => expect(store.getState().sessionId).toBe("new-session-1"));

      fetchCalls = [];
      fetchSessionId = "resumed-session";

      await act(() => result.current.resumeSession({ sdkSessionId: "explicit-id" }));

      expect(fetchCalls).toHaveLength(1);
      expect(fetchCalls[0].url).toBe("/api/sessions/resume");
      expect(fetchCalls[0].body).toEqual({ sdkSessionId: "explicit-id", forkSession: undefined });
      expect(store.getState().sessionId).toBe("resumed-session");
    });

    it("falls back to the store sdkSessionId when none is passed", async () => {
      const store = createChatStore();
      store.getState().setSdkSessionId("store-sdk-id");

      const { result } = renderHook(() => useAgent(store, { endpoint: "/api" }));
      await waitFor(() => expect(store.getState().sessionId).toBe("new-session-1"));

      fetchCalls = [];
      fetchSessionId = "resumed-session";

      await act(() => result.current.resumeSession());

      expect(fetchCalls[0].body).toEqual({ sdkSessionId: "store-sdk-id", forkSession: undefined });
    });

    it("no-ops when no sdkSessionId is available", async () => {
      const store = createChatStore();
      const { result } = renderHook(() => useAgent(store, { endpoint: "/api" }));
      await waitFor(() => expect(store.getState().sessionId).toBe("new-session-1"));

      fetchCalls = [];
      await act(() => result.current.resumeSession());

      expect(fetchCalls).toHaveLength(0);
    });

    it("resets store before resuming", async () => {
      const store = createChatStore();
      store.getState().setSdkSessionId("sdk-1");
      store.getState().addUserMessage("hello");

      const { result } = renderHook(() => useAgent(store, { endpoint: "/api" }));
      await waitFor(() => expect(store.getState().sessionId).toBe("new-session-1"));

      fetchCalls = [];
      fetchSessionId = "resumed-session";
      await act(() => result.current.resumeSession());

      expect(store.getState().messages).toHaveLength(0);
      expect(store.getState().sessionId).toBe("resumed-session");
    });
  });

  describe("newSession", () => {
    it("resets store and creates a fresh session", async () => {
      const store = createChatStore();
      store.getState().setSdkSessionId("sdk-old");
      store.getState().addUserMessage("old message");

      const { result } = renderHook(() => useAgent(store, { endpoint: "/api" }));
      await waitFor(() => expect(store.getState().sessionId).toBe("new-session-1"));

      fetchCalls = [];
      fetchSessionId = "fresh-session";

      await act(() => result.current.newSession());

      expect(fetchCalls).toHaveLength(1);
      expect(fetchCalls[0].url).toBe("/api/sessions");
      expect(fetchCalls[0].method).toBe("POST");
      expect(store.getState().messages).toHaveLength(0);
      expect(store.getState().sdkSessionId).toBeNull();
      expect(store.getState().sessionId).toBe("fresh-session");
    });

    it("closes the existing EventSource", async () => {
      const store = createChatStore();
      const { result } = renderHook(() => useAgent(store, { endpoint: "/api" }));
      await waitFor(() => expect(store.getState().sessionId).toBe("new-session-1"));

      // The mount effect sets sessionId, which triggers the EventSource effect
      await waitFor(() => expect(MockEventSource.instances.length).toBeGreaterThan(0));
      const es = MockEventSource.instances[MockEventSource.instances.length - 1];

      fetchSessionId = "fresh-session";
      await act(() => result.current.newSession());

      expect(es.close).toHaveBeenCalled();
    });
  });
});
