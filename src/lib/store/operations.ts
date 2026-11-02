import type {
  Activity,
  Board,
  Card,
  CardField,
  ColumnCategory,
  ID,
  KanbanData,
  LabelColor,
  Priority,
} from "@/lib/types";

/**
 * Pure mutations on an immer draft of {@link KanbanData}.
 * Every user-visible change goes through one of these so that the store can
 * record immer patches for undo/redo and persistence.
 */
export interface OpContext {
  now: number;
  actorId: ID | null;
  createId: (prefix: string) => ID;
}

function log(d: KanbanData, ctx: OpContext, activity: DistributiveOmit<Activity, "id" | "at" | "actorId">) {
  const id = ctx.createId("act");
  d.activities[id] = { ...activity, id, at: ctx.now, actorId: ctx.actorId } as Activity;
}

type DistributiveOmit<T, K extends PropertyKey> = T extends unknown ? Omit<T, K> : never;

function sameIds(a: readonly ID[], b: readonly ID[]): boolean {
  return a.length === b.length && a.every((id, index) => id === b[index]);
}

/* ------------------------------------------------------------------ cards */

export interface NewCardInput {
  boardId: ID;
  columnId?: ID;
  title: string;
  description?: string;
  priority?: Priority;
  labelIds?: ID[];
  assigneeIds?: ID[];
  dueDate?: string | null;
  estimate?: number | null;
  inSprint?: boolean;
  /** Where to insert inside the column. Defaults to the top. */
  position?: "top" | "bottom";
}

/** Picks the column new cards land in when none is given: first "todo", else first column. */
export function defaultColumnId(d: KanbanData, boardId: ID): ID | undefined {
  const board = d.boards[boardId];
  if (!board) return undefined;
  const todo = board.columnIds.find((id) => d.columns[id]?.category === "todo");
  return todo ?? board.columnIds[0];
}

export function createCard(d: KanbanData, ctx: OpContext, input: NewCardInput): ID | null {
  const board = d.boards[input.boardId];
  const title = input.title.trim();
  if (!board || !title) return null;
  const columnId = input.columnId ?? defaultColumnId(d, input.boardId);
  const column = columnId ? d.columns[columnId] : undefined;
  if (!column || column.boardId !== board.id) return null;

  const id = ctx.createId("card");
  const card: Card = {
    id,
    boardId: board.id,
    columnId: column.id,
    number: board.nextCardNumber,
    title,
    description: input.description ?? "",
    labelIds: input.labelIds ?? [],
    priority: input.priority ?? "medium",
    assigneeIds: input.assigneeIds ?? [],
    dueDate: input.dueDate ?? null,
    estimate: input.estimate ?? null,
    checklist: [],
    inSprint: input.inSprint ?? false,
    createdAt: ctx.now,
    updatedAt: ctx.now,
  };
  board.nextCardNumber += 1;
  d.cards[id] = card;
  if (input.position === "bottom") column.cardIds.push(id);
  else column.cardIds.unshift(id);
  log(d, ctx, { type: "created", boardId: board.id, cardId: id, toColumnId: column.id });
  return id;
}

export type CardPatch = Partial<
  Pick<
    Card,
    "title" | "description" | "priority" | "labelIds" | "assigneeIds" | "dueDate" | "estimate" | "inSprint"
  >
>;

const FIELD_OF: Record<keyof CardPatch, CardField> = {
  title: "title",
  description: "description",
  priority: "priority",
  labelIds: "labels",
  assigneeIds: "assignees",
  dueDate: "dueDate",
  estimate: "estimate",
  inSprint: "sprint",
};

function describeValue(d: KanbanData, key: keyof CardPatch, value: CardPatch[keyof CardPatch]): string | undefined {
  if (value === null || value === undefined) return undefined;
  switch (key) {
    case "labelIds":
      return (value as ID[]).map((id) => d.labels[id]?.name).filter(Boolean).join(", ");
    case "assigneeIds":
      return (value as ID[]).map((id) => d.members[id]?.name).filter(Boolean).join(", ");
    case "description":
      return undefined;
    default:
      return String(value);
  }
}

