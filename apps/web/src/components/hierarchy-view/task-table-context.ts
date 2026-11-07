import { createContext } from "react";
import type { Widths } from "./column-widths";
export const TaskTableContext = createContext<{
  widths: Widths;
  resize: (id: string, width: number, commit: boolean) => void;
  reset: () => void;
} | null>(null);
