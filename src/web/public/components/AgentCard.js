import { getAgentIcon, formatTokens } from "../utils.js";

// Props:
//   agent         - agent object
//   usage         - usage data for this agent (or undefined)
//   installResult - install result object for this agent (or undefined)
//   installing    - boolean: currently installing
// Emits:
//   select(agent)    - Details button clicked
//   install(agentId) - Install button clicked
export default {
  props: ["agent", "usage", "installResult", "installing"],
  emits: ["select", "install"],
  setup() {
    return { getAgentIcon, formatTokens };
  },
  template: `
    <div class="agent-card" :class="{ 'not-installed': agent.installed === false, 'skeleton': agent._skeleton }">
      <div class="agent-card-header">
        <img class="agent-icon" :src="getAgentIcon(agent.id)" :alt="agent.name" @error="$event.target.style.display='none'">
        <h3>{{ agent.name }}</h3>
        <span class="badge" :class="agent._skeleton ? 'badge-unknown' : agent.installed ? 'badge-installed' : 'badge-not-installed'">
          {{ agent._skeleton ? 'Detecting...' : agent.installed ? 'Installed' : 'Not Installed' }}
        </span>
      </div>
      <div class="agent-card-body">
        <p class="agent-version" v-if="agent.version">Version: {{ agent.version }}</p>
        <p class="agent-id">ID: <code>{{ agent.id }}</code></p>
        <div class="capabilities">
          <span v-for="cap in agent.capabilities" :key="cap" class="cap-tag">{{ cap }}</span>
        </div>
        <div v-if="agent.installed && usage" class="agent-usage">
          <template v-if="usage.available">
            <div class="usage-row" v-if="usage.tokens">
              <span class="usage-label">Tokens:</span>
              <span>{{ formatTokens(usage.tokens.input) }} in / {{ formatTokens(usage.tokens.output) }} out</span>
            </div>
            <div class="usage-row" v-if="usage.cost">
              <span class="usage-label">Est. cost:</span>
              <span>\${{ usage.cost.estimated.toFixed(4) }}</span>
            </div>
            <div class="usage-row" v-if="usage.sessions">
              <span class="usage-label">Sessions:</span>
              <span>{{ usage.sessions }}</span>
            </div>
            <div class="usage-row" v-if="usage.lastActive">
              <span class="usage-label">Last active:</span>
              <span>{{ new Date(usage.lastActive).toLocaleDateString() }}</span>
            </div>
          </template>
          <div v-else class="no-usage">No usage data available</div>
        </div>
      </div>
      <div class="agent-card-footer">
        <button @click="$emit('select', agent)" class="btn-secondary">Details</button>
        <template v-if="!agent.installed">
          <button
            v-if="!installResult"
            @click="$emit('install', agent.id)"
            class="btn-primary"
            :disabled="installing">
            {{ installing ? '⏳ Installing...' : '⬇ Install' }}
          </button>
          <span v-if="installResult?.success" class="badge badge-success">✓ Installed</span>
          <a v-if="installResult?.downloadUrl" :href="installResult.downloadUrl" target="_blank" rel="noopener" class="btn-secondary">⬇ Download</a>
          <span v-if="installResult && !installResult.success && !installResult.downloadUrl" class="badge badge-error">✗ Failed</span>
        </template>
      </div>
    </div>
  `,
};
