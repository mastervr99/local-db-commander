#!/usr/bin/env node
import express from "express";
import cors from "cors";
import crypto from "crypto";
import { McpServer } from "@modelcontextprotocol/sdk/server/mcp.js";
import { SSEServerTransport } from "@modelcontextprotocol/sdk/server/sse.js";
import { InMemoryTransport } from "@modelcontextprotocol/sdk/inMemory.js";
import { Client } from "@modelcontextprotocol/sdk/client/index.js";

import { registerAddItemTool } from "./tools/addItem.js";
import { registerListItemsTool } from "./tools/listItems.js";
import { registerUpdateStockTool } from "./tools/updateStock.js";
import { registerDeleteItemTool } from "./tools/deleteItem.js";
import { registerSandboxedQueryTool } from "./tools/sandboxedQuery.js";
import { registerAuditInventoryPrompt } from "./prompts/auditInventory.js";
import { registerDatabaseSchemaResource } from "./ressources/databaseSchema.js";

function createRawMcpServer() {
  const server = new McpServer({
    name: "postgres-mcp",
    version: "1.0.0",
  });

  registerAddItemTool(server);
  registerListItemsTool(server);
  registerUpdateStockTool(server);
  registerDeleteItemTool(server);
  registerAuditInventoryPrompt(server);
  registerDatabaseSchemaResource(server);
  registerSandboxedQueryTool(server);

  return server;
}

const app = express();
const PORT = Number(process.env.PORT) || 8000;

// Exposer les en-têtes nécessaires pour MCP Streamable HTTP
app.use(
  cors({
    origin: "*",
    exposedHeaders: ["Mcp-Session-Id", "Content-Type"],
  })
);
app.use(express.json());

app.use((req, _res, next) => {
  console.log(`[HTTP REQ] ${req.method} ${req.path}`);
  next();
});

const transports_map = new Map<string, SSEServerTransport>();

async function processStatelessMcpRequest(body: any, sessionId?: string) {
  if (!body || typeof body !== "object") {
    return {
      response: {
        jsonrpc: "2.0",
        id: null,
        error: { code: -32600, message: "Requête JSON invalide" },
      },
      newSessionId: undefined,
    };
  }

  const { method, params, id } = body;
  const reqId = id !== undefined ? id : null;

  // 1. Négociation de protocole et génération de Session ID pour Streamable HTTP
  if (method === "initialize") {
    const clientVersion = params?.protocolVersion;
    const negotiatedVersion = clientVersion || "2024-11-05";
    const generatedSessionId = crypto.randomUUID();

    return {
      response: {
        jsonrpc: "2.0",
        id: reqId ?? 1,
        result: {
          protocolVersion: negotiatedVersion,
          capabilities: {
            tools: { listChanged: false },
            resources: { subscribe: false, listChanged: false },
            prompts: { listChanged: false },
          },
          serverInfo: { name: "postgres-mcp", version: "1.0.0" },
        },
      },
      newSessionId: generatedSessionId,
    };
  }

  // 2. Notifications standard MCP
  if (method === "notifications/initialized" || method?.startsWith("notifications/")) {
    return { response: null, newSessionId: undefined };
  }

  if (method === "ping") {
    return { response: { jsonrpc: "2.0", id: reqId ?? 1, result: {} }, newSessionId: undefined };
  }

  // 3. Exécution des méthodes MCP (tools, resources, prompts)
  const server = createRawMcpServer();
  const [clientTransport, serverTransport] = InMemoryTransport.createLinkedPair();

  const client = new Client(
    { name: "stateless-bridge", version: "1.0.0" },
    { capabilities: {} }
  );

  await server.connect(serverTransport);
  await client.connect(clientTransport);

  try {
    let result: any;

    if (method === "tools/list") {
      const toolsRes = await client.listTools();
      // Nettoyage de la propriété 'execution' propre au SDK JS pour éviter les erreurs de validation Pydantic dans Open WebUI
      const cleanedTools = (toolsRes.tools || []).map((tool: any) => {
        const { execution, ...cleanTool } = tool;
        return cleanTool;
      });
      result = { tools: cleanedTools };
    } else if (method === "tools/call") {
      console.log(`[MCP Bridge] Exécution de l'outil : ${params?.name}`);
      result = await client.callTool({
        name: params?.name,
        arguments: params?.arguments || {},
      });
    } else if (method === "resources/list") {
      const resList = await client.listResources();
      result = { resources: resList.resources || [] };
    } else if (method === "resources/read") {
      result = await client.readResource({ uri: params?.uri });
    } else if (method === "prompts/list") {
      const promptList = await client.listPrompts();
      result = { prompts: promptList.prompts || [] };
    } else if (method === "prompts/get") {
      result = await client.getPrompt({
        name: params?.name,
        arguments: params?.arguments,
      });
    } else {
      return {
        response: {
          jsonrpc: "2.0",
          id: reqId,
          error: { code: -32601, message: `Méthode non supportée : ${method}` },
        },
        newSessionId: undefined,
      };
    }

    return { response: { jsonrpc: "2.0", id: reqId, result }, newSessionId: undefined };
  } finally {
    await client.close();
    await server.close();
  }
}

