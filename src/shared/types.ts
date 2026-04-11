export interface AnkiCard {
  front: string
  back: string
  tags?: string[]
  deckName?: string
}

export interface AnkiCardData {
  front: string
  back: string
  example: string
  related: string
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
  | 'GENERATE_CARDS'
  | 'SHOW_SNAP_PANEL'
  | 'OPEN_OPTIONS'

export interface Message<T = unknown> {
  type: MessageType
  payload?: T
}

export interface Settings {
  ankiConnectUrl: string
  defaultDeck: string
  defaultTags: string[]
  openaiApiKey: string
  showFloatingIcon: boolean
  targetLanguage: string
  openaiModel: string
}

export const DEFAULT_SETTINGS: Settings = {
  ankiConnectUrl: 'http://localhost:8765',
  defaultDeck: 'Default',
  defaultTags: [],
  openaiApiKey: '',
  showFloatingIcon: true,
  targetLanguage: '繁體中文',
  openaiModel: 'gpt-4o-mini',
}
