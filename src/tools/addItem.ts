import { McpServer } from "@modelcontextprotocol/sdk/server/mcp";
import { z } from "zod";
import { Pool } from "pg";

export function registerAddItemTool (server: McpServer, pool: Pool) {
    server.registerTool(
        "add_item",
        {
            description: "Ajouter un nouvel article dans l'inventaire",
            inputSchema: z.object({
                name: z.string().describe("Nom du nouveau article à ajouter"),
                quantity: z.number().int().positive().describe("quantité du nouveau article à ajouter"),
            }),
        },
        async (args) => {
            try {

                await pool.query(
                    "INSERT INTO inventory (name, quantity) VALUES ($1, $2)",
                    [args.name, args.quantity]
                );

                return {
                    content: [{ type: "text", text: `Succès : ajout de l'article ${args.name} avec ${args.quantity} unités effectué dans l'inventaire.` }],
                };

            } catch(error) {
                return {
                    content: [{ type: "text", text:`Erreur SQL : ${(error as Error).message} ` }],
                }
            }
        }
    );
}