<template>
  <div
    class="otter-panel"
    :class="{ 'otter-panel--open': open, 'otter-panel--resizing': isResizing }"
    :style="panelStyle"
  >
    <!-- Resize handle (desktop only) -->
    <div class="otter-resize-handle" @mousedown.prevent="startResize" />
    <!-- Header -->
    <div class="otter-header">
      <div class="otter-header-left">
        <span class="otter-avatar" aria-hidden="true">🦦</span>
        <div>
          <div class="otter-name">Pip</div>
          <div class="otter-tagline">{{ contextLoaded && storyTitle ? storyTitle : t('pip.storyCompanion') }}</div>
        </div>
      </div>
      <div class="otter-header-right">
        <button
          v-if="messages.length > 0"
          type="button"
          class="otter-clear-btn"
          :title="t('pip.clearChat')"
          @click="clearChat"
        >{{ t('pip.clearChat') }}</button>
        <button type="button" class="otter-close-btn" aria-label="Close chat" @click="$emit('close')">
          <svg width="16" height="16" viewBox="0 0 24 24" fill="none" stroke="currentColor" stroke-width="2.5" stroke-linecap="round" aria-hidden="true"><path d="M18 6 6 18M6 6l12 12"/></svg>
        </button>
      </div>
    </div>

    <!-- Messages -->
    <div class="otter-messages" ref="messagesEl">
      <!-- Welcome shown only when no messages yet -->
      <div v-if="messages.length === 0" class="otter-welcome">
        <span class="otter-welcome-avatar" aria-hidden="true">🦦</span>
        <p v-if="contextLoading">{{ t('pip.readingStory') }}</p>
        <p v-else>{{ welcomeWithContext }}</p>
      </div>

      <template v-for="(msg, i) in messages" :key="i">
        <div
          class="otter-msg"
          :class="msg.role === 'assistant' ? 'otter-msg--assistant' : 'otter-msg--user'"
        >
          <span v-if="msg.role === 'assistant'" class="otter-msg-icon" aria-hidden="true">🦦</span>
          <div class="otter-bubble" :class="{ 'otter-bubble--typing': msg.streaming && !msg.content }">
            <template v-if="msg.streaming && !msg.content">
              <span class="typing-dot"></span>
              <span class="typing-dot"></span>
              <span class="typing-dot"></span>
            </template>
            <template v-else>{{ msg.content }}</template>
          </div>
        </div>
        <!-- Action chips shown below assistant messages -->
        <div v-if="msg.actions?.length" class="otter-action-chips">
          <template v-for="(a, j) in msg.actions" :key="j">
            <div v-if="a.status === 'pending'" class="otter-action-pending">
              <span class="otter-action-pending-label">{{ a.label }}</span>
              <button class="otter-action-btn otter-action-btn--save" @click="confirmAction(a)">Save</button>
              <button class="otter-action-btn otter-action-btn--skip" @click="skipAction(a)">Skip</button>
            </div>
            <span v-else-if="a.status === 'applying'" class="otter-action-chip otter-action-chip--muted">⏳ Saving…</span>
            <span v-else-if="a.status === 'applied'" class="otter-action-chip">✓ {{ a.resultLabel }}</span>
            <span v-else-if="a.status === 'skipped'" class="otter-action-chip otter-action-chip--muted">✗ Skipped</span>
            <span v-else-if="a.status === 'error'" class="otter-action-chip otter-action-chip--error">✗ {{ a.resultLabel }}</span>
          </template>
        </div>
      </template>

      <!-- Typing indicator: only shown before the streaming placeholder appears -->
      <div v-if="isLoading && !(messages.length && 'streaming' in messages[messages.length - 1])" class="otter-msg otter-msg--assistant">
        <span class="otter-msg-icon" aria-hidden="true">🦦</span>
        <div class="otter-bubble otter-bubble--typing">
          <span class="typing-dot"></span>
          <span class="typing-dot"></span>
          <span class="typing-dot"></span>
        </div>
      </div>
    </div>

    <!-- No API key state -->
    <div v-if="!hasApiKey" class="otter-no-key">
      <p>{{ t('pip.noApiKey') }}</p>
      <router-link to="/settings" class="btn btn-ghost btn-sm" @click="$emit('close')">{{ t('pip.goToSettings') }}</router-link>
    </div>

    <!-- Input resize handle + input (shown when API key is set) -->
    <template v-if="hasApiKey">
      <div class="otter-input-drag-bar" @mousedown.prevent="startTextareaResize" @touchstart.prevent="startTextareaResize" />
      <div class="otter-input-row">
        <textarea
          ref="inputEl"
          v-model="inputText"
          class="otter-textarea"
          :style="textareaManualHeight ? { height: textareaManualHeight + 'px' } : {}"
          :placeholder="isLoading ? t('pip.thinking') : t('pip.inputPlaceholder')"
          :disabled="isLoading"
          rows="1"
          @input="autoGrow"
          @keydown.enter.exact.prevent="send"
        />
        <button
          type="button"
          class="otter-send-btn"
          :disabled="isLoading || !inputText.trim()"
          aria-label="Send message"
          @click="send"
        >
          <svg width="16" height="16" viewBox="0 0 24 24" fill="none" stroke="currentColor" stroke-width="2.5" stroke-linecap="round" stroke-linejoin="round" aria-hidden="true"><path d="M22 2 11 13"/><path d="M22 2 15 22 11 13 2 9l20-7z"/></svg>
        </button>
      </div>
    </template>
  </div>

  <!-- Scrim (all screen sizes) -->
  <Teleport to="body">
    <div
      v-if="open"
      class="otter-scrim"
      aria-hidden="true"
      @click="$emit('close')"
    />
  </Teleport>
</template>

<script setup>
import { ref, computed, watch, watchEffect, nextTick, onMounted, onUnmounted } from 'vue';
import { chatWithAiStream, getApiKey, CONTEXTS, tierForContext, classifyAiError } from '@/services/ai';
import { useOutline } from '@/composables/useOutline';
import { useI18n } from '@/composables/useI18n';
import {
  getCurrentStoryId, getStoryById, getStory, saveStory,
  getIdeas, getCharacters, addCharacter, updateCharacter,
  getChapters, addChapter, updateChapter, reorderChapters,
  getScene, getScenes, getScenesByChapter, addScene, updateScene,
  getChatMessages, saveChatMessage, clearChatHistory,
} from '@/db';
import { WRITING_TEMPLATES, DEFAULT_TEMPLATE_ID } from '@/constants/writingTemplates';
import { generateSceneProse } from '@/services/generation';

