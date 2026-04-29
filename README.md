# 🗺️ it-landscape

Tableau de bord Next.js pour visualiser la cartographie applicative et technique des hôpitaux publics de Corse. L'interface est construite avec **Next.js 15** et **React 18**, et s'appuie sur des fichiers JSON ou sur **NetBox** (source de vérité) pour représenter les domaines, processus, applications et infrastructures.

## Fonctionnalités principales
- **Vue métier** : navigation par domaines et processus, filtres multi-critères, recherche clavier (/), légende des interfaces et panneau de synthèse (alignement, mutualisation, complétude…).
- **Vue applicative** : regroupement des applications par trigramme, affichage des serveurs logiques associés (CPU, RAM, disque, OS, backup…) et mode « vue paysage » imprimable.
- **Vue réseau** : exploration des VLANs (id, réseau, passerelle, serveurs associés), filtrage par identifiant, description, réseau ou IP.
- **Vue flux** : visualisation des flux applicatifs (source/cible, protocole, type de message, EAI, criticité).
- **Simulation d'incident** : évaluation des impacts applicatifs/infra/flux, scénarios sauvegardés et export PDF.
- **Administration des données** :
  - `/admin-metier` pour éditer les domaines, processus et applications d'un fichier JSON.
  - `/admin-infra` pour mapper une extraction Excel vers les fichiers `*.infra.json` (mode remplacement ou incrémental, vérification des trigrammes).
  - `/admin-flux` pour importer et harmoniser les flux applicatifs.
  - `/admin-habilitations` pour gérer les rôles, mots de passe et comptes autorisés.
- **Contrôles d'accès** : authentification via **NextAuth.js** (Credentials en dev, Azure AD en prod), complétée par un **RBAC** (viewer/editor/admin) et un **audit append-only** JSONL.

## Structure des données
- `data/*.json` : vue fonctionnelle (`etablissements → domaines → processus → applications`).
- `data/*.infra.json` : inventaire des serveurs (`serveurs[]`) reliés aux applications par le champ `trigramme`.
- `data/*.network.json` : informations réseau par établissement (`vlans[]`).
- `data/*.flux.json` : flux applicatifs par établissement (`flux[]`).
- `data/trigrammes.json` : dictionnaire trigramme → application.
- `data/auth/access-rules.json` : comptes utilisateurs (mots de passe hachés `bcrypt`) + rôle.
- `data/auth/auth-config.json` : liste des pages et routes API protégées par session.
- `data/audit-log.jsonl` : journal append-only des modifications et exports.

## Prérequis
- Node.js 18 ou version supérieure.
- Docker + Docker Compose (pour le mode conteneurisé).

## Installation
```bash
npm install
```

## Lancement

### Développement local
```bash
npm run dev
```
L'application est accessible sur http://localhost:3000.

### Production locale (sans Docker)
```bash
npm run build
npm start
```

### Docker Compose — application seule
```bash
docker compose up -d --build
```

### Docker Compose — application + NetBox intégré
```bash
docker compose --profile netbox up -d --build
```

| Service  | URL                    |
|----------|------------------------|
| Web app  | http://localhost:3000  |
| NetBox   | http://localhost:8080  |

Au premier démarrage, NetBox applique ses migrations Django (~1-2 min). L'application web démarre en parallèle et se connecte à NetBox dès qu'il est prêt.

#### Accès GitHub Codespaces / reverse proxy
Si l'accès se fait via un proxy (Codespaces, ngrok…), ajoutez l'URL publique dans un fichier `.env` à la racine :

```env
NETBOX_CSRF_TRUSTED_ORIGINS=https://your-codespace-8080.app.github.dev
NEXTAUTH_URL=https://your-codespace-3000.app.github.dev
```

#### Diagnostic
```bash
docker compose --profile netbox ps
docker compose --profile netbox logs -f netbox
```

Si NetBox boucle sur `Waiting on DB...`, forcez un redémarrage propre :
```bash
docker compose --profile netbox down -v
docker compose --profile netbox up -d
```

## Peupler NetBox depuis les JSON locaux

Un script importe automatiquement les données des fichiers JSON vers NetBox (sites, VMs, IPs, VLANs, préfixes, passerelles) :

```bash
node scripts/netbox-seed.js
```

Le script est idempotent : il ne crée que les objets manquants. Il peut être relancé sans risque après un `down -v`.

Objets créés par établissement :

| Objet      | Détail                                              |
|------------|-----------------------------------------------------|
| Site       | 1 par établissement                                 |
| VMs        | Avec CPU, RAM, disque, OS, backup, éditeur, contact |
| Tags       | `app:XXX` par trigramme applicatif                  |
| IPs        | 1 par VM, assignée à l'interface `eth0`             |
| VLANs      | Avec identifiant, nom et description                |
| Préfixes   | Liés aux VLANs                                      |
| Passerelles| IP anycast par VLAN                                 |

## Tests
```bash
npm test
```
Les tests vérifient la cohérence des fichiers JSON, la configuration des contrôles d'accès et le RBAC/audit sans base de données.

## Export snapshot
Un export zip est disponible via `GET /api/export` : il contient les fichiers JSON dans `data/` et un fichier `snapshot.xlsx` multi-onglets.

