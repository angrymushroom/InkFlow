<template>
  <div class="otter-panel" :class="{ 'otter-panel--open': open }">
    <!-- Header -->
    <div class="otter-header">
      <div class="otter-header-left">
        <span class="otter-avatar" aria-hidden="true">🦦</span>
        <div>
          <div class="otter-name">Pip</div>
          <div class="otter-tagline">{{ contextLoaded ? storyTitle : 'Story companion' }}</div>
        </div>
      </div>
      <button type="button" class="otter-close-btn" aria-label="Close chat" @click="$emit('close')">
        <svg width="16" height="16" viewBox="0 0 24 24" fill="none" stroke="currentColor" stroke-width="2.5" stroke-linecap="round" aria-hidden="true"><path d="M18 6 6 18M6 6l12 12"/></svg>
      </button>
    </div>

    <!-- Messages -->
    <div class="otter-messages" ref="messagesEl">
      <!-- Welcome shown only when no messages yet -->
      <div v-if="messages.length === 0" class="otter-welcome">
        <span class="otter-welcome-avatar" aria-hidden="true">🦦</span>
        <p v-if="contextLoading">Reading your story…</p>
        <p v-else-if="hasStoryContent">{{ welcomeWithContext }}</p>
        <p v-else>Hi! I'm Pip, your story companion. Tell me about the story you want to write — or just say hello and we'll find an idea together!</p>
      </div>

      <template v-for="(msg, i) in messages" :key="i">
        <div
          class="otter-msg"
          :class="msg.role === 'assistant' ? 'otter-msg--assistant' : 'otter-msg--user'"
        >
          <span v-if="msg.role === 'assistant'" class="otter-msg-icon" aria-hidden="true">🦦</span>
          <div class="otter-bubble">{{ msg.content }}</div>
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

      <!-- Typing indicator -->
      <div v-if="isLoading" class="otter-msg otter-msg--assistant">
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
      <p>Set your API key in Settings to chat with Pip 🦦</p>
      <router-link to="/settings" class="btn btn-ghost btn-sm" @click="$emit('close')">Go to Settings</router-link>
    </div>

    <!-- Input -->
    <div v-else class="otter-input-row">
      <textarea
        ref="inputEl"
        v-model="inputText"
        class="otter-textarea"
        :placeholder="isLoading ? 'Pip is thinking…' : 'Talk to Pip…'"
        :disabled="isLoading"
        rows="2"
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
import { ref, computed, watch, nextTick } from 'vue';
import { chatWithAi, getApiKey, CONTEXTS, tierForContext, classifyAiError } from '@/services/ai';
import {
  getCurrentStoryId, getStoryById, getStory, saveStory,
  getIdeas, getCharacters, addCharacter, updateCharacter,
  getChapters, addChapter, updateChapter,
  getScenes, addScene, updateScene,
} from '@/db';

const props = defineProps({ open: Boolean });
const emit = defineEmits(['close']);

const HISTORY_LIMIT = 20;

// ---- Story context (Phase 2) ----
const storyContext = ref('');
const storyTitle = ref('Story companion');
const contextLoading = ref(false);
const contextLoaded = ref(false);
const hasStoryContent = ref(false);
const welcomeWithContext = ref('');

function truncate(s, n) { return s && s.length > n ? s.slice(0, n) + '…' : (s || ''); }