export function updateCard(d: KanbanData, ctx: OpContext, cardId: ID, patch: CardPatch): void {
  const card = d.cards[cardId];
  if (!card) return;
  let changed = false;
  for (const key of Object.keys(patch) as (keyof CardPatch)[]) {
    let next = patch[key];
    if (next === undefined) continue;
    if (key === "title") {
      next = (next as string).trim();
      if (!next) continue;
    }
    const current = card[key];
    const equal = Array.isArray(current) ? sameIds(current, next as ID[]) : current === next;
    if (equal) continue;
    (card as unknown as Record<string, unknown>)[key] = Array.isArray(next) ? [...next] : next;
    changed = true;
    log(d, ctx, {
      type: "updated",
      boardId: card.boardId,
      cardId,
      field: FIELD_OF[key],
      value: describeValue(d, key, next),
    });
  }
  if (changed) card.updatedAt = ctx.now;
}

/**
 * Moves a card to `toColumnId`, placing it right before `beforeCardId`
 * (or at the end when null / not found). Positions are expressed relative to a
 * neighbour so that moves stay correct while some cards are hidden by filters.
 */
export function moveCard(
  d: KanbanData,
  ctx: OpContext,
  cardId: ID,
  toColumnId: ID,
  beforeCardId: ID | null,
): void {
  const card = d.cards[cardId];
  const target = d.columns[toColumnId];
  const source = card ? d.columns[card.columnId] : undefined;
  if (!card || !target || !source || target.boardId !== card.boardId) return;
  if (beforeCardId === cardId) return;

  const without = target.cardIds.filter((id) => id !== cardId);
  const beforeIndex = beforeCardId ? without.indexOf(beforeCardId) : -1;
  const insertAt = beforeIndex === -1 ? without.length : beforeIndex;
  const nextTarget = [...without.slice(0, insertAt), cardId, ...without.slice(insertAt)];

  if (source.id === target.id) {
    if (!sameIds(nextTarget, target.cardIds)) target.cardIds = nextTarget;
    return;
  }

  source.cardIds = source.cardIds.filter((id) => id !== cardId);
  target.cardIds = nextTarget;
  card.columnId = target.id;
  card.updatedAt = ctx.now;
  log(d, ctx, {
    type: "moved",
    boardId: card.boardId,
    cardId,
    fromColumnId: source.id,
    toColumnId: target.id,
  });
}

export function deleteCard(d: KanbanData, cardId: ID): void {
  const card = d.cards[cardId];
  if (!card) return;
  const column = d.columns[card.columnId];
  if (column) column.cardIds = column.cardIds.filter((id) => id !== cardId);
  delete d.cards[cardId];
  for (const activity of Object.values(d.activities)) {
    if (activity.cardId === cardId) delete d.activities[activity.id];
  }
}

export function addChecklistItem(d: KanbanData, ctx: OpContext, cardId: ID, text: string): void {
  const card = d.cards[cardId];
  const value = text.trim();
  if (!card || !value) return;
  card.checklist.push({ id: ctx.createId("chk"), text: value, done: false });
  card.updatedAt = ctx.now;
}

export function toggleChecklistItem(d: KanbanData, ctx: OpContext, cardId: ID, itemId: ID): void {
  const card = d.cards[cardId];
  const item = card?.checklist.find((entry) => entry.id === itemId);
  if (!card || !item) return;
  item.done = !item.done;
  card.updatedAt = ctx.now;
  if (item.done) {
    log(d, ctx, { type: "updated", boardId: card.boardId, cardId, field: "checklist", value: item.text });
  }
}

export function removeChecklistItem(d: KanbanData, ctx: OpContext, cardId: ID, itemId: ID): void {
  const card = d.cards[cardId];
  if (!card) return;
  const next = card.checklist.filter((entry) => entry.id !== itemId);
  if (next.length === card.checklist.length) return;
  card.checklist = next;
  card.updatedAt = ctx.now;
}

/* ---------------------------------------------------------------- columns */

export function createColumn(
  d: KanbanData,
  ctx: OpContext,
  boardId: ID,
  name: string,
  category: ColumnCategory = "active",
): ID | null {
  const board = d.boards[boardId];
  const value = name.trim();
  if (!board || !value) return null;
  const id = ctx.createId("col");
  d.columns[id] = { id, boardId, name: value, category, wipLimit: null, cardIds: [] };
  const doneIndex = board.columnIds.findIndex((columnId) => d.columns[columnId]?.category === "done");
  if (doneIndex === -1) board.columnIds.push(id);
  else board.columnIds.splice(doneIndex, 0, id);
  return id;
}

