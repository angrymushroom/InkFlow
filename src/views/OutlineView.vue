<template>
  <div class="page">
    <h1 class="page-title">{{ t('outline.title') }}</h1>
    <p class="page-subtitle">{{ t('outline.subtitle') }}</p>

    <p v-if="loadError" class="save-error">{{ loadError }}</p>
    <p v-if="saveError" class="save-error">{{ saveError }}</p>

    <div v-if="story" class="outline-spine-oneline card">
      <label class="outline-spine-oneline-label">{{ t('story.oneSentence') }}</label>
      <input
        v-model="storyDraft.oneSentence"
        type="text"
        class="outline-spine-oneline-input"
        :placeholder="t('story.oneSentencePlaceholder')"
      />
      <AiExpandButton
        :current-value="storyDraft.oneSentence"
        :field-name="t('story.fieldOneSentence')"
        @expanded="storyDraft.oneSentence = $event"
      />
    </div>

    <div v-if="showSceneForm && !editingSceneId" class="card form-card">
      <h2 class="form-title">{{ t('outline.newScene') }}</h2>
      <div class="form-group">
        <label>{{ t('outline.chapter') }}</label>
        <select v-model="sceneForm.chapterId" required>
          <option value="">{{ t('outline.selectChapter') }}</option>
          <option v-for="ch in chapters" :key="ch.id" :value="ch.id">{{ ch.title || t('ideas.untitled') }}</option>
        </select>
      </div>
      <div class="form-group">
        <label>{{ t('outline.sceneTitle') }}</label>
        <input v-model="sceneForm.title" type="text" :placeholder="t('outline.sceneTitlePlaceholder')" />
      </div>
      <div class="form-group">
        <label>{{ t('outline.oneSentenceSummary') }}</label>
        <ResizableTextarea
          v-model="sceneForm.oneSentenceSummary"
          :placeholder="t('outline.oneSentencePlaceholder')"
          :rows="1"
          :min-height="40"
          auto-expand
        />
        <AiExpandButton
          :current-value="sceneForm.oneSentenceSummary"
          :field-name="t('outline.sceneOneSentence')"
          :extra-context="sceneExtraContext"
          @expanded="sceneForm.oneSentenceSummary = $event"
        />
      </div>
      <div class="form-group">
        <label>{{ t('outline.povCharacter') }}</label>
        <select v-model="sceneForm.povCharacterId">
          <option value="">—</option>
          <option v-for="c in characters" :key="c.id" :value="c.id">{{ c.name || t('characters.unnamed') }}</option>
        </select>
      </div>
      <div class="form-group">
        <label>{{ t('outline.notes') }}</label>
        <ResizableTextarea v-model="sceneForm.notes" :placeholder="t('outline.notesPlaceholder')" :rows="2" />
        <AiExpandButton
          :current-value="sceneForm.notes"
          :field-name="t('outline.sceneNotes')"
          :extra-context="sceneExtraContext"
          @expanded="sceneForm.notes = $event"
        />
      </div>
      <div class="form-actions">
        <button type="button" class="btn btn-ghost" @click="cancelSceneForm">{{ t('ideas.cancel') }}</button>
        <button type="button" class="btn btn-primary" @click="saveScene">{{ t('ideas.add') }}</button>
      </div>
    </div>

    <div class="outline-actions">
      <button type="button" class="btn btn-primary" @click="openNewChapter()">
        + {{ t('outline.newChapter') }}
      </button>
      <button type="button" class="btn btn-ghost" @click="openNewScene" :disabled="!chapters.length">
        + {{ t('outline.newScene') }}
      </button>
      <button type="button" class="btn btn-ghost" @click="draftAll" :disabled="drafting">
        {{ drafting ? t('outline.aiDrafting') : t('outline.aiDraftAll') }}
      </button>
    </div>

    <p v-if="!chapters.length" class="outline-empty-hint">{{ t('outline.empty') }}</p>

    <div class="outline-sections">
      <section v-for="b in beats" :key="b" class="card outline-section">
        <div class="outline-section-header">
          <div class="outline-section-titleblock">
            <h2 class="outline-section-title">{{ t(`outline.section.${b}`) }}</h2>
            <p class="outline-section-tip">{{ t(`outline.sectionTip.${b}`) }}</p>
          </div>
          <div class="outline-section-actions">
            <button type="button" class="btn btn-primary btn-sm" @click="openNewChapter(b)">
              + {{ t('outline.newChapter') }}
            </button>
            <button type="button" class="btn btn-ghost btn-sm" @click="draftForBeat(b)" :disabled="drafting">
              {{ t('outline.aiDraftSection') }}
            </button>
          </div>
        </div>

        <div class="outline-section-spine card">
          <div class="outline-section-spine-label">{{ t('outline.spineLabel') }}</div>
          <ResizableTextarea
            v-model="storyDraft[b]"
            :placeholder="t(`story.${b}Placeholder`)"
            :rows="b === 'setup' ? 3 : 2"
          />
          <AiExpandButton
            :current-value="storyDraft[b]"
            :field-name="t(spineFieldKey(b))"
            @expanded="storyDraft[b] = $event"
          />
          <div class="outline-section-spine-actions">
            <button type="button" class="btn btn-primary btn-sm" @click="saveSpine">
              {{ t('story.saveStory') }}
            </button>
            <span v-if="spineSavedHint" class="outline-spine-saved-hint">{{ t('story.saved') }}</span>
          </div>
        </div>

        <div
          v-if="activeChapterForm?.mode === 'new' && activeChapterForm?.beat === b"
          ref="chapterFormRef"
          class="card form-card outline-inline-chapter-form"
        >
          <h2 class="form-title">{{ t('outline.newChapter') }}</h2>
          <div class="form-group">
            <label>{{ t('outline.sectionLabel') }}</label>
            <select v-model="chapterForm.beat">
              <option value="setup">{{ t('outline.section.setup') }}</option>
              <option value="disaster1">{{ t('outline.section.disaster1') }}</option>
              <option value="disaster2">{{ t('outline.section.disaster2') }}</option>
              <option value="disaster3">{{ t('outline.section.disaster3') }}</option>
              <option value="ending">{{ t('outline.section.ending') }}</option>
              <option value="">{{ t('outline.section.ungrouped') }}</option>
            </select>
          </div>
          <div class="form-group">
            <label>{{ t('outline.chapterTitle') }}</label>
            <input v-model="chapterForm.title" type="text" :placeholder="t('outline.chapterTitlePlaceholder')" />
          </div>
          <div class="form-group">
            <label>{{ t('outline.summary') }}</label>
            <ResizableTextarea v-model="chapterForm.summary" :placeholder="t('outline.summaryPlaceholder')" :rows="2" />
            <AiExpandButton
              :current-value="chapterForm.summary"
              :field-name="t('outline.chapterSummary')"
              :extra-context="chapterExtraContext"
              @expanded="chapterForm.summary = $event"
            />
          </div>
          <div class="form-actions">
            <button type="button" class="btn btn-ghost" @click="cancelChapterForm">{{ t('ideas.cancel') }}</button>
            <button type="button" class="btn btn-primary" @click="saveChapter">{{ t('ideas.add') }}</button>
          </div>
        </div>

        <div v-if="chaptersForBeat(b).length === 0 && !(activeChapterForm?.mode === 'new' && activeChapterForm?.beat === b)" class="outline-section-empty">
          {{ t('outline.noChaptersInSection') }}
        </div>

        <div v-else class="outline-list">
          <div v-for="ch in chaptersForBeat(b)" :key="ch.id" class="card chapter-card">
            <div
              v-if="activeChapterForm?.mode === 'edit' && activeChapterForm?.chapterId === ch.id"
              ref="chapterFormRef"
              class="form-card outline-inline-chapter-form"
            >
              <h2 class="form-title">{{ t('outline.editChapter') }}</h2>
              <div class="form-group">
                <label>{{ t('outline.sectionLabel') }}</label>
                <select v-model="chapterForm.beat">
                  <option value="setup">{{ t('outline.section.setup') }}</option>
                  <option value="disaster1">{{ t('outline.section.disaster1') }}</option>
                  <option value="disaster2">{{ t('outline.section.disaster2') }}</option>
                  <option value="disaster3">{{ t('outline.section.disaster3') }}</option>
                  <option value="ending">{{ t('outline.section.ending') }}</option>
                  <option value="">{{ t('outline.section.ungrouped') }}</option>
                </select>
              </div>
              <div class="form-group">
                <label>{{ t('outline.chapterTitle') }}</label>
                <input v-model="chapterForm.title" type="text" :placeholder="t('outline.chapterTitlePlaceholder')" />
              </div>
              <div class="form-group">
                <label>{{ t('outline.summary') }}</label>
                <ResizableTextarea v-model="chapterForm.summary" :placeholder="t('outline.summaryPlaceholder')" :rows="2" />
                <AiExpandButton
                  :current-value="chapterForm.summary"
                  :field-name="t('outline.chapterSummary')"
                  :extra-context="chapterExtraContext"
                  @expanded="chapterForm.summary = $event"
                />
              </div>
              <div class="form-actions">
                <button type="button" class="btn btn-ghost" @click="cancelChapterForm">{{ t('ideas.cancel') }}</button>
                <button type="button" class="btn btn-primary" @click="saveChapter">{{ t('ideas.save') }}</button>
              </div>
            </div>
            <template v-else>
            <div class="chapter-header">
              <h3 class="chapter-title chapter-title-link" @click="goToWrite">
                {{ ch.title || t('outline.untitledChapter') }}
              </h3>
              <div class="chapter-actions">
                <select class="chapter-beat-select" :value="ch.beat || ''" @change="assignBeat(ch, $event)">
                  <option value="setup">{{ t('outline.section.setup') }}</option>
                  <option value="disaster1">{{ t('outline.section.disaster1') }}</option>
                  <option value="disaster2">{{ t('outline.section.disaster2') }}</option>
                  <option value="disaster3">{{ t('outline.section.disaster3') }}</option>
                  <option value="ending">{{ t('outline.section.ending') }}</option>
                  <option value="">{{ t('outline.section.ungrouped') }}</option>
                </select>
                <button type="button" class="btn btn-ghost btn-sm btn-icon" @click.stop="editChapter(ch)" :title="t('ideas.edit')">✏️</button>
                <button type="button" class="btn btn-ghost btn-sm btn-icon" @click.stop="addSceneToChapter(ch.id)" :title="t('outline.addScene')" :disabled="addingSceneForChapter === ch.id">➕</button>
                <button type="button" class="btn btn-ghost btn-sm btn-icon" @click.stop="removeChapter(ch.id)" :title="t('ideas.delete')">🗑️</button>
              </div>
            </div>
            <p v-if="ch.summary" class="chapter-summary">{{ ch.summary }}</p>
            <div class="scenes">
              <div
                v-for="scene in scenesByChapter(ch.id)"
                :key="scene.id"
                class="scene-card"
                @click="editingSceneId !== scene.id && goToScene(scene.id)"
              >
                <div v-if="editingSceneId === scene.id" class="outline-inline-scene-form card form-card" @click.stop>
                  <h3 class="form-title">{{ t('outline.editScene') }}</h3>
                  <div class="form-group">
                    <label>{{ t('outline.chapter') }}</label>
                    <select v-model="sceneForm.chapterId" required>
                      <option value="">{{ t('outline.selectChapter') }}</option>
                      <option v-for="c in chapters" :key="c.id" :value="c.id">{{ c.title || t('ideas.untitled') }}</option>
                    </select>
                  </div>
                  <div class="form-group">
                    <label>{{ t('outline.sceneTitle') }}</label>
                    <input v-model="sceneForm.title" type="text" :placeholder="t('outline.sceneTitlePlaceholder')" />
                  </div>
                  <div class="form-group">
                    <label>{{ t('outline.oneSentenceSummary') }}</label>
                    <ResizableTextarea
                      v-model="sceneForm.oneSentenceSummary"
                      :placeholder="t('outline.oneSentencePlaceholder')"
                      :rows="1"
                      :min-height="40"
                      auto-expand
                    />
                    <AiExpandButton
                      :current-value="sceneForm.oneSentenceSummary"
                      :field-name="t('outline.sceneOneSentence')"
                      :extra-context="sceneExtraContext"
                      @expanded="sceneForm.oneSentenceSummary = $event"
                    />
                  </div>
                  <div class="form-group">
                    <label>{{ t('outline.povCharacter') }}</label>
                    <select v-model="sceneForm.povCharacterId">
                      <option value="">—</option>
                      <option v-for="c in characters" :key="c.id" :value="c.id">{{ c.name || t('characters.unnamed') }}</option>
                    </select>
                  </div>
                  <div class="form-group">
                    <label>{{ t('outline.notes') }}</label>
                    <ResizableTextarea v-model="sceneForm.notes" :placeholder="t('outline.notesPlaceholder')" :rows="2" />
                    <AiExpandButton
                      :current-value="sceneForm.notes"
                      :field-name="t('outline.sceneNotes')"
                      :extra-context="sceneExtraContext"
                      @expanded="sceneForm.notes = $event"
                    />
                  </div>
                  <div class="form-actions">
                    <button type="button" class="btn btn-ghost" @click="cancelSceneForm">{{ t('ideas.cancel') }}</button>
                    <button type="button" class="btn btn-primary" @click="saveScene">{{ t('ideas.save') }}</button>
                  </div>
                </div>
                <template v-else>
                <div class="scene-card-main">
                  <span class="scene-card-title">{{ scene.title || t('outline.untitledScene') }}</span>
                  <span v-if="scene.oneSentenceSummary" class="scene-card-summary">{{ scene.oneSentenceSummary }}</span>
                </div>
                <div class="scene-card-actions" @click.stop>
                  <router-link :to="`/write/${scene.id}`" class="btn btn-primary btn-sm">{{ t('outline.writeScene') }}</router-link>
                  <button type="button" class="btn btn-ghost btn-sm btn-icon" @click="editScene(scene)" :title="t('ideas.edit')">✏️</button>
                  <button type="button" class="btn btn-ghost btn-sm btn-icon" @click="removeScene(scene.id)" :title="t('ideas.delete')">🗑️</button>
                </div>
                </template>
              </div>
            </div>
            </template>
          </div>
        </div>
      </section>

      <section v-if="ungroupedChapters.length" class="card outline-section outline-section--ungrouped">
        <div class="outline-section-header">
          <div class="outline-section-titleblock">
            <h2 class="outline-section-title">{{ t('outline.section.ungrouped') }}</h2>
            <p class="outline-section-tip">{{ t('outline.sectionTip.ungrouped') }}</p>
          </div>
        </div>
        <div class="outline-list">
          <div v-for="ch in ungroupedChapters" :key="ch.id" class="card chapter-card">
            <div
              v-if="activeChapterForm?.mode === 'edit' && activeChapterForm?.chapterId === ch.id"
              ref="chapterFormRef"
              class="form-card outline-inline-chapter-form"
            >
              <h2 class="form-title">{{ t('outline.editChapter') }}</h2>
              <div class="form-group">
                <label>{{ t('outline.sectionLabel') }}</label>
                <select v-model="chapterForm.beat">
                  <option value="setup">{{ t('outline.section.setup') }}</option>
                  <option value="disaster1">{{ t('outline.section.disaster1') }}</option>
                  <option value="disaster2">{{ t('outline.section.disaster2') }}</option>
                  <option value="disaster3">{{ t('outline.section.disaster3') }}</option>
                  <option value="ending">{{ t('outline.section.ending') }}</option>
                  <option value="">{{ t('outline.section.ungrouped') }}</option>
                </select>
              </div>
              <div class="form-group">
                <label>{{ t('outline.chapterTitle') }}</label>
                <input v-model="chapterForm.title" type="text" :placeholder="t('outline.chapterTitlePlaceholder')" />
              </div>
              <div class="form-group">
                <label>{{ t('outline.summary') }}</label>
                <ResizableTextarea v-model="chapterForm.summary" :placeholder="t('outline.summaryPlaceholder')" :rows="2" />
                <AiExpandButton
                  :current-value="chapterForm.summary"
                  :field-name="t('outline.chapterSummary')"
                  :extra-context="chapterExtraContext"
                  @expanded="chapterForm.summary = $event"
                />
              </div>
              <div class="form-actions">
                <button type="button" class="btn btn-ghost" @click="cancelChapterForm">{{ t('ideas.cancel') }}</button>
                <button type="button" class="btn btn-primary" @click="saveChapter">{{ t('ideas.save') }}</button>
              </div>
            </div>
            <template v-else>
            <div class="chapter-header">
              <h3 class="chapter-title chapter-title-link" @click="goToWrite">
                {{ ch.title || t('outline.untitledChapter') }}
              </h3>
              <div class="chapter-actions">
                <select class="chapter-beat-select" :value="ch.beat || ''" @change="assignBeat(ch, $event)">
                  <option value="setup">{{ t('outline.section.setup') }}</option>
                  <option value="disaster1">{{ t('outline.section.disaster1') }}</option>
                  <option value="disaster2">{{ t('outline.section.disaster2') }}</option>
                  <option value="disaster3">{{ t('outline.section.disaster3') }}</option>
                  <option value="ending">{{ t('outline.section.ending') }}</option>
                  <option value="">{{ t('outline.section.ungrouped') }}</option>
                </select>
                <button type="button" class="btn btn-ghost btn-sm btn-icon" @click.stop="editChapter(ch)" :title="t('ideas.edit')">✏️</button>
                <button type="button" class="btn btn-ghost btn-sm btn-icon" @click.stop="addSceneToChapter(ch.id)" :title="t('outline.addScene')" :disabled="addingSceneForChapter === ch.id">➕</button>
                <button type="button" class="btn btn-ghost btn-sm btn-icon" @click.stop="removeChapter(ch.id)" :title="t('ideas.delete')">🗑️</button>
              </div>
            </div>
            <p v-if="ch.summary" class="chapter-summary">{{ ch.summary }}</p>
            <div class="scenes">
              <div
                v-for="scene in scenesByChapter(ch.id)"
                :key="scene.id"
                class="scene-card"
                @click="editingSceneId !== scene.id && goToScene(scene.id)"
              >
                <div v-if="editingSceneId === scene.id" class="outline-inline-scene-form card form-card" @click.stop>
                  <h3 class="form-title">{{ t('outline.editScene') }}</h3>
                  <div class="form-group">
                    <label>{{ t('outline.chapter') }}</label>
                    <select v-model="sceneForm.chapterId" required>
                      <option value="">{{ t('outline.selectChapter') }}</option>
                      <option v-for="c in chapters" :key="c.id" :value="c.id">{{ c.title || t('ideas.untitled') }}</option>
                    </select>
                  </div>
                  <div class="form-group">
                    <label>{{ t('outline.sceneTitle') }}</label>
                    <input v-model="sceneForm.title" type="text" :placeholder="t('outline.sceneTitlePlaceholder')" />
                  </div>
                  <div class="form-group">
                    <label>{{ t('outline.oneSentenceSummary') }}</label>
                    <ResizableTextarea
                      v-model="sceneForm.oneSentenceSummary"
                      :placeholder="t('outline.oneSentencePlaceholder')"
                      :rows="1"
                      :min-height="40"
                      auto-expand
                    />
                    <AiExpandButton
                      :current-value="sceneForm.oneSentenceSummary"
                      :field-name="t('outline.sceneOneSentence')"
                      :extra-context="sceneExtraContext"
                      @expanded="sceneForm.oneSentenceSummary = $event"
                    />
                  </div>
                  <div class="form-group">
                    <label>{{ t('outline.povCharacter') }}</label>
                    <select v-model="sceneForm.povCharacterId">
                      <option value="">—</option>
                      <option v-for="c in characters" :key="c.id" :value="c.id">{{ c.name || t('characters.unnamed') }}</option>
                    </select>
                  </div>
                  <div class="form-group">
                    <label>{{ t('outline.notes') }}</label>
                    <ResizableTextarea v-model="sceneForm.notes" :placeholder="t('outline.notesPlaceholder')" :rows="2" />
                    <AiExpandButton
                      :current-value="sceneForm.notes"
                      :field-name="t('outline.sceneNotes')"
                      :extra-context="sceneExtraContext"
                      @expanded="sceneForm.notes = $event"
                    />
                  </div>
                  <div class="form-actions">
                    <button type="button" class="btn btn-ghost" @click="cancelSceneForm">{{ t('ideas.cancel') }}</button>
                    <button type="button" class="btn btn-primary" @click="saveScene">{{ t('ideas.save') }}</button>
                  </div>
                </div>
                <template v-else>
                <div class="scene-card-main">
                  <span class="scene-card-title">{{ scene.title || t('outline.untitledScene') }}</span>
                  <span v-if="scene.oneSentenceSummary" class="scene-card-summary">{{ scene.oneSentenceSummary }}</span>
                </div>
                <div class="scene-card-actions" @click.stop>
                  <router-link :to="`/write/${scene.id}`" class="btn btn-primary btn-sm">{{ t('outline.writeScene') }}</router-link>
                  <button type="button" class="btn btn-ghost btn-sm btn-icon" @click="editScene(scene)" :title="t('ideas.edit')">✏️</button>
                  <button type="button" class="btn btn-ghost btn-sm btn-icon" @click="removeScene(scene.id)" :title="t('ideas.delete')">🗑️</button>
                </div>
                </template>
              </div>
            </div>
            </template>
          </div>
        </div>
      </section>
    </div>

    <OutlineDraftModal
      :open="draftOpen"
      :draft="draftData"
      :beats="beats"
      @close="draftOpen = false"
      @apply="applyDraft"
    />
    <p v-if="draftError" class="save-error">{{ draftError }}</p>
  </div>
