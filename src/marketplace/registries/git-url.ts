import { MarketplaceSkill, SkillRegistry } from "../types.js";

function slugify(name: string): string {
  return name.toLowerCase().replace(/[^a-z0-9]+/g, "-").replace(/^-|-$/g, "");
}

function inferName(url: string, subPath?: string): string {
  if (subPath) return subPath.split("/").filter(Boolean).pop() ?? "skill";
  return url.split("/").pop()?.replace(/\.git$/, "") ?? "skill";
}

export class GitUrlRegistry implements SkillRegistry {
  readonly id = "git-url";
  readonly name = "Direct Git URL";

  constructor(private url: string, private path?: string) {}

  async list(): Promise<MarketplaceSkill[]> {
    return [this.toSkill()];
  }

  async search(_query: string): Promise<MarketplaceSkill[]> {
    return this.list();
  }

  private toSkill(): MarketplaceSkill {
    const name = inferName(this.url, this.path);
    return {
      name,
      slug: slugify(name),
      description: `Install from ${this.url}`,
      source: "url",
      url: this.url,
      path: this.path,
    };
  }
}
