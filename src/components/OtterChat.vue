<template>
  <div class="otter-panel" :class="{ 'otter-panel--open': open }">
    <!-- Header -->
    <div class="otter-header">
      <div class="otter-header-left">
        <span class="otter-avatar" aria-hidden="true">🦦</span>
        <div>
          <div class="otter-name">Pip</div>
          <div class="otter-tagline">Story companion</div>
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
        <p>Hi! I'm Pip, your story companion. Tell me about the story you want to write — or just say hello and we'll find an idea together!</p>
      </div>

      <div
        v-for="(msg, i) in messages"
        :key="i"
        class="otter-msg"
        :class="msg.role === 'assistant' ? 'otter-msg--assistant' : 'otter-msg--user'"
      >
        <span v-if="msg.role === 'assistant'" class="otter-msg-icon" aria-hidden="true">🦦</span>
        <div class="otter-bubble">{{ msg.content }}</div>
      </div>

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
import { ref, computed, nextTick } from 'vue';
import { chatWithAi, getApiKey } from '@/services/ai';

const props = defineProps({ open: Boolean });
const emit = defineEmits(['close']);

const HISTORY_LIMIT = 20; // messages kept in API context

const SYSTEM_PROMPT = `You are Pip, a friendly sea otter and creative writing companion in InkFlow — a writing app that uses the Snowflake Method to build stories step by step.

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

Stay focused on the writer's story. If they go off-topic, warmly redirect back to their fiction.`;

const messages = ref([]);
const inputText = ref('');
const isLoading = ref(false);
const messagesEl = ref(null);
const inputEl = ref(null);

const hasApiKey = computed(() => !!getApiKey()?.trim());

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
  await scrollToBottom();

  try {
    // Send only the last HISTORY_LIMIT messages to avoid token overflow
    const history = messages.value.slice(-HISTORY_LIMIT);
    const reply = await chatWithAi({
      messages: history,
      systemPrompt: SYSTEM_PROMPT,
      maxTokens: 512,
    });
    messages.value.push({ role: 'assistant', content: reply });
  } catch (e) {
    messages.value.push({
      role: 'assistant',
      content: `Oops, something went wrong — ${e?.message || 'please try again'}. 🦦`,
    });
  } finally {
    isLoading.value = false;
    await scrollToBottom();
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
  /* Account for fixed top nav on desktop */
  padding-top: calc(64px + env(safe-area-inset-top, 0px));
}
.otter-panel--open {
  transform: translateX(0);
}

/* Mobile: nav is at the bottom — leave room for it */
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
  /* override global textarea min-height */
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

/* ---- Scrim (all screen sizes) ---- */
.otter-scrim {
  position: fixed;
  inset: 0;
  z-index: 209;
  background: rgba(0, 0, 0, 0.25);
  cursor: pointer;
}
</style>
