import { useMemo } from 'react';
import useInfrastructureData from '../hooks/useInfrastructureData';
import { prettyLabel, prettyValue } from '../lib/utils';

export default function NetworkView({ data }) {
  const { data: infra } = useInfrastructureData();

  const serverIndex = useMemo(() => {
    const map = new Map();
    if (infra?.etablissements) {
      infra.etablissements.forEach(e => {
        (e.serveurs || []).forEach(s => {
          const key = (s.nom || s.VM || '').toLowerCase();
          if (key) map.set(key, s);
        });
      });
    }
    return map;
  }, [infra]);

  if (!data || !infra) {
    return <main id="content" className="business-loading">Chargement du réseau...</main>;
  }

  if (!data.etablissements.length) {
    return (
      <main id="content" className="business-empty-state">
        <span>Aucun résultat</span>
        <h3>Aucun VLAN ou serveur ne correspond à cette recherche.</h3>
        <p>Changez le mode de recherche ou effacez le filtre pour retrouver la topologie complète.</p>
      </main>
    );
  }

  return (
    <main id="content" className="network-map">
      {data.etablissements.map(etab => (
        <section key={etab.nom} className="network-site-card">
          <div className="business-etab-header etab-header">
            <div>
              <span className="business-section-kicker">Établissement</span>
              <h2>{etab.nom}</h2>
            </div>
            <span className="business-count-pill">{etab.vlans.length} VLANs</span>
          </div>

          <div className="network-vlan-list">
            {etab.vlans.map(vlan => (
              <details key={vlan.id} className="network-vlan-card" open>
                <summary>
                  <span>
                    <strong>{`VLAN-${vlan.id}`}</strong>
                    <em>{vlan.description || 'Description non renseignée'}</em>
                  </span>
                  <span className="network-vlan-meta">
                    <span>{vlan.network || '-'}</span>
                    <span>{vlan.serveurs.length} serveur(s)</span>
                  </span>
                </summary>

                <div className="network-address-grid">
                  <div>
                    <span className="label">Réseau</span>
                    <p>{vlan.network || '-'}</p>
                  </div>
                  <div>
                    <span className="label">Passerelle</span>
                    <p>{vlan.gateway || '-'}</p>
                  </div>
                </div>

                <ul className="server-list network-server-list">
                  {vlan.serveurs.map(s => {
                    const serverName = s.nom || s.VM || 'Serveur non renseigné';
                    const info = serverIndex.get(serverName.toLowerCase());
                    return (
                      <li key={s.ip} className="network-server-item">
                        <details className="server network-server-detail">
                          <summary>
                            <span>
                              {serverName}
                              {(info?.description || info?.RoleServeur) && (
                                <em className="server-description">{info.description || info.RoleServeur}</em>
                              )}
                            </span>
                            <strong>{s.ip}</strong>
                          </summary>
                          {info ? (
                            <table className="server-details">
                              <tbody>
                                {Object.entries(info)
                                  .filter(([k]) => !['VM', 'nom', 'trigramme', 'type', 'site'].includes(k))
                                  .map(([k, v]) => (
                                    <tr key={k}>
                                      <th className="server-key">{prettyLabel(k)}</th>
                                      <td className="server-val">{prettyValue(k, v)}</td>
                                    </tr>
                                  ))}
                              </tbody>
                            </table>
                          ) : (
                            <p className="business-muted">Aucun détail infrastructure</p>
                          )}
                        </details>
                      </li>
                    );
                  })}
                </ul>
              </details>
            ))}
          </div>
        </section>
      ))}
    </main>
  );
}
