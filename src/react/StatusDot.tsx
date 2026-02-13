import type { ToolCallPhase } from "../types.js";
import { cn } from "./cn.js";

const phaseClasses: Record<ToolCallPhase, string> = {
  pending: "bg-muted-foreground/40",
  streaming_input: "bg-yellow-500 animate-pulse",
  running: "bg-yellow-500 animate-pulse",
  complete: "bg-green-500",
  error: "bg-red-500",
};

export function StatusDot({ status, className }: { status: ToolCallPhase; className?: string }) {
  return <span className={cn("h-2 w-2 shrink-0 rounded-full", phaseClasses[status], className)} />;
}

export function PulsingDot({ className }: { className?: string }) {
  return (
    <span
      className={cn(
        "inline-block h-2 w-2 shrink-0 rounded-full bg-yellow-500 animate-pulse",
        className,
      )}
    />
  );
}
