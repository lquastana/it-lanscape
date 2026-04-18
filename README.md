# 🗺️ it-landscape

Tableau de bord Next.js pour visualiser la cartographie applicative et technique des hôpitaux publics de Corse. L’interface est construite avec **Next.js 15** et **React 18**, et s’appuie sur des fichiers JSON pour représenter les domaines, processus, applications et infrastructures.

## Fonctionnalités principales
- **Vue métier** : navigation par domaines et processus, filtres multi-critères, recherche clavier (/), légende des interfaces et panneau de synthèse (alignement, mutualisation, complétude…).
- **Vue applicative** : regroupement des applications par trigramme, affichage des serveurs logiques associés et mode « vue paysage » imprimable.
- **Vue réseau** : exploration des VLANs et des serveurs, filtrage par identifiant, description, réseau ou IP.
- **Vue flux** : visualisation des flux applicatifs (source/cible, protocole, type de message, EAI, criticité).
- **Simulation d'incident** : évaluation des impacts applicatifs/infra/flux, scénarios sauvegardés et export PDF.
- **Administration des données** :
  - `/admin-metier` pour éditer les domaines, processus et applications d’un fichier JSON.
  - `/admin-infra` pour mapper une extraction Excel vers les fichiers `*.infra.json` (mode remplacement ou incrémental, vérification des trigrammes).
  - `/admin-flux` pour importer et harmoniser les flux applicatifs.
  - `/admin-habilitations` pour gérer les rôles, mots de passe et comptes autorisés.
- **Contrôles d’accès** : authentification via **NextAuth.js** (Credentials en dev, Azure AD en prod), complétée par un **RBAC** (viewer/editor/admin) et un **audit append-only** JSONL. La page `/login` permet d’ouvrir une session avant d’accéder aux pages protégées.

## Structure des données
- `data/*.json` : vue fonctionnelle (`etablissements → domaines → processus → applications`).
- `data/*.infra.json` : inventaire des serveurs (`serveurs[]`) reliés aux applications par le champ `trigramme`.
- `data/*.network.json` : informations réseau par établissement (`vlans[]`).
- `data/*.flux.json` : flux applicatifs par établissement (`flux[]`).
- `data/trigrammes.json` : dictionnaire trigramme → application (utilisé pour les imports infra et les scripts).
- `data/auth/access-rules.json` : comptes utilisateurs (mots de passe hachés `bcrypt`) + rôle (`viewer`, `editor`, `admin`).
- `data/auth/auth-config.json` : liste des pages et routes API protégées par session.
- `data/audit-log.jsonl` : journal append-only des modifications (écritures via API) et exports.

## Prérequis
- Node.js 18 ou version supérieure.

## Installation
```bash
npm install
```

## Lancement
Développement :
```bash
npm run dev
```

Production locale :
```bash
npm run build
npm start
```
L’application est accessible sur http://localhost:3000.

## Tests
```bash
npm test
```
Les tests vérifient la cohérence des fichiers JSON, la configuration des contrôles d’accès et le RBAC/audit sans base de données.

## Export snapshot
Un export zip est disponible via `GET /api/export` : il contient les fichiers JSON dans `data/` et un fichier `snapshot.xlsx` multi-onglets avec des feuilles exploitables (applications, flux, infra, réseau, trigrammes).

## RBAC & audit
Rôles disponibles :
- **viewer** : lecture seule.
- **editor** : lecture + écriture.
- **admin** : toutes actions + gestion des rôles.

Endpoints protégés par RBAC :
- `GET /api/flux`, `GET /api/infrastructure`, `GET /api/network`, `GET /api/files` → `read`.
- `GET /api/export` → `admin` + audit `action="export"`.
- `POST /api/file/[name]` → `write` + audit complet.

