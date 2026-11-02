"use client";

import { format, formatDistance } from "date-fns";
import { Check, Link2, Plus, Trash2, X } from "lucide-react";
import { useId, useState, type ReactNode } from "react";
import { Avatar } from "@/components/ui/avatar";
import { ConfirmDialog } from "@/components/ui/confirm-dialog";
import { Dialog } from "@/components/ui/dialog";
import { LabelChip } from "@/components/ui/label-chip";
import { Markdown } from "@/components/ui/markdown";
import { Popover } from "@/components/ui/popover";
import { PriorityIcon } from "@/components/ui/priority-icon";
import { isOverdue, parseDateKey } from "@/lib/dates";
import { useI18n, type Translate } from "@/lib/i18n/use-i18n";
import { kanbanActions, useKanban } from "@/lib/store/app-store";
import { useUi } from "@/lib/store/ui-store";
import { cardKey } from "@/lib/text";
import {
  ESTIMATES,
  LABEL_COLORS,
  PRIORITIES,
  type Activity,
  type Board,
  type Card,
  type KanbanData,
  type Priority,
} from "@/lib/types";
import { useAppParams } from "@/lib/use-app-params";
import { useNow } from "@/lib/use-now";

export function CardDrawer({ board, cardId }: { board: Board; cardId: string | null }) {
  const { t } = useI18n();
  const { setParams } = useAppParams();
  const card = useKanban((state) => (cardId ? state.data.cards[cardId] : undefined));
  const close = () => setParams({ card: null });
  const key = card ? cardKey(board.key, card.number) : "";

  return (
    <Dialog
      open={cardId !== null}
      onClose={close}
      variant="drawer"
      title={card ? <span className="font-mono text-sm font-semibold text-ink-2">{key}</span> : t("card.details")}
      label={card ? `${key}: ${card.title}` : t("card.details")}
      testId="card-drawer"
    >
      {card && card.boardId === board.id ? (
        <CardDetails key={card.id} card={card} board={board} onClose={close} />
      ) : (
        <p className="px-5 py-6 text-sm text-ink-2">{t("card.notFound")}</p>
      )}
    </Dialog>
  );
}

function Field({ label, children, htmlFor }: { label: string; children: ReactNode; htmlFor?: string }) {
  return (
    <div className="grid grid-cols-[6.5rem_minmax(0,1fr)] items-center gap-3 sm:grid-cols-[8rem_minmax(0,1fr)]">
      {htmlFor ? (
        <label htmlFor={htmlFor} className="text-[0.8125rem] font-medium text-ink-3">
          {label}
        </label>
      ) : (
        <span className="text-[0.8125rem] font-medium text-ink-3">{label}</span>
      )}
      <div className="min-w-0">{children}</div>
    </div>
  );
}

