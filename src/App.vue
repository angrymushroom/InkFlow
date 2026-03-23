<template>
  <div class="app">
    <nav class="nav" role="navigation" aria-label="Main navigation">
      <router-link to="/ideas" class="nav-link" @click="onNavClick">
        <NavIcon name="ideas" />
        <span class="nav-link-text">{{ t('nav.ideas') }}</span>
      </router-link>
      <router-link to="/characters" class="nav-link" @click="onNavClick">
        <NavIcon name="characters" />
        <span class="nav-link-text">{{ t('nav.characters') }}</span>
      </router-link>
      <router-link to="/story" class="nav-link" @click="onNavClick">
        <NavIcon name="story" />
        <span class="nav-link-text">{{ t('nav.story') }}</span>
      </router-link>
      <router-link to="/outline" class="nav-link" @click="onNavClick">
        <NavIcon name="outline" />
        <span class="nav-link-text">{{ t('nav.outline') }}</span>
      </router-link>
      <router-link to="/write" class="nav-link" @click="onNavClick">
        <NavIcon name="write" />
        <span class="nav-link-text">{{ t('nav.write') }}</span>
      </router-link>
      <router-link to="/settings" class="nav-link" @click="onNavClick">
        <NavIcon name="settings" />
        <span class="nav-link-text">{{ t('nav.settings') }}</span>
      </router-link>
      <button
        type="button"
        class="nav-link nav-otter-btn"
        :class="{ 'nav-otter-btn--active': otterOpen }"
        :aria-label="otterOpen ? 'Close Pip chat' : 'Open Pip chat'"
        @click="otterOpen = !otterOpen"
      >
        <span class="nav-otter-icon" aria-hidden="true">🦦</span>
        <span class="nav-link-text">Pip</span>
      </button>
    </nav>

    <div class="app-body">
      <aside class="sidebar" :class="{ 'sidebar-open': sidebarOpen }">
        <div class="sidebar-header">
          <h2 class="sidebar-title">{{ t('sidebar.contents') }}</h2>
          <div class="sidebar-header-actions">
            <button
              type="button"
              class="sidebar-icon-btn"
              :title="t('search.placeholder')"
              aria-label="Search"
              @click="searchOpen = true"
            >
              <svg width="15" height="15" viewBox="0 0 24 24" fill="none" stroke="currentColor" stroke-width="2" stroke-linecap="round" stroke-linejoin="round" aria-hidden="true"><circle cx="11" cy="11" r="8"/><path d="m21 21-4.35-4.35"/></svg>
            </button>
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
        </div>
        <nav class="sidebar-nav">
          <section class="sidebar-section">
            <button type="button" class="sidebar-section-title sidebar-section-title-btn" @click="storySwitcherOpen = true">
              {{ t('sidebar.story') }}
              <svg width="11" height="11" viewBox="0 0 24 24" fill="none" stroke="currentColor" stroke-width="2.5" stroke-linecap="round" stroke-linejoin="round" aria-hidden="true"><path d="M7 15l5 5 5-5"/><path d="M7 9l5-5 5 5"/></svg>
            </button>
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
            <h3 class="sidebar-section-title">{{ t('sidebar.outline') }}</h3>
            <div v-if="!chapters.length" class="sidebar-empty-inline">
              <span>{{ t('nav.noChapters') }}</span>
              <router-link to="/outline" class="sidebar-link" @click="sidebarOpen = false">{{ t('nav.goToOutline') }}</router-link>
            </div>
            <template v-else>
              <div v-for="(ch, chIndex) in chapters" :key="ch.id" class="sidebar-chapter">
                <!-- On outline page: click scrolls to chapter/scene on same page; on write page: scene links navigate to editor -->
                <button
                  v-if="route.path === '/outline'"
                  type="button"
                  class="sidebar-chapter-title sidebar-chapter-title-btn"
                  @click="sidebarFocus(ch.id, null)"
                >
                  {{ t('sidebar.chapterNum', { n: chIndex + 1 }) }}: {{ ch.title || t('outline.untitledChapter') }}
                </button>
                <div v-else class="sidebar-chapter-title">{{ t('sidebar.chapterNum', { n: chIndex + 1 }) }}: {{ ch.title || t('outline.untitledChapter') }}</div>
                <template v-if="route.path === '/outline'">
                  <button
                    v-for="(scene, scIndex) in getScenesForChapter(ch.id)"
                    :key="scene.id"
                    type="button"
                    class="sidebar-scene sidebar-scene-btn"
                    :class="{ active: currentSceneId === scene.id }"
                    @click="sidebarFocus(ch.id, scene.id)"
                  >
                    {{ t('sidebar.sceneNum', { n: scIndex + 1 }) }}: {{ scene.title || t('outline.untitledScene') }}
                  </button>
                </template>
                <router-link
                  v-else
                  v-for="(scene, scIndex) in getScenesForChapter(ch.id)"
                  :key="scene.id"
                  :to="`/write/${scene.id}`"
                  class="sidebar-scene"
                  :class="{ active: currentSceneId === scene.id }"
                  @click="sidebarOpen = false"
                >
                  {{ t('sidebar.sceneNum', { n: scIndex + 1 }) }}: {{ scene.title || t('outline.untitledScene') }}
                </router-link>
              </div>
            </template>
          </section>
        </nav>

        <!-- Sidebar footer: feedback link -->
        <div class="sidebar-footer">
          <button type="button" class="sidebar-feedback-btn" @click="feedbackOpen = true">
            <svg width="13" height="13" viewBox="0 0 24 24" fill="none" stroke="currentColor" stroke-width="2" stroke-linecap="round" stroke-linejoin="round" aria-hidden="true"><path d="M21 15a2 2 0 0 1-2 2H7l-4 4V5a2 2 0 0 1 2-2h14a2 2 0 0 1 2 2z"/></svg>
            {{ t('feedback.button') }}
          </button>
        </div>
      </aside>

      <div
        v-if="isMobile && sidebarOpen"
        class="sidebar-scrim"
        aria-hidden="true"
        @click="sidebarOpen = false"
      />

      <button
        v-if="isMobile"
        type="button"
        class="sidebar-toggle"
        aria-label="Open sidebar"
        @click="sidebarOpen = true"
      >
        <NavIcon name="contents" :size="16" />
        {{ t('sidebar.contents') }}
      </button>

      <main class="main-content">
        <router-view :key="route.path" v-slot="{ Component }">
          <component v-if="Component" :is="Component" />
          <div v-else class="page"><p class="page-subtitle">Loading…</p></div>
        </router-view>
      </main>

      <OtterChat :open="otterOpen" @close="otterOpen = false" />
    </div>

    <StorySwitcher
      v-model="storySwitcherOpen"
      :stories="stories"
      :current-story-id="currentStoryId"
      @select="switchStory"
      @new="addNewStory"
    />
    <SearchModal v-model="searchOpen" />
    <FeedbackModal :open="feedbackOpen" @close="feedbackOpen = false" />
    <AppToast />
  </div>
