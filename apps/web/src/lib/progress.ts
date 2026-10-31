type ProgressSource = {
  progress?: number | null;
  weight?: number | null;
};

function normalizeProgress(value: number | null | undefined) {
  if (typeof value !== "number" || !Number.isFinite(value)) return 0;
  return Math.min(100, Math.max(0, value));
}

function normalizeWeight(value: number | null | undefined) {
  return typeof value === "number" && Number.isFinite(value) && value > 0
    ? value
    : 1;
}

/**
 * Resolves the progress shown for every task in a hierarchy graph.
 *
 * A leaf keeps its own reported percentage. A task with subtasks rolls them up
 * into a weighted average, so a heavy subtask moves the parent further than a
 * light one; each subtask contributes its own roll-up when it has children too.
 * Weight defaults to 1, which makes an unweighted parent a plain average.
 *
 * Relations are a graph, not a tree: a task may have several parents and the
 * edges may form a cycle. A cycle stops at the repeated task and counts its own
 * reported progress instead of recursing forever.
 */
export function buildProgressMap(
  tasksById: ReadonlyMap<string, ProgressSource>,
  children: ReadonlyMap<string, readonly string[]>,
): ReadonlyMap<string, number> {
  const resolved = new Map<string, number>();
  const visiting = new Set<string>();

  const resolve = (taskId: string): number => {
    const known = resolved.get(taskId);
    if (known !== undefined) return known;

    const ownProgress = normalizeProgress(tasksById.get(taskId)?.progress);
    if (visiting.has(taskId)) return ownProgress;
    visiting.add(taskId);

    const childIds = (children.get(taskId) ?? []).filter((childId) =>
      tasksById.has(childId),
    );

    let value = ownProgress;
    if (childIds.length > 0) {
      let weighted = 0;
      let totalWeight = 0;
      for (const childId of childIds) {
        const weight = normalizeWeight(tasksById.get(childId)?.weight);
        weighted += resolve(childId) * weight;
        totalWeight += weight;
      }
      if (totalWeight > 0) value = weighted / totalWeight;
    }

    visiting.delete(taskId);
    resolved.set(taskId, value);
    return value;
  };

  for (const taskId of tasksById.keys()) resolve(taskId);
  return resolved;
}
