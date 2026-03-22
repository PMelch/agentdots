import { describe, it } from "node:test";
import assert from "node:assert/strict";
import type { McpServerConfig } from "../../dist/mcp/types.js";

// Helper: a stdio server config
function stdioServer(name = "test-server"): McpServerConfig {
  return {
    name,
    transport: "stdio",
    command: "npx",
    args: ["-y", "@test/mcp-server"],
    env: { API_KEY: "secret" },
  };
}

// Helper: an http server config
function httpServer(name = "remote-server"): McpServerConfig {
  return {
    name,
    transport: "http",
    url: "https://api.example.com/mcp",
    headers: { Authorization: "Bearer token123" },
  };
}

describe("claude-code mapper", () => {
  it("toUnified parses mcpServers wrapper format", async () => {
    const { claudeCodeMapper } = await import("../../dist/mcp/mapper.js");
    const raw = {
      mcpServers: {
        "my-server": {
          command: "npx",
          args: ["-y", "@test/mcp"],
          env: { KEY: "val" },
        },
      },
    };
    const result = claudeCodeMapper.toUnified(raw);
    assert.equal(result.length, 1);
    assert.equal(result[0].name, "my-server");
    assert.equal(result[0].transport, "stdio");
    assert.equal(result[0].command, "npx");
    assert.deepEqual(result[0].args, ["-y", "@test/mcp"]);
    assert.deepEqual(result[0].env, { KEY: "val" });
  });

  it("toUnified parses http servers", async () => {
    const { claudeCodeMapper } = await import("../../dist/mcp/mapper.js");
    const raw = {
      mcpServers: {
        remote: {
          type: "http",
          url: "https://api.example.com/mcp",
          headers: { Authorization: "Bearer tok" },
        },
      },
    };
    const result = claudeCodeMapper.toUnified(raw);
    assert.equal(result.length, 1);
    assert.equal(result[0].name, "remote");
    assert.equal(result[0].transport, "http");
    assert.equal(result[0].url, "https://api.example.com/mcp");
    assert.deepEqual(result[0].headers, { Authorization: "Bearer tok" });
  });

  it("toUnified handles top-level http servers (plugin format)", async () => {
    const { claudeCodeMapper } = await import("../../dist/mcp/mapper.js");
    const raw = {
      "github-mcp": {
        type: "http",
        url: "https://api.githubcopilot.com/mcp/",
      },
    };
    const result = claudeCodeMapper.toUnified(raw);
    assert.equal(result.length, 1);
    assert.equal(result[0].name, "github-mcp");
    assert.equal(result[0].transport, "http");
  });

  it("fromUnified produces mcpServers format", async () => {
    const { claudeCodeMapper } = await import("../../dist/mcp/mapper.js");
    const configs = [stdioServer("srv1"), httpServer("srv2")];
    const raw = claudeCodeMapper.fromUnified(configs) as Record<string, unknown>;
    const servers = raw.mcpServers as Record<string, Record<string, unknown>>;
    assert.ok(servers);
    assert.ok(servers["srv1"]);
    assert.equal(servers["srv1"].command, "npx");
    assert.ok(servers["srv2"]);
    assert.equal(servers["srv2"].type, "http");
    assert.equal(servers["srv2"].url, "https://api.example.com/mcp");
  });

  it("round-trip preserves data", async () => {
    const { claudeCodeMapper } = await import("../../dist/mcp/mapper.js");
    const original = [stdioServer(), httpServer()];
    const raw = claudeCodeMapper.fromUnified(original);
    const restored = claudeCodeMapper.toUnified(raw as Record<string, unknown>);
    assert.equal(restored.length, 2);
    assert.deepEqual(restored[0].name, original[0].name);
    assert.deepEqual(restored[0].command, original[0].command);
    assert.deepEqual(restored[1].url, original[1].url);
  });
});

describe("cursor mapper", () => {
  it("toUnified parses mcpServers format", async () => {
    const { cursorMapper } = await import("../../dist/mcp/mapper.js");
    const raw = {
      mcpServers: {
        server1: { command: "node", args: ["index.js"] },
      },
    };
    const result = cursorMapper.toUnified(raw);
    assert.equal(result.length, 1);
    assert.equal(result[0].name, "server1");
    assert.equal(result[0].transport, "stdio");
    assert.equal(result[0].command, "node");
  });

  it("fromUnified produces mcpServers format", async () => {
    const { cursorMapper } = await import("../../dist/mcp/mapper.js");
    const raw = cursorMapper.fromUnified([stdioServer()]) as Record<string, unknown>;
    const servers = raw.mcpServers as Record<string, Record<string, unknown>>;
    assert.ok(servers["test-server"]);
    assert.equal(servers["test-server"].command, "npx");
  });
});