</template>

<script setup>
import { ref, computed, watch, onMounted, onUnmounted, nextTick } from 'vue';
import { useRoute, useRouter } from 'vue-router';
import { useI18n } from '@/composables/useI18n';
import { useOutline } from '@/composables/useOutline';
import { getIdeas, getStories, setCurrentStoryId, createStory, getCurrentStoryId, seedExampleStoryOnce } from '@/db';
import NavIcon from '@/components/NavIcon.vue';
import AppToast from '@/components/AppToast.vue';
import StorySwitcher from '@/components/StorySwitcher.vue';
import SearchModal from '@/components/SearchModal.vue';
import OtterChat from '@/components/OtterChat.vue';
import FeedbackModal from '@/components/FeedbackModal.vue';

const { t, locale } = useI18n();
const route = useRoute();
const router = useRouter();
const { chapters, load, getScenesForChapter } = useOutline();

const sidebarOpen = ref(false);
const otterOpen = ref(false);
const isMobile = ref(false);
const storySwitcherOpen = ref(false);
const searchOpen = ref(false);
const feedbackOpen = ref(false);
const ideas = ref([]);
const stories = ref([]);
const currentStoryId = ref(getCurrentStoryId());

const currentSceneId = computed(() =>
  route.name === 'scene' ? route.params.sceneId : null
);

function onNavClick() {}

function sidebarFocus(chapterId, sceneId) {
  window.dispatchEvent(new CustomEvent('inkflow-sidebar-focus', { detail: { chapterId, sceneId } }));
  sidebarOpen.value = false;
}

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

async function loadIdeas() {
  try {
    ideas.value = await getIdeas();
  } catch (_) {
    ideas.value = [];
  }
}

async function onIdeasChanged() {
  await loadIdeas();
  await nextTick();
}

async function switchStory(storyId) {
  setCurrentStoryId(storyId);
  currentStoryId.value = storyId;
  await load();
  await loadIdeas();
  await loadStories();
  sidebarOpen.value = false;
  router.push('/story');
  window.dispatchEvent(new CustomEvent('inkflow-story-switched', { detail: { storyId } }));
}

async function addNewStory() {
  const story = await createStory();
  await switchStory(story.id);
}

async function onRouteChange() {
  try {
    loadOutline();
    currentStoryId.value = getCurrentStoryId();
    if (route.path === '/ideas' || route.path === '/story' || route.path === '/entities') {
      await loadIdeas();
      if (route.path === '/story') await loadStories();
    }
  } catch (_) {}
}

function onGlobalKeydown(e) {
  if ((e.metaKey || e.ctrlKey) && e.key === 'k') {
    e.preventDefault();
    searchOpen.value = true;
  }
}

onMounted(async () => {
  await seedExampleStoryOnce(locale.value);
  await loadStories();
  load();
  loadIdeas();
  checkMobile();
  window.addEventListener('resize', checkMobile);
  window.addEventListener('keydown', onGlobalKeydown);
  window.addEventListener('inkflow-story-saved', loadStories);
  window.addEventListener('inkflow-outline-changed', load);
  window.addEventListener('inkflow-ideas-changed', onIdeasChanged);
  window.addEventListener('inkflow-story-deleted', onStoryDeleted);
});

