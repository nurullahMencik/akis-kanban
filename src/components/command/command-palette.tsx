"use client";

import { Command, defaultFilter } from "cmdk";
import {
  ChartNoAxesColumn,
  FileText,
  Keyboard,
  KanbanSquare,
  Languages,
  Laptop,
  Moon,
  Plus,
  Redo2,
  Search,
  Sun,
  Undo2,
} from "lucide-react";
import { useMemo, useState, type ReactNode } from "react";
import { Dialog } from "@/components/ui/dialog";
import { useI18n } from "@/lib/i18n/use-i18n";
import { setLocale, setThemePreference } from "@/lib/preferences";
import { kanbanActions, useKanban } from "@/lib/store/app-store";
import { defaultColumnId } from "@/lib/store/operations";
import { useUi } from "@/lib/store/ui-store";
import { cardKey, normalizeText } from "@/lib/text";
import { buildHref, useActiveBoard, useAppParams, useBoards } from "@/lib/use-app-params";

const filter = (value: string, search: string, keywords?: string[]) =>
  defaultFilter(normalizeText(value), normalizeText(search), keywords?.map(normalizeText));

function Item({
  value,
  keywords,
  onSelect,
  icon,
  children,
  hint,
}: {
  value: string;
  keywords?: string[];
  onSelect: () => void;
  icon: ReactNode;
  children: ReactNode;
  hint?: ReactNode;
}) {
  return (
    <Command.Item
      value={value}
      keywords={keywords}
      onSelect={onSelect}
      className="flex cursor-pointer items-center gap-3 rounded-lg px-3 py-2 text-sm text-ink data-[selected=true]:bg-accent-soft data-[selected=true]:text-accent-ink"
    >
      <span className="flex size-4 shrink-0 items-center justify-center text-ink-3" aria-hidden>
        {icon}
      </span>
      <span className="min-w-0 flex-1 truncate">{children}</span>
      {hint ? <span className="shrink-0 text-xs text-ink-3">{hint}</span> : null}
    </Command.Item>
  );
}

const groupClass =
  "[&_[cmdk-group-heading]]:px-3 [&_[cmdk-group-heading]]:pt-3 [&_[cmdk-group-heading]]:pb-1.5 [&_[cmdk-group-heading]]:text-[0.6875rem] [&_[cmdk-group-heading]]:font-semibold [&_[cmdk-group-heading]]:uppercase [&_[cmdk-group-heading]]:tracking-[0.08em] [&_[cmdk-group-heading]]:text-ink-3";

