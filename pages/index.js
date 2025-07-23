import { useState } from 'react';
import Head from 'next/head';
import { motion } from 'framer-motion';
import Legend from '../components/Legend';
import Filters from '../components/Filters';
import Cartography from '../components/Cartography';
import ChatBox from '../components/ChatBox';
import Report from '../components/Report';
import { useLandscapeData } from '../hooks/useLandscapeData';

export default function Home() {
  const { data, sets, filters, updateFilter, interfaceColors, metrics } = useLandscapeData();
  const [reportVisible, setReportVisible] = useState(false);
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
      <Cartography data={data} colors={interfaceColors} />
      <Report metrics={metrics} visible={reportVisible} onClose={() => setReportVisible(false)} />
      <ChatBox />
      <button id="report-toggle" onClick={() => setReportVisible(v => !v)}>🧠</button>
      <style jsx global>{`
    *,*::before,*::after{box-sizing:border-box;}
    body{font-family:Arial,sans-serif;margin:0;padding:0;background:#fafafa;color:#222;}
    .hero{background:#1B75BC;color:#fff;padding:40px 24px 32px;text-align:center;border-bottom-left-radius:20px;border-bottom-right-radius:20px;}
    .hero h1{margin:0;font-size:2.2rem;}
    .hero p{margin-top:10px;max-width:680px;margin:0 auto;}
    .legend-wrapper{background:#fff;padding:16px 24px;border-radius:12px;box-shadow:0 2px 6px rgba(0,0,0,0.08);width:fit-content;margin:24px auto;}
    .legend-title{margin-bottom:16px;font-size:1.3rem;text-align:center;}
    .legend{display:flex;flex-wrap:wrap;gap:14px;justify-content:center;margin-bottom:20px;}
    .legend-item{display:inline-flex;align-items:center;font-size:0.9rem;white-space:nowrap;}
    .legend-color{width:14px;height:14px;border-radius:50%;margin-right:6px;border:1px solid rgba(0,0,0,0.25);}
    .filters{text-align:center;display:flex;flex-wrap:wrap;gap:10px;justify-content:center;}
    .filters label{display:inline-block;}
    .filters select{padding:4px;}
    .domain{background:#fff;border:1px solid #555;border-radius:8px;margin-bottom:16px;padding:10px;}
    .domain h3{cursor:pointer;margin:0 0 4px 0;}
    .process{border:1px solid #ccc;border-radius:8px;background:rgba(255,255,255,0.25);padding:10px;margin-bottom:16px;}
    .process h4{margin:0 0 4px 0;font-weight:bold;}
    .process p:first-of-type{margin:0 0 8px 0;color:#444;}
    .apps{display:flex;flex-wrap:wrap;gap:16px;}
    .apps .application{flex:0 0 calc(33.333% - 16px);background:#fff;border:2px solid #999;border-radius:8px;position:relative;padding:10px;margin:0;}
    @media (max-width:900px){.apps .application{flex:0 0 calc(50% - 16px);} }
    @media (max-width:600px){.apps .application{flex:0 0 100%;} }
    .application h5{margin:0 0 4px 0;display:flex;align-items:center;gap:6px;}
    .crit-dot{position:absolute;top:4px;right:4px;min-width:24px;padding:2px 4px;font-size:0.7rem;text-align:center;border-radius:12px;color:#fff;cursor:pointer;text-decoration:none;}
    .iface-dot{display:inline-block;width:10px;height:10px;border-radius:50%;margin-right:4px;border:1px solid rgba(0,0,0,0.2);}
    .multi-icon{font-size:1rem;}
    #chat-toggle{position:fixed;bottom:20px;right:20px;z-index:10000;background:#1B75BC;color:#fff;border:none;border-radius:50%;width:52px;height:52px;font-size:1.4rem;box-shadow:0 2px 8px rgba(0,0,0,0.2);cursor:pointer;}
    #report-toggle{position:fixed;bottom:20px;right:80px;z-index:10000;background:#1B75BC;color:#fff;border:none;border-radius:50%;width:52px;height:52px;font-size:1.4rem;box-shadow:0 2px 8px rgba(0,0,0,0.2);cursor:pointer;}
    #report-box{position:fixed;top:0;left:0;width:100vw;height:100vh;overflow:auto;background:#fff;z-index:9998;padding:24px;box-shadow:0 0 12px rgba(0,0,0,0.3);}
    #copy-report-btn{position:absolute;top:12px;right:12px;background:#eee;border:none;padding:4px 6px;border-radius:4px;font-size:0.8rem;cursor:pointer;}
    .chatbox{position:fixed;top:0;left:0;width:100vw;height:100vh;display:flex;flex-direction:column;background:#fff;z-index:9999;padding:24px;box-shadow:0 0 12px rgba(0,0,0,0.3);transition:all .3s ease;border-radius:0;}
    .chatbox.hidden{display:none;}
    #chat-log{flex:1;overflow-y:auto;margin-bottom:12px;}
    .chat-msg{margin:30px 0;padding:8px 10px;border-radius:8px;white-space:pre-wrap;}
    .user{background:#1B75BC;color:#fff;text-align:right;}
    .bot{background:#eee;}
    #chat-form{display:flex;gap:6px;}
    #chat-q{flex:1;padding:8px;border-radius:8px;border:1px solid #ccc;}
      `}</style>
    </>
  );
}