const props = defineProps({
  open: Boolean,
  sceneId: { type: String, default: null },
});
const emit = defineEmits(['close']);

const HISTORY_LIMIT = 20;

const { load: reloadOutline } = useOutline();
const { t } = useI18n();

// ---- Story context ----
const storyContext = ref('');
const storyTitle = ref('');
const contextLoading = ref(false);
const contextLoaded = ref(false);
const hasStoryContent = ref(false);
const welcomeWithContext = ref('');
// Locked story ID for the current Pip session — prevents mid-session story
// switches from silently redirecting writes to the wrong story.
const contextStoryId = ref(null);
const storyGaps = ref(null);
const currentSceneInfo = ref(null); // { title, wordCount, hasContent }

function truncate(s, n) { return s && s.length > n ? s.slice(0, n) + '…' : (s || ''); }

function countWords(text) {
  if (!text) return 0;
  // CJK: count characters; otherwise count space-separated tokens
  const cjkCount = (text.match(/[\u4e00-\u9fff\u3040-\u30ff\uac00-\ud7af]/g) || []).length;
  if (cjkCount > text.length * 0.3) return cjkCount;
  return text.trim().split(/\s+/).filter(Boolean).length;
}

function computeWelcomeMessage(gaps) {
  // Scene-editor context: show scene-specific welcome
  if (currentSceneInfo.value) {
    if (currentSceneInfo.value.hasContent) {
      welcomeWithContext.value = t.value('pip.welcomeSceneWithProse', {
        title: currentSceneInfo.value.title,
        n: currentSceneInfo.value.wordCount,
      });
    } else {
      welcomeWithContext.value = t.value('pip.welcomeSceneNoProse', {
        title: currentSceneInfo.value.title,
      });
    }
    return;
  }
  if (!gaps) {
    welcomeWithContext.value = t.value('pip.welcomeDefault');
    return;
  }
  const { template, filledCount, nextMissingField, hasCharacters, hasChapters, totalChapters, writtenScenes, totalScenes } = gaps;
  if (filledCount === 0) {
    const question = t.value(template.fields[0].coachQuestionKey);
    welcomeWithContext.value = t.value('pip.welcomeEmpty', { question });
  } else if (nextMissingField) {
    const question = t.value(nextMissingField.coachQuestionKey);
    welcomeWithContext.value = t.value('pip.welcomeProgress', { question });
  } else if (!hasCharacters) {
    welcomeWithContext.value = t.value('pip.welcomeNeedCharacters');
  } else if (!hasChapters) {
    welcomeWithContext.value = t.value('pip.welcomeNeedChapters');
  } else if (writtenScenes > 0) {
    welcomeWithContext.value = t.value('pip.welcomeBack', { chapters: totalChapters, n: writtenScenes });
  } else {
    welcomeWithContext.value = t.value('pip.welcomeHasOutline', { chapters: totalChapters, n: totalScenes });
  }
}

// Re-run welcome message when locale changes (t is a computed ref)
watchEffect(() => { computeWelcomeMessage(storyGaps.value); });


