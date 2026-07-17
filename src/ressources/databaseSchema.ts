import { McpServer } from "@modelcontextprotocol/sdk/server/mcp";

export function registerDatabaseSchemaResource (server: McpServer) {

    server.registerResource(
        "database_schema",
        "schema://inventory",
        {
            description: "Expose la structure technique en lecture seule de la table Inventory"
        },
        async (uri) => {

            const schemaDetails = {
                tablename: "inventory",
                columns: {
                    id: "SERIAL PRIMARY KEY (identifiant uniqué généré automatiquement)",
                    name: "TEXT NOT NULL (nom du produit ou de la référence)",
                    quantity: "INTEGER NOT NULL (quantité totale du produit actuellement en stock)"
                }
            }

            return {
                contents: [{
                    uri: uri.href,
                    mimeType: "application/json",
                    text: JSON.stringify(schemaDetails,null,2)
                }]
            }
        }
    );
}