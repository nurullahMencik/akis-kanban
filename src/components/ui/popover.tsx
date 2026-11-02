"use client";

import { useCallback, useEffect, useId, useLayoutEffect, useRef, useState, type ReactNode } from "react";

interface PopoverProps {
  /** Content of the trigger button. */
  trigger: ReactNode;
  triggerLabel?: string;
  triggerClassName?: string;
  align?: "start" | "end";
  panelClassName?: string;
  children: (close: () => void) => ReactNode;
  testId?: string;
}

const GAP = 6;
const EDGE = 8;

/**
 * Disclosure popover. The panel is fixed-positioned and clamped to the viewport,
 * so it can never cause horizontal page scrolling on small screens.
 */
export function Popover({ trigger, triggerLabel, triggerClassName, align = "start", panelClassName, children, testId }: PopoverProps) {
  const [open, setOpen] = useState(false);
  const buttonRef = useRef<HTMLButtonElement>(null);
  const panelRef = useRef<HTMLDivElement>(null);
  const panelId = useId();
  const close = useCallback(() => setOpen(false), []);

  const place = useCallback(() => {
    const button = buttonRef.current;
    const panel = panelRef.current;
    if (!button || !panel) return;
    const rect = button.getBoundingClientRect();
    const width = panel.offsetWidth;
    const preferred = align === "end" ? rect.right - width : rect.left;
    const left = Math.min(Math.max(preferred, EDGE), window.innerWidth - width - EDGE);
    const below = rect.bottom + GAP;
    const fitsBelow = below + panel.offsetHeight <= window.innerHeight - EDGE;
    const top = fitsBelow ? below : Math.max(EDGE, rect.top - GAP - panel.offsetHeight);
    panel.style.left = `${Math.max(EDGE, left)}px`;
    panel.style.top = `${top}px`;
  }, [align]);

  useLayoutEffect(() => {
    if (open) place();
  }, [open, place]);

  useEffect(() => {
    if (!open) return;
    const onPointerDown = (event: PointerEvent) => {
      const target = event.target as Node;
      if (!panelRef.current?.contains(target) && !buttonRef.current?.contains(target)) setOpen(false);
    };
    const onKeyDown = (event: KeyboardEvent) => {
      if (event.key !== "Escape") return;
      event.stopPropagation();
      setOpen(false);
      buttonRef.current?.focus();
    };
    const onFocusOut = (event: FocusEvent) => {
      const next = event.relatedTarget as Node | null;
      if (next && !panelRef.current?.contains(next) && !buttonRef.current?.contains(next)) setOpen(false);
    };
    const panel = panelRef.current;
    document.addEventListener("pointerdown", onPointerDown);
    document.addEventListener("keydown", onKeyDown, true);
    panel?.addEventListener("focusout", onFocusOut);
    window.addEventListener("resize", place);
    window.addEventListener("scroll", place, true);
    return () => {
      document.removeEventListener("pointerdown", onPointerDown);
      document.removeEventListener("keydown", onKeyDown, true);
      panel?.removeEventListener("focusout", onFocusOut);
      window.removeEventListener("resize", place);
      window.removeEventListener("scroll", place, true);
    };
  }, [open, place]);

  return (
    <>
      <button
        ref={buttonRef}
        type="button"
        aria-expanded={open}
        aria-controls={open ? panelId : undefined}
        aria-label={triggerLabel}
        className={triggerClassName}
        data-testid={testId}
        onClick={() => setOpen((value) => !value)}
      >
        {trigger}
      </button>
      {open ? (
        <div
          ref={panelRef}
          id={panelId}
          className={`fixed z-50 max-w-[calc(100vw-1rem)] rounded-xl border border-line bg-surface p-1.5 text-sm shadow-[var(--shadow-pop)] ${panelClassName ?? ""}`}
          style={{ left: -9999, top: -9999 }}
        >
          {children(close)}
        </div>
      ) : null}
    </>
  );
}

export function PopoverItem({
  children,
  onSelect,
  selected,
  disabled,
  danger,
  title,
}: {
  children: ReactNode;
  onSelect: () => void;
  selected?: boolean;
  disabled?: boolean;
  danger?: boolean;
  title?: string;
}) {
  return (
    <button
      type="button"
      disabled={disabled}
      title={title}
      aria-pressed={selected}
      onClick={onSelect}
      className={`flex w-full items-center gap-2.5 rounded-lg px-2.5 py-2 text-start text-sm transition-colors hover:bg-hover disabled:cursor-not-allowed disabled:opacity-55 ${
        danger ? "text-danger" : "text-ink"
      }`}
    >
      {children}
    </button>
  );
}
