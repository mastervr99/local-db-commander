import { McpServer } from "@modelcontextprotocol/sdk/server/mcp";
import { z } from "zod";
import { Pool } from "pg";

export function registerListItemsTool (server: McpServer, pool: Pool) {

    server.registerTool(
        "list_items",
        {
            description: "Afficher la liste de tous les éléments de l'inventaire avec une pagination",
            inputSchema: z.object({
                page:z.number().int().positive().optional().default(1).describe("Numéro de la page à afficher"),
                limit: z.number().int().positive().max(50).optional().default(10).describe("Nombre d'éléments à afficher par page"),
            }),
        },
        async (args) => {
            try {
                
                console.error(`Lecture de l'inventaire suite à la demande de l'IA (Page : ${args.page}, Limite : ${args.limit})`);

                const offset = (args.page - 1) * args.limit;

                const data_items_list = await pool.query(
                    "SELECT * FROM inventory ORDER BY name ASC LIMIT $1 OFFSET $2",
                    [args.limit, offset]
                );

                const data_items_count = await pool.query("SELECT COUNT(*) FROM inventory");
                const total_items = parseInt(data_items_count.rows[0].count, 10);
                const total_pages = total_items / args.limit;

                if(data_items_list.rows.length === 0) {
                    return {
                        content: [{ type: "text", text: "Il n'y actuellement aucun article dans l'inventaire. Souhaitez-vous en ajouter ?" }]
                    };
                }

                const response_text = data_items_list.rows
                .map((item) => `- [ID: ${item.id}] ${item.name} (Quantité: ${item.quantity})`)
                .join("\n");

                const metadata = `\n\n[Page ${args.page}/${total_pages}. Nombre total d'articles : ${total_items}]`;
                const pagination = args.page < total_pages ?
                "\n(Note : Il reste d'autres articles disponibles. Demande explicitiement si tu souhaites regarder la suite des articles.)"
                : "";

                return {
                    content: [{type:"text", text: `Voici la liste des articles dans l'inventaire : \n${response_text} ${metadata} ${pagination}`}] ,
                };


            } catch (error) {
                console.error("Erreur SQL lors de la lecture de la base de donnée", error);

                return {
                    content: [{ type:"text", text: `Erreur lors de la lecture SQL : ${(error as Error).message}` }]
                };
            }
        } 
    );
}