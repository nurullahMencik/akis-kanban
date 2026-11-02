import type { Patch } from "immer";
import { beforeEach, describe, expect, it, vi } from "vitest";
import type { KanbanData } from "@/lib/types";
import { emptyData } from "@/lib/types";
import { createKanbanStore, type Persistence } from "./kanban-store";

const DEFAULT_COLUMNS = [
  { name: "Backlog", category: "backlog" as const },
  { name: "Yapılacak", category: "todo" as const },
  { name: "Devam Eden", category: "active" as const, wipLimit: 2 },
  { name: "Tamamlandı", category: "done" as const },
];

function setup(persistence?: Persistence) {
  let clock = 1_000;
  let ids = 0;
  const store = createKanbanStore({
    persistence,
    now: () => (clock += 1_000),
    createId: (prefix) => `${prefix}-${++ids}`,
  });
  const { actions } = store.getState();
  const boardId = actions.createBoard({ name: "Mobil Bankacılık", columns: DEFAULT_COLUMNS })!;
  const columns = () => store.getState().data.boards[boardId]!.columnIds.map((id) => store.getState().data.columns[id]!);
  const [backlog, todo, doing, done] = columns().map((column) => column.id) as [string, string, string, string];
  // Board creation itself is not something the tests want to undo.
  store.setState({ past: [] });
  return { store, actions, boardId, backlog, todo, doing, done, columns };
}

const activitiesOf = (data: KanbanData, cardId: string) =>
  Object.values(data.activities).filter((activity) => activity.cardId === cardId);

describe("board and column operations", () => {
  it("creates a board with ordered columns, a derived key and WIP limits", () => {
    const { store, boardId, columns } = setup();
    const board = store.getState().data.boards[boardId]!;
    expect(board.key).toBe("MB");
    expect(columns().map((column) => column.name)).toEqual(["Backlog", "Yapılacak", "Devam Eden", "Tamamlandı"]);
    expect(columns()[2]!.wipLimit).toBe(2);
  });

  it("inserts new columns before the done column and reorders them", () => {
    const { actions, boardId, columns } = setup();
    const review = actions.createColumn(boardId, "  İncelemede ")!;
    expect(columns().map((column) => column.name)).toEqual([
      "Backlog",
      "Yapılacak",
      "Devam Eden",
      "İncelemede",
      "Tamamlandı",
    ]);
    actions.moveColumn(boardId, review, 0);
    expect(columns()[0]!.id).toBe(review);
  });

  it("validates WIP limits and only deletes empty columns", () => {
    const { store, actions, boardId, todo, doing } = setup();
    actions.setColumnWipLimit(doing, 3.7);
    actions.setColumnWipLimit(todo, -1);
    expect(store.getState().data.columns[doing]!.wipLimit).toBe(3);
    expect(store.getState().data.columns[todo]!.wipLimit).toBeNull();
    actions.createCard({ boardId, columnId: todo, title: "Kart limit artırım ekranı" });
    expect(actions.deleteColumn(todo)).toBe(false);
    expect(actions.deleteColumn(doing)).toBe(true);
  });
});

describe("card operations", () => {
  it("creates cards on top of the todo column with sequential numbers and a created event", () => {
    const { store, actions, boardId, todo } = setup();
    const first = actions.createCard({ boardId, title: "IBAN doğrulama" })!;
    const second = actions.createCard({ boardId, title: "OTP SMS otomatik doldurma", priority: "high" })!;
    const data = store.getState().data;
    expect(data.columns[todo]!.cardIds).toEqual([second, first]);
    expect(data.cards[first]!.number).toBe(1);
    expect(data.cards[second]!.number).toBe(2);
    expect(data.cards[second]!.priority).toBe("high");
    expect(activitiesOf(data, first)).toMatchObject([{ type: "created", toColumnId: todo }]);
  });

  it("rejects empty titles", () => {
    const { actions, boardId, store } = setup();
    expect(actions.createCard({ boardId, title: "   " })).toBeNull();
    expect(store.getState().past).toHaveLength(0);
  });

  it("moves a card across columns, logging a moved event", () => {
    const { store, actions, boardId, todo, doing } = setup();
    const id = actions.createCard({ boardId, title: "FaceID entegrasyonu" })!;
    actions.moveCard(id, doing, null);
    const data = store.getState().data;
    expect(data.cards[id]!.columnId).toBe(doing);
    expect(data.columns[todo]!.cardIds).toEqual([]);
    expect(data.columns[doing]!.cardIds).toEqual([id]);
    expect(activitiesOf(data, id).map((activity) => activity.type)).toEqual(["created", "moved"]);
    expect(store.getState().past.at(-1)?.label).toBe("moveCard");
  });

  it("positions cards relative to a neighbour, which stays correct when others are filtered out", () => {
    const { store, actions, boardId, todo, doing } = setup();
    const a = actions.createCard({ boardId, columnId: doing, title: "A", position: "bottom" })!;
    const b = actions.createCard({ boardId, columnId: doing, title: "B", position: "bottom" })!;
    const c = actions.createCard({ boardId, columnId: doing, title: "C", position: "bottom" })!;
    const moving = actions.createCard({ boardId, columnId: todo, title: "Taşınan" })!;
    actions.moveCard(moving, doing, c);
    expect(store.getState().data.columns[doing]!.cardIds).toEqual([a, b, moving, c]);
    actions.moveCard(moving, doing, a);
    expect(store.getState().data.columns[doing]!.cardIds).toEqual([moving, a, b, c]);
    expect(store.getState().past.at(-1)?.label).toBe("reorderCard");
    expect(activitiesOf(store.getState().data, moving).filter((activity) => activity.type === "moved")).toHaveLength(1);
  });

  it("records one updated event per changed field and skips no-op updates", () => {
    const { store, actions, boardId } = setup();
    const id = actions.createCard({ boardId, title: "Hesap özeti" })!;
    const before = store.getState().past.length;
    actions.updateCard(id, { title: "Hesap özeti", priority: "medium" });
    expect(store.getState().past.length).toBe(before);
    actions.updateCard(id, { title: "Hesap özeti PDF dışa aktarımı", priority: "urgent", estimate: 5 });
    const updates = activitiesOf(store.getState().data, id).filter((activity) => activity.type === "updated");
    expect(updates.map((activity) => (activity.type === "updated" ? activity.field : null))).toEqual([
      "title",
      "priority",
      "estimate",
    ]);
    expect(store.getState().data.cards[id]!.estimate).toBe(5);
  });

  it("toggles checklist items and deletes cards together with their history", () => {
    const { store, actions, boardId, todo } = setup();
    const id = actions.createCard({ boardId, title: "Detox altyapısı" })!;
    actions.addChecklistItem(id, "CI simülatörü");
    const item = store.getState().data.cards[id]!.checklist[0]!;
    actions.toggleChecklistItem(id, item.id);
    expect(store.getState().data.cards[id]!.checklist[0]!.done).toBe(true);
    actions.deleteCard(id);
    const data = store.getState().data;
    expect(data.cards[id]).toBeUndefined();
    expect(data.columns[todo]!.cardIds).not.toContain(id);
    expect(activitiesOf(data, id)).toHaveLength(0);
  });
});

