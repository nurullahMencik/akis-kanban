"use client";

import { useEffect } from "react";
import { useI18n } from "@/lib/i18n/use-i18n";
import { kanbanActions, kanbanStore } from "@/lib/store/app-store";
import { useUi } from "@/lib/store/ui-store";
import { dragState } from "@/lib/drag-state";

function isTypingTarget(target: EventTarget | null): boolean {
  if (!(target instanceof HTMLElement)) return false;
  if (target.isContentEditable) return true;
  const tag = target.tagName;
  if (tag === "TEXTAREA" || tag === "SELECT") return true;
  if (tag !== "INPUT") return false;
  const type = (target as HTMLInputElement).type;
  return !["checkbox", "radio", "button", "submit", "reset"].includes(type);
}

/** App-wide keyboard shortcuts: ⌘/Ctrl+K, n, /, ?, ⌘/Ctrl+Z, ⌘/Ctrl+Shift+Z (and Ctrl+Y). */
export function GlobalShortcuts() {
  const { t } = useI18n();

  useEffect(() => {
    const ui = useUi.getState;

    const historyToast = (kind: "undo" | "redo") => {
      const { past, future } = kanbanStore.getState();
      const entry = kind === "undo" ? past.at(-1) : future.at(-1);
      const done = kind === "undo" ? kanbanActions.undo() : kanbanActions.redo();
      if (done && entry) ui().toast(t(kind === "undo" ? "history.undo" : "history.redo", { action: t(`history.${entry.label}`) }));
    };

    const onKeyDown = (event: KeyboardEvent) => {
      if (event.defaultPrevented || event.isComposing || dragState.active) return;
      const mod = event.metaKey || event.ctrlKey;
      const key = event.key.toLowerCase();

      if (mod && !event.altKey && key === "k") {
        event.preventDefault();
        ui().setPaletteOpen(!ui().paletteOpen);
        return;
      }

      const typing = isTypingTarget(event.target);
      if (mod && !event.altKey && (key === "z" || key === "y")) {
        if (typing) return; // let inputs keep their native text undo
        event.preventDefault();
        historyToast(key === "y" || event.shiftKey ? "redo" : "undo");
        return;
      }

      if (mod || event.altKey || typing) return;
      if (document.querySelector("dialog[open]")) return;

      if (event.key === "?") {
        event.preventDefault();
        ui().setShortcutsOpen(true);
      } else if (key === "n") {
        event.preventDefault();
        ui().openCreateCard();
      } else if (event.key === "/") {
        const search = document.getElementById("board-search");
        event.preventDefault();
        if (search) search.focus();
        else ui().setPaletteOpen(true);
      }
    };

    document.addEventListener("keydown", onKeyDown);
    return () => document.removeEventListener("keydown", onKeyDown);
  }, [t]);

  return null;
}
