import { test, expect, afterEach } from "vitest";
import { render, screen, cleanup } from "@testing-library/react";
import { ToolInvocation } from "ai";
import { ToolInvocationBadge } from "../ToolInvocationBadge";

afterEach(() => {
  cleanup();
});

function makeCallInvocation(toolName: string): ToolInvocation {
  return { state: "call", toolCallId: "id-1", toolName, args: {} };
}

function makeResultInvocation(toolName: string): ToolInvocation {
  return { state: "result", toolCallId: "id-1", toolName, args: {}, result: "ok" };
}

test("str_replace_editor in-progress shows 'Editing file'", () => {
  render(<ToolInvocationBadge toolInvocation={makeCallInvocation("str_replace_editor")} />);
  expect(screen.getByText("Editing file")).toBeDefined();
});

test("str_replace_editor completed shows 'Edited file'", () => {
  render(<ToolInvocationBadge toolInvocation={makeResultInvocation("str_replace_editor")} />);
  expect(screen.getByText("Edited file")).toBeDefined();
});

test("file_manager in-progress shows 'Managing files'", () => {
  render(<ToolInvocationBadge toolInvocation={makeCallInvocation("file_manager")} />);
  expect(screen.getByText("Managing files")).toBeDefined();
});

test("file_manager completed shows 'Updated files'", () => {
  render(<ToolInvocationBadge toolInvocation={makeResultInvocation("file_manager")} />);
  expect(screen.getByText("Updated files")).toBeDefined();
});

test("unknown tool in-progress shows 'Working...'", () => {
  render(<ToolInvocationBadge toolInvocation={makeCallInvocation("unknown_tool")} />);
  expect(screen.getByText("Working...")).toBeDefined();
});

test("unknown tool completed shows 'Done'", () => {
  render(<ToolInvocationBadge toolInvocation={makeResultInvocation("unknown_tool")} />);
  expect(screen.getByText("Done")).toBeDefined();
});

test("shows spinner when in-progress", () => {
  const { container } = render(
    <ToolInvocationBadge toolInvocation={makeCallInvocation("str_replace_editor")} />
  );
  const svg = container.querySelector("svg");
  expect(svg).toBeDefined();
  expect(svg?.getAttribute("class")).toContain("animate-spin");
});

test("no green dot when in-progress", () => {
  const { container } = render(
    <ToolInvocationBadge toolInvocation={makeCallInvocation("str_replace_editor")} />
  );
  expect(container.querySelector(".bg-emerald-500")).toBeNull();
});

test("shows green dot when completed", () => {
  const { container } = render(
    <ToolInvocationBadge toolInvocation={makeResultInvocation("str_replace_editor")} />
  );
  expect(container.querySelector(".bg-emerald-500")).toBeDefined();
});

test("no spinner when completed", () => {
  const { container } = render(
    <ToolInvocationBadge toolInvocation={makeResultInvocation("str_replace_editor")} />
  );
  expect(container.querySelector(".animate-spin")).toBeNull();
});
