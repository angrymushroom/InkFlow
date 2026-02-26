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
      <router-link to="/export" class="nav-link">
        <span class="nav-icon">📤</span>
        <span>{{ t('nav.export') }}</span>
      </router-link>
    </nav>
    <div class="app-body">
      <aside class="sidebar" :class="{ 'sidebar-open': sidebarOpen }">
        <div class="sidebar-header">
          <h2 class="sidebar-title">{{ t('nav.chapters') }}</h2>
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
        <div v-if="!chapters.length" class="sidebar-empty">
          <p>{{ t('nav.noChapters') }}</p>
          <router-link to="/outline" class="sidebar-link" @click="sidebarOpen = false">
            {{ t('nav.goToOutline') }}
          </router-link>
        </div>
        <nav v-else class="sidebar-nav">
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
        </nav>
      </aside>
      <button
        v-if="isMobile && chapters.length"
        type="button"
        class="sidebar-toggle"
        aria-label="Open chapters"
        @click="sidebarOpen = true"
      >
        📋 {{ t('nav.chapters') }}
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

const { t } = useI18n();
const route = useRoute();
const { chapters, load, getScenesForChapter } = useOutline();

const sidebarOpen = ref(false);
const isMobile = ref(false);

const currentSceneId = computed(() =>
  route.name === 'scene' ? route.params.sceneId : null
);

function checkMobile() {
  isMobile.value = window.innerWidth < 768;
}

function syncOutline() {
  const path = route.path;
  if (path === '/outline' || path === '/write' || path.startsWith('/write/')) {
    load();
  }
}

onMounted(() => {
  load();
  checkMobile();
  window.addEventListener('resize', checkMobile);
});

onUnmounted(() => {
  window.removeEventListener('resize', checkMobile);
});

watch(
  () => route.path,
  () => {
    syncOutline();
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
