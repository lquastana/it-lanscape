import { useMemo, useState } from 'react';
import { DOMAIN_COLORS } from '../lib/constants';

function getActiveInterfaces(app) {
  return Object.entries(app.interfaces || {}).filter(([, active]) => active);
}

function countApplications(processus) {
  return processus.reduce((total, proc) => total + proc.applications.length, 0);
}

function getCriticalCount(processus) {
  return processus.reduce(
    (total, proc) =>
      total + proc.applications.filter(app => app.criticite === 'Critique').length,
    0,
  );
}

function ApplicationCard({ app, colors }) {
  const activeInterfaces = getActiveInterfaces(app);
  const isCritical = app.criticite === 'Critique';

  return (
    <article className={`business-app-card ${isCritical ? 'is-critical' : ''}`}>
      <div className="business-app-topline">
        <span className="business-trigram">{app.trigramme || 'N/A'}</span>
        <span className={`business-criticality ${isCritical ? 'critical' : 'standard'}`}>
          {isCritical ? 'Critique' : 'Standard'}
        </span>
      </div>
      <h5>{app.nom}</h5>
      <p>{app.description || 'Description non renseignée.'}</p>
      <div className="business-app-meta">
        <span>{app.hebergement || 'Hébergement non renseigné'}</span>
        {app.multiEtablissement && <span>Multi-site</span>}
      </div>
      <div className="business-interface-row" aria-label="Interfaces actives">
        {activeInterfaces.length ? (
          activeInterfaces.map(([name]) => (
            <span
              key={name}
              className="business-interface-chip"
              style={{ '--iface-color': colors[name] || '#64748b' }}
              title={name}
            >
              {name}
            </span>
          ))
        ) : (
          <span className="business-muted">Aucune interface active</span>
        )}
      </div>
    </article>
  );
}

function MiniApplicationCard({ app, colors }) {
  const activeInterfaces = getActiveInterfaces(app);

  return (
    <div className={`app-mini business-mini-app ${app.criticite === 'Critique' ? 'is-critical' : ''}`}>
      <div className="app-header">
        <span className="business-trigram">{app.trigramme || 'N/A'}</span>
        <span
          className="dot"
          style={{
            backgroundColor: app.criticite === 'Critique' ? '#dc2626' : '#64748b',
          }}
          title={app.criticite}
        />
      </div>
      <h5>{app.nom}</h5>
      <div className="app-footer">
        <span className="host-label">{app.hebergement}</span>
        <span className="iface-list">
          {activeInterfaces.map(([name]) => (
            <span
              key={name}
              className="iface-dot"
              style={{ backgroundColor: colors[name] }}
              title={name}
            />
          ))}
        </span>
      </div>
    </div>
  );
}

