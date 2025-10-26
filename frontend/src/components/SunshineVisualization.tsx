import React, { useMemo } from "react";

type Props = {
  valuesForDate: number[];
  globalMin: number;
  globalMax: number;
};

export default function SunshineVisualization({ valuesForDate, globalMin, globalMax }: Props) {
  const { mean, pct } = useMemo(() => {
    if (!valuesForDate?.length || !isFinite(globalMin) || !isFinite(globalMax)) {
      return { mean: 0, pct: 0 };
    }
    const m = valuesForDate.reduce((a, b) => a + b, 0) / valuesForDate.length;
    const p = Math.max(0, Math.min(1, (m - globalMin) / (globalMax - globalMin || 1)));
    return { mean: m, pct: p };
  }, [valuesForDate, globalMin, globalMax]);

  const pctStr = `${Math.round(pct * 100)}%`;

  return (
    <div className="sunshine-sticky">
      <div className="sunshine-card">
        <div className="sunshine-head">
          <span>Sunshine (7-day)</span>
          <span className="sunshine-value">{mean.toFixed(1)}</span>
        </div>

        <div className="sunshine-track">
          <div className="sunshine-fill" style={{ width: pctStr }} />
          <div className="sunshine-sun" style={{ left: `calc(${pctStr} - 14px)` }} aria-hidden />
          <div className="sunshine-shimmer" />
        </div>

        <div className="sunshine-scale">
          <span>Low</span>
          <span>High</span>
        </div>
      </div>
    </div>
  );
}
