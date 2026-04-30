# Securite

Cette page decrit les exigences minimales de securite pour deployer
`it-landscape` dans un environnement partage, de staging ou de production.

## Deploiement HTTPS

- Deployer l'application derriere un reverse proxy terminant TLS, par exemple
  Nginx, Traefik, Apache, Caddy ou un ingress Kubernetes.
- Exposer uniquement le reverse proxy sur Internet ou sur le reseau interne
  cible. Le serveur Next.js ne doit pas etre directement expose.
- Configurer `NEXTAUTH_URL` avec l'URL publique HTTPS exacte, par exemple
  `https://it-landscape.example.org`.
- Rediriger tout trafic HTTP vers HTTPS.
- Activer HSTS sur le reverse proxy lorsque le domaine est dedie a l'usage
  HTTPS.
- Transmettre les en-tetes proxy usuels vers l'application :
  `X-Forwarded-Proto`, `X-Forwarded-Host`, `X-Forwarded-For`.
- Limiter les uploads, imports et exports par taille au niveau proxy si
  l'application est exposee hors reseau d'administration.

## Variables obligatoires

Les variables suivantes doivent etre definies explicitement pour tout
environnement partage :

| Variable | Obligatoire | Usage |
|----------|-------------|-------|
| `NEXTAUTH_URL` | Oui | URL publique de l'application. Doit etre en HTTPS hors developpement local. |
| `NEXTAUTH_SECRET` | Oui | Secret de signature des sessions JWT. Minimum 32 caracteres aleatoires. |
| `AUTH_ENABLED` | Oui | Doit rester a `true` en staging et production. |
| `AZURE_AD_CLIENT_ID` | Production recommandee | Client ID Azure AD / Entra ID pour le SSO. |
| `AZURE_AD_CLIENT_SECRET` | Production recommandee | Secret applicatif Azure AD / Entra ID. |
| `AZURE_AD_TENANT_ID` | Production recommandee | Tenant Azure AD / Entra ID autorise. |
| `NETBOX_URL` | Si NetBox est active | URL de l'instance NetBox source de verite. |
| `NETBOX_TOKEN` | Si NetBox est active | Token API NetBox a privileges limites. |
| `NETBOX_SECRET_KEY` | Si NetBox local est deploye | Secret Django NetBox unique et fort. |
| `NETBOX_SUPERUSER_PASSWORD` | Si NetBox local est deploye | Mot de passe admin NetBox non trivial. |
| `NEXT_PUBLIC_ORG_NAME` | Selon besoin | Nom affiche de l'organisation. Pas un secret. |
| `NEXT_PUBLIC_APP_TITLE` | Selon besoin | Titre affiche de l'application. Pas un secret. |
| `NEXT_PUBLIC_LOGO_URL` | Selon besoin | Logo affiche. Pas un secret. |

Les variables prefixees `NEXT_PUBLIC_` sont visibles cote navigateur. Ne jamais
y placer de secret, token, mot de passe ou identifiant confidentiel.

## Secrets interdits par defaut

Les valeurs de demonstration et valeurs par defaut sont interdites hors poste
local :

- `NEXTAUTH_SECRET=change_me_at_least_32_chars` ou toute valeur exemple ;
- `NETBOX_SECRET_KEY=change-me-in-prod` ou toute valeur exemple ;
- `NETBOX_SUPERUSER_PASSWORD=password` ;
- comptes de demonstration `viewer`, `editor`, `admin`, `valdellys`, `dunes`,
  `saintroch` avec le mot de passe `password` ;
- tokens NetBox ou secrets Azure AD stockes dans le depot ;
- fichiers `.env`, `.env.local`, `.env.production` ou sauvegardes de secrets
  versionnes.

Avant toute mise en production, remplacer les comptes de demonstration dans
`data/auth/access-rules.json` ou desactiver le provider Credentials au profit du
SSO d'entreprise.

## Rotation des secrets

- Stocker les secrets dans un gestionnaire externe lorsque c'est possible :
  coffre Kubernetes, secret manager cloud, Vault ou solution equivalente.
- Rotation immediate requise en cas de fuite, depart d'administrateur,
  exposition accidentelle dans des logs, depot Git ou outil de ticketing.
- Rotation periodique recommandee :
  - `NEXTAUTH_SECRET` : au moins annuelle ou selon la politique SSI ;
  - `AZURE_AD_CLIENT_SECRET` : avant expiration et au moins annuelle ;
  - `NETBOX_TOKEN` : au moins semestrielle ou apres changement d'equipe ;
  - mots de passe administrateurs : selon la politique interne.
- Apres rotation de `NEXTAUTH_SECRET`, considerer toutes les sessions existantes
  comme invalides et informer les utilisateurs qu'une reconnexion est attendue.
- Documenter chaque rotation : date, secret concerne, responsable, validation du
  redeploiement et verification de connexion.

## Configuration SSO

Le SSO de production recommande est Azure AD / Microsoft Entra ID via NextAuth.

Configuration minimale :

