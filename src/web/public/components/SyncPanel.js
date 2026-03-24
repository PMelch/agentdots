import { getAgentIcon } from "../utils.js";

// Reusable sync panel used by Rules, Skills, and MCP pages.
// Props:
//   agents     - array of agent objects with rules/skills/mcp capability
//   syncResult - object { agentId: result, __all: result }
//   syncing    - reactive Set of agentIds currently syncing
//   hasDiff    - boolean: show Diff button per agent (Rules, Skills) or not (MCP)
// Emits:
//   syncAll       - user clicked "Sync All"
//   sync(agentId) - user clicked per-agent "Sync"
//   fetchDiff(agentId) - user clicked "Diff"
// Slot:
//   diffs - rendered diff content (provided by parent page)
export default {
  props: ["agents", "syncResult", "syncing", "hasDiff"],
  emits: ["syncAll", "sync", "fetchDiff"],
  setup() {
    return { getAgentIcon };
  },
  template: `
    <div class="sync-panel">
      <div class="sync-panel-header">
        <h3>Sync to Agents</h3>
        <button @click="$emit('syncAll')" class="btn-success" :disabled="syncing.size > 0">
          {{ syncing.size > 0 ? 'Syncing...' : 'Sync All' }}
        </button>
        <span v-if="syncResult['__all']?.success" class="badge badge-success">✓ All synced</span>
        <span v-if="syncResult['__all']?.error" class="badge badge-error">✗ {{ syncResult['__all'].error }}</span>
      </div>
      <div v-if="!agents.length" class="empty-state-sm">No agents with this capability detected.</div>
      <div v-for="agent in agents" :key="agent.id" class="sync-agent-row">
        <img class="agent-icon-sm" :src="getAgentIcon(agent.id)" :alt="agent.name" @error="$event.target.style.display='none'">
        <span class="sync-agent-name">{{ agent.name }}</span>
        <div class="sync-agent-actions">
          <button @click="$emit('sync', agent.id)" class="btn-sm btn-primary" :disabled="syncing.has(agent.id)">
            {{ syncing.has(agent.id) ? 'Syncing...' : 'Sync' }}
          </button>
          <button v-if="hasDiff" @click="$emit('fetchDiff', agent.id)" class="btn-sm btn-secondary">Diff</button>
          <span v-if="syncResult[agent.id]?.success" class="badge badge-success">✓ Synced</span>
          <span v-if="syncResult[agent.id]?.error" class="badge badge-error">✗ Failed</span>
        </div>
      </div>
      <slot name="diffs"></slot>
    </div>
  `,
};
