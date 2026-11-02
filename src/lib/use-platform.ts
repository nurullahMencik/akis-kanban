import { useSyncExternalStore } from "react";

const noop = () => () => {};

/** "⌘" on Apple platforms, "Ctrl" elsewhere (and during prerendering). */
export function useModKey(): string {
  return useSyncExternalStore(
    noop,
    () => (/Mac|iPhone|iPad/.test(navigator.userAgent) ? "⌘" : "Ctrl"),
    () => "Ctrl",
  );
}
