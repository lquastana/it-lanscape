export default function Bar({ pct, color = 'var(--color-accent)', label }) {
  const val = Math.min(100, Math.max(0, parseFloat(pct) || 0));

  return (
    <div className="report-bar">
      <div className="report-bar-meta">
        <span className="report-bar-label">{label}</span>
        <strong className="report-bar-pct">{val}%</strong>
      </div>
      <div className="report-bar-track">
        <div
          className="report-bar-fill"
          style={{ width: `${val}%`, background: color }}
        />
      </div>
    </div>
  );
}
