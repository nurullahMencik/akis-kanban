"use client";

import { format, startOfDay } from "date-fns";
import { useEffect, useRef, useState, type ReactNode } from "react";
import {
  Area,
  AreaChart,
  Bar,
  BarChart,
  CartesianGrid,
  LabelList,
  Line,
  LineChart,
  ReferenceLine,
  Scatter,
  ScatterChart,
  Tooltip,
  XAxis,
  YAxis,
  type TooltipContentProps,
} from "recharts";
import { useI18n } from "@/lib/i18n/use-i18n";
import type { BoardMetrics } from "@/lib/metrics";
import { useKanban } from "@/lib/store/app-store";
import { cardKey } from "@/lib/text";

const AXIS_TICK = { fill: "var(--chart-muted)", fontSize: 11 };
const AXIS_LINE = { stroke: "var(--chart-axis)" };
const GRID = "var(--chart-grid)";
const SERIES = "var(--chart-series)";
const SURFACE = "var(--chart-surface)";
const MUTED_LINE = "var(--chart-muted)";
const HEIGHT = 280;

/** Ordinal ramp for column stages (validated with the dataviz ordinal checks); interpolated past 5 columns. */
function flowColor(index: number, count: number): string {
  if (count <= 1) return "var(--flow-3)";
  if (count <= 5) return `var(--flow-${Math.round((index * 4) / (count - 1)) + 1})`;
  const share = Math.round((index / (count - 1)) * 100);
  return `color-mix(in oklab, var(--flow-5) ${share}%, var(--flow-1))`;
}

function useFormatters() {
  const { t, dateLocale, numberLocale } = useI18n();
  const number = new Intl.NumberFormat(numberLocale, { maximumFractionDigits: 1 });
  return {
    t,
    day: (value: number) => format(value, "d MMM", { locale: dateLocale }),
    longDay: (value: number) => format(value, "EEEE, d MMMM", { locale: dateLocale }),
    days: (value: number) => t("unit.daysShort", { value: number.format(value) }),
    daysLong: (value: number) => t("unit.days", { value: number.format(value) }),
    number: (value: number) => number.format(value),
  };
}

/**
 * Mounts the (comparatively expensive) Recharts tree only once its slot is near the
 * viewport. Keeps the analytics page responsive on slow phones; the reserved height
 * avoids layout shift.
 */
function WhenVisible({ height, children }: { height: number; children: ReactNode }) {
  const ref = useRef<HTMLDivElement>(null);
  const [visible, setVisible] = useState(false);

  useEffect(() => {
    const node = ref.current;
    if (!node) return;
    const observer = new IntersectionObserver(
      (entries) => {
        if (entries.some((entry) => entry.isIntersecting)) {
          setVisible(true);
          observer.disconnect();
        }
      },
      { rootMargin: "120px 0px" },
    );
    observer.observe(node);
    return () => observer.disconnect();
  }, []);

  return (
    <div ref={ref} style={{ minHeight: height }}>
      {visible ? children : null}
    </div>
  );
}

function ChartCard({
  title,
  description,
  legend,
  table,
  className,
  testId,
  height = HEIGHT,
  children,
}: {
  title: string;
  description: string;
  legend?: ReactNode;
  table: ReactNode;
  className?: string;
  testId: string;
  height?: number;
  children: ReactNode;
}) {
  const { t } = useI18n();
  return (
    <figure className={`flex min-w-0 flex-col rounded-2xl border border-line bg-surface p-4 sm:p-5 ${className ?? ""}`} data-testid={testId}>
      <figcaption className="flex flex-col gap-1">
        <h2 className="text-[0.9375rem] font-semibold text-ink">{title}</h2>
        <p className="text-xs leading-relaxed text-ink-3">{description}</p>
      </figcaption>
      {legend ? <div className="mt-3">{legend}</div> : null}
      <div className="mt-3 min-w-0" data-chart>
        <WhenVisible height={height}>{children}</WhenVisible>
      </div>
      <details className="mt-2 text-xs">
        <summary className="w-fit rounded py-1 font-semibold text-ink-2 hover:text-ink">{t("chart.table")}</summary>
        <div className="scroll-thin mt-2 max-h-64 overflow-auto rounded-lg border border-line">{table}</div>
      </details>
    </figure>
  );
}

