// ── Anki provider ─────────────────────────────────────────────────────────────

export type AnkiProvider = 'ankiconnect' | 'ankiweb'

// ── Domain models ─────────────────────────────────────────────────────────────

export interface SnapSelection {
  text: string
  url: string
  title: string
  timestamp: number
}

// ── Extension messaging ───────────────────────────────────────────────────────

export type MessageType =
  | 'SNAP_SELECTION'
  | 'CREATE_CARD'
  | 'GET_SETTINGS'
  | 'SET_SETTINGS'

export interface Message<T = unknown> {
  type: MessageType
  payload?: T
}

// ── Settings ──────────────────────────────────────────────────────────────────

export interface Settings {
  /** Which backend to use for creating cards */
  ankiProvider: AnkiProvider

  // AnkiConnect options (only used when ankiProvider === 'ankiconnect')
  ankiConnectUrl: string

  // Shared card defaults
  defaultDeck: string
  defaultModel: string
  defaultTags: string[]
}

export const DEFAULT_SETTINGS: Settings = {
  ankiProvider: 'ankiconnect',
  ankiConnectUrl: 'http://localhost:8765',
  defaultDeck: 'Default',
  defaultModel: 'Basic',
  defaultTags: [],
}
