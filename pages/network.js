import Head from 'next/head';
import Link from 'next/link';
import { motion } from 'framer-motion';
import NetworkFilters from '../components/NetworkFilters';
import NetworkView from '../components/NetworkView';
import useNetworkData from '../hooks/useNetworkData';

export default function NetworkPage() {
  const { data, filters, updateFilter } = useNetworkData();

  const handleLogout = async () => {
    await fetch('/api/auth/logout');
    window.location.href = '/login';
  };

  return (
    <>
      <Head>
        <title>Réseau - Cartographie des Hôpitaux Publics de Corse</title>
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
              <p className="hero-subtitle">Explorez les VLANs et leurs serveurs.</p>
            </div>
          </div>
          <nav className="view-switch" aria-label="Navigation des vues">
            <Link href="/">Vue Métier</Link>
            <Link href="/applications">Vue Applicative</Link>
            <Link href="/flux">Vue Flux</Link>
            <Link href="/network" className="active">Vue Réseau</Link>
            <button onClick={handleLogout} style={{cursor: 'pointer', background: 'none', border: 'none', color: 'var(--pico-primary)', textDecoration: 'underline'}}>Déconnexion</button>
          </nav>
        </div>
      </header>
      <section className="legend-wrapper page-shell">
        <NetworkFilters filters={filters} onChange={updateFilter} />
      </section>
      <div className="page-shell">
        <NetworkView data={data} />
      </div>
    </>
  );
}
