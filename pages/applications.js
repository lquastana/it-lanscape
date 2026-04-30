import Head from 'next/head';
import { motion } from 'framer-motion';
import Legend from '../components/Legend';
import Filters from '../components/Filters';
import MainNav from '../components/MainNav';
import { LOGO_URL, ORG_NAME, APP_TITLE } from '../lib/branding';
import ApplicativeView from '../components/ApplicativeView';
import { useLandscapeData } from '../hooks/useLandscapeData';

export default function ApplicationsPage() {
  const { data, sets, filters, updateFilter, interfaceColors, metrics } = useLandscapeData();

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
        <title>Applications - {APP_TITLE}</title>
        <meta charSet="UTF-8" />
      </Head>
      <header className="hero business-hero app-hero">
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
              <p className="hero-subtitle">Explorez les applications, leurs trigrammes et les serveurs logiques associés.</p>
            </div>
          </div>
          <MainNav onLogout={handleLogout} />
        </div>
      </header>

      <section className="business-command-center app-command-center page-shell">
        <div className="business-command-intro">
          <span className="business-section-kicker">Vue applicative</span>
          <h2>Inventaire applicatif enrichi</h2>
          <p>
            Suivez le lien entre applications, hébergement et infrastructure pour
            identifier rapidement les dépendances techniques.
          </p>
        </div>
        <div className="business-kpi-grid" aria-label="Indicateurs applicatifs">
          <article className="business-kpi-card highlight">
            <span>Applications visibles</span>
            <strong>{metrics.applications ?? 0}</strong>
            <em>{activeFilters ? `${activeFilters} filtre(s) actif(s)` : 'Périmètre complet'}</em>
          </article>
          <article className="business-kpi-card">
            <span>Critiques</span>
            <strong>{metrics.critCritique ?? 0}</strong>
            <em>À surveiller en priorité</em>
          </article>
          <article className="business-kpi-card">
            <span>Mutualisation</span>
            <strong>{metrics.multiPct ?? 0}%</strong>
            <em>Applications multi-établissement</em>
          </article>
          <article className="business-kpi-card">
            <span>Complétude</span>
            <strong>{metrics.complPct ?? 0}%</strong>
            <em>Référentiel applicatif</em>
          </article>
        </div>
      </section>

      <section className="legend-wrapper business-filter-panel page-shell">
        <div className="business-panel-header">
          <div>
            <span className="business-section-kicker">Exploration</span>
            <h2 className="legend-title">Filtres et légende</h2>
          </div>
        </div>
        <Filters sets={sets} filters={filters} onChange={updateFilter} />
        <Legend colors={interfaceColors} />
      </section>

      <div className="page-shell app-modern">
        <ApplicativeView data={data} search={filters.search} />
      </div>
    </>
  );
}
