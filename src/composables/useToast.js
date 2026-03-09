import { ref } from 'vue';

export const toasts = ref([]);
let nextId = 0;

export function useToast() {
  function show(message, type = 'info', duration = 2500) {
    const id = nextId++;
    toasts.value.push({ id, message, type });
    setTimeout(() => {
      toasts.value = toasts.value.filter((t) => t.id !== id);
    }, duration);
  }

  return {
    toast: (msg, duration) => show(msg, 'info', duration),
    success: (msg, duration) => show(msg, 'success', duration),
    error: (msg, duration) => show(msg, 'error', duration),
  };
}
