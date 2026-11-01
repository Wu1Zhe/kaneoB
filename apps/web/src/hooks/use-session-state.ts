import { useCallback, useRef, useState, type SetStateAction } from "react";

function read<T>(key: string, fallback: T): T {
  try {
    const stored = sessionStorage.getItem(key);
    return stored === null ? fallback : JSON.parse(stored);
  } catch {
    return fallback;
  }
}

export function useSessionState<T>(key: string, fallback: T) {
  const fallbackRef = useRef(fallback);
  fallbackRef.current = fallback;
  const [stored, setStored] = useState(() => ({
    key,
    value: read(key, fallback),
  }));
  let value = stored.value;
  if (stored.key !== key) {
    value = read(key, fallback);
    setStored({ key, value });
  }
  const setValue = useCallback(
    (action: SetStateAction<T>) => {
      setStored((previous) => {
        const current =
          previous.key === key
            ? previous.value
            : read(key, fallbackRef.current);
        const next =
          typeof action === "function"
            ? (action as (value: T) => T)(current)
            : action;
        if (previous.key === key && Object.is(next, previous.value))
          return previous;
        try {
          sessionStorage.setItem(key, JSON.stringify(next));
        } catch {
          // Browsers can disable session storage.
        }
        return { key, value: next };
      });
    },
    [key],
  );
  return [value, setValue] as const;
}
