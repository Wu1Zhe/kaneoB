const styles: Record<string, [string, string]> = {
  backlog: ["#687b76", "#e7eeeb"],
  discussing: ["#cb8c0d", "#fff2d5"],
  "requirement-planned": ["#ae7915", "#fff1cd"],
  design: ["#418eb8", "#e2f2fc"],
  dev: ["#2f70d5", "#e7efff"],
  "cross-test": ["#5b81cf", "#edf0ff"],
  uat: ["#8167d0", "#f0eafa"],
  pirun: ["#42a98a", "#e3f4ed"],
  prod: ["#197858", "#e0f1e8"],
  closed: ["#536661", "#e9eeec"],
  rejected: ["#d83b44", "#ffeaec"],
  "to-do": ["#738780", "#edf1ef"],
  "in-progress": ["#2f70d5", "#e7efff"],
  "pending-acceptance": ["#cb8c0d", "#fff2d5"],
  "in-review": ["#8167d0", "#f0eafa"],
  done: ["#197858", "#e0f1e8"],
};
export function statusColor(status: string) {
  return styles[status]?.[0] ?? "#687b76";
}
export function statusStyle(status: string) {
  const [color, backgroundColor] = styles[status] ?? styles.backlog!;
  return { color, backgroundColor };
}
