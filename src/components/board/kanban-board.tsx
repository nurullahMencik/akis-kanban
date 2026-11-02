"use client";

import {
  closestCenter,
  closestCorners,
  DndContext,
  DragOverlay,
  KeyboardSensor,
  MeasuringStrategy,
  MouseSensor,
  pointerWithin,
  TouchSensor,
  useSensor,
  useSensors,
  type Announcements,
  type CollisionDetection,
  type DragEndEvent,
  type DragOverEvent,
  type DragStartEvent,
  type UniqueIdentifier,
} from "@dnd-kit/core";
import { arrayMove, horizontalListSortingStrategy, SortableContext } from "@dnd-kit/sortable";
import { Plus } from "lucide-react";
import { useCallback, useId, useMemo, useRef, useState } from "react";
import { dragState } from "@/lib/drag-state";
import type { CardFilters } from "@/lib/filters";
import { activeFilterCount, createCardMatcher } from "@/lib/filters";
import { useI18n } from "@/lib/i18n/use-i18n";
import { kanbanActions, useKanban } from "@/lib/store/app-store";
import type { Board, ID } from "@/lib/types";
import { BoardColumn } from "./board-column";
import { CardFace } from "./card-tile";
import { kanbanKeyboardCoordinates } from "./keyboard-coordinates";

type Items = Record<ID, ID[]>;
type ActiveDrag = { type: "card"; id: ID } | { type: "column"; id: ID };

const COLUMN_PREFIX = "column:";
const LIST_PREFIX = "list:";

function containerOf(items: Items, id: UniqueIdentifier): ID | undefined {
  const value = String(id);
  if (value.startsWith(LIST_PREFIX)) return value.slice(LIST_PREFIX.length);
  return Object.keys(items).find((columnId) => items[columnId]?.includes(value));
}

/**
 * One DndContext for both column reordering and card moves. Collisions are
 * filtered by the type of the dragged item so cards never target columns and
 * vice versa.
 */
const collisionDetection: CollisionDetection = (args) => {
  const type = args.active.data.current?.type;
  if (type === "column") {
    return closestCenter({
      ...args,
      droppableContainers: args.droppableContainers.filter((entry) => entry.data.current?.type === "column"),
    });
  }
  const targets = args.droppableContainers.filter((entry) => {
    const kind = entry.data.current?.type;
    return kind === "card" || kind === "list";
  });
  const underPointer = pointerWithin({ ...args, droppableContainers: targets });
  if (underPointer.length > 0) {
    const card = underPointer.find((collision) => !String(collision.id).startsWith(LIST_PREFIX));
    return card ? [card] : underPointer;
  }
  return closestCorners({ ...args, droppableContainers: targets });
};

