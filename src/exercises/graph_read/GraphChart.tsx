"use client";

import {
  Bar,
  BarChart,
  CartesianGrid,
  Line,
  LineChart,
  ResponsiveContainer,
  Scatter,
  ScatterChart,
  Tooltip,
  XAxis,
  YAxis,
  type TooltipContentProps,
} from "recharts";
import { RichText } from "@/components/ui/RichText";
import { formatNumber } from "../_shared/numbers";
import { toUnicodeText } from "../_shared/unicodeText";
import { chartAxes, chartRows, scatterData, SERIES_COLORS, SERIES_SHAPES, seriesKey } from "./chartData";
import type { GraphRead } from "./schema";

type Chart = GraphRead["chart"];

const tick = { fill: "var(--muted)", fontSize: 13, fontWeight: 700 };
const axisLine = { stroke: "var(--line-strong)" };
const axisLabel = { fill: "var(--ink-soft)", fontSize: 13, fontWeight: 700 };
const MARGIN = { top: 12, right: 22, bottom: 8, left: 8 };

/**
 * Recharts rendering of a graph_read chart, themed with design tokens.
 * Exact values appear in the tooltip only once `reveal` is set (after
 * checking) — before that the learner reads them off the gridlines.
 */
export function GraphChart({ chart, reveal }: { chart: Chart; reveal: boolean }) {
  const axes = chartAxes(chart);
  const xLabel = toUnicodeText(chart.xLabel);
  const yLabel = toUnicodeText(chart.yLabel);

  const xAxisLabel = { value: xLabel, position: "insideBottom" as const, offset: -2, ...axisLabel };
  const yAxisLabel = {
    value: yLabel,
    angle: -90,
    position: "insideLeft" as const,
    offset: 10,
    style: { textAnchor: "middle" as const },
    ...axisLabel,
  };
  const yAxis = (
    <YAxis
      type="number"
      dataKey={chart.kind === "scatter" ? "y" : undefined}
      domain={axes.y.domain}
      ticks={axes.y.ticks}
      tickFormatter={(v: number) => toUnicodeText(formatNumber(v))}
      tick={tick}
      axisLine={axisLine}
      tickLine={false}
      width={68}
      label={yAxisLabel}
    />
  );
  const grid = <CartesianGrid stroke="var(--line)" strokeWidth={1} vertical={chart.kind !== "bar"} />;
  const tooltip = (cursor: object) => (
    <Tooltip
      isAnimationActive={false}
      cursor={cursor}
      wrapperStyle={{ outline: "none" }}
      content={(props) => <ChartTooltip {...props} chart={chart} reveal={reveal} />}
    />
  );
  const lineCursor = { stroke: "var(--line-strong)", strokeWidth: 1.5, strokeDasharray: "4 4" };

  let body: React.ReactElement;
  if (chart.kind === "bar") {
    body = (
      <BarChart data={chartRows(chart)} margin={MARGIN} barGap={3} barCategoryGap="28%">
        {grid}
        <XAxis dataKey="label" type="category" tick={tick} axisLine={axisLine} tickLine={false} height={48} label={xAxisLabel} interval={0} />
        {yAxis}
        {tooltip({ fill: "var(--surface-2)" })}
        {chart.series.map((s, i) => (
          <Bar
            key={i}
            dataKey={seriesKey(i)}
            name={s.name}
            fill={SERIES_COLORS[i]}
            radius={[6, 6, 0, 0]}
            maxBarSize={36}
            isAnimationActive={false}
          />
        ))}
      </BarChart>
    );
  } else if (chart.kind === "line") {
    const rows = chartRows(chart);
    const showDots = rows.length <= 16;
    body = (
      <LineChart data={rows} margin={MARGIN}>
        {grid}
        <XAxis
          dataKey="x"
          type="number"
          domain={axes.x.domain}
          ticks={axes.x.ticks}
          tickFormatter={(v: number) => toUnicodeText(formatNumber(v))}
          tick={tick}
          axisLine={axisLine}
          tickLine={false}
          height={48}
          label={xAxisLabel}
            />
        {yAxis}
        {tooltip(lineCursor)}
        {chart.series.map((s, i) => (
          <Line
            key={i}
            dataKey={seriesKey(i)}
            name={s.name}
            type="linear"
            stroke={SERIES_COLORS[i]}
            strokeWidth={3}
            strokeLinecap="round"
            strokeLinejoin="round"
            connectNulls
            dot={showDots ? { r: 4.5, fill: SERIES_COLORS[i], stroke: "var(--surface)", strokeWidth: 2 } : false}
            activeDot={{ r: 6.5, fill: SERIES_COLORS[i], stroke: "var(--surface)", strokeWidth: 2.5 }}
            isAnimationActive={false}
          />
        ))}
      </LineChart>
    );
  } else {
    body = (
      <ScatterChart margin={MARGIN}>
        {grid}
        <XAxis
          dataKey="x"
          type="number"
          domain={axes.x.domain}
          ticks={axes.x.ticks}
          tickFormatter={(v: number) => toUnicodeText(formatNumber(v))}
          tick={tick}
          axisLine={axisLine}
          tickLine={false}
          height={48}
          label={xAxisLabel}
            />
        {yAxis}
        {tooltip(lineCursor)}
        {scatterData(chart).map((data, i) => (
          <Scatter
            key={i}
            data={data}
            name={chart.series[i].name}
            fill={SERIES_COLORS[i]}
            shape={(props: { cx?: number; cy?: number }) => <SeriesMarker index={i} cx={props.cx} cy={props.cy} />}
            isAnimationActive={false}
          />
        ))}
      </ScatterChart>
    );
  }

  return (
    <ResponsiveContainer width="100%" height={280} initialDimension={{ width: 640, height: 280 }}>
      {body}
    </ResponsiveContainer>
  );
}

