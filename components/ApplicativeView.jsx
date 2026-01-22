import { useState, useMemo } from 'react';
import { DOMAIN_COLORS, INTERFACE_COLORS } from '../lib/constants';
import {toGiBRounded,prettyLabel,prettyValue} from '../lib/utils';
import useInfrastructureData from '../hooks/useInfrastructureData';
import useFluxData from '../hooks/useFluxData';

function useServerIndex(infraEtab) {
  return useMemo(() => {
    const map = new Map();
    if (infraEtab?.applications) {
      Object.entries(infraEtab.applications).forEach(([tri, servers]) => {
        map.set(tri, servers);
      });
    }
  return map;
  }, [infraEtab]);
}

function appMatches(app, serverIndex, term) {
  if (!term) return true;
  if (app.nom.toLowerCase().includes(term)) return true;
  if (app.trigramme) {
    const servers = serverIndex.get(app.trigramme) || [];
    return servers.some(s => s.VM.toLowerCase().includes(term));
  }
  return false;
}

function buildDependencyIndex(fluxData) {
  const map = new Map();
  if (!fluxData?.etablissements) return map;

  fluxData.etablissements.forEach(etab => {
    const depsByApp = new Map();
    (etab.flux || []).forEach(flow => {
      const { sourceTrigramme, targetTrigramme } = flow;
      if (!sourceTrigramme || !targetTrigramme) return;
      if (!depsByApp.has(sourceTrigramme)) {
        depsByApp.set(sourceTrigramme, { upstream: new Set(), downstream: new Set() });
      }
      if (!depsByApp.has(targetTrigramme)) {
        depsByApp.set(targetTrigramme, { upstream: new Set(), downstream: new Set() });
      }
      depsByApp.get(sourceTrigramme).downstream.add(targetTrigramme);
      depsByApp.get(targetTrigramme).upstream.add(sourceTrigramme);
    });
    map.set(etab.nom, depsByApp);
  });

  return map;
}

function EtabCondensed({ etab, infraEtab, colors, showSwitch, condensedPrintView, setCondensedPrintView, search }) {
  const serverIndex = useServerIndex(infraEtab);
  const term = search ? search.toLowerCase() : '';

  const domains = etab.domaines
    .map((dom, idx) => {
      const processus = dom.processus
        .map(proc => ({
          ...proc,
          applications: proc.applications.filter(app => appMatches(app, serverIndex, term)),
        }))
        .filter(p => p.applications.length > 0);
      return { dom, idx, processus };
    })
    .filter(d => d.processus.length > 0);

  return (
    <div>
      <div className="etab-header">
        <h2>{etab.nom}</h2>
        {showSwitch && (
          <div style={{ margin: '0.5rem 0 1rem' }}>
            <button onClick={() => setCondensedPrintView(v => !v)}>
              {condensedPrintView ? '📋 Vue liste' : '🔭 Vue Paysage'}
            </button>
          </div>
        )}
      </div>
      <div className="domains-condensed">
        {domains.map(({ dom, idx, processus }) => {
          const bgColor = DOMAIN_COLORS[idx % DOMAIN_COLORS.length];
          return (
            <div
              key={dom.nom}
              className="domain-box"
              style={{ borderColor: 'grey', backgroundColor: bgColor }}
            >
              <h3>{dom.nom}</h3>
              <div className="process-grid">
                {processus.map(proc => (
                  <div key={proc.nom} className="process-box">
                    <strong>{proc.nom}</strong>
                    <div className="apps-row">
                      {proc.applications.map(app => {
                        const count = app.trigramme ? (serverIndex.get(app.trigramme) || []).length : 0;
                        return (
                          <div key={app.nom} className="app-mini">
                            <div className="app-header">
                              <h5>{app.nom}</h5>
                              <span
                                className="dot"
                                style={{
                                  backgroundColor: app.criticite === 'Critique' ? '#d32f2f' : '#616161',
                                }}
                                title={app.criticite}
                              />
                            </div>
                            <div className="app-footer">
                              <span className="host-label">{app.hebergement}</span>
                              <span className="iface-list">
                                {Object.entries(app.interfaces || {}).map(([t, act]) =>
                                  act ? (
                                    <span
                                      key={t}
                                      className="iface-dot"
                                      style={{ backgroundColor: colors[t] }}
                                      title={t}
                                    />
                                  ) : null
                                )}
                              </span>
                            </div>
                            {count > 0 && (
                              <span className="server-count" title="Nombre de serveurs logiques">
                                🖥️ {count}
                              </span>
                            )}
                          </div>
                        );
                      })}
                    </div>
                  </div>
                ))}
              </div>
            </div>
          );
        })}
      </div>
    </div>
  );
}

