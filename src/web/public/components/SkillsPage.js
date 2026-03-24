import ScopeToggle from "./ScopeToggle.js";
import SyncPanel from "./SyncPanel.js";

const { ref, watch, onMounted } = Vue;

const SCOPE_OPTIONS = [
  { value: "project", label: "Project" },
  { value: "global", label: "Global" },
];

// Props:
//   agents - skillsAgents (filtered agents with skills capability)
export default {
  components: { ScopeToggle, SyncPanel },
  props: ["agents"],
  setup(props) {
    const skills = ref([]);
    const skillsScope = ref("project");
    const skillsLoading = ref(false);
    const skillsDiff = ref({});
    const skillsSyncResult = ref({});
    const skillsSyncing = ref(new Set());

    async function fetchSkills(scope) {
      skillsLoading.value = true;
      try {
        const res = await fetch(`/api/skills?scope=${scope}`);
        if (!res.ok) throw new Error(`HTTP ${res.status}`);
        skills.value = await res.json();
      } catch {
        skills.value = [];
      } finally {
        skillsLoading.value = false;
      }
    }

    async function syncSkills(agentId) {
      const key = agentId ?? "__all";
      if (agentId) skillsSyncing.value.add(agentId);
      skillsSyncResult.value = { ...skillsSyncResult.value, [key]: null };
      try {
        const params = new URLSearchParams({ scope: skillsScope.value });
        if (agentId) params.set("agentId", agentId);
        const res = await fetch(`/api/skills/sync?${params}`, { method: "POST" });
        if (!res.ok) throw new Error(`HTTP ${res.status}`);
        const result = await res.json();
        skillsSyncResult.value = { ...skillsSyncResult.value, [key]: result };
      } catch (err) {
        skillsSyncResult.value = { ...skillsSyncResult.value, [key]: { success: false, error: err.message } };
      } finally {
        if (agentId) skillsSyncing.value.delete(agentId);
      }
    }

    async function fetchSkillsDiff(agentId) {
      try {
        const res = await fetch(`/api/skills/diff/${agentId}?scope=${skillsScope.value}`);
        if (!res.ok) throw new Error(`HTTP ${res.status}`);
        skillsDiff.value = { ...skillsDiff.value, [agentId]: await res.json() };
      } catch {
        // ignore
      }
    }

    watch(skillsScope, (scope) => fetchSkills(scope));
    onMounted(() => fetchSkills(skillsScope.value));

    return {
      skills, skillsScope, skillsLoading, skillsDiff, skillsSyncResult, skillsSyncing,
      SCOPE_OPTIONS, fetchSkills, syncSkills, fetchSkillsDiff,
    };
  },
  template: `
    <div class="skills-page">
      <scope-toggle
        :model-value="skillsScope"
        :options="SCOPE_OPTIONS"
        @update:model-value="skillsScope = $event"
      />

      <div v-if="skillsLoading" class="loading">Loading skills...</div>
      <div v-else-if="skills.length === 0" class="empty-state">
        <p>No skills found for <strong>{{ skillsScope }}</strong> scope.</p>
      </div>
      <div v-else class="skills-grid">
        <div v-for="skill in skills" :key="skill.name" class="skill-card">
          <div class="skill-name">{{ skill.name }}</div>
          <code class="skill-source">{{ skill.source }}</code>
        </div>
      </div>

      <sync-panel
        :agents="agents"
        :sync-result="skillsSyncResult"
        :syncing="skillsSyncing"
        :has-diff="true"
        @sync-all="syncSkills()"
        @sync="syncSkills($event)"
        @fetch-diff="fetchSkillsDiff($event)"
      >
        <template v-slot:diffs>
          <div v-for="(diff, agentId) in skillsDiff" :key="agentId" class="diff-result">
            <div class="diff-header">
              <strong>Diff: {{ agentId }}</strong>
              <span v-if="!diff.hasChanges" class="badge badge-ok">No changes</span>
              <span v-else class="badge badge-update">Changes detected</span>
            </div>
            <div v-if="diff.hasChanges" class="diff-body diff-skills">
              <div v-if="diff.added.length" class="diff-added">
                <span class="diff-label">+ Added:</span> {{ diff.added.join(', ') }}
              </div>
              <div v-if="diff.removed.length" class="diff-removed">
                <span class="diff-label">- Removed:</span> {{ diff.removed.join(', ') }}
              </div>
              <div v-if="diff.modified.length" class="diff-modified">
                <span class="diff-label">~ Modified:</span> {{ diff.modified.join(', ') }}
              </div>
            </div>
          </div>
        </template>
      </sync-panel>
    </div>
  `,
};
