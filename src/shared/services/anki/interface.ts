export interface AnkiNote {
  deckName: string
  modelName: string
  fields: Record<string, string>
  tags: string[]
}

export interface AnkiDeck {
  id: number
  name: string
}

export interface AnkiModel {
  name: string
  fields: string[]
}

export class AnkiServiceError extends Error {
  constructor(
    message: string,
    public readonly cause?: unknown,
  ) {
    super(message)
    this.name = 'AnkiServiceError'
  }
}

export interface IAnkiService {
  /** Human-readable name for this service implementation */
  readonly name: string

  /** Check if the service is reachable and authenticated */
  isConnected(): Promise<boolean>

  /** Return available deck names */
  getDecks(): Promise<string[]>

  /** Return available note model names */
  getModels(): Promise<string[]>

  /** Return field names for a given model */
  getModelFields(modelName: string): Promise<string[]>

  /** Add a single note, returns the new note ID */
  addNote(note: AnkiNote): Promise<number>
}
