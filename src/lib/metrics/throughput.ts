import { addWeeks, startOfWeek } from "date-fns";
import { WEEK_OPTIONS } from "@/lib/dates";
import type { CycleTimeSample } from "./cycle-time";

export interface ThroughputWeek {
  /** Monday 00:00 local time, epoch ms. */
  weekStart: number;
  count: number;
}

/** Completed cards per calendar week (Monday-Sunday), last `weeks` weeks including the current one. */
export function weeklyThroughput(samples: readonly CycleTimeSample[], now: number, weeks: number): ThroughputWeek[] {
  const current = startOfWeek(now, WEEK_OPTIONS);
  const buckets: ThroughputWeek[] = [];
  for (let offset = weeks - 1; offset >= 0; offset--) {
    buckets.push({ weekStart: addWeeks(current, -offset).getTime(), count: 0 });
  }
  for (const sample of samples) {
    const weekStart = startOfWeek(sample.completedAt, WEEK_OPTIONS).getTime();
    const bucket = buckets.find((entry) => entry.weekStart === weekStart);
    if (bucket) bucket.count += 1;
  }
  return buckets;
}
