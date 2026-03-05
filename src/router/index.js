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
