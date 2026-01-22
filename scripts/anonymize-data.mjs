import fs from 'fs';

function anonymizeNetwork(filePath) {
  const data = JSON.parse(fs.readFileSync(filePath, 'utf-8'));
  let ipCounter = 1;
  data.vlans.forEach((vlan, vlanIdx) => {
    vlan.nom = `VLAN-${vlanIdx + 1}`;
    vlan.description = `Anonymized VLAN ${vlanIdx + 1}`;
    vlan.network = '192.0.2.0/24';
    vlan.gateway = '192.0.2.254';
    vlan.serveurs.forEach((srv, srvIdx) => {
      srv.ip = `192.0.2.${ipCounter++}`;
      srv.nom = `server-${srvIdx + 1}`;
    });
  });
  fs.writeFileSync(filePath, JSON.stringify(data, null, 2));
}

function anonymizeInfra(filePath) {
  const data = JSON.parse(fs.readFileSync(filePath, 'utf-8'));
  let ipCounter = 1;
  data.serveurs.forEach((srv, idx) => {
    srv.VM = `vm-${idx + 1}`;
    if (srv.PrimaryIPAddress && srv.PrimaryIPAddress !== '') {
      srv.PrimaryIPAddress = `198.51.100.${ipCounter++}`;
    }
  });
  fs.writeFileSync(filePath, JSON.stringify(data, null, 2));
}

const networkFiles = [
  'data/ch_val_de_lys.network.json',
  'data/clinique_des_dunes.network.json',
  'data/hopital_saint_roch.network.json',
];
const infraFiles = [
  'data/ch_val_de_lys.infra.json',
  'data/clinique_des_dunes.infra.json',
  'data/hopital_saint_roch.infra.json',
];

networkFiles.forEach(anonymizeNetwork);
infraFiles.forEach(anonymizeInfra);
