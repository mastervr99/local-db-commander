import { McpServer } from "@modelcontextprotocol/sdk/server/mcp";
import { sanitize_input, delete_item_schema } from "../../security/sanitize.js";
import { runQueryInSandbox } from "../utils/runQueryInSandbox.js";

interface ItemRow {
    id: number;
    name: string;
}

export function registerDeleteItemTool ( server: McpServer){
    server.registerTool(
        "delete_item",
        {
            description: "Supprimer définitivement un article de l'inventaire",
            inputSchema: delete_item_schema
        },
        async (args) => {
            try {
                
                console.error(`Suppression définitve demandé pour l'article [ID: ${args.id}] du stock`);

                const sanitized_input_data = sanitize_input("delete_item", args);

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

                const { id } = sanitized_input_data.data;

                const sql_command = "DELETE FROM inventory WHERE id = $1 RETURNING id, name";

                const deletion_result = await runQueryInSandbox<ItemRow>(sql_command, [id]);
    
                if((deletion_result.rows.length === 0)){
                    return {
                        content: [{ type: "text", text:`Erreur : impossible de supprimer. Aucun article avec l'ID ${id} n'est pas présent dans l'inventaire`}]
                    }
                }
    
                const deleted_item = deletion_result.rows[0];
    
                return {
                    content: [{ type:"text", text:`Succès : l'article [ID: ${deleted_item.id}] a bien été supprimé de l'inventaire.` }]
                }

            } catch (error: unknown ) {
                const errorMessage = error instanceof Error ? error.message : "Erreur inconnue";

                console.error(`Erreur lors de la suppression : ${errorMessage}`);

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