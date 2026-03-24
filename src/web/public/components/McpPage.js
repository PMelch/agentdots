import ScopeToggle from "./ScopeToggle.js";
import SyncPanel from "./SyncPanel.js";

const { ref, watch, onMounted } = Vue;

// MCP has global scope first (default), then project
const SCOPE_OPTIONS = [
  { value: "global", label: "Global" },
  { value: "project", label: "Project" },
];

// Props:
//   agents - mcpAgents (filtered agents with mcp capability)
export default {
  components: { ScopeToggle, SyncPanel },
  props: ["agents"],
  setup(props) {
    const mcpServers = ref([]);
    const mcpScope = ref("global");
    const mcpLoading = ref(false);
    const mcpSyncResult = ref({});
    const mcpSyncing = ref(new Set());

    async function fetchMcpServers(scope) {
      mcpLoading.value = true;
      try {
        const res = await fetch(`/api/mcp?scope=${scope}`);
        if (!res.ok) throw new Error(`HTTP ${res.status}`);
        mcpServers.value = await res.json();
      } catch {
        mcpServers.value = [];
      } finally {
        mcpLoading.value = false;
      }
    }

    async function syncMcp(agentId) {
      mcpSyncing.value.add(agentId);
      mcpSyncResult.value = { ...mcpSyncResult.value, [agentId]: null };
      try {
        const res = await fetch(`/api/mcp/sync?scope=${mcpScope.value}&agentId=${agentId}`, { method: "POST" });
        if (!res.ok) throw new Error(`HTTP ${res.status}`);
        const result = await res.json();
        mcpSyncResult.value = { ...mcpSyncResult.value, [agentId]: result };
      } catch (err) {
        mcpSyncResult.value = { ...mcpSyncResult.value, [agentId]: { success: false, error: err.message } };
      } finally {
        mcpSyncing.value.delete(agentId);
      }
    }

    async function syncMcpAll() {
      for (const agent of props.agents) await syncMcp(agent.id);
    }

    watch(mcpScope, (scope) => fetchMcpServers(scope));
    onMounted(() => fetchMcpServers(mcpScope.value));

    return {
      mcpServers, mcpScope, mcpLoading, mcpSyncResult, mcpSyncing,
      SCOPE_OPTIONS, fetchMcpServers, syncMcp, syncMcpAll,
    };
  },
  template: `
    <div class="mcp-page">
      <scope-toggle
        :model-value="mcpScope"
        :options="SCOPE_OPTIONS"
        @update:model-value="mcpScope = $event"
      />

      <div v-if="mcpLoading" class="loading">Loading MCP servers...</div>
      <div v-else-if="mcpServers.length === 0" class="empty-state">
        <p>No MCP servers configured for <strong>{{ mcpScope }}</strong> scope.</p>
      </div>
      <table v-else class="mcp-table">
        <thead>
          <tr>
            <th>Name</th>
            <th>Transport</th>
            <th>Command / URL</th>
            <th>Status</th>
          </tr>
        </thead>
        <tbody>
          <tr v-for="server in mcpServers" :key="server.name" :class="{ 'mcp-disabled': server.disabled }">
            <td class="mcp-name">{{ server.name }}</td>
            <td><span class="badge badge-transport">{{ server.transport }}</span></td>
            <td>
              <code v-if="server.command">{{ server.command }}{{ server.args ? ' ' + server.args.join(' ') : '' }}</code>
              <code v-else-if="server.url">{{ server.url }}</code>
              <span v-else>—</span>
            </td>
            <td>
              <span v-if="server.disabled" class="badge badge-unknown">Disabled</span>
              <span v-else class="badge badge-ok">Active</span>
            </td>
          </tr>
        </tbody>
      </table>

      <sync-panel
        :agents="agents"
        :sync-result="mcpSyncResult"
        :syncing="mcpSyncing"
        :has-diff="false"
        @sync-all="syncMcpAll()"
        @sync="syncMcp($event)"
      />
    </div>
  `,
};
