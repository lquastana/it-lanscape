import { useMemo } from 'react';
import Head from 'next/head';
import { motion } from 'framer-motion';
import MainNav from '../components/MainNav';
import NetworkFilters from '../components/NetworkFilters';
import NetworkView from '../components/NetworkView';
import { LOGO_URL, ORG_NAME, APP_TITLE } from '../lib/branding';
import useNetworkData from '../hooks/useNetworkData';

export default function NetworkPage() {
  const { data, filters, updateFilter } = useNetworkData();

  const metrics = useMemo(() => {
    if (!data?.etablissements) {
      return { sites: 0, vlans: 0, servers: 0, gateways: 0 };
    }
    return data.etablissements.reduce(
      (acc, etab) => {
        acc.sites += 1;
        acc.vlans += etab.vlans.length;
        etab.vlans.forEach(vlan => {
          acc.servers += vlan.serveurs.length;
          if (vlan.gateway) acc.gateways += 1;
        });
        return acc;
      },
      { sites: 0, vlans: 0, servers: 0, gateways: 0 },
    );
  }, [data]);

  const handleLogout = async () => {
    await fetch('/api/auth/logout');
    window.location.href = '/login';
  };

  return (
    <>
      <Head>
        <title>Réseau - {APP_TITLE}</title>
        <meta charSet="UTF-8" />
      </Head>
      <header className="hero business-hero network-hero">
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
              <p className="hero-subtitle">Explorez les VLANs, passerelles, plages réseau et serveurs associés.</p>
            </div>
          </div>
          <MainNav onLogout={handleLogout} />
        </div>
      </header>

      <section className="business-command-center network-command-center page-shell">
        <div className="business-command-intro">
          <span className="business-section-kicker">Vue réseau</span>
          <h2>Topologie opérationnelle</h2>
          <p>
            Filtrez par VLAN ou serveur pour retrouver rapidement les segments,
            adresses IP et détails d'infrastructure.
          </p>
        </div>
        <div className="business-kpi-grid" aria-label="Indicateurs réseau">
          <article className="business-kpi-card highlight">
            <span>Établissements</span>
            <strong>{metrics.sites}</strong>
            <em>{filters.search ? 'Résultats filtrés' : 'Périmètre affiché'}</em>
          </article>
          <article className="business-kpi-card">
            <span>VLANs</span>
            <strong>{metrics.vlans}</strong>
            <em>Segments visibles</em>
          </article>
          <article className="business-kpi-card">
            <span>Serveurs</span>
            <strong>{metrics.servers}</strong>
            <em>Associés aux VLANs</em>
          </article>
          <article className="business-kpi-card">
            <span>Passerelles</span>
            <strong>{metrics.gateways}</strong>
            <em>Points d'entrée réseau</em>
          </article>
        </div>
      </section>

      <section className="legend-wrapper business-filter-panel network-filter-panel page-shell">
        <div className="business-panel-header">
          <div>
            <span className="business-section-kicker">Recherche</span>
            <h2 className="legend-title">Filtres réseau</h2>
          </div>
        </div>
        <NetworkFilters filters={filters} onChange={updateFilter} />
      </section>
      <div className="page-shell network-modern">
        <NetworkView data={data} />
      </div>
    </>
  );
}
