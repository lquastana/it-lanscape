# Contribuer

Merci de votre intérêt pour `it-landscape`. Le projet est un MVP Next.js pour cartographier un système d'information hospitalier : applications, processus, flux, réseau, infrastructure et impacts d'incident.

## Démarrage local

```bash
npm install
npm run dev
```

Application locale : http://localhost:3000

Avec Docker :

```bash
make docker
```

Avec NetBox local :

```bash
make docker-netbox-run-build
node scripts/netbox-seed.js
```

## Avant de proposer une modification

1. Ouvrir ou choisir une issue, idéalement labellisée `good first issue` ou `help wanted`.
2. Créer une branche courte et descriptive, par exemple `docs/netbox-mapping` ou `fix/login-redirect`.
3. Garder les changements ciblés : une PR doit résoudre un sujet clair.
4. Ne pas commiter de secrets, `.env`, exports contenant des données réelles, ou sauvegardes locales.

## Commandes de vérification

```bash
npm test
npm run build
```

Selon le changement, lancez aussi :

```bash
npm run lint
npm audit --audit-level=high
```

## Données de démonstration

Les fichiers `data/*.json`, `data/*.infra.json`, `data/*.network.json` et `data/*.flux.json` sont des données de démonstration. Toute contribution sur ces fichiers doit rester fictive et ne jamais contenir d'information patient, agent, établissement réel non autorisé, secret ou token.

Les schémas Zod dans `lib/schemas/` valident les référentiels JSON. Si vous ajoutez un nouveau format de données, ajoutez ou mettez à jour le schéma correspondant.

## Style de code

- Suivre les patterns existants du repo avant d'ajouter une abstraction.
- Préférer des composants et helpers simples.
- Garder les textes UI en français tant que l'i18n n'est pas en place.
- Pour les vues frontend, vérifier les principaux breakpoints desktop/mobile.

## Pull requests

Une bonne PR contient :

- un résumé court du changement ;
- les commandes exécutées (`npm test`, `npm run build`, etc.) ;
- des captures ou GIFs pour les changements UI ;
- les limites connues, si la PR reste volontairement partielle.

## Issues utiles pour démarrer

Les issues `good first issue` sont pensées pour être abordables sans connaître toute l'architecture. Elles portent souvent sur la documentation, les tests, l'accessibilité, l'i18n ou de petites améliorations UI.