</template>

<script setup>
import { ref, onMounted, onUnmounted, computed, nextTick } from 'vue';
import { useRouter } from 'vue-router';
import {
  getCharacters,
  getStory,
  saveStory,
  getCurrentStoryId,
  addChapter,
  updateChapter,
  deleteChapter,
  addScene,
  updateScene,
  deleteScene,
} from '@/db';
import { useI18n } from '@/composables/useI18n';
import { useOutline } from '@/composables/useOutline';
import AiExpandButton from '@/components/AiExpandButton.vue';
import ResizableTextarea from '@/components/ResizableTextarea.vue';
import { draftOutlineFromSpine } from '@/services/outlineAi';
import OutlineDraftModal from '@/components/OutlineDraftModal.vue';

const { t } = useI18n();
const router = useRouter();
const { chapters, scenes, load, loadError, getScenesForChapter } = useOutline();
const saveError = ref('');

const characters = ref([]);
const story = ref(null);
const storyDraft = ref({
  id: '',
  oneSentence: '',
  setup: '',
  disaster1: '',
  disaster2: '',
  disaster3: '',
  ending: '',
});
const spineSavedHint = ref(false);
const activeChapterForm = ref(null);
const chapterFormRef = ref(null);
const showSceneForm = ref(false);
const editingChapterId = computed(() =>
  activeChapterForm.value?.mode === 'edit' ? activeChapterForm.value.chapterId : null
);
const editingSceneId = ref(null);
const addingSceneForChapter = ref(null);
const chapterForm = ref({ title: '', summary: '', beat: 'setup' });
const sceneForm = ref({
  chapterId: '',
  title: '',
  oneSentenceSummary: '',
  povCharacterId: '',
  notes: '',
});