function CardDetails({ card, board, onClose }: { card: Card; board: Board; onClose: () => void }) {
  const { t, dateLocale } = useI18n();
  const data = useKanban((state) => state.data);
  const toast = useUi((state) => state.toast);
  const now = useNow();
  const [confirmDelete, setConfirmDelete] = useState(false);
  const ids = { status: useId(), priority: useId(), due: useId(), estimate: useId(), sprint: useId() };
  const column = data.columns[card.columnId];
  const done = column?.category === "done";
  const overdue = !done && isOverdue(card.dueDate, now);
  const labels = Object.values(data.labels).filter((label) => label.boardId === board.id);
  const update = (patch: Parameters<typeof kanbanActions.updateCard>[1]) => kanbanActions.updateCard(card.id, patch);

  return (
    <>
      <div className="min-h-0 flex-1 overflow-y-auto outline-none" tabIndex={-1} data-autofocus>
        <div className="px-5 pt-4">
          <TitleEditor key={card.title} card={card} />
          <p className="mt-1 text-xs text-ink-3">
            {t("card.createdAt", { date: format(card.createdAt, "PPP", { locale: dateLocale }) })}
          </p>
        </div>

        <div className="flex flex-col gap-2.5 border-b border-line px-5 py-4">
          <Field label={t("card.status")} htmlFor={ids.status}>
            <select
              id={ids.status}
              className="field h-8 min-h-8 py-0 text-[0.8125rem]"
              value={card.columnId}
              onChange={(event) => {
                const target = data.columns[event.target.value];
                kanbanActions.moveCard(card.id, event.target.value, target?.cardIds[0] ?? null);
              }}
              data-testid="card-status"
            >
              {board.columnIds.map((id) => (
                <option key={id} value={id}>
                  {data.columns[id]?.name}
                </option>
              ))}
            </select>
          </Field>
          <Field label={t("priority.label")} htmlFor={ids.priority}>
            <div className="flex items-center gap-2">
              <PriorityIcon priority={card.priority} />
              <select
                id={ids.priority}
                className="field h-8 min-h-8 py-0 text-[0.8125rem]"
                value={card.priority}
                onChange={(event) => update({ priority: event.target.value as Priority })}
              >
                {PRIORITIES.map((priority) => (
                  <option key={priority} value={priority}>
                    {t(`priority.${priority}`)}
                  </option>
                ))}
              </select>
            </div>
          </Field>
          <Field label={t("card.assignees")}>
            <AssigneePicker card={card} data={data} />
          </Field>
          <Field label={t("card.labels")}>
            <LabelPicker card={card} board={board} labels={labels} />
          </Field>
          <Field label={t("card.due")} htmlFor={ids.due}>
            <div className="flex items-center gap-2">
              <input
                id={ids.due}
                type="date"
                className={`field h-8 min-h-8 py-0 text-[0.8125rem] ${overdue ? "border-danger/60 text-danger" : ""}`}
                value={card.dueDate ?? ""}
                onChange={(event) => update({ dueDate: event.target.value || null })}
              />
              {overdue ? <span className="chip shrink-0 bg-danger-soft text-danger">{t("card.overdue")}</span> : null}
            </div>
          </Field>
          <Field label={t("card.estimate")} htmlFor={ids.estimate}>
            <select
              id={ids.estimate}
              className="field h-8 min-h-8 py-0 text-[0.8125rem]"
              value={card.estimate ?? ""}
              onChange={(event) => update({ estimate: event.target.value === "" ? null : Number(event.target.value) })}
            >
              <option value="">{t("card.noEstimate")}</option>
              {ESTIMATES.map((value) => (
                <option key={value} value={value}>
                  {t("card.points", { count: value })}
                </option>
              ))}
            </select>
          </Field>
          {board.sprint ? (
            <Field label={t("card.sprint")}>
              <label htmlFor={ids.sprint} className="flex items-center gap-2 text-[0.8125rem]">
                <input
                  id={ids.sprint}
                  type="checkbox"
                  className="size-4 accent-[var(--accent)]"
                  checked={card.inSprint}
                  onChange={(event) => update({ inSprint: event.target.checked })}
                />
                {board.sprint.name} · {t("card.inSprint")}
              </label>
            </Field>
          ) : null}
        </div>

        <section className="border-b border-line px-5 py-4" aria-labelledby="drawer-description">
          <DescriptionEditor key={card.description} card={card} />
        </section>

        <section className="border-b border-line px-5 py-4" aria-labelledby="drawer-checklist">
          <Checklist card={card} />
        </section>

        <section className="px-5 py-4" aria-labelledby="drawer-activity">
          <h3 id="drawer-activity" className="mb-3 text-sm font-semibold">
            {t("card.activity")}
          </h3>
          <ActivityFeed card={card} data={data} now={now} t={t} />
        </section>
      </div>

      <div className="flex items-center justify-between gap-2 border-t border-line px-5 py-3">
        <button
          type="button"
          className="btn btn-ghost btn-sm"
          onClick={() => {
            void navigator.clipboard?.writeText(window.location.href).then(() => toast(t("card.linkCopied")));
          }}
        >
          <Link2 className="size-4" aria-hidden />
          {t("card.copyLink")}
        </button>
        <button type="button" className="btn btn-ghost btn-sm text-danger hover:text-danger" onClick={() => setConfirmDelete(true)}>
          <Trash2 className="size-4" aria-hidden />
          {t("card.delete")}
        </button>
      </div>
      <ConfirmDialog
        open={confirmDelete}
        title={t("card.delete")}
        body={card.title}
        confirmLabel={t("common.delete")}
        onClose={() => setConfirmDelete(false)}
        onConfirm={() => {
          kanbanActions.deleteCard(card.id);
          onClose();
        }}
      />
    </>
  );
}