1. Declarer une application dans Azure AD / Entra ID.
2. Configurer l'URI de redirection :
   `https://<domaine>/api/auth/callback/azure-ad`.
3. Renseigner `AZURE_AD_CLIENT_ID`, `AZURE_AD_CLIENT_SECRET` et
   `AZURE_AD_TENANT_ID` dans l'environnement d'execution.
4. Verifier que `NEXTAUTH_URL` correspond exactement au domaine HTTPS public.
5. Restreindre l'application Azure AD aux groupes ou utilisateurs autorises.
6. Associer les utilisateurs SSO aux roles applicatifs attendus.

En production, le provider Credentials local doit etre reserve a un mode de
secours controle ou retire si le SSO couvre tous les besoins.

## Sauvegarde et restauration

Donnees a sauvegarder :

- `data/*.json`, `data/*.infra.json`, `data/*.network.json`,
  `data/*.flux.json` ;
- `data/trigrammes.json` ;
- `data/auth/access-rules.json` et `data/auth/auth-config.json` ;
- `data/audit-log.jsonl` ;
- `data/.history/history.jsonl` et `data/.history/snapshots/` ;
- configuration d'environnement hors secrets, et references des secrets dans le
  gestionnaire dedie ;
- donnees NetBox si le profil NetBox est utilise comme source de verite.

Exigences minimales :

- effectuer une sauvegarde avant tout import massif, migration ou changement de
  modele ;
- conserver des sauvegardes chiffrees, hors conteneur applicatif ;
- tester la restauration sur un environnement isole ;
- definir un RPO et un RTO avec le metier ;
- restaurer les permissions de fichiers et verifier que l'application ne peut
  ecrire que dans les emplacements attendus.

Procedure de restauration minimale :

1. Arreter l'application ou basculer en maintenance.
2. Restaurer les fichiers `data/` depuis la sauvegarde validee.
3. Restaurer la configuration d'environnement et les references de secrets.
4. Redemarrer l'application.
5. Verifier la connexion, les roles, les vues principales, les imports et
   l'ecriture d'une ligne d'audit.

## Logs et audit

- Les actions sensibles doivent alimenter `data/audit-log.jsonl` :
  ecritures, exports et changements d'habilitations.
- Le journal d'audit doit etre append-only dans l'usage courant.
- Les logs applicatifs et proxy doivent etre centralises dans l'outil
  d'observabilite de l'organisation lorsque disponible.
- Les logs ne doivent jamais contenir de mots de passe, tokens NetBox, secrets
  Azure AD, `NEXTAUTH_SECRET` ou donnees personnelles non necessaires.
- Surveiller au minimum :
  - echecs de connexion repetes ;
  - acces refuses ;
  - exports ;
  - changements de roles ;
  - erreurs d'import ;
  - erreurs API 5xx.
- Definir une duree de retention conforme aux obligations internes et aux
  exigences reglementaires applicables.

## Durcissement Docker

- Utiliser une image Node.js LTS maintenue, actuellement `node:22-alpine`.
- Construire l'image depuis une base maintenue et appliquer les mises a jour de
  securite regulierement.
- Executer le conteneur avec un utilisateur non-root (`node`).
- Ne pas inclure `.env`, sauvegardes, fichiers de test sensibles ou secrets dans
  l'image ni dans le contexte de build Docker.
- Monter les secrets via l'orchestrateur, jamais en dur dans le Dockerfile.
- Declarer explicitement `NODE_ENV=production` au runtime.
- Definir `NEXTAUTH_SECRET`, `NEXTAUTH_URL` et `AUTH_ENABLED` sans fallback
  sensible dans `docker-compose.yml` ou l'orchestrateur.
- Activer un `HEALTHCHECK` HTTP sur `/api/health`.
- Monter les donnees persistantes avec les droits minimaux necessaires.
- Limiter les capabilities Linux, activer `no-new-privileges` et un filesystem
  root en lecture seule lorsque compatible avec le mode d'exploitation.
- Publier uniquement le port interne requis vers le reverse proxy.
- Scanner l'image et les dependances avant publication.
- Redemarrer explicitement apres rotation de secrets pour garantir leur prise en
  compte.

## Matrice des roles

| Surface / action | Public | `viewer` | `editor` | `admin` |
|------------------|--------|----------|----------|---------|
| Vue metier `/` | Oui | Oui | Oui | Oui |
| Vues applications, flux, reseau, incident | Non | Oui | Oui | Oui |
| Lecture API protegee | Non | Oui | Oui | Oui |
| Imports et editions admin | Non | Non | Oui | Oui |
| Ecriture des referentiels JSON | Non | Non | Oui | Oui |
| Gestion des habilitations | Non | Non | Non | Oui |
| Exports snapshot | Non | Non | Non | Oui |
| Consultation des logs applicatifs centralises | Non | Non | Selon politique | Selon politique |
| Rotation de secrets et configuration SSO | Non | Non | Non | Administrateur plateforme |

Principe directeur : attribuer le role minimal necessaire. Les comptes
`admin` doivent etre nominatifs, limites en nombre et revus periodiquement.