const beats = ['setup', 'disaster1', 'disaster2', 'disaster3', 'ending'];

const ungroupedChapters = computed(() =>
  (chapters.value || []).filter((c) => !c.beat || !beats.includes(c.beat))
);

function scenesByChapter(chapterId) {
  return getScenesForChapter(chapterId);
}

async function loadCharacters() {
  characters.value = await getCharacters();
}

async function loadAll() {
  await load();
  await loadCharacters();
  story.value = await getStory();
  const s = story.value;
  if (s) {
    storyDraft.value = {
      id: s.id ?? '',
      oneSentence: s.oneSentence ?? '',
      setup: s.setup ?? '',
      disaster1: s.disaster1 ?? '',
      disaster2: s.disaster2 ?? '',
      disaster3: s.disaster3 ?? '',
      ending: s.ending ?? '',
    };
  }
}

async function saveSpine() {
  saveError.value = '';
  try {
    await saveStory(storyDraft.value);
    story.value = await getStory();
    spineSavedHint.value = true;
    setTimeout(() => { spineSavedHint.value = false; }, 2000);
    window.dispatchEvent(new CustomEvent('inkflow-story-saved'));
  } catch (e) {
    saveError.value = e?.message || t.value('common.saveErrorGeneric');
  }
}

function openNewChapter(beat = 'setup') {
  const b = beat || 'setup';
  activeChapterForm.value = { mode: 'new', beat: b, chapterId: null };
  chapterForm.value = { title: '', summary: '', beat: b };
  showSceneForm.value = false;
  nextTick(() => {
    chapterFormRef.value?.scrollIntoView({ block: 'nearest', behavior: 'smooth' });
    chapterFormRef.value?.querySelector('input[type="text"]')?.focus();
  });
}

