// components/Report.jsx
import Bar   from './ui/Bar';
import Donut from './ui/Donut';
import { INTERFACE_COLORS, HEBERG_COLORS } from '../lib/constants.js';

export default function Report({ metrics = {}, visible = false, onClose }) {
  if (!visible) return null;

  /* ---------- sécurisation & déstructuration ---------- */
  const {
    applications = 0,

    /* donuts */
    procPct  = 0,
    alignPct = 0,
    multiPct = 0,
    complPct = 0,

    /* criticité */
    critStandard = 0,
    critCritique = 0,

    /* hébergement & interfaces */
    hebergCounts  = {},
    ifaceCoverage = {},
    dpAppTotal    = 0,

    /* diff clipboard */
    diffText = '',
  } = metrics;

  /* ---------- barres dynamiques ---------- */
  const totalHeberg = Object.values(hebergCounts).reduce((a, b) => a + b, 0);
  const hebergBars = Object.entries(hebergCounts).map(([h, c]) => {
    const pct = totalHeberg ? (c / totalHeberg * 100).toFixed(1) : 0;
    const color = HEBERG_COLORS[h] ?? HEBERG_COLORS.DEFAULT;
    return (
      <Bar
        key={h}
        pct={pct}
        color={color}
        label={`${h} : ${pct}%`}
      />
    );
  });

  const ifaceBars = Object.entries(INTERFACE_COLORS)
    .filter(([key]) => key !== 'DEFAULT')
    .map(([iface, color]) => {
      const pct = dpAppTotal
        ? ((ifaceCoverage[iface] || 0) / dpAppTotal * 100).toFixed(1)
        : 0;
      return (
        <Bar
          key={iface}
          pct={pct}
          color={color}
          label={`${iface} : ${pct}%`}
        />
      );
    });

  const critTotal = critStandard + critCritique;

  /* ---------- rendu ---------- */
  return (
    <section id="report-box">
      {/* Fermer */}
      <button
        onClick={onClose}
        title="Fermer"
        style={{
          position: 'absolute',
          top: 12,
          right: diffText ? 52 : 12,
          background: '#eee',
          border: 'none',
          borderRadius: 6,
          padding: '2px 6px',
          cursor: 'pointer',
        }}
      >
        ✕
      </button>

      {/* Copier diff */}
      {diffText && (
        <button
          title="Copier les différences"
          onClick={() => navigator.clipboard.writeText(diffText)}
          style={{
            position: 'absolute',
            top: 12,
            right: 12,
            background: '#eee',
            border: 'none',
            borderRadius: 6,
            padding: '2px 6px',
            fontSize: 14,
            cursor: 'pointer',
          }}
        >
          📋
        </button>
      )}

      <h2>Rapport&nbsp;: Indicateurs de convergence SI</h2>
      <p style={{ marginTop: 0, fontStyle: 'italic', color: '#666' }}>
        Synthèse des principaux indicateurs (applications visibles&nbsp;: {applications})
      </p>

      {/* donuts */}
      <div
        style={{
          display: 'flex',
          flexWrap: 'wrap',
          gap: 20,
          justifyContent: 'space-around',
          marginBottom: 32,
        }}
      >
        <Donut pct={procPct}  label="Alignement processus" />
        <Donut pct={alignPct} label="Alignement applications" />
        <Donut pct={multiPct} label="Taux de mutualisation" />
        <Donut pct={complPct} label="Complétude des données" />
      </div>

      {/* criticité */}
      <section style={{ marginBottom: 32 }}>
        <h3>🔥 Répartition par criticité</h3>
        <Bar
          pct={critTotal ? (critStandard / critTotal * 100).toFixed(1) : 0}
          color="#4caf50"
          label={`Standard : ${critStandard}`}
        />
        <Bar
          pct={critTotal ? (critCritique / critTotal * 100).toFixed(1) : 0}
          color="#d32f2f"
          label={`Critique : ${critCritique}`}
        />
      </section>

      {/* hébergement */}
      <section style={{ marginBottom: 32 }}>
        <h3>🏢 Répartition de l’hébergement</h3>
        {hebergBars.length ? hebergBars : <em>Aucun hébergement visible</em>}
      </section>

      {/* interfaces */}
      <section>
        <h3>🧩 Couverture d’interfaces (domaines DP)</h3>
        {ifaceBars.length ? ifaceBars : <em>Aucune application DP disponible</em>}
      </section>
    </section>
  );
}
