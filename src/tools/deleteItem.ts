import { McpServer } from "@modelcontextprotocol/sdk/server/mcp";
import { z } from "zod";
import { Pool } from "pg";

export function registerDeleteItemTool ( server: McpServer, pool: Pool){

    server.registerTool(
        "delete_item",
        {
            description: "Supprimer définitivement un article de l'inventaire",
            inputSchema: z.object({
                id: z.number().int().positive().describe("Numéro ID de l'article dont on doit définitivement supprimer les informations dans l'inventaire")
            }),
        },
        async (args) => {
            try {
                
                console.error(`Suppression définitve demandé pour l'article [ID: ${args.id}] du stock`);
    
                const data_delete_item_result = await pool.query(
                    "DELETE FROM inventory WHERE id = $1 RETURNING *",
                    [args.id]
                );
    
                if(data_delete_item_result.rows.length === 0){
                    return {
                        content: [{ type: "text", text:`Erreur : impossible de supprimer. Aucun article avec l'[ID: ${args.id} n'est présent dans l'inventaire]`}]
                    }
                }
    
                const deleted_item = data_delete_item_result.rows[0];
    
                return {
                    content: [{ type:"text", text:`Succès : l'article ${deleted_item.name} [ID: ${deleted_item.id}] a bien été supprimé de l'inventaire` }]
                }

            } catch (error) {
                console.error(`Erreur lors de la suppresion SQL`);

                if(error instanceof Error){
                    return {
                        content: [{
                            type:"text",
                            text:`Erreur SQL lors de la suppression : ${error.message} `
                        }]
                    }
                } else {
                    return {
                        content: [{
                            type:"text",
                            text:`Erreur SQL lors de la suppression : ${(error)} `
                        }]
                    }
                }
            }
        }
    );
}