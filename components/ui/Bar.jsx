// components/Bar.jsx
// Barre horizontale simple pour les pourcentages

export default function Bar({ pct, color, label }) {
    return (
      <div style={{ marginBottom: 6 }}>
        <div style={{ fontSize: 14, marginBottom: 2 }}>{label} : {pct}%</div>
        <div
          style={{
            background: '#eee',
            borderRadius: 10,
            overflow: 'hidden',
            height: 20,
          }}
        >
          <div
            style={{
              width: `${pct}%`,
              background: color,
              height: '100%',
              color: '#fff',
              fontSize: 12,
              textAlign: 'center',
              lineHeight: '20px',
            }}
          >
            {pct}%
          </div>
        </div>
      </div>
    );
  }
  