/** Scatter marker: shape varies by series as well as colour, ringed in the surface colour. */
export function SeriesMarker({ index, cx, cy }: { index: number; cx?: number; cy?: number }) {
  if (cx === undefined || cy === undefined) return null;
  const fill = SERIES_COLORS[index];
  const ring = { fill, stroke: "var(--surface)", strokeWidth: 2 };
  switch (SERIES_SHAPES[index]) {
    case "diamond":
      return <path d={`M${cx} ${cy - 8}L${cx + 8} ${cy}L${cx} ${cy + 8}L${cx - 8} ${cy}Z`} strokeLinejoin="round" {...ring} />;
    case "square":
      return <rect x={cx - 6.5} y={cy - 6.5} width={13} height={13} rx={3} {...ring} />;
    case "triangle":
      return <path d={`M${cx} ${cy - 8}L${cx + 8} ${cy + 6}L${cx - 8} ${cy + 6}Z`} strokeLinejoin="round" {...ring} />;
    default:
      return <circle cx={cx} cy={cy} r={6.5} {...ring} />;
  }
}

function isRecord(v: unknown): v is Record<string, unknown> {
  return typeof v === "object" && v !== null;
}

function ChartTooltip({
  active,
  payload,
  chart,
  reveal,
}: TooltipContentProps & { chart: Chart; reveal: boolean }) {
  if (!active || !payload?.length) return null;
  const datum: unknown = payload[0].payload;
  if (!isRecord(datum)) return null;

  let header: string;
  let rows: { name: string; value: number; color: string }[];
  if (chart.kind === "scatter") {
    if (!reveal) return null;
    const series = Number(datum.series);
    header = formatNumber(Number(datum.x));
    rows = [{ name: chart.series[series]?.name ?? "", value: Number(datum.y), color: SERIES_COLORS[series] }];
  } else {
    header = chart.kind === "bar" ? String(datum.label) : formatNumber(Number(datum.x));
    rows = chart.series
      .map((s, i) => ({ name: s.name, value: datum[seriesKey(i)], color: SERIES_COLORS[i] }))
      .filter((r): r is { name: string; value: number; color: (typeof SERIES_COLORS)[number] } => typeof r.value === "number");
  }

  return (
    <div className="min-w-32 rounded-2xl border-2 border-line bg-surface px-3.5 py-2.5 text-sm shadow-pop">
      <p className="text-xs font-bold text-muted">
        <RichText text={chart.xLabel} />
      </p>
      <p className="font-display text-base font-semibold text-ink">
        <RichText text={header} />
      </p>
      {reveal && (
        <ul className="mt-1.5 grid gap-1">
          {rows.map((r) => (
            <li key={r.name} className="flex items-center gap-2 font-semibold text-ink-soft">
              <span aria-hidden className="size-2.5 shrink-0 rounded-full" style={{ background: r.color }} />
              <span className="min-w-0 flex-1 truncate">{chart.series.length > 1 ? r.name : toUnicodeText(chart.yLabel)}</span>
              <span className="font-bold text-ink tabular-nums">
                <RichText text={formatNumber(r.value)} />
              </span>
            </li>
          ))}
        </ul>
      )}
    </div>
  );
}