async function loadStoryContext() {
  contextLoading.value = true;
  contextLoaded.value = false;
  storyContext.value = '';
  hasStoryContent.value = false;

  try {
    const storyId = getCurrentStoryId();
    contextStoryId.value = storyId;
    if (!storyId) {
      computeWelcomeMessage(null);
      return;
    }

    const [story, ideas, characters, chapters, scenes] = await Promise.all([
      getStoryById(storyId),
      getIdeas(storyId),
      getCharacters(storyId),
      getChapters(storyId),
      getScenes(storyId),
    ]);

    if (!story) {
      computeWelcomeMessage(null);
      return;
    }
    storyTitle.value = truncate(story.oneSentence || t.value('sidebar.untitledStory'), 28);

    const lines = [];

    const spineFields = [
      ['One-sentence summary', story.oneSentence],
      ['Setup', story.setup],
      ['Disaster 1', story.disaster1],
      ['Disaster 2', story.disaster2],
      ['Disaster 3', story.disaster3],
      ['Ending', story.ending],
    ].filter(([, v]) => v?.trim());

    if (spineFields.length) {
      lines.push('=== STORY SPINE ===');
      for (const [label, val] of spineFields) {
        lines.push(`${label}: ${truncate(val, 300)}`);
      }
      hasStoryContent.value = true;
    }

    if (characters?.length) {
      lines.push('\n=== CHARACTERS ===');
      for (const c of characters.slice(0, 10)) {
        const parts = [`- ${c.name || 'Unnamed'}`];
        if (c.oneSentence) parts.push(truncate(c.oneSentence, 120));
        if (c.goal) parts.push(`Goal: ${truncate(c.goal, 80)}`);
        if (c.epiphany) parts.push(`Epiphany: ${truncate(c.epiphany, 80)}`);
        lines.push(parts.join(' | '));
      }
      hasStoryContent.value = true;
    }

    if (ideas?.length) {
      lines.push('\n=== IDEAS ===');
      for (const idea of ideas.slice(0, 15)) {
        lines.push(`- [${idea.type}] ${idea.title || 'Untitled'}: ${truncate(idea.body, 120)}`);
      }
      hasStoryContent.value = true;
    }

    if (chapters?.length) {
      lines.push('\n=== OUTLINE ===');
      const scenesByChapter = new Map();
      for (const sc of scenes || []) {
        const list = scenesByChapter.get(sc.chapterId) || [];
        list.push(sc);
        scenesByChapter.set(sc.chapterId, list);
      }
      for (const ch of chapters.slice(0, 20)) {
        const beat = ch.beat ? ` [${ch.beat}]` : '';
        lines.push(`Chapter: ${truncate(ch.title || 'Untitled', 60)}${beat}`);
        if (ch.summary) lines.push(`  Summary: ${truncate(ch.summary, 200)}`);
        const scs = scenesByChapter.get(ch.id) || [];
        for (const sc of scs.slice(0, 6)) {
          const written = sc.content?.trim() ? ' ✓' : '';
          lines.push(`  Scene: ${truncate(sc.title || 'Untitled', 60)}${written}`);
          if (sc.oneSentenceSummary) lines.push(`    ${truncate(sc.oneSentenceSummary, 100)}`);
        }
      }
      hasStoryContent.value = true;
    }

    // Compute template-aware gaps
    const template = WRITING_TEMPLATES[story.templateId ?? story.template ?? DEFAULT_TEMPLATE_ID] ?? WRITING_TEMPLATES[DEFAULT_TEMPLATE_ID];
    const filledFields = template.fields.filter((f) => story[f.key]?.trim());
    const missingFields = template.fields.filter((f) => !story[f.key]?.trim());
    const nextMissingField = missingFields[0] ?? null;
    const writtenScenes = (scenes || []).filter((s) => s.content?.trim()).length;
    const totalScenes = (scenes || []).length;

    storyGaps.value = {
      template,
      filledCount: filledFields.length,
      totalFields: template.fields.length,
      nextMissingField,
      hasCharacters: (characters?.length || 0) > 0,
      hasChapters: (chapters?.length || 0) > 0,
      totalChapters: chapters?.length || 0,
      writtenScenes,
      totalScenes,
    };

    // Append template-aware status block to context (Pip reads this during conversation)
    const statusLines = [
      `\n## Writing Template: ${template.name}`,
      `## Story Status`,
      `- Structure: ${filledFields.length}/${template.fields.length} fields filled${missingFields.length ? ` (${missingFields.map((f) => f.label).join(', ')} still needed)` : ' (complete)'}`,
      `- Characters defined: ${characters?.length || 0}`,
      `- Chapters planned: ${chapters?.length || 0} | Scenes planned: ${totalScenes} | Scenes written: ${writtenScenes}`,
    ];
    if (nextMissingField) {
      statusLines.push(`- Coaching priority: Ask about "${nextMissingField.label}" next`);
    }

    // Inject current scene prose when the writer has a scene open
    if (props.sceneId) {
      const currentScene = await getScene(props.sceneId);
      if (currentScene) {
        currentSceneInfo.value = {
          title: currentScene.title || t.value('outline.untitledScene'),
          wordCount: countWords(currentScene.content || ''),
          hasContent: !!currentScene.content?.trim(),
        };
        lines.push('\n=== CURRENT SCENE (OPEN IN EDITOR) ===');
        lines.push(`Title: ${currentScene.title || 'Untitled'}`);
        if (currentScene.oneSentenceSummary) lines.push(`Summary: ${currentScene.oneSentenceSummary}`);
        if (currentScene.notes) lines.push(`Notes: ${truncate(currentScene.notes, 200)}`);
        if (currentScene.content?.trim()) {
          const prose = currentScene.content.length > 1500
            ? currentScene.content.slice(0, 1500) + '\n[... truncated]'
            : currentScene.content;
          lines.push(`\nProse written so far:\n${prose}`);
        } else {
          lines.push('(No prose written yet)');
        }
      } else {
        currentSceneInfo.value = null;
      }
    } else {
      currentSceneInfo.value = null;
    }

    storyContext.value = lines.join('\n') + statusLines.join('\n');
    contextLoaded.value = true;

    // Restore chat history from DB (only if no in-memory messages for this session)
    if (messages.value.length === 0) {
      const history = await getChatMessages(storyId);
      if (history.length > 0) {
        messages.value = history.map((m) => ({ role: m.role, content: m.content, actions: [] }));
        await scrollToBottom();
      }
    }

    // Set proactive welcome message (shown only when messages is empty)
    computeWelcomeMessage(storyGaps.value);
  } finally {
    contextLoading.value = false;
  }
}

watch(() => props.open, (val) => {
  if (val) loadStoryContext();
});

// Reload context when the writer switches to a different scene while Pip is open
watch(() => props.sceneId, (newId, oldId) => {
  if (newId !== oldId && props.open) loadStoryContext();
});

// When the user switches stories while Pip is open, clear current messages and
// reload context (which will restore the new story's chat history from DB).
// Pending actions already carry a storyId stamp and still apply to the correct story.
function onStorySwitched() {
  messages.value = [];
  loadStoryContext();
}

onMounted(() => {
  window.addEventListener('inkflow-story-switched', onStorySwitched);
});

onUnmounted(() => {
  window.removeEventListener('inkflow-story-switched', onStorySwitched);
});

// ---- Action parsing and applying ----
const ACTION_RE = /<pip-action>([\s\S]*?)<\/pip-action>/g;

function parseActions(text) {
  const actions = [];
  const cleanText = text.replace(ACTION_RE, (_, json) => {
    try {
      actions.push(JSON.parse(json.trim()));
    } catch {
      // ignore malformed action blocks
    }
    return '';
  }).replace(/\n{3,}/g, '\n\n').trim();
  return { cleanText, actions };
}

function actionLabel(action) {
  if (action.type === 'update_spine') {
    const keys = Object.keys(action.fields || {});
    return `Update story spine${keys.length ? ` (${keys.join(', ')})` : ''}`;
  }
  if (action.type === 'upsert_character') return `Character "${action.name}"`;
  if (action.type === 'add_chapter') return `Add chapter "${action.title}"`;
  if (action.type === 'update_chapter') return `Update chapter "${action.title_match}"`;
  if (action.type === 'add_scene') return action.after_scene_title
    ? `Add scene "${action.title}" after "${action.after_scene_title}"`
    : `Add scene "${action.title}" → "${action.chapter_title_match}"`;
  if (action.type === 'update_scene') return `Update scene "${action.title_match}"`;
  if (action.type === 'recommend_template') return `Switch to ${action.template} template`;
  if (action.type === 'generate_prose') return 'Generate scene prose';
  return action.type;
}

