import Head from 'next/head';
import Link from 'next/link';
import { motion } from 'framer-motion';
import NetworkFilters from '../components/NetworkFilters';
import NetworkView from '../components/NetworkView';
import useNetworkData from '../hooks/useNetworkData';

export default function NetworkPage() {
  const { data, filters, updateFilter } = useNetworkData();
  return (
    <>
      <Head>
        <title>Réseau - Cartographie des Hôpitaux Publics de Corse</title>
        <meta charSet="UTF-8" />
      </Head>
      <header className="hero">
        <div className="view-switch">
          <Link href="/">Vue Métier</Link>
          <Link href="/applications">Vue Applicative</Link>
          <Link href="/network" className="active">Vue Réseau</Link>
        </div>
        <motion.h1 initial={{ opacity: 0, y: -10 }} animate={{ opacity: 1, y: 0 }} transition={{ duration: 0.5 }}>
          Cartographie des Hôpitaux Publics de Corse
        </motion.h1>
        <p>Explorez les VLANs et leurs serveurs.</p>
      </header>
      <section className="legend-wrapper">
        <NetworkFilters filters={filters} onChange={updateFilter} />
      </section>
      <NetworkView data={data} />
    </>
  );
}
