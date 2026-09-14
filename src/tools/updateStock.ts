import { McpServer } from "@modelcontextprotocol/sdk/server/mcp";
import { z } from "zod";
import { runQueryInSandbox } from "../utils/runQueryInSandbox.js";

export function registerUpdateStockTool(server: McpServer) {
  server.registerTool(
    "update_stock",
    {
      description: "Mettre à jour la quantité d'un article enregistré dans l'inventaire",
      inputSchema: z.object({
        id: z.number().int().positive().describe("Id de l'article dont la quantité en stock doit être mise à jour"),
        quantity: z.number().int().positive().describe("Nouvelle quantité de l'article à enregistrer dans l'inventaire"),
      })
    },
    async (args: any) => {
      try {
        console.error(`Mise à jour de la quantité en stock de l'article ID: ${args.id} (Nouvelle quantité : ${args.quantity})`);

        const sql_command = `UPDATE inventory SET quantity = ${args.quantity} WHERE id = ${args.id} RETURNING *`;
        const stdout = await runQueryInSandbox(sql_command);

        if (stdout.includes("0 rows")) {
          return {
            content: [{ type: "text", text: `Erreur : aucun article avec l'ID ${args.id} n'est enregistré dans l'inventaire.` }]
          };
        }

        return {
          content: [{ type: "text", text: `Succès : le stock de l'article [ID: ${args.id}] a été mis à jour à ${args.quantity} unités.` }]
        };

      } catch (error: any) {
        console.error(`Erreur de la mise à jour SQL`, error);
        return {
          content: [{ type: "text", text: `Erreur SQL lors de la modification : ${error.message}` }]
        };
      }
    }
  );
}