import {
  closestCorners,
  getFirstCollision,
  getScrollableAncestors,
  KeyboardCode,
  type DroppableContainer,
  type KeyboardCoordinateGetter,
} from "@dnd-kit/core";

const DIRECTIONS: string[] = [KeyboardCode.Down, KeyboardCode.Right, KeyboardCode.Up, KeyboardCode.Left];
/** Horizontal distance that separates "another column" from "the same column". */
const COLUMN_THRESHOLD = 12;

interface SortableData {
  type?: "card" | "list" | "column";
  empty?: boolean;
  sortable?: { containerId: string | number; index: number };
}

const dataOf = (entry: DroppableContainer | undefined) => (entry?.data.current ?? {}) as SortableData;

/**
 * Keyboard movement for a board with sortable columns *and* sortable cards in one
 * DndContext. Based on dnd-kit's sortableKeyboardCoordinates, but it only lets a
 * card target cards (or empty column lists) and a column target columns:
 *  - ↑/↓ move a card within its column
 *  - ←/→ move a card to the nearest card of the neighbouring column (or into it when empty)
 */
export const kanbanKeyboardCoordinates: KeyboardCoordinateGetter = (event, { context }) => {
  const { active, collisionRect, droppableRects, droppableContainers, over, scrollableAncestors } = context;
  if (!DIRECTIONS.includes(event.code)) return undefined;
  event.preventDefault();
  if (!active || !collisionRect) return undefined;

  const activeData = (active.data.current ?? {}) as SortableData;
  const horizontal = event.code === KeyboardCode.Left || event.code === KeyboardCode.Right;
  if (activeData.type === "column" && !horizontal) return undefined;

  const candidates: DroppableContainer[] = [];
  for (const entry of droppableContainers.getEnabled()) {
    if (!entry || entry.disabled || entry.id === active.id) continue;
    const data = dataOf(entry);
    if (activeData.type === "column") {
      if (data.type !== "column") continue;
    } else if (data.type === "list") {
      if (!horizontal || !data.empty) continue;
    } else if (data.type !== "card") {
      continue;
    } else if (!horizontal && data.sortable?.containerId !== activeData.sortable?.containerId) {
      continue;
    }

    const rect = droppableRects.get(entry.id);
    if (!rect) continue;
    switch (event.code) {
      case KeyboardCode.Down:
        if (collisionRect.top < rect.top) candidates.push(entry);
        break;
      case KeyboardCode.Up:
        if (collisionRect.top > rect.top) candidates.push(entry);
        break;
      case KeyboardCode.Left:
        if (rect.left < collisionRect.left - COLUMN_THRESHOLD) candidates.push(entry);
        break;
      case KeyboardCode.Right:
        if (rect.left > collisionRect.left + COLUMN_THRESHOLD) candidates.push(entry);
        break;
    }
  }

  const collisions = closestCorners({
    active,
    collisionRect,
    droppableRects,
    droppableContainers: candidates,
    pointerCoordinates: null,
  });
  let closestId = getFirstCollision(collisions, "id");
  if (closestId === over?.id && collisions.length > 1) closestId = collisions[1]?.id ?? null;
  if (closestId == null) return undefined;

  const target = droppableContainers.get(closestId);
  const targetRect = droppableRects.get(closestId);
  const node = target?.node.current;
  if (!target || !targetRect || !node) return undefined;

  const activeSortable = dataOf(droppableContainers.get(active.id)).sortable;
  const targetSortable = dataOf(target).sortable;
  const differentScroll = getScrollableAncestors(node).some((element, index) => scrollableAncestors[index] !== element);
  const sameContainer = activeSortable !== undefined && activeSortable.containerId === targetSortable?.containerId;
  const after = sameContainer && (targetSortable?.index ?? 0) > activeSortable.index;
  const offset =
    differentScroll || !sameContainer
      ? { x: 0, y: 0 }
      : { x: after ? collisionRect.width - targetRect.width : 0, y: after ? collisionRect.height - targetRect.height : 0 };

  return offset.x && offset.y
    ? { x: targetRect.left, y: targetRect.top }
    : { x: targetRect.left - offset.x, y: targetRect.top - offset.y };
};
