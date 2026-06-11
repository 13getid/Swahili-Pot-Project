// Lightweight dependency-free SVG radar/spider chart.
// data: [{ label: string, value: number 0-100 }] (3–8 axes).
export default function RadarChart({ data, size = 300, levels = 4, accent = '#4f46e5' }) {
  const n = data?.length || 0;
  if (n < 3) return null;

  const padding = 58; // room for the axis labels
  const cx = size / 2;
  const cy = size / 2;
  const radius = size / 2 - padding;

  const angleFor = (i) => -Math.PI / 2 + (i * 2 * Math.PI) / n;
  const pointAt = (i, frac) => {
    const a = angleFor(i);
    return [cx + radius * frac * Math.cos(a), cy + radius * frac * Math.sin(a)];
  };

  const rings = [];
  for (let l = 1; l <= levels; l++) {
    const frac = l / levels;
    rings.push(data.map((_, i) => pointAt(i, frac).join(',')).join(' '));
  }

  const axes = data.map((d, i) => {
    const [x, y] = pointAt(i, 1);
    const [lx, ly] = pointAt(i, 1.16);
    const anchor = Math.abs(lx - cx) < 8 ? 'middle' : lx > cx ? 'start' : 'end';
    return { x, y, lx, ly, anchor, label: d.label };
  });

  const clamp = (v) => Math.max(0, Math.min(100, Number(v) || 0));
  const dataPts = data.map((d, i) => pointAt(i, clamp(d.value) / 100));
  const dataStr = dataPts.map((p) => p.join(',')).join(' ');

  return (
    <svg
      viewBox={`0 0 ${size} ${size}`}
      width="100%"
      style={{ maxWidth: size, overflow: 'visible' }}
      role="img"
      aria-label="Competency radar chart"
    >
      {rings.map((pts, i) => (
        <polygon key={`r${i}`} points={pts} fill="none" className="stroke-gray-200 dark:stroke-gray-700" strokeWidth="1" />
      ))}
      {axes.map((a, i) => (
        <line key={`a${i}`} x1={cx} y1={cy} x2={a.x} y2={a.y} className="stroke-gray-200 dark:stroke-gray-700" strokeWidth="1" />
      ))}

      <polygon points={dataStr} fill={accent} fillOpacity="0.22" stroke={accent} strokeWidth="2" strokeLinejoin="round" />
      {dataPts.map((p, i) => (
        <circle key={`d${i}`} cx={p[0]} cy={p[1]} r="3.5" fill={accent} />
      ))}

      {axes.map((a, i) => (
        <text
          key={`l${i}`}
          x={a.lx}
          y={a.ly}
          textAnchor={a.anchor}
          dominantBaseline="middle"
          className="fill-gray-600 dark:fill-gray-300"
          style={{ fontSize: 10.5, fontWeight: 600 }}
        >
          {a.label}
        </text>
      ))}
    </svg>
  );
}