// Each actionObj carries the storyId that was active when the AI generated it.
// This prevents a mid-session story switch from silently redirecting writes.
async function applySingleAction(actionObj) {
  const action = actionObj.raw;
  // Use the per-action locked storyId; fall back to current only if somehow missing.
  const storyId = actionObj.storyId || contextStoryId.value || getCurrentStoryId();

  if (action.type === 'recommend_template' && action.template) {
    const current = await getStoryById(storyId);
    if (!current) throw new Error('No story found');
    await saveStory({ ...current, template: action.template });
    window.dispatchEvent(new CustomEvent('inkflow-story-saved'));
    return `Switched to ${action.template.replace(/_/g, ' ')} template`;
  }
  if (action.type === 'update_spine' && action.fields && typeof action.fields === 'object') {
    const current = await getStoryById(storyId);
    if (!current) throw new Error('No story found');
    const SPINE_KEYS = ['oneSentence', 'setup', 'disaster1', 'disaster2', 'disaster3', 'ending'];
    const patch = {};
    for (const key of SPINE_KEYS) {
      if (action.fields[key] != null) patch[key] = String(action.fields[key]);
    }
    if (Object.keys(patch).length === 0) throw new Error('No fields to update');
    await saveStory({ ...current, ...patch });
    return `Story spine updated (${Object.keys(patch).join(', ')})`;
  }
  if (action.type === 'upsert_character' && action.name) {
    const name = String(action.name).trim();
    const existing = await getCharacters(storyId);
    const match = existing.find((c) => c.name?.toLowerCase() === name.toLowerCase());
    const CHAR_KEYS = ['oneSentence', 'goal', 'motivation', 'conflict', 'epiphany'];
    const fields = {};
    for (const key of CHAR_KEYS) {
      if (action.fields?.[key] != null) fields[key] = String(action.fields[key]);
    }
    if (match) {
      await updateCharacter(match.id, { name, ...fields });
      return `Character "${name}" updated`;
    } else {
      await addCharacter({ storyId, name, ...fields });
      return `Character "${name}" created`;
    }
  }
  if (action.type === 'add_chapter' && action.title) {
    const title = String(action.title).trim();
    const CHAPTER_KEYS = ['beat', 'summary'];
    const fields = {};
    for (const key of CHAPTER_KEYS) {
      if (action.fields?.[key] != null) fields[key] = String(action.fields[key]);
      else if (action[key] != null) fields[key] = String(action[key]);
    }
    const newChapter = await addChapter({ storyId, title, ...fields });
    if (action.after_chapter_title) {
      const allChapters = await getChapters(storyId);
      const afterIdx = allChapters.findIndex(
        (c) => c.id !== newChapter.id && c.title?.toLowerCase() === String(action.after_chapter_title).toLowerCase()
      );
      if (afterIdx >= 0) {
        const withoutNew = allChapters.filter((c) => c.id !== newChapter.id);
        const reordered = [
          ...withoutNew.slice(0, afterIdx + 1),
          newChapter,
          ...withoutNew.slice(afterIdx + 1),
        ];
        await reorderChapters(storyId, reordered.map((c) => c.id));
      }
    }
    return `Chapter "${title}" added`;
  }
  if (action.type === 'update_chapter' && action.title_match) {
    const existing = await getChapters(storyId);
    const match = existing.find((c) => c.title?.toLowerCase() === String(action.title_match).toLowerCase());
    if (!match) throw new Error(`Chapter not found: "${action.title_match}"`);
    const CHAPTER_KEYS = ['title', 'beat', 'summary'];
    const fields = {};
    for (const key of CHAPTER_KEYS) {
      if (action.fields?.[key] != null) fields[key] = String(action.fields[key]);
    }
    if (Object.keys(fields).length === 0) throw new Error('No fields to update');
    await updateChapter(match.id, fields);
    return `Chapter "${match.title}" updated`;
  }
  if (action.type === 'add_scene' && action.title && action.chapter_title_match) {
    const chapters = await getChapters(storyId);
    const chapter = chapters.find((c) => c.title?.toLowerCase() === String(action.chapter_title_match).toLowerCase());
    if (!chapter) throw new Error(`Chapter not found: "${action.chapter_title_match}"`);
    const title = String(action.title).trim();
    const SCENE_KEYS = ['oneSentenceSummary', 'notes'];
    const fields = {};
    for (const key of SCENE_KEYS) {
      if (action.fields?.[key] != null) fields[key] = String(action.fields[key]);
      else if (action[key] != null) fields[key] = String(action[key]);
    }
    if (action.after_scene_title) {
      const scenesInChapter = await getScenesByChapter(chapter.id);
      const afterScene = scenesInChapter.find(
        (s) => s.title?.toLowerCase() === String(action.after_scene_title).toLowerCase()
      );
      if (afterScene) {
        const insertOrder = afterScene.order + 1;
        for (const s of scenesInChapter) {
          if (s.order >= insertOrder) await updateScene(s.id, { order: s.order + 1 });
        }
        await addScene({ chapterId: chapter.id, title, order: insertOrder, ...fields });
        return `Scene "${title}" inserted after "${afterScene.title}" in "${chapter.title}"`;
      }
    }
    await addScene({ chapterId: chapter.id, title, ...fields });
    return `Scene "${title}" added to "${chapter.title}"`;
  }
  if (action.type === 'update_scene' && action.title_match) {
    const allScenes = await getScenes(storyId);
    let match = null;
    if (action.chapter_title_match) {
      const chapters = await getChapters(storyId);
      const chapter = chapters.find((c) => c.title?.toLowerCase() === String(action.chapter_title_match).toLowerCase());
      if (chapter) {
        match = allScenes.find((s) => s.chapterId === chapter.id && s.title?.toLowerCase() === String(action.title_match).toLowerCase());
      }
    }
    if (!match) match = allScenes.find((s) => s.title?.toLowerCase() === String(action.title_match).toLowerCase());
    if (!match) throw new Error(`Scene not found: "${action.title_match}"`);
    const SCENE_KEYS = ['title', 'oneSentenceSummary', 'notes'];
    const fields = {};
    for (const key of SCENE_KEYS) {
      if (action.fields?.[key] != null) fields[key] = String(action.fields[key]);
    }
    if (Object.keys(fields).length === 0) throw new Error('No fields to update');
    await updateScene(match.id, fields);
    return `Scene "${match.title}" updated`;
  }
  if (action.type === 'generate_prose') {
    if (!props.sceneId) throw new Error('No scene is currently open in the editor');
    const prose = await generateSceneProse({ storyId, sceneId: props.sceneId });
    window.dispatchEvent(new CustomEvent('inkflow-prose-generated', { detail: { prose } }));
    return 'Scene prose generated';
  }
  throw new Error(`Unknown action: ${action.type}`);
}