## RBAC & audit
Rôles disponibles :
- **viewer** : lecture seule.
- **editor** : lecture + écriture.
- **admin** : toutes actions + gestion des rôles.

| Type | Endpoint | Description | Restriction |
|------|----------|-------------|-------------|
| UI | `/` | Vue métier | Public |
| UI | `/applications` | Vue applicative | viewer+ |
| UI | `/flux` | Vue flux | viewer+ |
| UI | `/network` | Vue réseau | viewer+ |
| UI | `/incident` | Simulation incident | viewer+ |
| UI | `/admin-*` | Écrans d'administration | editor+ |
| UI | `/admin-habilitations` | Gestion des comptes & rôles | admin+ |
| API | `GET /api/flux` | Flux (lecture) | viewer+ |
| API | `GET /api/infrastructure` | Infrastructure (lecture) | viewer+ |
| API | `GET /api/network` | Réseau (lecture) | viewer+ |
| API | `GET /api/files` | Liste des fichiers | viewer+ |
| API | `GET /api/export` | Export ZIP + audit | admin+ |
| API | `POST /api/file/[name]` | Écriture JSON + audit | editor+ |
| API | `GET/POST /api/admin/roles` | Gestion des habilitations | admin+ |

## Configuration

Variables d'environnement :

| Variable | Description | Défaut |
|----------|-------------|--------|
| `NEXTAUTH_SECRET` | Secret JWT NextAuth (obligatoire en prod) | généré |
| `NEXTAUTH_URL` | URL publique de l'application | `http://localhost:3000` |
| `NETBOX_URL` | URL racine de NetBox | `http://netbox:8080` |
| `NETBOX_TOKEN` | Token API NetBox | token par défaut |
| `NETBOX_TRIGRAMME_TAG_PREFIX` | Préfixe de tag trigramme | `app:` |
| `NETBOX_SECRET_KEY` | Clé secrète NetBox (≥ 50 caractères) | générée |
| `NETBOX_CSRF_TRUSTED_ORIGINS` | Origines CSRF autorisées pour NetBox (séparées par des espaces) | localhost |
| `NETBOX_SUPERUSER_NAME` | Login admin NetBox | `admin` |
| `NETBOX_SUPERUSER_PASSWORD` | Mot de passe admin NetBox | `password` |
| `AUTH_ENABLED=false` | Désactive l'authentification (dev uniquement) | — |
| `AZURE_AD_CLIENT_ID/SECRET/TENANT_ID` | SSO Azure AD (production) | — |

### Comptes par défaut

**Application web** (`http://localhost:3000`) :

| Utilisateur | Mot de passe | Rôle   |
|-------------|--------------|--------|
| `admin`     | `password`   | admin  |
| `editor`    | `password`   | editor |
| `viewer`    | `password`   | viewer |
| `valdellys` | `password`   | editor |
| `dunes`     | `password`   | editor |
| `saintroch` | `password`   | editor |

**NetBox** (`http://localhost:8080`) :

| Utilisateur | Mot de passe |
|-------------|--------------|
| `admin`     | `password`   |

> Si le volume Postgres existe déjà avec un ancien mot de passe, réinitialisez-le via :
> ```bash
> docker exec it-lanscape-netbox-1 /opt/netbox/venv/bin/python /opt/netbox/netbox/manage.py shell -c \
>   "from django.contrib.auth import get_user_model; u=get_user_model().objects.get(username='admin'); u.set_password('password'); u.save()"
> ```

## Synchronisation NetBox

Quand `NETBOX_URL` et `NETBOX_TOKEN` sont définis, les endpoints `GET /api/infrastructure` et `GET /api/network` lisent NetBox via API et n'utilisent plus les JSON locaux.

Mapping du trigramme applicatif (par ordre de priorité) :
1. **Tag préfixé** sur VM/Device : `app:LAB` (configurable via `NETBOX_TRIGRAMME_TAG_PREFIX`)
2. **Tag court** : tag de 3 caractères `LAB`
3. **Custom field** : `trigramme`, `app_code` ou `application_code`

Données remontées depuis NetBox :
- **Infrastructure** : sites → établissements, VMs/devices → serveurs (CPU, RAM, disque, OS, backup depuis `comments`)
- **Réseau** : sites → établissements, VLANs → vlans (avec préfixes et passerelles anycast)

## Scripts utilitaires
- `npm run check:trigrammes` : contrôle les trigrammes et génère `data/rapport-trigrammes.csv`.
- `npm run check:infra-missing-trigramme` : liste les serveurs sans trigramme.
- `node generate_hash.js <motdepasse>` : génère un hash `bcrypt` pour `data/auth/access-rules.json`.
- `node scripts/netbox-seed.js` : peuple NetBox depuis les fichiers JSON locaux.

## Documentation
- [Simulation d'incident](docs/incident-simulation.md)
- [Architecture](docs/architecture.md)
- [Roadmap](docs/roadmap.md)
- [ADR](docs/adr/0001-data-storage-json.md)

## CI
Pipeline CI via GitHub Actions (`.github/workflows/ci.yml`).

## Licence
Ce projet est distribué sous licence MIT. Voir le fichier [LICENSE](LICENSE).
