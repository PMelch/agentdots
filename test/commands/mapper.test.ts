import { describe, it } from "node:test";
import assert from "node:assert/strict";
import { homedir } from "node:os";
import { join } from "node:path";

describe("getMapper / getAllMappers registry", () => {
  it("returns mapper for claude-code", async () => {
    const { getMapper } = await import("../../dist/commands/mappers.js");
    const mapper = getMapper("claude-code");
    assert.ok(mapper, "missing mapper for claude-code");
    assert.equal(mapper.agentId, "claude-code");
  });

  it("returns mapper for cursor", async () => {
    const { getMapper } = await import("../../dist/commands/mappers.js");
    const mapper = getMapper("cursor");
    assert.ok(mapper, "missing mapper for cursor");
    assert.equal(mapper.agentId, "cursor");
  });

  it("returns undefined for unknown agent", async () => {
    const { getMapper } = await import("../../dist/commands/mappers.js");
    assert.equal(getMapper("unknown"), undefined);
    assert.equal(getMapper("aider"), undefined);
  });

  it("getAllMappers returns 2 mappers", async () => {
    const { getAllMappers } = await import("../../dist/commands/mappers.js");
    const mappers = getAllMappers();
    assert.equal(mappers.length, 2);
  });

  it("claude-code project path uses .claude/commands", async () => {
    const { getMapper } = await import("../../dist/commands/mappers.js");
    const mapper = getMapper("claude-code")!;
    assert.ok(
      mapper.commandsPath("project").endsWith(join(".claude", "commands")),
      "wrong claude-code project path"
    );
  });

  it("claude-code global path uses ~/.claude/commands", async () => {
    const { getMapper } = await import("../../dist/commands/mappers.js");
    const mapper = getMapper("claude-code")!;
    assert.equal(
      mapper.commandsPath("global"),
      join(homedir(), ".claude", "commands")
    );
  });

  it("cursor project path uses .cursor/commands", async () => {
    const { getMapper } = await import("../../dist/commands/mappers.js");
    const mapper = getMapper("cursor")!;
    assert.ok(
      mapper.commandsPath("project").endsWith(join(".cursor", "commands")),
      "wrong cursor project path"
    );
  });

  it("cursor has no global path", async () => {
    const { getMapper } = await import("../../dist/commands/mappers.js");
    const mapper = getMapper("cursor")!;
    assert.equal(mapper.commandsPath("global"), "");
  });
});
