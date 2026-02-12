import type { ToolCallInfo, WidgetProps } from "../types.js";
import { CollapsibleCard } from "./CollapsibleCard.js";
import { cn } from "./cn.js";
import { getWidget, stripMcpPrefix } from "./registry.js";
import { StatusDot } from "./StatusDot.js";

export function ToolCallCard({
  toolCall,
  className,
}: {
  toolCall: ToolCallInfo;
  className?: string;
}) {
  const short = stripMcpPrefix(toolCall.name);
  const reg = getWidget(short);
  const label = reg?.label ?? short;

  if (toolCall.status === "complete" && toolCall.result && reg) {
    let parsed: unknown;
    try {
      parsed = JSON.parse(toolCall.result);
    } catch {
      parsed = undefined;
    }

    const displayLabel =
      parsed && reg.richLabel ? (reg.richLabel(parsed as never) ?? label) : label;

    const widgetProps: WidgetProps = {
      phase: toolCall.status,
      toolUseId: toolCall.id,
      input: toolCall.input,
      partialInput: toolCall.partialInput,
      result: parsed,
      error: toolCall.error,
    };

    return (
      <CollapsibleCard label={displayLabel} status={toolCall.status} className={className}>
        <reg.component {...widgetProps} />
      </CollapsibleCard>
    );
  }

  if (toolCall.status === "error") {
    return (
      <div
        className={cn(
          "flex items-center gap-2 rounded-md border border-destructive/50 bg-destructive/10 px-2.5 py-1.5 text-xs text-muted-foreground",
          className,
        )}
      >
        <StatusDot status={toolCall.status} />
        <span>{label}</span>
        {toolCall.error && <span className="ml-auto text-destructive">{toolCall.error}</span>}
      </div>
    );
  }

  return (
    <div
      className={cn(
        "flex items-center gap-2 rounded-md border border-border bg-accent/50 px-2.5 py-1.5 text-xs text-muted-foreground",
        className,
      )}
    >
      <StatusDot status={toolCall.status} />
      <span>{label}</span>
      {toolCall.status === "streaming_input" && toolCall.partialInput && (
        <span className="ml-auto truncate max-w-[200px] opacity-50 font-mono text-[10px]">
          {toolCall.partialInput.slice(0, 80)}
        </span>
      )}
    </div>
  );
}