export default function CommandPalette() {
  const { t } = useI18n();
  const open = useUi((state) => state.paletteOpen);
  const setOpen = useUi((state) => state.setPaletteOpen);
  const openCreateCard = useUi((state) => state.openCreateCard);
  const setShortcutsOpen = useUi((state) => state.setShortcutsOpen);
  const toast = useUi((state) => state.toast);
  const data = useKanban((state) => state.data);
  const canUndo = useKanban((state) => state.past.length > 0);
  const canRedo = useKanban((state) => state.future.length > 0);
  const boards = useBoards();
  const board = useActiveBoard();
  const { pathname, router, setParams } = useAppParams();
  const [search, setSearch] = useState("");
  const onAnalytics = pathname.startsWith("/analytics");

  const cards = useMemo(
    () =>
      Object.values(data.cards)
        .map((card) => {
          const owner = data.boards[card.boardId];
          return owner ? { card, board: owner, key: cardKey(owner.key, card.number) } : null;
        })
        .filter((entry) => entry !== null)
        .sort((a, b) => (a.board.id === board?.id ? -1 : 0) - (b.board.id === board?.id ? -1 : 0) || b.card.updatedAt - a.card.updatedAt),
    [data.cards, data.boards, board?.id],
  );

  const close = () => {
    setOpen(false);
    setSearch("");
  };
  const run = (action: () => void) => () => {
    close();
    action();
  };

  const createNamed = () => {
    if (!board) return;
    const key = cardKey(board.key, board.nextCardNumber);
    const id = kanbanActions.createCard({ boardId: board.id, columnId: defaultColumnId(data, board.id), title: search });
    if (!id) return;
    toast(t("create.created", { key }));
    if (onAnalytics) router.push(buildHref("/", { board: board.id, card: id }));
    else setParams({ card: id }, "push");
  };

  const openCard = (cardId: string, boardId: string) => {
    if (onAnalytics || boardId !== board?.id) router.push(buildHref("/", { board: boardId, card: cardId }));
    else setParams({ card: cardId }, "push");
  };

  const query = search.trim();

  return (
    <Dialog open={open} onClose={close} title={t("palette.title")} variant="palette" testId="command-palette">
      <Command label={t("palette.title")} filter={filter} loop className="flex max-h-[min(34rem,76dvh)] flex-col">
        <div className="flex items-center gap-3 border-b border-line px-4">
          <Search className="size-4 shrink-0 text-ink-3" aria-hidden />
          <Command.Input
            value={search}
            onValueChange={setSearch}
            placeholder={t("palette.placeholder")}
            className="h-13 w-full bg-transparent text-[0.9375rem] text-ink outline-none placeholder:text-ink-3"
            data-autofocus
          />
          <kbd className="kbd">Esc</kbd>
        </div>
        <Command.List className="scroll-thin min-h-0 flex-1 overflow-y-auto p-2">
          {query && board ? null : (
            <Command.Empty className="px-3 py-8 text-center text-sm text-ink-3">{t("palette.empty")}</Command.Empty>
          )}

          {query && board ? (
            <Command.Group forceMount className={groupClass}>
              <Command.Item
                value={`__create__ ${query}`}
                forceMount
                onSelect={run(createNamed)}
                className="flex cursor-pointer items-center gap-3 rounded-lg px-3 py-2 text-sm text-ink data-[selected=true]:bg-accent-soft data-[selected=true]:text-accent-ink"
              >
                <Plus className="size-4 shrink-0 text-ink-3" aria-hidden />
                <span className="min-w-0 flex-1 truncate">{t("palette.createNamed", { title: query })}</span>
                <span className="shrink-0 text-xs text-ink-3">{board.name}</span>
              </Command.Item>
            </Command.Group>
          ) : null}

          <Command.Group heading={t("palette.actions")} className={groupClass}>
            <Item value="create-card" keywords={[t("palette.createCard"), "new card", "yeni kart"]} icon={<Plus className="size-4" />} onSelect={run(() => openCreateCard())} hint="N">
              {t("palette.createCard")}
            </Item>
            {canUndo ? (
              <Item value="undo" keywords={[t("palette.undo"), "undo"]} icon={<Undo2 className="size-4" />} onSelect={run(() => kanbanActions.undo())}>
                {t("palette.undo")}
              </Item>
            ) : null}
            {canRedo ? (
              <Item value="redo" keywords={[t("palette.redo"), "redo"]} icon={<Redo2 className="size-4" />} onSelect={run(() => kanbanActions.redo())}>
                {t("palette.redo")}
              </Item>
            ) : null}
            <Item value="shortcuts" keywords={[t("palette.shortcuts"), "keyboard"]} icon={<Keyboard className="size-4" />} onSelect={run(() => setShortcutsOpen(true))} hint="?">
              {t("palette.shortcuts")}
            </Item>
          </Command.Group>

          <Command.Group heading={t("palette.navigation")} className={groupClass}>
            {onAnalytics ? (
              <Item value="go-board-view" keywords={[t("palette.goBoardView"), "board"]} icon={<KanbanSquare className="size-4" />} onSelect={run(() => router.push(buildHref("/", { board: board?.id })))}>
                {t("palette.goBoardView")}
              </Item>
            ) : (
              <Item value="go-analytics" keywords={[t("palette.goAnalytics"), "analytics", "analitik"]} icon={<ChartNoAxesColumn className="size-4" />} onSelect={run(() => router.push(buildHref("/analytics/", { board: board?.id })))}>
                {t("palette.goAnalytics")}
              </Item>
            )}
            {boards.map((entry) => (
              <Item
                key={entry.id}
                value={`board-${entry.id}`}
                keywords={[t("palette.goBoard", { name: entry.name }), entry.key]}
                icon={<KanbanSquare className="size-4" />}
                onSelect={run(() => router.push(buildHref(onAnalytics ? "/analytics/" : "/", { board: entry.id })))}
                hint={entry.id === board?.id ? "•" : undefined}
              >
                {t("palette.goBoard", { name: entry.name })}
              </Item>
            ))}
          </Command.Group>

          <Command.Group heading={t("palette.preferences")} className={groupClass}>
            <Item value="theme-light" keywords={[t("palette.theme", { name: t("theme.light") }), "theme light"]} icon={<Sun className="size-4" />} onSelect={run(() => setThemePreference("light"))}>
              {t("palette.theme", { name: t("theme.light") })}
            </Item>
            <Item value="theme-dark" keywords={[t("palette.theme", { name: t("theme.dark") }), "theme dark"]} icon={<Moon className="size-4" />} onSelect={run(() => setThemePreference("dark"))}>
              {t("palette.theme", { name: t("theme.dark") })}
            </Item>
            <Item value="theme-system" keywords={[t("palette.theme", { name: t("theme.system") }), "theme system"]} icon={<Laptop className="size-4" />} onSelect={run(() => setThemePreference("system"))}>
              {t("palette.theme", { name: t("theme.system") })}
            </Item>
            <Item value="lang-tr" keywords={[t("palette.language", { name: "Türkçe" }), "language turkish dil"]} icon={<Languages className="size-4" />} onSelect={run(() => setLocale("tr"))}>
              {t("palette.language", { name: "Türkçe" })}
            </Item>
            <Item value="lang-en" keywords={[t("palette.language", { name: "English" }), "language english dil"]} icon={<Languages className="size-4" />} onSelect={run(() => setLocale("en"))}>
              {t("palette.language", { name: "English" })}
            </Item>
          </Command.Group>

          {query ? (
            <Command.Group heading={t("palette.cards")} className={groupClass}>
              {cards.map(({ card, board: owner, key }) => (
                <Item
                  key={card.id}
                  value={`card-${card.id}`}
                  keywords={[key, card.title, owner.name]}
                  icon={<FileText className="size-4" />}
                  onSelect={run(() => openCard(card.id, owner.id))}
                  hint={data.columns[card.columnId]?.name}
                >
                  <span className="me-2 font-mono text-xs text-ink-3">{key}</span>
                  {card.title}
                </Item>
              ))}
            </Command.Group>
          ) : null}
        </Command.List>
        <div className="border-t border-line px-4 py-2 text-[0.6875rem] text-ink-3">{t("palette.hint")}</div>
      </Command>
    </Dialog>
  );
}
