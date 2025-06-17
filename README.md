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

Un bouton 🧠 ouvre un tableau de bord résumant la situation courante. Le rapport présente sept sections :

1. **⚙️ Alignement des processus** – pourcentage de processus possédant au moins une application visible.
2. **🖥️ Alignement des applications** – part des processus où les établissements utilisent exactement les mêmes applications.
3. **🏗️ Taux de mutualisation** – part des applications visibles utilisées dans plusieurs établissements.
4. **🔥 Répartition par criticité** – nombre et pourcentage d'applications visibles de criticité Standard, Haute ou Critique.
5. **🏢 Répartition de l'hébergement** – nombre et pourcentage d'applications visibles selon leur lieu d'hébergement (établissement, SAS, etc.).
6. **📑 Complétude des données** – part des champs éditeur, référent et lien PRTG renseignés dans les applications visibles.
7. **🧩 Couverture d'interfaces** – pourcentage d'applications des domaines DPI (Spécialités, Administrative, Commun, Dossier médico‑techniques) disposant de chaque type d'interface. Ce pourcentage est calculé uniquement sur les applications de ces domaines : pour chaque type, on rapporte le nombre d'applications possédant l'interface au total d'applications recensées dans ces domaines.
Les indicateurs utilisent uniquement du CSS : les KPI globaux sont représentés avec des donuts, les autres avec des barres de progression. Aucune bibliothèque graphique n'est nécessaire.

### Exemple d'analyse

⚙️ **Alignement des processus et des applications**

94,9 % des processus disposent d'au moins une application associée. En revanche, seuls 44,2 % utilisent les mêmes applications dans tous les établissements, laissant entrevoir un potentiel de rationalisation inter‑site.

🏗️ **Mutualisation des applications**

40,1 % des applications visibles sont partagées entre plusieurs établissements. La marge de convergence technologique reste donc importante.

🔥 **Répartition par criticité**

Sur 192 applications recensées : 64,6 % sont standard, 23,4 % sont hautes et 12 % sont critiques.

🏢 **Répartition de l'hébergement**

Les applications se répartissent majoritairement entre le CH Ajaccio (26 %), le SAS (30,2 %) et le SITEC (23,4 %). CH Bastia (14,6 %) et Castelluccio (5,2 %) sont moins représentés.

🧩 **Couverture des interfaces**

La moitié des applications couvrent le domaine médical et 53,4 % l'administratif, tandis que la facturation et la planification sont nettement moins couvertes (26,1 % et 14,8 %). Un radar chart mettrait bien en évidence ces écarts.
