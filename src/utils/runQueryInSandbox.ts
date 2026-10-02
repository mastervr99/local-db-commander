import { Pool, QueryResultRow } from "pg";

export interface QueryResult<T>{
    rows: T[];
    rowCount: number | null;
}

const pool = new Pool({
    connectionString: process.env.DATABASE_URL,
    statement_timeout: 3000,
    connectionTimeoutMillis: 2000
});


export async function runQueryInSandbox<T extends QueryResultRow = QueryResultRow>(sql_command: string, command_parameters: unknown[] = []): Promise<QueryResult<T>> {

    if(!sql_command || typeof sql_command !== "string"){
        throw new Error(
            "BLOCAGE GATEKEEPER : La requête SQL n'est pas une chaîne valide"
        );
    }

    try {
        
        const result = await pool.query<T>(sql_command, command_parameters);
        
        return {
            rows: result.rows,
            rowCount: result.rowCount
        }

    } catch (error:unknown) {
        
        const pgError = error as {
            code?: string;
            message?: string;
        }

        if(pgError.code == "57014"){
            throw new Error(
                "Erreur : Temps d'exécution de la requête SQL dépassé (3000). L'opération a été annulé."
            );
        }

        throw new Error(
            `Erreur SQL Sandboxe : ${ pgError.message ?? "Erreur SQL inconnue"}`
        );
    
    }

}