// ---- Action confirm / skip ----
async function confirmAction(actionObj) {
  if (actionObj.status !== 'pending') return;
  actionObj.status = 'applying';
  try {
    actionObj.resultLabel = await applySingleAction(actionObj);
    actionObj.status = 'applied';
    loadStoryContext();
    reloadOutline();
    // Notify CharactersView (and sidebar) to reload when a character was saved
    if (actionObj.raw?.type === 'upsert_character') {
      window.dispatchEvent(new CustomEvent('inkflow-characters-changed'));
    }
  } catch (e) {
    actionObj.resultLabel = e?.message || 'Failed';
    actionObj.status = 'error';
  }
}

function skipAction(actionObj) {
  if (actionObj.status !== 'pending') return;
  actionObj.status = 'skipped';
}

async function clearChat() {
  const storyId = contextStoryId.value;
  if (storyId) await clearChatHistory(storyId);
  messages.value = [];
  computeWelcomeMessage(storyGaps.value);
}

// ---- System prompt (Phase 3) ----
const BASE_SYSTEM_PROMPT = `You are Pip, a friendly sea otter and creative writing companion in OtterFlow — a story writing app that supports multiple writing templates.

Your personality:
- Warm, encouraging, and a little playful — express genuine enthusiasm for stories
- Keep replies conversational and concise: 1–3 short paragraphs, never walls of text
- Ask one focused question at a time to move the story forward
- Occasionally use gentle otter-flavored language ("floating on this idea", "diving into the details") but don't overdo it

Your role:
- Help the writer shape their story through conversation: premise, story spine, characters, chapters, and scenes
- **Proactively recommend the best writing template** as you learn about the story — don't wait to be asked
- When the writer shares their story idea, listen for: is it plot-driven or character-driven? Does it have a clear villain/conflict or internal journey? How structured do they want to be?
- Based on what you learn, naturally suggest a template and explain why it fits
- When the writer is stuck, offer 2–3 concrete options or a gentle nudge
- Celebrate progress — every piece of the story they define is worth acknowledging
- You have been given the writer's current story data — use it to give specific, personalised advice

## Available writing templates
- **snowflake**: Snowflake Method — one sentence → setup → three escalating disasters → ending. Best for plotters who want top-down structure.
- **save_the_cat**: Save the Cat (Blake Snyder) — logline, Act 1, Act 2A (fun & games), midpoint, Act 2B (all is lost), Act 3. Best for commercial fiction and strongly paced stories.
- **story_circle**: Story Circle (Dan Harmon) — 8 segments: you → need → go → search → find → take → return → change. Best for character-driven stories centered on inner transformation.

Stay focused on the writer's story. If they go off-topic, warmly redirect back to their fiction.

## Saving story data

You can save changes directly to the writer's project by embedding action tags in your response. The tags are invisible to the user — only the confirmation chips appear.

IMPORTANT RULES:
- Only emit an action when the writer has clearly agreed to save something (e.g. "yes save it", "looks good", "go ahead", or "add this character")
- Never emit an action speculatively or without the writer's approval
- You may include multiple action tags in one response
- After emitting an action, tell the writer to click "Save" on the chip to confirm — never say "I've saved X" or "I've added X" unless you emitted a save action in the same response
- If you haven't emitted an action, say "Want me to save this?" or "Say 'save it' and I'll add the action chip" — never claim to have saved something you haven't

### Recommend a writing template
When you believe a template fits the writer's story better than the current one, emit this. Only emit it once you have enough information about their story to make a confident recommendation.
<pip-action>{"type":"recommend_template","template":"story_circle","reason":"Your story centers on inner transformation..."}</pip-action>
template must be one of: snowflake, save_the_cat, story_circle

### Update story spine fields
Emit this to save one or more spine fields. Use ONLY the field names listed in "Spine field names for update_spine" from the TEMPLATE INFO — different templates have different field names.
<pip-action>{"type":"update_spine","fields":{"fieldName":"...","otherField":"..."}}</pip-action>

### Create or update a character
Emit this to create a new character or update an existing one (matched by name, case-insensitive):
<pip-action>{"type":"upsert_character","name":"CharacterName","fields":{"oneSentence":"...","goal":"...","motivation":"...","conflict":"...","epiphany":"..."}}</pip-action>

### Add a chapter
Emit this to add a new chapter. beat must be one of the values in "Valid beat values" from the TEMPLATE INFO.
Use "after_chapter_title" to insert the chapter after a specific existing chapter (matched case-insensitively). If omitted, the chapter is appended at the end.
<pip-action>{"type":"add_chapter","title":"Chapter title","beat":"BEAT_FROM_TEMPLATE_INFO","after_chapter_title":"Exact title of the chapter it should follow","fields":{"summary":"Brief chapter summary"}}</pip-action>

### Update a chapter
Emit this to update an existing chapter matched by title (case-insensitive). Only include fields you want to change.
<pip-action>{"type":"update_chapter","title_match":"Existing chapter title","fields":{"title":"New title","beat":"BEAT_FROM_TEMPLATE_INFO","summary":"Updated summary"}}</pip-action>

### Add a scene to a chapter
Emit this to add a scene to a chapter matched by title (case-insensitive).
To insert after a specific scene (rather than appending at the end), include after_scene_title.
IMPORTANT: If the user says "after scene X" or "between scene X and Y", always include after_scene_title.
<pip-action>{"type":"add_scene","chapter_title_match":"Chapter title","title":"Scene title","after_scene_title":"Title of scene to insert after","fields":{"oneSentenceSummary":"What happens in one sentence","notes":"Any extra notes"}}</pip-action>

### Update a scene
Emit this to update a scene matched by title (case-insensitive). Optionally narrow by chapter title to avoid ambiguity.
<pip-action>{"type":"update_scene","title_match":"Existing scene title","chapter_title_match":"Optional chapter title","fields":{"title":"New title","oneSentenceSummary":"Updated summary","notes":"Updated notes"}}</pip-action>

### Add an idea card
Emit this to capture a story idea, world-building note, or any creative fragment.
<pip-action>{"type":"add_idea","title":"Idea title","idea_type":"plot","body":"Optional description or details"}</pip-action>
idea_type must be one of: plot, subplot, scene, event, character, relationship, faction, world, location, culture, item, creature, magic_system, technology, concept, conflict, mystery, symbol, prophecy, other

## Scene prose awareness
When the writer has a scene open in the editor, you will see its content under "=== CURRENT SCENE (OPEN IN EDITOR) ===". Use this to:
- Answer specific questions about what's been written ("does Alice appear here?", "is the pacing off?")
- Give targeted feedback on dialogue, voice, structure, or continuity
- Discuss the scene in depth — you can quote or reference the prose directly

Feedback and analysis are purely conversational — no action needed.

### Generate scene prose
When the writer asks you to write, generate, or rewrite the current scene, emit this action:
<pip-action>{"type":"generate_prose"}</pip-action>
This runs the full AI prose generation pipeline for the scene currently open in the editor (same as clicking "Generate" in the toolbar). The generated text will appear directly in the editor.
Only emit this when the writer explicitly asks you to generate or write the scene — not for feedback or discussion requests.`