function DataTable({ head, rows }: { head: string[]; rows: (string | number)[][] }) {
  return (
    <table className="w-full border-collapse text-start text-xs tabular-nums">
      <thead className="sticky top-0 bg-sunken">
        <tr>
          {head.map((cell) => (
            <th key={cell} scope="col" className="px-3 py-1.5 text-start font-semibold text-ink-2">
              {cell}
            </th>
          ))}
        </tr>
      </thead>
      <tbody>
        {rows.map((row, index) => (
          <tr key={index} className="border-t border-line">
            {row.map((cell, cellIndex) => (
              <td key={cellIndex} className="px-3 py-1.5 text-ink-2">
                {cell}
              </td>
            ))}
          </tr>
        ))}
      </tbody>
    </table>
  );
}

function TooltipBox({ title, children }: { title: ReactNode; children: ReactNode }) {
  return (
    <div className="min-w-40 rounded-lg border border-line bg-surface px-3 py-2 text-xs shadow-[var(--shadow-pop)]">
      <p className="mb-1.5 font-semibold text-ink">{title}</p>
      <div className="flex flex-col gap-1">{children}</div>
    </div>
  );
}

/** Tooltip row: value first (strong), series name second, keyed by a short stroke. */
function TooltipRow({ color, value, label, dashed }: { color: string; value: string; label: string; dashed?: boolean }) {
  return (
    <div className="flex items-center gap-2">
      <svg width="12" height="4" aria-hidden className="shrink-0">
        <line x1="0" y1="2" x2="12" y2="2" stroke={color} strokeWidth="2.5" strokeDasharray={dashed ? "3 2" : undefined} strokeLinecap="round" />
      </svg>
      <span className="font-semibold tabular-nums text-ink">{value}</span>
      <span className="text-ink-2">{label}</span>
    </div>
  );
}

function LegendItem({ color, label, shape = "rect", dashed }: { color: string; label: string; shape?: "rect" | "line" | "dot"; dashed?: boolean }) {
  return (
    <li className="flex items-center gap-1.5">
      {shape === "rect" ? (
        <span className="size-2.5 rounded-[3px]" style={{ background: color }} aria-hidden />
      ) : shape === "dot" ? (
        <span className="size-2.5 rounded-full" style={{ background: color }} aria-hidden />
      ) : (
        <svg width="16" height="6" aria-hidden>
          <line x1="1" y1="3" x2="15" y2="3" stroke={color} strokeWidth="2" strokeDasharray={dashed ? "4 3" : undefined} strokeLinecap="round" />
        </svg>
      )}
      {label}
    </li>
  );
}

function Legend({ children }: { children: ReactNode }) {
  return <ul className="flex flex-wrap gap-x-4 gap-y-1.5 text-xs text-ink-2">{children}</ul>;
}

/* -------------------------------------------------------------- CFD */