function TitleEditor({ card }: { card: Card }) {
  const { t } = useI18n();
  const [value, setValue] = useState(card.title);
  const commit = () => {
    if (value.trim() && value.trim() !== card.title) kanbanActions.updateCard(card.id, { title: value });
    else setValue(card.title);
  };
  return (
    <textarea
      aria-label={t("card.title")}
      value={value}
      rows={2}
      maxLength={200}
      onChange={(event) => setValue(event.target.value.replace(/\n/g, " "))}
      onBlur={commit}
      onKeyDown={(event) => {
        if (event.key === "Enter") {
          event.preventDefault();
          event.currentTarget.blur();
        }
      }}
      className="-mx-2 w-[calc(100%+1rem)] resize-none rounded-lg border border-transparent bg-transparent px-2 py-1 text-lg font-semibold leading-snug text-ink [field-sizing:content] hover:border-line focus:border-line"
      data-testid="card-title-input"
    />
  );
}

function DescriptionEditor({ card }: { card: Card }) {
  const { t } = useI18n();
  const [editing, setEditing] = useState(false);
  const [value, setValue] = useState(card.description);
  const save = () => {
    kanbanActions.updateCard(card.id, { description: value });
    setEditing(false);
  };

  return (
    <>
      <div className="mb-2 flex items-center justify-between">
        <h3 id="drawer-description" className="text-sm font-semibold">
          {t("card.description")}
        </h3>
        {!editing ? (
          <button type="button" className="btn btn-ghost btn-sm" onClick={() => setEditing(true)}>
            {t("common.edit")}
          </button>
        ) : null}
      </div>
      {editing ? (
        <div className="flex flex-col gap-2">
          <textarea
            className="field min-h-40 font-mono text-[0.8125rem] leading-relaxed"
            value={value}
            autoFocus
            aria-label={t("card.description")}
            placeholder={t("card.descriptionPlaceholder")}
            onChange={(event) => setValue(event.target.value)}
            onKeyDown={(event) => {
              if (event.key === "Escape") {
                event.preventDefault();
                event.stopPropagation();
                save();
              }
              if (event.key === "Enter" && (event.metaKey || event.ctrlKey)) save();
            }}
          />
          <div className="flex justify-end gap-2">
            <button
              type="button"
              className="btn btn-ghost btn-sm"
              onClick={() => {
                setValue(card.description);
                setEditing(false);
              }}
            >
              {t("common.cancel")}
            </button>
            <button type="button" className="btn btn-primary btn-sm" onClick={save}>
              {t("common.save")}
            </button>
          </div>
        </div>
      ) : card.description ? (
        <Markdown source={card.description} />
      ) : (
        <p className="text-sm text-ink-3">{t("card.noDescription")}</p>
      )}
    </>
  );
}

function Checklist({ card }: { card: Card }) {
  const { t } = useI18n();
  const [text, setText] = useState("");
  const done = card.checklist.filter((item) => item.done).length;
  const total = card.checklist.length;

  return (
    <>
      <div className="mb-2 flex items-center justify-between gap-3">
        <h3 id="drawer-checklist" className="text-sm font-semibold">
          {t("card.checklist")}
        </h3>
        {total ? <span className="text-xs tabular-nums text-ink-3">{t("card.checklistProgress", { done, total })}</span> : null}
      </div>
      {total ? (
        <div
          className="mb-3 h-1.5 overflow-hidden rounded-full bg-sunken"
          role="progressbar"
          aria-valuemin={0}
          aria-valuemax={total}
          aria-valuenow={done}
          aria-label={t("card.checklist")}
        >
          <div className="h-full rounded-full bg-accent transition-[width]" style={{ width: `${(done / total) * 100}%` }} />
        </div>
      ) : null}
      <ul className="flex flex-col gap-0.5">
        {card.checklist.map((item) => (
          <li key={item.id} className="group flex items-center gap-2.5 rounded-lg px-1 py-1 hover:bg-hover">
            <input
              id={`chk-${item.id}`}
              type="checkbox"
              className="size-4 shrink-0 accent-[var(--accent)]"
              checked={item.done}
              onChange={() => kanbanActions.toggleChecklistItem(card.id, item.id)}
            />
            <label htmlFor={`chk-${item.id}`} className={`flex-1 text-sm ${item.done ? "text-ink-3 line-through" : "text-ink"}`}>
              {item.text}
            </label>
            <button
              type="button"
              className="rounded p-1 text-ink-3 opacity-0 transition-opacity group-hover:opacity-100 hover:text-danger focus-visible:opacity-100"
              onClick={() => kanbanActions.removeChecklistItem(card.id, item.id)}
              aria-label={t("card.removeItem", { text: item.text })}
            >
              <X className="size-3.5" aria-hidden />
            </button>
          </li>
        ))}
      </ul>
      <form
        className="mt-2 flex gap-2"
        onSubmit={(event) => {
          event.preventDefault();
          kanbanActions.addChecklistItem(card.id, text);
          setText("");
        }}
      >
        <input
          className="field h-8 min-h-8 py-0 text-[0.8125rem]"
          value={text}
          onChange={(event) => setText(event.target.value)}
          placeholder={t("card.itemPlaceholder")}
          aria-label={t("card.addItem")}
          maxLength={160}
        />
        <button type="submit" className="btn btn-outline btn-sm" disabled={!text.trim()}>
          <Plus className="size-4" aria-hidden />
          {t("common.add")}
        </button>
      </form>
    </>
  );
}

