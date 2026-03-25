import { describe, it } from "node:test";
import assert from "node:assert/strict";

describe("parseReadme", () => {
  it("extracts skill links from markdown list items", async () => {
    const { parseReadme } = await import("../../dist/marketplace/registries/github.js");
    const readme = [
      "# Awesome Skills",
      "",
      "## Skills",
      "",
      "- [TDD Protocol](https://github.com/user/tdd-skill) - Test-driven development workflow",
      "- [Code Reviewer](https://github.com/user/reviewer) - Automated code review",
      "- [Not a skill](https://example.com/non-github) - should be filtered",
    ].join("\n");

    const skills = parseReadme(readme, "testauthor");

    assert.equal(skills.length, 2);
    assert.equal(skills[0].name, "TDD Protocol");
    assert.equal(skills[0].slug, "tdd-protocol");
    assert.equal(skills[0].description, "Test-driven development workflow");
    assert.equal(skills[0].author, "testauthor");
    assert.equal(skills[0].source, "github");
    assert.equal(skills[1].name, "Code Reviewer");
    assert.equal(skills[1].slug, "code-reviewer");
  });

  it("handles list items without descriptions", async () => {
    const { parseReadme } = await import("../../dist/marketplace/registries/github.js");
    const readme = "- [My Skill](https://github.com/user/skill)";
    const skills = parseReadme(readme, "author");

    assert.equal(skills.length, 1);
    assert.equal(skills[0].name, "My Skill");
    assert.equal(skills[0].description, "");
  });

  it("accepts * as list marker", async () => {
    const { parseReadme } = await import("../../dist/marketplace/registries/github.js");
    const readme = "* [My Skill](https://github.com/user/skill) - desc";
    const skills = parseReadme(readme, "author");

    assert.equal(skills.length, 1);
  });

  it("ignores non-list lines", async () => {
    const { parseReadme } = await import("../../dist/marketplace/registries/github.js");
    const readme = [
      "# Header",
      "[not a list](https://github.com/user/skill)",
      "- [List item](https://github.com/user/skill2) - desc",
    ].join("\n");

    const skills = parseReadme(readme, "author");
    assert.equal(skills.length, 1);
    assert.equal(skills[0].name, "List item");
  });

  it("generates slugs correctly", async () => {
    const { parseReadme } = await import("../../dist/marketplace/registries/github.js");
    const readme = "- [My Awesome Skill!](https://github.com/u/r) - d";
    const [skill] = parseReadme(readme, "a");

    assert.equal(skill.slug, "my-awesome-skill");
  });
});

describe("GitHubRegistry", () => {
  it("list() returns parsed skills from all curated repos", async () => {
    const { GitHubRegistry } = await import("../../dist/marketplace/registries/github.js");

    const mockFetch = async (_url: string) => ({
      ok: true,
      text: async () =>
        "- [TDD Protocol](https://github.com/user/tdd) - TDD workflow\n" +
        "- [Reviewer](https://github.com/user/rev) - Review skill\n",
    });

    const registry = new GitHubRegistry({ _fetch: mockFetch });
    const skills = await registry.list();

    // Both repos return same URLs — dedup leaves 2 unique skills
    assert.ok(skills.length >= 2);
    assert.ok(skills.some((s) => s.name === "TDD Protocol"));
    assert.ok(skills.some((s) => s.name === "Reviewer"));
  });

  it("search() filters by name and description", async () => {
    const { GitHubRegistry } = await import("../../dist/marketplace/registries/github.js");

    const mockFetch = async (_url: string) => ({
      ok: true,
      text: async () =>
        "- [TDD Protocol](https://github.com/user/tdd) - TDD workflow\n" +
        "- [Reviewer](https://github.com/user/rev) - Review skill\n",
    });

    const registry = new GitHubRegistry({ _fetch: mockFetch });
    const results = await registry.search("tdd");

    assert.ok(results.length > 0);
    assert.ok(
      results.every(
        (s) =>
          s.name.toLowerCase().includes("tdd") ||
          s.description.toLowerCase().includes("tdd")
      )
    );
  });

  it("list() handles fetch errors gracefully", async () => {
    const { GitHubRegistry } = await import("../../dist/marketplace/registries/github.js");

    const mockFetch = async (_url: string): Promise<never> => {
      throw new Error("Network error");
    };

    const registry = new GitHubRegistry({ _fetch: mockFetch });
    const skills = await registry.list();

    assert.deepEqual(skills, []);
  });

  it("list() handles non-ok HTTP responses gracefully", async () => {
    const { GitHubRegistry } = await import("../../dist/marketplace/registries/github.js");

    const mockFetch = async (_url: string) => ({
      ok: false,
      text: async () => "Not Found",
    });

    const registry = new GitHubRegistry({ _fetch: mockFetch });
    const skills = await registry.list();

    assert.deepEqual(skills, []);
  });

  it("search() returns empty array when no matches", async () => {
    const { GitHubRegistry } = await import("../../dist/marketplace/registries/github.js");

    const mockFetch = async (_url: string) => ({
      ok: true,
      text: async () => "- [TDD Protocol](https://github.com/user/tdd) - workflow\n",
    });

    const registry = new GitHubRegistry({ _fetch: mockFetch });
    const results = await registry.search("zzznomatch");

    assert.deepEqual(results, []);
  });
});