async function loadStoryContext() {
  contextLoading.value = true;
  contextLoaded.value = false;
  storyContext.value = '';
  hasStoryContent.value = false;

  try {
    const storyId = getCurrentStoryId();
    if (!storyId) return;

    const [story, ideas, characters, chapters, scenes] = await Promise.all([
      getStoryById(storyId),
      getIdeas(storyId),
      getCharacters(storyId),
      getChapters(storyId),
      getScenes(storyId),
    ]);

    if (!story) return;
    storyTitle.value = truncate(story.title || 'Untitled story', 28);

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
        const scs = scenesByChapter.get(ch.id) || [];
        for (const sc of scs.slice(0, 6)) {
          const written = sc.prose?.trim() ? ' ✓' : '';
          lines.push(`  Scene: ${truncate(sc.title || 'Untitled', 60)}${written}`);
          if (sc.oneSentenceSummary) lines.push(`    ${truncate(sc.oneSentenceSummary, 100)}`);
        }
      }
      hasStoryContent.value = true;
    }

    storyContext.value = lines.join('\n');
    contextLoaded.value = true;

    if (hasStoryContent.value) {
      const spineCount = spineFields.length;
      const charCount = characters?.length || 0;
      const chapterCount = chapters?.length || 0;
      const writtenScenes = (scenes || []).filter((s) => s.prose?.trim()).length;
      const totalScenes = (scenes || []).length;

      const parts = [];
      if (spineCount >= 3) parts.push('a solid story spine');
      else if (spineCount > 0) parts.push('a story spine in progress');
      if (charCount > 0) parts.push(`${charCount} character${charCount > 1 ? 's' : ''}`);
      if (chapterCount > 0) parts.push(`${chapterCount} chapter${chapterCount > 1 ? 's' : ''}`);
      if (writtenScenes > 0) parts.push(`${writtenScenes}/${totalScenes} scenes written`);

      const summary = parts.length ? `I can see you have ${parts.join(', ')}. ` : '';
      welcomeWithContext.value = `Hi! I'm Pip 🦦 — I've read your story. ${summary}What would you like to work on?`;
    }
  } finally {
    contextLoading.value = false;
  }
}

watch(() => props.open, (val) => {
  if (val) loadStoryContext();
});

// ---- Action parsing and applying (Phase 3) ----
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
  if (action.type === 'add_scene') return `Add scene "${action.title}" → "${action.chapter_title_match}"`;
  if (action.type === 'update_scene') return `Update scene "${action.title_match}"`;
  return action.type;
}