function AssigneePicker({ card, data }: { card: Card; data: KanbanData }) {
  const { t } = useI18n();
  const assigned = card.assigneeIds.map((id) => data.members[id]).filter((member) => member !== undefined);
  return (
    <Popover
      trigger={
        assigned.length ? (
          <span className="flex flex-wrap items-center gap-1.5">
            {assigned.map((member) => (
              <span key={member.id} className="flex items-center gap-1.5 rounded-full bg-sunken py-0.5 ps-0.5 pe-2 text-[0.8125rem]">
                <Avatar member={member} size="xs" />
                {member.name}
              </span>
            ))}
          </span>
        ) : (
          <span className="text-[0.8125rem] text-ink-3">{t("card.unassigned")}</span>
        )
      }
      triggerLabel={`${t("card.assignees")}: ${assigned.map((member) => member.name).join(", ") || t("card.unassigned")}`}
      triggerClassName="-mx-1.5 flex min-h-8 w-[calc(100%+0.75rem)] items-center rounded-lg px-1.5 text-start hover:bg-hover"
      panelClassName="w-60"
    >
      {() =>
        Object.values(data.members).map((member) => {
          const selected = card.assigneeIds.includes(member.id);
          return (
            <button
              key={member.id}
              type="button"
              role="checkbox"
              aria-checked={selected}
              onClick={() =>
                kanbanActions.updateCard(card.id, {
                  assigneeIds: selected ? card.assigneeIds.filter((id) => id !== member.id) : [...card.assigneeIds, member.id],
                })
              }
              className="flex w-full items-center gap-2.5 rounded-lg px-2 py-1.5 text-start text-sm hover:bg-hover"
            >
              <Avatar member={member} size="xs" />
              <span className="flex-1 truncate">{member.name}</span>
              {selected ? <Check className="size-4 text-accent-ink" aria-hidden /> : null}
            </button>
          );
        })
      }
    </Popover>
  );
}

function LabelPicker({ card, board, labels }: { card: Card; board: Board; labels: KanbanData["labels"][string][] }) {
  const { t } = useI18n();
  const [name, setName] = useState("");
  const selected = labels.filter((label) => card.labelIds.includes(label.id));
  return (
    <Popover
      trigger={
        selected.length ? (
          <span className="flex flex-wrap gap-1">
            {selected.map((label) => (
              <LabelChip key={label.id} label={label} />
            ))}
          </span>
        ) : (
          <span className="text-[0.8125rem] text-ink-3">{t("card.noLabels")}</span>
        )
      }
      triggerLabel={`${t("card.labels")}: ${selected.map((label) => label.name).join(", ") || t("card.noLabels")}`}
      triggerClassName="-mx-1.5 flex min-h-8 w-[calc(100%+0.75rem)] items-center rounded-lg px-1.5 text-start hover:bg-hover"
      panelClassName="w-60"
    >
      {() => (
        <>
          {labels.map((label) => {
            const on = card.labelIds.includes(label.id);
            return (
              <button
                key={label.id}
                type="button"
                role="checkbox"
                aria-checked={on}
                onClick={() =>
                  kanbanActions.updateCard(card.id, {
                    labelIds: on ? card.labelIds.filter((id) => id !== label.id) : [...card.labelIds, label.id],
                  })
                }
                className="flex w-full items-center gap-2.5 rounded-lg px-2 py-1.5 text-start hover:bg-hover"
              >
                <LabelChip label={label} />
                <span className="flex-1" />
                {on ? <Check className="size-4 text-accent-ink" aria-hidden /> : null}
              </button>
            );
          })}
          <form
            className="mt-1 flex gap-1.5 border-t border-line pt-2"
            onSubmit={(event) => {
              event.preventDefault();
              const color = LABEL_COLORS[labels.length % LABEL_COLORS.length] ?? "slate";
              const id = kanbanActions.createLabel(board.id, name, color);
              if (id) kanbanActions.updateCard(card.id, { labelIds: [...card.labelIds, id] });
              setName("");
            }}
          >
            <input
              className="field h-8 min-h-8 py-0 text-[0.8125rem]"
              value={name}
              maxLength={24}
              onChange={(event) => setName(event.target.value)}
              placeholder={t("card.newLabel")}
              aria-label={t("card.labelName")}
            />
            <button type="submit" className="btn btn-outline btn-sm btn-icon shrink-0" disabled={!name.trim()} aria-label={t("common.add")}>
              <Plus className="size-4" aria-hidden />
            </button>
          </form>
        </>
      )}
    </Popover>
  );
}

