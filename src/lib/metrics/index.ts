import { startOfDay } from "date-fns";
import { DAY } from "@/lib/dates";
import type { ID, KanbanData } from "@/lib/types";
import { cumulativeFlow } from "./cfd";
import { cycleTimes, percentile } from "./cycle-time";
import { sprintBurndown } from "./burndown";
import { computeKpis } from "./kpis";
import { weeklyThroughput } from "./throughput";

export * from "./burndown";
export * from "./cfd";
export * from "./cycle-time";
export * from "./kpis";
export * from "./throughput";
export * from "./transitions";

export const ANALYTICS_DAYS = 42;

/** Everything the analytics page needs for one board, derived from the event log. */
export function boardMetrics(data: KanbanData, boardId: ID, now: number) {
  const board = data.boards[boardId];
  if (!board) return null;
  const columns = board.columnIds.map((id) => data.columns[id]).filter((column) => column !== undefined);
  const cards = Object.values(data.cards).filter((card) => card.boardId === boardId);
  const activities = Object.values(data.activities).filter((activity) => activity.boardId === boardId);
  const samples = cycleTimes(columns, cards, activities);
  const from = Math.max(startOfDay(board.createdAt).getTime(), startOfDay(now - (ANALYTICS_DAYS - 1) * DAY).getTime());
  const days = samples.map((sample) => sample.days);

  return {
    board,
    columns,
    kpis: computeKpis(columns, cards, samples, now),
    cfd: cumulativeFlow(columns, activities, { from, to: now }),
    cycleTimes: samples,
    percentiles: { p50: percentile(days, 50), p85: percentile(days, 85), p95: percentile(days, 95) },
    throughput: weeklyThroughput(samples, now, 6),
    burndown: board.sprint ? sprintBurndown(board.sprint, columns, cards, activities, now) : null,
  };
}

export type BoardMetrics = NonNullable<ReturnType<typeof boardMetrics>>;
