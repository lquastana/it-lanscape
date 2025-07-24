import { useState } from 'react';
import { DOMAIN_COLORS } from '../lib/constants';

export default function Cartography({ data, colors }) {
  if (!data) return <main id="content">Chargement…</main>;

  /* mémorise l’ouverture des domaines et processus */
  const [openDomain,  setOpenDomain]  = useState({});   // { 'Support': true, … }
  const [openProcess, setOpenProcess] = useState({});   // { 'Support::DMI': true }

  const toggleDomain  = name        =>
    setOpenDomain(o  => ({ ...o,  [name]: !(o[name] ?? true) }));

  const toggleProcess = (d,p) =>
    setOpenProcess(o => ({ ...o,  [`${d}::${p}`]: !(o[`${d}::${p}`] ?? true) }));

  return (
    <main id="content">
      {data.etablissements.map(etab => (
        <div key={etab.nom}>
          <h2>{etab.nom}</h2>

          {etab.domaines.map((dom, idx) => {
            const domOpen = openDomain[dom.nom] ?? true;
            const bg      = DOMAIN_COLORS[idx % DOMAIN_COLORS.length];   // ←◀ couleur

            return (
              <div
                key={dom.nom}
                className="domain"
                style={{ background: bg }}       /* ▲ arrière‑plan coloré */
              >
                <h3 onClick={() => toggleDomain(dom.nom)}>
                  {dom.nom} {domOpen ? '▼' : '▶︎'}
                </h3>

                {domOpen && (
                  <>
                    <p>{dom.description}</p>

                    {dom.processus.map(proc => {
                      const k = `${dom.nom}::${proc.nom}`;
                      const procOpen = openProcess[k] ?? true;
                      return (
                        <div key={proc.nom} className="process">
                          <h4 onClick={() => toggleProcess(dom.nom, proc.nom)}>
                            {proc.nom} {procOpen ? '▼' : '▶︎'}
                          </h4>

                          {procOpen && (
                            <>
                              <p>{proc.description}</p>
                              <div className="apps">
                                {proc.applications.map(app => (
                                  <div key={app.nom} className="application">
                                    {/* ------------- contenu inchangé ------------- */}
                                    <h5>
                                      {app.nom}
                                      {app.multiEtablissement &&
                                        <span className="multi-icon">🏛️</span>}
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

                                    <p>{app.description}</p>
                                    <p style={{ fontStyle: 'italic', color: '#666' }}>
                                      Hébergement&nbsp;: {app.hebergement}
                                    </p>
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
