POLITIQUE D'ACCES ET DE SECURITE DES OUTILS MCP

1. Principes Fondamentaux

**Interdiction du SQL brut : aucun outil mcp ne doit accepter de chaînes SQL dynamiques, fragments de requête (Where clause, ORDER BY clause) ou de commandes d'exécution arbitraire
en paramètres

**Validation de l'entrée : tout argument transmis par un orchestrateur LLM doit être validé et assaini par un schéma Zod dédié avant d'être transmis à la couche d'accès aux données

**Requêtes paramétrées obligatoire : toute interaction avec PostgreSql doit passer par le driver natif "pg" avec une requête paramétrée ($1,$2...). L'inlining ou la concaténation de variables dans une requête est interdite.

**Principe du moindre privilège : tout outil mcp s'exécute exclusivement via un rôle PostgreSql dédié avec les privilèges nécessares à ses opérations. Aucun outil mcp ne doit utiliser 
de rôles ayant des privilèges supérieurs à ce qui est strictement nécessaire.
