import { McpServer } from "@modelcontextprotocol/sdk/server/mcp";
import { z } from "zod";
import { runQueryInSandbox } from "../utils/runQueryInSandbox.js";

export function registerDeleteItemTool ( server: McpServer){

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

                const sql_command = `DELETE FROM inventory WHERE id = ${args.id} RETURNING *`;

                const stdout = runQueryInSandbox(sql_command);
    
                if((await stdout).includes("(0 rows)")){
                    return {
                        content: [{ type: "text", text:`Erreur : impossible de supprimer. Aucun article avec l'ID ${args.id} n'est pas présent dans l'inventaire`}]
                    }
                }
    
    
                return {
                    content: [{ type:"text", text:`Succès : l'article [ID: ${args.id}] a bien été supprimé de l'inventaire./nRésultat :/n ${stdout}` }]
                }

            } catch (error) {
                console.error(`Erreur lors de la suppresion SQL`);

                const error_message = error instanceof Error ? error.message : String(error);

                return {
                    content: [{
                        type:"text",
                        text:`Erreur SQL lors de la suppression : ${error_message} `
                    }]
                }              
            }
        }
    );
}