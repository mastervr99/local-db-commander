import { execFile } from "child_process";
import { promisify } from "util";

const execFileAsync = promisify(execFile);

export async function runQueryInSandbox (sql_command: string): Promise<string> {

    const upperQuery = sql_command.toUpperCase() ;

    if( upperQuery.includes("DROP DATABASE") || upperQuery.includes("DROP TABLE")){

        throw new Error("BLOCAGE GATEKEEPER : Tentative de destruction de la structure détectée. Action Annulée");
    }

    const command = "docker";
    const command_arguments = [
        "exec",
        "mcp_postgres_db",
        "psql",
        "-U","admin",
        "-d","inventory_db",
        "-c",sql_command
    ];

    try {
        
        const { stdout, stderr } = await execFileAsync(command,command_arguments,{timeout:3000});
    
        if(stderr){
            throw new Error(`Sandbox Stderr: ${stderr}`);
        }
    
        return stdout;

    } catch (error:any) {
        
        if(error.signal === "SIGTERM"){
            throw new Error("Erreur : Temps d'exécution de la rêquete brute dépassée (3000 ms). Le Sandbox a été forcé à s'arrêter.");
        }
        

        if(error instanceof Error){
            throw error;
        } else {
            throw new Error(String(error));
        }
    }

}