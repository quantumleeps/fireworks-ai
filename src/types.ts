import type { ComponentType } from "react";

// --- SSE ---

export interface SSEEvent {
  event: string;
  data: string;
}

export interface CustomEvent<T = unknown> {
  name: string;
  value: T;
}

// --- Chat Store ---

export type ToolCallPhase = "pending" | "streaming_input" | "running" | "complete" | "error";

export interface ToolCallInfo {
  id: string;
  name: string;
  input: Record<string, unknown>;
  partialInput?: string;
  result?: string;
  error?: string;
  status: ToolCallPhase;
}

export interface ChatMessage {
  id: string;
  role: "user" | "assistant" | "system";
  content: string;
  toolCalls?: ToolCallInfo[];
}

// --- Widget Registry ---

export interface WidgetProps<TResult = unknown> {
  phase: ToolCallPhase;
  toolUseId: string;
  input: Record<string, unknown>;
  partialInput?: string;
  result?: TResult;
  error?: string;
}

export interface WidgetRegistration<TResult = unknown> {
  toolName: string;
  label: string;
  richLabel?: (result: TResult) => string | null;
  component: ComponentType<WidgetProps<TResult>>;
}
