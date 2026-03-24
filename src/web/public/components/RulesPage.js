import ScopeToggle from "./ScopeToggle.js";
import SyncPanel from "./SyncPanel.js";

const { ref, watch, onMounted } = Vue;

const SCOPE_OPTIONS = [
  { value: "project", label: "Project" },
  { value: "global", label: "Global" },
];

// Props:
//   agents - rulesAgents (filtered agents with rules capability)
export default {
  components: { ScopeToggle, SyncPanel },
  props: ["agents"],
  setup(props) {
    const rules = ref([]);
    const rulesScope = ref("project");
    const rulesLoading = ref(false);
    const rulesDiff = ref({});
    const rulesSyncResult = ref({});
    const rulesSyncing = ref(new Set());

    async function fetchRules(scope) {
      rulesLoading.value = true;
      try {
        const res = await fetch(`/api/rules?scope=${scope}`);
        if (!res.ok) throw new Error(`HTTP ${res.status}`);
        rules.value = await res.json();
      } catch {
        rules.value = [];
      } finally {
        rulesLoading.value = false;
      }
    }

    async function syncRules(agentId) {
      const key = agentId ?? "__all";
      if (agentId) rulesSyncing.value.add(agentId);
      rulesSyncResult.value = { ...rulesSyncResult.value, [key]: null };
      try {
        const params = new URLSearchParams({ scope: rulesScope.value });
        if (agentId) params.set("agentId", agentId);
        const res = await fetch(`/api/rules/sync?${params}`, { method: "POST" });
        if (!res.ok) throw new Error(`HTTP ${res.status}`);
        const result = await res.json();
        rulesSyncResult.value = { ...rulesSyncResult.value, [key]: result };
      } catch (err) {
        rulesSyncResult.value = { ...rulesSyncResult.value, [key]: { success: false, error: err.message } };
      } finally {
        if (agentId) rulesSyncing.value.delete(agentId);
      }
    }

    async function fetchRulesDiff(agentId) {
      try {
        const res = await fetch(`/api/rules/diff/${agentId}?scope=${rulesScope.value}`);
        if (!res.ok) throw new Error(`HTTP ${res.status}`);
        rulesDiff.value = { ...rulesDiff.value, [agentId]: await res.json() };
      } catch {
        // ignore
      }
    }

    watch(rulesScope, (scope) => fetchRules(scope));
    onMounted(() => fetchRules(rulesScope.value));

    return {
      rules, rulesScope, rulesLoading, rulesDiff, rulesSyncResult, rulesSyncing,
      SCOPE_OPTIONS, fetchRules, syncRules, fetchRulesDiff,
    };
  },
  template: `
    <div class="rules-page">
      <scope-toggle
        :model-value="rulesScope"
        :options="SCOPE_OPTIONS"
        @update:model-value="rulesScope = $event"
      />

      <div v-if="rulesLoading" class="loading">Loading rules...</div>
      <div v-else-if="rules.length === 0" class="empty-state">
        <p>No rules found for <strong>{{ rulesScope }}</strong> scope.</p>
      </div>
      <div v-else class="rules-list">
        <div v-for="rule in rules" :key="rule.name" class="rule-item">
          <div class="rule-item-header">
            <span class="rule-name">{{ rule.name }}</span>
            <code class="rule-source">{{ rule.source }}</code>
          </div>
          <pre class="rule-preview">{{ rule.content.length > 300 ? rule.content.substring(0, 300) + '…' : rule.content }}</pre>
        </div>
      </div>

      <sync-panel
        :agents="agents"
        :sync-result="rulesSyncResult"
        :syncing="rulesSyncing"
        :has-diff="true"
        @sync-all="syncRules()"
        @sync="syncRules($event)"
        @fetch-diff="fetchRulesDiff($event)"
      >
        <template v-slot:diffs>
          <div v-for="(diff, agentId) in rulesDiff" :key="agentId" class="diff-result">
            <div class="diff-header">
              <strong>Diff: {{ agentId }}</strong>
              <span v-if="!diff.hasChanges" class="badge badge-ok">No changes</span>
              <span v-else class="badge badge-update">Changes detected</span>
            </div>
            <div v-if="diff.hasChanges" class="diff-body">
              <div class="diff-section diff-current">
                <div class="diff-label">Current:</div>
                <pre>{{ diff.current ?? '(empty)' }}</pre>
              </div>
              <div class="diff-section diff-desired">
                <div class="diff-label">Desired:</div>
                <pre>{{ diff.desired }}</pre>
              </div>
            </div>
          </div>
        </template>
      </sync-panel>
    </div>
  `,
};
