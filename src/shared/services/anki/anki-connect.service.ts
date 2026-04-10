import type { IAnkiService, AnkiNote } from './interface'
import { AnkiServiceError } from './interface'

interface AnkiConnectResponse<T> {
  result: T
  error: string | null
}

export class AnkiConnectService implements IAnkiService {
  readonly name = 'AnkiConnect'

  constructor(private readonly baseUrl: string = 'http://localhost:8765') {}

  private async invoke<T>(action: string, params: Record<string, unknown> = {}): Promise<T> {
    let resp: Response
    try {
      resp = await fetch(this.baseUrl, {
        method: 'POST',
        headers: { 'Content-Type': 'application/json' },
        body: JSON.stringify({ action, version: 6, params }),
      })
    } catch (err) {
      throw new AnkiServiceError(
        `Cannot reach AnkiConnect at ${this.baseUrl}. Is Anki running with the AnkiConnect add-on?`,
        err,
      )
    }

    if (!resp.ok) {
      throw new AnkiServiceError(`AnkiConnect returned HTTP ${resp.status}`)
    }

    const body: AnkiConnectResponse<T> = await resp.json()

    if (body.error) {
      throw new AnkiServiceError(`AnkiConnect error: ${body.error}`)
    }

    return body.result
  }

  async isConnected(): Promise<boolean> {
    try {
      await this.invoke<number>('version')
      return true
    } catch {
      return false
    }
  }

  async getDecks(): Promise<string[]> {
    return this.invoke<string[]>('deckNames')
  }

  async getModels(): Promise<string[]> {
    return this.invoke<string[]>('modelNames')
  }

  async getModelFields(modelName: string): Promise<string[]> {
    return this.invoke<string[]>('modelFieldNames', { modelName })
  }

  async addNote(note: AnkiNote): Promise<number> {
    return this.invoke<number>('addNote', {
      note: {
        deckName: note.deckName,
        modelName: note.modelName,
        fields: note.fields,
        tags: note.tags,
        options: {
          allowDuplicate: false,
          duplicateScope: 'deck',
        },
      },
    })
  }
}
