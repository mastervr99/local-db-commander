# 🛠️ Local DB Commander - MCP Server

`local-db-commander` est un serveur **Model Context Protocol (MCP)** développé en TypeScript. Il permet à des assistants IA (comme Claude Desktop) d'interagir de manière autonome, sécurisée et intelligente avec une base de données PostgreSQL locale (gérée via Docker).

Ce projet s'inscrit dans une architecture d'**Agentic AI**, où l'IA ne se contente pas de discuter, mais peut inspecter, analyser et modifier un inventaire de stock en fonction d'objectifs métiers.

---

## 🚀 Fonctionnalités MCP Déployées

Le serveur expose trois piliers du protocole MCP :

### 1. 🧰 Outils (Tools) — *Capacités d'action de l'IA*
* `add_item` : Ajoute un nouvel article dans l'inventaire (Validation stricte via Zod).
* `list_items` : Récupère la liste paginée des articles avec un système de métadonnées pour éviter la surcharge de contexte.
* `update_stock` : Modifie la quantité d'un article existant via son ID unique.
* `delete_item` : Supprime définitivement un article de la base de données.

### 2. 📄 Ressources (Resources) — *Contexte en lecture seule*
* `schema://inventory` : Expose la structure technique exacte de la table `inventory` à l'IA pour qu'elle comprenne le type de données (types SQL, clés primaires) avant d'écrire ses requêtes.

### 3. 💡 Modèles de Prompts (Prompts Templates) — *Workflows métier*
* `audit-stock-critique` : Un prompt structuré qui transforme l'IA en Directeur Logistique pour analyser les ruptures de stock en dessous d'un seuil dynamique et générer un rapport Markdown d'urgence.

---

## 🏗️ Architecture Technique

* **Runtime** : Node.js (v20+) avec TypeScript
* **SDK** : `@modelcontextprotocol/sdk` (Dernière spécification)
* **Base de données** : PostgreSQL 16 (Alpine) isolé dans un conteneur Docker
* **Validation de Schéma** : Zod

---

## ⚙️ Installation & Démarrage

### 1. Prérequis
Assurez-vous d'avoir installé **Docker Desktop**, **Node.js**, et **Claude Desktop**.

### 2. Cloner le projet et installer les dépendances
```bash
git clone [https://github.com/VOTRE_PSEUDO/local-db-commander.git](https://github.com/VOTRE_PSEUDO/local-db-commander.git)
cd local-db-commander
npm install


### 3. Lancer la base de données PostgreSQL
Le projet inclut un fichier docker-compose.yml préconfiguré (Port local : 5431).


### 4. Intégration avec Claude Desktop
Pour connecter ce serveur à votre application Claude Desktop, ajoutez la configuration suivante dans votre fichier claude_desktop_config.json :

    ⚠️ Important (Windows) : Remplacez les chemins ci-dessous par les chemins absolus correspondants à votre machine.

{
  "mcpServers": {
    "local-db-commander": {
      "command": "C:\\CHEMIN\\VERS\\VOTRE\\PROJET\\node_modules\\.bin\\tsx.cmd",
      "args": [
        "C:\\CHEMIN\\VERS\\VOTRE\\PROJET\\src\\index.ts"
      ]
    }
  }
}


### 5. Redémarrage
Quittez complètement Claude Desktop (via l'icône dans la barre des tâches) et relance-zle. Les icônes d'outils et de prompts apparaîtront dans vos conversations.