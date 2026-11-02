import { addDays, startOfWeek } from "date-fns";
import { describe, expect, it } from "vitest";
import { DAY, HOUR, WEEK_OPTIONS } from "@/lib/dates";
import type { Activity, Card, Column, ColumnCategory, Sprint } from "@/lib/types";
import { sprintBurndown } from "./burndown";
import { cumulativeFlow } from "./cfd";
import { cycleTimes, mean, percentile } from "./cycle-time";
import { computeKpis } from "./kpis";
import { weeklyThroughput } from "./throughput";

// Monday 00:00 local time of a fixed week.
const MONDAY = startOfWeek(new Date(2026, 9, 7), WEEK_OPTIONS).getTime();
const at = (day: number, hour = 10) => MONDAY + day * DAY + hour * HOUR;

const column = (id: string, category: ColumnCategory): Column => ({
  id,
  boardId: "b",
  name: id,
  category,
  wipLimit: null,
  cardIds: [],
});

const COLUMNS: Column[] = [
  column("backlog", "backlog"),
  column("todo", "todo"),
  column("doing", "active"),
  column("review", "active"),
  column("done", "done"),
];

const card = (id: string, columnId: string, extra: Partial<Card> = {}): Card => ({
  id,
  boardId: "b",
  columnId,
  number: 1,
  title: id,
  description: "",
  labelIds: [],
  priority: "medium",
  assigneeIds: [],
  dueDate: null,
  estimate: null,
  checklist: [],
  inSprint: false,
  createdAt: 0,
  updatedAt: 0,
  ...extra,
});

let seq = 0;
const created = (cardId: string, toColumnId: string, time: number): Activity => ({
  id: `a${++seq}`,
  type: "created",
  boardId: "b",
  cardId,
  toColumnId,
  at: time,
  actorId: null,
});
const moved = (cardId: string, fromColumnId: string, toColumnId: string, time: number): Activity => ({
  id: `a${++seq}`,
  type: "moved",
  boardId: "b",
  cardId,
  fromColumnId,
  toColumnId,
  at: time,
  actorId: null,
});

describe("cumulativeFlow", () => {
  const activities: Activity[] = [
    moved("A", "todo", "doing", at(1, 11)),
    created("A", "todo", at(0)),
    created("B", "backlog", at(1, 15)),
    moved("A", "doing", "done", at(3, 9)),
    moved("B", "backlog", "todo", at(2)),
    { id: "u1", type: "updated", boardId: "b", cardId: "A", field: "title", at: at(2), actorId: null },
  ];

  it("counts cards per column at the end of each day, replaying events in time order", () => {
    const rows = cumulativeFlow(COLUMNS, activities, { from: at(0, 0), to: at(3, 23) });
    expect(rows.map((row) => row.day)).toEqual([at(0, 0), at(1, 0), at(2, 0), at(3, 0)]);
    expect(rows.map((row) => row.counts)).toEqual([
      { backlog: 0, todo: 1, doing: 0, review: 0, done: 0 },
      { backlog: 1, todo: 0, doing: 1, review: 0, done: 0 },
      { backlog: 0, todo: 1, doing: 1, review: 0, done: 0 },
      { backlog: 0, todo: 1, doing: 0, review: 0, done: 1 },
    ]);
  });

  it("cuts the last bucket at the end of the range", () => {
    const rows = cumulativeFlow(COLUMNS, activities, { from: at(0, 0), to: at(3, 8) });
    expect(rows.at(-1)?.counts).toMatchObject({ doing: 1, done: 0 });
  });

  it("puts an event at exactly midnight into the day that starts there", () => {
    const rows = cumulativeFlow(COLUMNS, [created("C", "todo", at(1, 0))], { from: at(0, 0), to: at(1, 12) });
    expect(rows[0]?.counts.todo).toBe(0);
    expect(rows[1]?.counts.todo).toBe(1);
  });

  it("ignores columns that no longer exist and keeps totals consistent", () => {
    const rows = cumulativeFlow(COLUMNS, [...activities, created("X", "deleted-column", at(0))], {
      from: at(0, 0),
      to: at(3, 23),
    });
    for (const row of rows) {
      expect(Object.keys(row.counts)).toEqual(COLUMNS.map((entry) => entry.id));
    }
    const total = (index: number) => Object.values(rows[index]!.counts).reduce((sum, count) => sum + count, 0);
    expect([total(0), total(1), total(2), total(3)]).toEqual([1, 2, 2, 2]);
  });
});

