import type { Activity, ID } from "@/lib/types";

export interface Transition {
  at: number;
  columnId: ID;
}

/**
 * Column history per card, oldest first, rebuilt from "created" and "moved" events.
 * This is the single source every flow metric is derived from.
 */
export function transitionsByCard(activities: Iterable<Activity>): Map<ID, Transition[]> {
  const byCard = new Map<ID, Transition[]>();
  for (const activity of activities) {
    if (activity.type === "updated") continue;
    const list = byCard.get(activity.cardId) ?? [];
    list.push({ at: activity.at, columnId: activity.toColumnId });
    byCard.set(activity.cardId, list);
  }
  for (const list of byCard.values()) list.sort((a, b) => a.at - b.at);
  return byCard;
}

/** Column a card was in at instant `at` (inclusive), or null if it did not exist yet. */
export function columnAt(transitions: readonly Transition[], at: number): ID | null {
  let current: ID | null = null;
  for (const transition of transitions) {
    if (transition.at > at) break;
    current = transition.columnId;
  }
  return current;
}
