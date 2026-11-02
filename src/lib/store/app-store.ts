import { useStore } from "zustand";
import { createDexiePersistence } from "@/lib/db/dexie-persistence";
import { createSampleData } from "@/lib/seed/sample-data";
import { createKanbanStore, type KanbanState } from "./kanban-store";

/** The app-wide store. Persistence only exists in the browser; prerendering uses an empty store. */
export const kanbanStore = createKanbanStore({
  persistence: typeof window === "undefined" ? undefined : createDexiePersistence(),
  sample: createSampleData,
});

export const kanbanActions = kanbanStore.getState().actions;

export function useKanban<T>(selector: (state: KanbanState) => T): T {
  return useStore(kanbanStore, selector);
}
