"use client";

import { ToolInvocation } from "ai";
import { Loader2 } from "lucide-react";

type ToolDisplayConfig = {
  inProgressLabel: string;
  completedLabel: string;
};

const TOOL_DISPLAY_MAP: Record<string, ToolDisplayConfig> = {
  str_replace_editor: {
    inProgressLabel: "Editing file",
    completedLabel: "Edited file",
  },
  file_manager: {
    inProgressLabel: "Managing files",
    completedLabel: "Updated files",
  },
};

const DEFAULT_TOOL_DISPLAY: ToolDisplayConfig = {
  inProgressLabel: "Working...",
  completedLabel: "Done",
};

interface ToolInvocationBadgeProps {
  toolInvocation: ToolInvocation;
}

export function ToolInvocationBadge({ toolInvocation }: ToolInvocationBadgeProps) {
  const isCompleted = toolInvocation.state === "result" && toolInvocation.result != null;
  const config = TOOL_DISPLAY_MAP[toolInvocation.toolName] ?? DEFAULT_TOOL_DISPLAY;
  const label = isCompleted ? config.completedLabel : config.inProgressLabel;

  return (
    <div className="inline-flex items-center gap-2 mt-2 px-3 py-1.5 bg-neutral-50 rounded-lg text-xs font-mono border border-neutral-200">
      {isCompleted ? (
        <>
          <div className="w-2 h-2 rounded-full bg-emerald-500" />
          <span className="text-neutral-700">{label}</span>
        </>
      ) : (
        <>
          <Loader2 className="w-3 h-3 animate-spin text-blue-600" />
          <span className="text-neutral-700">{label}</span>
        </>
      )}
    </div>
  );
}