Accès pages :
- Vue métier (`/`) : pas de restriction de groupe (auth standard si activée).
- Vue applicative (`/applications`), flux (`/flux`), réseau (`/network`), incident (`/incident`) : rôle **viewer** minimum.
- Administration (`/admin-*`) : rôle **editor** minimum (sauf `/admin-habilitations` en **admin**).

## Accès UI & API (IP + login)
Les pages protégées s’appuient sur la session (`/login`) et le middleware `iron-session`. Les APIs sensibles utilisent `withAuthz` qui accepte **session** ou **Basic Auth depuis une IP autorisée**. En pratique : 
- **Pages** : session obligatoire (login) pour les routes listées dans `data/auth/auth-config.json` et rôle minimal selon la vue. 
- **APIs protégées** : session **ou** Basic Auth **ET** IP allowlist (`data/auth/access-rules.json`).

### Résumé des endpoints et restrictions
| Type | Endpoint | Description | Restriction |
| --- | --- | --- | --- |
| UI | `/` | Vue métier | Public (pas de rôle) |
| UI | `/applications` | Vue applicative | viewer+ |
| UI | `/flux` | Vue flux | viewer+ |
| UI | `/network` | Vue réseau | viewer+ |
| UI | `/incident` | Simulation incident | viewer+ |
| UI | `/admin-*` | Écrans d’administration | editor+ |
| UI | `/admin-habilitations` | Gestion des comptes & rôles | admin+ |
| API | `GET /api/flux` | Flux (lecture) | viewer+ |
| API | `GET /api/infrastructure` | Infrastructure (lecture) | viewer+ |
| API | `GET /api/network` | Réseau (lecture) | viewer+ |
| API | `GET /api/files` | Liste des fichiers | viewer+ |
| API | `GET /api/export` | Export ZIP + audit | admin+ |
| API | `POST /api/file/[name]` | Écriture JSON + audit | editor+ |
| API | `GET/POST /api/admin/roles` | Gestion des habilitations | admin+ |

Le journal `data/audit-log.jsonl` est append-only et contient notamment :
- `ts` (timestamp ISO)
- `action` (`write` ou `export`)
- `target`
- `actor.user`, `actor.role`
- `via` (`session` ou `basic`)
- `clientIp`
- `beforeHash`, `afterHash`
- `before` / `after` (snapshots tronqués)

## Documentation
- [Simulation d'incident](docs/incident-simulation.md)
- [Architecture](docs/architecture.md)
- [Roadmap](docs/roadmap.md)
- [ADR](docs/adr/0001-data-storage-json.md)

## CI
Une pipeline CI minimale est disponible via GitHub Actions (`.github/workflows/ci.yml`).

## Licence
Ce projet est distribué sous licence MIT. Voir le fichier [LICENSE](LICENSE).

## Scripts utilitaires
- `npm run check:trigrammes` : contrôle les trigrammes et génère `data/rapport-trigrammes.csv`.
- `npm run check:infra-missing-trigramme` : liste les serveurs sans trigramme et propose une application probable.
- `node generate_hash.js <motdepasse>` : génère un hachage `bcrypt` pour `data/auth/access-rules.json`.

## Configuration
Variables d’environnement utiles :
- `SESSION_SECRET` : secret pour la session `iron-session`.
- `DISABLE_AUTH=true` : désactive l’authentification (développement uniquement).
- `ACCESS_CONTROL_ENABLED=false` : contourne le filtrage IP/Basic Auth défini dans `access-rules.json`.
- `DATA_DIR=/chemin/vers/data` : redirige le dossier contenant les JSON (utile pour les tests).

Compte dev principal :

| Utilisateur | Mot de passe | Rôle  |
|-------------|--------------|-------|
| `admin`     | `password`   | admin |

Autres comptes de test : `viewer/password` (viewer), `editor/password` (editor), `valdellys/password`, `dunes/password`, `saintroch/password` (editor).

Les règles d’accès et les données sont chargées depuis le dossier `data`; adaptez-les avant un déploiement.
