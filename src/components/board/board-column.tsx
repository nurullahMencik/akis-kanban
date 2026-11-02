"use client";

import { useDroppable } from "@dnd-kit/core";
import { SortableContext, useSortable, verticalListSortingStrategy } from "@dnd-kit/sortable";
import { CSS } from "@dnd-kit/utilities";
import { ArrowLeft, ArrowRight, GripVertical, MoreHorizontal, Plus, Settings2, Trash2, TriangleAlert } from "lucide-react";
import { memo, useId, useState } from "react";
import { Dialog } from "@/components/ui/dialog";
import { Popover, PopoverItem } from "@/components/ui/popover";
import { useI18n } from "@/lib/i18n/use-i18n";
import { kanbanActions } from "@/lib/store/app-store";
import { useUi } from "@/lib/store/ui-store";
import type { Card, Column, ColumnCategory, ID, Label, Member } from "@/lib/types";
import { CardTile } from "./card-tile";

interface BoardColumnProps {
  column: Column;
  boardKey: string;
  index: number;
  columnCount: number;
  cardIds: ID[];
  cards: Record<ID, Card>;
  labels: Record<ID, Label>;
  members: Record<ID, Member>;
  now: number;
  filtered: boolean;
  instructionsId: string;
  onOpenCard: (cardId: ID) => void;
}

export const BoardColumn = memo(function BoardColumn({
  column,
  boardKey,
  index,
  columnCount,
  cardIds,
  cards,
  labels,
  members,
  now,
  filtered,
  instructionsId,
  onOpenCard,
}: BoardColumnProps) {
  const { t } = useI18n();
  const headingId = useId();
  const openCreateCard = useUi((state) => state.openCreateCard);
  const [settingsOpen, setSettingsOpen] = useState(false);
  const {
    attributes: handleAttributes,
    listeners: handleListeners,
    setNodeRef,
    setActivatorNodeRef,
    transform,
    transition,
    isDragging,
  } = useSortable({ id: `column:${column.id}`, data: { type: "column", columnId: column.id } });
  const { setNodeRef: setListRef, isOver } = useDroppable({
    id: `list:${column.id}`,
    data: { type: "list", columnId: column.id, empty: cardIds.length === 0 },
  });

  const total = column.cardIds.length;
  const limit = column.wipLimit;
  const exceeded = limit !== null && total > limit;
  const done = column.category === "done";

  return (
    <section
      ref={setNodeRef}
      style={{ transform: CSS.Translate.toString(transform), transition }}
      aria-labelledby={headingId}
      data-testid="column"
      data-column-id={column.id}
      data-wip-exceeded={exceeded || undefined}
      className={`relative flex max-h-full w-[min(19rem,calc(100vw-3rem))] shrink-0 snap-start flex-col rounded-2xl border bg-sunken sm:w-auto sm:max-w-80 sm:min-w-60 sm:flex-[1_1_15rem] ${
        exceeded ? "wip-exceeded border-warn-line/70" : "border-transparent"
      } ${isDragging ? "opacity-40" : ""}`}
    >
      {exceeded ? <span className="absolute inset-x-3 top-0 h-[3px] rounded-b bg-warn-line" aria-hidden /> : null}
      <header className="flex items-center gap-1 px-2 pt-2.5 pb-2">
        <button
          type="button"
          ref={setActivatorNodeRef}
          {...handleAttributes}
          {...handleListeners}
          aria-describedby={instructionsId}
          aria-label={t("column.dragHandle", { name: column.name })}
          className="flex size-6 shrink-0 cursor-grab touch-none items-center justify-center rounded-md text-ink-3 hover:bg-hover hover:text-ink active:cursor-grabbing"
        >
          <GripVertical className="size-4" aria-hidden />
        </button>
        <h2 id={headingId} className="me-0.5 min-w-0 truncate text-sm font-semibold text-ink">
          {column.name}
        </h2>
        {limit === null ? (
          <span className="rounded-full bg-hover px-1.5 py-0.5 text-[0.6875rem] font-semibold tabular-nums text-ink-2" data-testid="column-count">
            {filtered && cardIds.length !== total ? `${cardIds.length}/${total}` : total}
          </span>
        ) : (
          <span
            className={`inline-flex shrink-0 items-center gap-1 whitespace-nowrap rounded-full px-1.5 py-0.5 text-[0.6875rem] font-semibold tabular-nums ${
              exceeded ? "bg-warn-soft text-warn" : "bg-hover text-ink-2"
            }`}
            title={exceeded ? t("column.wipExceeded", { count: total, limit }) : t("column.wipLimit")}
            data-testid="wip-badge"
          >
            {exceeded ? <TriangleAlert className="size-3" aria-hidden /> : <span className="text-[0.625rem] tracking-wide text-ink-3">WIP</span>}
            {total}/{limit}
          </span>
        )}
        <span className="ms-auto flex items-center">
          <button
            type="button"
            className="btn btn-ghost btn-icon size-6 rounded-md"
            onClick={() => openCreateCard(column.id)}
            aria-label={t("column.addCard", { name: column.name })}
            title={t("column.addCard", { name: column.name })}
          >
            <Plus className="size-4" aria-hidden />
          </button>
          <Popover
            align="end"
            trigger={<MoreHorizontal className="size-4" aria-hidden />}
            triggerLabel={t("column.menu", { name: column.name })}
            triggerClassName="btn btn-ghost btn-icon size-6 rounded-md"
            panelClassName="w-56"
          >
            {(close) => (
              <>
                <PopoverItem
                  onSelect={() => {
                    close();
                    setSettingsOpen(true);
                  }}
                >
                  <Settings2 className="size-4 text-ink-2" aria-hidden />
                  {t("column.settings")}
                </PopoverItem>
                <PopoverItem
                  disabled={index === 0}
                  onSelect={() => {
                    close();
                    kanbanActions.moveColumn(column.boardId, column.id, index - 1);
                  }}
                >
                  <ArrowLeft className="size-4 text-ink-2" aria-hidden />
                  {t("column.moveLeft")}
                </PopoverItem>
                <PopoverItem
                  disabled={index === columnCount - 1}
                  onSelect={() => {
                    close();
                    kanbanActions.moveColumn(column.boardId, column.id, index + 1);
                  }}
                >
                  <ArrowRight className="size-4 text-ink-2" aria-hidden />
                  {t("column.moveRight")}
                </PopoverItem>
                <div className="my-1 h-px bg-line" />
                <PopoverItem
                  danger
                  disabled={total > 0 || columnCount <= 1}
                  title={total > 0 ? t("column.deleteDisabled") : undefined}
                  onSelect={() => {
                    close();
                    kanbanActions.deleteColumn(column.id);
                  }}
                >
                  <Trash2 className="size-4" aria-hidden />
                  {t("column.delete")}
                </PopoverItem>
              </>
            )}
          </Popover>
        </span>
      </header>
      {exceeded ? (
        <p className="mx-2.5 mb-2 flex items-center gap-1.5 text-[0.6875rem] font-semibold text-warn" data-testid="wip-warning">
          <TriangleAlert className="size-3.5 shrink-0" aria-hidden />
          {t("column.wipExceeded", { count: total, limit })}
        </p>
      ) : null}

      <SortableContext id={column.id} items={cardIds} strategy={verticalListSortingStrategy}>
        <div
          ref={setListRef}
          className={`scroll-thin flex min-h-20 flex-1 flex-col gap-2 overflow-y-auto px-2 pb-2.5 transition-colors ${
            isOver && cardIds.length === 0 ? "rounded-xl bg-accent-soft/60" : ""
          }`}
          data-testid="column-list"
        >
          {cardIds.map((cardId) => {
            const card = cards[cardId];
            if (!card) return null;
            return (
              <CardTile
                key={cardId}
                card={card}
                columnId={column.id}
                boardKey={boardKey}
                labels={labels}
                members={members}
                now={now}
                done={done}
                onOpen={onOpenCard}
              />
            );
          })}
          {cardIds.length === 0 ? (
            <p className="flex flex-1 items-center justify-center rounded-xl border border-dashed border-line-strong/70 px-3 py-6 text-center text-xs text-ink-3">
              {filtered ? t("column.emptyFiltered") : t("column.empty")}
            </p>
          ) : null}
        </div>
      </SortableContext>
      <ColumnSettingsDialog column={column} open={settingsOpen} onClose={() => setSettingsOpen(false)} />
    </section>
  );
});