describe("undo / redo", () => {
  it("restores the exact previous state, including the activity log", () => {
    const { store, actions, boardId, doing } = setup();
    const id = actions.createCard({ boardId, title: "Sanal kart" })!;
    const afterCreate = store.getState().data;
    actions.moveCard(id, doing, null);
    expect(actions.undo()).toBe(true);
    expect(store.getState().data).toEqual(afterCreate);
    expect(store.getState().lastHistoryEvent).toMatchObject({ kind: "undo", label: "moveCard" });
    expect(actions.redo()).toBe(true);
    expect(store.getState().data.cards[id]!.columnId).toBe(doing);
  });

  it("undoes card creation including the board's card counter", () => {
    const { store, actions, boardId } = setup();
    const id = actions.createCard({ boardId, title: "QR ile para çekme" })!;
    actions.undo();
    expect(store.getState().data.cards[id]).toBeUndefined();
    expect(store.getState().data.boards[boardId]!.nextCardNumber).toBe(1);
  });

  it("walks back through several steps and clears the redo stack on a new change", () => {
    const { store, actions, boardId, doing, done } = setup();
    const id = actions.createCard({ boardId, title: "Biyometrik giriş" })!;
    actions.moveCard(id, doing, null);
    actions.moveCard(id, done, null);
    actions.undo();
    actions.undo();
    expect(store.getState().data.cards[id]!.columnId).not.toBe(doing);
    expect(store.getState().future).toHaveLength(2);
    actions.updateCard(id, { priority: "urgent" });
    expect(store.getState().future).toHaveLength(0);
    expect(actions.redo()).toBe(false);
  });

  it("returns false when there is nothing to undo and caps the history", () => {
    let clock = 0;
    const store = createKanbanStore({ historyLimit: 3, now: () => ++clock });
    const { actions } = store.getState();
    expect(actions.undo()).toBe(false);
    const boardId = actions.createBoard({ name: "Yaz Kampanyası", columns: DEFAULT_COLUMNS })!;
    for (const title of ["a", "b", "c", "d"]) actions.createCard({ boardId, title });
    expect(store.getState().past).toHaveLength(3);
  });
});

describe("persistence wiring", () => {
  let writes: { patches: readonly Patch[] }[];
  let persistence: Persistence;

  beforeEach(() => {
    writes = [];
    persistence = {
      load: vi.fn(async () => null),
      write: vi.fn(async (patches: readonly Patch[]) => {
        writes.push({ patches });
      }),
      replaceAll: vi.fn(async () => undefined),
    };
  });

  it("forwards commit, undo and redo patches to the adapter in order", async () => {
    const { actions, boardId, doing } = setup(persistence);
    const id = actions.createCard({ boardId, title: "Push bildirim izni" })!;
    actions.moveCard(id, doing, null);
    actions.undo();
    actions.redo();
    await actions.flush();
    // board creation + 2 commits + undo + redo
    expect(writes).toHaveLength(5);
    const tables = writes.map((write) => [...new Set(write.patches.map((patch) => patch.path[0]))].sort());
    expect(tables[2]).toEqual(["activities", "cards", "columns"]);
  });

  it("seeds sample data on first launch and persists it", async () => {
    const sample = emptyData();
    sample.boards.b = { id: "b", name: "Örnek", key: "ÖR", createdAt: 0, columnIds: [], nextCardNumber: 1, sprint: null };
    const store = createKanbanStore({ persistence, sample: () => sample });
    await store.getState().actions.init();
    await store.getState().actions.flush();
    expect(store.getState().status).toBe("ready");
    expect(store.getState().data.boards.b?.name).toBe("Örnek");
    expect(persistence.replaceAll).toHaveBeenCalledWith(sample);
  });

  it("prefers stored data over the sample", async () => {
    const stored = emptyData();
    stored.boards.s = { id: "s", name: "Kayıtlı", key: "KA", createdAt: 0, columnIds: [], nextCardNumber: 1, sprint: null };
    persistence.load = vi.fn(async () => stored);
    const store = createKanbanStore({ persistence, sample: () => emptyData() });
    await store.getState().actions.init();
    expect(store.getState().data.boards.s?.name).toBe("Kayıtlı");
    expect(persistence.replaceAll).not.toHaveBeenCalled();
  });
});
