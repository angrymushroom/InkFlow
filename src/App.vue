<template>
  <div class="app">
    <nav class="nav">
      <router-link to="/ideas" class="nav-link">
        <span class="nav-icon">💡</span>
        <span>{{ t('nav.ideas') }}</span>
      </router-link>
      <router-link to="/story" class="nav-link">
        <span class="nav-icon">📖</span>
        <span>{{ t('nav.story') }}</span>
      </router-link>
      <router-link to="/characters" class="nav-link">
        <span class="nav-icon">👤</span>
        <span>{{ t('nav.characters') }}</span>
      </router-link>
      <router-link to="/outline" class="nav-link">
        <span class="nav-icon">📋</span>
        <span>{{ t('nav.outline') }}</span>
      </router-link>
      <router-link to="/write" class="nav-link">
        <span class="nav-icon">✏️</span>
        <span>{{ t('nav.write') }}</span>
      </router-link>
      <router-link to="/settings" class="nav-link">
        <span class="nav-icon">⚙️</span>
        <span>{{ t('nav.settings') }}</span>
      </router-link>
    </nav>
    <div class="app-body">
      <aside class="sidebar" :class="{ 'sidebar-open': sidebarOpen }">
        <div class="sidebar-header">
          <h2 class="sidebar-title">{{ t('sidebar.contents') }}</h2>
          <button
            v-if="isMobile"
            type="button"
            class="sidebar-close"
            aria-label="Close sidebar"
            @click="sidebarOpen = false"
          >
            ×
          </button>
        </div>
        <nav class="sidebar-nav">
          <section class="sidebar-section">
            <h3 class="sidebar-section-title">{{ t('sidebar.story') }}</h3>
            <template v-if="stories.length">
              <button
                v-for="s in stories"
                :key="s.id"
                type="button"
                class="sidebar-item sidebar-item-button"
                :class="{ active: currentStoryId === s.id }"
                @click="switchStory(s.id)"
              >
                <span class="sidebar-item-label">{{ (s.oneSentence || t('sidebar.untitledStory')).slice(0, 32) }}{{ (s.oneSentence && s.oneSentence.length > 32) ? '…' : '' }}</span>
              </button>
            </template>
            <div v-else class="sidebar-empty-inline">
              <span>{{ t('sidebar.noStories') }}</span>
              <router-link to="/story" class="sidebar-link" @click="sidebarOpen = false">{{ t('sidebar.goToStory') }}</router-link>
            </div>
            <button type="button" class="sidebar-item sidebar-item-button sidebar-new-story" @click="addNewStory">
              + {{ t('sidebar.newStory') }}
            </button>
          </section>
          <section class="sidebar-section">
            <h3 class="sidebar-section-title">{{ t('sidebar.ideas') }}</h3>
            <div v-if="!ideas.length" class="sidebar-empty-inline">
              <span>{{ t('sidebar.noIdeas') }}</span>
              <router-link to="/ideas" class="sidebar-link" @click="sidebarOpen = false">{{ t('sidebar.addInTab') }}</router-link>
            </div>
            <template v-else>
              <router-link
                v-for="idea in ideas"
                :key="idea.id"
                to="/ideas"
                class="sidebar-item"
                :class="{ active: route.path === '/ideas' }"
                @click="sidebarOpen = false"
              >
                <span class="sidebar-item-label">{{ idea.title || t('ideas.untitled') }}</span>
                <span class="sidebar-item-meta">{{ idea.type || 'plot' }}</span>
              </router-link>
            </template>
          </section>
          <section class="sidebar-section">
            <h3 class="sidebar-section-title">{{ t('sidebar.characters') }}</h3>
            <div v-if="!characters.length" class="sidebar-empty-inline">
              <span>{{ t('sidebar.noCharacters') }}</span>
              <router-link to="/characters" class="sidebar-link" @click="sidebarOpen = false">{{ t('sidebar.addInTab') }}</router-link>
            </div>
            <template v-else>
              <router-link
                v-for="char in characters"
                :key="char.id"
                to="/characters"
                class="sidebar-item"
                :class="{ active: route.path === '/characters' }"
                @click="sidebarOpen = false"
              >
                {{ char.name || t('characters.unnamed') }}
              </router-link>
            </template>
          </section>
          <section class="sidebar-section">
            <h3 class="sidebar-section-title">{{ t('sidebar.outline') }}</h3>
            <div v-if="!chapters.length" class="sidebar-empty-inline">
              <span>{{ t('nav.noChapters') }}</span>
              <router-link to="/outline" class="sidebar-link" @click="sidebarOpen = false">{{ t('nav.goToOutline') }}</router-link>
            </div>
            <template v-else>
              <div v-for="ch in chapters" :key="ch.id" class="sidebar-chapter">
                <div class="sidebar-chapter-title">{{ ch.title || t('outline.untitledChapter') }}</div>
                <router-link
                  v-for="scene in getScenesForChapter(ch.id)"
                  :key="scene.id"
                  :to="`/write/${scene.id}`"
                  class="sidebar-scene"
                  :class="{ active: currentSceneId === scene.id }"
                  @click="sidebarOpen = false"
                >
                  {{ scene.title || t('outline.untitledScene') }}
                </router-link>
              </div>
            </template>
          </section>
        </nav>
      </aside>
      <button
        v-if="isMobile"
        type="button"
        class="sidebar-toggle"
        aria-label="Open sidebar"
        @click="sidebarOpen = true"
      >
        📋 {{ t('sidebar.contents') }}
      </button>
      <main class="main-content">
        <router-view v-slot="{ Component }">
          <transition name="fade" mode="out-in">
            <component :is="Component" />
          </transition>
        </router-view>
      </main>
    </div>
  </div>
