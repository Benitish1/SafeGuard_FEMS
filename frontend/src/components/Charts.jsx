// Lightweight dependency-free charts: a donut (conic-gradient) and a bar list.
const PALETTE = ['#f97316', '#ef4444', '#f59e0b', '#10b981', '#3b82f6', '#8b5cf6', '#64748b'];

// Donut chart drawn purely with a CSS conic-gradient (no chart library).
export function Donut({ data, size = 160 }) {
  const entries = Object.entries(data || {}).filter(([, v]) => v > 0); // drop empty slices
  const total = entries.reduce((s, [, v]) => s + v, 0) || 1;           // avoid divide-by-zero
  // Convert each value into a colour band measured in degrees around the circle.
  let acc = 0;
  const stops = entries.map(([, v], i) => {
    const start = (acc / total) * 360;
    acc += v;
    const end = (acc / total) * 360;
    return `${PALETTE[i % PALETTE.length]} ${start}deg ${end}deg`;
  });
  // Join the bands into one conic-gradient; fall back to a flat grey ring when empty.
  const bg = entries.length ? `conic-gradient(${stops.join(',')})` : '#334155';

  return (
    <div className="flex items-center gap-5">
      <div className="relative shrink-0" style={{ width: size, height: size }}>
        <div className="h-full w-full rounded-full" style={{ background: bg }} />
        <div className="absolute inset-[18%] grid place-items-center rounded-full bg-white dark:bg-ink-800">
          <div className="text-center">
            <div className="font-display text-2xl font-bold">{total}</div>
            <div className="text-[10px] uppercase tracking-wide text-slate-400">Total</div>
          </div>
        </div>
      </div>
      <ul className="space-y-1.5 text-sm">
        {entries.map(([k, v], i) => (
          <li key={k} className="flex items-center gap-2">
            <span className="h-3 w-3 rounded-sm" style={{ background: PALETTE[i % PALETTE.length] }} />
            <span className="text-slate-500 dark:text-slate-400">{k}</span>
            <span className="ml-auto font-semibold">{v}</span>
          </li>
        ))}
        {!entries.length && <li className="text-slate-400">No data yet</li>}
      </ul>
    </div>
  );
}

export function BarList({ data }) {
  const entries = Object.entries(data || {});
  const max = Math.max(1, ...entries.map(([, v]) => v));
  return (
    <ul className="space-y-3">
      {entries.map(([k, v], i) => (
        <li key={k}>
          <div className="mb-1 flex justify-between text-sm">
            <span className="text-slate-500 dark:text-slate-400">{k}</span>
            <span className="font-semibold">{v}</span>
          </div>
          <div className="h-2.5 overflow-hidden rounded-full bg-slate-200 dark:bg-white/5">
            <div className="h-full rounded-full transition-all"
              style={{ width: `${(v / max) * 100}%`, background: `linear-gradient(90deg, ${PALETTE[i % PALETTE.length]}, #ef4444)` }} />
          </div>
        </li>
      ))}
      {!entries.length && <li className="text-sm text-slate-400">No data yet</li>}
    </ul>
  );
}
