import { McpServer } from "@modelcontextprotocol/sdk/server/mcp";
import { number, z } from "zod";
import { runQueryInSandbox } from "../utils/runQueryInSandbox.js";

export function registerListItemsTool (server: McpServer) {

    server.registerTool(
        "list_items",
        {
            description: "Afficher la liste de tous les éléments de l'inventaire avec une pagination",
            inputSchema: z.object({
                page:z.number().int().positive().optional().describe("Numéro de la page à afficher"),
                limit: z.number().int().positive().max(50).optional().default(10).describe("Nombre maximum d'éléments à afficher par page (Défaut: 10, Maximum:50)"),
            }),
        },
        async (args) => {
            try {
                
                console.error(`Lecture de l'inventaire suite à la demande de l'IA (Page : ${args.page}, Limite : ${args.limit})`);

                const page_number = args.page ?? 1;
                const items_limit_per_page = args.limit ?? 10;

                const offset = (page_number - 1) * items_limit_per_page;

                
                const item_count_sql_command = "SELECT COUNT(*) FROM inventory";
                
                const item_count_stdout = await runQueryInSandbox(item_count_sql_command);
                
                const item_count_match = item_count_stdout.match(/\d+/);
                
                const total_items_count = item_count_match ? parseInt(item_count_match[0],10) : 0;
                
                const total_pages = Math.ceil(total_items_count / items_limit_per_page) || 1;
                

                const sql_command = `SELECT json_agg(t) FROM (SELECT id,name,quantity FROM inventory ORDER BY name ASC LIMIT ${items_limit_per_page} OFFSET ${offset}) t;`;

                const stdout = await runQueryInSandbox(sql_command);

                const stdout_array_text = stdout.match(/\[.*\]/s);

                let items_array: Array<{id: number, name: string, quantity: number} | null > = [];


                if(stdout_array_text){
                    const clean_stdout_array_text = stdout_array_text[0].replace(/\+\s*\n?/g, "");
                    items_array = JSON.parse(clean_stdout_array_text); 
                }


                const items_only_array = (items_array || []).filter((item): item is { id: number, name: string, quantity: number } => item !== null);

                const response_text = items_only_array ? items_only_array
                .map((item) => `- [ID: ${item.id}] ${item.name} (Quantité: ${item.quantity})`)
                .join("\n") : "Aucun article n'est présent dans l'inventaire. Souhaitez-vous en ajouter ?";

                const metadata = `\n\n[Page ${page_number}/${total_pages}. Nombre total d'articles : ${total_items_count}]`;
                const pagination = page_number < total_pages ?
                "\n(Note : Il reste d'autres articles disponibles. Demande explicitiement si tu souhaites regarder la suite des articles.)"
                : "";

                return {
                    content: [{type:"text", text: `Voici la liste des articles dans l'inventaire : \n${response_text} ${metadata} ${pagination}`}] ,
                };


            } catch (error:any) {
                console.error("Erreur SQL lors de la lecture de la base de donnée", error);

                return {
                    content: [{
                        type:"text",
                        text:`Erreur lors de la lecture SQL : ${error.message}`
                    }]
                }
            }
        } 
    );
}