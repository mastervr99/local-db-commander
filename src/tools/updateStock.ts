import { McpServer } from "@modelcontextprotocol/sdk/server/mcp";
import { z } from "zod";
import { Pool } from "pg";

export function registerUpdateStockTool (server: McpServer, pool: Pool){

    server.registerTool(
        "update_stock",
        {
            description: "Mettre à jour la quantité d'un article enregistré dans l'inventaire",
            inputSchema: z.object({
                id: z.number().int().positive().describe("Id de l'article dont la quantité en stock doit être mise à jour"),
                quantity: z.number().int().positive().describe("Nouvelle quantité de l'article à enregistrer dans l'inventaire"),
            })
        },
        async (args) => {
            try {
                console.error(`Mise à jour de la quantité en stocke de l'article ID: ${args.id} (Nouvelle quantité : ${args.quantity})`);

                const data_update_item_result = await pool.query(
                    "UPDATE inventory SET quantity = $1 WHERE id = $2 RETURNING *",
                    [args.quantity, args.id]
                );

                if(data_update_item_result.rows.length === 0){
                    return {
                        content: [{ type:"text", text:`Erreur : aucun article avec l'ID ${args.id} n'est enregistré dans l'inventaire. Souhaitez-vous l'ajouter maintenant ?`}]
                    }
                }

                const updated_item = data_update_item_result.rows[0];

                return {
                    content: [{ type: "text", text:`Succès : le stock de l'article ${updated_item.name} [ID: ${updated_item.id}] a été mis à jour à ${updated_item.quantity} unités.` }]
                }

            } catch (error) {
                console.error(`Error de la mise à jour SQL`, error);

                return {
                    content: [{ type:"text", text:`Erreur SQL lors de la modification : ${(error as Error).message}` }],
                }
            }
        }
    );
}