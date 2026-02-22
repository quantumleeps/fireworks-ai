import type {
  HookCallbackMatcher,
  HookInput,
  HookJSONOutput,
} from "@anthropic-ai/claude-agent-sdk";

/**
 * Creates a PreToolUse hook that blocks file operations outside a sandbox directory.
 * Inspects `file_path` and `path` fields in tool input and blocks any resolved path
 * that falls outside the given directory.
 *
 * @param sandboxDir - Absolute path to the sandbox directory (must already be resolved)
 * @param resolvePath - Path resolver function (e.g. `path.resolve` from `node:path`)
 */
export function createSandboxHook(
  sandboxDir: string,
  resolvePath: (...segments: string[]) => string,
): HookCallbackMatcher[] {
  const normalizedDir = resolvePath(sandboxDir);

  return [
    {
      hooks: [
        async (input: HookInput): Promise<HookJSONOutput> => {
          if (input.hook_event_name !== "PreToolUse") return {};
          const toolInput = input.tool_input as Record<string, unknown>;
          const filePath = (toolInput.file_path ?? toolInput.path) as string | undefined;
          if (!filePath) return {};
          const resolved = resolvePath(filePath);
          if (resolved !== normalizedDir && !resolved.startsWith(`${normalizedDir}/`)) {
            return { decision: "block", reason: "Access outside sandbox directory is not allowed" };
          }
          return {};
        },
      ],
    },
  ];
}