function editChapter(ch) {
  activeChapterForm.value = { mode: 'edit', beat: ch.beat ?? 'setup', chapterId: ch.id };
  chapterForm.value = { title: ch.title ?? '', summary: ch.summary ?? '', beat: ch.beat ?? '' };
  showSceneForm.value = false;
  nextTick(() => {
    chapterFormRef.value?.scrollIntoView({ block: 'nearest', behavior: 'smooth' });
    chapterFormRef.value?.querySelector('input[type="text"]')?.focus();
  });
}

function cancelChapterForm() {
  activeChapterForm.value = null;
}

async function saveChapter() {
  saveError.value = '';
  try {
    if (activeChapterForm.value?.mode === 'edit' && activeChapterForm.value.chapterId) {
      await updateChapter(activeChapterForm.value.chapterId, chapterForm.value);
    } else {
      await addChapter(chapterForm.value);
    }
    await loadAll();
    cancelChapterForm();
  } catch (e) {
    saveError.value = e?.message || t.value('common.saveErrorGeneric');
  }
}

async function removeChapter(id) {
  if (!confirm(t.value('outline.confirmChapter'))) return;
  saveError.value = '';
  try {
    await deleteChapter(id);
    await loadAll();
  } catch (e) {
    saveError.value = e?.message || t.value('common.saveErrorGeneric');
  }
}

