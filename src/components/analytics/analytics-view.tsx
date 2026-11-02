"use client";

import dynamic from "next/dynamic";
import { AlarmClock, CheckCircle2, Gauge, Timer, TriangleAlert } from "lucide-react";
import { useMemo, type ReactNode } from "react";
import { useI18n } from "@/lib/i18n/use-i18n";
import { boardMetrics } from "@/lib/metrics";
import { useKanban } from "@/lib/store/app-store";
import { useActiveBoard } from "@/lib/use-app-params";
import { useNow } from "@/lib/use-now";

function ChartsPlaceholder() {
  return (
    <div className="grid gap-4 lg:grid-cols-2" aria-hidden>
      {[0, 1, 2, 3].map((index) => (
        <div key={index} className={`h-[22rem] rounded-2xl border border-line bg-surface ${index === 0 ? "lg:col-span-2" : ""}`} />
      ))}
    </div>
  );
}

// Recharts is only needed here, so it lives in its own chunk.
const Charts = dynamic(() => import("./charts"), { ssr: false, loading: ChartsPlaceholder });

function KpiTile({
  label,
  value,
  hint,
  icon,
  tone = "default",
  testId,
}: {
  label: string;
  value: string;
  hint: ReactNode;
  icon: ReactNode;
  tone?: "default" | "warn" | "danger";
  testId: string;
}) {
  return (
    <div className="flex flex-col gap-2 rounded-2xl border border-line bg-surface p-4" data-testid={testId}>
      <div className="flex items-center justify-between gap-2 text-[0.8125rem] font-medium text-ink-2">
        {label}
        <span className="text-ink-3" aria-hidden>
          {icon}
        </span>
      </div>
      <p className="text-[1.75rem] font-semibold leading-none tracking-[-0.01em] text-ink" data-testid={`${testId}-value`}>
        {value}
      </p>
      <p
        className={`flex items-center gap-1.5 text-xs ${
          tone === "warn" ? "font-semibold text-warn" : tone === "danger" ? "font-semibold text-danger" : "text-ink-3"
        }`}
      >
        {tone !== "default" ? <TriangleAlert className="size-3.5 shrink-0" aria-hidden /> : null}
        {hint}
      </p>
    </div>
  );
}

export function AnalyticsView() {
  const { t, numberLocale } = useI18n();
  const status = useKanban((state) => state.status);
  const data = useKanban((state) => state.data);
  const board = useActiveBoard();
  const now = useNow();
  const metrics = useMemo(() => (board && now ? boardMetrics(data, board.id, now) : null), [board, data, now]);

  const days = (value: number | null) =>
    value === null ? "–" : t("unit.days", { value: new Intl.NumberFormat(numberLocale, { maximumFractionDigits: 1 }).format(value) });

  return (
    <div className="h-full overflow-y-auto">
      <div className="mx-auto flex max-w-[90rem] flex-col gap-5 px-4 py-5 lg:px-6">
        <header className="flex flex-col gap-1">
          <p className="text-[0.8125rem] font-semibold text-accent-ink">{board?.name ?? " "}</p>
          <h1 className="text-xl font-bold tracking-[-0.01em] sm:text-2xl">{t("analytics.title")}</h1>
          <p className="text-sm text-ink-2">{t("analytics.subtitle")}</p>
        </header>

        {status === "error" ? <p className="text-sm text-danger">{t("app.loadError")}</p> : null}

        {metrics ? (
          <>
            <section className="grid grid-cols-2 gap-3 xl:grid-cols-4" aria-label={t("analytics.title")}>
              <KpiTile
                testId="kpi-wip"
                label={t("kpi.wip")}
                value={String(metrics.kpis.activeWip)}
                icon={<Gauge className="size-4" />}
                tone={metrics.kpis.wipLimit !== null && metrics.kpis.activeWip > metrics.kpis.wipLimit ? "warn" : "default"}
                hint={
                  metrics.kpis.wipLimit === null
                    ? t("kpi.wipNoLimit")
                    : metrics.kpis.activeWip > metrics.kpis.wipLimit
                      ? `${t("kpi.wipOver", { count: metrics.kpis.activeWip - metrics.kpis.wipLimit })} · ${t("kpi.wipLimit", { limit: metrics.kpis.wipLimit })}`
                      : t("kpi.wipLimit", { limit: metrics.kpis.wipLimit })
                }
              />
              <KpiTile
                testId="kpi-cycle"
                label={t("kpi.cycle")}
                value={days(metrics.kpis.avgCycleDays)}
                icon={<Timer className="size-4" />}
                hint={metrics.kpis.p85CycleDays === null ? "–" : t("kpi.cycleHint", { value: days(metrics.kpis.p85CycleDays) })}
              />
              <KpiTile
                testId="kpi-done"
                label={t("kpi.done")}
                value={String(metrics.kpis.completedThisWeek)}
                icon={<CheckCircle2 className="size-4" />}
                hint={t("kpi.doneHint", { count: metrics.kpis.completedLastWeek })}
              />
              <KpiTile
                testId="kpi-overdue"
                label={t("kpi.overdue")}
                value={String(metrics.kpis.overdue)}
                icon={<AlarmClock className="size-4" />}
                tone={metrics.kpis.overdue > 0 ? "danger" : "default"}
                hint={t("kpi.overdueHint")}
              />
            </section>
            <Charts metrics={metrics} now={now} />
          </>
        ) : (
          <ChartsPlaceholder />
        )}
      </div>
    </div>
  );
}
