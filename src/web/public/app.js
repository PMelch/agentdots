const { createApp, ref, computed, onMounted, watch } = Vue;

const AGENT_ICONS = {
  "claude-code": "🤖",
  "cursor": "🖱️",
  "copilot": "✈️",
  "gemini": "♊",
  "codex": "📝",
  "opencode": "🔓",
  "aider": "🧑‍💻",
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

    // Updates state
    const updates = ref([]);
    const updatesLoading = ref(false);
    const updatesError = ref(null);
    const updatingAgents = ref(new Set());
    const updateResults = ref({});

    const pageTitle = computed(() => PAGE_TITLES[currentSection.value] ?? currentSection.value);

    function getAgentIcon(id) {
      return AGENT_ICONS[id] ?? "🤖";
    }

    function selectAgent(agent) {
      selectedAgent.value = agent;
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
      // Refresh after all done
      await fetchUpdates();
    }

    const updatesAvailableCount = computed(() => updates.value.filter(u => u.hasUpdate).length);
    const isUpdatingAny = computed(() => updatingAgents.value.size > 0);

    // Handle browser back/forward navigation
    window.addEventListener("hashchange", () => {
      currentSection.value = getHashSection();
    });

    // Fetch data when switching sections
    watch(currentSection, (section) => {
      if (section === "agents") fetchAgents();
      if (section === "updates") fetchUpdates();
    });

    onMounted(() => {
      fetchAgents();
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
    };
  },
}).mount("#app");