onUnmounted(() => {
  window.removeEventListener('resize', checkMobile);
  window.removeEventListener('keydown', onGlobalKeydown);
  window.removeEventListener('inkflow-story-saved', loadStories);
  window.removeEventListener('inkflow-outline-changed', load);
  window.removeEventListener('inkflow-ideas-changed', onIdeasChanged);
  window.removeEventListener('inkflow-story-deleted', onStoryDeleted);
});

async function onStoryDeleted(e) {
  const switchedToId = e.detail?.switchedToId;
  if (switchedToId) currentStoryId.value = switchedToId;
  await loadStories();
  await load();
  await loadIdeas();
}

watch(
  () => route.path,
  async () => {
    await onRouteChange();
  }
);
</script>

<style scoped>
.app {
  height: 100vh;
  height: 100dvh;
  display: flex;
  flex-direction: column;
  overflow: hidden;
}
.app-body {
  flex: 1;
  min-height: 0;
  display: flex;
  position: relative;
  overflow: hidden;
}
@media (min-width: 768px) {
  .app-body {
    padding-top: calc(64px + env(safe-area-inset-top, 0px));
  }
}
.main-content {
  flex: 1;
  min-width: 0;
  min-height: 0;
  display: flex;
  flex-direction: column;
  overflow-y: auto;
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
.sidebar-header-actions {
  display: flex;
  align-items: center;
  gap: var(--space-1);
}
.sidebar-icon-btn {
  background: none;
  border: none;
  cursor: pointer;
  color: var(--text-muted);
  padding: var(--space-1);
  border-radius: var(--radius-sm);
  display: flex;
  align-items: center;
  justify-content: center;
  line-height: 1;
}
.sidebar-icon-btn:hover {
  color: var(--text);
  background: var(--bg);
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
.sidebar-section-title-btn {
  background: none;
  border: none;
  cursor: pointer;
  font: inherit;
  display: flex;
  align-items: center;
  gap: var(--space-1);
  width: 100%;
  text-align: left;
  color: var(--text-muted);
  padding: var(--space-1) var(--space-4);
  margin: 0 0 var(--space-1);
}
.sidebar-section-title-btn:hover {
  color: var(--text);
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
.sidebar-chapter-title-btn {
  width: 100%;
  text-align: left;
  background: none;
  border: none;
  cursor: pointer;
  font: inherit;
}
.sidebar-chapter-title-btn:hover {
  color: var(--text);
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
.sidebar-scene-btn {
  display: block;
  width: 100%;
  text-align: left;
  font-size: 0.9375rem;
  padding: var(--space-2) var(--space-4);
  color: var(--text);
  background: none;
  border: none;
  border-left: 3px solid transparent;
  cursor: pointer;
  font: inherit;
  transition: background 0.15s, border-color 0.15s;
}
.sidebar-scene-btn:hover {
  background: var(--bg);
  color: var(--text);
}
.sidebar-scene-btn.active {
  background: rgba(37, 99, 235, 0.08);
  border-left-color: var(--accent);
  color: var(--accent);
  font-weight: 500;
}
.sidebar-scrim {
  position: fixed;
  inset: 0;
  z-index: 199;
  background: rgba(0, 0, 0, 0.35);
  cursor: pointer;
}
.sidebar-toggle {
  position: fixed;
  bottom: calc(60px + env(safe-area-inset-bottom, 0px));
  left: var(--space-3);
  z-index: 99;
  display: flex;
  align-items: center;
  gap: var(--space-2);
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

/* Sidebar footer */
.sidebar-footer {
  flex-shrink: 0;
  padding: var(--space-2) var(--space-3);
  border-top: 1px solid var(--border);
}
.sidebar-feedback-btn {
  display: flex;
  align-items: center;
  gap: var(--space-2);
  width: 100%;
  padding: var(--space-2) var(--space-2);
  background: none;
  border: none;
  border-radius: var(--radius-sm);
  font: inherit;
  font-size: 0.8125rem;
  color: var(--text-muted);
  cursor: pointer;
  transition: color 0.15s, background 0.15s;
}
.sidebar-feedback-btn:hover {
  color: var(--text);
  background: var(--bg);
}

/* Otter toggle button in nav */
.nav-otter-btn {
  background: none;
  border: none;
  cursor: pointer;
  font: inherit;
}
.nav-otter-icon {
  font-size: 1.1rem;
  line-height: 1;
}
.nav-otter-btn--active {
  color: var(--accent);
  background: rgba(37, 99, 235, 0.1);
}
@media (min-width: 768px) {
  .nav-otter-btn {
    margin-left: auto;
  }
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
    display: flex;
    bottom: calc(56px + env(safe-area-inset-bottom, 0px) + 8px);
  }
}
@media (min-width: 768px) {
  .sidebar {
    transform: none;
  }
  .sidebar-toggle {
    display: none;
  }
}
</style>
