#!/usr/bin/env node
import { McpServer } from "@modelcontextprotocol/sdk/server/mcp.js";
import { StdioServerTransport } from "@modelcontextprotocol/sdk/server/stdio.js";
import { z } from "zod";
import { Pool } from "pg";

import { registerAddItemTool } from "./tools/addItem.js";
import { registerListItemsTool } from "./tools/listItems.js";
import { registerUpdateStockTool } from "./tools/updateStock.js";
import { registerDeleteItemTool } from "./tools/deleteItem.js";
import { registerAuditInventoryPrompt } from "./prompts/auditInventory.js";


const pool = new Pool({
    user: "admin",
    host: "localhost",
    database: "inventory_db",
    password: "password123",
    port: 5431,
});

const server = new McpServer({
    name: "local-db-commander",
    version: "1.0.0",
});

registerAddItemTool(server, pool);
registerListItemsTool(server, pool);
registerUpdateStockTool(server, pool);
registerDeleteItemTool(server, pool);
registerAuditInventoryPrompt(server);


server.registerResource(
    "database-schema",
    "schema://inventory",
    {
        description: "Expose la structure technique en lecture seule de la table inventory",
    },
    async (uri) => {
        const schemaDetails = {
            tablename: "inventory",
            columns: {
                id: "SERIAL PRIMARY KEY (identifiant unique généré automatiquement)",
                name: "TEXT NOT NULL (nom du produit ou de la référence)",
                quantity: "INTEGER NOT NULL (quantité totale actuellement en stock)"
            }
        };

        return {
            contents: [{
                uri: uri.href,
                mimeType: "application/json",
                text: JSON.stringify(schemaDetails, null, 2)
            }]
        }
    }
);



async function main() {

    const transport = new StdioServerTransport();
    await server.connect(transport);
    console.error("Serveur MCP démarré avec registerTool");
    
}

main().catch((error) => {
    console.error("Erreur critique :", error);
    process.exit(1);
});