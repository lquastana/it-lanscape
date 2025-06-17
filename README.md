# it-landscape

Ce projet contient un exemple minimal de cartographie applicative basé sur un stack JavaScript.
Il s'appuie sur un fichier JSON décrivant les domaines fonctionnels, les processus et les applications.
Un petit serveur Express fournit une API et sert une page web affichant les données.

## Installation

```bash
npm install
```

## Lancer le serveur

```bash
npm start
```

Le serveur démarre sur `http://localhost:3000`. Rendez-vous sur cette adresse dans votre navigateur pour voir la cartographie.

## Tests

L'exécution de `npm test` vérifie simplement que le fichier JSON respecte la structure attendue.

```bash
npm test
```

## Structure des données

Le fichier `data/landscape.json` suit la structure suivante :

- **etablissements** : liste des établissements
  - **nom** : nom de l'établissement (ex. CH Ajaccio)
  - **domaines** : liste des domaines fonctionnels
    - **nom** : nom du domaine
    - **description** : description du domaine
    - **processus** : liste des processus rattachés
      - **nom** : nom du processus
      - **description** : description du processus
      - **applications** : liste des applications associées
        - **nom** : nom de l'application
        - **description** : description
        - **editeur** : éditeur de l'application
        - **referent** : personne référente
        - **hebergement** : lieu d'hébergement (Etablissement, Esanté, SAS)
        - **multiEtablissement** : booleen indiquant si l'application est multi-établissement
        - **criticite** : niveau de criticité
        - **lienPRTG** : lien de supervision PRTG
        - **interfaces** : objet listant les types d'interfaces (Divers, Planification, Facturation, Administrative, Medicale, Autre) avec pour valeur `true` ou `false` selon la présence du type

Un exemple complet est fourni dans `data/landscape.json`.

## Rapport d'indicateurs

Un bouton 🧠 ouvre un tableau de bord résumant la situation courante. Le rapport présente six sections :

1. **Alignement des processus** – pourcentage de processus possédant au moins une application visible.
2. **Alignement des applications** – part des processus où les établissements utilisent exactement les mêmes applications.
3. **Taux de mutualisation** – part des applications visibles utilisées dans plusieurs établissements.
4. **Répartition par criticité** – pourcentage d'applications visibles de criticité Standard, Haute ou Critique.
5. **Répartition de l'hébergement** – distribution des applications visibles selon leur lieu d'hébergement (établissement, SAS, etc.).
6. **Couverture d'interfaces** – pourcentage d'applications des domaines DPI (Spécialités, Administrative, Commun, Dossier médico‑techniques) disposant de chaque type d'interface. Ce pourcentage est calculé uniquement sur les applications de ces domaines : pour chaque type, on rapporte le nombre d'applications possédant l'interface au total d'applications recensées dans ces domaines.

Chaque indicateur est accompagné d'une barre graphique afin de faciliter la lecture. Les pourcentages sont recalculés dès que vous modifiez les filtres puis rouvrez le rapport.
