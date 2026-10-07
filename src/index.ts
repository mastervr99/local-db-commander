#!/usr/bin/env node
import express from "express";
import cors from "cors";
import crypto from "crypto";
import { McpServer } from "@modelcontextprotocol/sdk/server/mcp.js";

import { registerAddItemTool } from "./tools/addItem.js";
import { registerListItemsTool } from "./tools/listItems.js";
import { registerUpdateStockTool } from "./tools/updateStock.js";
import { registerDeleteItemTool } from "./tools/deleteItem.js";


import { TOOL_SCHEMAS } from "../security/sanitize.js";
import { zodToJsonSchema} from "zod-to-json-schema";

const PORT = Number(process.env.PORT) || 8000;

const server = new McpServer({
  name: "postgres-mcp",
  version: "1.0.0",
});

// Enregistrement des outils, prompts et ressources
registerAddItemTool(server);
registerListItemsTool(server);
registerUpdateStockTool(server);
registerDeleteItemTool(server);


const app = express();

app.use(
  cors({
    origin: "*",
    exposedHeaders: ["Mcp-Session-Id", "Content-Type"],
  })
);
app.use(express.json());

app.use((req, _res, next) => {
  console.log(`[HTTP REQ] ${req.method}) ${req.path}`);
  next();
});

const activeSessions = new Set();

function getRegisteredTools(): { [key: string]: any } {
  const rawTools =
    (server as any)._registeredTools || (server as any)._tools || {};

  if (rawTools instanceof Map) {
    const toolsObj: { [key: string]: any } = {};
    for (const [key, value] of rawTools.entries()) {
      toolsObj[key] = value;
    }
    return toolsObj;
  }

  return rawTools as { [key: string]: any };
}

// Registre explicite des schémas JSON pour contourner le stockage interne encapsulé du SDK
const explicitToolSchemas: Record<string, any> = Object.entries(TOOL_SCHEMAS).reduce(
  (acc, [name, zodSchema])=>{
    const raw_json_schema = zodToJsonSchema(zodSchema, {
      $refStrategy: "none",
    });

    const { $schema, ...clean_json_schema } = raw_json_schema as Record<string, any>;

    acc[name] = clean_json_schema;

    return acc;
  },
  {} as Record<string, any>
);

async function handleStatelessRequest(body: any) {
  const { method, params, id } = body || {};
  const reqId = id !== undefined ? id : null;

  console.log(`[MCP JSON-RPC] Méthode reçue : ${method}`);

  if (method === "initialize") {
    const clientVersion = params?.protocolVersion || "2024-11-05";
    const generatedSessionId = crypto.randomUUID();
    activeSessions.add(generatedSessionId);

    return {
      response: {
        jsonrpc: "2.0",
        id: reqId ?? 1,
        result: {
          protocolVersion: clientVersion,
          capabilities: {
            tools: { listChanged: false },
            resources: { subscribe: false, listChanged: false },
            prompts: { listChanged: false },
          },
          serverInfo: { name: "postgres-mcp", version: "1.0.0" },
        },
      },
      sessionId: generatedSessionId,
    };
  }

  if ( method === "notifications/initialized" || method?.startsWith("notifications/")) {
    return { response: null, sessionId: undefined };
  }

  if (method === "ping") {
    return {
      response: { jsonrpc: "2.0", id: reqId ?? 1, result: {} },
      sessionId: undefined,
    };
  }

  if (method === "tools/list") {
    const registeredTools = getRegisteredTools();
    const toolList = [];

    for (const [name, toolObj] of Object.entries(registeredTools)) {
      const tool = toolObj as any;
      const description =
        tool?.description ||
        tool?.config?.description ||
        tool?.inputSchema?.description ||
        "";

      // Utilisation directe du registre explicite garanti
      const formattedSchema = explicitToolSchemas[name] || { type: "object", properties: {} };

      toolList.push({
        name,
        description,
        inputSchema: formattedSchema,
      });
    }

    console.log(
      `[MCP tools/list] Schémas générés :\n`,
      JSON.stringify(toolList, null, 2)
    );

    return {
      response: { jsonrpc: "2.0", id: reqId, result: { tools: toolList } },
      sessionId: undefined,
    };
  }

  if (method === "tools/call") {
    const toolName = params?.name;
    const toolArgs = params?.arguments || {};

    console.log(
      `[MCP] Exécution de l'outil ${toolName} avec arguments :`,
      JSON.stringify(toolArgs)
    );

    const registeredTools = getRegisteredTools();
    const toolObj = registeredTools[toolName] as any;

    if (!toolObj) {
      return {
        response: {
          jsonrpc: "2.0",
          id: reqId,
          error: { code: -32601, message: `Outil non trouvé : ${toolName}` },
        },
        sessionId: undefined,
      };
    }

    try {
      let result;
      const fn =
        toolObj.execute ||
        toolObj.handler ||
        toolObj.cb ||
        toolObj.callback ||
        toolObj.config?.execute ||
        toolObj.config?.handler ||
        toolObj.config?.cb ||
        toolObj.config?.callback;

      if (typeof fn === "function") {
        result = await fn(toolArgs);
      } else {
        throw new Error(
          `Aucune fonction d'exécution trouvée pour l'outil ${toolName}`
        );
      }

      console.log(`[MCP] Succès exécution outil : ${toolName}`);
      return {
        response: { jsonrpc: "2.0", id: reqId, result },
        sessionId: undefined,
      };
    } catch (err: any) {
      console.error(`[MCP] Échec exécution outil ${toolName} :`, err);
      return {
        response: {
          jsonrpc: "2.0",
          id: reqId,
          error: {
            code: -32603,
            message: err?.message || "Erreur lors de l'exécution",
          },
        },
        sessionId: undefined,
      };
    }
  }

  return {
    response: {
      jsonrpc: "2.0",
      id: reqId,
      error: { code: -32601, message: `Méthode non supportée : ${method}` },
    },
    sessionId: undefined,
  };
}

app.get("/mcp", (req, res) => {
  res.setHeader("Content-Type", "text/event-stream");
  res.setHeader("Cache-Control", "no-cache");
  res.setHeader("Connection", "keep-alive");
  res.flushHeaders();

  const keepAlive = setInterval(() => {
    if (!res.writableEnded) {
      res.write(": keepalive\n\n");
    }
  }, 15000);

  req.on("close", () => {
    clearInterval(keepAlive);
    res.end();
  });
});

app.post("/mcp", async (req, res) => {
  const sessionId =
    (req.query.sessionId as string) ||
    (req.headers["mcp-session-id"] as string);

  try {
    const { response, sessionId: newSessionId } = await handleStatelessRequest(
      req.body
    );
    const activeSessionId = newSessionId || sessionId;

    if (activeSessionId) {
      res.setHeader("Mcp-Session-Id", activeSessionId);
    }

    if (response === null) {
      return res.status(204).end();
    }

    return res.json(response);

  } catch (err: any) {
    console.error("[MCP Post] Erreur :", err);
    return res.status(500).json({
      jsonrpc: "2.0",
      id: req.body?.id ?? null,
      error: { code: -32603, message: err?.message || "Erreur interne" },
    });
  }
});

app.delete("/mcp", (req, res) => {
  const sessionId =
    (req.headers["mcp-session-id"] as string) ||
    (req.query.sessionId as string);
  if (sessionId) {
    activeSessions.delete(sessionId);
  }
  return res.status(200).json({ status: "ok" });
});

app.listen(PORT, "0.0.0.0", () => {
  console.log(`Serveur MCP actif sur http://0.0.0.0:${PORT}/mcp`);
});