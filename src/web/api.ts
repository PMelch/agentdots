import { IncomingMessage, ServerResponse } from "node:http";
import { join } from "node:path";
import { homedir } from "node:os";
import { registry } from "../agents/registry.js";
import { RulesManager } from "../rules/manager.js";
import { SkillsManager } from "../skills/manager.js";
import { McpManager } from "../mcp/manager.js";
import { getAllProviders, getProvider } from "../updates/providers.js";
import { checkUpdates } from "../updates/checker.js";
import { executeUpdates } from "../updates/executor.js";
import { runCommand } from "../updates/runner.js";

export async function handleApiRequest(req: IncomingMessage, res: ServerResponse) {
  const url = new URL(req.url!, `http://${req.headers.host}`);
  const path = url.pathname;
  const method = req.method;

  try {
    // Helper to send JSON response
    const sendJson = (data: any, status = 200) => {
      res.writeHead(status, { "Content-Type": "application/json" });
      res.end(JSON.stringify(data));
    };

    // --- Agents ---
    if (path === "/api/agents" && method === "GET") {
      const agents = await registry.detectAll();
      return sendJson(agents);
    }

    if (path.startsWith("/api/agents/") && method === "GET") {
      const id = path.split("/").pop();
      if (!id) return sendJson({ error: "Missing agent ID" }, 400);
      const agent = await registry.detect(id);
      if (!agent) return sendJson({ error: "Agent not found" }, 404);
      return sendJson(agent);
    }

    // --- Rules ---
    if (path === "/api/rules" && method === "GET") {
      const scope = (url.searchParams.get("scope") as "global" | "project") || "project";
      const manager = getRulesManager(scope);
      const rules = await manager.loadRules(scope);
      return sendJson(rules);
    }

    if (path === "/api/rules/sync" && method === "POST") {
      const scope = (url.searchParams.get("scope") as "global" | "project") || "project";
      const agentId = url.searchParams.get("agentId");
      const manager = getRulesManager(scope);
      
      if (agentId) {
        const path = await manager.syncToAgent(agentId, scope);
        return sendJson({ success: true, path });
      } else {
        const synced = await manager.syncToAll(scope);
        return sendJson({ success: true, synced });
      }
    }

    if (path.startsWith("/api/rules/diff/") && method === "GET") {
      const agentId = path.split("/").pop();
      const scope = (url.searchParams.get("scope") as "global" | "project") || "project";
      if (!agentId) return sendJson({ error: "Missing agent ID" }, 400);
      const manager = getRulesManager(scope);
      const diff = await manager.diff(agentId, scope);
      return sendJson(diff);
    }

    // --- Skills ---
    if (path === "/api/skills" && method === "GET") {
      const scope = (url.searchParams.get("scope") as "global" | "project") || "project";
      const manager = getSkillsManager(scope);
      const skills = await manager.loadSkills(scope);
      return sendJson(skills);
    }

    if (path === "/api/skills/sync" && method === "POST") {
      const scope = (url.searchParams.get("scope") as "global" | "project") || "project";
      const agentId = url.searchParams.get("agentId");
      const manager = getSkillsManager(scope);

      if (agentId) {
        const path = await manager.syncToAgent(agentId, scope);
        return sendJson({ success: true, path });
      } else {
        const synced = await manager.syncToAll(scope);
        return sendJson({ success: true, synced });
      }
    }

    if (path.startsWith("/api/skills/diff/") && method === "GET") {
      const agentId = path.split("/").pop();
      const scope = (url.searchParams.get("scope") as "global" | "project") || "project";
      if (!agentId) return sendJson({ error: "Missing agent ID" }, 400);
      const manager = getSkillsManager(scope);
      const diff = await manager.diff(agentId, scope);
      return sendJson(diff);
    }

    // --- MCP ---
    if (path === "/api/mcp" && method === "GET") {
      const scope = (url.searchParams.get("scope") as "global" | "project") || "global";
      const manager = getMcpManager(scope);
      const configs = await manager.loadConfigs();
      return sendJson(configs);
    }

    if (path === "/api/mcp/sync" && method === "POST") {
      const scope = (url.searchParams.get("scope") as "global" | "project") || "global";
      const agentId = url.searchParams.get("agentId");
      if (!agentId) return sendJson({ error: "Missing agent ID" }, 400);
      
      const manager = getMcpManager(scope);
      const agentConfig = await manager.buildAgentConfig(agentId);
      
      // In a real app, we'd use the mapper to get the path and write it
      // For now, let's keep it consistent with CLI
      const { getMapper } = await import("../mcp/mapper.js");
      const mapper = getMapper(agentId);
      if (!mapper) return sendJson({ error: `Agent ${agentId} does not support MCP` }, 400);
      
      const agentConfigPath = mapper.configPath(scope);
      const { mkdir, writeFile } = await import("node:fs/promises");
      const { dirname } = await import("node:path");
      await mkdir(dirname(agentConfigPath), { recursive: true });
      await writeFile(agentConfigPath, JSON.stringify(agentConfig, null, 2));
      
      return sendJson({ success: true, path: agentConfigPath });
    }

    // --- Updates ---
    if (path === "/api/updates" && method === "GET") {
      const agents = (await registry.detectAll()).filter((a) => a.installed);
      const providers = getAllProviders();
      const results = await checkUpdates(agents, providers);
      return sendJson(results);
    }

    if (path.startsWith("/api/updates/") && method === "POST") {
      const id = path.split("/").pop();
      if (!id) return sendJson({ error: "Missing agent ID" }, 400);

      const agent = await registry.detect(id);
      if (!agent || !agent.installed) return sendJson({ error: "Agent not found or not installed" }, 404);

      const provider = getProvider(id);
      const providers = provider ? [provider] : [];
      const results = await checkUpdates([agent], providers);
      
      const report = await executeUpdates(results, {
        yes: true, // Always yes from Web UI for now
        runCommand,
        confirm: async () => true,
      });

      return sendJson(report[0]);
    }

    // --- Config (Placeholder for now) ---
    if (path === "/api/config") {
      if (method === "GET") {
        return sendJson({ 
          version: "0.1.0",
          globalConfigDir: join(homedir(), ".agentdots"),
          projectConfigDir: ".agentdots"
        });
      }
      if (method === "PUT") {
        // Placeholder for updating config
        return sendJson({ success: true, message: "Config update not yet implemented" });
      }
    }

    // 404 for other API routes
    sendJson({ error: "Not Found" }, 404);

  } catch (error: any) {
    console.error(`API Error: ${error.message}`);
    res.writeHead(500, { "Content-Type": "application/json" });
    res.end(JSON.stringify({ error: error.message }));
  }
}

// Helpers to instantiate managers with correct paths
function getRulesManager(scope: "global" | "project") {
  const dir = scope === "project" ? join(".agentdots", "rules") : join(homedir(), ".agentdots", "rules");
  return new RulesManager(dir);
}

function getSkillsManager(scope: "global" | "project") {
  const dir = scope === "project" ? join(".agentdots", "skills") : join(homedir(), ".agentdots", "skills");
  return new SkillsManager(dir);
}

function getMcpManager(scope: "global" | "project") {
  const dir = scope === "project" ? join(".agentdots", "mcp") : join(homedir(), ".agentdots", "mcp");
  return new McpManager(dir);
}
