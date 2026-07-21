import { McpServer } from "@modelcontextprotocol/sdk/server/mcp";
import { z } from "zod";
import { execFile } from "child_process";
import { promisify } from "util";

const execFileAsync = promisify(execFile);

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

                const upperQuery = args.sql_command.toUpperCase();

                if(upperQuery.includes("DROP DATABASE") || upperQuery.includes("DROP TABLE")){
                    return {
                        content: [{
                            type: "text",
                            text: "Bocage Gatekeeper : Tentative de destruction de la structure détectée. Action annulée"
                        }]
                    }
                }

                const command = "docker";
                const command_arguments = [
                    "exec",
                    "mcp_postgres_db",
                    "psql",
                    "-U","admin",
                    "-d","inventory_db",
                    "-c", args.sql_command
                ];

                const { stdout, stderr } = await execFileAsync(command, command_arguments, { timeout: 3000 }); 

                if(stderr){
                    return {
                        content: [{
                            type:"text",
                            text:`Sandbox Stderr: ${stderr}`
                        }]
                    }
                }

                return {
                    content: [{
                        type:"text",
                        text:`Exécution réussie de la requête dans le sandbox isolé. \nRésultat: \n${stdout}`
                    }]
                }
                
            } catch (error: any) {
                console.error("Erreur ou échec d'isolation dans la sandbox");
                
                if(error.signal === "SIGTERM"){
                    return {
                        content: [{
                            type:"text",
                            text:`Erreur: Temps d'exécution de la requête dépassé (3000 ms). La sandbox a été forcé de s'arrêter.`
                        }]
                    }
                }

                const error_message = error instanceof Error ? error.message : String(error);

                return {
                    content: [{
                        type:"text",
                        text:`Erreur d'exécution de la sandbox : ${error_message}`
                    }]
                }

            }
        }
    );
}