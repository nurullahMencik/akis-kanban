import { applyPatches, enablePatches, produceWithPatches, type Patch } from "immer";
import { createStore } from "zustand/vanilla";
import { createId as defaultCreateId } from "@/lib/id";
import type { ColumnCategory, ID, KanbanData, LabelColor } from "@/lib/types";
import { emptyData } from "@/lib/types";
import * as ops from "./operations";

enablePatches();

export type HistoryLabel =
  | "createCard"
  | "updateCard"
  | "moveCard"
  | "reorderCard"
  | "deleteCard"
  | "checklist"
  | "createColumn"
  | "renameColumn"
  | "wipLimit"
  | "columnCategory"
  | "moveColumn"
  | "deleteColumn"
  | "createBoard"
  | "renameBoard"
  | "deleteBoard"
  | "createLabel";

export interface HistoryEntry {
  label: HistoryLabel;
  patches: Patch[];
  inverse: Patch[];
}

/** Storage adapter. The store only talks to this interface, which keeps it testable. */
export interface Persistence {
  load(): Promise<KanbanData | null>;
  /** Persist the entities touched by `patches`, reading their new values from `next`. */
  write(patches: readonly Patch[], next: KanbanData): Promise<void>;
  replaceAll(data: KanbanData): Promise<void>;
}

export interface StoreOptions {
  persistence?: Persistence;
  now?: () => number;
  createId?: (prefix: string) => ID;
  historyLimit?: number;
  /** Builds the sample dataset; used on first launch and for "reset sample data". */
  sample?: (now: number) => KanbanData;
}

export interface HistoryEvent {
  kind: "undo" | "redo";
  label: HistoryLabel;
  seq: number;
}

export interface KanbanActions {
  init(): Promise<void>;
  createCard(input: ops.NewCardInput): ID | null;
  updateCard(cardId: ID, patch: ops.CardPatch): void;
  moveCard(cardId: ID, toColumnId: ID, beforeCardId: ID | null): void;
  deleteCard(cardId: ID): void;
  addChecklistItem(cardId: ID, text: string): void;
  toggleChecklistItem(cardId: ID, itemId: ID): void;
  removeChecklistItem(cardId: ID, itemId: ID): void;
  createColumn(boardId: ID, name: string, category?: ColumnCategory): ID | null;
  renameColumn(columnId: ID, name: string): void;
  setColumnWipLimit(columnId: ID, limit: number | null): void;
  setColumnCategory(columnId: ID, category: ColumnCategory): void;
  moveColumn(boardId: ID, columnId: ID, toIndex: number): void;
  deleteColumn(columnId: ID): boolean;
  createBoard(input: ops.NewBoardInput): ID | null;
  renameBoard(boardId: ID, name: string): void;
  deleteBoard(boardId: ID): boolean;
  createLabel(boardId: ID, name: string, color: LabelColor): ID | null;
  undo(): boolean;
  redo(): boolean;
  /** Replaces everything (import / reset). Clears undo history. */
  replaceAll(data: KanbanData): Promise<void>;
  resetToSample(): Promise<void>;
  /** Resolves once all queued writes reached the persistence layer. */
  flush(): Promise<void>;
}

export interface KanbanState {
  status: "idle" | "loading" | "ready" | "error";
  data: KanbanData;
  past: HistoryEntry[];
  future: HistoryEntry[];
  lastHistoryEvent: HistoryEvent | null;
  persistError: boolean;
  actions: KanbanActions;
}

