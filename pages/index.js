import { useState } from 'react';
import Head from 'next/head';
import Link from 'next/link';
import { motion } from 'framer-motion';
import Legend from '../components/Legend';
import Filters from '../components/Filters';
import Cartography from '../components/Cartography';
import Report from '../components/Report';
import { useLandscapeData } from '../hooks/useLandscapeData';
import { LOGO_URL, ORG_NAME, APP_TITLE } from '../lib/branding';


export default function Home() {
  const { data, sets, filters, updateFilter, interfaceColors, metrics } = useLandscapeData();
  const [reportVisible, setReportVisible] = useState(false);

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
      <header className="hero">
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
              <p className="hero-subtitle">Explorez les domaines, processus et applications.</p>
            </div>
          </div>
          <nav className="view-switch" aria-label="Navigation des vues">
            <Link href="/" className="active">Vue Métier</Link>
            <Link href="/applications">Vue Applicative</Link>
            <Link href="/flux">Vue Flux</Link>
            <Link href="/network">Vue Réseau</Link>
            <Link href="/incident">Simulation d'incident</Link>
            <button onClick={handleLogout} style={{cursor: 'pointer', background: 'none', border: 'none', color: 'var(--pico-primary)', textDecoration: 'underline'}}>Déconnexion</button>
          </nav>
        </div>
      </header>
      <section className="legend-wrapper page-shell">
        <h2 className="legend-title">Légende &amp; Filtres</h2>
        <Legend colors={interfaceColors} />
        <Filters sets={sets} filters={filters} onChange={updateFilter} />
      </section>
      <div className="page-shell">
        <Cartography data={data} colors={interfaceColors} search={filters.search} />
      </div>
      <Report metrics={metrics} visible={reportVisible} onClose={() => setReportVisible(false)} />
      <button id="report-toggle" onClick={() => setReportVisible(v => !v)}>🧠</button>
    </>
  );
}
