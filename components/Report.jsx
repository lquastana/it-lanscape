import { useEffect } from 'react';
import Bar   from './ui/Bar';
import Donut from './ui/Donut';
import { INTERFACE_COLORS, HEBERG_COLORS } from '../lib/constants.js';

const IFACE_ORDER = ['Medicale', 'Administrative', 'Facturation', 'Planification', 'Autre'];

function SectionTitle({ kicker, title }) {
  return (
    <div className="report-section-head">
      <span className="business-section-kicker">{kicker}</span>
      <h3>{title}</h3>
    </div>
  );
}

function StatCard({ label, value, sub, accent }) {
  return (
    <div className={`report-stat-card${accent ? ' report-stat-accent' : ''}`}>
      <span className="report-stat-label">{label}</span>
      <strong className="report-stat-value">{value}</strong>
      {sub && <em className="report-stat-sub">{sub}</em>}
    </div>
  );
}

function CritBar({ critCritique, critStandard }) {
  const total = critCritique + critStandard;
  const critPct   = total ? ((critCritique / total) * 100).toFixed(1) : 0;
  const stdPct    = total ? ((critStandard  / total) * 100).toFixed(1) : 0;

  return (
    <div className="report-critbar-wrap">
      <div className="report-critbar-track">
        <div
          className="report-critbar-seg critique"
          style={{ width: `${critPct}%` }}
          title={`Critique : ${critCritique}`}
        />
        <div
          className="report-critbar-seg standard"
          style={{ width: `${stdPct}%` }}
          title={`Standard : ${critStandard}`}
        />
      </div>
      <div className="report-critbar-legend">
        <span className="report-legend-dot critique" />
        <span>Critique <strong>{critCritique}</strong> ({critPct}%)</span>
        <span className="report-legend-dot standard" />
        <span>Standard <strong>{critStandard}</strong> ({stdPct}%)</span>
      </div>
    </div>
  );
}

export default function Report({ metrics = {}, visible = false, onClose }) {
  const {
    applications   = 0,
    procPct        = 0,
    alignPct       = 0,
    multiPct       = 0,
    complPct       = 0,
    critStandard   = 0,
    critCritique   = 0,
    hebergCounts   = {},
    ifaceCoverage  = {},
    dpAppTotal     = 0,
    diffText       = '',
  } = metrics;

  /* fermeture clavier */
  useEffect(() => {
    if (!visible) return;
    const handler = e => { if (e.key === 'Escape') onClose(); };
    window.addEventListener('keydown', handler);
    return () => window.removeEventListener('keydown', handler);
  }, [visible, onClose]);

  /* tri hébergement */
  const totalHeberg = Object.values(hebergCounts).reduce((a, b) => a + b, 0);
  const hebergBars = Object.entries(hebergCounts)
    .sort(([, a], [, b]) => b - a)
    .map(([h, count]) => (
      <Bar
        key={h}
        pct={totalHeberg ? (count / totalHeberg * 100).toFixed(1) : 0}
        color={HEBERG_COLORS[h] ?? HEBERG_COLORS.DEFAULT}
        label={`${h} — ${count} app${count > 1 ? 's' : ''}`}
      />
    ));

  const ifaceBars = IFACE_ORDER.map(iface => {
    const count = ifaceCoverage[iface] || 0;
    return (
      <Bar
        key={iface}
        pct={dpAppTotal ? (count / dpAppTotal * 100).toFixed(1) : 0}
        color={INTERFACE_COLORS[iface] ?? '#9e9e9e'}
        label={`${iface} — ${count} app${count > 1 ? 's' : ''}`}
      />
    );
  });

  return (
    <>
      {/* Backdrop */}
      <div
        className={`report-backdrop${visible ? ' is-open' : ''}`}
        onClick={onClose}
        aria-hidden="true"
      />

      {/* Drawer */}
      <aside
        className={`report-drawer${visible ? ' is-open' : ''}`}
        aria-label="Synthèse des indicateurs"
        aria-modal="true"
        role="dialog"
      >
        {/* Header */}
        <div className="report-header">
          <div>
            <p className="eyebrow">Cockpit SIH</p>
            <h2>Synthèse de convergence</h2>
            <p className="report-header-sub">{applications} application{applications > 1 ? 's' : ''} analysée{applications > 1 ? 's' : ''}</p>
          </div>
          <button className="report-close" onClick={onClose} aria-label="Fermer">✕</button>
        </div>

        {/* Corps scrollable */}
        <div className="report-body">

          {/* ── 1. Vue générale ─────────────────────────────── */}
          <section className="report-section">
            <SectionTitle kicker="Vue générale" title="Indicateurs clés" />
            <div className="report-stat-grid">
              <StatCard label="Applications" value={applications} sub="périmètre visible" accent />
              <StatCard label="Applications critiques" value={critCritique} sub={`sur ${critCritique + critStandard} totales`} />
              <StatCard label="Mutualisation" value={`${parseFloat(multiPct).toFixed(0)}%`} sub="apps multi-établissement" />
              <StatCard label="Complétude" value={`${parseFloat(complPct).toFixed(0)}%`} sub="éditeur · référent · supervision" />
            </div>
          </section>

          {/* ── 2. Convergence inter-étab ───────────────────── */}
          <section className="report-section">
            <SectionTitle kicker="Convergence" title="Alignement inter-établissements" />
            <div className="report-donut-row">
              <Donut pct={procPct}  label="Processus (Jaccard)" size={100} />
              <Donut pct={alignPct} label="Applications" size={100} />
              <Donut pct={multiPct} label="Mutualisation" size={100} />
              <Donut pct={complPct} label="Complétude" size={100} />
            </div>
          </section>

          {/* ── 3. Criticité ─────────────────────────────────── */}
          <section className="report-section">
            <SectionTitle kicker="Risque" title="Répartition par criticité" />
            <CritBar critCritique={critCritique} critStandard={critStandard} />
          </section>

          {/* ── 4. Hébergement ──────────────────────────────── */}
          <section className="report-section">
            <SectionTitle kicker="Hébergement" title="Répartition par hébergeur" />
            {hebergBars.length ? (
              <div className="report-bars">{hebergBars}</div>
            ) : (
              <p className="business-muted">Aucun hébergement renseigné.</p>
            )}
          </section>

          {/* ── 5. Interfaces ───────────────────────────────── */}
          <section className="report-section">
            <SectionTitle kicker="Interopérabilité" title="Couverture d'interfaces (domaines DP)" />
            {dpAppTotal ? (
              <div className="report-bars">{ifaceBars}</div>
            ) : (
              <p className="business-muted">Aucune application DP disponible.</p>
            )}
          </section>

        </div>

        {/* Footer */}
        {diffText && (
          <div className="report-footer">
            <p className="report-footer-hint">
              {diffText.split('\n').length} écart{diffText.split('\n').length > 1 ? 's' : ''} détecté{diffText.split('\n').length > 1 ? 's' : ''}
            </p>
            <button
              className="report-copy-btn"
              onClick={() => navigator.clipboard.writeText(diffText)}
            >
              Copier les écarts
            </button>
          </div>
        )}
      </aside>
    </>
  );
}
