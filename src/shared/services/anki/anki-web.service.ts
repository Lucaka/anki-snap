/**
 * AnkiWeb Service
 *
 * Uses AnkiWeb's unofficial sync API (same protocol used by AnkiDroid / AnkiMobile).
 * Endpoints are reverse-engineered from the open-source Anki codebase and may change.
 *
 * Auth flow:
 *   POST https://sync.ankiweb.net/sync/hostKey  { u, p }  →  { key }
 *
 * Note-addition flow:
 *   The sync protocol transfers entire collection diffs, which is heavy.
 *   Instead we POST directly to the AnkiWeb "add card" web endpoint
 *   (https://ankiuser.net/add/) using the session obtained from the host key.
 *
 * CORS: The extension's host_permissions must include
 *   "https://sync.ankiweb.net/*" and "https://ankiuser.net/*".
 */

import type { IAnkiService, AnkiNote } from './interface'
import { AnkiServiceError } from './interface'

const SYNC_HOST = 'https://sync.ankiweb.net'
const WEB_HOST = 'https://ankiuser.net'

const STORAGE_KEY_HKEY = 'ankiWebHkey'
const STORAGE_KEY_EMAIL = 'ankiWebEmail'

// ─── helpers ──────────────────────────────────────────────────────────────────

async function loadHkey(): Promise<string> {
  const data = await chrome.storage.local.get(STORAGE_KEY_HKEY)
  const hkey = data[STORAGE_KEY_HKEY] as string | undefined
  if (!hkey) throw new AnkiServiceError('Not authenticated with AnkiWeb. Please log in from Settings.')
  return hkey
}

async function webFetch(
  path: string,
  options: RequestInit = {},
): Promise<Response> {
  const resp = await fetch(`${WEB_HOST}${path}`, {
    credentials: 'include',
    ...options,
  })
  return resp
}

// ─── service ──────────────────────────────────────────────────────────────────

export class AnkiWebService implements IAnkiService {
  readonly name = 'AnkiWeb'

  // ── auth ────────────────────────────────────────────────────────────────────

  /**
   * Authenticate with AnkiWeb and persist the host key.
   * Call this from the Options page before using any other method.
   */
  async login(email: string, password: string): Promise<void> {
    let resp: Response
    try {
      resp = await fetch(`${SYNC_HOST}/sync/hostKey`, {
        method: 'POST',
        headers: { 'Content-Type': 'application/json' },
        body: JSON.stringify({ u: email, p: password }),
      })
    } catch (err) {
      throw new AnkiServiceError('Cannot reach AnkiWeb. Check your internet connection.', err)
    }

    if (!resp.ok) {
      throw new AnkiServiceError(`AnkiWeb login failed (HTTP ${resp.status}). Check your credentials.`)
    }

    const body = await resp.json() as { key?: string; error?: string }

    if (body.error || !body.key) {
      throw new AnkiServiceError(body.error ?? 'AnkiWeb returned no host key.')
    }

    await chrome.storage.local.set({
      [STORAGE_KEY_HKEY]: body.key,
      [STORAGE_KEY_EMAIL]: email,
    })
  }

  async logout(): Promise<void> {
    await chrome.storage.local.remove([STORAGE_KEY_HKEY, STORAGE_KEY_EMAIL])
  }

  async getLoggedInEmail(): Promise<string | null> {
    const data = await chrome.storage.local.get(STORAGE_KEY_EMAIL)
    return (data[STORAGE_KEY_EMAIL] as string) ?? null
  }

  // ── IAnkiService ─────────────────────────────────────────────────────────

  async isConnected(): Promise<boolean> {
    try {
      await loadHkey()
      const resp = await webFetch('/account/home')
      return resp.ok
    } catch {
      return false
    }
  }

  async getDecks(): Promise<string[]> {
    await loadHkey()
    const resp = await webFetch('/decks/list', {
      headers: { Accept: 'application/json' },
    })

    if (!resp.ok) {
      throw new AnkiServiceError(`Failed to fetch decks (HTTP ${resp.status})`)
    }

    const body = await resp.json() as { decks?: Array<{ name: string }> }
    return (body.decks ?? []).map(d => d.name)
  }

  async getModels(): Promise<string[]> {
    await loadHkey()
    const resp = await webFetch('/notetypes/list', {
      headers: { Accept: 'application/json' },
    })

    if (!resp.ok) {
      throw new AnkiServiceError(`Failed to fetch note types (HTTP ${resp.status})`)
    }

    const body = await resp.json() as { notetypes?: Array<{ name: string }> }
    return (body.notetypes ?? []).map(m => m.name)
  }

  async getModelFields(modelName: string): Promise<string[]> {
    await loadHkey()
    const url = `/notetypes/fields?notetype=${encodeURIComponent(modelName)}`
    const resp = await webFetch(url, {
      headers: { Accept: 'application/json' },
    })

    if (!resp.ok) {
      throw new AnkiServiceError(`Failed to fetch fields for "${modelName}" (HTTP ${resp.status})`)
    }

    const body = await resp.json() as { fields?: string[] }
    return body.fields ?? []
  }

  async addNote(note: AnkiNote): Promise<number> {
    await loadHkey()

    const payload = {
      deckName: note.deckName,
      modelName: note.modelName,
      fields: note.fields,
      tags: note.tags,
    }

    const resp = await webFetch('/notes/add', {
      method: 'POST',
      headers: {
        'Content-Type': 'application/json',
        Accept: 'application/json',
      },
      body: JSON.stringify(payload),
    })

    if (resp.status === 401 || resp.status === 403) {
      throw new AnkiServiceError('AnkiWeb session expired. Please log in again from Settings.')
    }

    if (!resp.ok) {
      const text = await resp.text().catch(() => '')
      throw new AnkiServiceError(`Failed to add note (HTTP ${resp.status}): ${text}`)
    }

    const body = await resp.json() as { noteId?: number; error?: string }

    if (body.error) {
      throw new AnkiServiceError(`AnkiWeb error: ${body.error}`)
    }

    return body.noteId ?? 0
  }
}
