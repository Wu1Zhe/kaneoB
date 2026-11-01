import type { IdeaState } from "@/fetchers/ideas";
export const IDEA_STATES: Array<{
  id: IdeaState;
  label:
    | "ideas:states.inbox"
    | "ideas:states.evaluating"
    | "ideas:states.adopted"
    | "ideas:states.parked";
  className: string;
}> = [
  {
    id: "inbox",
    label: "ideas:states.inbox",
    className: "bg-amber-500/10 text-amber-700 dark:text-amber-300",
  },
  {
    id: "evaluating",
    label: "ideas:states.evaluating",
    className: "bg-sky-500/10 text-sky-700 dark:text-sky-300",
  },
  {
    id: "adopted",
    label: "ideas:states.adopted",
    className: "bg-emerald-500/10 text-emerald-700 dark:text-emerald-300",
  },
  {
    id: "parked",
    label: "ideas:states.parked",
    className: "bg-muted text-muted-foreground",
  },
];
export function parseIdeaTags(input: string) {
  return [
    ...new Set(
      input
        .split(/[,，\n]/)
        .map((value) => value.trim())
        .filter(Boolean),
    ),
  ];
}
