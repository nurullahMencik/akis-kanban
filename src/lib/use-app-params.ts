"use client";

import { usePathname, useRouter, useSearchParams } from "next/navigation";
import { useCallback, useMemo } from "react";
import { useKanban } from "@/lib/store/app-store";
import type { Board } from "@/lib/types";

export type ParamChanges = Record<string, string | null | undefined>;

export function buildHref(path: string, params: Record<string, string | null | undefined>): string {
  const search = new URLSearchParams();
  for (const [key, value] of Object.entries(params)) if (value) search.set(key, value);
  const query = search.toString();
  return query ? `${path}?${query}` : path;
}

/** Query string is the source of truth for board, card and filter selection (static export friendly). */
export function useAppParams() {
  const searchParams = useSearchParams();
  const router = useRouter();
  const pathname = usePathname();

  // Query-only changes go through the native History API, which Next.js syncs with
  // useSearchParams without a router round-trip (instant filter typing, back button closes cards).
  const setParams = useCallback(
    (changes: ParamChanges, mode: "replace" | "push" = "replace") => {
      const next = new URLSearchParams(window.location.search);
      for (const [key, value] of Object.entries(changes)) {
        if (value === null || value === undefined || value === "") next.delete(key);
        else next.set(key, value);
      }
      const query = next.toString();
      const url = `${window.location.pathname}${query ? `?${query}` : ""}`;
      if (mode === "push") window.history.pushState(null, "", url);
      else window.history.replaceState(null, "", url);
    },
    [],
  );

  return { searchParams, setParams, pathname, router };
}

export function useBoards(): Board[] {
  const boards = useKanban((state) => state.data.boards);
  return useMemo(() => Object.values(boards).sort((a, b) => a.createdAt - b.createdAt), [boards]);
}

/** The board named in `?board=`, falling back to the oldest board. */
export function useActiveBoard(): Board | null {
  const { searchParams } = useAppParams();
  const boards = useBoards();
  const requested = searchParams.get("board");
  return boards.find((board) => board.id === requested) ?? boards[0] ?? null;
}
