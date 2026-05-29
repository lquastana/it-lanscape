<img src="public/it-landscape-logo-with-text.png" alt="it-landscape" width="280" />

[![CI](https://github.com/lquastana/it-landscape/actions/workflows/ci.yml/badge.svg)](https://github.com/lquastana/it-landscape/actions/workflows/ci.yml)
[![License: MIT](https://img.shields.io/badge/License-MIT-green.svg)](LICENSE)
[![Next.js](https://img.shields.io/badge/Next.js-15-black)](https://nextjs.org/)
[![Docker](https://img.shields.io/badge/Docker-ready-2496ED)](docker-compose.yml)
[![Zod](https://img.shields.io/badge/Zod-validated-3E67B1)](lib/schemas)

MVP Next.js pour cartographier un système d'information hospitalier : applications, processus métier, serveurs, VLANs, flux applicatifs et impacts d'incident.

![Vue métier de la cartographie SI](docs/assets/gifs/screen-metier.gif)

## Ce que fait le produit
- **Vue métier** : lecture par établissements, domaines, processus et applications.
- **Vue applicative** : applications regroupées par trigramme avec serveurs associés.
- **Vue réseau** : VLANs, réseaux, passerelles et serveurs par établissement.
- **Vue flux** : source, cible, protocole, type de message et EAI.
- **Simulation d'incident** : recherche des impacts directs et indirects d'un serveur, d'une application ou d'un flux indisponible.
- **Data Quality Center** : score qualité, anomalies prioritaires et export Markdown.
- **Gestion des établissements** : création et suppression d'établissements depuis l'UI, avec génération automatique des fichiers métier, infra, réseau et flux à partir de templates génériques, et seed Netbox optionnel à la création.
- **Administration** : édition des référentiels JSON, imports Excel, gestion des trigrammes et habilitations.
- **Sécurité MVP** : authentification NextAuth, rôles `viewer` / `editor` / `admin`, audit append-only JSONL, historique des écritures JSON et exports.

## Aperçu

<details>
<summary>Voir les captures animées</summary>

### Flux applicatifs

![Vue des flux applicatifs](docs/assets/gifs/screen-flux.gif)

### Infrastructure applicative

![Vue infrastructure](docs/assets/gifs/screen-infra.gif)

### Réseau

![Vue réseau](docs/assets/gifs/screen-network.gif)

### Data Quality Center

![Data Quality Center](docs/assets/gifs/screen-quality.gif)

### Simulation d'incident

![Simulation d'incident](docs/assets/gifs/screen-incident.gif)

</details>

## Données
- `data/*.json` : vue fonctionnelle.
- `data/*.infra.json` : inventaire serveurs (22 VMs par établissement avec OS, éditeur, trigramme, etc.).
- `data/*.network.json` : VLANs et réseaux (4 VLANs : ADMIN/SOINS/IMAGERIE/TECH).
- `data/*.flux.json` : flux applicatifs (25 flux HL7/DICOM/FHIR/API entre trigrammes).
- `data/trigrammes.json` : dictionnaire trigramme vers application.
- `data/auth/access-rules.json` : comptes de démonstration avec mots de passe hachés.
- `data/auth/auth-config.json` : règles de protection UI/API.
- `data/audit-log.jsonl` : journal local non versionné des actions auditées.
- `data/.history/history.jsonl` et `data/.history/snapshots/` : historique technique non versionné des écritures JSON.

### Templates de génération

À la création d'un établissement, les quatre fichiers sont générés automatiquement à partir des templates `lib/templates/` :

| Template | Contenu généré |
|---|---|
| `etablissement-sante.json` | Vue fonctionnelle : 13 domaines, processus et applications avec trigrammes |
| `infra-sante.json` | 22 serveurs locaux couvrant tous les trigrammes hébergés |
| `network-sante.json` | 4 VLANs (IDs 210–240), préfixes CIDR et passerelles |
| `flux-sante.json` | 25 flux reliant les trigrammes (HL7, DICOM, FHIR, API, SFTP…) |

Les placeholders `__NOM__`, `__PFX__`, `__PFX_UP__` et `__IP__` sont remplacés à la création. Le préfixe (`__PFX__`) est dérivé des initiales du nom de fichier (ex. `ch_corte` → `cco`) ; l'octet IP (`__IP__`) est calculé par hash du filename dans la plage `10.100–253.x.x`, garantissant l'absence de conflit avec les données démo (`10.10–30.x.x`).

## Démarrage rapide

En local, `npm run dev` crée automatiquement `.env.local` au premier lancement avec un `NEXTAUTH_SECRET` aléatoire.

```bash
npm install
npm run dev
```

Application : http://localhost:3000

Avec Docker :

```bash
cp .env.example .env
docker compose up -d --build
```

Avec NetBox intégré :

```bash
cp .env.example .env
# Dans .env, renseigner NETBOX_URL=http://netbox:8080 et la même valeur pour NETBOX_TOKEN et NETBOX_SUPERUSER_API_TOKEN.
docker compose --profile netbox up -d --build
node scripts/netbox-seed.js   # peuple les établissements démo
```

En preview HTTPS (Codespaces, port-forwarding TLS) ajouter dans `.env` :

```dotenv
NETBOX_COOKIE_SECURE=true
NETBOX_COOKIE_SAMESITE=None
# Conserver https://localhost:8080 dans NETBOX_CSRF_TRUSTED_ORIGINS
# (le proxy Codespaces réécrit l'Origin avec cette valeur)
```

Avec `make` :

```bash
make dev
make docker
make docker-netbox
make docker-netbox-run-build
make docker-stop
```

Raccourcis disponibles :
- `make dev` : démarrage local via `npm run dev`.
- `make docker` : stack Docker applicative seule, avec build si nécessaire, en mode attaché.
- `make docker-netbox` : alias de `make docker-netbox-run`.
- `make docker-netbox-run` : stack Docker avec profil NetBox, sans rebuild forcé, en mode attaché.
- `make docker-netbox-run-build` : stack Docker avec profil NetBox et rebuild forcé.
- `make docker-stop` : arrêt de la stack Docker, profil NetBox inclus.

Les cibles NetBox du `Makefile` configurent automatiquement l'application pour lire NetBox via `http://netbox:8080` avec le token de démonstration. Après démarrage, lancer `node scripts/netbox-seed.js` depuis l'hôte pour alimenter NetBox sur http://localhost:8080.

Voir la démo guidée : [docs/demo-5-minutes.md](docs/demo-5-minutes.md).

## Comptes de démonstration

Application web :

| Utilisateur | Mot de passe | Rôle |
|-------------|--------------|------|
| `viewer` | `password` | Lecture seule |
| `editor` | `password` | Lecture + écriture |
| `admin` | `password` | Administration complète |
| `valdellys` | `password` | Éditeur établissement |
| `dunes` | `password` | Éditeur établissement |
| `saintroch` | `password` | Éditeur établissement |

NetBox, si le profil Docker `netbox` est activé :

| Utilisateur | Mot de passe |
|-------------|--------------|
| `admin` | `password` |

> Warning production : ne jamais utiliser les comptes, mots de passe, tokens ou secrets par défaut en production.
> En preview HTTPS type Codespaces, définir `NETBOX_COOKIE_SECURE=true` et `NETBOX_COOKIE_SAMESITE=None` dans `.env` pour conserver la protection CSRF sans la désactiver.

## Secrets et environnements

Le modèle versionné est `.env.example`. Il sépare :
- les valeurs acceptables en développement local ;
- les secrets à remplacer en staging/production ;
- les variables optionnelles NetBox et Azure AD.

Bonnes pratiques :
- copier `.env.example` vers `.env` en local ;
- ne jamais commiter `.env`, `.env.local`, `.env.production` ou un token réel ;
- générer un `NEXTAUTH_SECRET` fort pour tout environnement partagé ;
- remplacer les comptes de démonstration dans `data/auth/access-rules.json` avant une mise en production ;
- activer Azure AD ou un fournisseur d'identité d'entreprise pour la production.

## RBAC et audit

Rôles :
- `viewer` : lecture seule ;
- `editor` : lecture + écriture sur les données ;
- `admin` : écriture, exports et gestion des habilitations.

Principales restrictions :

| Surface | Restriction |
|---------|-------------|
| `/` | Public |
| `/applications`, `/flux`, `/network`, `/incident`, `/quality` | `viewer+` |
| `/admin-metier`, `/admin-flux`, `/admin-trigramme`, `/admin-netbox-reconciliation` | `editor+` |
| `/admin-habilitations` | `admin` |
| `GET /api/export` | `admin` |
| `GET /api/files`, `GET /api/file/[name]`, `GET /api/flux`, `GET /api/infrastructure`, `GET /api/network`, `GET /api/quality` | `viewer+` |
| `POST /api/file/[name]`, `GET /api/netbox-reconciliation` | `editor+` |
| `POST /api/files` (création établissement) | `editor+` |
| `POST /api/netbox-seed` (seed site + VMs + VLANs) | `editor+` |
| `DELETE /api/file/[name]` (suppression établissement) | `admin` |
| `GET/POST /api/admin/roles` | `admin` |

Les écritures et exports alimentent `data/audit-log.jsonl`. Les écritures JSON passent aussi par `data/.history/history.jsonl` avec snapshot du contenu précédent.

## NetBox

Quand `NETBOX_URL` et `NETBOX_TOKEN` sont définis, les endpoints infrastructure et réseau peuvent lire NetBox comme source de vérité.

### Seed initial (données démo)

```bash
node scripts/netbox-seed.js
```

Peuple les trois établissements de démonstration : sites, VMs, IPs, interfaces, VLANs, préfixes et passerelles.

### Seed à la création d'un établissement (UI)

Depuis la page **Administration métier**, cocher **Seed Netbox** à la création d'un établissement déclenche `POST /api/netbox-seed` qui :

1. Crée ou retrouve le site Netbox.
2. Lit `{filename}.infra.json` → crée les VMs avec CPU/RAM/disque/OS/éditeur, tags trigramme et interfaces `eth0` avec IP primaire.
3. Lit `{filename}.network.json` → crée les VLANs, préfixes CIDR et passerelles (role `anycast`).

Le statut affiché dans l'UI résume le résultat : nombre de VMs et VLANs créés.

### Mapping du trigramme applicatif, par priorité
1. tag préfixé, par exemple `app:LAB` ;
2. tag court de trois caractères, par exemple `LAB` ;
3. custom field `trigramme`, `app_code` ou `application_code`.

### CSRF derrière un proxy HTTPS

Le script `config/netbox/patch-settings.sh` s'exécute au démarrage du conteneur et injecte à la fin de `settings.py` :
- `CSRF_COOKIE_SECURE`, `SESSION_COOKIE_SECURE`, `CSRF_COOKIE_SAMESITE`, `SESSION_COOKIE_SAMESITE` depuis les variables d'environnement.
- `CSRF_TRUSTED_ORIGINS` depuis `NETBOX_CSRF_TRUSTED_ORIGINS` (liste séparée par des espaces).
- `USE_X_FORWARDED_HOST = True` et `SECURE_PROXY_SSL_HEADER` pour la confiance au proxy TLS.

Le bloc est **toujours remplacé** au redémarrage, garantissant la prise en compte des changements de variables d'environnement sans reconstruction de l'image.

## Tests

```bash
npm test
npm run build
npm run lint
```

Les tests couvrent la cohérence JSON, la configuration d'accès, les schémas Zod, le Data Quality Center, les exports Markdown, NetBox et les helpers RBAC/audit. `npm run lint` peut afficher des avertissements Next.js existants sans bloquer la commande.

## Documentation
- [Positionnement produit](docs/product-positioning.md)
- [Démo en 5 minutes](docs/demo-5-minutes.md)
- [Architecture](docs/architecture.md)
- [Simulation d'incident](docs/incident-simulation.md)
- [Sécurité](docs/security.md)
- [Roadmap](docs/roadmap.md)
- [ADR stockage JSON](docs/adr/0001-data-storage-json.md)
- [ADR JSON renforcé et historisation](docs/adr/0002-json-renforce-historisation.md)

## Licence

MIT. Voir [LICENSE](LICENSE).
