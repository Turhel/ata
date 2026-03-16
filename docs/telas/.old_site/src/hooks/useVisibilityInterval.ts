import { useEffect, useRef } from "react";

type Options = {
  intervalMs: number;
  hiddenIntervalMs?: number;
  enabled?: boolean;
  allowInBackground?: boolean;
};

export function useVisibilityInterval(callback: () => void, options: Options) {
  const { intervalMs, hiddenIntervalMs = 300_000, enabled = true, allowInBackground = false } = options;
  const savedCallback = useRef(callback);

  useEffect(() => {
    savedCallback.current = callback;
  }, [callback]);

  useEffect(() => {
    if (!enabled) return;
    let timer: ReturnType<typeof setInterval> | null = null;

    const start = (ms: number) => {
      if (timer) clearInterval(timer);
      timer = setInterval(() => savedCallback.current(), ms);
    };

    const handleVisibility = () => {
      const paused = document.hidden || !document.hasFocus?.();
      if (paused && !allowInBackground) {
        if (timer) clearInterval(timer);
        timer = null;
        return;
      }

      const ms = document.hidden ? hiddenIntervalMs : intervalMs;
      start(ms);
    };

    handleVisibility();
    document.addEventListener("visibilitychange", handleVisibility);
    window.addEventListener("focus", handleVisibility, { capture: true });
    window.addEventListener("blur", handleVisibility, { capture: true });

    return () => {
      if (timer) clearInterval(timer);
      document.removeEventListener("visibilitychange", handleVisibility);
      window.removeEventListener("focus", handleVisibility, { capture: true } as any);
      window.removeEventListener("blur", handleVisibility, { capture: true } as any);
    };
  }, [intervalMs, hiddenIntervalMs, enabled, allowInBackground]);
}