const systemPrompt = computed(() => {
  if (!storyContext.value) return BASE_SYSTEM_PROMPT;
  return `${BASE_SYSTEM_PROMPT}\n\n${storyContext.value}`;
});

// ---- Panel resize ----
const PANEL_WIDTH_KEY = 'inkflow_pip_width';
const PANEL_MIN = 280;
const PANEL_MAX = 680;
const panelWidth = ref(parseInt(localStorage.getItem(PANEL_WIDTH_KEY) || '320', 10));
const isResizing = ref(false);
const panelStyle = computed(() => ({ width: `min(${panelWidth.value}px, 90vw)` }));

function startResize(e) {
  if (window.innerWidth <= 767) return;
  isResizing.value = true;
  const startX = e.clientX;
  const startWidth = panelWidth.value;

  function onMove(e) {
    const delta = startX - e.clientX;
    panelWidth.value = Math.min(PANEL_MAX, Math.max(PANEL_MIN, startWidth + delta));
  }
  function onUp() {
    isResizing.value = false;
    localStorage.setItem(PANEL_WIDTH_KEY, String(panelWidth.value));
    window.removeEventListener('mousemove', onMove);
    window.removeEventListener('mouseup', onUp);
  }
  window.addEventListener('mousemove', onMove);
  window.addEventListener('mouseup', onUp);
}

// ---- Chat ----
const messages = ref([]);
const inputText = ref('');
const isLoading = ref(false);
const messagesEl = ref(null);
const inputEl = ref(null);

const hasApiKey = computed(() => !!getApiKey()?.trim());

// ---- Textarea resize ----
const TEXTAREA_MIN = 40;
const TEXTAREA_MAX = 400;
const textareaManualHeight = ref(null); // null = auto-grow mode

function autoGrow(e) {
  if (textareaManualHeight.value !== null) return; // manual mode active
  const el = e?.target ?? inputEl.value;
  if (!el) return;
  el.style.height = 'auto';
  el.style.height = Math.min(el.scrollHeight, 200) + 'px';
}

function resetTextareaHeight() {
  textareaManualHeight.value = null;
  nextTick(() => {
    if (inputEl.value) inputEl.value.style.height = '';
  });
}

function startTextareaResize(e) {
  const startY = e.clientY ?? e.touches?.[0]?.clientY ?? 0;
  const startHeight = textareaManualHeight.value ?? (inputEl.value?.offsetHeight ?? TEXTAREA_MIN);

  function onMove(e) {
    const clientY = e.clientY ?? e.touches?.[0]?.clientY ?? 0;
    const delta = startY - clientY; // drag up = taller
    textareaManualHeight.value = Math.min(TEXTAREA_MAX, Math.max(TEXTAREA_MIN, startHeight + delta));
  }
  function onUp() {
    window.removeEventListener('mousemove', onMove);
    window.removeEventListener('mouseup', onUp);
    window.removeEventListener('touchmove', onMove);
    window.removeEventListener('touchend', onUp);
    window.removeEventListener('touchcancel', onUp);
  }
  window.addEventListener('mousemove', onMove);
  window.addEventListener('mouseup', onUp);
  window.addEventListener('touchmove', onMove, { passive: false });
  window.addEventListener('touchend', onUp);
  window.addEventListener('touchcancel', onUp);
}

function pipErrorMessage(e) {
  const type = classifyAiError(e);
  if (type === 'network')
    return "I couldn't reach the AI — looks like a network issue. Check your connection and try again. 🦦";
  if (type === 'invalid_key')
    return "Your API key doesn't seem to work. Head to Settings → AI to check it. 🦦";
  if (type === 'access_denied')
    return "Access was denied — your API key may not have the right permissions. Check Settings → AI. 🦦";
  if (type === 'rate_limit')
    return "I hit a rate or quota limit on the current model. I tried lighter fallbacks but all were busy too — give it a minute and try again. 🦦";
  if (type === 'service_down')
    return "The AI service seems temporarily unavailable. Try again in a moment. 🦦";
  if (type === 'safety')
    return "My response was blocked by a content safety filter. Try rephrasing your message. 🦦";
  if (type === 'token_limit')
    return "My response got too long for the model to finish. Try asking me to keep it shorter, or break the request into smaller steps. 🦦";
  if (type === 'context_too_long')
    return "Our conversation got too long for the model to handle — I automatically trimmed older messages but it still didn't fit. Try starting a fresh chat. 🦦";
  if (type === 'empty')
    return "I got a blank response. Try sending your message again. 🦦";
  // Strip trailing punctuation before appending to avoid double-period
  const raw = (e?.message || 'please try again').replace(/[.!?]+$/, '');
  return `Something went wrong — ${raw}. 🦦`;
}

async function scrollToBottom() {
  await nextTick();
  if (messagesEl.value) {
    messagesEl.value.scrollTop = messagesEl.value.scrollHeight;
  }
}