function goToWrite() {
  router.push('/write');
}

function goToScene(sceneId) {
  router.push(`/write/${sceneId}`);
}

function openNewScene() {
  editingSceneId.value = null;
  sceneForm.value = {
    chapterId: chapters.value[0]?.id ?? '',
    title: '',
    oneSentenceSummary: '',
    povCharacterId: '',
    notes: '',
  };
  showSceneForm.value = true;
  activeChapterForm.value = null;
}

async function addSceneToChapter(chapterId) {
  if (!chapterId) return;
  addingSceneForChapter.value = chapterId;
  saveError.value = '';
  try {
    await addScene({
      chapterId,
      title: '',
      oneSentenceSummary: '',
      povCharacterId: '',
      notes: '',
    });
    await loadAll();
  } catch (e) {
    saveError.value = e?.message || t.value('common.saveErrorGeneric');
  } finally {
    addingSceneForChapter.value = null;
  }
}

function editScene(scene) {
  editingSceneId.value = scene.id;
  sceneForm.value = {
    chapterId: scene.chapterId,
    title: scene.title ?? '',
    oneSentenceSummary: scene.oneSentenceSummary ?? '',
    povCharacterId: scene.povCharacterId ?? '',
    notes: scene.notes ?? '',
  };
  showSceneForm.value = true;
  activeChapterForm.value = null;
}