export function KanbanBoard({
  board,
  filters,
  now,
  onOpenCard,
}: {
  board: Board;
  filters: CardFilters;
  now: number;
  onOpenCard: (cardId: ID) => void;
}) {
  const { t } = useI18n();
  const data = useKanban((state) => state.data);
  const instructionsId = useId();
  const filtered = activeFilterCount(filters) > 0;

  const visible = useMemo<Items>(() => {
    const matches = createCardMatcher(filters, data, now);
    const result: Items = {};
    for (const columnId of board.columnIds) {
      result[columnId] = (data.columns[columnId]?.cardIds ?? []).filter((cardId) => {
        const card = data.cards[cardId];
        return card !== undefined && matches(card);
      });
    }
    return result;
  }, [board.columnIds, data, filters, now]);

  const [dragItems, setDragItems] = useState<Items | null>(null);
  const [active, setActive] = useState<ActiveDrag | null>(null);
  const itemsRef = useRef<Items | null>(null);
  /** Where the last card landed; announcements run after onDragEnd has reset the drag state. */
  const dropRef = useRef<{ column: string; position: number; total: number } | null>(null);
  const items = dragItems ?? visible;

  const updateItems = useCallback((next: Items | null) => {
    itemsRef.current = next;
    setDragItems(next);
  }, []);

  const sensors = useSensors(
    useSensor(MouseSensor, { activationConstraint: { distance: 6 } }),
    useSensor(TouchSensor, { activationConstraint: { delay: 220, tolerance: 8 } }),
    useSensor(KeyboardSensor, {
      coordinateGetter: kanbanKeyboardCoordinates,
      keyboardCodes: { start: ["Space"], cancel: ["Escape"], end: ["Space", "Enter"] },
    }),
  );

  const columnName = (columnId: ID | undefined) => (columnId ? (data.columns[columnId]?.name ?? "") : "");
  const cardTitle = (id: UniqueIdentifier) => data.cards[String(id)]?.title ?? "";
  const columnIdOf = (id: UniqueIdentifier) => String(id).slice(COLUMN_PREFIX.length);

  /** Position a card would take when dropped on `overId`, 1-based, for announcements. */
  const placement = (activeId: UniqueIdentifier, overId: UniqueIdentifier) => {
    const current = itemsRef.current ?? visible;
    const columnId = containerOf(current, overId);
    const list = (columnId ? current[columnId] : undefined) ?? [];
    if (String(overId) === String(activeId)) {
      return { column: columnName(columnId), position: list.indexOf(String(activeId)) + 1, total: list.length };
    }
    const without = list.filter((id) => id !== String(activeId));
    const index = without.indexOf(String(overId));
    return {
      column: columnName(columnId),
      position: index === -1 ? without.length + 1 : index + 1,
      total: without.length + 1,
    };
  };

  const announcements: Announcements = {
    onDragStart: ({ active: dragged }) => {
      if (dragged.data.current?.type === "column") {
        const index = board.columnIds.indexOf(columnIdOf(dragged.id));
        return t("dnd.columnPickedUp", { column: columnName(columnIdOf(dragged.id)), position: index + 1, total: board.columnIds.length });
      }
      const columnId = containerOf(visible, dragged.id);
      const list = (columnId ? visible[columnId] : undefined) ?? [];
      return t("dnd.pickedUp", {
        card: cardTitle(dragged.id),
        column: columnName(columnId),
        position: list.indexOf(String(dragged.id)) + 1,
        total: list.length,
      });
    },
    onDragOver: ({ active: dragged, over }) => {
      // Right after pick-up the item is "over" itself; keep the pick-up message instead.
      if (!over || over.id === dragged.id) return undefined;
      if (dragged.data.current?.type === "column") {
        const index = board.columnIds.indexOf(columnIdOf(over.id));
        return t("dnd.columnOver", { column: columnName(columnIdOf(dragged.id)), position: index + 1, total: board.columnIds.length });
      }
      return t("dnd.over", { card: cardTitle(dragged.id), ...placement(dragged.id, over.id) });
    },
    onDragEnd: ({ active: dragged, over }) => {
      if (!over) return t("dnd.cancelled", { card: cardTitle(dragged.id) });
      if (dragged.data.current?.type === "column") {
        const index = board.columnIds.indexOf(columnIdOf(over.id));
        return t("dnd.columnDropped", { column: columnName(columnIdOf(dragged.id)), position: index + 1, total: board.columnIds.length });
      }
      return t("dnd.dropped", { card: cardTitle(dragged.id), ...(dropRef.current ?? placement(dragged.id, over.id)) });
    },
    onDragCancel: ({ active: dragged }) =>
      dragged.data.current?.type === "column" ? t("dnd.columnCancelled") : t("dnd.cancelled", { card: cardTitle(dragged.id) }),
  };

  const onDragStart = ({ active: dragged }: DragStartEvent) => {
    dragState.active = true;
    dropRef.current = null;
    if (dragged.data.current?.type === "column") {
      setActive({ type: "column", id: columnIdOf(dragged.id) });
      return;
    }
    setActive({ type: "card", id: String(dragged.id) });
    updateItems(visible);
  };

  const onDragOver = ({ active: dragged, over }: DragOverEvent) => {
    const current = itemsRef.current;
    if (!over || !current || dragged.data.current?.type === "column") return;
    const from = containerOf(current, dragged.id);
    const to = containerOf(current, over.id);
    if (!from || !to || from === to) return;

    const source = current[from] ?? [];
    const target = current[to] ?? [];
    const overIndex = target.indexOf(String(over.id));
    let insertAt = target.length;
    if (overIndex !== -1) {
      const translated = dragged.rect.current.translated;
      const below = translated !== null && translated.top > over.rect.top + over.rect.height / 2;
      insertAt = overIndex + (below ? 1 : 0);
    }
    updateItems({
      ...current,
      [from]: source.filter((id) => id !== String(dragged.id)),
      [to]: [...target.slice(0, insertAt), String(dragged.id), ...target.slice(insertAt)],
    });
  };

  const finish = () => {
    dragState.active = false;
    setActive(null);
    updateItems(null);
  };

  const onDragEnd = ({ active: dragged, over }: DragEndEvent) => {
    if (dragged.data.current?.type === "column") {
      const from = columnIdOf(dragged.id);
      const to = over ? board.columnIds.indexOf(columnIdOf(over.id)) : -1;
      if (to !== -1 && from !== columnIdOf(over?.id ?? "")) kanbanActions.moveColumn(board.id, from, to);
      finish();
      return;
    }

    const current = itemsRef.current;
    const cardId = String(dragged.id);
    const columnId = current ? containerOf(current, cardId) : undefined;
    if (!over || !current || !columnId) {
      finish();
      return;
    }
    let list = current[columnId] ?? [];
    const overId = String(over.id);
    if (containerOf(current, overId) === columnId && overId !== cardId && !overId.startsWith(LIST_PREFIX)) {
      list = arrayMove(list, list.indexOf(cardId), list.indexOf(overId));
    }
    const index = list.indexOf(cardId);
    dropRef.current = { column: columnName(columnId), position: index + 1, total: list.length };
    kanbanActions.moveCard(cardId, columnId, list[index + 1] ?? null);
    finish();
  };

  const activeCard = active?.type === "card" ? data.cards[active.id] : undefined;
  const activeColumn = active?.type === "column" ? data.columns[active.id] : undefined;

  return (
    <DndContext
      sensors={sensors}
      collisionDetection={collisionDetection}
      measuring={{ droppable: { strategy: MeasuringStrategy.Always } }}
      accessibility={{ announcements, screenReaderInstructions: { draggable: t("dnd.instructions") } }}
      onDragStart={onDragStart}
      onDragOver={onDragOver}
      onDragEnd={onDragEnd}
      onDragCancel={finish}
    >
      <span id={instructionsId} className="sr-only">
        {t("dnd.columnInstructions")}
      </span>
      <div
        role="region"
        aria-label={t("board.columns")}
        className="scroll-thin flex min-h-0 flex-1 snap-x snap-mandatory items-stretch gap-3 overflow-x-auto overscroll-x-contain px-4 pt-3 pb-4 sm:snap-none lg:px-5"
        data-testid="board"
      >
        <SortableContext items={board.columnIds.map((id) => `${COLUMN_PREFIX}${id}`)} strategy={horizontalListSortingStrategy}>
          {board.columnIds.map((columnId, index) => {
            const column = data.columns[columnId];
            if (!column) return null;
            return (
              <BoardColumn
                key={columnId}
                column={column}
                boardKey={board.key}
                index={index}
                columnCount={board.columnIds.length}
                cardIds={items[columnId] ?? []}
                cards={data.cards}
                labels={data.labels}
                members={data.members}
                now={now}
                filtered={filtered}
                instructionsId={instructionsId}
                onOpenCard={onOpenCard}
              />
            );
          })}
        </SortableContext>
        <AddColumn boardId={board.id} />
      </div>
      <DragOverlay dropAnimation={{ duration: 180, easing: "cubic-bezier(0.2, 0, 0, 1)" }}>
        {activeCard ? (
          <div className="w-[min(18rem,calc(100vw-4rem))] rotate-[1.5deg] cursor-grabbing rounded-xl border border-line-strong bg-surface p-3 shadow-[var(--shadow-lift)]">
            <CardFace
              card={activeCard}
              boardKey={board.key}
              labels={data.labels}
              members={data.members}
              now={now}
              done={data.columns[activeCard.columnId]?.category === "done"}
            />
          </div>
        ) : activeColumn ? (
          <div className="flex h-40 w-[19rem] items-start rounded-2xl border border-line-strong bg-sunken p-3 shadow-[var(--shadow-lift)]">
            <span className="text-sm font-semibold">{activeColumn.name}</span>
          </div>
        ) : null}
      </DragOverlay>
    </DndContext>
  );
}

