import { addDays, startOfDay, startOfWeek } from "date-fns";
import { DAY, HOUR, WEEK_OPTIONS, toDateKey } from "@/lib/dates";
import type { Activity, Board, Card, Column, KanbanData, Sprint } from "@/lib/types";
import { emptyData } from "@/lib/types";
import { BOARD_SPECS, COLUMN_TEMPLATE, MEMBERS, type BoardSpec, type CardSpec, type Stage } from "./catalog";
import { createRng, type Rng } from "./rng";

const MINUTE = 60 * 1000;

interface Transition {
  at: number;
  stage: Stage;
}

/**
 * Builds the demo dataset. Structure and timings come from a seeded PRNG, so the
 * result is identical for the same `now`; all dates are relative to `now`.
 */
export function createSampleData(now: number): KanbanData {
  const data = emptyData();
  for (const member of MEMBERS) data.members[member.id] = { ...member };
  for (const spec of BOARD_SPECS) buildBoard(data, spec, now);
  return data;
}

export const columnIdFor = (boardId: string, stage: Stage) => `${boardId}-${stage}`;

function buildBoard(data: KanbanData, spec: BoardSpec, now: number) {
  const rng = createRng(spec.seed);
  const boardStart = startOfDay(now - spec.createdDaysAgo * DAY).getTime() + 9.5 * HOUR;

  let sprint: Sprint | null = null;
  if (spec.sprint) {
    const start = addDays(startOfWeek(now, WEEK_OPTIONS), -7);
    sprint = {
      id: `${spec.id}-sprint`,
      name: spec.sprint.name,
      start: start.getTime(),
      end: addDays(start, 13).getTime(),
    };
  }

  const board: Board = {
    id: spec.id,
    name: spec.name,
    key: spec.key,
    createdAt: boardStart,
    columnIds: COLUMN_TEMPLATE.map((column) => columnIdFor(spec.id, column.stage)),
    nextCardNumber: spec.cards.length + 1,
    sprint,
  };
  data.boards[board.id] = board;

  const columns = new Map<Stage, Column>();
  for (const template of COLUMN_TEMPLATE) {
    const column: Column = {
      id: columnIdFor(spec.id, template.stage),
      boardId: spec.id,
      name: template.name,
      category: template.category,
      wipLimit: template.stage === "doing" ? spec.wip.doing : template.stage === "review" ? spec.wip.review : null,
      cardIds: [],
    };
    columns.set(template.stage, column);
    data.columns[column.id] = column;
  }

  for (const label of spec.labels) {
    const id = `${spec.id}-${label.id}`;
    data.labels[id] = { id, boardId: spec.id, name: label.name, color: label.color };
  }

  const completions = completionTimes(rng, spec, now);
  let doneIndex = 0;
  let activitySeq = 0;
  const doneOrder: { id: string; at: number }[] = [];

  spec.cards.forEach((cardSpec, index) => {
    const number = index + 1;
    const cardId = `${spec.id}-${number}`;
    const completedAt = cardSpec.stage === "done" ? completions[doneIndex++] : undefined;
    const transitions = normalise(timeline(rng, cardSpec, now, boardStart, completedAt), now);
    const actors = cardSpec.assignees.length ? cardSpec.assignees : spec.members;

    transitions.forEach((step, stepIndex) => {
      const id = `${spec.id}-a${++activitySeq}`;
      const actorId = rng.pick(actors);
      const previous = transitions[stepIndex - 1];
      const activity: Activity = previous
        ? {
            id,
            type: "moved",
            boardId: spec.id,
            cardId,
            at: step.at,
            actorId,
            fromColumnId: columnIdFor(spec.id, previous.stage),
            toColumnId: columnIdFor(spec.id, step.stage),
          }
        : { id, type: "created", boardId: spec.id, cardId, at: step.at, actorId, toColumnId: columnIdFor(spec.id, step.stage) };
      data.activities[id] = activity;
    });

    const first = transitions[0];
    const last = transitions[transitions.length - 1];
    if (!first || !last) return;

    // A few realistic edits right after creation make the activity feed richer.
    if (cardSpec.estimate !== null && rng.chance(0.45)) {
      const id = `${spec.id}-a${++activitySeq}`;
      const second = transitions[1];
      const at = Math.min(first.at + rng.range(20, 240) * MINUTE, second ? second.at - MINUTE : now - MINUTE);
      data.activities[id] = {
        id,
        type: "updated",
        boardId: spec.id,
        cardId,
        at,
        actorId: rng.pick(actors),
        field: "estimate",
        value: String(cardSpec.estimate),
      };
    }

    const inSprint =
      sprint !== null &&
      (cardSpec.stage === "doing" ||
        cardSpec.stage === "review" ||
        cardSpec.sprint === true ||
        (cardSpec.stage === "done" && last.at >= sprint.start));

    const card: Card = {
      id: cardId,
      boardId: spec.id,
      columnId: columnIdFor(spec.id, cardSpec.stage),
      number,
      title: cardSpec.title,
      description: cardSpec.description ?? "",
      labelIds: cardSpec.labels.map((label) => `${spec.id}-${label}`),
      priority: cardSpec.priority,
      assigneeIds: [...cardSpec.assignees],
      dueDate: cardSpec.due === undefined ? null : toDateKey(addDays(startOfDay(now), cardSpec.due)),
      estimate: cardSpec.estimate,
      checklist: (cardSpec.checklist ?? []).map(([text, done], itemIndex) => ({
        id: `${cardId}-c${itemIndex + 1}`,
        text,
        done,
      })),
      inSprint,
      createdAt: first.at,
      updatedAt: last.at,
    };
    data.cards[cardId] = card;

    if (cardSpec.stage === "done") doneOrder.push({ id: cardId, at: last.at });
    else columns.get(cardSpec.stage)?.cardIds.push(cardId);
  });

  // Most recently finished cards on top.
  const done = columns.get("done");
  if (done) done.cardIds = doneOrder.sort((a, b) => b.at - a.at).map((entry) => entry.id);
}

