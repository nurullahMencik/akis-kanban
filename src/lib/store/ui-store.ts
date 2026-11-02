import { create } from "zustand";
import type { ID } from "@/lib/types";

export interface Toast {
  id: number;
  message: string;
  tone: "default" | "error";
}

interface CreateCardState {
  open: boolean;
  columnId: ID | null;
}

interface UiState {
  paletteOpen: boolean;
  /** The palette chunk is lazy; once loaded it stays mounted so focus returns correctly on close. */
  paletteLoaded: boolean;
  shortcutsOpen: boolean;
  newBoardOpen: boolean;
  navOpen: boolean;
  createCard: CreateCardState;
  toasts: Toast[];
  /** Polite screen reader message that is not tied to a toast. */
  announcement: string;
  setPaletteOpen(open: boolean): void;
  setShortcutsOpen(open: boolean): void;
  setNewBoardOpen(open: boolean): void;
  setNavOpen(open: boolean): void;
  openCreateCard(columnId?: ID | null): void;
  closeCreateCard(): void;
  toast(message: string, tone?: Toast["tone"]): void;
  dismissToast(id: number): void;
  announce(message: string): void;
}

let toastSeq = 0;

export const useUi = create<UiState>()((set) => ({
  paletteOpen: false,
  paletteLoaded: false,
  shortcutsOpen: false,
  newBoardOpen: false,
  navOpen: false,
  createCard: { open: false, columnId: null },
  toasts: [],
  announcement: "",
  setPaletteOpen: (paletteOpen) => set((state) => ({ paletteOpen, paletteLoaded: state.paletteLoaded || paletteOpen })),
  setShortcutsOpen: (shortcutsOpen) => set({ shortcutsOpen }),
  setNewBoardOpen: (newBoardOpen) => set({ newBoardOpen }),
  setNavOpen: (navOpen) => set({ navOpen }),
  openCreateCard: (columnId = null) => set({ createCard: { open: true, columnId }, paletteOpen: false }),
  closeCreateCard: () => set({ createCard: { open: false, columnId: null } }),
  toast: (message, tone = "default") => {
    const id = ++toastSeq;
    set((state) => ({ toasts: [...state.toasts.slice(-2), { id, message, tone }] }));
    window.setTimeout(() => set((state) => ({ toasts: state.toasts.filter((entry) => entry.id !== id) })), 4200);
  },
  dismissToast: (id) => set((state) => ({ toasts: state.toasts.filter((entry) => entry.id !== id) })),
  announce: (announcement) => set({ announcement }),
}));
