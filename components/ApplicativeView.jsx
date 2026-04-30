import { useMemo, useState } from 'react';
import { DOMAIN_COLORS, INTERFACE_COLORS } from '../lib/constants';
import { prettyLabel, prettyValue } from '../lib/utils';
import useInfrastructureData from '../hooks/useInfrastructureData';

const HIDDEN_SERVER_FIELDS = new Set(['VM', 'nom', 'trigramme', 'type', 'site']);

function serverName(server) {
  return server?.nom || server?.VM || 'Serveur non renseigné';
}

function serverIp(server) {
  return server?.PrimaryIPAddress || server?.ip || server?.IP || '-';
}

function formatMemory(server) {
  const value = Number(server?.MemoryMiB || server?.memoryMiB || 0);
  if (!value) return '-';
  return `${Math.round(value / 1024)} Go`;
}

function formatDisk(server) {
  const value = Number(server?.TotalDiskCapacityMiB || server?.diskMiB || 0);
  if (!value) return '-';
  if (value >= 1024 * 1024) return `${(value / 1024 / 1024).toFixed(1)} To`;
  return `${Math.round(value / 1024)} Go`;
}

function useServerIndex(infraEtab) {
  return useMemo(() => {
    const map = new Map();

    if (infraEtab?.applications) {
      Object.entries(infraEtab.applications).forEach(([tri, servers]) => {
        map.set(tri, servers || []);
      });
      return map;
    }

    if (infraEtab?.serveurs) {
      infraEtab.serveurs.forEach(server => {
        if (!server.trigramme) return;
        map.set(server.trigramme, [...(map.get(server.trigramme) || []), server]);
      });
    }

    return map;
  }, [infraEtab]);
}

function getActiveInterfaces(app) {
  return Object.entries(app.interfaces || {}).filter(([, active]) => active);
}

function appMatches(app, serverIndex, term) {
  if (!term) return true;
  const haystack = [
    app.nom,
    app.description,
    app.trigramme,
    app.hebergement,
    app.editeur,
    app.referent,
  ].filter(Boolean).join(' ').toLowerCase();

  if (haystack.includes(term)) return true;

  const servers = app.trigramme ? serverIndex.get(app.trigramme) || [] : [];
  return servers.some(server => {
    const serverHaystack = [
      serverName(server),
      serverIp(server),
      server.RoleServeur,
      server.OS,
      server.Backup,
    ].filter(Boolean).join(' ').toLowerCase();
    return serverHaystack.includes(term);
  });
}

function countApplications(processus) {
  return processus.reduce((total, proc) => total + proc.applications.length, 0);
}

function countServers(processus, serverIndex) {
  return processus.reduce(
    (total, proc) =>
      total + proc.applications.reduce(
        (appTotal, app) => appTotal + (app.trigramme ? (serverIndex.get(app.trigramme) || []).length : 0),
        0,
      ),
    0,
  );
}

function getDomains(etab, serverIndex, search) {
  const term = search ? search.toLowerCase() : '';

  return etab.domaines
    .map((dom, idx) => {
      const processus = dom.processus
        .map(proc => ({
          ...proc,
          applications: proc.applications.filter(app => appMatches(app, serverIndex, term)),
        }))
        .filter(proc => proc.applications.length > 0);
      return { dom, idx, processus };
    })
    .filter(item => item.processus.length > 0);
}

function ServerSummary({ servers }) {
  const cpu = servers.reduce((total, server) => total + Number(server.CPUs || server.cpu || 0), 0);
  const memoryMiB = servers.reduce((total, server) => total + Number(server.MemoryMiB || 0), 0);
  const diskMiB = servers.reduce((total, server) => total + Number(server.TotalDiskCapacityMiB || 0), 0);

  return (
    <div className="app-server-summary" aria-label="Synthèse serveurs">
      <span>{servers.length} serveur(s)</span>
      <span>{cpu || '-'} vCPU</span>
      <span>{memoryMiB ? `${Math.round(memoryMiB / 1024)} Go RAM` : 'RAM -'}</span>
      <span>{diskMiB ? `${Math.round(diskMiB / 1024)} Go disque` : 'Disque -'}</span>
    </div>
  );
}

function ServerCard({ server }) {
  const detailRows = Object.entries(server)
    .filter(([key]) => !HIDDEN_SERVER_FIELDS.has(key))
    .filter(([, value]) => value !== null && value !== undefined && value !== '');

  return (
    <details className="app-server-card">
      <summary>
        <span>
          <strong>{serverName(server)}</strong>
          <em>{server.description || server.RoleServeur || 'Rôle non renseigné'}</em>
        </span>
        <span className="app-server-ip">{serverIp(server)}</span>
      </summary>
      <div className="app-server-stats">
        <span>{server.CPUs || '-'} vCPU</span>
        <span>{formatMemory(server)} RAM</span>
        <span>{formatDisk(server)} disque</span>
        <span>{server.Backup || 'Backup -'}</span>
      </div>
      <table className="server-details app-server-details">
        <tbody>
          {detailRows.map(([key, value]) => (
            <tr key={key}>
              <th className="server-key">{prettyLabel(key)}</th>
              <td className="server-val">{prettyValue(key, value)}</td>
            </tr>
          ))}
        </tbody>
      </table>
    </details>
  );
}

