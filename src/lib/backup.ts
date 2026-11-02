import { toDateKey } from "@/lib/dates";
import type { KanbanData } from "@/lib/types";
import { ENTITY_TABLES } from "@/lib/types";

export interface Backup {
  app: "akis-kanban";
  version: 1;
  exportedAt: string;
  data: KanbanData;
}

export function createBackup(data: KanbanData, now = Date.now()): Backup {
  return { app: "akis-kanban", version: 1, exportedAt: new Date(now).toISOString(), data };
}

export function downloadBackup(data: KanbanData) {
  const blob = new Blob([JSON.stringify(createBackup(data), null, 2)], { type: "application/json" });
  const url = URL.createObjectURL(blob);
  const link = document.createElement("a");
  link.href = url;
  link.download = `akis-yedek-${toDateKey(Date.now())}.json`;
  document.body.append(link);
  link.click();
  link.remove();
  window.setTimeout(() => URL.revokeObjectURL(url), 1000);
}

const isRecord = (value: unknown): value is Record<string, unknown> =>
  typeof value === "object" && value !== null && !Array.isArray(value);
const isString = (value: unknown): value is string => typeof value === "string";
const isStringArray = (value: unknown): value is string[] => Array.isArray(value) && value.every(isString);

/**
 * Validates an exported file. Structural problems throw; dangling references
 * (e.g. a column pointing to a missing card) are a sign of a hand-edited file
 * and are rejected as well so the app never renders an inconsistent board.
 */
export function parseBackup(text: string): KanbanData {
  const parsed: unknown = JSON.parse(text);
  const data = isRecord(parsed) && parsed.app === "akis-kanban" ? parsed.data : parsed;
  if (!isRecord(data)) throw new Error("not an object");
  for (const table of ENTITY_TABLES) {
    const rows = data[table];
    if (!isRecord(rows)) throw new Error(`missing table ${table}`);
    for (const [id, row] of Object.entries(rows)) {
      if (!isRecord(row) || row.id !== id) throw new Error(`invalid row in ${table}`);
    }
  }
  const { boards, columns, cards, labels, members, activities } = data as unknown as KanbanData;
  if (Object.keys(boards).length === 0) throw new Error("no boards");

  for (const board of Object.values(boards)) {
    if (!isString(board.name) || !isString(board.key) || !isStringArray(board.columnIds)) throw new Error("board");
    if (!board.columnIds.every((id) => columns[id]?.boardId === board.id)) throw new Error("board columns");
  }
  for (const column of Object.values(columns)) {
    if (!isString(column.name) || !isStringArray(column.cardIds) || !boards[column.boardId]) throw new Error("column");
    if (!["backlog", "todo", "active", "done"].includes(column.category)) throw new Error("column category");
    if (!column.cardIds.every((id) => cards[id]?.columnId === column.id)) throw new Error("column cards");
  }
  for (const card of Object.values(cards)) {
    if (!isString(card.title) || typeof card.number !== "number" || !columns[card.columnId]) throw new Error("card");
    if (!isStringArray(card.labelIds) || !isStringArray(card.assigneeIds) || !Array.isArray(card.checklist)) {
      throw new Error("card fields");
    }
  }
  for (const label of Object.values(labels)) if (!isString(label.name) || !boards[label.boardId]) throw new Error("label");
  for (const member of Object.values(members)) if (!isString(member.name)) throw new Error("member");
  for (const activity of Object.values(activities)) {
    if (!["created", "moved", "updated"].includes(activity.type) || typeof activity.at !== "number") {
      throw new Error("activity");
    }
  }
  return data as unknown as KanbanData;
}
