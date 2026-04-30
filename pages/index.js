import { useState } from 'react';
import Head from 'next/head';
import { motion } from 'framer-motion';
import Legend from '../components/Legend';
import MainNav from '../components/MainNav';
import Filters from '../components/Filters';
import Cartography from '../components/Cartography';
import Report from '../components/Report';
import { useLandscapeData } from '../hooks/useLandscapeData';
import { LOGO_URL, ORG_NAME, APP_TITLE } from '../lib/branding';

function formatPct(value) {
  if (value === undefined || value === null || value === '') return '0%';
  return `${Number(value).toFixed(Number(value) % 1 === 0 ? 0 : 1)}%`;
}

export default function Home() {
  const { data, sets, filters, updateFilter, interfaceColors, metrics } = useLandscapeData();
  const [reportVisible, setReportVisible] = useState(false);

  const activeFilters = [
    filters.etab?.length,
    filters.domaine?.length,
    filters.criticite,
    filters.heberg,
    filters.interface,
    filters.multi,
    filters.search,
  ].filter(Boolean).length;

  const handleLogout = async () => {
    await fetch('/api/auth/logout');
    window.location.href = '/login';
  };

  return (
    <>
      <Head>
        <title>{APP_TITLE}</title>
        <meta charSet="UTF-8" />
      </Head>
      <header className="hero business-hero">
        <div className="page-shell hero-grid">
          <div className="hero-brand">
            <div className="brand-mark">
              {LOGO_URL && <img src={LOGO_URL} alt={ORG_NAME} />}
            </div>
            <div>
              <p className="eyebrow">{ORG_NAME}</p>
              <motion.h1 initial={{ opacity: 0, y: -10 }} animate={{ opacity: 1, y: 0 }} transition={{ duration: 0.5 }}>
                {APP_TITLE}
              </motion.h1>
              <p className="hero-subtitle">Pilotez les domaines, processus et applications du SIH avec une lecture orientée décision.</p>
            </div>
          </div>
          <MainNav onLogout={handleLogout} />
        </div>
      </header>

      <section className="business-command-center page-shell">
        <div className="business-command-intro">
          <span className="business-section-kicker">Cockpit métier</span>
          <h2>Vue consolidée du paysage applicatif</h2>
          <p>
            Repérez rapidement les applications critiques, les écarts de mutualisation
            et les zones où le SIH est le plus dense.
          </p>
        </div>

        <div className="business-kpi-grid" aria-label="Indicateurs de synthèse">
          <article className="business-kpi-card highlight">
            <span>Applications visibles</span>
            <strong>{metrics.applications ?? 0}</strong>
            <em>{activeFilters ? `${activeFilters} filtre(s) actif(s)` : 'Périmètre complet'}</em>
          </article>
          <article className="business-kpi-card">
            <span>Alignement processus</span>
            <strong>{formatPct(metrics.procPct)}</strong>
            <em>Similarité inter-établissements</em>
          </article>
          <article className="business-kpi-card">
            <span>Applications mutualisées</span>
            <strong>{formatPct(metrics.multiPct)}</strong>
            <em>Potentiel de convergence</em>
          </article>
          <article className="business-kpi-card">
            <span>Complétude référentiel</span>
            <strong>{formatPct(metrics.complPct)}</strong>
            <em>Éditeur, référent, supervision</em>
          </article>
        </div>
      </section>

      <section className="legend-wrapper business-filter-panel page-shell">
        <div className="business-panel-header">
          <div>
            <span className="business-section-kicker">Exploration</span>
            <h2 className="legend-title">Filtres et légende</h2>
          </div>
          <button type="button" className="business-report-button" onClick={() => setReportVisible(true)}>
            Ouvrir la synthèse
          </button>
        </div>
        <Filters sets={sets} filters={filters} onChange={updateFilter} />
        <Legend colors={interfaceColors} />
      </section>

      <div className="page-shell business-carto-shell">
        <Cartography data={data} colors={interfaceColors} search={filters.search} />
      </div>
      <Report metrics={metrics} visible={reportVisible} onClose={() => setReportVisible(false)} />
      <button id="report-toggle" onClick={() => setReportVisible(v => !v)}>Synthèse</button>
    </>
  );
}
