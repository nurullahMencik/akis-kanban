"use client";

import { Check, ChevronDown, Search, X } from "lucide-react";
import { useState, type ReactNode } from "react";
import { Avatar } from "@/components/ui/avatar";
import { LabelChip } from "@/components/ui/label-chip";
import { Popover } from "@/components/ui/popover";
import { PriorityIcon } from "@/components/ui/priority-icon";
import { activeFilterCount, filtersToParams, type CardFilters, type DueFilter } from "@/lib/filters";
import { useI18n } from "@/lib/i18n/use-i18n";
import { useKanban } from "@/lib/store/app-store";
import { PRIORITIES, type Board } from "@/lib/types";
import { useAppParams } from "@/lib/use-app-params";

function toggle<T>(values: T[], value: T): T[] {
  return values.includes(value) ? values.filter((entry) => entry !== value) : [...values, value];
}

function FilterButton({ label, count }: { label: string; count: number }) {
  return (
    <>
      {label}
      {count > 0 ? (
        <span className="rounded-full bg-accent px-1.5 text-[0.6875rem] font-bold leading-[1.125rem] text-on-accent">{count}</span>
      ) : null}
      <ChevronDown className="size-3.5 text-ink-3" aria-hidden />
    </>
  );
}

function Option({ selected, onToggle, children }: { selected: boolean; onToggle: () => void; children: ReactNode }) {
  return (
    <button
      type="button"
      role="checkbox"
      aria-checked={selected}
      onClick={onToggle}
      className="flex w-full items-center gap-2.5 rounded-lg px-2 py-1.5 text-start text-sm text-ink hover:bg-hover"
    >
      <span
        className={`flex size-4 shrink-0 items-center justify-center rounded border ${
          selected ? "border-accent bg-accent text-on-accent" : "border-line-strong"
        }`}
        aria-hidden
      >
        {selected ? <Check className="size-3" strokeWidth={3} /> : null}
      </span>
      {children}
    </button>
  );
}

/**
 * The text filter keeps its own state: the URL is updated on every keystroke,
 * but reading the value back from the URL would lag behind fast typing.
 */
function SearchInput({ initial, onChange }: { initial: string; onChange: (value: string) => void }) {
  const { t } = useI18n();
  const [value, setValue] = useState(initial);
  return (
    <div className="relative w-full sm:w-64">
      <Search className="pointer-events-none absolute start-2.5 top-1/2 size-4 -translate-y-1/2 text-ink-3" aria-hidden />
      <input
        id="board-search"
        type="search"
        value={value}
        onChange={(event) => {
          setValue(event.target.value);
          onChange(event.target.value);
        }}
        onKeyDown={(event) => {
          if (event.key === "Escape" && value) {
            event.preventDefault();
            setValue("");
            onChange("");
          }
        }}
        placeholder={t("filters.searchPlaceholder")}
        aria-label={t("filters.search")}
        className="field h-8 min-h-8 ps-8 pe-8 text-[0.8125rem]"
        autoComplete="off"
        data-testid="board-search"
      />
      <kbd className="kbd pointer-events-none absolute end-2 top-1/2 hidden -translate-y-1/2 sm:inline-flex" aria-hidden>
        /
      </kbd>
    </div>
  );
}

export function FilterBar({ board, filters, shown, total }: { board: Board; filters: CardFilters; shown: number; total: number }) {
  const { t } = useI18n();
  const { setParams } = useAppParams();
  const members = useKanban((state) => state.data.members);
  const labels = useKanban((state) => state.data.labels);
  const boardLabels = Object.values(labels).filter((label) => label.boardId === board.id);
  const active = activeFilterCount(filters);
  const [resetKey, setResetKey] = useState(0);
  const apply = (next: Partial<CardFilters>) => setParams(filtersToParams({ ...filters, ...next }));
  const buttonClass = (on: boolean) =>
    `btn btn-sm border ${on ? "border-accent/50 bg-accent-soft text-accent-ink" : "border-line bg-surface text-ink-2 hover:border-line-strong hover:text-ink"}`;

  return (
    <div role="group" aria-label={t("filters.label")} className="flex flex-wrap items-center gap-2">
      <SearchInput key={`${board.id}-${resetKey}`} initial={filters.q} onChange={(q) => apply({ q })} />

      <Popover
        trigger={<FilterButton label={t("filters.assignee")} count={filters.assignees.length} />}
        triggerClassName={buttonClass(filters.assignees.length > 0)}
        panelClassName="w-60"
      >
        {() =>
          Object.values(members).map((member) => (
            <Option
              key={member.id}
              selected={filters.assignees.includes(member.id)}
              onToggle={() => apply({ assignees: toggle(filters.assignees, member.id) })}
            >
              <Avatar member={member} size="xs" />
              <span className="truncate">{member.name}</span>
            </Option>
          ))
        }
      </Popover>

      <Popover
        trigger={<FilterButton label={t("filters.labels")} count={filters.labels.length} />}
        triggerClassName={buttonClass(filters.labels.length > 0)}
        panelClassName="w-56"
      >
        {() =>
          boardLabels.map((label) => (
            <Option key={label.id} selected={filters.labels.includes(label.id)} onToggle={() => apply({ labels: toggle(filters.labels, label.id) })}>
              <LabelChip label={label} compact />
            </Option>
          ))
        }
      </Popover>

      <Popover
        trigger={<FilterButton label={t("filters.priority")} count={filters.priorities.length} />}
        triggerClassName={buttonClass(filters.priorities.length > 0)}
        panelClassName="w-48"
      >
        {() =>
          PRIORITIES.map((priority) => (
            <Option
              key={priority}
              selected={filters.priorities.includes(priority)}
              onToggle={() => apply({ priorities: toggle(filters.priorities, priority) })}
            >
              <PriorityIcon priority={priority} className="size-3.5" />
              {t(`priority.${priority}`)}
            </Option>
          ))
        }
      </Popover>

      <div role="radiogroup" aria-label={t("filters.due")} className="flex h-8 items-center rounded-lg border border-line bg-surface p-0.5">
        {([null, "overdue", "week"] as (DueFilter | null)[]).map((value) => (
          <button
            key={value ?? "any"}
            type="button"
            role="radio"
            aria-checked={filters.due === value}
            onClick={() => apply({ due: value })}
            className={`h-full rounded-md px-2.5 text-[0.8125rem] font-semibold transition-colors ${
              filters.due === value ? "bg-accent-soft text-accent-ink" : "text-ink-2 hover:text-ink"
            }`}
          >
            {value === null ? t("filters.dueAny") : value === "overdue" ? t("filters.dueOverdue") : t("filters.dueWeek")}
          </button>
        ))}
      </div>

      {active > 0 ? (
        <button
          type="button"
          className="btn btn-ghost btn-sm"
          onClick={() => {
            setParams(filtersToParams({ q: "", assignees: [], labels: [], priorities: [], due: null }));
            setResetKey((value) => value + 1);
          }}
        >
          <X className="size-3.5" aria-hidden />
          {t("filters.clear")}
        </button>
      ) : null}
      <span className="ms-auto text-xs tabular-nums text-ink-3" aria-live="polite" data-testid="filter-count">
        {t("filters.showing", { shown, total })}
      </span>
    </div>
  );
}
