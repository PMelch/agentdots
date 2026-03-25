import type { MarketplaceSkill, SkillRegistry } from "../types.js";

type FetchLike = (url: string) => Promise<{ ok: boolean; text: () => Promise<string> }>;

const CURATED_REPOS = [
  { owner: "travisvn", repo: "awesome-claude-skills" },
  { owner: "VoltAgent", repo: "awesome-agent-skills" },
];

function slugify(name: string): string {
  return name.toLowerCase().replace(/[^a-z0-9]+/g, "-").replace(/^-|-$/g, "");
}

export function parseReadme(content: string, author: string): MarketplaceSkill[] {
  const skills: MarketplaceSkill[] = [];
  // Matches: - [Name](url) - Description  (handles bold ** markers too)
  const linkRegex = /[-*]\s+\*?\*?\[([^\]]+)\]\(([^)]+)\)\*?\*?\s*[-–:]?\s*(.*)/g;
  let match;
  while ((match = linkRegex.exec(content)) !== null) {
    const name = match[1].trim();
    const url = match[2].trim();
    const description = match[3].trim().replace(/^[-–:]\s*/, "");
    if (!url.includes("github.com") && !url.includes("gitlab.com")) continue;
    skills.push({
      name,
      slug: slugify(name),
      description,
      source: "github",
      url,
      author,
    });
  }
  return skills;
}

export class GitHubRegistry implements SkillRegistry {
  readonly id = "github";
  readonly name = "GitHub Awesome Skills";

  private _fetch: FetchLike;

  constructor(options?: { _fetch?: FetchLike }) {
    this._fetch =
      options?._fetch ??
      ((url) =>
        fetch(url) as unknown as Promise<{ ok: boolean; text: () => Promise<string> }>);
  }

  async list(): Promise<MarketplaceSkill[]> {
    const all: MarketplaceSkill[] = [];
    const seen = new Set<string>();
    for (const { owner, repo } of CURATED_REPOS) {
      try {
        const url = `https://raw.githubusercontent.com/${owner}/${repo}/main/README.md`;
        const res = await this._fetch(url);
        if (!res.ok) continue;
        const text = await res.text();
        for (const skill of parseReadme(text, owner)) {
          if (seen.has(skill.url)) continue;
          seen.add(skill.url);
          all.push(skill);
        }
      } catch {
        // Ignore network errors — return partial results
      }
    }
    return all;
  }

  async search(query: string): Promise<MarketplaceSkill[]> {
    const all = await this.list();
    const q = query.toLowerCase();
    return all.filter(
      (s) =>
        s.name.toLowerCase().includes(q) ||
        s.description.toLowerCase().includes(q) ||
        s.tags?.some((t) => t.toLowerCase().includes(q))
    );
  }
}
