import { createRouter, createWebHashHistory } from "vue-router";
import { storyDirty, sceneDirty } from "@/stores/unsaved";
import { getUnsavedMessage } from "@/utils/i18nRouter";
import EntitiesPage from "@/views/EntitiesPage.vue";

const routes = [
  { path: "/", redirect: "/entities" },
  { path: "/entities", name: "entities", component: EntitiesPage, meta: { title: "Entities" } },
  { path: "/ideas", redirect: "/entities" },
  { path: "/story", name: "story", component: () => import("@/views/StoryView.vue"), meta: { title: "Story" } },
  { path: "/characters", name: "characters", component: () => import("@/views/CharactersView.vue"), meta: { title: "Characters" } },
  { path: "/outline", name: "outline", component: () => import("@/views/OutlineView.vue"), meta: { title: "Outline" } },
  { path: "/write", name: "write", component: () => import("@/views/WriteView.vue"), meta: { title: "Write" } },
  { path: "/write/:sceneId", name: "scene", component: () => import("@/views/SceneEditorView.vue"), meta: { title: "Scene" } },
  { path: "/export", redirect: "/settings" },
  { path: "/settings", name: "settings", component: () => import("@/views/ExportView.vue"), meta: { title: "Settings" } },
];

const router = createRouter({
  history: createWebHashHistory(),
  routes,
});

router.beforeEach((to, from, next) => {
  // #region agent log
  fetch('http://127.0.0.1:7453/ingest/c807a8a1-88f8-4b0f-a487-d01b643f354a', {
    method: 'POST',
    headers: {
      'Content-Type': 'application/json',
      'X-Debug-Session-Id': '18ab8d',
    },
    body: JSON.stringify({
      sessionId: '18ab8d',
      runId: 'post-fix',
      hypothesisId: 'A',
      location: 'src/router/index.js:22',
      message: 'router.beforeEach enter',
      data: {
        fromName: from.name,
        toName: to.name,
        storyDirty: storyDirty.value,
        sceneDirty: sceneDirty.value,
      },
      timestamp: Date.now(),
    }),
  }).catch(() => {});
  // #endregion

  try {
    if (from.name === "story" && storyDirty.value) {
      const msg = getUnsavedMessage();
      const ok = window.confirm(msg);
      if (ok) {
        storyDirty.value = false;
        next();
      } else {
        next(false);
      }
      return;
    }
    if (from.name === "scene" && sceneDirty.value) {
      const msg = getUnsavedMessage();
      const ok = window.confirm(msg);
      if (ok) {
        sceneDirty.value = false;
        next();
      } else {
        next(false);
      }
      return;
    }
    next();
  } catch (err) {
    // Ensure navigation is never stuck if confirm/getUnsavedMessage throws (e.g. popup blocked, locale error)
    next();
  }
});

router.afterEach((to) => {
  document.title = to.meta.title ? `${to.meta.title} — InkFlow` : "InkFlow";
});

export default router;
