const ENGLISH_TERMS: Record<string, string> = {
  task: "requirement",
  tasks: "requirements",
  Task: "Requirement",
  Tasks: "Requirements",
  TASK: "REQUIREMENT",
  TASKS: "REQUIREMENTS",
  subtask: "subrequirement",
  subtasks: "subrequirements",
  Subtask: "Subrequirement",
  Subtasks: "Subrequirements",
  SUBTASK: "SUBREQUIREMENT",
  SUBTASKS: "SUBREQUIREMENTS",
};

// Rewrite translation templates before interpolation, preserving keys and user-provided values.
export function requirementCopy<T>(value: T): T {
  if (typeof value === "string") {
    return value
      .split(/(\{\{[\s\S]*?\}\})/g)
      .map((part, index) =>
        index % 2
          ? part
          : part
              .replaceAll("任务", "需求")
              .replaceAll("任務", "需求")
              .replace(
                /\b(?:subtasks?|tasks?)\b/gi,
                (term) => ENGLISH_TERMS[term] ?? term,
              ),
      )
      .join("") as T;
  }
  if (Array.isArray(value)) return value.map(requirementCopy) as T;
  if (value && typeof value === "object") {
    return Object.fromEntries(
      Object.entries(value).map(([key, item]) => [key, requirementCopy(item)]),
    ) as T;
  }
  return value;
}
