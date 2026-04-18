export default function Legend({ colors }) {
  return (
    <div className="legend" id="legend">
      {Object.entries(colors).map(([name, color]) => (
        <div key={name} className="legend-item">
          <span className="legend-color" style={{ backgroundColor: color }} />
          {name}
        </div>
      ))}
      <div className="legend-item">
        <span className="legend-color" style={{ backgroundColor: '#d32f2f' }} />
        Criticité haute
      </div>
      <div className="legend-item">
        <span className="legend-color" style={{ backgroundColor: '#616161' }} />
        Criticité standard
      </div>
      <div className="legend-item">
        <span className="multi-icon">🏛️</span> Multi-établissement
      </div>
    </div>
  );
}
