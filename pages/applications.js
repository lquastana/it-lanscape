import Head from 'next/head';
import Link from 'next/link';
import { motion } from 'framer-motion';
import Legend from '../components/Legend';
import Filters from '../components/Filters';
import ApplicativeView from '../components/ApplicativeView';
import { useLandscapeData } from '../hooks/useLandscapeData';

export default function ApplicationsPage() {
  const { data, sets, filters, updateFilter, interfaceColors } = useLandscapeData();
  return (
    <>
      <Head>
        <title>Applications - Cartographie des Hôpitaux Publics de Corse</title>
        <meta charSet="UTF-8" />
      </Head>
      <header className="hero">
        <div className="view-switch">
          <Link href="/">Vue Métier</Link>
          <Link href="/applications" className="active">Vue Applicative</Link>
          <Link href="/network">Vue Réseau</Link>
        </div>
        <motion.h1 initial={{ opacity: 0, y: -10 }} animate={{ opacity: 1, y: 0 }} transition={{ duration: 0.5 }}>
          Cartographie des Hôpitaux Publics de Corse
        </motion.h1>
        <p>Explorez les applications et leurs serveurs.</p>
      </header>
      <section className="legend-wrapper">
        <h2 className="legend-title">Légende &amp; Filtres</h2>
      <Legend colors={interfaceColors} />
      <Filters sets={sets} filters={filters} onChange={updateFilter} />
    </section>
    <ApplicativeView data={data} search={filters.search} />
  </>
  );
}
