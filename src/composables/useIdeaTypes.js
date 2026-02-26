import { ref, onMounted } from 'vue';
import { getCustomIdeaTypes, addCustomIdeaType } from '@/db';
import { BUILT_IN_IDEA_TYPES, isBuiltInType } from '@/constants/ideaTypes';

/**
 * Resolve idea type (slug or custom name) to display label.
 * @param {string} type - ideas.type value (built-in slug or custom name)
 * @param {function} t - i18n t function (use t.value in script)
 */
export function getIdeaTypeLabel(type, t) {
  if (!type) return '';
  if (isBuiltInType(type)) return t('ideas.' + type);
  return type;
}

export function useIdeaTypes() {
  const customTypes = ref([]);

  async function loadCustomTypes() {
    customTypes.value = await getCustomIdeaTypes();
  }

  async function addCustomType(name) {
    const trimmed = (name || '').trim();
    if (!trimmed) return null;
    const added = await addCustomIdeaType(trimmed);
    if (added) {
      customTypes.value = [...customTypes.value, added];
      return added.name;
    }
    return null;
  }

  onMounted(loadCustomTypes);

  return {
    builtInTypes: BUILT_IN_IDEA_TYPES,
    customTypes,
    loadCustomTypes,
    addCustomType,
    getIdeaTypeLabel,
    isBuiltInType,
  };
}