function CumulativeFlow({ metrics }: { metrics: BoardMetrics }) {
  const f = useFormatters();
  const { columns, cfd } = metrics;
  const rows = cfd.map((row) => ({ day: row.day, ...row.counts }));
  const ticks = cfd.filter((row) => new Date(row.day).getDay() === 1).map((row) => row.day);
  const colors = new Map(columns.map((column, index) => [column.id, flowColor(index, columns.length)]));

  const content = ({ active, payload, label }: TooltipContentProps) => {
    if (!active || !payload?.length) return null;
    const row = rows.find((entry) => entry.day === label);
    if (!row) return null;
    const total = columns.reduce((sum, column) => sum + ((row as Record<string, number>)[column.id] ?? 0), 0);
    return (
      <TooltipBox title={f.longDay(Number(label))}>
        {columns.map((column) => (
          <TooltipRow
            key={column.id}
            color={colors.get(column.id) ?? SERIES}
            value={String((row as Record<string, number>)[column.id] ?? 0)}
            label={column.name}
          />
        ))}
        <p className="mt-1 border-t border-line pt-1 text-ink-2">
          <span className="font-semibold text-ink">{total}</span> {f.t("chart.total")}
        </p>
      </TooltipBox>
    );
  };

  return (
    <ChartCard
      testId="chart-cfd"
      className="lg:col-span-2"
      height={HEIGHT + 40}
      title={f.t("chart.cfd")}
      description={f.t("chart.cfdDesc")}
      legend={
        <Legend>
          {columns.map((column) => (
            <LegendItem key={column.id} color={colors.get(column.id) ?? SERIES} label={column.name} />
          ))}
        </Legend>
      }
      table={
        <DataTable
          head={[f.t("chart.date"), ...columns.map((column) => column.name)]}
          rows={[...cfd].reverse().map((row) => [f.day(row.day), ...columns.map((column) => row.counts[column.id] ?? 0)])}
        />
      }
    >
      <AreaChart
        responsive
        style={{ width: "100%", height: HEIGHT + 40 }}
        data={rows}
        margin={{ top: 4, right: 8, bottom: 0, left: -12 }}
        title={f.t("chart.cfd")}
      >
        <CartesianGrid vertical={false} stroke={GRID} />
        <XAxis dataKey="day" type="category" ticks={ticks} tickFormatter={f.day} tick={AXIS_TICK} axisLine={AXIS_LINE} tickLine={false} minTickGap={16} />
        <YAxis allowDecimals={false} tick={AXIS_TICK} axisLine={false} tickLine={false} width={44} />
        <Tooltip content={content} cursor={{ stroke: "var(--chart-axis)", strokeWidth: 1 }} />
        {[...columns].reverse().map((column) => (
          <Area
            key={column.id}
            dataKey={column.id}
            name={column.name}
            stackId="flow"
            type="monotoneX"
            stroke={SURFACE}
            strokeWidth={1.5}
            fill={colors.get(column.id)}
            fillOpacity={1}
            isAnimationActive={false}
            activeDot={false}
          />
        ))}
      </AreaChart>
    </ChartCard>
  );
}

/* ------------------------------------------------------- cycle time */

interface DotProps {
  cx?: number;
  cy?: number;
}

function ScatterDot({ cx, cy }: DotProps) {
  if (cx === undefined || cy === undefined) return null;
  return (
    <g>
      <circle cx={cx} cy={cy} r={12} fill="transparent" />
      <circle cx={cx} cy={cy} r={4.5} fill={SERIES} stroke={SURFACE} strokeWidth={2} />
    </g>
  );
}

function CycleTime({ metrics, now }: { metrics: BoardMetrics; now: number }) {
  const f = useFormatters();
  const data = useKanban((state) => state.data);
  const { board, cycleTimes, percentiles } = metrics;
  const from = metrics.cfd[0]?.day ?? now;
  const points = cycleTimes
    .filter((sample) => sample.completedAt >= from)
    .map((sample) => {
      const card = data.cards[sample.cardId];
      return {
        x: sample.completedAt,
        y: Math.round(sample.days * 10) / 10,
        key: card ? cardKey(board.key, card.number) : "",
        title: card?.title ?? "",
      };
    });
  const lines = (
    [
      ["50", percentiles.p50, "insideTopRight", "2 3"],
      ["85", percentiles.p85, "insideBottomRight", "6 4"],
      ["95", percentiles.p95, "insideTopRight", undefined],
    ] as const
  ).filter(([, value]) => value !== null);

  const content = ({ active, payload }: TooltipContentProps) => {
    const point = payload?.[0]?.payload as (typeof points)[number] | undefined;
    if (!active || !point) return null;
    return (
      <TooltipBox title={`${point.key} · ${f.day(point.x)}`}>
        <p className="max-w-56 text-ink-2">{point.title}</p>
        <TooltipRow color={SERIES} value={f.daysLong(point.y)} label={f.t("chart.cycle")} />
      </TooltipBox>
    );
  };

  return (
    <ChartCard
      testId="chart-cycle"
      title={f.t("chart.cycle")}
      description={f.t("chart.cycleDesc")}
      legend={
        <Legend>
          <LegendItem color={SERIES} label={f.t("chart.completed")} shape="dot" />
          {lines.map(([p, value, , dash]) => (
            <LegendItem key={p} color={MUTED_LINE} shape="line" dashed={dash !== undefined} label={`${f.t("chart.percentile", { p })}: ${f.days(value ?? 0)}`} />
          ))}
        </Legend>
      }
      table={
        <DataTable
          head={[f.t("chart.card"), f.t("chart.completedOn"), f.t("chart.cycleDays")]}
          rows={[...points].reverse().map((point) => [`${point.key} ${point.title}`, f.day(point.x), f.number(point.y)])}
        />
      }
    >
      <ScatterChart responsive style={{ width: "100%", height: HEIGHT }} margin={{ top: 12, right: 12, bottom: 0, left: -12 }} title={f.t("chart.cycle")}>
        <CartesianGrid vertical={false} stroke={GRID} />
        <XAxis
          dataKey="x"
          type="number"
          scale="time"
          domain={[from, startOfDay(now).getTime() + 86_400_000]}
          tickFormatter={f.day}
          tick={AXIS_TICK}
          axisLine={AXIS_LINE}
          tickLine={false}
          tickCount={6}
          name={f.t("chart.completedOn")}
        />
        <YAxis dataKey="y" type="number" tick={AXIS_TICK} axisLine={false} tickLine={false} width={44} tickFormatter={(value: number) => f.number(value)} name={f.t("chart.cycleDays")} />
        <Tooltip content={content} cursor={false} />
        {lines.map(([p, value, position, dash]) => (
          <ReferenceLine
            key={p}
            y={value ?? 0}
            stroke={MUTED_LINE}
            strokeWidth={1}
            strokeDasharray={dash}
            ifOverflow="extendDomain"
            label={{ value: `${f.t("chart.percentile", { p })} · ${f.days(value ?? 0)}`, position, fill: "var(--chart-ink)", fontSize: 11 }}
          />
        ))}
        <Scatter data={points} shape={<ScatterDot />} isAnimationActive={false} />
      </ScatterChart>
    </ChartCard>
  );
}