</template>

<script setup>
import { ref, computed, watch, onMounted, onUnmounted } from 'vue';
import { useRoute } from 'vue-router';
import { useI18n } from '@/composables/useI18n';
import { useOutline } from '@/composables/useOutline';
import { getIdeas, getCharacters, getStories, setCurrentStoryId, createStory, getCurrentStoryId } from '@/db';

const { t } = useI18n();
const route = useRoute();
const { chapters, load, getScenesForChapter } = useOutline();

const sidebarOpen = ref(false);
const isMobile = ref(false);
const ideas = ref([]);
const characters = ref([]);
const stories = ref([]);
const currentStoryId = ref(getCurrentStoryId());

const currentSceneId = computed(() =>
  route.name === 'scene' ? route.params.sceneId : null
);

function checkMobile() {
  isMobile.value = window.innerWidth < 768;
}

async function loadOutline() {
  const path = route.path;
  if (path === '/outline' || path === '/write' || path.startsWith('/write/')) {
    await load();
  }
}

async function loadStories() {
  try {
    stories.value = await getStories();
    currentStoryId.value = getCurrentStoryId();
  } catch (_) {
    stories.value = [];
  }
}

async function loadIdeasAndCharacters() {
  try {
    const [ideaList, charList] = await Promise.all([getIdeas(), getCharacters()]);
    ideas.value = ideaList;
    characters.value = charList;
  } catch (_) {
    ideas.value = [];
    characters.value = [];
  }
}

async function switchStory(storyId) {
  setCurrentStoryId(storyId);
  currentStoryId.value = storyId;
  await load(); // always refresh outline for sidebar (loadOutline only runs on outline/write routes)
  await loadIdeasAndCharacters();
  await loadStories();
  sidebarOpen.value = false;
  window.dispatchEvent(new CustomEvent('inkflow-story-switched', { detail: { storyId } }));
}

async function addNewStory() {
  const story = await createStory();
  await switchStory(story.id);
}

function onRouteChange() {
  loadOutline();
  currentStoryId.value = getCurrentStoryId();
  if (route.path === '/ideas' || route.path === '/characters' || route.path === '/story') {
    loadIdeasAndCharacters();
    if (route.path === '/story') loadStories();
  }
}

onMounted(async () => {
  await loadStories();
  load();
  loadIdeasAndCharacters();
  checkMobile();
  window.addEventListener('resize', checkMobile);
  window.addEventListener('inkflow-story-saved', loadStories);
});

onUnmounted(() => {
  window.removeEventListener('resize', checkMobile);
  window.removeEventListener('inkflow-story-saved', loadStories);
});

watch(
  () => route.path,
  () => {
    onRouteChange();
  }
);
</script>