export default function Cartography({ data, colors, search }) {
  const [openDomain, setOpenDomain] = useState({});
  const [openProcess, setOpenProcess] = useState({});
  const [condensedPrintView, setCondensedPrintView] = useState(false);

  const etablissements = useMemo(() => {
    if (!data) return [];

    const term = (search || '').toLowerCase();
    if (!term) return data.etablissements;

    return data.etablissements
      .map(e => {
        const domaines = e.domaines
          .map(d => {
            const processus = d.processus
              .map(p => {
                const applications = p.applications.filter(app => {
                  const nom = app.nom.toLowerCase();
                  const desc = (app.description || '').toLowerCase();
                  const tri = (app.trigramme || '').toLowerCase();
                  return nom.includes(term) || desc.includes(term) || tri.includes(term);
                });
                return { ...p, applications };
              })
              .filter(
                p =>
                  p.applications.length > 0 ||
                  p.nom.toLowerCase().includes(term) ||
                  (p.description || '').toLowerCase().includes(term),
              );
            return { ...d, processus };
          })
          .filter(
            d =>
              d.processus.length > 0 ||
              d.nom.toLowerCase().includes(term) ||
              (d.description || '').toLowerCase().includes(term),
          );
        return { ...e, domaines };
      })
      .filter(e => e.domaines.length > 0 || e.nom.toLowerCase().includes(term));
  }, [data, search]);

  const toggleDomain = name =>
    setOpenDomain(current => ({ ...current, [name]: !(current[name] ?? true) }));

  const toggleProcess = (domainName, processName) =>
    setOpenProcess(current => ({
      ...current,
      [`${domainName}::${processName}`]: !(current[`${domainName}::${processName}`] ?? true),
    }));

  if (!data) return <main id="content" className="business-loading">Chargement de la cartographie...</main>;

  const emptyResults = etablissements.length === 0;

  return (
    <main id="content" className="business-carto">
      <div className="business-carto-toolbar">
        <div>
          <span className="business-section-kicker">Cartographie métier</span>
          <h2>{condensedPrintView ? 'Vue paysage' : 'Vue détaillée'}</h2>
        </div>
        <div className="business-view-toggle" aria-label="Mode d'affichage">
          <button
            type="button"
            className={!condensedPrintView ? 'active' : ''}
            onClick={() => setCondensedPrintView(false)}
          >
            Détaillée
          </button>
          <button
            type="button"
            className={condensedPrintView ? 'active' : ''}
            onClick={() => setCondensedPrintView(true)}
          >
            Paysage
          </button>
        </div>
      </div>

      {emptyResults ? (
        <section className="business-empty-state">
          <span>Aucun résultat</span>
          <h3>La cartographie ne contient aucune application pour ces critères.</h3>
          <p>Élargissez la recherche ou réinitialisez les filtres pour retrouver le périmètre complet.</p>
        </section>
      ) : condensedPrintView ? (
        <div className="print-grid business-print-grid">
          {etablissements.map(etab => (
            <section key={etab.nom} className="business-establishment is-condensed">
              <div className="etab-header business-etab-header">
                <div>
                  <span className="business-section-kicker">Établissement</span>
                  <h2>{etab.nom}</h2>
                </div>
                <span className="business-count-pill">
                  {etab.domaines.length} domaines
                </span>
              </div>
              <div className="domains-condensed business-domains-condensed">
                {etab.domaines.map((dom, idx) => {
                  const processus = dom.processus.filter(proc => proc.applications.length > 0);
                  const bgColor = DOMAIN_COLORS[idx % DOMAIN_COLORS.length];

                  if (!processus.length) return null;

                  return (
                    <div
                      key={dom.nom}
                      className="domain-box business-domain-box"
                      style={{ '--domain-tint': bgColor }}
                    >
                      <div className="business-domain-title">
                        <h3>{dom.nom}</h3>
                        <span>{countApplications(processus)} apps</span>
                      </div>
                      <div className="process-grid">
                        {processus.map(proc => (
                          <div key={proc.nom} className="process-box business-process-box">
                            <strong>{proc.nom}</strong>
                            <div className="apps-row">
                              {proc.applications.map(app => (
                                <MiniApplicationCard key={app.nom} app={app} colors={colors} />
                              ))}
                            </div>
                          </div>
                        ))}
                      </div>
                    </div>
                  );
                })}
              </div>
            </section>
          ))}
        </div>
      ) : (
        <div className="business-establishments">
          {etablissements.map(etab => {
            const appCount = etab.domaines.reduce(
              (total, dom) => total + countApplications(dom.processus),
              0,
            );
            const criticalCount = etab.domaines.reduce(
              (total, dom) => total + getCriticalCount(dom.processus),
              0,
            );

            return (
              <section key={etab.nom} className="business-establishment">
                <div className="etab-header business-etab-header">
                  <div>
                    <span className="business-section-kicker">Établissement</span>
                    <h2>{etab.nom}</h2>
                  </div>
                  <div className="business-etab-stats" aria-label="Synthèse établissement">
                    <span>{etab.domaines.length} domaines</span>
                    <span>{appCount} applications</span>
                    <span>{criticalCount} critiques</span>
                  </div>
                </div>

                <div className="business-domain-list">
                  {etab.domaines.map((dom, idx) => {
                    const domOpen = openDomain[dom.nom] ?? true;
                    const bg = DOMAIN_COLORS[idx % DOMAIN_COLORS.length];
                    const appTotal = countApplications(dom.processus);
                    const criticalTotal = getCriticalCount(dom.processus);

                    if (appTotal === 0) return null;

                    return (
                      <section
                        key={dom.nom}
                        className="business-domain-card"
                        style={{ '--domain-tint': bg }}
                      >
                        <button
                          type="button"
                          className="business-domain-header"
                          onClick={() => toggleDomain(dom.nom)}
                          aria-expanded={domOpen}
                        >
                          <span className="business-domain-accent" aria-hidden="true" />
                          <span>
                            <span className="business-section-kicker">Domaine</span>
                            <strong>{dom.nom}</strong>
                            {dom.description && <em>{dom.description}</em>}
                          </span>
                          <span className="business-domain-metrics">
                            <span>{dom.processus.length} processus</span>
                            <span>{appTotal} apps</span>
                            {criticalTotal > 0 && <span>{criticalTotal} critiques</span>}
                          </span>
                          <span className="business-chevron">{domOpen ? 'Masquer' : 'Afficher'}</span>
                        </button>

                        {domOpen && (
                          <div className="business-process-list">
                            {dom.processus.map(proc => {
                              const procOpen = openProcess[`${dom.nom}::${proc.nom}`] ?? true;
                              const procCriticalCount = proc.applications.filter(
                                app => app.criticite === 'Critique',
                              ).length;

                              if (proc.applications.length === 0) return null;

                              return (
                                <section key={proc.nom} className="business-process-card">
                                  <button
                                    type="button"
                                    className="business-process-header"
                                    onClick={() => toggleProcess(dom.nom, proc.nom)}
                                    aria-expanded={procOpen}
                                  >
                                    <span>
                                      <strong>{proc.nom}</strong>
                                      {proc.description && <em>{proc.description}</em>}
                                    </span>
                                    <span className="business-process-meta">
                                      <span>{proc.applications.length} apps</span>
                                      {procCriticalCount > 0 && <span>{procCriticalCount} critiques</span>}
                                      <span>{procOpen ? 'Réduire' : 'Déplier'}</span>
                                    </span>
                                  </button>

                                  {procOpen && (
                                    <div className="business-app-grid">
                                      {proc.applications.map(app => (
                                        <ApplicationCard key={app.nom} app={app} colors={colors} />
                                      ))}
                                    </div>
                                  )}
                                </section>
                              );
                            })}
                          </div>
                        )}
                      </section>
                    );
                  })}
                </div>
              </section>
            );
          })}
        </div>
      )}
    </main>
  );
}
