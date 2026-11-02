"use client";

import {
  ChartNoAxesColumn,
  Database,
  Download,
  Keyboard,
  KanbanSquare,
  Laptop,
  Moon,
  Plus,
  RotateCcw,
  Search,
  Sun,
  Upload,
  WifiOff,
} from "lucide-react";
import Link from "next/link";
import { useRef, useState } from "react";
import { ConfirmDialog } from "@/components/ui/confirm-dialog";
import { Popover, PopoverItem } from "@/components/ui/popover";
import { downloadBackup, parseBackup } from "@/lib/backup";
import { useI18n } from "@/lib/i18n/use-i18n";
import type { Locale } from "@/lib/i18n/messages";
import { setLocale, setThemePreference, usePreferences, type ThemePreference } from "@/lib/preferences";
import { kanbanActions, kanbanStore, useKanban } from "@/lib/store/app-store";
import { useUi } from "@/lib/store/ui-store";
import type { KanbanData } from "@/lib/types";
import { buildHref, useActiveBoard, useAppParams, useBoards } from "@/lib/use-app-params";
import { useModKey } from "@/lib/use-platform";
import { Brand } from "./brand";

export function SidebarContent({ onNavigate }: { onNavigate?: () => void }) {
  const { t } = useI18n();
  const { pathname } = useAppParams();
  const boards = useBoards();
  const activeBoard = useActiveBoard();
  const cards = useKanban((state) => state.data.cards);
  const setPaletteOpen = useUi((state) => state.setPaletteOpen);
  const setNewBoardOpen = useUi((state) => state.setNewBoardOpen);
  const setShortcutsOpen = useUi((state) => state.setShortcutsOpen);
  const mod = useModKey();
  const onAnalytics = pathname.startsWith("/analytics");
  const viewPath = onAnalytics ? "/analytics/" : "/";

  const countByBoard = new Map<string, number>();
  for (const card of Object.values(cards)) countByBoard.set(card.boardId, (countByBoard.get(card.boardId) ?? 0) + 1);

  const navItem = (active: boolean) =>
    `flex items-center gap-2.5 rounded-lg px-2.5 py-2 text-sm font-medium transition-colors ${
      active ? "bg-surface text-ink shadow-[var(--shadow-card)]" : "text-ink-2 hover:bg-hover hover:text-ink"
    }`;

  return (
    <div className="flex h-full flex-col gap-5 overflow-y-auto px-3 py-4 scroll-thin">
      <div className="px-1.5">
        <Brand tagline={t("app.tagline")} />
      </div>

      <button
        type="button"
        onClick={() => {
          onNavigate?.();
          setPaletteOpen(true);
        }}
        className="flex h-9 items-center gap-2 rounded-lg border border-line bg-surface px-2.5 text-sm text-ink-3 transition-colors hover:border-line-strong"
      >
        <Search className="size-4" aria-hidden />
        <span className="flex-1 text-start">{t("nav.commandHint")}</span>
        <kbd className="kbd">{mod}</kbd>
        <kbd className="kbd">K</kbd>
      </button>

      <nav aria-label={t("nav.main")} className="flex flex-col gap-0.5">
        <Link
          href={buildHref("/", { board: activeBoard?.id })}
          className={navItem(!onAnalytics)}
          aria-current={!onAnalytics ? "page" : undefined}
          onClick={onNavigate}
        >
          <KanbanSquare className="size-4" aria-hidden />
          {t("nav.board")}
        </Link>
        <Link
          href={buildHref("/analytics/", { board: activeBoard?.id })}
          className={navItem(onAnalytics)}
          aria-current={onAnalytics ? "page" : undefined}
          onClick={onNavigate}
          data-testid="nav-analytics"
        >
          <ChartNoAxesColumn className="size-4" aria-hidden />
          {t("nav.analytics")}
        </Link>
      </nav>

      <section aria-labelledby="sidebar-boards" className="flex flex-col gap-1">
        <div className="flex items-center justify-between px-2.5">
          <h2 id="sidebar-boards" className="text-[0.6875rem] font-semibold uppercase tracking-[0.08em] text-ink-3">
            {t("nav.boards")}
          </h2>
          <button
            type="button"
            className="btn btn-ghost btn-icon size-7 rounded-md"
            onClick={() => {
              onNavigate?.();
              setNewBoardOpen(true);
            }}
            aria-label={t("nav.newBoard")}
            title={t("nav.newBoard")}
          >
            <Plus className="size-4" aria-hidden />
          </button>
        </div>
        <ul className="flex flex-col gap-0.5">
          {boards.map((board) => {
            const active = board.id === activeBoard?.id;
            return (
              <li key={board.id}>
                <Link
                  href={buildHref(viewPath, { board: board.id })}
                  onClick={onNavigate}
                  aria-current={active ? "true" : undefined}
                  className={`group flex items-center gap-2.5 rounded-lg px-2.5 py-1.5 text-sm transition-colors ${
                    active ? "bg-accent-soft font-semibold text-accent-ink" : "text-ink-2 hover:bg-hover hover:text-ink"
                  }`}
                >
                  <span
                    className={`flex size-6 shrink-0 items-center justify-center rounded-md font-mono text-[0.625rem] font-bold ${
                      active ? "bg-accent text-on-accent" : "bg-sunken text-ink-2"
                    }`}
                    aria-hidden
                  >
                    {board.key}
                  </span>
                  <span className="min-w-0 flex-1 truncate">{board.name}</span>
                  <span className="text-xs tabular-nums text-ink-3">{countByBoard.get(board.id) ?? 0}</span>
                </Link>
              </li>
            );
          })}
        </ul>
      </section>

      <div className="mt-auto flex flex-col gap-3">
        <PreferenceControls />
        <div className="flex items-center gap-1">
          <DataMenu />
          <button
            type="button"
            className="btn btn-ghost btn-sm flex-1 justify-start"
            onClick={() => {
              onNavigate?.();
              setShortcutsOpen(true);
            }}
          >
            <Keyboard className="size-4" aria-hidden />
            {t("nav.shortcuts")}
            <kbd className="kbd ms-auto">?</kbd>
          </button>
        </div>
        <p className="flex items-center gap-2 px-2.5 text-[0.6875rem] leading-snug text-ink-3">
          <WifiOff className="size-3.5 shrink-0" aria-hidden />
          {t("app.offlineReady")}
        </p>
      </div>
    </div>
  );
}

