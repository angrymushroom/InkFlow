<template>
  <div class="otter-wrap" :class="`otter--${size}`">
    <svg
      viewBox="0 0 120 144"
      xmlns="http://www.w3.org/2000/svg"
      class="otter-svg"
      :class="{ 'otter-anim': variant === 'writing' }"
      aria-hidden="true"
    >
      <!-- ── Ears ── -->
      <circle cx="28" cy="26" r="13" class="fur" />
      <circle cx="92" cy="26" r="13" class="fur" />
      <circle cx="28" cy="26" r="7" class="belly" />
      <circle cx="92" cy="26" r="7" class="belly" />

      <!-- ── Head ── -->
      <ellipse cx="60" cy="59" rx="38" ry="36" class="fur" />

      <!-- ── Muzzle ── -->
      <ellipse cx="60" cy="69" rx="22" ry="14" class="belly" />

      <!-- ── Eyes ── -->
      <circle cx="46" cy="50" r="5.5" class="feature" />
      <circle cx="74" cy="50" r="5.5" class="feature" />
      <!-- shines -->
      <circle cx="48" cy="48" r="2" class="shine" />
      <circle cx="76" cy="48" r="2" class="shine" />

      <!-- ── Nose ── -->
      <ellipse cx="60" cy="63" rx="5" ry="3.5" class="feature nose" />

      <!-- ── Smile ── -->
      <path d="M 51 71 Q 60 78 69 71" class="mouth" />

      <!-- ── Whiskers ── -->
      <line x1="8" y1="63" x2="40" y2="66" class="whisker" />
      <line x1="8" y1="70" x2="40" y2="70" class="whisker" />
      <line x1="8" y1="77" x2="40" y2="74" class="whisker" />
      <line x1="112" y1="63" x2="80" y2="66" class="whisker" />
      <line x1="112" y1="70" x2="80" y2="70" class="whisker" />
      <line x1="112" y1="77" x2="80" y2="74" class="whisker" />

      <!-- ── Body ── -->
      <ellipse cx="60" cy="115" rx="30" ry="25" class="fur" />
      <ellipse cx="60" cy="118" rx="18" ry="16" class="belly" />

      <!-- ══ IDLE variant: arms + open book ══ -->
      <template v-if="variant !== 'writing'">
        <ellipse cx="36" cy="108" rx="13" ry="8" class="fur" transform="rotate(-28 36 108)" />
        <ellipse cx="84" cy="108" rx="13" ry="8" class="fur" transform="rotate(28 84 108)" />
        <!-- open book left page -->
        <rect x="39" y="100" width="19" height="25" rx="2" class="prop" />
        <!-- open book right page -->
        <rect x="59" y="100" width="19" height="25" rx="2" class="prop" style="opacity: 0.38" />
        <!-- spine -->
        <line x1="58.5" y1="100" x2="58.5" y2="125" class="prop-detail" />
        <!-- left page lines -->
        <line x1="43" y1="108" x2="55" y2="108" class="page-line" />
        <line x1="43" y1="113" x2="55" y2="113" class="page-line" />
        <line x1="43" y1="118" x2="55" y2="118" class="page-line" />
        <!-- right page lines (faint — blank) -->
        <line x1="62" y1="108" x2="74" y2="108" class="page-line" style="opacity: 0.28" />
        <line x1="62" y1="113" x2="74" y2="113" class="page-line" style="opacity: 0.28" />
      </template>

      <!-- ══ WRITING variant: raised paw + pen + animated lines ══ -->
      <template v-if="variant === 'writing'">
        <ellipse cx="34" cy="112" rx="13" ry="8" class="fur" transform="rotate(-15 34 112)" />
        <ellipse cx="90" cy="100" rx="13" ry="8" class="fur" transform="rotate(55 90 100)" />
        <!-- pen barrel -->
        <rect
          x="88"
          y="78"
          width="5"
          height="30"
          rx="2.5"
          class="prop"
          transform="rotate(30 90 93)"
        />
        <!-- pen tip -->
        <polygon points="86,105 91,105 88.5,114" class="prop" />
        <!-- animated writing lines -->
        <line x1="14" y1="128" x2="52" y2="128" class="wline wline-a" />
        <line x1="14" y1="136" x2="40" y2="136" class="wline wline-b" />
      </template>
    </svg>
  </div>
</template>

<script setup>
defineProps({
  /** 'idle' (empty states) | 'writing' (AI generating) */
  variant: { type: String, default: 'idle' },
  /** 'sm' = 72px | 'md' = 112px | 'lg' = 152px */
  size: { type: String, default: 'md' },
})
</script>

<style scoped>
.otter-wrap {
  display: inline-flex;
  align-items: center;
  justify-content: center;
}
.otter-svg {
  overflow: visible;
  display: block;
}

.otter--sm .otter-svg {
  width: 72px;
  height: auto;
}
.otter--md .otter-svg {
  width: 112px;
  height: auto;
}
.otter--lg .otter-svg {
  width: 152px;
  height: auto;
}

/* ── Colors: light mode ── */
.fur {
  fill: #9e8bbf;
}
.belly {
  fill: #cfc4e6;
}
.feature {
  fill: #20103a;
}
.nose {
  opacity: 0.65;
}
.shine {
  fill: #ffffff;
}
.mouth {
  stroke: #20103a;
  stroke-width: 2.2;
  stroke-linecap: round;
  fill: none;
}
.whisker {
  stroke: #20103a;
  stroke-width: 1.2;
  stroke-linecap: round;
  opacity: 0.28;
}
.prop {
  fill: var(--accent);
  opacity: 0.55;
}
.prop-detail {
  stroke: var(--accent);
  stroke-width: 1.5;
  opacity: 0.5;
}
.page-line {
  stroke: #ffffff;
  stroke-width: 1.4;
  opacity: 0.7;
}
.wline {
  stroke: var(--accent);
  stroke-width: 2.5;
  stroke-linecap: round;
  opacity: 0.7;
}

/* ── Colors: dark mode ── */
:global([data-theme='dark']) .fur {
  fill: #6e5f90;
}
:global([data-theme='dark']) .belly {
  fill: #9e8fbe;
}
:global([data-theme='dark']) .feature {
  fill: #ede6ff;
}
:global([data-theme='dark']) .mouth {
  stroke: #ede6ff;
}
:global([data-theme='dark']) .whisker {
  stroke: #ede6ff;
  opacity: 0.32;
}

@media (prefers-color-scheme: dark) {
  :global([data-theme='system']) .fur {
    fill: #6e5f90;
  }
  :global([data-theme='system']) .belly {
    fill: #9e8fbe;
  }
  :global([data-theme='system']) .feature {
    fill: #ede6ff;
  }
  :global([data-theme='system']) .mouth {
    stroke: #ede6ff;
  }
  :global([data-theme='system']) .whisker {
    stroke: #ede6ff;
    opacity: 0.32;
  }
}

/* ── Writing animation ── */
.wline {
  stroke-dasharray: 42;
  stroke-dashoffset: 42;
}
.otter-anim .wline-a {
  animation: inkflow 1.8s ease-in-out infinite alternate;
}
.otter-anim .wline-b {
  animation: inkflow 1.8s ease-in-out 0.5s infinite alternate;
}
@keyframes inkflow {
  to {
    stroke-dashoffset: 0;
  }
}
</style>
