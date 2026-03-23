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

    // Handle browser back/forward navigation
    window.addEventListener("hashchange", () => {
      currentSection.value = getHashSection();
    });

    // Fetch agents when switching to agents section
    watch(currentSection, (section) => {
      if (section === "agents") fetchAgents();
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
    };
  },
}).mount("#app");
