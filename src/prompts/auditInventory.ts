import { McpServer } from "@modelcontextprotocol/sdk/server/mcp";
import { z } from "zod";

export function registerAuditInventoryPrompt (server: McpServer){

    server.registerPrompt(
        "urgent_inventory_audit",
        {
            description: "prépare un promt d'analyse pour réperer les anomalies et ruptures de stock",
            argsSchema: ({
                seuil: z.string().optional().default("5").describe("Seuil à partir duquel la quantité en stock d'un produit est jugé critique")
            }) 
        },
        async (args) => {
            const seuil_critique = args.seuil ?? 5;

            return {
                messages: [{
                    role: "user",
                    content: {
                        type: "text",
                        text: `Agis en tant que Directeur logistique :
                        1.Utilise le tool "list_items" pour analyser toute la liste des articles de l'inventaire en entier
                        2.Identifie les articles dont la quantité est égale ou inférieur à ${seuil_critique}
                        3.Fais un rapport sous forme de tableau Markdown de ces articles dont la quantité est à un état critique afin de proposer une stratégie de réapprovisionnement
                        4.Remonte moi toute anomalie ou duplication que tu puisses rencontrer dans l'inventaire
                        `
                    }
                }]
            }

        }
    );
}