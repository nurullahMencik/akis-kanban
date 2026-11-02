"use client";

import { useState } from "react";
import { Dialog } from "@/components/ui/dialog";
import { useI18n } from "@/lib/i18n/use-i18n";
import { kanbanActions } from "@/lib/store/app-store";
import { useUi } from "@/lib/store/ui-store";
import type { ColumnCategory } from "@/lib/types";
import { buildHref, useAppParams } from "@/lib/use-app-params";

const CATEGORIES: ColumnCategory[] = ["backlog", "todo", "active", "active", "done"];
const WIP: (number | null)[] = [null, null, 4, 3, null];

export function NewBoardDialog() {
  const { t } = useI18n();
  const open = useUi((state) => state.newBoardOpen);
  const setOpen = useUi((state) => state.setNewBoardOpen);

  return (
    <Dialog open={open} onClose={() => setOpen(false)} title={t("board.newBoardTitle")} testId="new-board-dialog">
      <NewBoardForm onDone={() => setOpen(false)} />
    </Dialog>
  );
}

function NewBoardForm({ onDone }: { onDone: () => void }) {
  const { t } = useI18n();
  const { router, pathname } = useAppParams();
  const [name, setName] = useState("");

  return (
    <form
      className="flex flex-col gap-4 px-5 py-4"
      onSubmit={(event) => {
        event.preventDefault();
        const names = t("board.defaultColumns").split("|");
        const id = kanbanActions.createBoard({
          name,
          columns: names.map((columnName, index) => ({
            name: columnName,
            category: CATEGORIES[index] ?? "active",
            wipLimit: WIP[index] ?? null,
          })),
        });
        if (!id) return;
        onDone();
        router.push(buildHref(pathname.startsWith("/analytics") ? "/analytics/" : "/", { board: id }));
      }}
    >
      <label className="flex flex-col gap-1.5 text-sm font-medium">
        {t("board.boardName")}
        <input
          className="field"
          value={name}
          onChange={(event) => setName(event.target.value)}
          placeholder={t("board.boardNamePlaceholder")}
          required
          data-autofocus
          maxLength={80}
        />
      </label>
      <p className="text-xs leading-relaxed text-ink-3">{t("board.boardNameHint")}</p>
      <div className="flex justify-end gap-2">
        <button type="button" className="btn btn-outline" onClick={onDone}>
          {t("common.cancel")}
        </button>
        <button type="submit" className="btn btn-primary" disabled={!name.trim()}>
          {t("common.create")}
        </button>
      </div>
    </form>
  );
}
