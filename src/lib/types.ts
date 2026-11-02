export type ID = string;

/** Semantic role of a column. Metrics rely on this rather than on column names. */
export type ColumnCategory = "backlog" | "todo" | "active" | "done";

export type Priority = "urgent" | "high" | "medium" | "low";

export const PRIORITIES: readonly Priority[] = ["urgent", "high", "medium", "low"];

export const ESTIMATES: readonly number[] = [1, 2, 3, 5, 8, 13];

export type LabelColor =
  | "blue"
  | "green"
  | "violet"
  | "rose"
  | "red"
  | "orange"
  | "teal"
  | "amber"
  | "slate";

export const LABEL_COLORS: readonly LabelColor[] = [
  "blue",
  "green",
  "violet",
  "rose",
  "red",
  "orange",
  "teal",
  "amber",
  "slate",
];

export interface Member {
  id: ID;
  name: string;
  /** Hue (0-360) used for the avatar background. */
  hue: number;
  isCurrentUser?: boolean;
}

export interface Label {
  id: ID;
  boardId: ID;
  name: string;
  color: LabelColor;
}

export interface Sprint {
  id: ID;
  name: string;
  /** Inclusive start, epoch ms (start of day). */
  start: number;
  /** Inclusive end, epoch ms (start of the last day). */
  end: number;
}

export interface Board {
  id: ID;
  name: string;
  /** Short prefix for card keys, e.g. "MB" -> MB-12. */
  key: string;
  createdAt: number;
  columnIds: ID[];
  nextCardNumber: number;
  sprint: Sprint | null;
}

export interface Column {
  id: ID;
  boardId: ID;
  name: string;
  category: ColumnCategory;
  wipLimit: number | null;
  cardIds: ID[];
}

export interface ChecklistItem {
  id: ID;
  text: string;
  done: boolean;
}

export interface Card {
  id: ID;
  boardId: ID;
  columnId: ID;
  number: number;
  title: string;
  description: string;
  labelIds: ID[];
  priority: Priority;
  assigneeIds: ID[];
  /** Local calendar date, yyyy-MM-dd. */
  dueDate: string | null;
  estimate: number | null;
  checklist: ChecklistItem[];
  inSprint: boolean;
  createdAt: number;
  updatedAt: number;
}

export type CardField =
  | "title"
  | "description"
  | "priority"
  | "dueDate"
  | "estimate"
  | "labels"
  | "assignees"
  | "checklist"
  | "sprint";

interface ActivityBase {
  id: ID;
  boardId: ID;
  cardId: ID;
  /** Epoch ms. */
  at: number;
  actorId: ID | null;
}

export interface CreatedActivity extends ActivityBase {
  type: "created";
  toColumnId: ID;
}

export interface MovedActivity extends ActivityBase {
  type: "moved";
  fromColumnId: ID;
  toColumnId: ID;
}

export interface UpdatedActivity extends ActivityBase {
  type: "updated";
  field: CardField;
  /** Human readable new value, already resolved at the time of the change. */
  value?: string;
}

export type Activity = CreatedActivity | MovedActivity | UpdatedActivity;

export interface KanbanData {
  boards: Record<ID, Board>;
  columns: Record<ID, Column>;
  cards: Record<ID, Card>;
  labels: Record<ID, Label>;
  members: Record<ID, Member>;
  activities: Record<ID, Activity>;
}

export type EntityTable = keyof KanbanData;

export const ENTITY_TABLES: readonly EntityTable[] = [
  "boards",
  "columns",
  "cards",
  "labels",
  "members",
  "activities",
];

export function emptyData(): KanbanData {
  return { boards: {}, columns: {}, cards: {}, labels: {}, members: {}, activities: {} };
}
