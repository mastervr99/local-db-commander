import { McpServer } from "@modelcontextprotocol/sdk/server/mcp";
import { sanitize_input, list_items_schema } from "../../security/sanitize.js";
import { runQueryInSandbox } from "../utils/runQueryInSandbox.js";

interface CountRow {
    count: string;
}

interface ItemsRow {
    id: number;
    name: string;
    quantity: number;
}

export function registerListItemsTool(server: McpServer){
    server.registerTool(
        "list_items",
        {
            description: "Afficher la liste des éléments de l'inventaire avec une pagination",
            inputSchema: list_items_schema
        },
        async(args) => {
            const sanitized_input_data = await sanitize_input("list_items",args);

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

            const { page, limit } = sanitized_input_data.data;

            try {
                
                const data_items_count = await runQueryInSandbox<CountRow>(
                    "SELECT COUNT(*) AS count FROM inventory"
                );
    
                const items_total_count = data_items_count.rows[0] ? parseInt(data_items_count.rows[0].count, 10) : 0;
                const pages_total_count = Math.ceil(items_total_count / limit );
    
                if( page > pages_total_count){
                    return {
                        content: [
                            {
                                type:"text",
                                text:`La page ${page} n'existe pas. Le nombre total de pages disponibles est de ${pages_total_count}.`,
                            }
                        ],
                    };
                }
    
                const offset = (page - 1) * limit;
    
                const data_items = await runQueryInSandbox<ItemsRow>(
                    "SELECT id,name,quantity FROM inventory  LIMIT $1 OFFSET $2",
                    [limit, offset]
                );
    
                const items = data_items.rows;
    
                const response_text = items.length > 0 ? 
                    items.map((item) =>`- [ID: ${item.id}] ${item.name} (Quantité: ${item.quantity})`).join("\n")
                    : "Aucun article présent dans l'inventaire. Souhaitez-vous ajouter de nouveaux articles ?";
                
                const metadata = `\n\n[Page ${page}/${pages_total_count}. Nombre total d'articles : ${items_total_count}]`;
                const paginationNotice =
                    page < pages_total_count
                    ? "\n(Note : Il reste d'autres articles disponibles. Demande explicitement si tu souhaites regarder la suite des articles.)"
                    : "";

                return {
                    content: [
                        {
                        type: "text",
                        text: `Voici la liste des articles dans l'inventaire :\n${response_text}${metadata}${paginationNotice}`,
                        },
                    ],
                };

            } catch (error: unknown) {
                const errorMessage = error instanceof Error ? error.message : "Erreur inconnue";

                console.error(
                "Erreur lors de la lecture de l'inventaire :", errorMessage
                );

                return {
                content: [
                    {
                    type: "text",
                    text: `Erreur lors de la lecture SQL : ${errorMessage}`,
                    },
                ],
                };

            }


        }
    );
}