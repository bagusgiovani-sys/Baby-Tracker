import { useId } from 'react';
import { motion } from 'framer-motion';
import { measurementGeometry } from '../domain/baby-overview';
import type { MeasurementTrendProps } from './measurement-trend';

export function MeasurementTrend({ points, label, locale, timezone }: MeasurementTrendProps) {
  const titleId = useId();
  const chart = measurementGeometry(points);
  if (!chart) return null;
  const number = new Intl.NumberFormat(locale, { maximumFractionDigits: 2 });
  const date = new Intl.DateTimeFormat(locale, {
    timeZone: timezone,
    month: 'short',
    day: 'numeric',
  });
  const path = chart.points.map((p, i) => `${i ? 'L' : 'M'}${p.x},${p.y}`).join(' ');
  return (
    <svg
      data-motion="measurement-trend"
      role="img"
      aria-labelledby={titleId}
      viewBox="0 0 320 165"
      style={{ width: '100%', display: 'block', overflow: 'visible' }}
    >
      <title id={titleId}>{label}</title>
      {[0, 0.5, 1].map((fraction) => (
        <g key={fraction}>
          <line
            x1="32"
            x2="304"
            y1={16 + fraction * 112}
            y2={16 + fraction * 112}
            stroke="var(--bb-border)"
            strokeDasharray="3 5"
          />
          <text x="0" y={20 + fraction * 112} fill="var(--bb-muted)" fontSize="9">
            {number.format(chart.upper - fraction * (chart.upper - chart.lower))}
          </text>
        </g>
      ))}
      <motion.path
        key={path}
        d={path}
        fill="none"
        stroke="var(--bb-accentInk)"
        strokeWidth="2.5"
        strokeLinecap="round"
        initial={{ pathLength: 0 }}
        animate={{ pathLength: 1 }}
        transition={{ duration: 0.7, ease: 'easeOut' }}
      />
      {chart.points.map((p, i) => (
        <circle key={i} cx={p.x} cy={p.y} r="4" fill="var(--bb-accentInk)">
          <title>
            {date.format(new Date(points[i]!.at))}: {number.format(points[i]!.value)}
          </title>
        </circle>
      ))}
      <text x="32" y="155" fill="var(--bb-muted)" fontSize="10">
        {date.format(new Date(chart.first))}
      </text>
      {chart.last !== chart.first && (
        <text x="304" y="155" textAnchor="end" fill="var(--bb-muted)" fontSize="10">
          {date.format(new Date(chart.last))}
        </text>
      )}
    </svg>
  );
}