function Segmented<T extends string>({
  label,
  value,
  options,
  onChange,
}: {
  label: string;
  value: T;
  options: { value: T; label: string; icon?: React.ReactNode }[];
  onChange: (value: T) => void;
}) {
  return (
    <div role="group" aria-label={label} className="flex rounded-lg border border-line bg-sunken p-0.5">
      {options.map((option) => (
        <button
          key={option.value}
          type="button"
          aria-pressed={value === option.value}
          title={option.label}
          onClick={() => onChange(option.value)}
          className={`flex h-7 flex-1 items-center justify-center gap-1.5 rounded-md text-xs font-semibold transition-colors ${
            value === option.value ? "bg-surface text-ink shadow-[var(--shadow-card)]" : "text-ink-2 hover:text-ink"
          }`}
        >
          {option.icon}
          {option.icon ? <span className="sr-only">{option.label}</span> : option.label}
        </button>
      ))}
    </div>
  );
}

export function PreferenceControls() {
  const { t } = useI18n();
  const { theme, locale } = usePreferences();
  return (
    <div className="flex flex-col gap-2 px-1">
      <Segmented<ThemePreference>
        label={t("theme.label")}
        value={theme}
        onChange={setThemePreference}
        options={[
          { value: "system", label: t("theme.system"), icon: <Laptop className="size-3.5" aria-hidden /> },
          { value: "light", label: t("theme.light"), icon: <Sun className="size-3.5" aria-hidden /> },
          { value: "dark", label: t("theme.dark"), icon: <Moon className="size-3.5" aria-hidden /> },
        ]}
      />
      <Segmented<Locale>
        label={t("lang.label")}
        value={locale}
        onChange={setLocale}
        options={[
          { value: "tr", label: "TR" },
          { value: "en", label: "EN" },
        ]}
      />
    </div>
  );
}

function DataMenu() {
  const { t } = useI18n();
  const toast = useUi((state) => state.toast);
  const { router } = useAppParams();
  const fileRef = useRef<HTMLInputElement>(null);
  const [pendingImport, setPendingImport] = useState<{ file: string; data: KanbanData } | null>(null);
  const [confirmReset, setConfirmReset] = useState(false);

  const goToFirstBoard = (data: KanbanData) => {
    const first = Object.values(data.boards).sort((a, b) => a.createdAt - b.createdAt)[0];
    router.replace(buildHref("/", { board: first?.id }));
  };

  return (
    <>
      <Popover
        trigger={
          <>
            <Database className="size-4" aria-hidden />
            {t("nav.data")}
          </>
        }
        triggerClassName="btn btn-ghost btn-sm"
        panelClassName="w-60"
        testId="data-menu"
      >
        {(close) => (
          <>
            <PopoverItem
              onSelect={() => {
                close();
                downloadBackup(kanbanStore.getState().data);
                toast(t("data.exported"));
              }}
            >
              <Download className="size-4 text-ink-2" aria-hidden />
              {t("data.export")}
            </PopoverItem>
            <PopoverItem
              onSelect={() => {
                close();
                fileRef.current?.click();
              }}
            >
              <Upload className="size-4 text-ink-2" aria-hidden />
              {t("data.import")}
            </PopoverItem>
            <div className="my-1 h-px bg-line" />
            <PopoverItem
              danger
              onSelect={() => {
                close();
                setConfirmReset(true);
              }}
            >
              <RotateCcw className="size-4" aria-hidden />
              {t("data.reset")}
            </PopoverItem>
          </>
        )}
      </Popover>
      <input
        ref={fileRef}
        type="file"
        accept="application/json,.json"
        className="hidden"
        aria-hidden
        tabIndex={-1}
        onChange={async (event) => {
          const file = event.target.files?.[0];
          event.target.value = "";
          if (!file) return;
          try {
            setPendingImport({ file: file.name, data: parseBackup(await file.text()) });
          } catch {
            toast(t("data.importError"), "error");
          }
        }}
      />
      <ConfirmDialog
        open={pendingImport !== null}
        title={t("data.importTitle")}
        body={
          pendingImport
            ? t("data.importBody", {
                file: pendingImport.file,
                boards: Object.keys(pendingImport.data.boards).length,
                cards: Object.keys(pendingImport.data.cards).length,
              })
            : ""
        }
        confirmLabel={t("data.importConfirm")}
        danger={false}
        onClose={() => setPendingImport(null)}
        onConfirm={() => {
          if (!pendingImport) return;
          void kanbanActions.replaceAll(pendingImport.data).then(() => {
            goToFirstBoard(pendingImport.data);
            toast(t("data.imported"));
          });
        }}
      />
      <ConfirmDialog
        open={confirmReset}
        title={t("data.resetTitle")}
        body={t("data.resetBody")}
        confirmLabel={t("data.resetConfirm")}
        onClose={() => setConfirmReset(false)}
        onConfirm={() => {
          void kanbanActions.resetToSample().then(() => {
            goToFirstBoard(kanbanStore.getState().data);
            toast(t("data.resetDone"));
          });
        }}
      />
    </>
  );
}