const CATEGORIES: ColumnCategory[] = ["backlog", "todo", "active", "done"];

function ColumnSettingsDialog({ column, open, onClose }: { column: Column; open: boolean; onClose: () => void }) {
  const { t } = useI18n();
  return (
    <Dialog open={open} onClose={onClose} title={t("column.settings")} testId="column-settings">
      <ColumnSettingsForm column={column} onClose={onClose} />
    </Dialog>
  );
}

function ColumnSettingsForm({ column, onClose }: { column: Column; onClose: () => void }) {
  const { t } = useI18n();
  const [name, setName] = useState(column.name);
  const [limit, setLimit] = useState(column.wipLimit === null ? "" : String(column.wipLimit));
  const [category, setCategory] = useState<ColumnCategory>(column.category);

  return (
    <form
      className="flex flex-col gap-4 px-5 py-4"
      onSubmit={(event) => {
        event.preventDefault();
        kanbanActions.updateColumn(column.id, {
          name,
          wipLimit: limit.trim() === "" ? null : Number(limit),
          category,
        });
        onClose();
      }}
    >
      <label className="flex flex-col gap-1.5 text-sm font-medium">
        {t("board.columnName")}
        <input className="field" value={name} onChange={(event) => setName(event.target.value)} required maxLength={40} data-autofocus />
      </label>
      <div className="grid grid-cols-2 gap-3">
        <label className="flex flex-col gap-1.5 text-sm font-medium">
          {t("column.wipLimit")}
          <input
            className="field"
            type="number"
            min={1}
            max={99}
            inputMode="numeric"
            placeholder={t("column.noLimit")}
            value={limit}
            onChange={(event) => setLimit(event.target.value)}
          />
        </label>
        <label className="flex flex-col gap-1.5 text-sm font-medium">
          {t("column.category")}
          <select className="field" value={category} onChange={(event) => setCategory(event.target.value as ColumnCategory)}>
            {CATEGORIES.map((value) => (
              <option key={value} value={value}>
                {t(`category.${value}`)}
              </option>
            ))}
          </select>
        </label>
      </div>
      <p className="text-xs text-ink-3">{t("column.categoryHint")}</p>
      <div className="flex justify-end gap-2">
        <button type="button" className="btn btn-outline" onClick={onClose}>
          {t("common.cancel")}
        </button>
        <button type="submit" className="btn btn-primary">
          {t("common.save")}
        </button>
      </div>
    </form>
  );
}