function AddColumn({ boardId }: { boardId: ID }) {
  const { t } = useI18n();
  const [editing, setEditing] = useState(false);
  const [name, setName] = useState("");

  if (!editing) {
    return (
      <button
        type="button"
        onClick={() => setEditing(true)}
        aria-label={t("board.addColumn")}
        title={t("board.addColumn")}
        className="flex h-11 w-[min(19rem,calc(100vw-3rem))] shrink-0 snap-start items-center justify-center gap-2 rounded-2xl border border-dashed border-line-strong text-sm font-semibold text-ink-2 transition-colors hover:border-accent hover:text-accent-ink sm:h-auto sm:w-11 sm:self-stretch"
      >
        <Plus className="size-4" aria-hidden />
        <span className="sm:hidden">{t("board.addColumn")}</span>
      </button>
    );
  }

  return (
    <form
      className="flex w-[min(19rem,calc(100vw-3rem))] shrink-0 snap-start flex-col gap-2 self-start rounded-2xl bg-sunken p-2.5 sm:w-64"
      onSubmit={(event) => {
        event.preventDefault();
        if (kanbanActions.createColumn(boardId, name)) {
          setName("");
          setEditing(false);
        }
      }}
    >
      <label className="sr-only" htmlFor={`new-column-${boardId}`}>
        {t("board.columnName")}
      </label>
      <input
        id={`new-column-${boardId}`}
        className="field"
        autoFocus
        value={name}
        maxLength={40}
        placeholder={t("board.columnNamePlaceholder")}
        onChange={(event) => setName(event.target.value)}
        onKeyDown={(event) => {
          if (event.key === "Escape") {
            event.preventDefault();
            setEditing(false);
          }
        }}
      />
      <div className="flex gap-2">
        <button type="submit" className="btn btn-primary btn-sm flex-1" disabled={!name.trim()}>
          {t("common.add")}
        </button>
        <button type="button" className="btn btn-ghost btn-sm" onClick={() => setEditing(false)}>
          {t("common.cancel")}
        </button>
      </div>
    </form>
  );
}
