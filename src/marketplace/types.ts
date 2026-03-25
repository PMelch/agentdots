export interface MarketplaceSkill {
  name: string;
  slug: string;
  description: string;
  source: "github" | "clawhub" | "url";
  url: string;
  path?: string;
  author?: string;
  tags?: string[];
}

export interface SkillRegistry {
  id: string;
  name: string;
  search(query: string): Promise<MarketplaceSkill[]>;
  list(): Promise<MarketplaceSkill[]>;
}