// Gestion des requêtes GET (SSE Streamable HTTP vs SSE Legacy)
const handleSseConnection = async (req: express.Request, res: express.Response) => {
  const sessionId = (req.headers["mcp-session-id"] as string) || (req.query.sessionId as string);

  // Cas 1 : Streamable HTTP (Open WebUI envoie un Mcp-Session-Id sur le canal GET SSE)
  if (sessionId) {
    console.log(`[MCP Streamable HTTP SSE] Écouteur ouvert pour la session : ${sessionId}`);
    res.setHeader("Content-Type", "text/event-stream");
    res.setHeader("Cache-Control", "no-cache");
    res.setHeader("Connection", "keep-alive");
    res.flushHeaders();

    req.on("close", () => {
      console.log(`[MCP Streamable HTTP SSE] Écouteur fermé pour la session : ${sessionId}`);
      res.end();
    });
    return;
  }

  // Cas 2 : Transport SSE Legacy standard (Sans session Streamable HTTP préalable)
  console.log("[MCP SSE Legacy] Ouverture d'une session SSE...");
  res.setHeader("Content-Type", "text/event-stream");
  res.setHeader("Cache-Control", "no-cache");
  res.setHeader("Connection", "keep-alive");

  const server = createRawMcpServer();
  const transport = new SSEServerTransport("/mcp/messages", res);

  transports_map.set(transport.sessionId, transport);

  const keepAliveInterval = setInterval(() => {
    if (!res.writableEnded) {
      res.write(": keepalive\n\n");
    }
  }, 15000);

  transport.onclose = () => {
    console.log(`[MCP SSE Legacy] Fermeture session : ${transport.sessionId}`);
    clearInterval(keepAliveInterval);
    transports_map.delete(transport.sessionId);
  };

  await server.connect(transport);
};

app.get("/mcp", handleSseConnection);
app.get("/mcp/sse", handleSseConnection);
app.get("/sse", handleSseConnection);

// Gestion des requêtes POST (Streamable HTTP / SSE Post Messages)
const handlePostMessage = async (req: express.Request, res: express.Response) => {
  console.log("[MCP POST BODY]", JSON.stringify(req.body, null, 2));

  if (req.body && req.body.id === undefined && req.body.method?.startsWith("notifications/")) {
    return res.status(204).end();
  }

  const sessionId = (req.query.sessionId as string) || (req.headers["mcp-session-id"] as string);
  const transport = sessionId ? transports_map.get(sessionId) : undefined;

  if (transport) {
    try {
      await transport.handlePostMessage(req, res, req.body);
      return;
    } catch (err) {
      console.warn("[MCP SSE] Erreur SSE, bascule en mode sans état.");
    }
  }

  try {
    const { response, newSessionId } = await processStatelessMcpRequest(req.body, sessionId);

    // Injection du Mcp-Session-Id obligatoire dans TOUTES les réponses HTTP POST
    const activeSessionId = newSessionId || sessionId;
    if (activeSessionId) {
      res.setHeader("Mcp-Session-Id", activeSessionId);
    }

    if (response === null) {
      return res.status(204).end();
    }

    console.log("[MCP RESPONSE]", JSON.stringify(response, null, 2));
    return res.json(response);
  } catch (err: any) {
    console.error("[MCP Bridge] Erreur d'exécution :", err);
    return res.status(500).json({
      jsonrpc: "2.0",
      id: req.body?.id ?? null,
      error: { code: -32603, message: err?.message || "Erreur interne" },
    });
  }
};

app.post("/mcp", handlePostMessage);
app.post("/mcp/sse", handlePostMessage);
app.post("/sse", handlePostMessage);
app.post("/mcp/messages", handlePostMessage);
app.post("/messages", handlePostMessage);

// Gestion de la terminaison de session Streamable HTTP (DELETE)
const handleDeleteSession = (req: express.Request, res: express.Response) => {
  const sessionId = (req.headers["mcp-session-id"] as string) || (req.query.sessionId as string);
  console.log(`[MCP DELETE] Demande de fermeture de session : ${sessionId || "sans ID"}`);

  if (sessionId && transports_map.has(sessionId)) {
    transports_map.delete(sessionId);
  }

  return res.status(200).json({ status: "ok" });
};

app.delete("/mcp", handleDeleteSession);
app.delete("/mcp/sse", handleDeleteSession);
app.delete("/sse", handleDeleteSession);

app.get("/api/health", (_req, res) => {
  res.json({ status: "ok", activeSessions: transports_map.size });
});

app.listen(PORT, "0.0.0.0", () => {
  console.log(`Serveur MCP hybride actif sur http://0.0.0.0:${PORT}/mcp`);
});