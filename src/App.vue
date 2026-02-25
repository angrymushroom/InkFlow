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
    <main class="main">
      <router-view v-slot="{ Component }">
        <transition name="fade" mode="out-in">
          <component :is="Component" />
        </transition>
      </router-view>
    </main>
  </div>
</template>

<script setup>
import { useI18n } from '@/composables/useI18n';
const { t } = useI18n();
</script>

<style scoped>
.app {
  min-height: 100vh;
  display: flex;
  flex-direction: column;
}
.main {
  flex: 1;
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
@media (min-width: 768px) {
  .nav-icon {
    display: none;
  }
}
</style>