/* ------------------------------------------------------- throughput */

function Throughput({ metrics }: { metrics: BoardMetrics }) {
  const f = useFormatters();
  const weeks = metrics.throughput.map((week) => ({ ...week, label: f.day(week.weekStart) }));
  const complete = weeks.slice(0, -1);
  const average = complete.length ? complete.reduce((sum, week) => sum + week.count, 0) / complete.length : null;

  const content = ({ active, payload }: TooltipContentProps) => {
    const week = payload?.[0]?.payload as (typeof weeks)[number] | undefined;
    if (!active || !week) return null;
    return (
      <TooltipBox title={f.t("chart.weekOf", { date: week.label })}>
        <TooltipRow color={SERIES} value={String(week.count)} label={f.t("chart.completed")} />
      </TooltipBox>
    );
  };

  return (
    <ChartCard
      testId="chart-throughput"
      title={f.t("chart.throughput")}
      description={f.t("chart.throughputDesc")}
      legend={
        <Legend>
          <LegendItem color={SERIES} label={f.t("chart.completed")} />
          {average !== null ? <LegendItem color={MUTED_LINE} shape="line" dashed label={f.t("chart.average", { value: f.number(average) })} /> : null}
        </Legend>
      }
      table={<DataTable head={[f.t("chart.week"), f.t("chart.completed")]} rows={weeks.map((week) => [week.label, week.count])} />}
    >
      <BarChart responsive style={{ width: "100%", height: HEIGHT }} data={weeks} margin={{ top: 20, right: 12, bottom: 0, left: -12 }} title={f.t("chart.throughput")}>
        <CartesianGrid vertical={false} stroke={GRID} />
        <XAxis dataKey="label" tick={AXIS_TICK} axisLine={AXIS_LINE} tickLine={false} />
        <YAxis allowDecimals={false} tick={AXIS_TICK} axisLine={false} tickLine={false} width={44} />
        <Tooltip content={content} cursor={{ fill: "var(--hover)", opacity: 0.6 }} />
        {average !== null ? (
          <ReferenceLine y={average} stroke={MUTED_LINE} strokeDasharray="5 4" />
        ) : null}
        <Bar dataKey="count" fill={SERIES} radius={[4, 4, 0, 0]} maxBarSize={24} isAnimationActive={false}>
          <LabelList dataKey="count" position="top" fill="var(--chart-ink)" fontSize={11} />
        </Bar>
      </BarChart>
    </ChartCard>
  );
}

/* --------------------------------------------------------- burndown */

