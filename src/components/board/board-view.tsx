"use client";

import { differenceInCalendarDays, format } from "date-fns";
import { MoreHorizontal, Pencil, Plus, Timer, Trash2 } from "lucide-react";
import { useCallback, useMemo, useState } from "react";
import { BoardSkeleton } from "@/components/shell/shell-skeleton";
import { AvatarStack } from "@/components/ui/avatar";
import { ConfirmDialog } from "@/components/ui/confirm-dialog";
import { Dialog } from "@/components/ui/dialog";
import { Popover, PopoverItem } from "@/components/ui/popover";
import { createCardMatcher, parseFilters } from "@/lib/filters";
import { useI18n } from "@/lib/i18n/use-i18n";
import { kanbanActions, useKanban } from "@/lib/store/app-store";
import { useUi } from "@/lib/store/ui-store";
import type { Board, ID } from "@/lib/types";
import { buildHref, useActiveBoard, useAppParams, useBoards } from "@/lib/use-app-params";
import { useNow } from "@/lib/use-now";
import { CardDrawer } from "./card-drawer";
import { FilterBar } from "./filter-bar";
import { KanbanBoard } from "./kanban-board";

export function BoardView() {
  const { t } = useI18n();
  const status = useKanban((state) => state.status);
  const board = useActiveBoard();
  const { searchParams, setParams } = useAppParams();
  const now = useNow();
  const filters = useMemo(() => parseFilters(searchParams), [searchParams]);
  const openCard = useCallback((cardId: ID) => setParams({ card: cardId }, "push"), [setParams]);

  if (status === "error") {
    return <p className="p-6 text-sm text-danger">{t("app.loadError")}</p>;
  }
  if (status !== "ready" || !board) return <BoardSkeleton />;

  return (
    <div className="flex h-full flex-col">
      <BoardHeader board={board} filters={filters} now={now} />
      <KanbanBoard board={board} filters={filters} now={now} onOpenCard={openCard} />
      <CardDrawer board={board} cardId={searchParams.get("card")} />
    </div>
  );
}

function BoardHeader({ board, filters, now }: { board: Board; filters: ReturnType<typeof parseFilters>; now: number }) {
  const { t, dateLocale } = useI18n();
  const data = useKanban((state) => state.data);
  const openCreateCard = useUi((state) => state.openCreateCard);

  const { shown, total, members } = useMemo(() => {
    const cards = Object.values(data.cards).filter((card) => card.boardId === board.id);
    const matches = createCardMatcher(filters, data, now);
    const memberIds = new Set(cards.flatMap((card) => card.assigneeIds));
    return {
      total: cards.length,
      shown: cards.filter(matches).length,
      members: [...memberIds].map((id) => data.members[id]).filter((member) => member !== undefined),
    };
  }, [board.id, data, filters, now]);

  const sprint = board.sprint;
  const daysLeft = sprint && now ? differenceInCalendarDays(sprint.end, now) : null;

  return (
    <header className="flex flex-col gap-3 border-b border-line px-4 pt-4 pb-3 lg:px-5">
      <div className="flex flex-wrap items-center gap-x-3 gap-y-2">
        <div className="flex min-w-0 items-center gap-2">
          <h1 className="truncate text-lg font-bold tracking-[-0.01em] text-ink sm:text-xl" data-testid="board-title">
            {board.name}
          </h1>
          <BoardMenu board={board} />
        </div>
        {sprint ? (
          <span className="inline-flex items-center gap-1.5 rounded-full border border-line bg-surface px-2.5 py-1 text-xs font-medium text-ink-2">
            <Timer className="size-3.5 text-accent-ink" aria-hidden />
            {t("board.sprint", {
              name: sprint.name,
              range: `${format(sprint.start, "d MMM", { locale: dateLocale })} – ${format(sprint.end, "d MMM", { locale: dateLocale })}`,
            })}
            {daysLeft !== null ? (
              <span className="font-semibold text-ink">
                {`· ${daysLeft > 0 ? t("board.sprintLeft", { count: daysLeft }) : daysLeft === 0 ? t("board.sprintLastDay") : t("board.sprintEnded")}`}
              </span>
            ) : null}
          </span>
        ) : null}
        <div className="ms-auto flex items-center gap-3">
          <span className="hidden sm:block" title={members.map((member) => member.name).join(", ")}>
            <AvatarStack members={members} max={5} size="sm" />
          </span>
          <button type="button" className="btn btn-primary hidden sm:inline-flex" onClick={() => openCreateCard()} data-testid="new-card-button">
            <Plus className="size-4" aria-hidden />
            {t("board.newCard")}
            <kbd className="ms-1 rounded border border-white/25 px-1 font-mono text-[0.6875rem] leading-4 dark:border-black/20">N</kbd>
          </button>
        </div>
      </div>
      <FilterBar board={board} filters={filters} shown={shown} total={total} />
    </header>
  );
}

function BoardMenu({ board }: { board: Board }) {
  const { t } = useI18n();
  const boards = useBoards();
  const { router } = useAppParams();
  const [renaming, setRenaming] = useState(false);
  const [deleting, setDeleting] = useState(false);

  return (
    <>
      <Popover
        trigger={<MoreHorizontal className="size-4" aria-hidden />}
        triggerLabel={t("board.settings")}
        triggerClassName="btn btn-ghost btn-icon btn-sm shrink-0"
        panelClassName="w-52"
      >
        {(close) => (
          <>
            <PopoverItem
              onSelect={() => {
                close();
                setRenaming(true);
              }}
            >
              <Pencil className="size-4 text-ink-2" aria-hidden />
              {t("board.rename")}
            </PopoverItem>
            <PopoverItem
              danger
              disabled={boards.length <= 1}
              onSelect={() => {
                close();
                setDeleting(true);
              }}
            >
              <Trash2 className="size-4" aria-hidden />
              {t("board.delete")}
            </PopoverItem>
          </>
        )}
      </Popover>
      <Dialog open={renaming} onClose={() => setRenaming(false)} title={t("board.rename")}>
        <RenameBoardForm board={board} onDone={() => setRenaming(false)} />
      </Dialog>
      <ConfirmDialog
        open={deleting}
        title={t("board.deleteTitle", { name: board.name })}
        body={t("board.deleteBody")}
        confirmLabel={t("common.delete")}
        onClose={() => setDeleting(false)}
        onConfirm={() => {
          const next = boards.find((entry) => entry.id !== board.id);
          if (kanbanActions.deleteBoard(board.id) && next) router.replace(buildHref("/", { board: next.id }));
        }}
      />
    </>
  );
}

function RenameBoardForm({ board, onDone }: { board: Board; onDone: () => void }) {
  const { t } = useI18n();
  const [name, setName] = useState(board.name);
  return (
    <form
      className="flex flex-col gap-4 px-5 py-4"
      onSubmit={(event) => {
        event.preventDefault();
        kanbanActions.renameBoard(board.id, name);
        onDone();
      }}
    >
      <label className="flex flex-col gap-1.5 text-sm font-medium">
        {t("board.boardName")}
        <input className="field" value={name} onChange={(event) => setName(event.target.value)} required maxLength={80} data-autofocus />
      </label>
      <div className="flex justify-end gap-2">
        <button type="button" className="btn btn-outline" onClick={onDone}>
          {t("common.cancel")}
        </button>
        <button type="submit" className="btn btn-primary" disabled={!name.trim()}>
          {t("common.save")}
        </button>
      </div>
    </form>
  );
}
