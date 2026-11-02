"use client";

import { useSortable } from "@dnd-kit/sortable";
import { CSS } from "@dnd-kit/utilities";
import { format } from "date-fns";
import { AlarmClock, CalendarDays, CheckSquare } from "lucide-react";
import { memo, type KeyboardEvent } from "react";
import { AvatarStack } from "@/components/ui/avatar";
import { LabelChip } from "@/components/ui/label-chip";
import { PriorityIcon } from "@/components/ui/priority-icon";
import { isOverdue, parseDateKey, toDateKey } from "@/lib/dates";
import { useI18n } from "@/lib/i18n/use-i18n";
import { cardKey } from "@/lib/text";
import type { Card, ID, Label, Member } from "@/lib/types";

interface CardFaceProps {
  card: Card;
  boardKey: string;
  labels: Record<ID, Label>;
  members: Record<ID, Member>;
  now: number;
  done: boolean;
  /** Adds a screen reader summary of the icon-only metadata (the tile's name is its text content). */
  withSummary?: boolean;
}

/** Presentational card body, shared by the sortable tile and the drag overlay. */
export function CardFace({ card, boardKey, labels, members, now, done, withSummary }: CardFaceProps) {
  const { t, dateLocale } = useI18n();
  const cardLabels = card.labelIds.map((id) => labels[id]).filter((label) => label !== undefined);
  const assignees = card.assigneeIds.map((id) => members[id]).filter((member) => member !== undefined);
  const due = card.dueDate ? parseDateKey(card.dueDate) : null;
  const overdue = !done && isOverdue(card.dueDate, now);
  const dueToday = !done && card.dueDate === toDateKey(now);
  const checklistDone = card.checklist.filter((item) => item.done).length;
  const checklistTotal = card.checklist.length;
  const dueText = due ? format(due, "d MMM", { locale: dateLocale }) : "";

  const meta = [
    t("card.priorityAria", { name: t(`priority.${card.priority}`) }),
    due ? t(overdue ? "card.overdueAria" : "card.dueAria", { date: format(due, "PPP", { locale: dateLocale }) }) : null,
    checklistTotal ? t("card.checklistAria", { done: checklistDone, total: checklistTotal }) : null,
    card.estimate !== null ? t("card.estimateAria", { count: card.estimate }) : null,
    assignees.length ? t("card.assigneesAria", { names: assignees.map((member) => member.name).join(", ") }) : null,
    cardLabels.length ? `${t("card.labels")}: ${cardLabels.map((label) => label.name).join(", ")}` : null,
  ]
    .filter(Boolean)
    .join(". ");

  return (
    <div className="flex flex-col gap-2">
      <div className="flex items-center justify-between gap-2">
        <span className="font-mono text-[0.6875rem] font-medium tracking-tight text-ink-3">{cardKey(boardKey, card.number)}</span>
        <PriorityIcon priority={card.priority} className="size-3.5" />
      </div>
      <p className={`text-[0.8125rem] font-semibold leading-snug ${done ? "text-ink-2" : "text-ink"}`}>
        {card.title}
      </p>
      {cardLabels.length ? (
        <div className="flex flex-wrap gap-1">
          {cardLabels.map((label) => (
            <LabelChip key={label.id} label={label} compact />
          ))}
        </div>
      ) : null}
      {due || checklistTotal || card.estimate !== null || assignees.length ? (
        <div className="flex items-center gap-2 pt-0.5 text-[0.6875rem] font-semibold text-ink-2">
          {due ? (
            <span
              title={overdue ? t("card.overdue") : dueToday ? t("card.dueToday") : undefined}
              data-overdue={overdue || undefined}
              className={`inline-flex h-5 items-center gap-1 whitespace-nowrap rounded px-1.5 ${
                overdue ? "bg-danger-soft text-danger" : dueToday ? "bg-warn-soft text-warn" : "bg-sunken"
              }`}
            >
              {overdue ? <AlarmClock className="size-3" aria-hidden /> : <CalendarDays className="size-3" aria-hidden />}
              {dueText}
            </span>
          ) : null}
          {checklistTotal ? (
            <span className={`inline-flex items-center gap-1 ${checklistDone === checklistTotal ? "text-accent-ink" : ""}`}>
              <CheckSquare className="size-3" aria-hidden />
              <span className="tabular-nums">
                {checklistDone}/{checklistTotal}
              </span>
            </span>
          ) : null}
          {card.estimate !== null ? (
            <span className="inline-flex h-5 min-w-5 items-center justify-center rounded-full border border-line px-1.5 tabular-nums">
              {card.estimate}
            </span>
          ) : null}
          <span className="ms-auto">
            <AvatarStack members={assignees} size="xs" />
          </span>
        </div>
      ) : null}
      {withSummary ? (
        <span className="sr-only">
          {meta}
        </span>
      ) : null}
    </div>
  );
}

interface CardTileProps extends Omit<CardFaceProps, "withSummary"> {
  columnId: ID;
  onOpen: (cardId: ID) => void;
}

export const CardTile = memo(function CardTile({ columnId, onOpen, ...face }: CardTileProps) {
  const { card } = face;
  const { attributes, listeners, setNodeRef, transform, transition, isDragging } = useSortable({
    id: card.id,
    data: { type: "card", columnId },
  });

  const onKeyDown = (event: KeyboardEvent<HTMLDivElement>) => {
    if (event.key === "Enter" && !isDragging) {
      event.preventDefault();
      onOpen(card.id);
      return;
    }
    listeners?.onKeyDown?.(event);
  };

  return (
    <div
      ref={setNodeRef}
      {...attributes}
      {...listeners}
      onKeyDown={onKeyDown}
      onClick={() => onOpen(card.id)}
      aria-describedby={attributes["aria-describedby"]}
      data-testid="card"
      data-card-id={card.id}
      style={{ transform: CSS.Translate.toString(transform), transition }}
      className={`touch-manipulation rounded-xl border border-line bg-surface p-3 text-start shadow-[var(--shadow-card)] outline-offset-2 transition-[border-color,box-shadow] hover:border-line-strong ${
        isDragging ? "opacity-35" : ""
      }`}
    >
      <CardFace {...face} withSummary />
    </div>
  );
});
