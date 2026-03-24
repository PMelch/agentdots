import AgentsPage from "./components/AgentsPage.js";
import UpdatesPage from "./components/UpdatesPage.js";
import RulesPage from "./components/RulesPage.js";
import SkillsPage from "./components/SkillsPage.js";
import McpPage from "./components/McpPage.js";
import AgentModal from "./components/AgentModal.js";
import { AGENT_ICONS, getAgentIcon } from "./utils.js";

const { createApp, ref, computed, onMounted, watch } = Vue;

// Expose shared utilities for any external use
window.AGENT_ICONS = AGENT_ICONS;
window.getAgentIcon = getAgentIcon;

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
  components: { AgentsPage, UpdatesPage, RulesPage, SkillsPage, McpPage, AgentModal },
  setup() {
    const currentSection = ref(getHashSection());
    const agents = ref([]);
    const loading = ref(false);
    const error = ref(null);
    const selectedAgent = ref(null);

    const installingAgents = ref(new Set());
    const installResults = ref({});

    const usage = ref({});
    const usageLoading = ref(false);

    const pageTitle = computed(() => PAGE_TITLES[currentSection.value] ?? currentSection.value);

    const rulesAgents = computed(() => agents.value.filter(a => a.capabilities?.includes("rules")));
    const skillsAgents = computed(() => agents.value.filter(a => a.capabilities?.includes("skills")));
    const mcpAgents = computed(() => agents.value.filter(a => a.capabilities?.includes("mcp")));

    async function fetchAgents() {
      loading.value = true;
      error.value = null;
      try {
        // Stage 1: instant skeleton data (no shell calls)
        const listRes = await fetch("/api/agents/list");
        if (listRes.ok) {
          const stubs = await listRes.json();
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

    window.addEventListener("hashchange", () => {
      currentSection.value = getHashSection();
    });

    watch(currentSection, (section) => {
      if (section === "agents") fetchUsage();
      if (section === "rules" || section === "skills" || section === "mcp") fetchAgents();
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
      navigate,
      installingAgents,
      installResults,
      installAgent,
      usage,
      usageLoading,
      rulesAgents,
      skillsAgents,
      mcpAgents,
    };
  },
}).mount("#app");
