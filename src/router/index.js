import { createRouter, createWebHashHistory } from "vue-router";

const routes = [
  { path: "/", redirect: "/ideas" },
  { path: "/ideas", name: "ideas", component: () => import("@/views/IdeasView.vue"), meta: { title: "Ideas" } },
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

router.afterEach((to) => {
  document.title = to.meta.title ? `${to.meta.title} — InkFlow` : "InkFlow";
});

export default router;
