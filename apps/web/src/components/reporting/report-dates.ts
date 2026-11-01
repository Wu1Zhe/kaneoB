const DAY = 86400000;
export function shanghaiDay(at = Date.now()) {
  return new Date(at + 8 * 3600000).toISOString().slice(0, 10);
}
export function reportBounds(start: string, end: string) {
  return {
    since: new Date(`${start}T00:00:00+08:00`).toISOString(),
    until: new Date(
      new Date(`${end}T00:00:00+08:00`).getTime() + DAY - 1,
    ).toISOString(),
  };
}
export function reportPreset(preset: "week" | "lastWeek" | "twelveWeeks") {
  const now = new Date(Date.now() + 8 * 3600000);
  now.setUTCHours(0, 0, 0, 0);
  const monday = now.getTime() - ((now.getUTCDay() + 6) % 7) * DAY;
  if (preset === "lastWeek")
    return {
      start: new Date(monday - 7 * DAY).toISOString().slice(0, 10),
      end: new Date(monday - DAY).toISOString().slice(0, 10),
    };
  return {
    start: new Date(monday - (preset === "twelveWeeks" ? 77 : 0) * DAY)
      .toISOString()
      .slice(0, 10),
    end: shanghaiDay(),
  };
}
