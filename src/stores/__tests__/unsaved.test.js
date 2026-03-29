import { describe, it, expect } from 'vitest'
import { storyDirty, sceneDirty } from '@/stores/unsaved'

describe('unsaved store', () => {
  it('exports storyDirty and sceneDirty as refs', () => {
    expect(storyDirty).toBeDefined()
    expect(sceneDirty).toBeDefined()
    expect(typeof storyDirty.value).toBe('boolean')
    expect(typeof sceneDirty.value).toBe('boolean')
  })

  it('allows setting and reading storyDirty', () => {
    storyDirty.value = true
    expect(storyDirty.value).toBe(true)
    storyDirty.value = false
    expect(storyDirty.value).toBe(false)
  })

  it('allows setting and reading sceneDirty', () => {
    sceneDirty.value = true
    expect(sceneDirty.value).toBe(true)
    sceneDirty.value = false
    expect(sceneDirty.value).toBe(false)
  })
})