function cancelSceneForm() {
  showSceneForm.value = false;
  editingSceneId.value = null;
}

async function saveScene() {
  if (!sceneForm.value.chapterId) return;
  saveError.value = '';
  try {
    if (editingSceneId.value) {
      await updateScene(editingSceneId.value, sceneForm.value);
    } else {
      await addScene(sceneForm.value);
    }
    await loadAll();
    cancelSceneForm();
  } catch (e) {
    saveError.value = e?.message || t.value('common.saveErrorGeneric');
  }
}

async function removeScene(id) {
  if (!confirm(t.value('outline.confirmScene'))) return;
  saveError.value = '';
  try {
    await deleteScene(id);
    await loadAll();
  } catch (e) {
    saveError.value = e?.message || t.value('common.saveErrorGeneric');
  }
}

const chapterExtraContext = computed(() => {
  const beat = chapterForm.value.beat || 'setup';
  const label = t.value(`outline.section.${beat}`);
  const spine = spineTextForBeat(beat);
  return `${t.value('outline.aiExtraContextChapterPrefix', { section: label })}\n${spine}`;
});

const sceneExtraContext = computed(() => {
  const chId = sceneForm.value.chapterId;
  const ch = (chapters.value || []).find((c) => c.id === chId) || null;
  const beat = ch?.beat || 'setup';
  const label = t.value(`outline.section.${beat}`);
  const spine = spineTextForBeat(beat);
  return `${t.value('outline.aiExtraContextScenePrefix', { section: label })}\n${spine}`;
});

