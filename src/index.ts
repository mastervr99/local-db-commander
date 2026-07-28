#!/usr/bin/env node
import { McpServer } from "@modelcontextprotocol/sdk/server/mcp.js";
import { StdioServerTransport } from "@modelcontextprotocol/sdk/server/stdio.js";
import { Pool } from "pg";

import { registerAddItemTool } from "./tools/addItem.js";
import { registerListItemsTool } from "./tools/listItems.js";
import { registerUpdateStockTool } from "./tools/updateStock.js";
import { registerDeleteItemTool } from "./tools/deleteItem.js";
import { registerSandboxedQueryTool } from "./tools/sandboxedQuery.js";

import { registerAuditInventoryPrompt } from "./prompts/auditInventory.js";

import { registerDatabaseSchemaResource } from "./ressources/databaseSchema.js";


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

registerAddItemTool(server);
registerListItemsTool(server);
registerUpdateStockTool(server, pool);
registerDeleteItemTool(server);
registerAuditInventoryPrompt(server);
registerDatabaseSchemaResource(server);
registerSandboxedQueryTool(server);



async function main() {

    const transport = new StdioServerTransport();
    await server.connect(transport);
    console.error("Serveur MCP démarré avec registerTool");
    
}

main().catch((error) => {
    console.error("Erreur critique :", error);
    process.exit(1);
});