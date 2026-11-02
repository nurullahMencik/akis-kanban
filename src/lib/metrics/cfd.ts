import { DAY, eachDayStart } from "@/lib/dates";
import type { Activity, Column, ID } from "@/lib/types";

export interface CfdRow {
  /** Local start of day, epoch ms. */
  day: number;
  /** Number of cards sitting in each column at the end of that day. */
  counts: Record<ID, number>;
}

/**
 * Cumulative flow: replays create/move events in time order and snapshots how many
 * cards sit in each column at the end of every day. The last day is cut at `to`.
 */
export function cumulativeFlow(
  columns: readonly Column[],
  activities: readonly Activity[],
  range: { from: number; to: number },
): CfdRow[] {
  const known = new Set(columns.map((column) => column.id));
  const events = activities
    .filter((activity): activity is Exclude<Activity, { type: "updated" }> => activity.type !== "updated")
    .sort((a, b) => a.at - b.at);
  const location = new Map<ID, ID>();
  const rows: CfdRow[] = [];
  let cursor = 0;

  for (const day of eachDayStart(range.from, range.to)) {
    const cutoff = Math.min(day + DAY, range.to + 1);
    while (cursor < events.length && events[cursor]!.at < cutoff) {
      const event = events[cursor]!;
      location.set(event.cardId, event.toColumnId);
      cursor += 1;
    }
    const counts: Record<ID, number> = {};
    for (const column of columns) counts[column.id] = 0;
    for (const columnId of location.values()) {
      if (known.has(columnId)) counts[columnId] = (counts[columnId] ?? 0) + 1;
    }
    rows.push({ day, counts });
  }
  return rows;
}
