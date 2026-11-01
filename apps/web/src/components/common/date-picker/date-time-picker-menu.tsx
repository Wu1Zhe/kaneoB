import { useId, useState, type ComponentProps } from "react";
import { useTranslation } from "react-i18next";
import { stopCardEvents } from "@/components/task-chips/stop-card-events";
import { Button } from "@/components/ui/button";
import { formatDateTime } from "@/lib/format";
import { DatePickerMenu } from "./date-picker-menu";

const TIMES = Array.from(
  { length: 48 },
  (_, index) =>
    `${String(Math.floor(index / 2)).padStart(2, "0")}:${index % 2 === 0 ? "00" : "30"}`,
);

export function DateTimePickerMenu({
  value,
  onChange,
  ...props
}: ComponentProps<typeof DatePickerMenu>) {
  const { t } = useTranslation();
  const timeId = useId();
  const [day, setDay] = useState(value);
  const [time, setTime] = useState(() =>
    value
      ? TIMES[value.getHours() * 2 + Math.floor(value.getMinutes() / 30)]
      : "00:00",
  );
  const selected = day ? new Date(day) : null;
  const [hours, minutes] = time.split(":").map(Number);
  selected?.setHours(hours, minutes, 0, 0);
  const beforeStart = Boolean(
    selected && props.bounds?.before && selected < props.bounds.before,
  );

  return (
    <div {...stopCardEvents}>
      <DatePickerMenu
        {...props}
        value={day}
        onChange={(date) => {
          setDay(date);
          if (!date) onChange(null);
        }}
      />
      <div className="space-y-2 border-t border-border p-2.5">
        <div className="flex items-center justify-between gap-2">
          <label htmlFor={timeId} className="text-sm text-muted-foreground">
            {t("tasks:datePicker.time")}
          </label>
          <select
            id={timeId}
            value={time}
            onChange={(event) => setTime(event.target.value)}
            className="h-8 rounded-md border border-input bg-background px-2 text-sm tabular-nums outline-none focus-visible:ring-2 focus-visible:ring-ring"
          >
            {TIMES.map((option) => (
              <option key={option} value={option}>
                {option}
              </option>
            ))}
          </select>
        </div>
        {selected && (
          <p className="text-xs text-muted-foreground" role="status">
            {beforeStart
              ? t("tasks:datePicker.beforeStart", {
                  date: formatDateTime(selected),
                })
              : formatDateTime(selected)}
          </p>
        )}
        <Button
          type="button"
          size="sm"
          className="w-full"
          disabled={!selected || beforeStart}
          onClick={() => onChange(selected)}
        >
          {t("tasks:datePicker.apply")}
        </Button>
      </div>
    </div>
  );
}
