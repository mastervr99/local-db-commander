# Local DB Commander - MCP Server

`local-db-commander` est un serveur MCP développé en TypeScript. Il permet à des modèles de langage locaux tournant sous Ollama via l'interface OpenWebUI d'interagir avec une base de données PostgreSQL de manière totalement autonome et sécurisée.

Ce projet s'inscrit dans une architecture d'Agentic AI, où l'IA ne se contente pas de discuter, mais peut inspecter, analyser et modifier un inventaire de stock.

---

## Architecture & Sécurité

Pour garantir un niveau de sécurité maximal ("production-grade"), le serveur intègre plusieurs couches de protection :

1. Validation stricte des entrées (`sanitize.ts`) : Chaque argument reçu par l'IA est validé et assaini via des schémas Zod dédiés avant tout traitement.
2. Protection contre l'injection SQL : Élimination totale des requêtes brutes et des concaténations de chaînes. Toutes les requêtes sont exécutées via des requêtes préparées et paramétrées (`$1`, `$2`, etc.) tirant parti des capacités natives du driver `pg`.
3. Execution Sandbox (`runQueryInSandbox.ts`) : Couche d'exécution isolée via un pool de connexions PostgreSQL avec gestion stricte du timeout de requête (3000 ms) pour bloquer les attaques par déni de service (DoS).
4. Isolations conteneurisées : Les services communiquent sur un réseau Docker interne dédié sans exposer la base de données sur l'hôte.

---

## 🚀 Fonctionnalités MCP Déployées

Le serveur expose trois piliers du protocole MCP :

### Outils (Tools)
* `add_item` : Ajoute un nouvel article dans l'inventaire (Validation stricte via Zod).
* `list_items` : Récupère la liste paginée des articles avec un système de métadonnées pour éviter la surcharge de contexte.
* `update_stock` : Modifie la quantité d'un article existant via son ID unique.
* `delete_item` : Supprime définitivement un article de la base de données.

---

## Architecture Technique

- Runtime : Node.js (v20) & TypeScript
- Protocol MCP : `@modelcontextprotocol/sdk` (Transport SSE)
- Interface & LLM : OpenWebUI + Ollama (support GPU Docker)
- Database : PostgreSQL 16 (Alpine)
- Validation : Zod

---

## Installation & Démarrage

### 1. Prérequis
- Docker Desktop avec support GPU activé (pour Ollama si disponible).
- Git.

### 2. Lancement de la stack complète
Cloner le projet et démarrer l'ensemble des conteneurs via Docker Compose :

```bash
git clone [https://github.com/mastervr99/local-db-commander.git](https://github.com/mastervr99/local-db-commander.git)
cd local-db-commander
docker compose up -d --build

---

## Connexion de OpenWebUI au Serveur MCP

1. Ouvrez l'interface OpenWebUI sur http://localhost:3000.
2. Allez dans Admin / Réglages / Outils / Intégations / External Tool Servers.
3. Ajoutez une nouvelle connexion avec un  serveur MCP en transport MCP Streamable HTTP :
   URL du serveur MCP : http://mcp-server:8000/mcp (utilisation du nom de service réseau Docker).
4. Enregistrez et vérifiez la connexion.
5. Allez ensuite dans Admin / Espace de Travail et cliquez sur Créer pour la création d'un modèle personnalisé pouvant utiliser les tools du serveur MCP
6. Rentrez un nom de modèle
7. Vous pouvez spécifiez un prompt système : "Tu es un assistant connecté à une base de données PostgreSQL via des outils MCP.
Lorsque l'utilisateur pose une question sur les stocks, l'inventaire ou les articles, tu DOIS OBLIGATOIREMENT exécuter l'outil approprié (ex: list_items, addItem) avant de répondre. Ne répond jamais de mémoire ou de manière spéculative."
8. Choisir un modèle de base compatible avec l'utilisation de tools MCP
9. Dans Outils, cliquez sur Select Tool pour sélectionner le serveur MCP
10. Cliquez sur Enregistrez et Mettre à jour

Vous pouvez maintenant lancer une nouvelle conversation dans Open WebUI pour gérer l'inventaire de stock.