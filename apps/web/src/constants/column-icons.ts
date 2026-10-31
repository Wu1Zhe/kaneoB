import {
  Archive,
  CheckCircle2,
  Circle,
  CircleDashed,
  CircleDot,
  ClipboardCheck,
  Clock,
  Search,
} from "lucide-react";
import projectIcons from "./project-icons";

export const DEFAULT_COLUMN_ICON_NAMES = {
  "to-do": "Circle",
  "in-progress": "CircleDot",
  "pending-acceptance": "ClipboardCheck",
  "in-review": "Search",
  done: "CheckCircle2",
  archived: "Archive",
  planned: "Clock",
} as const;

const columnIcons = {
  ...projectIcons,
  Circle,
  CircleDot,
  ClipboardCheck,
  Search,
  CheckCircle2,
  CircleDashed,
  Clock,
  Archive,
};

export type ColumnIconName = keyof typeof columnIcons;

export default columnIcons;
