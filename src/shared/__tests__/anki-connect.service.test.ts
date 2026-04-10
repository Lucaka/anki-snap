import { describe, it, expect, vi, beforeEach } from 'vitest'
import { AnkiConnectService } from '../services/anki/anki-connect.service'
import { AnkiServiceError } from '../services/anki/interface'

const mockFetch = vi.fn()
globalThis.fetch = mockFetch

function mockOk<T>(result: T) {
  mockFetch.mockResolvedValueOnce({
    ok: true,
    json: () => Promise.resolve({ result, error: null }),
  })
}

function mockError(error: string) {
  mockFetch.mockResolvedValueOnce({
    ok: true,
    json: () => Promise.resolve({ result: null, error }),
  })
}

describe('AnkiConnectService', () => {
  let service: AnkiConnectService

  beforeEach(() => {
    service = new AnkiConnectService('http://localhost:8765')
    mockFetch.mockReset()
  })

  describe('isConnected', () => {
    it('returns true when AnkiConnect responds', async () => {
      mockOk(6)
      expect(await service.isConnected()).toBe(true)
    })

    it('returns false when fetch throws (Anki not running)', async () => {
      mockFetch.mockRejectedValueOnce(new Error('ECONNREFUSED'))
      expect(await service.isConnected()).toBe(false)
    })
  })

  describe('getDecks', () => {
    it('returns deck names from result', async () => {
      mockOk(['Default', 'Japanese'])
      expect(await service.getDecks()).toEqual(['Default', 'Japanese'])
    })

    it('throws AnkiServiceError on API error', async () => {
      mockError('collection is not available')
      await expect(service.getDecks()).rejects.toThrow(AnkiServiceError)
    })
  })

  describe('addNote', () => {
    it('returns the new note ID', async () => {
      mockOk(1234567890)
      const id = await service.addNote({
        deckName: 'Default',
        modelName: 'Basic',
        fields: { Front: 'Hello', Back: 'World' },
        tags: [],
      })
      expect(id).toBe(1234567890)
    })

    it('sends the correct JSON body to AnkiConnect', async () => {
      mockOk(999)
      await service.addNote({
        deckName: 'Japanese',
        modelName: 'Basic',
        fields: { Front: '猫', Back: 'cat' },
        tags: ['animals'],
      })

      const body = JSON.parse(mockFetch.mock.calls[0][1].body)
      expect(body.action).toBe('addNote')
      expect(body.params.note.deckName).toBe('Japanese')
      expect(body.params.note.fields.Front).toBe('猫')
      expect(body.params.note.tags).toContain('animals')
    })
  })
})