function EtabNormal({
  etab,
  infraEtab,
  colors,
  openDomain,
  openProcess,
  openServers,
  toggleDomain,
  toggleProcess,
  toggleServers,
  showSwitch,
  condensedPrintView,
  setCondensedPrintView,
  search,
  dependencyIndex,
  resolveAppLabel,
}) {
  const serverIndex = useServerIndex(infraEtab);
  const term = search ? search.toLowerCase() : '';
  const depsByApp = dependencyIndex?.get(etab.nom);

  const domains = etab.domaines
    .map((dom, idx) => {
      const processus = dom.processus
        .map(proc => ({
          ...proc,
          applications: proc.applications.filter(app => appMatches(app, serverIndex, term)),
        }))
        .filter(p => p.applications.length > 0);
      return { dom, idx, processus };
    })
    .filter(d => d.processus.length > 0);

  return (
    <div>
      <div className="etab-header">
        <h2>{etab.nom}</h2>
        {showSwitch && (
          <div style={{ margin: '0.5rem 0 1rem' }}>
            <button onClick={() => setCondensedPrintView(v => !v)}>
              {condensedPrintView ? '📋 Vue liste' : '🔭 Vue Paysage'}
            </button>
          </div>
        )}
      </div>
      {domains.map(({ dom, idx, processus }) => {
        const domOpen = openDomain[dom.nom] ?? true;
        const bg = DOMAIN_COLORS[idx % DOMAIN_COLORS.length];
        return (
          <div key={dom.nom} className="domain" style={{ background: bg }}>
            <h3 onClick={() => toggleDomain(dom.nom)}>
              {dom.nom} {domOpen ? '▼' : '▶︎'}
            </h3>
            {domOpen && (
              <>
                <p>{dom.description}</p>
                {processus.map(proc => {
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
                            {proc.applications.map(app => {
                              const servers = app.trigramme ? serverIndex.get(app.trigramme) || [] : [];
                              const sKey = `${etab.nom}::${app.trigramme}`;
                              const sOpen = openServers[sKey] ?? true;
                              const deps = app.trigramme ? depsByApp?.get(app.trigramme) : null;
                              const upstream = deps ? Array.from(deps.upstream) : [];
                              const downstream = deps ? Array.from(deps.downstream) : [];
                              const isSpof = servers.length === 1;
                              return (
                                <div key={app.nom} className="application">
                                  <h5>
                                    {app.nom}
                                    {app.multiEtablissement && <span className="multi-icon">🏛️</span>}
                                  </h5>
                                  <span
                                    className="crit-dot"
                                    style={{
                                      backgroundColor: app.criticite === 'Critique' ? '#d32f2f' : '#616161',
                                    }}
                                    title={`Criticité : ${app.criticite}`}
                                  >
                                    {app.criticite}
                                  </span>
                                  <div className="iface-list">
                                    {Object.entries(app.interfaces || {}).map(([t, act]) =>
                                      act ? (
                                        <span
                                          key={t}
                                          className="iface-dot"
                                          style={{ backgroundColor: colors[t] }}
                                          title={t}
                                        />
                                      ) : null,
                                    )}
                                  </div>
                                  <p>{app.description}</p>
                                  <p className="host-label" style={{ fontStyle: 'italic', color: '#666' }}>
                                    Hébergement : {app.hebergement}
                                  </p>
                                  <div className="dependency-block">
                                    <div className="dependency-header">
                                      <span className="dependency-title">Dépendances</span>
                                      {isSpof && (
                                        <span className="spof-badge" title="Single point of failure">
                                          SPOF · {servers.length} serveur
                                        </span>
                                      )}
                                    </div>
                                    <div className="dependency-grid">
                                      <div>
                                        <span className="dependency-label">Amont</span>
                                        {upstream.length > 0 ? (
                                          <ul className="dependency-list">
                                            {upstream.map(tri => (
                                              <li key={`up-${tri}`}>{resolveAppLabel(tri)}</li>
                                            ))}
                                          </ul>
                                        ) : (
                                          <span className="dependency-empty">Aucune</span>
                                        )}
                                      </div>
                                      <div>
                                        <span className="dependency-label">Aval</span>
                                        {downstream.length > 0 ? (
                                          <ul className="dependency-list">
                                            {downstream.map(tri => (
                                              <li key={`down-${tri}`}>{resolveAppLabel(tri)}</li>
                                            ))}
                                          </ul>
                                        ) : (
                                          <span className="dependency-empty">Aucune</span>
                                        )}
                                      </div>
                                    </div>
                                  </div>
                                  {app.trigramme && (
                                    <div className="servers-section">
                                      <h5 onClick={() => toggleServers(etab.nom, app.trigramme)}>
                                        Serveurs logiques {sOpen ? '▼' : '▶︎'}
                                      </h5>
                                      {sOpen && (
                                        <>
                                          {servers.length > 0 ? (
                                            servers.map(s => (
                                              <details key={s.VM} className="server">
                                                <summary>{s.VM}</summary>
                                                <table className="server-details">
                                                  <tbody>
                                                    {Object.entries(s)
                                                      .filter(([k]) => !['VM', 'trigramme'].includes(k))
                                                      .map(([k, v]) => (
                                                        <tr key={k}>
                                                          <th className="server-key">{prettyLabel(k)}</th>
                                                          <td className="server-val">{prettyValue(k, v)}</td>
                                                        </tr>
                                                      ))}
                                                  </tbody>
                                                </table>
                                              </details>
                                            ))
                                          ) : (
                                            <p style={{ fontSize: '0.9em', color: '#666' }}>
                                              Aucun serveur logique
                                            </p>
                                          )}
                                        </>
                                      )}
                                    </div>
                                  )}
                                </div>
                              );
                            })}
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
  );
}

export default function ApplicativeView({ data, colors = INTERFACE_COLORS, search = '' }) {
  const { data: infra } = useInfrastructureData();
  const { data: flux } = useFluxData();

  const [openDomain, setOpenDomain] = useState({});
  const [openProcess, setOpenProcess] = useState({});
  const [openServers, setOpenServers] = useState({});
  const [condensedPrintView, setCondensedPrintView] = useState(false);

  const dependencyIndex = useMemo(() => buildDependencyIndex(flux), [flux]);
  const appLabelByTri = useMemo(() => {
    const map = new Map();
    data?.etablissements?.forEach(etab => {
      etab.domaines.forEach(dom => {
        dom.processus.forEach(proc => {
          proc.applications.forEach(app => {
            if (app.trigramme && !map.has(app.trigramme)) {
              map.set(app.trigramme, app.nom);
            }
          });
        });
      });
    });
    return map;
  }, [data]);
  const resolveAppLabel = (tri) => appLabelByTri.get(tri) || tri;

  if (!data || !infra) return <main id="content">Chargement…</main>;

  const toggleDomain = name =>
    setOpenDomain(o => ({ ...o, [name]: !(o[name] ?? true) }));

  const toggleProcess = (d, p) =>
    setOpenProcess(o => ({ ...o, [`${d}::${p}`]: !(o[`${d}::${p}`] ?? true) }));

  const toggleServers = (e, t) =>
    setOpenServers(o => ({ ...o, [`${e}::${t}`]: !(o[`${e}::${t}`] ?? true) }));

  return (
    <main id="content">
      {condensedPrintView ? (
        <div className="print-grid">
          {data.etablissements.map((etab, i) => {
            const infraEtab = infra.etablissements.find(e => e.nom === etab.nom);
            return (
              <EtabCondensed
                key={etab.nom}
                etab={etab}
                infraEtab={infraEtab}
                colors={colors}
                showSwitch={i === 0}
                condensedPrintView={condensedPrintView}
                setCondensedPrintView={setCondensedPrintView}
                search={search}
              />
            );
          })}
        </div>
      ) : (
        data.etablissements.map((etab, i) => {
          const infraEtab = infra.etablissements.find(e => e.nom === etab.nom);
          return (
            <EtabNormal
              key={etab.nom}
              etab={etab}
              infraEtab={infraEtab}
              colors={colors}
              openDomain={openDomain}
              openProcess={openProcess}
              openServers={openServers}
              toggleDomain={toggleDomain}
              toggleProcess={toggleProcess}
              toggleServers={toggleServers}
              showSwitch={i === 0}
              condensedPrintView={condensedPrintView}
              setCondensedPrintView={setCondensedPrintView}
              search={search}
              dependencyIndex={dependencyIndex}
              resolveAppLabel={resolveAppLabel}
            />
          );
        })
      )}
    </main>
  );
}
