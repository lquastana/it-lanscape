import React from 'react';

const TIERS = [
  { max: 33,  color: '#ef4444' },
  { max: 66,  color: '#f59e0b' },
  { max: 100, color: '#10b981' },
];

function tierColor(val) {
  return (TIERS.find(t => val <= t.max) ?? TIERS.at(-1)).color;
}

export default function Donut({ pct = 0, label = '', color, size = 96 }) {
  const val   = Math.min(100, Math.max(0, parseFloat(pct) || 0));
  const r     = 38;
  const cx    = 50;
  const cy    = 50;
  const circ  = 2 * Math.PI * r;
  const dash  = (val / 100) * circ;
  const fill  = color ?? tierColor(val);

  return (
    <div className="report-donut">
      <svg viewBox="0 0 100 100" width={size} height={size} aria-label={`${label} : ${val.toFixed(0)}%`}>
        {/* piste */}
        <circle cx={cx} cy={cy} r={r} fill="none" stroke="var(--color-border)" strokeWidth="10" />
        {/* arc */}
        <circle
          cx={cx} cy={cy} r={r}
          fill="none"
          stroke={fill}
          strokeWidth="10"
          strokeDasharray={`${dash} ${circ}`}
          strokeLinecap="round"
          transform={`rotate(-90 ${cx} ${cy})`}
          style={{ transition: 'stroke-dasharray 0.7s cubic-bezier(.4,0,.2,1)' }}
        />
        {/* valeur centrale */}
        <text
          x={cx} y={cy}
          textAnchor="middle"
          dominantBaseline="central"
          fontSize="16"
          fontWeight="700"
          fill={fill}
          fontFamily="var(--font-heading)"
        >
          {val.toFixed(0)}%
        </text>
      </svg>
      <p className="report-donut-label">{label}</p>
    </div>
  );
}