export function createKanbanStore(options: StoreOptions = {}) {
  const now = options.now ?? (() => Date.now());
  const createId = options.createId ?? defaultCreateId;
  const historyLimit = options.historyLimit ?? 100;
  const persistence = options.persistence;
  let writeChain: Promise<void> = Promise.resolve();
  let historySeq = 0;

  return createStore<KanbanState>()((set, get) => {
    const enqueue = (task: () => Promise<void>) => {
      writeChain = writeChain.then(task).catch((error: unknown) => {
        console.error("[akis] persistence failed", error);
        set({ persistError: true });
      });
    };

    const context = (data: KanbanData): ops.OpContext => ({
      now: now(),
      actorId: Object.values(data.members).find((member) => member.isCurrentUser)?.id ?? null,
      createId,
    });

    /** Runs a mutation, records its patches for undo and persists the result. */
    function commit<T>(label: HistoryLabel, recipe: (draft: KanbanData, ctx: ops.OpContext) => T): T {
      const { data, past } = get();
      const ctx = context(data);
      let result!: T;
      const [next, patches, inverse] = produceWithPatches(data, (draft: KanbanData) => {
        result = recipe(draft, ctx);
      });
      if (patches.length === 0) return result;
      set({
        data: next,
        past: [...past, { label, patches, inverse }].slice(-historyLimit),
        future: [],
      });
      if (persistence) enqueue(() => persistence.write(patches, next));
      return result;
    }

    function travel(kind: "undo" | "redo"): boolean {
      const { past, future, data } = get();
      const stack = kind === "undo" ? past : future;
      const entry = stack[stack.length - 1];
      if (!entry) return false;
      const patches = kind === "undo" ? entry.inverse : entry.patches;
      const next = applyPatches(data, patches);
      historySeq += 1;
      set({
        data: next,
        past: kind === "undo" ? past.slice(0, -1) : [...past, entry],
        future: kind === "undo" ? [...future, entry] : future.slice(0, -1),
        lastHistoryEvent: { kind, label: entry.label, seq: historySeq },
      });
      if (persistence) enqueue(() => persistence.write(patches, next));
      return true;
    }

    const actions: KanbanActions = {
      async init() {
        if (get().status === "loading" || get().status === "ready") return;
        set({ status: "loading" });
        try {
          const stored = persistence ? await persistence.load() : null;
          if (stored && Object.keys(stored.boards).length > 0) {
            set({ data: stored, status: "ready" });
            return;
          }
          const sample = options.sample ? options.sample(now()) : emptyData();
          set({ data: sample, status: "ready" });
          if (persistence) enqueue(() => persistence.replaceAll(sample));
        } catch (error) {
          console.error("[akis] failed to load data", error);
          set({ status: "error" });
        }
      },
      createCard: (input) => commit("createCard", (d, ctx) => ops.createCard(d, ctx, input)),
      updateCard: (cardId, patch) => commit("updateCard", (d, ctx) => ops.updateCard(d, ctx, cardId, patch)),
      moveCard: (cardId, toColumnId, beforeCardId) => {
        const card = get().data.cards[cardId];
        const label: HistoryLabel = card && card.columnId === toColumnId ? "reorderCard" : "moveCard";
        commit(label, (d, ctx) => ops.moveCard(d, ctx, cardId, toColumnId, beforeCardId));
      },
      deleteCard: (cardId) => commit("deleteCard", (d) => ops.deleteCard(d, cardId)),
      addChecklistItem: (cardId, text) =>
        commit("checklist", (d, ctx) => ops.addChecklistItem(d, ctx, cardId, text)),
      toggleChecklistItem: (cardId, itemId) =>
        commit("checklist", (d, ctx) => ops.toggleChecklistItem(d, ctx, cardId, itemId)),
      removeChecklistItem: (cardId, itemId) =>
        commit("checklist", (d, ctx) => ops.removeChecklistItem(d, ctx, cardId, itemId)),
      createColumn: (boardId, name, category) =>
        commit("createColumn", (d, ctx) => ops.createColumn(d, ctx, boardId, name, category)),
      renameColumn: (columnId, name) => commit("renameColumn", (d) => ops.renameColumn(d, columnId, name)),
      setColumnWipLimit: (columnId, limit) =>
        commit("wipLimit", (d) => ops.setColumnWipLimit(d, columnId, limit)),
      setColumnCategory: (columnId, category) =>
        commit("columnCategory", (d) => ops.setColumnCategory(d, columnId, category)),
      moveColumn: (boardId, columnId, toIndex) =>
        commit("moveColumn", (d) => ops.moveColumn(d, boardId, columnId, toIndex)),
      deleteColumn: (columnId) => commit("deleteColumn", (d) => ops.deleteColumn(d, columnId)),
      createBoard: (input) => commit("createBoard", (d, ctx) => ops.createBoard(d, ctx, input)),
      renameBoard: (boardId, name) => commit("renameBoard", (d) => ops.renameBoard(d, boardId, name)),
      deleteBoard: (boardId) => commit("deleteBoard", (d) => ops.deleteBoard(d, boardId)),
      createLabel: (boardId, name, color) =>
        commit("createLabel", (d, ctx) => ops.createLabel(d, ctx, boardId, name, color)),
      undo: () => travel("undo"),
      redo: () => travel("redo"),
      async replaceAll(data) {
        set({ data, past: [], future: [], status: "ready" });
        if (persistence) enqueue(() => persistence.replaceAll(data));
        await writeChain;
      },
      async resetToSample() {
        const sample = options.sample ? options.sample(now()) : emptyData();
        await actions.replaceAll(sample);
      },
      flush: () => writeChain,
    };

    return {
      status: "idle",
      data: emptyData(),
      past: [],
      future: [],
      lastHistoryEvent: null,
      persistError: false,
      actions,
    };
  });
}

export type KanbanStore = ReturnType<typeof createKanbanStore>;
