// props.options: [{value, label}, ...]  e.g. [{value:'project',label:'Project'}, ...]
export default {
  props: ["modelValue", "options"],
  emits: ["update:modelValue"],
  template: `
    <div class="scope-toggle">
      <button
        v-for="opt in options" :key="opt.value"
        :class="modelValue === opt.value ? 'btn-primary' : 'btn-secondary'"
        @click="$emit('update:modelValue', opt.value)">
        {{ opt.label }}
      </button>
    </div>
  `,
};
