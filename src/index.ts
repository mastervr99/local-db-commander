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

server.registerTool(
    "list_items",
    {
        description: "Afficher la liste de tous les articles dans l'inventaire",
        inputSchema: z.object({}),
    },
    async () => {
        try {
            console.error("Lecture de l'inventaire demandée par Claude.");

            const result = await pool.query("SELECT * FROM inventory ORDER BY name ASC");

            if(result.rows.length === 0){
                return {
                    content: [{ type: "text", text: "L'inventaire ne contient aucun article. Souhaitez-vous le remplir ?"}],
                };
            }

            const textList = result.rows
            .map((item) => `- [ID: ${item.id}] ${item.name} (Quantité : ${item.quantity })`)
            .join("\n");

            return {
                content: [{ type: "text", text: `Voici le contenu actuel de l'inventaire :\n${textList}`}],
            };
            
        } catch (error) {
            console.error("Erreur lors de la lecture SQL :", error);

            return {
                content: [{ type: "text", text: `Erreur SQL lors de la lecture : ${(error as Error).message}`}],
            };
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