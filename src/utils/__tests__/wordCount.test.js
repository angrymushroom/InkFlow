import { describe, it, expect } from 'vitest';
import { countWords } from '@/utils/wordCount.js';

describe('countWords', () => {
  it('returns 0 for empty string', () => {
    expect(countWords('')).toBe(0);
  });

  it('returns 0 for whitespace-only string', () => {
    expect(countWords('   \n\t  ')).toBe(0);
  });

  it('counts English words by whitespace', () => {
    expect(countWords('The quick brown fox')).toBe(4);
    expect(countWords('  hello   world  ')).toBe(2);
    expect(countWords('one')).toBe(1);
  });

  it('counts each CJK character as one word', () => {
    // 3 Chinese characters
    expect(countWords('你好世界')).toBe(4);
    expect(countWords('一')).toBe(1);
  });

  it('handles mixed CJK + Latin text correctly', () => {
    // "Hello 世界" → 1 Latin + 2 CJK = 3
    expect(countWords('Hello 世界')).toBe(3);
    // "这是 test 测试" → 2 CJK + 1 Latin + 2 CJK = 5
    expect(countWords('这是 test 测试')).toBe(5);
  });

  it('punctuation is not counted as words', () => {
    expect(countWords('Hello, world!')).toBe(2);
    expect(countWords('one. two. three.')).toBe(3);
  });
});
