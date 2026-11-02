"use client";

import { X } from "lucide-react";
import { useEffect, useId, useRef, type ReactNode } from "react";
import { useI18n } from "@/lib/i18n/use-i18n";

interface DialogProps {
  open: boolean;
  onClose: () => void;
  title: ReactNode;
  /** Visually hide the title (it still names the dialog). */
  hideTitle?: boolean;
  description?: ReactNode;
  variant?: "center" | "drawer" | "palette" | "nav";
  /** Accessible name when the visible title is not descriptive enough. */
  label?: string;
  className?: string;
  children: ReactNode;
  testId?: string;
}

const VARIANTS = {
  center:
    "m-auto w-[min(32rem,calc(100vw-2rem))] max-h-[min(40rem,calc(100dvh-2rem))] rounded-2xl border border-line bg-surface p-0 shadow-[var(--shadow-pop)]",
  drawer:
    "my-0 me-0 ms-auto h-dvh max-h-dvh w-full sm:w-[min(40rem,92vw)] rounded-none sm:rounded-s-2xl border-s border-line bg-surface p-0 shadow-[var(--shadow-pop)]",
  palette:
    "mx-auto mt-[12vh] mb-auto w-[min(38rem,calc(100vw-1.5rem))] rounded-2xl border border-line bg-surface p-0 shadow-[var(--shadow-pop)]",
  nav: "my-0 ms-0 me-auto h-dvh max-h-dvh w-[min(18rem,86vw)] rounded-e-2xl border-e border-line bg-canvas p-0 shadow-[var(--shadow-pop)]",
} as const;

/**
 * Thin wrapper around the native <dialog>: showModal() provides the focus trap,
 * inert background, Escape handling and top-layer stacking for free.
 */
export function Dialog({ open, onClose, title, hideTitle, description, variant = "center", label, className, children, testId }: DialogProps) {
  const ref = useRef<HTMLDialogElement>(null);
  const titleId = useId();
  const descriptionId = useId();
  const { t } = useI18n();

  useEffect(() => {
    const dialog = ref.current;
    if (!dialog) return;
    if (open && !dialog.open) {
      dialog.showModal();
      // showModal() focuses the first focusable element (often the close button);
      // move focus to the element the dialog marks as its starting point instead.
      dialog.querySelector<HTMLElement>("[data-autofocus]")?.focus();
    }
    if (!open && dialog.open) dialog.close();
  }, [open]);

  return (
    <dialog
      ref={ref}
      aria-labelledby={label ? undefined : titleId}
      aria-label={label}
      aria-describedby={description ? descriptionId : undefined}
      data-testid={testId}
      className={`${VARIANTS[variant]} text-ink backdrop:backdrop-blur-[1px] ${className ?? ""}`}
      onClose={onClose}
      onCancel={(event) => {
        event.preventDefault();
        onClose();
      }}
      onMouseDown={(event) => {
        // Clicking the backdrop (the dialog element itself, outside the content box) closes it.
        if (event.target === event.currentTarget) onClose();
      }}
    >
      {open ? (
        <div className="flex h-full max-h-[inherit] flex-col">
          {variant !== "palette" ? (
            <div
              className={`flex items-start justify-between gap-4 px-5 ${
                hideTitle ? "absolute end-2 top-2 z-10 p-0" : "border-b border-line py-4"
              }`}
            >
              <div className="min-w-0">
                <h2 id={titleId} className={hideTitle ? "sr-only" : "text-base font-semibold text-ink"}>
                  {title}
                </h2>
                {description ? (
                  <p id={descriptionId} className="mt-1 text-sm text-ink-2">
                    {description}
                  </p>
                ) : null}
              </div>
              <button type="button" className="btn btn-ghost btn-icon btn-sm -me-2 shrink-0" onClick={onClose} aria-label={t("common.close")}>
                <X className="size-4" aria-hidden />
              </button>
            </div>
          ) : (
            <h2 id={titleId} className="sr-only">
              {title}
            </h2>
          )}
          {children}
        </div>
      ) : null}
    </dialog>
  );
}
