import { McpServer } from "@modelcontextprotocol/sdk/server/mcp.js";
import { StdioServerTransport } from "@modelcontextprotocol/sdk/server/stdio.js";
import { z } from "zod";

const server = new McpServer({
    name: "local-db-commander",
    version: "1.0.0",
});

server.registerTool(
    "add_item",
    {
        description : "Ajouter un nouvel article dans l'inventaire",
        inputSchema: z.object({
            name: z.string().describe("Le nom du produit"),
            quantity: z.number().int().positive().describe("La quantité en stock"),
        }),
    },
    async (args) => {
        // la logique ici
        console.error(`Tentative d\'ajout de ${args.name} avec ${args.quantity} unités.`);
        
        return {
            content: [{ type: "text", text: `Succès : ${args.name} ajouté avec ${args.quantity} unités.`}],
        }
    }
);

async function main() {
    const transport = new StdioServerTransport();
    await server.connect(transport);
    console.error("Serveur MCP démarré avec registerTool");
}

main().catch((error) => {
    console.error("Erreur critique :", error);
    process.exit(1);
});