function spineFieldKey(beat) {
  const m = {
    setup: 'story.fieldSetup',
    disaster1: 'story.fieldDisaster1',
    disaster2: 'story.fieldDisaster2',
    disaster3: 'story.fieldDisaster3',
    ending: 'story.fieldEnding',
  };
  return m[beat] || 'story.fieldSetup';
}

function spineTextForBeat(beat) {
  const s = story.value || {};
  const map = {
    setup: s.setup,
    disaster1: s.disaster1,
    disaster2: s.disaster2,
    disaster3: s.disaster3,
    ending: s.ending,
  };
  const text = map[beat] || '';
  return text?.trim() ? text : t.value('outline.spineNotFilled');
}

function chaptersForBeat(beat) {
  return (chapters.value || []).filter((c) => c.beat === beat);
}

async function assignBeat(ch, evt) {
  const value = evt?.target?.value ?? '';
  saveError.value = '';
  try {
    await updateChapter(ch.id, { beat: value || null });
    await loadAll();
  } catch (e) {
    saveError.value = e?.message || t.value('common.saveErrorGeneric');
  }
}

const draftOpen = ref(false);
const drafting = ref(false);
const draftError = ref('');
const draftData = ref(null);

async function draftForBeat(beat) {
  draftError.value = '';
  drafting.value = true;
  try {
    const storyId = story.value?.id || getCurrentStoryId();
    draftData.value = await draftOutlineFromSpine({ storyId, scope: beat });
    draftOpen.value = true;
  } catch (e) {
    draftError.value = e?.message || t.value('outline.aiDraftError');
  } finally {
    drafting.value = false;
  }
}

async function draftAll() {
  draftError.value = '';
  drafting.value = true;
  try {
    const storyId = story.value?.id || getCurrentStoryId();
    draftData.value = await draftOutlineFromSpine({ storyId, scope: 'all' });
    draftOpen.value = true;
  } catch (e) {
    draftError.value = e?.message || t.value('outline.aiDraftError');
  } finally {
    drafting.value = false;
  }
}

async function applyDraft(payload) {
  draftError.value = '';
  try {
    const sections = payload?.sections || {};
    for (const beat of beats) {
      const chaptersList = Array.isArray(sections[beat]) ? sections[beat] : [];
      for (const ch of chaptersList) {
        const created = await addChapter({
          title: ch.chapterTitle ?? '',
          summary: ch.chapterSummary ?? '',
          beat,
        });
        const scenesList = Array.isArray(ch.scenes) ? ch.scenes : [];
        for (const sc of scenesList) {
          await addScene({
            chapterId: created.id,
            title: sc.title ?? '',
            oneSentenceSummary: sc.oneSentence ?? '',
            notes: sc.notes ?? '',
            povCharacterId: '',
          });
        }
      }
    }
    await loadAll();
    draftOpen.value = false;
    draftData.value = null;
  } catch (e) {
    draftError.value = e?.message || t.value('outline.aiDraftError');
  }
}

onMounted(() => {
  loadAll();
  window.addEventListener('inkflow-story-switched', loadAll);
});
onUnmounted(() => {
  window.removeEventListener('inkflow-story-switched', loadAll);
});
</script>

