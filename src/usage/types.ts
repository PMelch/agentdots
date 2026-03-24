export interface UsageInfo {
  agentId: string;
  agentName: string;
  available: boolean;
  tokens?: {
    input: number;
    output: number;
    total: number;
  };
  cost?: {
    estimated: number;
    currency: string;
  };
  quota?: {
    used: number;
    limit: number;
    resetAt?: string;
  };
  sessions?: number;
  lastActive?: string;
  source: "local-logs" | "api" | "unavailable";
}

export interface UsageReader {
  agentId: string;
  read(): Promise<UsageInfo>;
}
