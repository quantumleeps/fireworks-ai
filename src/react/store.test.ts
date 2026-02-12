import { describe, expect, it } from "vitest";
import { createChatStore } from "./store.js";

function firstToolCall(store: ReturnType<typeof createChatStore>) {
  const tc = store.getState().messages[0].toolCalls?.[0];
  expect(tc).toBeDefined();
  return tc as NonNullable<typeof tc>;
}

describe("ChatStore", () => {
  it("addUserMessage appends a user message", () => {
    const store = createChatStore();
    store.getState().addUserMessage("hello");
    const { messages } = store.getState();
    expect(messages).toHaveLength(1);
    expect(messages[0].role).toBe("user");
    expect(messages[0].content).toBe("hello");
    expect(messages[0].id).toMatch(/^msg-/);
  });

  it("appendStreamingText + flushStreamingText creates assistant message", () => {
    const store = createChatStore();
    store.getState().appendStreamingText("hel");
    store.getState().appendStreamingText("lo");
    expect(store.getState().streamingText).toBe("hello");

    store.getState().flushStreamingText();
    const { messages, streamingText } = store.getState();
    expect(streamingText).toBe("");
    expect(messages).toHaveLength(1);
    expect(messages[0].role).toBe("assistant");
    expect(messages[0].content).toBe("hello");
  });

  it("flushStreamingText appends to existing assistant message without tool calls", () => {
    const store = createChatStore();
    store.getState().appendStreamingText("first ");
    store.getState().flushStreamingText();
    store.getState().appendStreamingText("second");
    store.getState().flushStreamingText();

    const { messages } = store.getState();
    expect(messages).toHaveLength(1);
    expect(messages[0].content).toBe("first second");
  });

  it("flushStreamingText is a no-op when streamingText is empty", () => {
    const store = createChatStore();
    store.getState().flushStreamingText();
    expect(store.getState().messages).toHaveLength(0);
  });

  it("startToolCall creates assistant message with pending tool call", () => {
    const store = createChatStore();
    store.getState().startToolCall("tc-1", "search");
    const { messages } = store.getState();
    expect(messages).toHaveLength(1);
    expect(messages[0].role).toBe("assistant");
    expect(messages[0].toolCalls).toHaveLength(1);
    expect(messages[0].toolCalls?.[0]).toMatchObject({
      id: "tc-1",
      name: "search",
      status: "pending",
    });
  });

  it("appendToolInput accumulates partialInput and sets streaming_input status", () => {
    const store = createChatStore();
    store.getState().startToolCall("tc-1", "search");
    store.getState().appendToolInput("tc-1", '{"q":');
    store.getState().appendToolInput("tc-1", '"test"}');

    const tc = firstToolCall(store);
    expect(tc.partialInput).toBe('{"q":"test"}');
    expect(tc.status).toBe("streaming_input");
  });

  it("finalizeToolCall sets input and running status", () => {
    const store = createChatStore();
    store.getState().startToolCall("tc-1", "search");
    store.getState().finalizeToolCall("tc-1", "search", { q: "test" });

    const tc = firstToolCall(store);
    expect(tc.input).toEqual({ q: "test" });
    expect(tc.status).toBe("running");
  });

  it("completeToolCall sets result and complete status", () => {
    const store = createChatStore();
    store.getState().startToolCall("tc-1", "search");
    store.getState().completeToolCall("tc-1", '{"results":[]}');

    const tc = firstToolCall(store);
    expect(tc.result).toBe('{"results":[]}');
    expect(tc.status).toBe("complete");
  });

  it("errorToolCall sets error and error status", () => {
    const store = createChatStore();
    store.getState().startToolCall("tc-1", "search");
    store.getState().errorToolCall("tc-1", "timeout");

    const tc = firstToolCall(store);
    expect(tc.error).toBe("timeout");
    expect(tc.status).toBe("error");
  });

  it("reset clears all state", () => {
    const store = createChatStore();
    store.getState().setSessionId("sess-1");
    store.getState().addUserMessage("hi");
    store.getState().setStreaming(true);
    store.getState().setThinking(true);

    store.getState().reset();
    const s = store.getState();
    expect(s.sessionId).toBeNull();
    expect(s.messages).toHaveLength(0);
    expect(s.isStreaming).toBe(false);
    expect(s.isThinking).toBe(false);
    expect(s.streamingText).toBe("");
  });

  it("addSystemMessage appends a system message", () => {
    const store = createChatStore();
    store.getState().addSystemMessage("Session ended");
    const { messages } = store.getState();
    expect(messages).toHaveLength(1);
    expect(messages[0].role).toBe("system");
    expect(messages[0].content).toBe("Session ended");
  });
});
