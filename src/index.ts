#!/usr/bin/env node
import { McpServer } from "@modelcontextprotocol/sdk/server/mcp.js";
import { StdioServerTransport } from "@modelcontextprotocol/sdk/server/stdio.js";
import { z } from "zod";
import { Pool } from "pg";


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

server.registerTool(
    "add_item",
    {
        description : "Ajouter un nouvel article dans l'inventaire",
        inputSchema: z.object({
            name: z.string().describe("Le nom du produit"),
            quantity: z.number().int().positive().describe("La quantité en stock"),
        }),
    },
    async (args) => {
        // la logique ici
        try {
            await pool.query(
                "INSERT INTO inventory (name, quantity) VALUES ($1, $2)",
                [args.name, args.quantity]
            );

            return {
                content: [{ type: "text", text: `Succès : ${args.name} ajouté avec ${args.quantity} unités a été ajouté à la base.`}],
            }
            
        } catch (error) {
            return {
                content: [{ type: "text", text: `Erreur SQL : ${(error as Error).message}`}],
            }
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