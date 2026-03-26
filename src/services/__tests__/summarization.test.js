import { vi, describe, it, expect, beforeEach } from 'vitest';

// ---------------------------------------------------------------------------
// DB mocks
// ---------------------------------------------------------------------------
const mockGetScene = vi.fn();
const mockGetScenesByChapter = vi.fn(() => Promise.resolve([]));
const mockGetChapterById = vi.fn();
const mockUpdateSceneSummary = vi.fn(() => Promise.resolve());
const mockUpdateChapterSummary = vi.fn(() => Promise.resolve());

vi.mock('@/db', () => ({
  getScene: (...args) => mockGetScene(...args),
  getScenesByChapter: (...args) => mockGetScenesByChapter(...args),
  getChapterById: (...args) => mockGetChapterById(...args),
  updateSceneSummary: (...args) => mockUpdateSceneSummary(...args),
  updateChapterSummary: (...args) => mockUpdateChapterSummary(...args),
}));

// ---------------------------------------------------------------------------
// AI mock
// ---------------------------------------------------------------------------
const mockCompleteWithAi = vi.fn(() => Promise.resolve('A concise summary.'));

vi.mock('@/services/ai', () => ({
  completeWithAi: (...args) => mockCompleteWithAi(...args),
  CONTEXTS: { CONSISTENCY: 'consistency', SCENE_PROSE: 'scene_prose' },
  tierForContext: vi.fn(() => 'light'),
}));

const { generateSceneSummary, generateChapterSummary, runSummaryPipeline } =
  await import('@/services/summarization.js');

describe('generateSceneSummary', () => {
  beforeEach(() => {
    vi.clearAllMocks();
    mockCompleteWithAi.mockResolvedValue('A concise summary.');
  });

  it('returns null for scenes with content shorter than 50 chars', async () => {
    mockGetScene.mockResolvedValue({ id: 's1', content: 'Short.', updatedAt: 0 });
    const result = await generateSceneSummary('s1');
    expect(result).toBeNull();
    expect(mockCompleteWithAi).not.toHaveBeenCalled();
  });

  it('returns null for scene with no content', async () => {
    mockGetScene.mockResolvedValue({ id: 's1', content: '', updatedAt: 0 });
    const result = await generateSceneSummary('s1');
    expect(result).toBeNull();
  });

  it('returns null when scene does not exist', async () => {
    mockGetScene.mockResolvedValue(null);
    const result = await generateSceneSummary('s1');
    expect(result).toBeNull();
  });

  it('returns cached aiSummary when aiSummaryAt >= updatedAt (no AI call)', async () => {
    const now = Date.now();
    mockGetScene.mockResolvedValue({
      id: 's1',
      content: 'A'.repeat(100),
      aiSummary: 'Cached summary text',
      aiSummaryAt: now + 1000,
      updatedAt: now,
    });
    const result = await generateSceneSummary('s1');
    expect(result).toBe('Cached summary text');
    expect(mockCompleteWithAi).not.toHaveBeenCalled();
  });

  it('calls AI and stores result when cache is stale', async () => {
    const now = Date.now();
    mockGetScene.mockResolvedValue({
      id: 's1',
      content: 'A'.repeat(100),
      aiSummary: 'Old summary',
      aiSummaryAt: now - 5000,
      updatedAt: now,
    });
    const result = await generateSceneSummary('s1');
    expect(mockCompleteWithAi).toHaveBeenCalled();
    expect(mockUpdateSceneSummary).toHaveBeenCalledWith('s1', 'A concise summary.', expect.any(Number));
    expect(result).toBe('A concise summary.');
  });

  it('calls updateSceneSummary — not updateScene (updatedAt must not be touched)', async () => {
    mockGetScene.mockResolvedValue({ id: 's1', content: 'A'.repeat(100), updatedAt: 0 });
    await generateSceneSummary('s1');
    expect(mockUpdateSceneSummary).toHaveBeenCalled();
  });

  it('returns null when AI returns empty string', async () => {
    mockCompleteWithAi.mockResolvedValue('');
    mockGetScene.mockResolvedValue({ id: 's1', content: 'A'.repeat(100), updatedAt: 0 });
    const result = await generateSceneSummary('s1');
    expect(result).toBeNull();
    expect(mockUpdateSceneSummary).not.toHaveBeenCalled();
  });
});

describe('generateChapterSummary', () => {
  beforeEach(() => {
    vi.clearAllMocks();
    mockCompleteWithAi.mockResolvedValue('Chapter summary text.');
  });

  it('returns null when no scenes have aiSummary', async () => {
    mockGetScenesByChapter.mockResolvedValue([
      { id: 's1', title: 'Scene 1', aiSummary: '' },
      { id: 's2', title: 'Scene 2', aiSummary: null },
    ]);
    const result = await generateChapterSummary('ch1');
    expect(result).toBeNull();
    expect(mockCompleteWithAi).not.toHaveBeenCalled();
  });

  it('aggregates scene summaries and calls AI', async () => {
    mockGetScenesByChapter.mockResolvedValue([
      { id: 's1', title: 'Scene 1', aiSummary: 'Scene 1 summary.' },
      { id: 's2', title: 'Scene 2', aiSummary: 'Scene 2 summary.' },
    ]);
    await generateChapterSummary('ch1');
    expect(mockCompleteWithAi).toHaveBeenCalled();
    const call = mockCompleteWithAi.mock.calls[0][0];
    expect(call.userPrompt).toContain('Scene 1 summary');
    expect(call.userPrompt).toContain('Scene 2 summary');
  });

  it('calls updateChapterSummary to store result', async () => {
    mockGetScenesByChapter.mockResolvedValue([
      { id: 's1', title: 'Scene 1', aiSummary: 'Some summary.' },
    ]);
    await generateChapterSummary('ch1');
    expect(mockUpdateChapterSummary).toHaveBeenCalledWith('ch1', 'Chapter summary text.', expect.any(Number));
  });
});

describe('runSummaryPipeline', () => {
  beforeEach(() => {
    vi.clearAllMocks();
    mockCompleteWithAi.mockResolvedValue('A concise summary.');
    mockGetScene.mockResolvedValue({ id: 's1', content: 'A'.repeat(100), updatedAt: 0 });
    mockGetScenesByChapter.mockResolvedValue([
      { id: 's1', title: 'Scene 1', aiSummary: 'A concise summary.' },
    ]);
  });

  it('calls generateSceneSummary then generateChapterSummary in sequence', async () => {
    const calls = [];
    mockUpdateSceneSummary.mockImplementation(() => { calls.push('sceneSummary'); return Promise.resolve(); });
    mockUpdateChapterSummary.mockImplementation(() => { calls.push('chapterSummary'); return Promise.resolve(); });

    await runSummaryPipeline('s1', 'ch1');

    expect(calls.indexOf('sceneSummary')).toBeLessThan(calls.indexOf('chapterSummary'));
  });

  it('skips chapter summary step when scene summary throws', async () => {
    mockGetScene.mockRejectedValue(new Error('DB error'));
    await runSummaryPipeline('s1', 'ch1');
    expect(mockUpdateChapterSummary).not.toHaveBeenCalled();
  });
});
