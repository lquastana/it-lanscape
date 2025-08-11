import { useMemo } from 'react';
import useInfrastructureData from '../hooks/useInfrastructureData';
import { prettyLabel, prettyValue } from '../lib/utils';

export default function NetworkView({ data, search = '' }) {
  const { data: infra } = useInfrastructureData();

  const serverIndex = useMemo(() => {
    const map = new Map();
    if (infra?.etablissements) {
      infra.etablissements.forEach(e => {
        Object.values(e.applications || {}).forEach(list => {
          list.forEach(s => map.set(s.VM.toLowerCase(), s));
        });
      });
    }
    return map;
  }, [infra]);

  if (!data || !infra) return <main id="content">Chargement…</main>;

  return (
    <main id="content">
      {data.etablissements.map(etab => (
        <div key={etab.nom} className="etab-block">
          <h2>{etab.nom}</h2>
          {etab.vlans.map(vlan => (
            <div key={vlan.id} className="domain">
              <h3>{`VLAN-${vlan.id}`}</h3>
              <p>{vlan.description}</p>
              <p><strong>Réseau :</strong> {vlan.network}</p>
              <p><strong>Passerelle :</strong> {vlan.gateway}</p>
              <div className="apps">
                {vlan.serveurs.map(s => {
                  const info = serverIndex.get(s.nom.toLowerCase());
                  return (
                    <details key={s.ip} className="server">
                      <summary>{s.nom} — {s.ip}</summary>
                      {info ? (
                        <table className="server-details">
                          <tbody>
                            {Object.entries(info)
                              .filter(([k]) => !['VM', 'trigramme'].includes(k))
                              .map(([k, v]) => (
                                <tr key={k}>
                                  <th className="server-key">{prettyLabel(k)}</th>
                                  <td className="server-val">{prettyValue(k, v)}</td>
                                </tr>
                              ))}
                          </tbody>
                        </table>
                      ) : (
                        <p style={{ fontSize: '0.9em', color: '#666' }}>Aucun détail infrastructure</p>
                      )}
                    </details>
                  );
                })}
              </div>
            </div>
          ))}
        </div>
      ))}
    </main>
  );
}
