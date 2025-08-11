import { useMemo } from 'react';
import useInfrastructureData from '../hooks/useInfrastructureData';
import { prettyLabel, prettyValue } from '../lib/utils';

export default function NetworkView({ data, search = '' }) {
  const { data: infra } = useInfrastructureData();

  const serverIndex = useMemo(() => {
    const map = new Map();
    if (infra?.etablissements) {
      infra.etablissements.forEach(e => {
        (e.serveurs || []).forEach(s => {
          if (s.VM) map.set(s.VM.toLowerCase(), s);
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
            <details key={vlan.id} className="domain" open>
              <summary>{`VLAN-${vlan.id}`}</summary>
              <p>{vlan.description}</p>
              <p><strong>Réseau :</strong> {vlan.network}</p>
              <p><strong>Passerelle :</strong> {vlan.gateway}</p>
              <ul className="server-list">
                {vlan.serveurs.map(s => {
                  const info = serverIndex.get(s.nom.toLowerCase());
                  return (
                    <li key={s.ip}>
                      <details className="server">
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
                    </li>
                  );
                })}
              </ul>
            </details>
          ))}
        </div>
      ))}
    </main>
  );
}