function Burndown({ metrics, now }: { metrics: BoardMetrics; now: number }) {
  const f = useFormatters();
  const { burndown, board } = metrics;

  if (!burndown || !board.sprint) {
    return (
      <figure className="flex min-h-48 flex-col rounded-2xl border border-line bg-surface p-5 lg:col-span-2" data-testid="chart-burndown">
        <figcaption>
          <h2 className="text-[0.9375rem] font-semibold">{f.t("chart.burndown")}</h2>
        </figcaption>
        <p className="m-auto text-sm text-ink-3">{f.t("chart.noSprint")}</p>
      </figure>
    );
  }

  const points = burndown.points.map((point) => ({ ...point, label: f.day(point.day), idealRounded: Math.round(point.ideal * 10) / 10 }));
  const today = startOfDay(now).getTime();
  const todayLabel = points.find((point) => point.day === today)?.label;
  const lastActual = points.reduce((last, point, index) => (point.remaining !== null ? index : last), -1);

  const content = ({ active, payload }: TooltipContentProps) => {
    const point = payload?.[0]?.payload as (typeof points)[number] | undefined;
    if (!active || !point) return null;
    return (
      <TooltipBox title={f.longDay(point.day)}>
        {point.remaining !== null ? <TooltipRow color={SERIES} value={String(point.remaining)} label={f.t("chart.remaining")} /> : null}
        <TooltipRow color={MUTED_LINE} dashed value={f.number(point.idealRounded)} label={f.t("chart.ideal")} />
      </TooltipBox>
    );
  };

  return (
    <ChartCard
      testId="chart-burndown"
      className="lg:col-span-2"
      title={f.t("chart.burndown")}
      description={f.t("chart.burndownDesc", { sprint: board.sprint.name })}
      legend={
        <Legend>
          <LegendItem color={SERIES} shape="line" label={f.t("chart.remaining")} />
          <LegendItem color={MUTED_LINE} shape="line" dashed label={f.t("chart.ideal")} />
        </Legend>
      }
      table={
        <DataTable
          head={[f.t("chart.date"), f.t("chart.remaining"), f.t("chart.ideal")]}
          rows={points.map((point) => [point.label, point.remaining ?? "–", f.number(point.idealRounded)])}
        />
      }
    >
      <LineChart responsive style={{ width: "100%", height: HEIGHT }} data={points} margin={{ top: 16, right: 28, bottom: 0, left: -12 }} title={f.t("chart.burndown")}>
        <CartesianGrid vertical={false} stroke={GRID} />
        <XAxis dataKey="label" tick={AXIS_TICK} axisLine={AXIS_LINE} tickLine={false} interval="preserveStartEnd" minTickGap={12} />
        <YAxis allowDecimals={false} tick={AXIS_TICK} axisLine={false} tickLine={false} width={44} domain={[0, "dataMax"]} />
        <Tooltip content={content} cursor={{ stroke: "var(--chart-axis)", strokeWidth: 1 }} />
        {todayLabel ? (
          <ReferenceLine
            x={todayLabel}
            stroke="var(--chart-axis)"
            label={{ value: f.t("chart.today"), position: "insideTopLeft", fill: "var(--chart-ink)", fontSize: 11 }}
          />
        ) : null}
        <Line dataKey="idealRounded" name={f.t("chart.ideal")} stroke={MUTED_LINE} strokeWidth={1.5} strokeDasharray="5 4" dot={false} activeDot={false} isAnimationActive={false} />
        <Line
          dataKey="remaining"
          name={f.t("chart.remaining")}
          stroke={SERIES}
          strokeWidth={2}
          strokeLinecap="round"
          strokeLinejoin="round"
          dot={{ r: 4, fill: SERIES, stroke: SURFACE, strokeWidth: 2 }}
          activeDot={{ r: 5, fill: SERIES, stroke: SURFACE, strokeWidth: 2 }}
          connectNulls={false}
          isAnimationActive={false}
        >
          <LabelList
            dataKey="remaining"
            content={({ x, y, value, index }) =>
              index === lastActual && typeof x === "number" && typeof y === "number" ? (
                <text x={x + 8} y={y - 8} fill="var(--chart-ink)" fontSize={11} fontWeight={600}>
                  {value}
                </text>
              ) : null
            }
          />
        </Line>
      </LineChart>
    </ChartCard>
  );
}

export default function Charts({ metrics, now }: { metrics: BoardMetrics; now: number }) {
  return (
    <div className="grid gap-4 lg:grid-cols-2" data-testid="charts">
      <CumulativeFlow metrics={metrics} />
      <CycleTime metrics={metrics} now={now} />
      <Throughput metrics={metrics} />
      <Burndown metrics={metrics} now={now} />
    </div>
  );
}
