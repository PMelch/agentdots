import test from "node:test";
import assert from "node:assert/strict";
import { handleApiRequest } from "../../src/web/api.ts";
import { registry } from "../../src/agents/registry.ts";

function createReq(url: string, method = "GET") {
  return {
    url,
    method,
    headers: { host: "localhost" },
  } as any;
}

function createRes() {
  return {
    statusCode: 200,
    headers: {},
    body: "",
    writeHead(status: number, headers: Record<string, string>) {
      this.statusCode = status;
      this.headers = headers;
    },
    end(chunk?: string) {
      this.body = chunk ?? "";
    },
  } as any;
}

test("API: GET /api/agents returns installed status without versions", async () => {
  const original = registry.detectInstalledAll;
  registry.detectInstalledAll = async () => ([
    {
      id: "codex",
      name: "Codex",
      installed: true,
      configPaths: [],
      configFormat: "toml",
      capabilities: ["mcp", "rules"],
    },
  ]);

  try {
    const req = createReq("/api/agents");
    const res = createRes();
    await handleApiRequest(req, res);
    assert.equal(res.statusCode, 200);
    const data = JSON.parse(res.body);
    assert.equal(Array.isArray(data), true);
    assert.equal(data[0].version, undefined);
  } finally {
    registry.detectInstalledAll = original;
  }
});

test("API: GET /api/agents/:id returns full agent details", async () => {
  const original = registry.detect;
  registry.detect = async () => ({
    id: "codex",
    name: "Codex",
    installed: true,
    version: "1.2.3",
    binaryPath: "/usr/local/bin/codex",
    configPaths: [],
    configFormat: "toml",
    capabilities: ["mcp", "rules"],
  });

  try {
    const req = createReq("/api/agents/codex");
    const res = createRes();
    await handleApiRequest(req, res);
    assert.equal(res.statusCode, 200);
    const data = JSON.parse(res.body);
    assert.equal(data.id, "codex");
    assert.equal(data.version, "1.2.3");
  } finally {
    registry.detect = original;
  }
});

test("API: GET /api/config returns config object", async () => {
  const req = createReq("/api/config");
  const res = createRes();
  await handleApiRequest(req, res);
  assert.equal(res.statusCode, 200);
  const data = JSON.parse(res.body);
  assert.ok("version" in data);
  assert.ok("globalConfigDir" in data);
});