function describeActivity(activity: Activity, data: KanbanData, t: Translate, priorityName: (value: string) => string): string {
  const column = (id: string) => data.columns[id]?.name ?? t("activity.deletedColumn");
  switch (activity.type) {
    case "created":
      return t("activity.created", { column: column(activity.toColumnId) });
    case "moved":
      return t("activity.moved", { from: column(activity.fromColumnId), to: column(activity.toColumnId) });
    case "updated":
      switch (activity.field) {
        case "priority":
          return t("activity.priority", { value: priorityName(activity.value ?? "") });
        case "dueDate":
          return activity.value ? t("activity.dueDate", { value: activity.value }) : t("activity.dueDateCleared");
        case "estimate":
          return t("activity.estimate", { value: activity.value ?? "" });
        case "checklist":
          return t("activity.checklist", { value: activity.value ?? "" });
        case "title":
          return t("activity.title");
        case "description":
          return t("activity.description");
        case "labels":
          return t("activity.labels");
        case "assignees":
          return t("activity.assignees");
        case "sprint":
          return t("activity.sprint");
      }
  }
}

function ActivityFeed({ card, data, now, t }: { card: Card; data: KanbanData; now: number; t: Translate }) {
  const { dateLocale } = useI18n();
  const activities = Object.values(data.activities)
    .filter((activity) => activity.cardId === card.id)
    .sort((a, b) => b.at - a.at);
  const priorityName = (value: string) =>
    (PRIORITIES as readonly string[]).includes(value) ? t(`priority.${value as Priority}`) : value;

  if (activities.length === 0) return <p className="text-sm text-ink-3">{t("activity.empty")}</p>;

  return (
    <ol className="relative flex flex-col gap-3.5 before:absolute before:start-3 before:top-2 before:bottom-2 before:w-px before:bg-line" data-testid="activity-feed">
      {activities.map((activity) => {
        const actor = activity.actorId ? data.members[activity.actorId] : undefined;
        const due = activity.type === "updated" && activity.field === "dueDate" && activity.value ? parseDateKey(activity.value) : null;
        const text = describeActivity(
          due && activity.type === "updated" ? { ...activity, value: format(due, "PPP", { locale: dateLocale }) } : activity,
          data,
          t,
          priorityName,
        );
        return (
          <li key={activity.id} className="relative flex gap-3">
            <span className="relative z-[1] mt-0.5 flex size-6 shrink-0 items-center justify-center rounded-full bg-surface">
              {actor ? <Avatar member={actor} size="sm" /> : <span className="size-2 rounded-full bg-line-strong" />}
            </span>
            <div className="min-w-0 text-[0.8125rem] leading-relaxed">
              <p className="text-ink-2">
                <span className="font-semibold text-ink">{actor?.name ?? t("activity.system")}</span> {text}
              </p>
              <time
                dateTime={new Date(activity.at).toISOString()}
                title={format(activity.at, "PPPp", { locale: dateLocale })}
                className="text-xs text-ink-3"
              >
                {now ? formatDistance(activity.at, now, { addSuffix: true, locale: dateLocale }) : ""}
              </time>
            </div>
          </li>
        );
      })}
    </ol>
  );
}
