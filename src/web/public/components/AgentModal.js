// Props:
//   agent - agent object to display
// Emits:
//   close - user dismissed the modal
export default {
  props: ["agent"],
  emits: ["close"],
  template: `
    <div class="modal-overlay" @click.self="$emit('close')">
      <div class="modal">
        <header class="modal-header">
          <h3>{{ agent.name }} Details</h3>
          <button @click="$emit('close')" class="btn-close">&times;</button>
        </header>
        <div class="modal-body">
          <div class="detail-row">
            <span class="label">ID:</span>
            <span class="value"><code>{{ agent.id }}</code></span>
          </div>
          <div class="detail-row">
            <span class="label">Status:</span>
            <span class="value">{{ agent.installed ? 'Installed' : 'Not Installed' }}</span>
          </div>
          <div class="detail-row" v-if="agent.version">
            <span class="label">Version:</span>
            <span class="value">{{ agent.version }}</span>
          </div>
          <div class="detail-row" v-if="agent.binaryPath">
            <span class="label">Binary Path:</span>
            <span class="value"><code>{{ agent.binaryPath }}</code></span>
          </div>
          <div class="detail-row">
            <span class="label">Config Format:</span>
            <span class="value">{{ agent.configFormat }}</span>
          </div>
          <div class="detail-section">
            <h4>Config Paths</h4>
            <ul>
              <li v-for="path in agent.configPaths" :key="path"><code>{{ path }}</code></li>
            </ul>
          </div>
          <div class="detail-section">
            <h4>Capabilities</h4>
            <div class="capabilities">
              <span v-for="cap in agent.capabilities" :key="cap" class="cap-tag">{{ cap }}</span>
            </div>
          </div>
        </div>
      </div>
    </div>
  `,
};
