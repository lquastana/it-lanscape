# 🗺️ it-landscape

**Visualisation simple et modulaire d'une cartographie applicative hospitalière**  
Basé sur un fichier JSON, ce projet propose un tableau de bord léger pour représenter les domaines, processus et applications d’un établissement de santé.

![License](https://img.shields.io/badge/license-MIT-blue.svg)
![Node](https://img.shields.io/badge/node-%3E%3D14.0-brightgreen)

---

## 🚀 Démo

> 🧪 [Lien vers la démo](https://votresite.vercel.app) *(optionnel)*  
> 📊 Exemple de jeu de données : [`landscape_sample_clean.json`](./data/landscape_sample.json)

---

## 🏥 Contexte

Conçu à partir de cas d’usage hospitaliers fictifs (ex. `Institut Alta`), ce projet permet de :

- Visualiser rapidement les processus couverts par le système d'information
- Identifier les redondances et mutualisations d'applications
- Piloter la couverture fonctionnelle et technique de l’établissement

---

## 🧩 Fonctionnalités

- 📋 Lecture d’un fichier JSON structuré (`data/landscape.json`)
- 📈 Dashboard CSS (aucune lib graphique) avec 7 indicateurs clés :
  - Alignement processus / applications
  - Taux de mutualisation
  - Répartition par criticité / hébergement
  - Complétude des données
  - Couverture fonctionnelle par type d’interface
- 💬 Chat IA intégré, activé en un clic
- 🧪 Tests de conformité JSON (`npm test`)

---

## ⚙️ Installation

```bash
npm install
````

### ▶️ Lancer le serveur

```bash
npm start
```

Le serveur démarre sur : [http://localhost:3000](http://localhost:3000)

### 🐳 Déploiement Docker avec Nginx

Un fichier `docker-compose.yml` est fourni pour exécuter l'application derrière
un serveur **Nginx**. Par défaut, seule l'adresse IP `185.15.24.118` est autorisée.
Pour ajouter d'autres adresses, éditez `nginx.conf` et rajoutez des lignes
`allow` supplémentaires.

```bash
docker-compose build
docker-compose up
```

### 🛂 Authentification Office 365
La page `/login.html` redirige vers Microsoft pour se connecter. Configurez les variables d'environnement suivantes :

AZURE_CLIENT_ID="votre_client_id"
AZURE_TENANT_ID="votre_tenant_id"
AZURE_CLIENT_SECRET="votre_secret"
AZURE_REDIRECT_URI="http://localhost:3000/auth/redirect"
ALLOWED_USER="laurent.quastana@gcs-sirsco.fr"
# Pour désactiver temporairement l'authentification
# (mode développement uniquement)
DISABLE_AUTH="true"

Une fois authentifié, l'adresse e-mail est sauvegardée en session et l'accès est accordé uniquement si elle correspond à `ALLOWED_USER`.
  -H 'Content-Type: application/json' \
  -d '{"username":"user","password":"pass"}'
```

Si l'utilisateur appartient à l'un des groupes autorisés, la réponse contient la liste de ses groupes.

=======
>>>>>>> main
---

## 🧪 Tests

```bash
npm test
```

Ce test vérifie que le fichier JSON respecte la structure fonctionnelle attendue.

---

## 🧬 Structure du JSON

```json
{
  "etablissements": [
    {
      "nom": "Institut Alta",
      "domaines": [
        {
          "nom": "Support",
          "description": "...",
          "processus": [
            {
              "nom": "DMI",
              "description": "...",
              "applications": [
                {
                  "nom": "AquaFlow31",
                  "description": "...",
                  "editeur": null,
                  "referent": null,
                  "hebergement": "Hébergement Central",
                  "multiEtablissement": false,
                  "criticite": "Critique",
                  "lienPRTG": null,
                  "interfaces": {
                    "Planification": false,
                    "Facturation": true,
                    "Administrative": false,
                    "Medicale": true,
                    "Autre": true
                  }
                }
              ]
            }
          ]
        }
      ]
    }
  ]
}
```

---

## 📈 Indicateurs affichés

1. **⚙️ Alignement des processus** : % de processus avec au moins une application
2. **🖥️ Alignement des applications** : homogénéité entre établissements
3. **🏗️ Mutualisation** : taux d'applications partagées
4. **🔥 Criticité** : Standard / Haute / Critique
5. **🏢 Hébergement** : lieux d'hébergement anonymisés
6. **📑 Complétude des champs** : éditeur, référent, supervision
7. **🧩 Couverture des interfaces** : par domaines DPI

---

## 📄 Exemples d’usage

> Sur un ensemble fictif de 192 applications :

* 94,9 % des processus sont couverts par au moins une application
* 44,2 % sont homogènes entre établissements
* 40,1 % des applications sont mutualisées
* 12 % sont critiques

---

## 🛠️ Roadmap

* 🧠 Assistant IA contextuel
* 🧪 Simulateur d’impact (ajout/retrait d’appli)
* 🔁 Suivi des projets de convergence
* 📡 Vue graphe des dépendances applicatives
* 📤 Export PDF/Excel du dashboard

---

## 🙌 Contribution

Les contributions sont bienvenues !

```bash
git clone https://github.com/votre_user/it-landscape.git
cd it-landscape
npm install
```

Consulte le fichier [`CONTRIBUTING.md`](./CONTRIBUTING.md) pour plus de détails.

---

## 📄 Licence

Distribué sous licence MIT – libre d’usage et de modification.

---

