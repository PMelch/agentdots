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

    const pageTitle = computed(() => PAGE_TITLES[currentSection.value] ?? currentSection.value);

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

    const updatesAvailableCount = computed(() => updates.value.filter(u => u.hasUpdate).length);
    const isUpdatingAny = computed(() => updatingAgents.value.size > 0);

    window.addEventListener("hashchange", () => {
      currentSection.value = getHashSection();
    });

    watch(currentSection, (section) => {
      if (section === "agents") { fetchAgents(); fetchUsage(); }
      if (section === "updates") fetchUpdates();
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
    };
  },
}).mount("#app");
