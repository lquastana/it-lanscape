import { useState, useMemo } from 'react';
import { DOMAIN_COLORS, INTERFACE_COLORS } from '../lib/constants';
import useInfrastructureData from '../hooks/useInfrastructureData';

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
                                      style={{ backgroundColor: colors[t], marginRight: 3 }}
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
}) {
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
                                          style={{ backgroundColor: colors[t], marginRight: 3 }}
                                          title={t}
                                        />
                                      ) : null,
                                    )}
                                  </div>
                                  <p>{app.description}</p>
                                  <p className="host-label" style={{ fontStyle: 'italic', color: '#666' }}>
                                    Hébergement : {app.hebergement}
                                  </p>
                                  {app.trigramme && (
                                    <div className="servers-section">
                                      <h6 onClick={() => toggleServers(etab.nom, app.trigramme)}>
                                        Serveurs logiques {sOpen ? '▼' : '▶︎'}
                                      </h6>
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
                                                          <th>{k}</th>
                                                          <td>{Array.isArray(v) ? v.join(', ') : v}</td>
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

  const [openDomain, setOpenDomain] = useState({});
  const [openProcess, setOpenProcess] = useState({});
  const [openServers, setOpenServers] = useState({});
  const [condensedPrintView, setCondensedPrintView] = useState(false);

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
            />
          );
        })
      )}
    </main>
  );
}

