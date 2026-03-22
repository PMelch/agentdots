import type { AgentDetector, AgentInfo } from "../core/types.js";
import { claudeCodeDetector } from "./detectors/claude-code.js";
import { codexDetector } from "./detectors/codex.js";
import { geminiDetector } from "./detectors/gemini.js";
import { cursorDetector } from "./detectors/cursor.js";
import { copilotDetector } from "./detectors/copilot.js";
import { opencodeDetector } from "./detectors/opencode.js";
import { aiderDetector } from "./detectors/aider.js";
import { windsurfDetector } from "./detectors/windsurf.js";
import { piDetector } from "./detectors/pi.js";

const DEFAULT_DETECTORS: AgentDetector[] = [
  claudeCodeDetector,
  codexDetector,
  geminiDetector,
  cursorDetector,
  copilotDetector,
  opencodeDetector,
  aiderDetector,
  windsurfDetector,
  piDetector,
];

class AgentRegistry {
  private detectors: Map<string, AgentDetector>;

  constructor(detectors: AgentDetector[] = DEFAULT_DETECTORS) {
    this.detectors = new Map(detectors.map((d) => [d.id, d]));
  }

  async detectAll(): Promise<AgentInfo[]> {
    const results = await Promise.all(
      [...this.detectors.values()].map((d) => d.detect())
    );
    return results;
  }

  async detect(agentId: string): Promise<AgentInfo | null> {
    const detector = this.detectors.get(agentId);
    if (!detector) return null;
    return detector.detect();
  }

  register(detector: AgentDetector): void {
    this.detectors.set(detector.id, detector);
  }
}

export const registry = new AgentRegistry();
export { AgentRegistry };
