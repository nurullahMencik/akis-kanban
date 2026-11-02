import { isDueThisWeek, isOverdue } from "@/lib/dates";
import { cardKey, normalizeText } from "@/lib/text";
import type { Card, KanbanData, Priority } from "@/lib/types";
import { PRIORITIES } from "@/lib/types";

export type DueFilter = "overdue" | "week";

export interface CardFilters {
  q: string;
  assignees: string[];
  labels: string[];
  priorities: Priority[];
  due: DueFilter | null;
}

export const FILTER_PARAMS = ["q", "assignee", "label", "priority", "due"] as const;

const list = (value: string | null) => (value ? value.split(",").filter(Boolean) : []);

export function parseFilters(params: Pick<URLSearchParams, "get">): CardFilters {
  const due = params.get("due");
  return {
    q: params.get("q") ?? "",
    assignees: list(params.get("assignee")),
    labels: list(params.get("label")),
    priorities: list(params.get("priority")).filter((value): value is Priority =>
      (PRIORITIES as readonly string[]).includes(value),
    ),
    due: due === "overdue" || due === "week" ? due : null,
  };
}

export function filtersToParams(filters: CardFilters): Record<(typeof FILTER_PARAMS)[number], string | null> {
  const join = (values: string[]) => (values.length ? values.join(",") : null);
  return {
    q: filters.q.trim() ? filters.q : null,
    assignee: join(filters.assignees),
    label: join(filters.labels),
    priority: join(filters.priorities),
    due: filters.due,
  };
}

export function activeFilterCount(filters: CardFilters): number {
  return (
    (filters.q.trim() ? 1 : 0) +
    (filters.assignees.length ? 1 : 0) +
    (filters.labels.length ? 1 : 0) +
    (filters.priorities.length ? 1 : 0) +
    (filters.due ? 1 : 0)
  );
}

/** Builds a predicate once per render; text matching ignores case and Turkish diacritics. */
export function createCardMatcher(filters: CardFilters, data: KanbanData, now: number): (card: Card) => boolean {
  const query = normalizeText(filters.q.trim());
  const assignees = new Set(filters.assignees);
  const labels = new Set(filters.labels);
  const priorities = new Set(filters.priorities);

  return (card) => {
    if (assignees.size && !card.assigneeIds.some((id) => assignees.has(id))) return false;
    if (labels.size && !card.labelIds.some((id) => labels.has(id))) return false;
    if (priorities.size && !priorities.has(card.priority)) return false;
    if (filters.due) {
      if (data.columns[card.columnId]?.category === "done") return false;
      if (filters.due === "overdue" && !isOverdue(card.dueDate, now)) return false;
      if (filters.due === "week" && !isDueThisWeek(card.dueDate, now)) return false;
    }
    if (query) {
      const board = data.boards[card.boardId];
      const haystack = normalizeText(
        [
          board ? cardKey(board.key, card.number) : "",
          card.title,
          card.description,
          ...card.labelIds.map((id) => data.labels[id]?.name ?? ""),
          ...card.assigneeIds.map((id) => data.members[id]?.name ?? ""),
        ].join(" "),
      );
      if (!query.split(/\s+/).every((term) => haystack.includes(term))) return false;
    }
    return true;
  };
}