function ApplicationInfrastructureCard({ app, colors, servers, serversOpen, onToggleServers }) {
  const activeInterfaces = getActiveInterfaces(app);
  const isCritical = app.criticite === 'Critique';

  return (
    <article className={`app-infra-card ${isCritical ? 'is-critical' : ''}`}>
      <div className="app-infra-topline">
        <span className="business-trigram">{app.trigramme || 'N/A'}</span>
        <span className={`business-criticality ${isCritical ? 'critical' : 'standard'}`}>
          {isCritical ? 'Critique' : 'Standard'}
        </span>
      </div>

      <div className="app-infra-main">
        <div>
          <h5>{app.nom}</h5>
          <p>{app.description || 'Description non renseignée.'}</p>
        </div>
        <div className="app-infra-tags">
          <span>{app.hebergement || 'Hébergement -'}</span>
          {app.multiEtablissement && <span>Multi-site</span>}
          {app.editeur && <span>{app.editeur}</span>}
        </div>
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

      <div className="app-infra-server-panel">
        <button type="button" className="app-server-toggle" onClick={onToggleServers} aria-expanded={serversOpen}>
          <span>Serveurs logiques</span>
          <strong>{servers.length}</strong>
          <em>{serversOpen ? 'Masquer' : 'Afficher'}</em>
        </button>
        {servers.length > 0 ? (
          <>
            <ServerSummary servers={servers} />
            {serversOpen && (
              <div className="app-server-list">
                {servers.map(server => (
                  <ServerCard key={serverName(server)} server={server} />
                ))}
              </div>
            )}
          </>
        ) : (
          <p className="business-muted app-no-server">Aucun serveur logique rattaché.</p>
        )}
      </div>
    </article>
  );
}

function MiniInfrastructureCard({ app, colors, servers }) {
  const activeInterfaces = getActiveInterfaces(app);

  return (
    <div className={`app-mini business-mini-app app-mini-infra ${app.criticite === 'Critique' ? 'is-critical' : ''}`}>
      <div className="app-header">
        <span className="business-trigram">{app.trigramme || 'N/A'}</span>
        <span
          className="dot"
          style={{ backgroundColor: app.criticite === 'Critique' ? '#dc2626' : '#64748b' }}
          title={app.criticite}
        />
      </div>
      <h5>{app.nom}</h5>
      <div className="app-footer">
        <span className="host-label">{app.hebergement}</span>
        <span className="iface-list">
          {activeInterfaces.map(([name]) => (
            <span key={name} className="iface-dot" style={{ backgroundColor: colors[name] }} title={name} />
          ))}
        </span>
      </div>
      <span className="server-count">{servers.length} serveur(s)</span>
    </div>
  );
}

