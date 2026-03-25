import { ref } from "vue";

// Module-level singletons — shared across all component instances
const warnings = ref([]); // string[]
const sceneTitle = ref("");
const lockedStoryId = ref(null);

export function useConsistencyWarnings() {
  function setWarnings(issues, title, storyId) {
    if (!Array.isArray(issues) || !issues.length) return;
    lockedStoryId.value = storyId;
    sceneTitle.value = title || "";
    warnings.value = issues;
  }

  function dismiss() {
    warnings.value = [];
    sceneTitle.value = "";
    lockedStoryId.value = null;
  }

  return { warnings, sceneTitle, lockedStoryId, setWarnings, dismiss };
}
