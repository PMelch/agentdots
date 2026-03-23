import { test, expect } from "bun:test";
import { startServer } from "../../src/web/server.ts";

test("API: GET /api/agents returns an array", async () => {
  const server = await startServer(0); // Random port
  const address = server.address() as any;
  const port = address.port;

  try {
    const res = await fetch(`http://localhost:${port}/api/agents`);
    expect(res.status).toBe(200);
    const data = await res.json();
    expect(Array.isArray(data)).toBe(true);
  } finally {
    server.close();
  }
});

test("API: GET /api/config returns config object", async () => {
  const server = await startServer(0);
  const address = server.address() as any;
  const port = address.port;

  try {
    const res = await fetch(`http://localhost:${port}/api/config`);
    expect(res.status).toBe(200);
    const data = await res.json();
    expect(data).toHaveProperty("version");
    expect(data).toHaveProperty("globalConfigDir");
  } finally {
    server.close();
  }
});
