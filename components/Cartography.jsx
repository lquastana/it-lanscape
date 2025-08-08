import { useState } from 'react';
import { DOMAIN_COLORS } from '../lib/constants';

// condensedPrintView condense les descriptions pour une vue "paysage" destinée à l'impression
export default function Cartography({ data, colors, condensedPrintView = false }) {
  if (!data) return <main id="content">Chargement…</main>;

  /* mémorise l’ouverture des domaines et processus */
  const [openDomain,  setOpenDomain]  = useState({});   // { 'Support': true, … }
  const [openProcess, setOpenProcess] = useState({});   // { 'Support::DMI': true }

  const toggleDomain  = name        =>
    setOpenDomain(o  => ({ ...o,  [name]: !(o[name] ?? true) }));

  const toggleProcess = (d,p) =>
    setOpenProcess(o => ({ ...o,  [`${d}::${p}`]: !(o[`${d}::${p}`] ?? true) }));

  return (
    <main id="content" className={condensedPrintView ? 'condensed' : ''}>
      {data.etablissements.map(etab => (
        <div key={etab.nom}>
          <h2>{etab.nom}</h2>

          {etab.domaines.map((dom, idx) => {
            const domOpen = condensedPrintView ? true : (openDomain[dom.nom] ?? true);
            const bg      = DOMAIN_COLORS[idx % DOMAIN_COLORS.length];   // ←◀ couleur

            return (
              <div
                key={dom.nom}
                className="domain"
                style={{ background: bg }}       /* ▲ arrière‑plan coloré */
              >
                <h3 onClick={condensedPrintView ? undefined : () => toggleDomain(dom.nom)}>
                  {dom.nom}
                  {condensedPrintView ? null : ` ${domOpen ? '▼' : '▶︎'}`}
                </h3>

                {domOpen && (
                  <>
                    {!condensedPrintView && <p>{dom.description}</p>}

                    {dom.processus.map(proc => {
                      const k = `${dom.nom}::${proc.nom}`;
                      const procOpen = condensedPrintView ? true : (openProcess[k] ?? true);
                      return (
                        <div key={proc.nom} className="process">
                          <h4 onClick={condensedPrintView ? undefined : () => toggleProcess(dom.nom, proc.nom)}>
                            {proc.nom}
                            {condensedPrintView ? null : ` ${procOpen ? '▼' : '▶︎'}`}
                          </h4>

                          {procOpen && (
                            <>
                              {!condensedPrintView && <p>{proc.description}</p>}
                              <div className="apps">
                                {proc.applications.map(app => (
                                  <div key={app.nom} className="application">
                                    {/* ------------- contenu inchangé ------------- */}
                                    <h5>
                                      {app.nom}
                                      {app.multiEtablissement && (
                                        <span className="multi-icon">🏛️</span>
                                      )}
                                    </h5>

                                    <span
                                      className="crit-dot"
                                      style={{
                                        backgroundColor:
                                          app.criticite === 'Critique'
                                            ? '#d32f2f'
                                            : '#616161'
                                      }}
                                    >
                                      {app.criticite}
                                    </span>

                                    <div>
                                      {Object.entries(app.interfaces).map(
                                        ([t, act]) =>
                                          act && (
                                            <span
                                              key={t}
                                              className="iface-dot"
                                              style={{ backgroundColor: colors[t] }}
                                              title={t}
                                            />
                                          )
                                      )}
                                    </div>

                                    {!condensedPrintView && (
                                      <>
                                        <p>{app.description}</p>
                                        <p style={{ fontStyle: 'italic', color: '#666' }}>
                                          Hébergement&nbsp;: {app.hebergement}
                                        </p>
                                      </>
                                    )}
                                  </div>
                                ))}
                              </div>
                            </>
                          )}
                        </div>
                      );
                    })}
                  </>
                )}
              </div>
            );
          })}
        </div>
      ))}
    </main>
  );
}
