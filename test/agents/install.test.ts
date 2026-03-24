import { describe, it } from "node:test";
import assert from "node:assert/strict";
import { resolveInstallInfo } from "../../src/agents/install.js";

describe("resolveInstallInfo", () => {
  it("returns npm method for claude-code", () => {
    const result = resolveInstallInfo("claude-code");
    assert.equal(result.method, "npm");
    assert.ok(result.command?.includes("npm install -g"));
    assert.ok(result.command?.includes("@anthropic-ai/claude-code"));
  });

  it("returns npm method for codex", () => {
    const result = resolveInstallInfo("codex");
    assert.equal(result.method, "npm");
    assert.ok(result.command?.includes("npm install -g"));
    assert.ok(result.command?.includes("@openai/codex"));
  });

  it("returns pip method for aider", () => {
    const result = resolveInstallInfo("aider");
    assert.equal(result.method, "pip");
    assert.ok(result.command?.includes("pip install"));
    assert.ok(result.command?.includes("aider-chat"));
  });

  it("returns manual with downloadUrl for cursor", () => {
    const result = resolveInstallInfo("cursor");
    assert.equal(result.method, "manual");
    assert.ok(result.downloadUrl?.includes("cursor.com"));
  });

  it("returns manual with downloadUrl for windsurf", () => {
    const result = resolveInstallInfo("windsurf");
    assert.equal(result.method, "manual");
    assert.ok(result.downloadUrl?.includes("windsurf.com"));
  });

  it("returns manual with downloadUrl for zed", () => {
    const result = resolveInstallInfo("zed");
    assert.equal(result.method, "manual");
    assert.ok(result.downloadUrl?.includes("zed.dev"));
  });

  it("returns manual with downloadUrl for roo-code", () => {
    const result = resolveInstallInfo("roo-code");
    assert.equal(result.method, "manual");
    assert.ok(result.downloadUrl?.includes("marketplace.visualstudio.com"));
  });

  it("returns manual with downloadUrl for copilot", () => {
    const result = resolveInstallInfo("copilot");
    assert.equal(result.method, "manual");
    assert.ok(result.downloadUrl?.includes("marketplace.visualstudio.com"));
    assert.ok(result.downloadUrl?.includes("copilot"));
  });

  it("returns error for unknown agent", () => {
    const result = resolveInstallInfo("unknown-xyz-agent");
    assert.equal(result.success, false);
    assert.ok(result.error);
  });

  it("success is false before execution", () => {
    const result = resolveInstallInfo("claude-code");
    assert.equal(result.success, false);
  });

  it("agentId matches input", () => {
    const result = resolveInstallInfo("gemini");
    assert.equal(result.agentId, "gemini");
  });
});
