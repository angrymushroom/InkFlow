<template>
  <svg
    :width="size"
    :height="size"
    viewBox="0 0 24 24"
    fill="none"
    stroke="currentColor"
    stroke-width="2"
    stroke-linecap="round"
    stroke-linejoin="round"
    aria-hidden="true"
  >
    <!-- ideas: lightbulb -->
    <template v-if="name === 'ideas'">
      <path d="M9 18h6M10 22h4M12 2a7 7 0 0 1 7 7c0 3.1-2 5.7-4.9 6.7V17a1 1 0 0 1-1 1h-2.2a1 1 0 0 1-1-1v-1.3C7 14.7 5 12.1 5 9a7 7 0 0 1 7-7z" />
    </template>
    <!-- characters: user -->
    <template v-else-if="name === 'characters'">
      <circle cx="12" cy="8" r="4" />
      <path d="M4 20c0-4 3.6-7 8-7s8 3 8 7" />
    </template>
    <!-- story: book open -->
    <template v-else-if="name === 'story'">
      <path d="M2 3h6a4 4 0 0 1 4 4v14a3 3 0 0 0-3-3H2z" />
      <path d="M22 3h-6a4 4 0 0 0-4 4v14a3 3 0 0 1 3-3h7z" />
    </template>
    <!-- outline: list -->
    <template v-else-if="name === 'outline'">
      <line x1="8" y1="6" x2="21" y2="6" />
      <line x1="8" y1="12" x2="21" y2="12" />
      <line x1="8" y1="18" x2="21" y2="18" />
      <circle cx="3" cy="6" r="1.5" fill="currentColor" stroke="none" />
      <circle cx="3" cy="12" r="1.5" fill="currentColor" stroke="none" />
      <circle cx="3" cy="18" r="1.5" fill="currentColor" stroke="none" />
    </template>
    <!-- write: pen -->
    <template v-else-if="name === 'write'">
      <path d="M12 20h9" />
      <path d="M16.5 3.5a2.121 2.121 0 0 1 3 3L7 19l-4 1 1-4 12.5-12.5z" />
    </template>
    <!-- settings: sliders -->
    <template v-else-if="name === 'settings'">
      <line x1="4" y1="6" x2="20" y2="6" />
      <line x1="4" y1="12" x2="20" y2="12" />
      <line x1="4" y1="18" x2="20" y2="18" />
      <circle cx="8" cy="6" r="2" fill="var(--bg-elevated)" />
      <circle cx="16" cy="12" r="2" fill="var(--bg-elevated)" />
      <circle cx="10" cy="18" r="2" fill="var(--bg-elevated)" />
    </template>
    <!-- contents/sidebar -->
    <template v-else-if="name === 'contents'">
      <rect x="3" y="3" width="18" height="18" rx="2" />
      <path d="M9 3v18M14 8h4M14 12h4M14 16h4" />
    </template>
  </svg>
</template>

<script setup>
defineProps({
  name: { type: String, required: true },
  size: { type: Number, default: 20 },
});
</script>