/** Spreads completions over 7-day windows ending now, oldest first. */
function completionTimes(rng: Rng, spec: BoardSpec, now: number): number[] {
  const windows = spec.doneWeeks.length;
  const times: number[] = [];
  spec.doneWeeks.forEach((count, windowIndex) => {
    const windowStart = now - (windows - windowIndex) * 7 * DAY;
    const batch = Array.from({ length: count }, () => windowStart + rng.range(0.08, 0.97) * 7 * DAY);
    times.push(...batch.sort((a, b) => a - b));
  });
  return times;
}

function timeline(rng: Rng, spec: CardSpec, now: number, boardStart: number, completedAt?: number): Transition[] {
  const skipBacklog = rng.chance(0.3);
  const steps: Transition[] = [];
  const begin = (todoAt: number, backlogWait: number) => {
    if (skipBacklog) steps.push({ at: Math.max(boardStart, todoAt), stage: "todo" });
    else {
      const createdAt = Math.max(boardStart, todoAt - backlogWait * DAY);
      steps.push({ at: createdAt, stage: "backlog" });
      steps.push({ at: Math.max(createdAt + 30 * MINUTE, todoAt), stage: "todo" });
    }
  };

  switch (spec.stage) {
    case "backlog": {
      steps.push({ at: boardStart + rng.next() * (now - boardStart - 0.4 * DAY), stage: "backlog" });
      break;
    }
    case "todo": {
      begin(now - rng.range(0.3, 9) * DAY, rng.range(0, 12));
      break;
    }
    case "doing": {
      const startAt = now - rng.range(0.3, 6.5) * DAY;
      begin(startAt - rng.range(0.5, 5) * DAY, rng.range(0, 10));
      steps.push({ at: startAt, stage: "doing" });
      break;
    }
    case "review": {
      const reviewAt = now - rng.range(0.2, 2.5) * DAY;
      const startAt = reviewAt - rng.range(1, 5) * DAY;
      begin(startAt - rng.range(0.5, 4) * DAY, rng.range(0, 8));
      steps.push({ at: startAt, stage: "doing" });
      steps.push({ at: reviewAt, stage: "review" });
      break;
    }
    case "done": {
      const doneAt = completedAt ?? now - DAY;
      const available = Math.max(1, (doneAt - boardStart) / DAY);
      // Log-normal cycle time: median ~3.2 days with a realistic long tail.
      const cycle = Math.min(Math.max(Math.exp(Math.log(3.2) + 0.65 * rng.normal()), 0.4), 13, available * 0.6);
      const startAt = doneAt - cycle * DAY;
      const reviewAt = startAt + cycle * rng.range(0.55, 0.85) * DAY;
      const waitBeforeStart = Math.min(rng.range(0.5, 6), Math.max(0.1, (startAt - boardStart) / DAY - 0.1));
      begin(startAt - waitBeforeStart * DAY, rng.range(0, 9));
      steps.push({ at: startAt, stage: "doing" });
      steps.push({ at: reviewAt, stage: "review" });
      if (rng.chance(0.18)) {
        // Sent back from review once.
        const backAt = reviewAt + (doneAt - reviewAt) * 0.35;
        steps.push({ at: backAt, stage: "doing" });
        steps.push({ at: backAt + (doneAt - backAt) * 0.5, stage: "review" });
      }
      steps.push({ at: doneAt, stage: "done" });
      break;
    }
  }
  return steps;
}

/**
 * Moves events into working hours on weekdays, keeps them strictly ordered
 * and never later than `now`.
 */
function normalise(steps: Transition[], now: number): Transition[] {
  const result = steps.map((step) => {
    const shifted = toWorkingTime(step.at);
    // Shifting forward must not push recent events into the future.
    return { ...step, at: shifted > now - 30 * MINUTE ? step.at : shifted };
  });
  for (let i = 1; i < result.length; i++) {
    const previous = result[i - 1]!;
    const current = result[i]!;
    if (current.at <= previous.at + 20 * MINUTE) current.at = previous.at + 20 * MINUTE;
  }
  for (let i = result.length - 1; i >= 0; i--) {
    const limit = i === result.length - 1 ? now - 10 * MINUTE : result[i + 1]!.at - 15 * MINUTE;
    if (result[i]!.at > limit) result[i]!.at = limit;
  }
  return result;
}

function toWorkingTime(at: number): number {
  const date = new Date(at);
  const minute = date.getMinutes();
  const hour = date.getHours();
  if (hour < 9 || hour >= 19) {
    if (hour >= 19) date.setDate(date.getDate() + 1);
    date.setHours(9 + (minute % 9), minute, 0, 0);
  }
  const weekday = date.getDay();
  if (weekday === 6) date.setDate(date.getDate() + 2);
  if (weekday === 0) date.setDate(date.getDate() + 1);
  return date.getTime();
}