<style scoped>
.form-card {
  margin-bottom: var(--space-5);
}
.outline-inline-chapter-form {
  margin-top: var(--space-3);
  margin-bottom: var(--space-3);
}
.outline-inline-scene-form {
  margin: 0;
  width: 100%;
}
.outline-inline-scene-form .form-title {
  font-size: 1rem;
}
.form-title {
  font-size: 1.125rem;
  font-weight: 600;
  margin: 0 0 var(--space-4);
}
.form-group {
  margin-bottom: var(--space-4);
}
.form-actions {
  display: flex;
  gap: var(--space-2);
  margin-top: var(--space-4);
}
.outline-actions {
  display: flex;
  gap: var(--space-2);
  margin-bottom: var(--space-5);
}
.outline-empty-hint {
  color: var(--text-muted);
  font-size: 0.9375rem;
  margin: 0 0 var(--space-4);
}
.outline-sections {
  display: flex;
  flex-direction: column;
  gap: var(--space-5);
}
.outline-section {
  padding: var(--space-4);
}
.outline-section-header {
  display: flex;
  align-items: flex-start;
  justify-content: space-between;
  gap: var(--space-4);
  margin-bottom: var(--space-3);
}
.outline-section-title {
  margin: 0;
  font-size: 1.125rem;
  font-weight: 700;
}
.outline-section-tip {
  margin: var(--space-1) 0 0;
  color: var(--text-muted);
  font-size: 0.9375rem;
  line-height: 1.4;
}
.outline-section-actions {
  display: flex;
  gap: var(--space-2);
  flex-wrap: wrap;
  justify-content: flex-end;
}
.outline-section-spine {
  padding: var(--space-3);
  margin-bottom: var(--space-4);
  background: var(--bg-elevated);
  border: 1px dashed var(--border);
}
.outline-section-spine-label {
  font-size: 0.75rem;
  font-weight: 700;
  color: var(--text-muted);
  letter-spacing: 0.02em;
  text-transform: uppercase;
  margin-bottom: var(--space-2);
}
.outline-section-spine-text {
  white-space: pre-wrap;
  line-height: 1.5;
}
.outline-section-spine-actions {
  display: flex;
  align-items: center;
  gap: var(--space-2);
  margin-top: var(--space-3);
}
.outline-spine-saved-hint {
  font-size: 0.875rem;
  color: var(--text-muted);
}
.outline-spine-oneline {
  padding: var(--space-4);
  margin-bottom: var(--space-4);
}
.outline-spine-oneline-label {
  display: block;
  font-weight: 600;
  margin-bottom: var(--space-2);
}
.outline-spine-oneline-input {
  width: 100%;
  padding: var(--space-2);
  margin-bottom: var(--space-2);
  border: 1px solid var(--border);
  border-radius: var(--radius);
}
.outline-section-empty {
  padding: var(--space-3) 0 var(--space-1);
  color: var(--text-muted);
}
.outline-section--ungrouped {
  border: 1px solid rgba(220, 38, 38, 0.25);
}
.outline-list {
  display: flex;
  flex-direction: column;
  gap: var(--space-4);
}
.chapter-card {
  padding: var(--space-4);
}
.chapter-header {
  display: flex;
  justify-content: space-between;
  align-items: flex-start;
  margin-bottom: var(--space-2);
}
.chapter-title {
  font-size: 1.125rem;
  font-weight: 600;
  margin: 0;
}
.chapter-summary {
  font-size: 0.9375rem;
  color: var(--text-muted);
  margin: 0 0 var(--space-3);
}
.chapter-actions {
  display: flex;
  gap: var(--space-1);
  align-items: center;
  flex-wrap: wrap;
  justify-content: flex-end;
}
.chapter-beat-select {
  min-width: 160px;
  font-size: 0.8125rem;
  padding: var(--space-1) var(--space-2);
}
.scenes {
  margin-top: var(--space-3);
  border-top: 1px solid var(--border);
  padding-top: var(--space-3);
}
.chapter-title-link {
  cursor: pointer;
  transition: color 0.15s;
}
.chapter-title-link:hover {
  color: var(--accent);
}
.scene-card {
  display: flex;
  justify-content: space-between;
  align-items: flex-start;
  gap: var(--space-3);
  padding: var(--space-4);
  margin-bottom: var(--space-3);
  background: var(--bg);
  border: 1px solid var(--border);
  border-radius: var(--radius);
  cursor: pointer;
  transition: background 0.15s, border-color 0.15s, box-shadow 0.15s;
}
.scene-card:hover {
  background: var(--bg-elevated);
  border-color: var(--accent);
  box-shadow: var(--shadow);
}
.scene-card-main {
  flex: 1;
  min-width: 0;
}
.scene-card-title {
  font-weight: 600;
  font-size: 1rem;
  display: block;
}
.scene-card-summary {
  display: block;
  font-size: 0.875rem;
  color: var(--text-muted);
  margin-top: var(--space-1);
}
.scene-card-actions {
  display: flex;
  align-items: center;
  gap: var(--space-1);
  flex-shrink: 0;
}
.scene-card-actions .btn-sm {
  white-space: nowrap;
}
.save-error {
  margin-bottom: var(--space-2);
  font-size: 0.875rem;
  color: var(--danger);
}
</style>
