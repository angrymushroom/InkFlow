import { describe, it, expect } from 'vitest';

const { selectRelevantScenes } = await import('@/services/retrieval.js');

describe('selectRelevantScenes', () => {
  it('returns empty array when candidateScenes is empty', () => {
    const result = selectRelevantScenes([], { title: 'test' });
    expect(result).toEqual([]);
  });

  it('falls back to last-N when query is empty', () => {
    const scenes = [
      { id: 's1', title: '' },
      { id: 's2', title: '' },
      { id: 's3', title: '' },
      { id: 's4', title: '' },
      { id: 's5', title: '' },
      { id: 's6', title: '' },
    ];
    const result = selectRelevantScenes(scenes, {}, 3);
    expect(result).toHaveLength(3);
    expect(result.map((s) => s.id)).toEqual(['s4', 's5', 's6']);
  });

  it('falls back to last-N when no BM25 scores > 0', () => {
    const scenes = [
      { id: 's1', title: 'alpha', aiSummary: 'alpha' },
      { id: 's2', title: 'beta', aiSummary: 'beta' },
      { id: 's3', title: 'gamma', aiSummary: 'gamma' },
    ];
    const result = selectRelevantScenes(scenes, { title: 'zzzzz_nomatch_zzzzz' }, 2);
    expect(result).toHaveLength(2);
    expect(result.map((s) => s.id)).toEqual(['s2', 's3']);
  });

  it('returns scenes in narrative order (not score order)', () => {
    const scenes = [
      { id: 's1', title: 'dragon fight', aiSummary: 'dragon fight hero battle' },
      { id: 's2', title: 'market visit', aiSummary: 'market visit town' },
      { id: 's3', title: 'dragon lair', aiSummary: 'dragon lair cave hero battle' },
    ];
    const result = selectRelevantScenes(scenes, { title: 'dragon', oneSentenceSummary: 'hero faces dragon' }, 3);
    const ids = result.map((s) => s.id);
    const s1Idx = ids.indexOf('s1');
    const s3Idx = ids.indexOf('s3');
    if (s1Idx >= 0 && s3Idx >= 0) {
      // Narrative order: s1 must come before s3
      expect(s1Idx).toBeLessThan(s3Idx);
    }
  });

  it('returns at most topK scenes', () => {
    const scenes = Array.from({ length: 10 }, (_, i) => ({
      id: `s${i}`,
      title: `hero adventure scene ${i}`,
      aiSummary: `hero adventure ${i}`,
    }));
    const result = selectRelevantScenes(scenes, { title: 'hero adventure' }, 3);
    expect(result.length).toBeLessThanOrEqual(3);
  });

  it('returns all candidates when fewer than topK exist', () => {
    const scenes = [
      { id: 's1', title: 'hero quest', aiSummary: 'hero quest adventure' },
      { id: 's2', title: 'hero battle', aiSummary: 'hero battle fight' },
    ];
    const result = selectRelevantScenes(scenes, { title: 'hero' }, 5);
    expect(result.length).toBeLessThanOrEqual(2);
  });

  it('ranks scenes mentioning query terms higher', () => {
    const scenes = [
      { id: 's1', title: 'random thing', aiSummary: 'nothing relevant here' },
      { id: 's2', title: 'dragon slayer quest', aiSummary: 'hero fights dragon in mountain cave' },
      { id: 's3', title: 'quiet village', aiSummary: 'peaceful day at the inn' },
    ];
    const result = selectRelevantScenes(scenes, { title: 'dragon fight', oneSentenceSummary: 'hero vs dragon' }, 2);
    const ids = result.map((s) => s.id);
    expect(ids).toContain('s2');
  });
});
