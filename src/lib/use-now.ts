import { useSyncExternalStore } from "react";

let now = 0;
let timer: ReturnType<typeof setInterval> | undefined;
const listeners = new Set<() => void>();

function subscribe(listener: () => void) {
  listeners.add(listener);
  if (!timer) {
    timer = setInterval(() => {
      now = Date.now();
      for (const notify of listeners) notify();
    }, 60_000);
  }
  return () => {
    listeners.delete(listener);
    if (listeners.size === 0 && timer) {
      clearInterval(timer);
      timer = undefined;
    }
  };
}

function getSnapshot() {
  if (now === 0) now = Date.now();
  return now;
}

/** Current time, refreshed every minute. Keeps render functions pure (no Date.now() in render). */
export function useNow(): number {
  return useSyncExternalStore(subscribe, getSnapshot, () => 0);
}