function EstablishmentView({
  etab,
  infraEtab,
  colors,
  openDomain,
  openProcess,
  openServers,
  toggleDomain,
  toggleProcess,
  toggleServers,
  search,
}) {
  const serverIndex = useServerIndex(infraEtab);
  const domains = getDomains(etab, serverIndex, search);
  const appCount = domains.reduce((total, item) => total + countApplications(item.processus), 0);
  const serverCount = domains.reduce((total, item) => total + countServers(item.processus, serverIndex), 0);

  if (!domains.length) return null;

  return (
    <section className="business-establishment app-establishment">
      <div className="business-etab-header etab-header">
        <div>
          <span className="business-section-kicker">Établissement</span>
          <h2>{etab.nom}</h2>
        </div>
        <div className="business-etab-stats">
          <span>{domains.length} domaines</span>
          <span>{appCount} applications</span>
          <span>{serverCount} serveurs</span>
        </div>
      </div>

      <div className="business-domain-list">
        {domains.map(({ dom, idx, processus }) => {
          const domOpen = openDomain[dom.nom] ?? true;
          const bg = DOMAIN_COLORS[idx % DOMAIN_COLORS.length];
          const appTotal = countApplications(processus);
          const srvTotal = countServers(processus, serverIndex);

          return (
            <section key={dom.nom} className="business-domain-card app-domain-card" style={{ '--domain-tint': bg }}>
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
                  <span>{processus.length} processus</span>
                  <span>{appTotal} apps</span>
                  <span>{srvTotal} serveurs</span>
                </span>
                <span className="business-chevron">{domOpen ? 'Masquer' : 'Afficher'}</span>
              </button>

              {domOpen && (
                <div className="business-process-list">
                  {processus.map(proc => {
                    const procOpen = openProcess[`${dom.nom}::${proc.nom}`] ?? true;
                    const procServerCount = proc.applications.reduce(
                      (total, app) => total + (app.trigramme ? (serverIndex.get(app.trigramme) || []).length : 0),
                      0,
                    );

                    return (
                      <section key={proc.nom} className="business-process-card app-process-card">
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
                            <span>{procServerCount} serveurs</span>
                            <span>{procOpen ? 'Réduire' : 'Déplier'}</span>
                          </span>
                        </button>

                        {procOpen && (
                          <div className="app-infra-grid">
                            {proc.applications.map(app => {
                              const servers = app.trigramme ? serverIndex.get(app.trigramme) || [] : [];
                              const serverKey = `${etab.nom}::${app.trigramme || app.nom}`;
                              const serversOpen = openServers[serverKey] ?? false;
                              return (
                                <ApplicationInfrastructureCard
                                  key={app.nom}
                                  app={app}
                                  colors={colors}
                                  servers={servers}
                                  serversOpen={serversOpen}
                                  onToggleServers={() => toggleServers(etab.nom, app.trigramme || app.nom)}
                                />
                              );
                            })}
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
}

function EstablishmentLandscape({ etab, infraEtab, colors, search }) {
  const serverIndex = useServerIndex(infraEtab);
  const domains = getDomains(etab, serverIndex, search);

  if (!domains.length) return null;

  return (
    <section className="business-establishment is-condensed app-establishment">
      <div className="business-etab-header etab-header">
        <div>
          <span className="business-section-kicker">Établissement</span>
          <h2>{etab.nom}</h2>
        </div>
        <span className="business-count-pill">{domains.length} domaines</span>
      </div>

      <div className="domains-condensed business-domains-condensed">
        {domains.map(({ dom, idx, processus }) => {
          const bg = DOMAIN_COLORS[idx % DOMAIN_COLORS.length];
          return (
            <div key={dom.nom} className="domain-box business-domain-box app-landscape-domain" style={{ '--domain-tint': bg }}>
              <div className="business-domain-title">
                <h3>{dom.nom}</h3>
                <span>{countServers(processus, serverIndex)} serveurs</span>
              </div>
              <div className="process-grid">
                {processus.map(proc => (
                  <div key={proc.nom} className="process-box business-process-box">
                    <strong>{proc.nom}</strong>
                    <div className="apps-row">
                      {proc.applications.map(app => (
                        <MiniInfrastructureCard
                          key={app.nom}
                          app={app}
                          colors={colors}
                          servers={app.trigramme ? serverIndex.get(app.trigramme) || [] : []}
                        />
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
  );
}

export default function ApplicativeView({ data, colors = INTERFACE_COLORS, search = '' }) {
  const { data: infra } = useInfrastructureData();
  const [openDomain, setOpenDomain] = useState({});
  const [openProcess, setOpenProcess] = useState({});
  const [openServers, setOpenServers] = useState({});
  const [landscapeView, setLandscapeView] = useState(false);

  if (!data || !infra) {
    return <main id="content" className="business-loading">Chargement de la vue applicative...</main>;
  }

  const toggleDomain = name =>
    setOpenDomain(current => ({ ...current, [name]: !(current[name] ?? true) }));

  const toggleProcess = (domainName, processName) =>
    setOpenProcess(current => ({
      ...current,
      [`${domainName}::${processName}`]: !(current[`${domainName}::${processName}`] ?? true),
    }));

  const toggleServers = (etabName, trigramme) =>
    setOpenServers(current => ({
      ...current,
      [`${etabName}::${trigramme}`]: !(current[`${etabName}::${trigramme}`] ?? false),
    }));

  const getInfraEtab = etabName => infra.etablissements.find(item => item.nom === etabName);

  return (
    <main id="content" className="app-carto">
      <div className="business-carto-toolbar">
        <div>
          <span className="business-section-kicker">Vue applicative</span>
          <h2>{landscapeView ? 'Vue paysage infra' : 'Vue détaillée infra'}</h2>
        </div>
        <div className="business-view-toggle" aria-label="Mode d'affichage applicatif">
          <button type="button" className={!landscapeView ? 'active' : ''} onClick={() => setLandscapeView(false)}>
            Détaillée
          </button>
          <button type="button" className={landscapeView ? 'active' : ''} onClick={() => setLandscapeView(true)}>
            Paysage
          </button>
        </div>
      </div>

      {landscapeView ? (
        <div className="print-grid business-print-grid app-landscape-grid">
          {data.etablissements.map(etab => (
            <EstablishmentLandscape
              key={etab.nom}
              etab={etab}
              infraEtab={getInfraEtab(etab.nom)}
              colors={colors}
              search={search}
            />
          ))}
        </div>
      ) : (
        <div className="business-establishments app-establishments">
          {data.etablissements.map(etab => (
            <EstablishmentView
              key={etab.nom}
              etab={etab}
              infraEtab={getInfraEtab(etab.nom)}
              colors={colors}
              openDomain={openDomain}
              openProcess={openProcess}
              openServers={openServers}
              toggleDomain={toggleDomain}
              toggleProcess={toggleProcess}
              toggleServers={toggleServers}
              search={search}
            />
          ))}
        </div>
      )}
    </main>
  );
}
