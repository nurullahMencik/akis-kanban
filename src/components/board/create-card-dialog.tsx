"use client";

import { useState } from "react";
import { Dialog } from "@/components/ui/dialog";
import { useI18n } from "@/lib/i18n/use-i18n";
import { kanbanActions, useKanban } from "@/lib/store/app-store";
import { defaultColumnId } from "@/lib/store/operations";
import { useUi } from "@/lib/store/ui-store";
import { cardKey } from "@/lib/text";
import { PRIORITIES, type Board, type Priority } from "@/lib/types";
import { useActiveBoard } from "@/lib/use-app-params";

export function CreateCardDialog() {
  const { t } = useI18n();
  const state = useUi((ui) => ui.createCard);
  const close = useUi((ui) => ui.closeCreateCard);
  const board = useActiveBoard();

  return (
    <Dialog open={state.open && board !== null} onClose={close} title={t("create.title")} testId="create-card-dialog">
      {board ? <CreateCardForm board={board} initialColumnId={state.columnId} onDone={close} /> : null}
    </Dialog>
  );
}

function CreateCardForm({ board, initialColumnId, onDone }: { board: Board; initialColumnId: string | null; onDone: () => void }) {
  const { t } = useI18n();
  const data = useKanban((state) => state.data);
  const toast = useUi((ui) => ui.toast);
  const [title, setTitle] = useState("");
  const [columnId, setColumnId] = useState(initialColumnId ?? defaultColumnId(data, board.id) ?? "");
  const [priority, setPriority] = useState<Priority>("medium");

  return (
    <form
      className="flex flex-col gap-4 px-5 py-4"
      onSubmit={(event) => {
        event.preventDefault();
        const number = board.nextCardNumber;
        const id = kanbanActions.createCard({ boardId: board.id, columnId, title, priority });
        if (!id) return;
        toast(t("create.created", { key: cardKey(board.key, number) }));
        onDone();
      }}
    >
      <label className="flex flex-col gap-1.5 text-sm font-medium">
        {t("card.title")}
        <input
          className="field"
          name="title"
          value={title}
          onChange={(event) => setTitle(event.target.value)}
          placeholder={t("create.titlePlaceholder")}
          required
          data-autofocus
          maxLength={200}
        />
      </label>
      <div className="grid grid-cols-2 gap-3">
        <label className="flex flex-col gap-1.5 text-sm font-medium">
          {t("create.column")}
          <select className="field" value={columnId} onChange={(event) => setColumnId(event.target.value)}>
            {board.columnIds.map((id) => (
              <option key={id} value={id}>
                {data.columns[id]?.name}
              </option>
            ))}
          </select>
        </label>
        <label className="flex flex-col gap-1.5 text-sm font-medium">
          {t("priority.label")}
          <select className="field" value={priority} onChange={(event) => setPriority(event.target.value as Priority)}>
            {PRIORITIES.map((value) => (
              <option key={value} value={value}>
                {t(`priority.${value}`)}
              </option>
            ))}
          </select>
        </label>
      </div>
      <div className="flex justify-end gap-2">
        <button type="button" className="btn btn-outline" onClick={onDone}>
          {t("common.cancel")}
        </button>
        <button type="submit" className="btn btn-primary" disabled={!title.trim()}>
          {t("create.submit")}
        </button>
      </div>
    </form>
  );
}
