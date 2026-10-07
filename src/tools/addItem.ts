import { McpServer } from "@modelcontextprotocol/sdk/server/mcp";
import { sanitize_input, add_item_schema } from "../../security/sanitize.js";
import { runQueryInSandbox } from "../utils/runQueryInSandbox.js";

interface Item_Insertion_Result {
    id: number;
}

export function registerAddItemTool (server: McpServer) {
    server.registerTool(
        "add_item",
        {
            description: "Ajouter un nouvel article dans l'inventaire",
            inputSchema: add_item_schema,
        },
        async(args) => {
            try {

                const sanitized_input_data = sanitize_input("add_item", args);

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

                const {name, quantity } = sanitized_input_data.data;

                const sql_command = "INSERT INTO inventory (name, quantity) VALUES ($1, $2) RETURNING id";

                const result = await runQueryInSandbox<Item_Insertion_Result>(sql_command, [name, quantity]);

                const inserted_item_id = result.rows[0]?.id;

                return {
                    content: [{ type: "text", text: `Succès : ajout de l'article ${name} avec ${quantity} unités effectué dans l'inventaire avec l'[ID: ${inserted_item_id}].` }],
                };

            } catch(error: unknown) {

                const errorMessage = error instanceof Error ? error.message : "Erreur inconnue";

                console.error(`Erreur lors de l'ajout dans l'inventaire : ${errorMessage}`);

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