async function applySingleAction(action) {
  if (action.type === 'update_spine' && action.fields && typeof action.fields === 'object') {
    const current = await getStory();
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
    const storyId = getCurrentStoryId();
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
    const storyId = getCurrentStoryId();
    const title = String(action.title).trim();
    const CHAPTER_KEYS = ['beat', 'summary'];
    const fields = {};
    for (const key of CHAPTER_KEYS) {
      if (action.fields?.[key] != null) fields[key] = String(action.fields[key]);
      else if (action[key] != null) fields[key] = String(action[key]);
    }
    await addChapter({ storyId, title, ...fields });
    return `Chapter "${title}" added`;
  }
  if (action.type === 'update_chapter' && action.title_match) {
    const storyId = getCurrentStoryId();
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
    const storyId = getCurrentStoryId();
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
    await addScene({ chapterId: chapter.id, title, ...fields });
    return `Scene "${title}" added to "${chapter.title}"`;
  }
  if (action.type === 'update_scene' && action.title_match) {
    const storyId = getCurrentStoryId();
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
  throw new Error(`Unknown action: ${action.type}`);
}

async function confirmAction(actionObj) {
  if (actionObj.status !== 'pending') return;
  actionObj.status = 'applying';
  try {
    actionObj.resultLabel = await applySingleAction(actionObj.raw);
    actionObj.status = 'applied';
    loadStoryContext();
  } catch (e) {
    actionObj.resultLabel = e?.message || 'Failed';
    actionObj.status = 'error';
  }
}

function skipAction(actionObj) {
  if (actionObj.status !== 'pending') return;
  actionObj.status = 'skipped';
}

// ---- System prompt (Phase 3) ----
const BASE_SYSTEM_PROMPT = `You are Pip, a friendly sea otter and creative writing companion in InkFlow — a writing app that uses the Snowflake Method to build stories step by step.

Your personality:
- Warm, encouraging, and a little playful — express genuine enthusiasm for stories
- Keep replies conversational and concise: 1–3 short paragraphs, never walls of text
- Ask one focused question at a time to move the story forward
- Occasionally use gentle otter-flavored language ("floating on this idea", "diving into the details") but don't overdo it

Your role:
- Help the writer shape their story through conversation: premise, spine (setup, three disasters, ending), characters, chapters, and scenes
- Use Snowflake Method framing when helpful: start with one sentence → expand the spine → develop characters → detail the scenes
- When the writer is stuck, offer 2–3 concrete options or a gentle nudge
- Celebrate progress — every piece of the story they define is worth acknowledging
- You have been given the writer's current story data — use it to give specific, personalised advice

Stay focused on the writer's story. If they go off-topic, warmly redirect back to their fiction.

## Saving story data

You can save changes directly to the writer's project by embedding action tags in your response. The tags are invisible to the user — only the confirmation chips appear.

IMPORTANT RULES:
- Only emit an action when the writer has clearly agreed to save something (e.g. "yes save it", "looks good", "go ahead")
- Never emit an action speculatively or without the writer's approval
- You may include multiple action tags in one response
- After saving, briefly confirm what was saved and ask what to work on next

### Update story spine fields
Emit this to save one or more spine fields (only include fields you want to change):
<pip-action>{"type":"update_spine","fields":{"oneSentence":"...","setup":"...","disaster1":"...","disaster2":"...","disaster3":"...","ending":"..."}}</pip-action>

### Create or update a character
Emit this to create a new character or update an existing one (matched by name, case-insensitive):
<pip-action>{"type":"upsert_character","name":"CharacterName","fields":{"oneSentence":"...","goal":"...","motivation":"...","conflict":"...","epiphany":"..."}}</pip-action>

### Add a chapter
Emit this to add a new chapter. beat must be one of: setup, disaster1, disaster2, disaster3, ending.
<pip-action>{"type":"add_chapter","title":"Chapter title","beat":"setup","fields":{"summary":"Brief chapter summary"}}</pip-action>

### Update a chapter
Emit this to update an existing chapter matched by title (case-insensitive). Only include fields you want to change.
<pip-action>{"type":"update_chapter","title_match":"Existing chapter title","fields":{"title":"New title","beat":"disaster1","summary":"Updated summary"}}</pip-action>

### Add a scene to a chapter
Emit this to add a scene to a chapter matched by title (case-insensitive).
<pip-action>{"type":"add_scene","chapter_title_match":"Chapter title","title":"Scene title","fields":{"oneSentenceSummary":"What happens in one sentence","notes":"Any extra notes"}}</pip-action>

### Update a scene
Emit this to update a scene matched by title (case-insensitive). Optionally narrow by chapter title to avoid ambiguity.
<pip-action>{"type":"update_scene","title_match":"Existing scene title","chapter_title_match":"Optional chapter title","fields":{"title":"New title","oneSentenceSummary":"Updated summary","notes":"Updated notes"}}</pip-action>`;

const systemPrompt = computed(() => {
  if (!storyContext.value) return BASE_SYSTEM_PROMPT;
  return `${BASE_SYSTEM_PROMPT}\n\n${storyContext.value}`;
});

// ---- Chat ----
const messages = ref([]);
const inputText = ref('');
const isLoading = ref(false);
const messagesEl = ref(null);
const inputEl = ref(null);

const hasApiKey = computed(() => !!getApiKey()?.trim());

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
  isLoading.value = true;
  inputEl.value?.focus();
  await scrollToBottom();

  try {
    // Auto-retry on token limit: first trim history, then also strip story context
    // useContext=false falls back to BASE_SYSTEM_PROMPT without the story data blob
    const RETRIES = [
      { limit: HISTORY_LIMIT, useContext: true  },
      { limit: 8,             useContext: true  },
      { limit: 4,             useContext: false }, // drop story context as last resort
    ];
    let raw = null;
    let lastErr = null;
    for (const { limit, useContext } of RETRIES) {
      try {
        const history = messages.value.slice(-limit).map((m) => ({
          role: m.role,
          content: m.content,
        }));
        raw = await chatWithAi({
          messages: history,
          systemPrompt: useContext ? systemPrompt.value : BASE_SYSTEM_PROMPT,
          tier: tierForContext(CONTEXTS.CHAT_WITH_TOOLS),
          maxTokens: 600,
        });
        lastErr = null;
        break;
      } catch (e) {
        lastErr = e;
        if (classifyAiError(e) !== 'token_limit') throw e;
      }
    }
    if (lastErr) throw lastErr;

    const { cleanText, actions } = parseActions(raw);
    const pendingActions = actions.map((a) => ({
      raw: a,
      label: actionLabel(a),
      status: 'pending',
      resultLabel: null,
    }));

    messages.value.push({ role: 'assistant', content: cleanText, actions: pendingActions });
  } catch (e) {
    messages.value.push({
      role: 'assistant',
      content: pipErrorMessage(e),
      actions: [],
    });
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
  width: min(320px, 90vw);
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
  min-height: unset;
  max-height: 120px;
  resize: none;
  border-radius: var(--radius-sm);
  font-size: 0.9rem;
  padding: var(--space-2) var(--space-3);
  line-height: 1.5;
  overflow-y: auto;
  min-height: 40px !important;
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