<style scoped>
.app {
  min-height: 100vh;
  display: flex;
  flex-direction: column;
}
.app-body {
  flex: 1;
  display: flex;
  min-height: 0;
  position: relative;
}
@media (min-width: 768px) {
  .app-body {
    padding-top: calc(64px + env(safe-area-inset-top, 0px));
  }
}
.main-content {
  flex: 1;
  min-width: 0;
  display: flex;
  flex-direction: column;
}
.sidebar {
  width: 260px;
  flex-shrink: 0;
  background: var(--bg-elevated);
  border-right: 1px solid var(--border);
  display: flex;
  flex-direction: column;
  overflow: hidden;
}
.sidebar-header {
  display: flex;
  align-items: center;
  justify-content: space-between;
  padding: var(--space-3) var(--space-4);
  border-bottom: 1px solid var(--border);
  flex-shrink: 0;
}
.sidebar-title {
  font-size: 0.9375rem;
  font-weight: 600;
  margin: 0;
  color: var(--text);
}
.sidebar-close {
  background: none;
  border: none;
  font-size: 1.5rem;
  line-height: 1;
  cursor: pointer;
  color: var(--text-muted);
  padding: var(--space-1);
}
.sidebar-close:hover {
  color: var(--text);
}
.sidebar-empty {
  padding: var(--space-4);
  font-size: 0.875rem;
  color: var(--text-muted);
}
.sidebar-empty p {
  margin: 0 0 var(--space-2);
}
.sidebar-link {
  font-weight: 500;
}
.sidebar-nav {
  flex: 1;
  overflow-y: auto;
  padding: var(--space-2) 0;
}
.sidebar-section {
  margin-bottom: var(--space-4);
}
.sidebar-section:last-child {
  margin-bottom: 0;
}
.sidebar-section-title {
  font-size: 0.6875rem;
  font-weight: 600;
  color: var(--text-muted);
  text-transform: uppercase;
  letter-spacing: 0.06em;
  padding: var(--space-1) var(--space-4);
  margin: 0 0 var(--space-1);
}
.sidebar-item {
  display: flex;
  align-items: center;
  justify-content: space-between;
  gap: var(--space-2);
  font-size: 0.9375rem;
  padding: var(--space-2) var(--space-4);
  color: var(--text);
  text-decoration: none;
  border-left: 3px solid transparent;
  transition: background 0.15s, border-color 0.15s;
}
.sidebar-item:hover {
  background: var(--bg);
  text-decoration: none;
  color: var(--text);
}
.sidebar-item.active {
  background: rgba(37, 99, 235, 0.08);
  border-left-color: var(--accent);
  color: var(--accent);
  font-weight: 500;
}
.sidebar-item-label {
  min-width: 0;
  overflow: hidden;
  text-overflow: ellipsis;
  white-space: nowrap;
}
.sidebar-item-meta {
  font-size: 0.6875rem;
  text-transform: uppercase;
  color: var(--text-muted);
  flex-shrink: 0;
}
.sidebar-item.active .sidebar-item-meta {
  color: var(--accent);
  opacity: 0.9;
}
.sidebar-item-button {
  width: 100%;
  text-align: left;
  background: none;
  border: none;
  border-left: 3px solid transparent;
  cursor: pointer;
  font: inherit;
  font-size: 0.9375rem;
  padding: var(--space-2) var(--space-4);
  color: var(--text);
  transition: background 0.15s, border-color 0.15s;
}
.sidebar-item-button:hover {
  background: var(--bg);
  color: var(--text);
}
.sidebar-item-button.active {
  background: rgba(37, 99, 235, 0.08);
  border-left-color: var(--accent);
  color: var(--accent);
  font-weight: 500;
}
.sidebar-new-story {
  color: var(--text-muted);
  margin-top: var(--space-1);
}
.sidebar-new-story:hover {
  color: var(--accent);
}
.sidebar-empty-inline {
  font-size: 0.8125rem;
  color: var(--text-muted);
  padding: var(--space-2) var(--space-4);
  display: flex;
  flex-direction: column;
  gap: var(--space-1);
}
.sidebar-empty-inline .sidebar-link {
  font-weight: 500;
}
.sidebar-chapter {
  margin-bottom: var(--space-3);
}
.sidebar-chapter-title {
  font-size: 0.8125rem;
  font-weight: 600;
  color: var(--text-muted);
  text-transform: uppercase;
  letter-spacing: 0.02em;
  padding: var(--space-1) var(--space-4);
  margin-bottom: var(--space-1);
}
.sidebar-scene {
  display: block;
  font-size: 0.9375rem;
  padding: var(--space-2) var(--space-4);
  color: var(--text);
  text-decoration: none;
  border-left: 3px solid transparent;
  transition: background 0.15s, border-color 0.15s;
}
.sidebar-scene:hover {
  background: var(--bg);
  text-decoration: none;
  color: var(--text);
}
.sidebar-scene.active {
  background: rgba(37, 99, 235, 0.08);
  border-left-color: var(--accent);
  color: var(--accent);
  font-weight: 500;
}
.sidebar-toggle {
  position: fixed;
  bottom: calc(60px + env(safe-area-inset-bottom, 0px));
  left: var(--space-3);
  z-index: 99;
  padding: var(--space-2) var(--space-3);
  font-size: 0.875rem;
  background: var(--bg-elevated);
  border: 1px solid var(--border);
  border-radius: var(--radius-sm);
  cursor: pointer;
  color: var(--text);
  box-shadow: var(--shadow);
}
.sidebar-toggle:hover {
  background: var(--border);
}
.fade-enter-active,
.fade-leave-active {
  transition: opacity 0.15s ease;
}
.fade-enter-from,
.fade-leave-to {
  opacity: 0;
}
.nav-icon {
  font-size: 1.125rem;
}

/* Mobile: sidebar as overlay */
@media (max-width: 767px) {
  .sidebar {
    position: fixed;
    top: 0;
    left: 0;
    bottom: 0;
    z-index: 200;
    transform: translateX(-100%);
    transition: transform 0.2s ease;
    box-shadow: 4px 0 12px rgba(0, 0, 0, 0.1);
  }
  .sidebar-open {
    transform: translateX(0);
  }
  .sidebar-toggle {
    display: block;
  }
}
@media (min-width: 768px) {
  .sidebar {
    transform: none;
  }
  .sidebar-toggle {
    display: none;
  }
  .nav-icon {
    display: none;
  }
}
</style>
