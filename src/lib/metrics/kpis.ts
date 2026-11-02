import { addWeeks, startOfWeek } from "date-fns";
import { WEEK_OPTIONS, isOverdue } from "@/lib/dates";
import type { Card, Column } from "@/lib/types";
import { mean, percentile, type CycleTimeSample } from "./cycle-time";

export interface Kpis {
  activeWip: number;
  wipLimit: number | null;
  avgCycleDays: number | null;
  p85CycleDays: number | null;
  completedThisWeek: number;
  completedLastWeek: number;
  overdue: number;
}

export function computeKpis(
  columns: readonly Column[],
  cards: readonly Card[],
  samples: readonly CycleTimeSample[],
  now: number,
): Kpis {
  const byId = new Map(columns.map((column) => [column.id, column]));
  const active = columns.filter((column) => column.category === "active");
  const limits = active.map((column) => column.wipLimit);
  const thisWeek = startOfWeek(now, WEEK_OPTIONS).getTime();
  const lastWeek = addWeeks(thisWeek, -1).getTime();
  const days = samples.map((sample) => sample.days);

  return {
    activeWip: cards.filter((card) => byId.get(card.columnId)?.category === "active").length,
    wipLimit: limits.length && limits.every((limit) => limit !== null)
      ? limits.reduce<number>((sum, limit) => sum + (limit ?? 0), 0)
      : null,
    avgCycleDays: mean(days),
    p85CycleDays: percentile(days, 85),
    completedThisWeek: samples.filter((sample) => sample.completedAt >= thisWeek).length,
    completedLastWeek: samples.filter((sample) => sample.completedAt >= lastWeek && sample.completedAt < thisWeek).length,
    overdue: cards.filter((card) => byId.get(card.columnId)?.category !== "done" && isOverdue(card.dueDate, now)).length,
  };
}