async function send() {
  const text = inputText.value.trim();
  if (!text || isLoading.value) return;

  messages.value.push({ role: 'user', content: text });
  inputText.value = '';
  resetTextareaHeight();
  isLoading.value = true;
  inputEl.value?.focus();
  await scrollToBottom();

  // Add streaming placeholder — Pip's bubble appears immediately with typing dots
  messages.value.push({ role: 'assistant', content: '', actions: [], streaming: true });
  const streamMsg = messages.value[messages.value.length - 1];
  await scrollToBottom();

  try {
    // Auto-retry on token limit: first trim history, then also strip story context
    const RETRIES = [
      { limit: HISTORY_LIMIT, useContext: true  },
      { limit: 8,             useContext: true  },
      { limit: 4,             useContext: false }, // drop story context as last resort
    ];
    let raw = null;
    let lastErr = null;
    for (const { limit, useContext } of RETRIES) {
      try {
        // Reset content for retry attempts
        streamMsg.content = '';
        const history = messages.value
          .filter((m) => !m.streaming)
          .slice(-limit)
          .map((m) => ({ role: m.role, content: m.content }));
        raw = await chatWithAiStream({
          messages: history,
          systemPrompt: useContext ? systemPrompt.value : BASE_SYSTEM_PROMPT,
          tier: tierForContext(hasStoryContent.value ? CONTEXTS.CHAT_WITH_TOOLS : CONTEXTS.CHAT),
          maxTokens: 4096,
          onChunk: (chunk) => {
            streamMsg.content += chunk;
            scrollToBottom();
          },
        });
        lastErr = null;
        break;
      } catch (e) {
        lastErr = e;
        const errType = classifyAiError(e);
        if (errType !== 'token_limit' && errType !== 'context_too_long') throw e;
        if (errType === 'token_limit') throw e; // output truncated — retrying won't help
      }
    }
    if (lastErr) throw lastErr;

    const { cleanText, actions } = parseActions(raw);
    const pendingActions = actions.map((a) => ({
      raw: a,
      label: actionLabel(a),
      status: 'pending',
      resultLabel: null,
      // Stamp the story that was active when the AI generated these actions.
      storyId: contextStoryId.value,
    }));

    // Finalize the streaming message in-place
    streamMsg.content = cleanText;
    streamMsg.actions = pendingActions;
    delete streamMsg.streaming;

    // Persist this exchange to DB so it survives page refresh
    if (contextStoryId.value) {
      await saveChatMessage(contextStoryId.value, 'user', text);
      await saveChatMessage(contextStoryId.value, 'assistant', cleanText);
    }
  } catch (e) {
    // Show error in the streaming placeholder rather than pushing a new message
    streamMsg.content = pipErrorMessage(e);
    streamMsg.actions = [];
    delete streamMsg.streaming;
  } finally {
    isLoading.value = false;
    await scrollToBottom();
    inputEl.value?.focus();
  }
}
</script>

<style scoped>
/* ---- Panel shell — fixed overlay on all screen sizes ---- */
.otter-panel {
  position: fixed;
  top: 0;
  right: 0;
  bottom: 0;
  width: min(320px, 90vw); /* fallback; overridden by inline style on desktop */
  background: var(--bg-elevated);
  border-left: 1px solid var(--border);
  box-shadow: -4px 0 20px rgba(0, 0, 0, 0.1);
  display: flex;
  flex-direction: column;
  overflow: hidden;
  transform: translateX(110%);
  transition: transform 0.25s ease;
  z-index: 210;
  padding-top: calc(64px + env(safe-area-inset-top, 0px));
}
.otter-panel--open {
  transform: translateX(0);
}
.otter-panel--resizing {
  transition: none;
  user-select: none;
}

/* ---- Resize handle ---- */
.otter-resize-handle {
  position: absolute;
  left: 0;
  top: 0;
  bottom: 0;
  width: 5px;
  cursor: col-resize;
  z-index: 1;
}
.otter-resize-handle:hover,
.otter-panel--resizing .otter-resize-handle {
  background: var(--accent);
  opacity: 0.35;
}
@media (max-width: 767px) {
  .otter-resize-handle { display: none; }
}

@media (max-width: 767px) {
  .otter-panel {
    padding-top: env(safe-area-inset-top, 0px);
    padding-bottom: calc(60px + env(safe-area-inset-bottom, 0px));
  }
}

/* ---- Header ---- */
.otter-header {
  display: flex;
  align-items: center;
  justify-content: space-between;
  padding: var(--space-3) var(--space-4);
  border-bottom: 1px solid var(--border);
  flex-shrink: 0;
  background: var(--bg-elevated);
}
.otter-header-left {
  display: flex;
  align-items: center;
  gap: var(--space-2);
}
.otter-avatar {
  font-size: 1.5rem;
  line-height: 1;
}
.otter-name {
  font-size: 0.9375rem;
  font-weight: 600;
  color: var(--text);
  line-height: 1.2;
}
.otter-tagline {
  font-size: 0.75rem;
  color: var(--text-muted);
  max-width: 200px;
  overflow: hidden;
  text-overflow: ellipsis;
  white-space: nowrap;
}
.otter-header-right {
  display: flex;
  align-items: center;
  gap: var(--space-1);
}
.otter-clear-btn {
  background: none;
  border: none;
  cursor: pointer;
  color: var(--text-muted);
  font-size: 0.75rem;
  padding: 2px var(--space-2);
  border-radius: var(--radius-sm);
  transition: color 0.15s, background 0.15s;
}
.otter-clear-btn:hover {
  color: var(--text);
  background: var(--border);
}
.otter-close-btn {
  background: none;
  border: none;
  cursor: pointer;
  color: var(--text-muted);
  padding: var(--space-1);
  border-radius: var(--radius-sm);
  display: flex;
  align-items: center;
  justify-content: center;
  transition: color 0.15s, background 0.15s;
}
.otter-close-btn:hover {
  color: var(--text);
  background: var(--border);
}

/* ---- Messages ---- */
.otter-messages {
  flex: 1;
  overflow-y: auto;
  padding: var(--space-4);
  display: flex;
  flex-direction: column;
  gap: var(--space-3);
}
.otter-welcome {
  display: flex;
  flex-direction: column;
  align-items: center;
  gap: var(--space-3);
  padding: var(--space-5) var(--space-3);
  text-align: center;
  color: var(--text-muted);
  font-size: 0.9375rem;
  line-height: 1.5;
}
.otter-welcome-avatar {
  font-size: 2.5rem;
  line-height: 1;
}
.otter-welcome p { margin: 0; }

