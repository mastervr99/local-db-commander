import { McpServer } from "@modelcontextprotocol/sdk/server/mcp";
import { z } from "zod";
import { runQueryInSandbox } from "../utils/runQueryInSandbox.js";

export function registerAddItemTool (server: McpServer) {
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

                const safename = args.name.replace(/'/g,"''");

                const sql_command = `INSERT INTO inventory (name, quantity) VALUES ('${safename}', ${args.quantity})`;

                await runQueryInSandbox(sql_command);

                return {
                    content: [{ type: "text", text: `Succès : ajout de l'article ${args.name} avec ${args.quantity} unités effectué dans l'inventaire.` }],
                };

            } catch(error: any) {
                console.error(`Erreur lors de l'ajout dans l'inventaire.`);

                return {
                    content: [{
                        type:"text",
                        text:`Erreur SQL : ${error.message} `
                    }]
                }

            }
        }
    );
}