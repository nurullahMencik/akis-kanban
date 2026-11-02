import { startOfDay } from "date-fns";
import { DAY, eachDayStart } from "@/lib/dates";
import type { Activity, Card, Column, Sprint } from "@/lib/types";
import { columnAt, transitionsByCard } from "./transitions";

export interface BurndownPoint {
  day: number;
  /** Remaining story points at the end of the day; null for days that have not happened yet. */
  remaining: number | null;
  ideal: number;
}

export interface Burndown {
  totalPoints: number;
  points: BurndownPoint[];
}

/**
 * Sprint burndown over the cards flagged `inSprint`. For each sprint day, the
 * remaining points are the estimates of cards that were not in a done column at
 * the end of that day, again replayed from move events.
 */
export function sprintBurndown(
  sprint: Sprint,
  columns: readonly Column[],
  cards: readonly Card[],
  activities: readonly Activity[],
  now: number,
): Burndown {
  const category = new Map(columns.map((column) => [column.id, column.category]));
  const scope = cards.filter((card) => card.inSprint);
  const scopeIds = new Set(scope.map((card) => card.id));
  const history = transitionsByCard(activities.filter((activity) => scopeIds.has(activity.cardId)));
  const totalPoints = scope.reduce((sum, card) => sum + (card.estimate ?? 0), 0);
  const days = eachDayStart(sprint.start, sprint.end);
  const today = startOfDay(now).getTime();

  const points = days.map((day, index) => {
    const ideal = days.length > 1 ? totalPoints * (1 - index / (days.length - 1)) : 0;
    if (day > today) return { day, remaining: null, ideal };
    const endOfDay = Math.min(day + DAY - 1, now);
    let remaining = 0;
    for (const card of scope) {
      const columnId = columnAt(history.get(card.id) ?? [], endOfDay);
      if (columnId === null || category.get(columnId) !== "done") remaining += card.estimate ?? 0;
    }
    return { day, remaining, ideal };
  });
  return { totalPoints, points };
}
