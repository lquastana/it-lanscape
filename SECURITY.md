# Politique de sécurité

## Versions supportées

`it-landscape` est encore en phase alpha. Seule la branche `main` et la dernière release publiée reçoivent les correctifs de sécurité.

| Version | Support |
|---------|---------|
| `v0.1.x-alpha` | Correctifs critiques uniquement |
| `< v0.1.0-alpha` | Non supporté |

## Signaler une vulnérabilité

Ne signalez pas une vulnérabilité via une issue publique.

Utilisez en priorité les GitHub Security Advisories du dépôt. Si ce canal n'est pas disponible, contactez le mainteneur du dépôt GitHub de manière privée avec :

- une description claire du problème ;
- les étapes minimales de reproduction ;
- l'impact estimé ;
- la version, le commit ou l'environnement concerné ;
- tout contournement connu.

Nous accusons réception dès que possible et priorisons les failles touchant l'authentification, les rôles, les exports, les secrets, les données de santé ou la chaîne de déploiement.

## Périmètre sensible

Les zones suivantes demandent une attention particulière :

- `lib/authOptions.js`, `middleware.js`, `lib/authz.js` et `lib/accessControl.js` ;
- les endpoints sous `pages/api/admin/`, `pages/api/file/` et `pages/api/export.js` ;
- `scripts/startup-security-check.mjs` ;
- les fichiers `data/auth/*.json` ;
- les intégrations NetBox et les variables d'environnement.

## Secrets et données

Ne commitez jamais :

- fichiers `.env`, `.env.local`, `.env.production` ;
- tokens NetBox, secrets NextAuth, secrets Azure AD / Entra ID ;
- exports contenant des données réelles ;
- informations patient, agent ou établissement non autorisées.

Pour le durcissement de déploiement, consultez aussi [docs/security.md](docs/security.md).
