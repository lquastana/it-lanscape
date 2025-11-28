import Head from 'next/head';
import Link from 'next/link';
import { motion } from 'framer-motion';
import Legend from '../components/Legend';
import Filters from '../components/Filters';
import ApplicativeView from '../components/ApplicativeView';
import { useLandscapeData } from '../hooks/useLandscapeData';
import { evaluateAccess, sendUnauthorizedPage } from '../lib/accessControl';

export default function ApplicationsPage({ authorized = true }) {
  const { data, sets, filters, updateFilter, interfaceColors } = useLandscapeData();
  return (
    <>
      <Head>
        <title>Applications - Cartographie des Hôpitaux Publics de Corse</title>
        <meta charSet="UTF-8" />
      </Head>
      <header className="hero">
        <div className="page-shell hero-grid">
          <div className="hero-brand">
            <div className="brand-mark">
              <img src="/logo-gcs.png" alt="Logo GCS E-santé Corse" />
            </div>
            <div>
              <p className="eyebrow">GCS E-santé Corse</p>
              <motion.h1 initial={{ opacity: 0, y: -10 }} animate={{ opacity: 1, y: 0 }} transition={{ duration: 0.5 }}>
                Cartographie des Hôpitaux Publics de Corse
              </motion.h1>
              <p className="hero-subtitle">Explorez les applications et leurs serveurs.</p>
            </div>
          </div>
          <nav className="view-switch" aria-label="Navigation des vues">
            <Link href="/">Vue Métier</Link>
            <Link href="/applications" className="active">Vue Applicative</Link>
            <Link href="/network">Vue Réseau</Link>
          </nav>
        </div>
      </header>
      <section className="legend-wrapper page-shell">
        <h2 className="legend-title">Légende &amp; Filtres</h2>
        <Legend colors={interfaceColors} />
        <Filters sets={sets} filters={filters} onChange={updateFilter} />
      </section>
      <div className="page-shell">
        <ApplicativeView data={data} search={filters.search} />
      </div>
    </>
  );
}

export async function getServerSideProps({ req, res }) {
  const access = await evaluateAccess(req);
  if (!access.allowed) {
    sendUnauthorizedPage(res);
    return { props: { authorized: false } };
  }

  return { props: { authorized: true } };
}
