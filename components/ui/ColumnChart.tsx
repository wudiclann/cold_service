export interface ColumnDatum {
  key: string;
  /** Text under the column; leave empty to skip a label (long periods). */
  label: string;
  value: number;
  /** Shown on hover, e.g. "Tue 27 Oct · RM 450.00". */
  tooltip: string;
}

// A round top for the y axis: 1, 2 or 5 times a power of ten, at most `ticks` steps.
function niceScale(max: number, ticks: number, emptyMax: number, integer: boolean) {
  if (max <= 0) return { top: emptyMax, step: emptyMax / ticks };
  const raw = max / ticks;
  const pow = Math.pow(10, Math.floor(Math.log10(raw)));
  let step = [1, 2, 5, 10].map((m) => m * pow).find((s) => s >= raw) ?? pow * 10;
  if (integer) step = Math.max(1, Math.ceil(step)); // counts never get a 0.5 tick
  return { top: Math.ceil(max / step) * step, step };
}

/**
 * Plain HTML/CSS column chart: one hue, square-ish columns, a few faint gridlines,
 * no y-axis line. Zeros draw no column (an empty period stays an honest empty plot).
 */
export function ColumnChart({
  data,
  format = (n) => String(n),
  ticks = 4,
  emptyMax = 4,
  integer = false,
  height = 200,
  ariaLabel,
}: {
  data: ColumnDatum[];
  format?: (n: number) => string;
  ticks?: number;
  /** Top of the axis when every value is zero. */
  emptyMax?: number;
  /** Whole-number axis (counts). */
  integer?: boolean;
  height?: number;
  ariaLabel: string;
}) {
  const max = Math.max(0, ...data.map((d) => d.value));
  const { top, step } = niceScale(max, ticks, emptyMax, integer);
  const tickValues = Array.from({ length: Math.round(top / step) + 1 }, (_, i) => i * step);

  return (
    <div role="img" aria-label={ariaLabel} className="flex gap-2 pt-3">
      <div className="relative w-9 shrink-0" style={{ height }}>
        {tickValues.map((t) => (
          <span
            key={t}
            className="absolute right-0 -translate-y-1/2 text-xs text-muted tabular-nums"
            style={{ bottom: `${(t / top) * 100}%` }}
          >
            {format(t)}
          </span>
        ))}
      </div>

      <div className="flex-1 min-w-0">
        <div className="relative" style={{ height }}>
          {tickValues.map((t, i) => (
            <div
              key={t}
              className={`absolute inset-x-0 border-t ${i === 0 ? "border-control" : "border-rule"}`}
              style={{ bottom: `${(t / top) * 100}%` }}
            />
          ))}
          <div className="absolute inset-0 flex items-end gap-[3px] sm:gap-1.5">
            {data.map((d) => {
              const pct = (d.value / top) * 100;
              return (
                <div key={d.key} className="group relative h-full flex-1 min-w-0 flex items-end justify-center">
                  {d.value > 0 && (
                    <>
                      <div
                        className="w-full max-w-[34px] rounded-t-[3px] bg-chart group-hover:bg-[#0066b8] transition-colors"
                        style={{ height: `max(${pct}%, 3px)` }}
                      />
                      <span
                        className="pointer-events-none absolute z-10 mb-1.5 -translate-y-0 whitespace-nowrap rounded-md bg-ink px-2 py-1 text-xs text-white opacity-0 group-hover:opacity-100 transition-opacity"
                        style={{ bottom: `max(${pct}%, 3px)` }}
                      >
                        {d.tooltip}
                      </span>
                    </>
                  )}
                </div>
              );
            })}
          </div>
        </div>
        <div className="mt-2 flex gap-[3px] sm:gap-1.5">
          {data.map((d) => (
            <div key={d.key} className="flex-1 min-w-0 text-center text-xs text-muted">
              {d.label && <span className="inline-block whitespace-nowrap">{d.label}</span>}
            </div>
          ))}
        </div>
      </div>
    </div>
  );
}
