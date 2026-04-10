import { describe, it, expect } from 'vitest'
import { DEFAULT_SETTINGS } from '../types'

describe('DEFAULT_SETTINGS', () => {
  it('has a valid AnkiConnect URL', () => {
    expect(DEFAULT_SETTINGS.ankiConnectUrl).toBe('http://localhost:8765')
  })

  it('has an empty tags array', () => {
    expect(DEFAULT_SETTINGS.defaultTags).toEqual([])
  })

  it('has a default deck name', () => {
    expect(DEFAULT_SETTINGS.defaultDeck).toBe('Default')
  })
})