export function renameColumn(d: KanbanData, columnId: ID, name: string): void {
  const column = d.columns[columnId];
  const value = name.trim();
  if (column && value && column.name !== value) column.name = value;
}

export function setColumnWipLimit(d: KanbanData, columnId: ID, limit: number | null): void {
  const column = d.columns[columnId];
  if (!column) return;
  const value = limit !== null && Number.isFinite(limit) && limit > 0 ? Math.floor(limit) : null;
  if (column.wipLimit !== value) column.wipLimit = value;
}

export function setColumnCategory(d: KanbanData, columnId: ID, category: ColumnCategory): void {
  const column = d.columns[columnId];
  if (column && column.category !== category) column.category = category;
}

export function updateColumn(
  d: KanbanData,
  columnId: ID,
  patch: { name?: string; wipLimit?: number | null; category?: ColumnCategory },
): void {
  if (patch.name !== undefined) renameColumn(d, columnId, patch.name);
  if (patch.wipLimit !== undefined) setColumnWipLimit(d, columnId, patch.wipLimit);
  if (patch.category !== undefined) setColumnCategory(d, columnId, patch.category);
}

export function moveColumn(d: KanbanData, boardId: ID, columnId: ID, toIndex: number): void {
  const board = d.boards[boardId];
  if (!board) return;
  const from = board.columnIds.indexOf(columnId);
  if (from === -1) return;
  const clamped = Math.max(0, Math.min(board.columnIds.length - 1, toIndex));
  if (clamped === from) return;
  const next = board.columnIds.filter((id) => id !== columnId);
  next.splice(clamped, 0, columnId);
  board.columnIds = next;
}

/** Only empty columns can be deleted, and a board always keeps one column. */
export function deleteColumn(d: KanbanData, columnId: ID): boolean {
  const column = d.columns[columnId];
  const board = column ? d.boards[column.boardId] : undefined;
  if (!column || !board || column.cardIds.length > 0 || board.columnIds.length <= 1) return false;
  board.columnIds = board.columnIds.filter((id) => id !== columnId);
  delete d.columns[columnId];
  return true;
}

/* ----------------------------------------------------------------- boards */

export interface NewBoardInput {
  name: string;
  key?: string;
  columns: { name: string; category: ColumnCategory; wipLimit?: number | null }[];
}

export function deriveBoardKey(name: string): string {
  const letters = name
    .toLocaleUpperCase("tr-TR")
    .split(/\s+/)
    .map((word) => word.replace(/[^A-ZÇĞİÖŞÜ0-9]/g, "").charAt(0))
    .join("");
  return (letters || "PR").slice(0, 3);
}

export function createBoard(d: KanbanData, ctx: OpContext, input: NewBoardInput): ID | null {
  const name = input.name.trim();
  if (!name) return null;
  const id = ctx.createId("board");
  const columnIds = input.columns.map((column) => {
    const columnId = ctx.createId("col");
    d.columns[columnId] = {
      id: columnId,
      boardId: id,
      name: column.name,
      category: column.category,
      wipLimit: column.wipLimit ?? null,
      cardIds: [],
    };
    return columnId;
  });
  const board: Board = {
    id,
    name,
    key: input.key ?? deriveBoardKey(name),
    createdAt: ctx.now,
    columnIds,
    nextCardNumber: 1,
    sprint: null,
  };
  d.boards[id] = board;
  return id;
}

export function renameBoard(d: KanbanData, boardId: ID, name: string): void {
  const board = d.boards[boardId];
  const value = name.trim();
  if (board && value && board.name !== value) board.name = value;
}

export function deleteBoard(d: KanbanData, boardId: ID): boolean {
  if (!d.boards[boardId] || Object.keys(d.boards).length <= 1) return false;
  delete d.boards[boardId];
  for (const table of ["columns", "cards", "labels", "activities"] as const) {
    for (const [id, entity] of Object.entries(d[table])) {
      if (entity.boardId === boardId) delete d[table][id];
    }
  }
  return true;
}

export function createLabel(d: KanbanData, ctx: OpContext, boardId: ID, name: string, color: LabelColor): ID | null {
  const value = name.trim();
  if (!d.boards[boardId] || !value) return null;
  const id = ctx.createId("lbl");
  d.labels[id] = { id, boardId, name: value, color };
  return id;
}
