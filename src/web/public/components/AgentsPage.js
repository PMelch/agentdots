import AgentCard from "./AgentCard.js";

// Props:
//   agents          - all detected agents
//   loading         - boolean: agents are loading
//   usage           - usage map { agentId: usageData }
//   installingAgents - reactive Set of agentIds currently installing
//   installResults  - object { agentId: result }
// Emits:
//   selectAgent(agent)   - agent Details clicked
//   installAgent(agentId) - agent Install clicked
export default {
  components: { AgentCard },
  props: ["agents", "loading", "usage", "installingAgents", "installResults"],
  emits: ["selectAgent", "installAgent"],
  template: `
    <div class="agents-grid">
      <div v-if="loading" class="loading">Loading agents...</div>
      <div v-else-if="agents.length === 0" class="empty-state">
        <p>No agents detected.</p>
      </div>
      <agent-card
        v-for="agent in agents" :key="agent.id"
        :agent="agent"
        :usage="usage[agent.id]"
        :install-result="installResults[agent.id]"
        :installing="installingAgents.has(agent.id)"
        @select="$emit('selectAgent', $event)"
        @install="$emit('installAgent', $event)"
      />
    </div>
  `,
};
