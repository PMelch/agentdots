import { getAgentIcon } from "../utils.js";

const { ref, computed, onMounted } = Vue;

export default {
  setup() {
    const updates = ref([]);
    const updatesLoading = ref(false);
    const updatesError = ref(null);
    const updatingAgents = ref(new Set());
    const updateResults = ref({});

    const updatesAvailableCount = computed(() => updates.value.filter(u => u.hasUpdate).length);
    const isUpdatingAny = computed(() => updatingAgents.value.size > 0);

    async function fetchUpdates() {
      updatesLoading.value = true;
      updatesError.value = null;
      updateResults.value = {};
      try {
        const res = await fetch("/api/updates");
        if (!res.ok) throw new Error(`HTTP ${res.status}`);
        updates.value = await res.json();
      } catch (err) {
        updatesError.value = err.message;
      } finally {
        updatesLoading.value = false;
      }
    }

    async function updateAgent(agentId) {
      updatingAgents.value.add(agentId);
      updateResults.value[agentId] = null;
      try {
        const res = await fetch(`/api/updates/${agentId}`, { method: "POST" });
        if (!res.ok) throw new Error(`HTTP ${res.status}`);
        const result = await res.json();
        updateResults.value[agentId] = result.success ? "success" : "failed";
      } catch {
        updateResults.value[agentId] = "failed";
      } finally {
        updatingAgents.value.delete(agentId);
      }
    }

    async function updateAll() {
      const pending = updates.value.filter(u => u.hasUpdate);
      for (const u of pending) await updateAgent(u.agentId);
      await fetchUpdates();
    }

    onMounted(fetchUpdates);

    return {
      updates, updatesLoading, updatesError, updatingAgents, updateResults,
      updatesAvailableCount, isUpdatingAny,
      fetchUpdates, updateAgent, updateAll,
      getAgentIcon,
    };
  },
  template: `
    <div class="updates-page">
      <div class="updates-toolbar">
        <button @click="fetchUpdates" class="btn-primary" :disabled="updatesLoading">
          {{ updatesLoading ? 'Checking...' : '🔄 Check for Updates' }}
        </button>
        <button v-if="updatesAvailableCount > 0" @click="updateAll" class="btn-success" :disabled="isUpdatingAny">
          {{ isUpdatingAny ? 'Updating...' : \`⬆️ Update All (\${updatesAvailableCount})\` }}
        </button>
      </div>

      <div v-if="updatesError" class="error-banner">{{ updatesError }}</div>

      <div v-if="updatesLoading && updates.length === 0" class="loading">Checking for updates...</div>

      <table v-if="updates.length > 0" class="updates-table">
        <thead>
          <tr>
            <th>Agent</th>
            <th>Current</th>
            <th>Latest</th>
            <th>Status</th>
            <th>Update Command</th>
            <th>Action</th>
          </tr>
        </thead>
        <tbody>
          <tr v-for="u in updates" :key="u.agentId" :class="{ 'update-available': u.hasUpdate }">
            <td class="agent-name-cell">
              <img class="agent-icon-sm" :src="getAgentIcon(u.agentId)" :alt="u.agentName" @error="$event.target.style.display='none'">
              {{ u.agentName }}
            </td>
            <td><code>{{ u.currentVersion ?? '—' }}</code></td>
            <td><code>{{ u.latestVersion ?? '—' }}</code></td>
            <td>
              <span v-if="updateResults[u.agentId] === 'success'" class="badge badge-success">✓ Updated</span>
              <span v-else-if="updateResults[u.agentId] === 'failed'" class="badge badge-error">✗ Failed</span>
              <span v-else-if="updatingAgents.has(u.agentId)" class="badge badge-updating">⏳ Updating...</span>
              <span v-else-if="u.hasUpdate" class="badge badge-update">⬆ Update available</span>
              <span v-else-if="u.latestVersion" class="badge badge-ok">✓ Up to date</span>
              <span v-else class="badge badge-unknown">? Unknown</span>
            </td>
            <td><code v-if="u.updateCommand" class="update-cmd">{{ u.updateCommand }}</code><span v-else>—</span></td>
            <td>
              <button v-if="u.hasUpdate && !updatingAgents.has(u.agentId)" @click="updateAgent(u.agentId)" class="btn-sm btn-primary" :disabled="isUpdatingAny">
                Update
              </button>
            </td>
          </tr>
        </tbody>
      </table>

      <div v-if="!updatesLoading && updates.length > 0 && updatesAvailableCount === 0 && Object.keys(updateResults).length === 0" class="all-good">
        ✅ All agents are up to date!
      </div>
    </div>
  `,
};