describe("copilot mapper", () => {
  it("toUnified parses mcpServers with type field", async () => {
    const { copilotMapper } = await import("../../dist/mcp/mapper.js");
    const raw = {
      mcpServers: {
        srv: { type: "local", command: "bun", args: ["run", "start"], tools: ["*"] },
      },
    };
    const result = copilotMapper.toUnified(raw);
    assert.equal(result.length, 1);
    assert.equal(result[0].transport, "stdio");
    assert.equal(result[0].command, "bun");
  });

  it("fromUnified preserves copilot-specific fields", async () => {
    const { copilotMapper } = await import("../../dist/mcp/mapper.js");
    const raw = copilotMapper.fromUnified([stdioServer()]) as Record<string, unknown>;
    const servers = raw.mcpServers as Record<string, Record<string, unknown>>;
    assert.ok(servers["test-server"]);
  });
});

describe("gemini mapper", () => {
  it("toUnified parses mcpServers format with env", async () => {
    const { geminiMapper } = await import("../../dist/mcp/mapper.js");
    const raw = {
      mcpServers: {
        myserver: { command: "python", args: ["-m", "server"], env: { PORT: "8080" } },
      },
    };
    const result = geminiMapper.toUnified(raw);
    assert.equal(result.length, 1);
    assert.equal(result[0].command, "python");
    assert.deepEqual(result[0].env, { PORT: "8080" });
  });

  it("fromUnified produces mcpServers format", async () => {
    const { geminiMapper } = await import("../../dist/mcp/mapper.js");
    const raw = geminiMapper.fromUnified([stdioServer()]) as Record<string, unknown>;
    assert.ok((raw as Record<string, unknown>).mcpServers);
  });
});

describe("opencode mapper", () => {
  it("toUnified parses mcpServers format", async () => {
    const { opencodeMapper } = await import("../../dist/mcp/mapper.js");
    const raw = {
      mcpServers: {
        srv: { command: "node", args: ["server.js"], env: {} },
      },
    };
    const result = opencodeMapper.toUnified(raw);
    assert.equal(result.length, 1);
    assert.equal(result[0].name, "srv");
  });
});

describe("windsurf mapper", () => {
  it("toUnified parses mcpServers format", async () => {
    const { windsurfMapper } = await import("../../dist/mcp/mapper.js");
    const raw = {
      mcpServers: {
        ws: { command: "npx", args: ["@ws/mcp"] },
      },
    };
    const result = windsurfMapper.toUnified(raw);
    assert.equal(result.length, 1);
    assert.equal(result[0].name, "ws");
    assert.equal(result[0].transport, "stdio");
  });

  it("fromUnified produces mcpServers format", async () => {
    const { windsurfMapper } = await import("../../dist/mcp/mapper.js");
    const raw = windsurfMapper.fromUnified([stdioServer()]) as Record<string, unknown>;
    assert.ok((raw as Record<string, unknown>).mcpServers);
  });
});

describe("codex mapper", () => {
  it("toUnified parses mcpServers format", async () => {
    const { codexMapper } = await import("../../dist/mcp/mapper.js");
    const raw = {
      mcpServers: {
        cx: { command: "node", args: ["srv.js"] },
      },
    };
    const result = codexMapper.toUnified(raw);
    assert.equal(result.length, 1);
    assert.equal(result[0].name, "cx");
  });
});

describe("mapper registry", () => {
  it("getMapper returns mapper for known agents", async () => {
    const { getMapper } = await import("../../dist/mcp/mapper.js");
    const agentIds = ["claude-code", "cursor", "copilot", "gemini", "opencode", "windsurf", "codex"];
    for (const id of agentIds) {
      const mapper = getMapper(id);
      assert.ok(mapper, `mapper for ${id} should exist`);
      assert.equal(mapper!.agentId, id);
    }
  });

  it("getMapper returns undefined for non-MCP agents", async () => {
    const { getMapper } = await import("../../dist/mcp/mapper.js");
    assert.equal(getMapper("aider"), undefined);
    assert.equal(getMapper("pi"), undefined);
    assert.equal(getMapper("unknown"), undefined);
  });
});
