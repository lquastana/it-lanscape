import { useState } from 'react';
import { DOMAIN_COLORS } from '../lib/constants';

export default function Cartography({ data, colors }) {
  if (!data) return <main id="content">Chargement…</main>;

  const [openDomain, setOpenDomain] = useState({});
  const [openProcess, setOpenProcess] = useState({});
  const [condensedPrintView, setCondensedPrintView] = useState(false);

  const toggleDomain = name =>
    setOpenDomain(o => ({ ...o, [name]: !(o[name] ?? true) }));

  const toggleProcess = (d, p) =>
    setOpenProcess(o => ({ ...o, [`${d}::${p}`]: !(o[`${d}::${p}`] ?? true) }));

  return (
    <main id="content">
      <div className="carto-container">

      {condensedPrintView ? (
        <div className="print-grid">
   {data.etablissements.map((etab, i) => (
    <div key={etab.nom}>
      <div className="etab-header">
      <h2>{etab.nom}</h2>
      {i === 0 && (
              <div style={{ margin: '0.5rem 0 1rem' }}>
                <button onClick={() => setCondensedPrintView(v => !v)}>
                  {condensedPrintView ? '📋 Vue liste' : '🔭 Vue Paysage'}
                </button>
              </div>
            )}
            </div>
      <div className="domains-condensed">
        {etab.domaines.map((dom, idx) => {
          const bgColor = DOMAIN_COLORS[idx % DOMAIN_COLORS.length];
          return (
            <div
              key={dom.nom}
              className="domain-box"
              style={{
                borderColor: "grey",
                backgroundColor: bgColor // Opacité légère
              }}
            >
              <h3>{dom.nom}</h3>
              <div className="process-grid">
                {dom.processus.map(proc => (
                  <div key={proc.nom} className="process-box">
                    <strong>{proc.nom}</strong>
                    <div className="apps-row">
                      {proc.applications.map(app => (
                        <div key={app.nom} className="app-mini">
                        <div className="app-header">
                          <h5>{app.nom}</h5>
                          <span
                            className="dot"
                            style={{
                              backgroundColor:
                                app.criticite === 'Critique' ? '#d32f2f' : '#616161',
                            }}
                            title={app.criticite}
                          />
                        </div>
                      
                        <div className="app-footer">
                          <span className="host-label">{app.hebergement}</span>
                          <span className="iface-list">
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
                          </span>
                        </div>
                      </div>
                      ))}
                    </div>
                  </div>
                ))}
              </div>
            </div>
          );
          
        })}
        
      </div>
      
     
    </div>

  ))}
</div>
      ) : (
        data.etablissements.map((etab, i) => (
          <div key={etab.nom}>
            <div className="etab-header">
            <h2>{etab.nom}</h2>
            {i === 0 && (
              <div style={{ margin: '0.5rem 0 1rem' }}>
                <button onClick={() => setCondensedPrintView(v => !v)}>
                  {condensedPrintView ? '📋 Vue liste' : '🔭 Vue Paysage'}
                </button>
              </div>
             
            )}
             </div>
            {etab.domaines.map((dom, idx) => {
              const domOpen = openDomain[dom.nom] ?? true;
              const bg = DOMAIN_COLORS[idx % DOMAIN_COLORS.length];

              return (
                <div
                  key={dom.nom}
                  className="domain"
                  style={{ background: bg }}
                >
                  <h3 onClick={() => toggleDomain(dom.nom)}>
                    {dom.nom} {domOpen ? '▼' : '▶︎'}
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
                                              : '#616161',
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
                                                style={{
                                                  backgroundColor: colors[t],
                                                }}
                                                title={t}
                                              />
                                            )
                                        )}
                                      </div>
                                      <p>{app.description}</p>
                                      <p
                                        style={{
                                          fontStyle: 'italic',
                                          color: '#666',
                                        }}
                                      >
                                        Hébergement : {app.hebergement}
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
        ))
      )}
      </div>
    </main>
  );
}

