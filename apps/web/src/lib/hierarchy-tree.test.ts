import { expect, it } from "vite-plus/test";
import { buildHierarchyRoots } from "./hierarchy-tree";

type Node = { id: string };

function children(entries: Array<[string, string[]]>): Map<string, string[]> {
  return new Map(entries);
}

it("keeps only tasks without a visible parent as roots", () => {
  const tasks: Node[] = [{ id: "parent" }, { id: "child" }, { id: "other" }];
  const roots = buildHierarchyRoots(tasks, children([["parent", ["child"]]]));

  expect(roots.map((task) => task.id)).toEqual(["parent", "other"]);
});

it("promotes a task whose parent was filtered out", () => {
  const tasks: Node[] = [{ id: "child" }];
  const roots = buildHierarchyRoots(
    tasks,
    children([["hidden-parent", ["child"]]]),
  );

  expect(roots.map((task) => task.id)).toEqual(["child"]);
});

it("surfaces a parent-only cycle instead of dropping it", () => {
  const tasks: Node[] = [{ id: "a" }, { id: "b" }];
  const roots = buildHierarchyRoots(
    tasks,
    children([
      ["a", ["b"]],
      ["b", ["a"]],
    ]),
  );

  expect(roots.map((task) => task.id)).toEqual(["a"]);
});

it("keeps a separate cycle visible beside a real root", () => {
  const tasks: Node[] = [{ id: "root" }, { id: "a" }, { id: "b" }];
  const roots = buildHierarchyRoots(
    tasks,
    children([
      ["root", ["leaf"]],
      ["a", ["b"]],
      ["b", ["a"]],
    ]),
  );

  expect(roots.map((task) => task.id)).toEqual(["root", "a"]);
});

it("preserves display order for root rows", () => {
  const tasks: Node[] = [{ id: "second" }, { id: "child" }, { id: "first" }];
  const roots = buildHierarchyRoots(tasks, children([["first", ["child"]]]));

  expect(roots.map((task) => task.id)).toEqual(["second", "first"]);
});
