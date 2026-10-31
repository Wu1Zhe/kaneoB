/**
 * Picks the tasks that start a hierarchy view.
 *
 * Unlike the list view, which groups by status and repeats a subtask beneath
 * every expanded parent, the hierarchy view walks each connected component
 * once. A task whose parent was filtered out of the project is promoted to a
 * root: the view cannot render an edge to a row it does not have.
 *
 * Relations form a graph rather than a tree — several parents, even cycles,
 * are possible — so a depth-first sweep is used to collect components. The
 * returned roots are ordered like `tasks`, which keeps the board's status and
 * position order for top-level rows.
 */
export function buildHierarchyRoots<T extends { id: string }>(
  tasks: readonly T[],
  children: Map<string, readonly string[]>,
): T[] {
  const visible = new Set(tasks.map((task) => task.id));
  const hasVisibleParent = new Set<string>();

  for (const [parentId, childIds] of children) {
    if (!visible.has(parentId)) continue;
    for (const childId of childIds) {
      if (childId !== parentId && visible.has(childId)) {
        hasVisibleParent.add(childId);
      }
    }
  }

  const reachable = new Set<string>();
  const visit = (taskId: string) => {
    if (reachable.has(taskId)) return;
    reachable.add(taskId);
    for (const childId of children.get(taskId) ?? []) {
      if (childId !== taskId && visible.has(childId)) visit(childId);
    }
  };

  const roots: T[] = [];

  // Tasks with no visible parent come first, in display order.
  for (const task of tasks) {
    if (hasVisibleParent.has(task.id)) continue;
    roots.push(task);
    visit(task.id);
  }

  // A parent-only cycle has no root. Surface its first unreachable member so
  // its component stays visible; the traversal above then marks the rest.
  for (const task of tasks) {
    if (reachable.has(task.id)) continue;
    roots.push(task);
    visit(task.id);
  }

  return roots;
}
