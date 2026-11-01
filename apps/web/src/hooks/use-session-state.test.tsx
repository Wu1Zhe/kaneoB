import { act, cleanup, renderHook } from "@testing-library/react";
import { afterEach, describe, expect, it } from "vite-plus/test";
import { useSessionState } from "./use-session-state";
afterEach(() => {
  cleanup();
  sessionStorage.clear();
});
describe("project-scoped session state", () => {
  it("keeps filters with their original project when switching project keys", () => {
    const { result, rerender } = renderHook(
      ({ id }) => useSessionState(`ideas:${id}`, { search: "" }),
      { initialProps: { id: "one" } },
    );
    act(() => result.current[1]({ search: "workflow" }));
    rerender({ id: "two" });
    expect(result.current[0].search).toBe("");
    act(() => result.current[1]({ search: "automation" }));
    rerender({ id: "one" });
    expect(result.current[0].search).toBe("workflow");
  });
});
