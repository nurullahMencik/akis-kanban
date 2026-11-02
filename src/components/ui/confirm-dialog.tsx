"use client";

import type { ReactNode } from "react";
import { useI18n } from "@/lib/i18n/use-i18n";
import { Dialog } from "./dialog";

export function ConfirmDialog({
  open,
  title,
  body,
  confirmLabel,
  onConfirm,
  onClose,
  danger = true,
}: {
  open: boolean;
  title: string;
  body: ReactNode;
  confirmLabel: string;
  onConfirm: () => void;
  onClose: () => void;
  danger?: boolean;
}) {
  const { t } = useI18n();
  return (
    <Dialog open={open} onClose={onClose} title={title} testId="confirm-dialog">
      <div className="px-5 py-4 text-sm leading-relaxed text-ink-2">{body}</div>
      <div className="flex justify-end gap-2 border-t border-line px-5 py-3">
        <button type="button" className="btn btn-outline" onClick={onClose} data-autofocus>
          {t("common.cancel")}
        </button>
        <button
          type="button"
          className={`btn ${danger ? "btn-danger" : "btn-primary"}`}
          onClick={() => {
            onConfirm();
            onClose();
          }}
        >
          {confirmLabel}
        </button>
      </div>
    </Dialog>
  );
}
