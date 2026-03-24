const { createApp, ref, computed, onMounted, watch } = Vue;

const AGENT_ICONS = {
  "claude-code": "🤖",
  "cursor": "🖱️",
  "copilot": "✈️",
  "gemini": "♊",
  "codex": "📝",
  "opencode": "🔓",
  "aider": "🧑💻",
  "windsurf": "🏄",
  "cline": "📟",
  "roo-code": "🦘",
  "zed": "⚡",
};

const PAGE_TITLES = {
  agents: "Agents",
  rules: "Rules",
  skills: "Skills",
  mcp: "MCP Servers",
  commands: "Commands",
  updates: "Updates",
  settings: "Settings",
};

function getHashSection() {
  const hash = window.location.hash.replace("#", "");
  return PAGE_TITLES[hash] ? hash : "agents";
}

createApp({
  setup() {
    const currentSection = ref(getHashSection());
    const agents = ref([]);
    const loading = ref(false);
    const error = ref(null);
    const selectedAgent = ref(null);

    // Install state
    const installingAgents = ref(new Set());
    const installResults = ref({});

    // Updates state
    const updates = ref([]);
    const updatesLoading = ref(false);
    const updatesError = ref(null);
    const updatingAgents = ref(new Set());
    const updateResults = ref({});

    // Usage state
    const usage = ref({});
    const usageLoading = ref(false);

    // Rules state
    const rules = ref([]);
    const rulesScope = ref("project");
    const rulesLoading = ref(false);
    const rulesDiff = ref({});
    const rulesSyncResult = ref({});
    const rulesSyncing = ref(new Set());

    // Skills state
    const skills = ref([]);
    const skillsScope = ref("project");
    const skillsLoading = ref(false);
    const skillsDiff = ref({});
    const skillsSyncResult = ref({});
    const skillsSyncing = ref(new Set());

    // MCP state
    const mcpServers = ref([]);
    const mcpScope = ref("global");
    const mcpLoading = ref(false);
    const mcpSyncResult = ref({});
    const mcpSyncing = ref(new Set());

    const pageTitle = computed(() => PAGE_TITLES[currentSection.value] ?? currentSection.value);

    const rulesAgents = computed(() => agents.value.filter(a => a.capabilities?.includes("rules")));
    const skillsAgents = computed(() => agents.value.filter(a => a.capabilities?.includes("skills")));
    const mcpAgents = computed(() => agents.value.filter(a => a.capabilities?.includes("mcp")));

    function getAgentIcon(id) {
      return AGENT_ICONS[id] ?? "🤖";
    }

    function selectAgent(agent) {
      selectedAgent.value = agent;
    }

    function formatTokens(n) {
      if (!n) return "0";
      if (n >= 1_000_000) return (n / 1_000_000).toFixed(1) + "M";
      if (n >= 1_000) return (n / 1_000).toFixed(1) + "K";
      return String(n);
    }

    async function fetchAgents() {
      loading.value = true;
      error.value = null;
      try {
        // Stage 1: instant skeleton data (no shell calls)
        const listRes = await fetch("/api/agents/list");
        if (listRes.ok) {
          const stubs = await listRes.json();
          // Only set skeletons if we don't already have full data
          if (agents.value.length === 0) {
            agents.value = stubs.map(s => ({
              ...s, installed: null, version: null, binaryPath: null,
              configPaths: [], configFormat: "json", capabilities: [],
              _skeleton: true,
            }));
          }
        }
        // Stage 2: full detection (slow)
        const res = await fetch("/api/agents");
        if (!res.ok) throw new Error(`HTTP ${res.status}`);
        agents.value = await res.json();
      } catch (err) {
        error.value = err.message;
      } finally {
        loading.value = false;
      }
    }

    async function fetchUsage() {
      usageLoading.value = true;
      try {
        const res = await fetch("/api/usage");
        if (!res.ok) return;
        const list = await res.json();
        const map = {};
        for (const u of list) map[u.agentId] = u;
        usage.value = map;
      } catch {
        // non-critical
      } finally {
        usageLoading.value = false;
      }
    }

    async function installAgent(agentId) {
      installingAgents.value.add(agentId);
      installResults.value[agentId] = null;
      try {
        const res = await fetch(`/api/agents/${agentId}/install`, { method: "POST" });
        if (!res.ok) throw new Error(`HTTP ${res.status}`);
        const result = await res.json();
        installResults.value[agentId] = result;
        if (result.success) {
          await fetchAgents();
          await fetchUsage();
        }
      } catch (err) {
        installResults.value[agentId] = { success: false, error: err.message };
      } finally {
        installingAgents.value.delete(agentId);
      }
    }

    function navigate(section) {
      currentSection.value = section;
      window.location.hash = section;
    }

    // Updates functions
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
      } catch (err) {
        updateResults.value[agentId] = "failed";
      } finally {
        updatingAgents.value.delete(agentId);
      }
    }

    async function updateAll() {
      const pending = updates.value.filter(u => u.hasUpdate);
      for (const u of pending) {
        await updateAgent(u.agentId);
      }
      await fetchUpdates();
    }

    // Rules functions
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

    // Skills functions
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

    // MCP functions
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
      for (const agent of mcpAgents.value) {
        await syncMcp(agent.id);
      }
    }

    const updatesAvailableCount = computed(() => updates.value.filter(u => u.hasUpdate).length);
    const isUpdatingAny = computed(() => updatingAgents.value.size > 0);

    window.addEventListener("hashchange", () => {
      currentSection.value = getHashSection();
    });

    watch(currentSection, (section) => {
      if (section === "agents") { fetchAgents(); fetchUsage(); }
      if (section === "updates") fetchUpdates();
      if (section === "rules") { fetchAgents(); fetchRules(rulesScope.value); }
      if (section === "skills") { fetchAgents(); fetchSkills(skillsScope.value); }
      if (section === "mcp") { fetchAgents(); fetchMcpServers(mcpScope.value); }
    });

    onMounted(() => {
      fetchAgents();
      fetchUsage();
    });

    return {
      currentSection,
      agents,
      loading,
      error,
      selectedAgent,
      pageTitle,
      getAgentIcon,
      selectAgent,
      navigate,
      installingAgents,
      installResults,
      installAgent,
      updates,
      updatesLoading,
      updatesError,
      updatingAgents,
      updateResults,
      fetchUpdates,
      updateAgent,
      updateAll,
      updatesAvailableCount,
      isUpdatingAny,
      usage,
      usageLoading,
      formatTokens,
      // Rules
      rules,
      rulesScope,
      rulesLoading,
      rulesDiff,
      rulesSyncResult,
      rulesSyncing,
      rulesAgents,
      fetchRules,
      syncRules,
      fetchRulesDiff,
      // Skills
      skills,
      skillsScope,
      skillsLoading,
      skillsDiff,
      skillsSyncResult,
      skillsSyncing,
      skillsAgents,
      fetchSkills,
      syncSkills,
      fetchSkillsDiff,
      // MCP
      mcpServers,
      mcpScope,
      mcpLoading,
      mcpSyncResult,
      mcpSyncing,
      mcpAgents,
      fetchMcpServers,
      syncMcp,
      syncMcpAll,
    };
  },
}).mount("#app");
