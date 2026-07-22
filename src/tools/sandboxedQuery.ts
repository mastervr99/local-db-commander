import { McpServer } from "@modelcontextprotocol/sdk/server/mcp";
import { z } from "zod";
import { runQueryInSandbox } from "../utils/runQueryInSandbox.js";
export function registerSandboxedQueryTool (server: McpServer) {
    server.registerTool(
        "execute_sandboxed_query",
        {
            description: "Exécution d'une inspection ou requête SQL dans un sandbox temporaire Docker",
            inputSchema: z.object({
                sql_command: z.string().describe("Requête SQL brute à tester/exécuter dans le sandbox"),
            }),
        },
        async (args) => {

            try {
                console.error("Alerte Sécurité : Réception d'une requête SQL. Analyse du contenu...");

                const result_query = await runQueryInSandbox(args.sql_command);


                return {
                    content: [{
                        type:"text",
                        text:`Exécution réussie de la requête dans le sandbox isolé. \nRésultat: \n${result_query}`
                    }]
                }
                
            } catch (error: any) {
                console.error("Erreur ou échec d'isolation dans la sandbox");

                return {
                    content: [{
                        type:"text",
                        text:`Erreur d'exécution de la sandbox : ${error.message}`
                    }]
                }

            }
        }
    );
}