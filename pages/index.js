import { useState } from 'react';
import Head from 'next/head';
import { motion } from 'framer-motion';
import Legend from '../components/Legend';
import Filters from '../components/Filters';
import Cartography from '../components/Cartography';
import ApplicativeView from '../components/ApplicativeView';
import ChatBox from '../components/ChatBox';
import Report from '../components/Report';
import { useLandscapeData } from '../hooks/useLandscapeData';


export default function Home() {
  const { data, sets, filters, updateFilter, interfaceColors, metrics } = useLandscapeData();
  const [reportVisible, setReportVisible] = useState(false);
  const [view, setView] = useState('metier');

  let content = null;
  if (view === 'paysage') content = <div>Vue paysage en cours…</div>;
  if (view === 'metier') content = <Cartography data={data} colors={interfaceColors} />;
  if (view === 'applicatif') content = <ApplicativeView data={data} />;

  return (
    <>
      <Head>
        <title>Cartographie des Hôpitaux Publics de Corse</title>
        <meta charSet="UTF-8" />
      </Head>
      <header className="hero">
        <motion.h1 initial={{ opacity: 0, y: -10 }} animate={{ opacity: 1, y: 0 }} transition={{ duration: 0.5 }}>
          Cartographie des Hôpitaux Publics de Corse
        </motion.h1>
        <p>Explorez les domaines, processus et applications.</p>
      </header>
      <section className="legend-wrapper">
        <h2 className="legend-title">Légende &amp; Filtres</h2>
        <Legend colors={interfaceColors} />
        <Filters sets={sets} filters={filters} onChange={updateFilter} />
      </section>
      <nav
        className="view-switch"
        style={{ position: 'fixed', top: 20, right: 20, display: 'flex', gap: '0.5rem' }}
      >
        <button onClick={() => setView('paysage')}>Vue Paysage</button>
        <button onClick={() => setView('metier')}>Vue Métier</button>
        <button onClick={() => setView('applicatif')}>Vue Applicatif</button>
      </nav>
      {content}
      <Report metrics={metrics} visible={reportVisible} onClose={() => setReportVisible(false)} />
      <button id="report-toggle" onClick={() => setReportVisible(v => !v)}>🧠</button>
    </>
  );
}
