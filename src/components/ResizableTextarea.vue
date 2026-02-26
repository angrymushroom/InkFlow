<template>
  <div
    ref="wrapperRef"
    class="resizable-textarea-wrapper"
    :class="{
      'resizable-textarea-wrapper--sized': hasExplicitSize,
      'resizable-textarea-wrapper--auto-expand': autoExpand && !hasExplicitSize,
    }"
    :style="baseWrapperStyle"
  >
    <textarea
      ref="inputRef"
      class="resizable-textarea-input"
      :value="modelValue"
      :placeholder="placeholder"
      :rows="rows"
      :class="inputClass"
      @input="onInput"
      v-bind="$attrs"
    />
    <div
      class="resizable-textarea-handle"
      aria-label="Resize"
      @mousedown.prevent="startDrag"
      @touchstart.prevent="startDragTouch"
    />
  </div>
</template>

<script setup>
import { ref, computed, watch, nextTick, onMounted } from 'vue';

const props = defineProps({
  modelValue: { type: String, default: '' },
  placeholder: { type: String, default: '' },
  rows: { type: Number, default: 3 },
  minHeight: { type: Number, default: 80 },
  minWidth: { type: Number, default: 200 },
  maxHeight: { type: Number, default: null },
  maxWidth: { type: Number, default: null },
  inputClass: { type: [String, Object, Array], default: '' },
  autoExpand: { type: Boolean, default: false },
});

const emit = defineEmits(['update:modelValue']);

const wrapperRef = ref(null);
const inputRef = ref(null);

const dragState = ref(null);

const wrapperStyle = ref({});
const hasExplicitSize = ref(false);

const maxHeightPx = computed(() => {
  if (props.maxHeight == null || props.maxHeight <= 0) return null;
  return props.maxHeight;
});
const maxHeightCss = computed(() =>
  maxHeightPx.value != null ? `${maxHeightPx.value}px` : 'none'
);

const baseWrapperStyle = computed(() => ({
  minHeight: `${props.minHeight}px`,
  minWidth: `${props.minWidth}px`,
  ...wrapperStyle.value,
}));

function onInput(e) {
  emit('update:modelValue', e.target.value);
  if (props.autoExpand && !hasExplicitSize.value && inputRef.value) {
    nextTick(() => syncAutoHeight());
  }
}

function syncAutoHeight() {
  if (!inputRef.value || !props.autoExpand || hasExplicitSize.value) return;
  const el = inputRef.value;
  el.style.height = 'auto';
  el.style.height = `${Math.max(el.scrollHeight, props.minHeight)}px`;
}

function getRect() {
  if (!wrapperRef.value) return null;
  return wrapperRef.value.getBoundingClientRect();
}

function clampWidth(w) {
  let max = props.maxWidth;
  if (max == null && wrapperRef.value) {
    const parent = wrapperRef.value.parentElement;
    if (parent) max = parent.getBoundingClientRect().width;
  }
  const min = props.minWidth;
  if (max != null && w > max) return max;
  if (w < min) return min;
  return w;
}

function clampHeight(h) {
  const max = maxHeightPx.value;
  const min = props.minHeight;
  if (max != null && h > max) return max;
  if (h < min) return min;
  return h;
}

function startDrag(e) {
  const rect = getRect();
  if (!rect) return;
  dragState.value = {
    startX: e.clientX,
    startY: e.clientY,
    startW: rect.width,
    startH: rect.height,
    isTouch: false,
  };
  document.addEventListener('mousemove', onDragMove);
  document.addEventListener('mouseup', endDrag);
}

function startDragTouch(e) {
  const t = e.touches && e.touches[0];
  if (!t) return;
  const rect = getRect();
  if (!rect) return;
  dragState.value = {
    startX: t.clientX,
    startY: t.clientY,
    startW: rect.width,
    startH: rect.height,
    isTouch: true,
  };
  document.addEventListener('touchmove', onDragMoveTouch, { passive: false });
  document.addEventListener('touchend', endDragTouch);
  document.addEventListener('touchcancel', endDragTouch);
}

