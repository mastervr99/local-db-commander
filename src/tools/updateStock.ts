import { McpServer } from "@modelcontextprotocol/sdk/server/mcp";
import { sanitize_input, update_stock_schema } from "../../security/sanitize.js";
import { runQueryInSandbox } from "../utils/runQueryInSandbox.js";

interface ItemRow {
  id: number;
  name: string;
  quantity: number;
}

export function registerUpdateStockTool(server: McpServer) {
  server.registerTool(
    "update_stock",
    {
      description: "Mettre à jour la quantité d'un article enregistré dans l'inventaire",
      inputSchema: update_stock_schema
    },
    async (args: any) => {
      try {
        console.error(`Mise à jour de la quantité en stock de l'article ID: ${args.id} (Nouvelle quantité : ${args.quantity})`);

        const sanitized_input_data = sanitize_input("update_stock", args);

        if(!sanitized_input_data.success || !sanitized_input_data.data){
            return {
                content: [
                    {
                        type:"text",
                        text: `Erreur de validation : ${sanitized_input_data.errors?.join(',') ?? 'Arguments invalides'}`,
                    }
                ],
            };
        }

        const { id, quantity } = sanitized_input_data.data;

        const sql_command = "UPDATE inventory SET quantity = $1 WHERE id = $2 RETURNING *";
        const update_result = await runQueryInSandbox<ItemRow>(sql_command, [quantity, id]);

        if (update_result.rows.length === 0) {
          return {
            content: [{ type: "text", text: `Erreur : aucun article avec l'ID ${id} n'est enregistré dans l'inventaire.` }]
          };
        }

        const updatedItem = update_result.rows[0];

        return {
          content: [{ type: "text", text: `Succès : le stock de l'article [ID: ${updatedItem.id}] a été mis à jour à ${updatedItem.quantity} unités.` }]
        };

      } catch (error: unknown) {
        const errorMessage = error instanceof Error ? error.message : "Erreur inconnue";

        console.error(`Erreur lors de la mise à jour du stock : ${errorMessage}`);

        return {
            content: [{
                type:"text",
                text:`Erreur SQL : ${errorMessage} `
            }],
        };
      }
    }
  );
}