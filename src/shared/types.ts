export interface AnkiCard {
  front: string
  back: string
  tags?: string[]
  deckName?: string
}

export interface SnapSelection {
  text: string
  url: string
  title: string
  timestamp: number
}

export type MessageType =
  | 'SNAP_SELECTION'
  | 'CREATE_CARD'
  | 'GET_SETTINGS'
  | 'SET_SETTINGS'

export interface Message<T = unknown> {
  type: MessageType
  payload?: T
}

export interface Settings {
  ankiConnectUrl: string
  defaultDeck: string
  defaultTags: string[]
}

export const DEFAULT_SETTINGS: Settings = {
  ankiConnectUrl: 'http://localhost:8765',
  defaultDeck: 'Default',
  defaultTags: [],
}