function onDragMove(e) {
  if (!dragState.value || dragState.value.isTouch) return;
  const { startX, startY, startW, startH } = dragState.value;
  const dx = e.clientX - startX;
  const dy = e.clientY - startY;
  const newW = clampWidth(startW + dx);
  const newH = clampHeight(startH + dy);
  hasExplicitSize.value = true;
  wrapperStyle.value = {
    width: `${newW}px`,
    height: `${newH}px`,
    maxHeight: maxHeightCss.value,
  };
}

function onDragMoveTouch(e) {
  if (!dragState.value || !dragState.value.isTouch || !e.touches[0]) return;
  e.preventDefault();
  const t = e.touches[0];
  const { startX, startY, startW, startH } = dragState.value;
  const dx = t.clientX - startX;
  const dy = t.clientY - startY;
  const newW = clampWidth(startW + dx);
  const newH = clampHeight(startH + dy);
  hasExplicitSize.value = true;
  wrapperStyle.value = {
    width: `${newW}px`,
    height: `${newH}px`,
    maxHeight: maxHeightCss.value,
  };
}

function endDrag() {
  dragState.value = null;
  document.removeEventListener('mousemove', onDragMove);
  document.removeEventListener('mouseup', endDrag);
}

function endDragTouch() {
  dragState.value = null;
  document.removeEventListener('touchmove', onDragMoveTouch);
  document.removeEventListener('touchend', endDragTouch);
  document.removeEventListener('touchcancel', endDragTouch);
}

watch(
  () => props.modelValue,
  () => {
    if (props.autoExpand && !hasExplicitSize.value) nextTick(syncAutoHeight);
  }
);
onMounted(() => {
  if (props.autoExpand) nextTick(syncAutoHeight);
});

defineExpose({ inputRef });
</script>

<script>
export default { inheritAttrs: false };
</script>

<style scoped>
.resizable-textarea-wrapper {
  position: relative;
  display: block;
  width: 100%;
}
.resizable-textarea-wrapper--sized .resizable-textarea-input {
  height: 100%;
  min-height: 100%;
}
.resizable-textarea-input {
  display: block;
  width: 100%;
  box-sizing: border-box;
  resize: none;
  font: inherit;
  font-size: 16px;
  color: inherit;
  background: var(--bg-elevated);
  border: 1px solid var(--border);
  border-radius: var(--radius-sm);
  padding: var(--space-2) var(--space-3);
  padding-bottom: calc(var(--space-2) + 20px);
  padding-right: calc(var(--space-3) + 20px);
  transition: border-color 0.15s, box-shadow 0.15s;
}
.resizable-textarea-input:focus {
  outline: none;
  border-color: var(--accent);
  box-shadow: 0 0 0 3px rgba(37, 99, 235, 0.15);
}
.resizable-textarea-wrapper--auto-expand .resizable-textarea-input {
  overflow-y: hidden;
}
.resizable-textarea-handle {
  position: absolute;
  bottom: 0;
  right: 0;
  width: 20px;
  height: 20px;
  cursor: se-resize;
  transform-origin: bottom right;
  transition: transform 0.15s ease, background-color 0.15s;
  background: linear-gradient(
    135deg,
    transparent 45%,
    var(--border) 45%,
    var(--border) 52%,
    transparent 52%
  ),
  linear-gradient(
    135deg,
    transparent 62%,
    var(--border) 62%,
    var(--border) 68%,
    transparent 68%
  ),
  linear-gradient(
    135deg,
    transparent 78%,
    var(--border) 78%,
    var(--border) 84%,
    transparent 84%
  );
  background-color: var(--bg);
  border-left: 1px solid var(--border);
  border-top: 1px solid var(--border);
  border-radius: var(--radius-sm) 0 0 0;
  flex-shrink: 0;
}
.resizable-textarea-wrapper:hover .resizable-textarea-handle {
  transform: scale(1.5);
}
.resizable-textarea-handle:hover {
  background-color: var(--bg-elevated);
}
.resizable-textarea-handle:active {
  background-color: var(--border);
}
</style>
