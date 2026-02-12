import Markdown from "react-markdown";
import { cn } from "./cn.js";

export function TextMessage({
  role,
  content,
  className,
}: {
  role: "user" | "assistant";
  content: string;
  className?: string;
}) {
  const isUser = role === "user";

  return (
    <div className={cn("flex", isUser ? "justify-end" : "justify-start", className)}>
      <div
        className={cn(
          "max-w-[85%] rounded-lg px-3 py-2 text-sm overflow-hidden break-words",
          isUser ? "bg-primary text-primary-foreground" : "bg-muted text-foreground",
        )}
      >
        {isUser ? (
          <span className="whitespace-pre-wrap">{content}</span>
        ) : (
          <div className="[&>*:first-child]:mt-0 [&>*:last-child]:mb-0">
            <Markdown
              components={{
                p: ({ children }) => <p className="mb-2 last:mb-0">{children}</p>,
                ul: ({ children }) => <ul className="mb-2 ml-4 list-disc last:mb-0">{children}</ul>,
                ol: ({ children }) => (
                  <ol className="mb-2 ml-4 list-decimal last:mb-0">{children}</ol>
                ),
                li: ({ children }) => <li className="mb-0.5">{children}</li>,
                strong: ({ children }) => <strong className="font-semibold">{children}</strong>,
              }}
            >
              {content}
            </Markdown>
          </div>
        )}
      </div>
    </div>
  );
}
