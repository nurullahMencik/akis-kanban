"use client";

import dynamic from "next/dynamic";
import { Menu, Plus, Search } from "lucide-react";
import { useEffect, type ReactNode } from "react";
import { CreateCardDialog } from "@/components/board/create-card-dialog";
import { Dialog } from "@/components/ui/dialog";
import { Toaster } from "@/components/ui/toaster";
import { useI18n } from "@/lib/i18n/use-i18n";
import { applyTheme, getPreferences, usePreferences } from "@/lib/preferences";
import { kanbanActions, useKanban } from "@/lib/store/app-store";
import { useUi } from "@/lib/store/ui-store";
import { Brand } from "./brand";
import { GlobalShortcuts } from "./global-shortcuts";
import { NewBoardDialog } from "./new-board-dialog";
import { ShortcutsDialog } from "./shortcuts-dialog";
import { SidebarContent } from "./sidebar";

const CommandPalette = dynamic(() => import("@/components/command/command-palette"), { ssr: false });

function useBootstrap() {
  const { theme } = usePreferences();
  const { t } = useI18n();
  const persistError = useKanban((state) => state.persistError);

  useEffect(() => {
    void kanbanActions.init();
  }, []);

  // Follow the OS colour scheme while the preference is "system".
  useEffect(() => {
    applyTheme(theme);
    if (theme !== "system") return;
    const media = window.matchMedia("(prefers-color-scheme: dark)");
    const onChange = () => applyTheme(getPreferences().theme);
    media.addEventListener("change", onChange);
    return () => media.removeEventListener("change", onChange);
  }, [theme]);

  useEffect(() => {
    if (persistError) useUi.getState().toast(t("app.persistError"), "error");
  }, [persistError, t]);
}

export function AppShell({ children }: { children: ReactNode }) {
  useBootstrap();
  const { t, locale } = useI18n();
  const paletteLoaded = useUi((state) => state.paletteLoaded);
  const navOpen = useUi((state) => state.navOpen);
  const setNavOpen = useUi((state) => state.setNavOpen);
  const setPaletteOpen = useUi((state) => state.setPaletteOpen);
  const openCreateCard = useUi((state) => state.openCreateCard);

  useEffect(() => {
    document.documentElement.lang = locale;
  }, [locale]);

  return (
    <div className="flex h-dvh overflow-hidden">
      <a
        href="#main"
        className="sr-only z-[70] rounded-lg bg-accent px-3 py-2 text-sm font-semibold text-on-accent focus:not-sr-only focus:fixed focus:start-3 focus:top-3"
      >
        {t("app.skipToContent")}
      </a>
      <aside className="hidden w-60 shrink-0 border-e border-line lg:block">
        <SidebarContent />
      </aside>

      <div className="flex min-w-0 flex-1 flex-col">
        <header className="flex h-14 shrink-0 items-center gap-2 border-b border-line bg-canvas px-3 lg:hidden">
          <button type="button" className="btn btn-ghost btn-icon" onClick={() => setNavOpen(true)} aria-label={t("nav.openMenu")}>
            <Menu className="size-5" aria-hidden />
          </button>
          <Brand />
          <div className="ms-auto flex items-center gap-1">
            <button type="button" className="btn btn-ghost btn-icon" onClick={() => setPaletteOpen(true)} aria-label={t("palette.title")}>
              <Search className="size-5" aria-hidden />
            </button>
            <button type="button" className="btn btn-primary btn-icon" onClick={() => openCreateCard()} aria-label={t("board.newCard")}>
              <Plus className="size-5" aria-hidden />
            </button>
          </div>
        </header>
        <main id="main" tabIndex={-1} className="min-h-0 flex-1 outline-none">
          {children}
        </main>
      </div>

      <Dialog open={navOpen} onClose={() => setNavOpen(false)} title={t("nav.main")} hideTitle variant="nav" testId="mobile-nav">
        <SidebarContent onNavigate={() => setNavOpen(false)} />
      </Dialog>
      {paletteLoaded ? <CommandPalette /> : null}
      <CreateCardDialog />
      <NewBoardDialog />
      <ShortcutsDialog />
      <GlobalShortcuts />
      <Toaster />
    </div>
  );
}
