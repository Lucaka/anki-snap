export type { IAnkiService, AnkiNote, AnkiDeck, AnkiModel } from './interface'
export { AnkiServiceError } from './interface'
export { AnkiConnectService } from './anki-connect.service'
export { AnkiWebService } from './anki-web.service'

import type { IAnkiService } from './interface'
import { AnkiConnectService } from './anki-connect.service'
import { AnkiWebService } from './anki-web.service'
import type { Settings } from '@/shared/types'

/**
 * Return the correct IAnkiService implementation based on current settings.
 */
export function createAnkiService(settings: Pick<Settings, 'ankiProvider' | 'ankiConnectUrl'>): IAnkiService {
  if (settings.ankiProvider === 'ankiweb') {
    return new AnkiWebService()
  }
  return new AnkiConnectService(settings.ankiConnectUrl)
}
