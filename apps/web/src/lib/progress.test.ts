import { describe, expect, it } from "vite-plus/test";
import { buildProgressMap } from "./progress";

function task(progress?: number | null, weight?: number | null) {
  return { progress, weight };
}

describe("buildProgressMap", () => {
  it("keeps a leaf's own progress", () => {
    const map = buildProgressMap(
      new Map([["a", task(40)]]),
      new Map(),
    );
    expect(map.get("a")).toBe(40);
  });

  it("averages unweighted subtasks", () => {
    const map = buildProgressMap(
      new Map([
        ["parent", task(0)],
        ["a", task(100)],
        ["b", task(0)],
      ]),
      new Map([["parent", ["a", "b"]]]),
    );
    expect(map.get("parent")).toBe(50);
  });

  it("weights subtask contributions", () => {
    const map = buildProgressMap(
      new Map([
        ["parent", task(0)],
        ["a", task(100, 3)],
        ["b", task(0, 1)],
      ]),
      new Map([["parent", ["a", "b"]]]),
    );
    expect(map.get("parent")).toBe(75);
  });

  it("rolls up nested levels", () => {
    const map = buildProgressMap(
      new Map([
        ["root", task(0)],
        ["middle", task(0)],
        ["leaf", task(60)],
      ]),
      new Map([
        ["root", ["middle"]],
        ["middle", ["leaf"]],
      ]),
    );
    expect(map.get("middle")).toBe(60);
    expect(map.get("root")).toBe(60);
  });

  it("treats a missing or invalid weight as 1", () => {
    const map = buildProgressMap(
      new Map([
        ["parent", task(0)],
        ["a", task(100, 0)],
        ["b", task(0, Number.NaN)],
      ]),
      new Map([["parent", ["a", "b"]]]),
    );
    expect(map.get("parent")).toBe(50);
  });

  it("ignores children outside the loaded task set", () => {
    const map = buildProgressMap(
      new Map([["parent", task(10)]]),
      new Map([["parent", ["missing"]]]),
    );
    expect(map.get("parent")).toBe(10);
  });

  it("stops at a cycle instead of recursing forever", () => {
    const map = buildProgressMap(
      new Map([
        ["a", task(20)],
        ["b", task(80)],
      ]),
      new Map([
        ["a", ["b"]],
        ["b", ["a"]],
      ]),
    );
    expect(map.get("a")).toBe(20);
    expect(map.get("b")).toBe(20);
  });
});