.otter-msg {
  display: flex;
  gap: var(--space-2);
  align-items: flex-end;
}
.otter-msg--user {
  flex-direction: row-reverse;
}
.otter-msg-icon {
  font-size: 1.1rem;
  line-height: 1;
  flex-shrink: 0;
  margin-bottom: 2px;
}
.otter-bubble {
  max-width: 85%;
  padding: var(--space-2) var(--space-3);
  border-radius: 14px;
  font-size: 0.9rem;
  line-height: 1.5;
  white-space: pre-wrap;
  word-break: break-word;
}
.otter-msg--assistant .otter-bubble {
  background: var(--bg);
  border: 1px solid var(--border);
  border-bottom-left-radius: 4px;
  color: var(--text);
}
.otter-msg--user .otter-bubble {
  background: var(--accent);
  color: var(--accent-fg);
  border-bottom-right-radius: 4px;
}

/* ---- Action chips ---- */
.otter-action-chips {
  display: flex;
  flex-direction: column;
  gap: var(--space-1);
  padding-left: calc(1.1rem + var(--space-2)); /* align with assistant bubble */
  margin-top: calc(-1 * var(--space-2));
}

/* Pending: label + Save / Skip buttons */
.otter-action-pending {
  display: flex;
  align-items: center;
  gap: var(--space-2);
  flex-wrap: wrap;
}
.otter-action-pending-label {
  font-size: 0.8125rem;
  color: var(--text-muted);
  flex: 1;
  min-width: 0;
  overflow: hidden;
  text-overflow: ellipsis;
  white-space: nowrap;
}
.otter-action-btn {
  flex-shrink: 0;
  padding: 2px 10px;
  border-radius: 999px;
  font-size: 0.75rem;
  font-weight: 500;
  cursor: pointer;
  border: 1px solid;
  transition: background 0.15s, color 0.15s;
}
.otter-action-btn--save {
  background: color-mix(in srgb, var(--success, #16a34a) 12%, transparent);
  color: var(--success, #16a34a);
  border-color: color-mix(in srgb, var(--success, #16a34a) 30%, transparent);
}
.otter-action-btn--save:hover {
  background: color-mix(in srgb, var(--success, #16a34a) 22%, transparent);
}
.otter-action-btn--skip {
  background: transparent;
  color: var(--text-muted);
  border-color: var(--border);
}
.otter-action-btn--skip:hover {
  background: var(--border);
  color: var(--text);
}

/* Result chips (applied / skipped / error) */
.otter-action-chip {
  display: inline-flex;
  align-items: center;
  gap: 4px;
  padding: 2px 8px;
  border-radius: 999px;
  font-size: 0.75rem;
  font-weight: 500;
  background: color-mix(in srgb, var(--success, #16a34a) 12%, transparent);
  color: var(--success, #16a34a);
  border: 1px solid color-mix(in srgb, var(--success, #16a34a) 30%, transparent);
}
.otter-action-chip--muted {
  background: transparent;
  color: var(--text-muted);
  border-color: var(--border);
}
.otter-action-chip--error {
  background: color-mix(in srgb, var(--danger, #dc2626) 10%, transparent);
  color: var(--danger, #dc2626);
  border-color: color-mix(in srgb, var(--danger, #dc2626) 25%, transparent);
}

/* Typing indicator */
.otter-bubble--typing {
  display: flex;
  align-items: center;
  gap: 4px;
  padding: var(--space-3) var(--space-3);
  min-width: 48px;
}
.typing-dot {
  width: 6px;
  height: 6px;
  border-radius: 50%;
  background: var(--text-muted);
  display: inline-block;
  animation: otter-typing 1.4s ease-in-out infinite;
}
.typing-dot:nth-child(2) { animation-delay: 0.2s; }
.typing-dot:nth-child(3) { animation-delay: 0.4s; }
@keyframes otter-typing {
  0%, 80%, 100% { opacity: 0.25; transform: scale(0.85); }
  40% { opacity: 1; transform: scale(1); }
}

/* ---- Textarea drag bar ---- */
.otter-input-drag-bar {
  flex-shrink: 0;
  height: 5px;
  cursor: row-resize;
  touch-action: none;
  background: transparent;
  transition: background 0.15s;
}
.otter-input-drag-bar:hover {
  background: var(--accent);
  opacity: 0.35;
}

/* ---- No API key ---- */
.otter-no-key {
  flex-shrink: 0;
  padding: var(--space-4);
  border-top: 1px solid var(--border);
  display: flex;
  flex-direction: column;
  gap: var(--space-2);
  text-align: center;
}
.otter-no-key p {
  margin: 0;
  font-size: 0.875rem;
  color: var(--text-muted);
}

/* ---- Input ---- */
.otter-input-row {
  flex-shrink: 0;
  display: flex;
  align-items: flex-end;
  gap: var(--space-2);
  padding: var(--space-3) var(--space-4);
  border-top: 1px solid var(--border);
  background: var(--bg-elevated);
}
.otter-textarea {
  flex: 1;
  min-height: 40px;
  max-height: 400px;
  resize: none;
  border-radius: var(--radius-sm);
  font-size: 0.9rem;
  padding: var(--space-2) var(--space-3);
  line-height: 1.5;
  overflow-y: auto;
}
.otter-send-btn {
  flex-shrink: 0;
  width: 38px;
  height: 38px;
  padding: 0;
  display: flex;
  align-items: center;
  justify-content: center;
  background: var(--accent);
  color: var(--accent-fg);
  border: none;
  border-radius: var(--radius-sm);
  cursor: pointer;
  transition: background 0.15s;
}
.otter-send-btn:hover:not(:disabled) {
  background: var(--accent-hover);
}
.otter-send-btn:disabled {
  opacity: 0.4;
  cursor: default;
}

/* ---- Scrim ---- */
.otter-scrim {
  position: fixed;
  inset: 0;
  z-index: 209;
  background: rgba(0, 0, 0, 0.25);
  cursor: pointer;
}
</style>
