import { DAY } from "@/lib/dates";
import type { Activity, Card, Column, ID } from "@/lib/types";
import { transitionsByCard } from "./transitions";

export interface CycleTimeSample {
  cardId: ID;
  startedAt: number;
  completedAt: number;
  /** Fractional calendar days between start and completion. */
  days: number;
}

/**
 * Cycle time of every card that currently sits in a "done" column.
 * Start = first time the card entered an "active" (or done) column,
 * end = the last time it entered a "done" column (reopened cards restart the clock at the end).
 */
export function cycleTimes(
  columns: readonly Column[],
  cards: readonly Card[],
  activities: readonly Activity[],
): CycleTimeSample[] {
  const category = new Map(columns.map((column) => [column.id, column.category]));
  const history = transitionsByCard(activities);
  const samples: CycleTimeSample[] = [];

  for (const card of cards) {
    if (category.get(card.columnId) !== "done") continue;
    const transitions = history.get(card.id);
    if (!transitions?.length) continue;

    let completedAt: number | null = null;
    for (const transition of transitions) {
      if (category.get(transition.columnId) === "done") completedAt = transition.at;
    }
    const started = transitions.find((transition) => {
      const kind = category.get(transition.columnId);
      return kind === "active" || kind === "done";
    });
    if (completedAt === null || !started) continue;
    samples.push({
      cardId: card.id,
      startedAt: started.at,
      completedAt,
      days: Math.max(0, (completedAt - started.at) / DAY),
    });
  }
  return samples.sort((a, b) => a.completedAt - b.completedAt);
}

/**
 * Nearest-rank percentile: the smallest value such that at least `p`% of the
 * samples are less than or equal to it. Reads naturally as a service level
 * expectation ("85% of cards finish within N days").
 */
export function percentile(values: readonly number[], p: number): number | null {
  if (values.length === 0) return null;
  const sorted = [...values].sort((a, b) => a - b);
  const rank = Math.ceil((Math.min(Math.max(p, 0), 100) / 100) * sorted.length);
  return sorted[Math.max(0, rank - 1)] ?? null;
}

export function mean(values: readonly number[]): number | null {
  if (values.length === 0) return null;
  return values.reduce((sum, value) => sum + value, 0) / values.length;
}
