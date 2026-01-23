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
- **Contrôles d’accès** : middleware `iron-session` + règles IP et Basic Auth définies dans `data/auth`. La page `/login` permet d’ouvrir une session utilisateur avant d’accéder aux pages protégées (`/applications`, `/network`) et aux APIs sensibles.

## Structure des données
- `data/*.json` : vue fonctionnelle (`etablissements → domaines → processus → applications`).
- `data/*.infra.json` : inventaire des serveurs (`serveurs[]`) reliés aux applications par le champ `trigramme`.
- `data/*.network.json` : informations réseau par établissement (`vlans[]`).
- `data/*.flux.json` : flux applicatifs par établissement (`flux[]`).
- `data/trigrammes.json` : dictionnaire trigramme → application (utilisé pour les imports infra et les scripts).
- `data/auth/access-rules.json` : IP autorisées, comptes Basic Auth (mots de passe hachés `bcrypt`).
- `data/auth/auth-config.json` : liste des pages et routes API protégées par session.
- `data/audit-log.jsonl` : journal append-only des modifications (écritures via API).

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
Les tests vérifient la cohérence des fichiers JSON et la configuration des contrôles d’accès.

## Export snapshot
Un export zip est disponible via `GET /api/export` : il contient les fichiers JSON dans `data/` et un fichier `snapshot.xlsx` multi-onglets avec des feuilles exploitables (applications, flux, infra, réseau, trigrammes).

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

Identifiants de test (données fictives) :
- `valdellys` / `password`
- `dunes` / `password`
- `saintroch` / `password`

Les règles d’accès et les données sont chargées depuis le dossier `data`; adaptez-les avant un déploiement.
