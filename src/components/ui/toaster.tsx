"use client";

import { X } from "lucide-react";
import { useI18n } from "@/lib/i18n/use-i18n";
import { useUi } from "@/lib/store/ui-store";

export function Toaster() {
  const toasts = useUi((state) => state.toasts);
  const dismiss = useUi((state) => state.dismissToast);
  const announcement = useUi((state) => state.announcement);
  const { t } = useI18n();

  return (
    <>
      <div
        className="pointer-events-none fixed inset-x-0 bottom-4 z-[60] flex flex-col items-center gap-2 px-4 sm:items-end sm:px-6"
        role="status"
        aria-live="polite"
      >
        {toasts.map((toast) => (
          <div
            key={toast.id}
            data-testid="toast"
            className={`pointer-events-auto flex max-w-sm items-center gap-3 rounded-xl border px-4 py-2.5 text-sm font-medium shadow-[var(--shadow-pop)] ${
              toast.tone === "error" ? "border-danger/40 bg-danger-soft text-danger" : "border-line bg-ink text-canvas"
            }`}
          >
            <span>{toast.message}</span>
            <button
              type="button"
              onClick={() => dismiss(toast.id)}
              className="-me-1 rounded p-0.5 opacity-80 hover:opacity-100"
              aria-label={t("common.close")}
            >
              <X className="size-3.5" aria-hidden />
            </button>
          </div>
        ))}
      </div>
      <div className="sr-only" aria-live="polite" aria-atomic="true">
        {announcement}
      </div>
    </>
  );
}