describe("cycleTimes", () => {
  const cards = [card("A", "done"), card("R", "done"), card("S", "done"), card("W", "doing")];
  const activities: Activity[] = [
    created("A", "backlog", at(0)),
    moved("A", "backlog", "todo", at(1)),
    moved("A", "todo", "doing", at(2)),
    moved("A", "doing", "review", at(3)),
    moved("A", "review", "done", at(4, 22)),
    // reopened once: the clock keeps the first start but uses the last completion
    created("R", "todo", at(0)),
    moved("R", "todo", "doing", at(1)),
    moved("R", "doing", "done", at(2)),
    moved("R", "done", "review", at(3)),
    moved("R", "review", "done", at(5)),
    // skipped the active columns entirely
    created("S", "todo", at(0)),
    moved("S", "todo", "done", at(2)),
    created("W", "todo", at(0)),
    moved("W", "todo", "doing", at(1)),
  ];

  it("measures from the first active column to the last arrival in done", () => {
    const samples = cycleTimes(COLUMNS, cards, activities);
    const byCard = Object.fromEntries(samples.map((sample) => [sample.cardId, sample.days]));
    expect(byCard.A).toBeCloseTo(2.5, 5);
    expect(byCard.R).toBeCloseTo(4, 5);
    expect(byCard.S).toBe(0);
    expect(byCard.W).toBeUndefined();
  });

  it("orders samples by completion time", () => {
    const samples = cycleTimes(COLUMNS, cards, activities);
    expect(samples.map((sample) => sample.cardId)).toEqual(["S", "A", "R"]);
  });
});

describe("percentile (nearest rank)", () => {
  const values = [7, 1, 3, 10, 2, 9, 4, 8, 6, 5];

  it("returns the smallest value covering p% of samples", () => {
    expect(percentile(values, 50)).toBe(5);
    expect(percentile(values, 85)).toBe(9);
    expect(percentile(values, 95)).toBe(10);
    expect(percentile(values, 100)).toBe(10);
    expect(percentile(values, 0)).toBe(1);
  });

  it("handles small and empty inputs", () => {
    expect(percentile([], 85)).toBeNull();
    expect(percentile([4.2], 95)).toBe(4.2);
    expect(mean([])).toBeNull();
    expect(mean([1, 2, 6])).toBe(3);
  });
});

describe("weeklyThroughput", () => {
  it("buckets completions into Monday-based weeks, oldest first", () => {
    const sample = (completedAt: number) => ({ cardId: String(completedAt), startedAt: 0, completedAt, days: 1 });
    const now = at(9, 12); // Wednesday of the following week
    const weeks = weeklyThroughput(
      [sample(at(0)), sample(at(4)), sample(at(6, 23)), sample(at(7, 0)), sample(at(-30))],
      now,
      3,
    );
    expect(weeks.map((week) => week.weekStart)).toEqual([
      addDays(MONDAY, -7).getTime(),
      MONDAY,
      addDays(MONDAY, 7).getTime(),
    ]);
    expect(weeks.map((week) => week.count)).toEqual([0, 3, 1]);
  });
});

describe("sprintBurndown", () => {
  const sprint: Sprint = { id: "s", name: "Sprint", start: at(0, 0), end: at(4, 0) };
  const cards = [
    card("A", "done", { estimate: 3, inSprint: true }),
    card("B", "done", { estimate: 5, inSprint: true }),
    card("C", "doing", { estimate: 8, inSprint: true }),
    card("D", "todo", { estimate: null, inSprint: true }),
    card("E", "done", { estimate: 13, inSprint: false }),
  ];
  const activities: Activity[] = [
    created("A", "todo", at(-3)),
    moved("A", "todo", "done", at(1, 16)),
    created("B", "todo", at(-3)),
    moved("B", "todo", "done", at(3, 9)),
    created("C", "todo", at(-1)),
    moved("C", "todo", "doing", at(2)),
    created("D", "todo", at(-1)),
    created("E", "todo", at(-1)),
    moved("E", "todo", "done", at(0, 12)),
  ];

  it("subtracts points on the day cards reach done and leaves future days empty", () => {
    const result = sprintBurndown(sprint, COLUMNS, cards, activities, at(3, 12));
    expect(result.totalPoints).toBe(16);
    expect(result.points.map((point) => point.remaining)).toEqual([16, 13, 13, 8, null]);
  });

  it("draws an ideal line from the total down to zero", () => {
    const result = sprintBurndown(sprint, COLUMNS, cards, activities, at(3, 12));
    expect(result.points.map((point) => point.ideal)).toEqual([16, 12, 8, 4, 0]);
  });

  it("does not count work completed after `now` on the current day", () => {
    const result = sprintBurndown(sprint, COLUMNS, cards, activities, at(3, 8));
    expect(result.points[3]?.remaining).toBe(13);
  });
});

describe("computeKpis", () => {
  it("summarises WIP, cycle time, weekly completions and overdue cards", () => {
    const now = at(9, 12);
    const columns = COLUMNS.map((entry) =>
      entry.id === "doing" ? { ...entry, wipLimit: 3 } : entry.id === "review" ? { ...entry, wipLimit: 2 } : entry,
    );
    const cards = [
      card("A", "doing", { dueDate: "2026-01-01" }),
      card("B", "review"),
      card("C", "todo", { dueDate: "2099-01-01" }),
      card("D", "done", { dueDate: "2026-01-01" }),
    ];
    const samples = [
      { cardId: "D", startedAt: 0, completedAt: at(8), days: 2 },
      { cardId: "E", startedAt: 0, completedAt: at(3), days: 4 },
      { cardId: "F", startedAt: 0, completedAt: at(2), days: 6 },
    ];
    expect(computeKpis(columns, cards, samples, now)).toEqual({
      activeWip: 2,
      wipLimit: 5,
      avgCycleDays: 4,
      p85CycleDays: 6,
      completedThisWeek: 1,
      completedLastWeek: 2,
      overdue: 1,
    });
  });
});
