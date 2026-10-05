import { Stroke } from '../../types/ink';

const DB_NAME = 'calligraphy';
const DB_VERSION = 1;
const SHEETS = 'sheets';
const DRAFTS = 'drafts';
const MAX_SHEETS = 160;

/** Una hoja calificada: la miniatura y la nota, para comparar con el tiempo. */
export interface SavedSheet {
  id?: number;
  lessonId: string;
  title: string;
  at: number;
  score: number;
  thumb: string;
}

/** La hoja a medio escribir de una lección. */
export interface SheetDraft {
  lessonId: string;
  at: number;
  width: number;
  height: number;
  strokes: Stroke[];
}

function request<T>(req: IDBRequest<T>): Promise<T> {
  return new Promise((resolve, reject) => {
    req.onsuccess = () => resolve(req.result);
    req.onerror = () => reject(req.error);
  });
}

/**
 * Hojas y borradores en IndexedDB. Si el navegador no lo ofrece (modo privado),
 * todas las operaciones se resuelven vacías y la práctica sigue sin guardar hojas.
 */
export class SheetStore {
  private db: Promise<IDBDatabase | null> | null = null;

  private open(): Promise<IDBDatabase | null> {
    if (this.db) return this.db;
    this.db = new Promise((resolve) => {
      if (typeof indexedDB === 'undefined') {
        resolve(null);
        return;
      }
      try {
        const req = indexedDB.open(DB_NAME, DB_VERSION);
        req.onupgradeneeded = () => {
          const db = req.result;
          if (!db.objectStoreNames.contains(SHEETS)) {
            const sheets = db.createObjectStore(SHEETS, { keyPath: 'id', autoIncrement: true });
            sheets.createIndex('lessonId', 'lessonId');
            sheets.createIndex('at', 'at');
          }
          if (!db.objectStoreNames.contains(DRAFTS)) db.createObjectStore(DRAFTS, { keyPath: 'lessonId' });
        };
        req.onsuccess = () => resolve(req.result);
        req.onerror = () => resolve(null);
        req.onblocked = () => resolve(null);
      } catch {
        resolve(null);
      }
    });
    return this.db;
  }

  private async run<T>(store: string, mode: IDBTransactionMode, work: (store: IDBObjectStore) => IDBRequest<T>): Promise<T | null> {
    const db = await this.open();
    if (!db) return null;
    try {
      return await request(work(db.transaction(store, mode).objectStore(store)));
    } catch {
      return null;
    }
  }

  public async saveSheet(sheet: SavedSheet): Promise<void> {
    await this.run(SHEETS, 'readwrite', (store) => store.add(sheet));
    await this.prune();
  }

  /** Todas las hojas, de la más reciente a la más antigua. */
  public async listSheets(): Promise<SavedSheet[]> {
    const all = await this.run<SavedSheet[]>(SHEETS, 'readonly', (store) => store.getAll());
    return (all ?? []).sort((a, b) => b.at - a.at);
  }

  /** Borra todas las hojas guardadas de una lección. */
  public async deleteLessonSheets(lessonId: string): Promise<void> {
    const ids = (await this.listSheets()).filter((sheet) => sheet.lessonId === lessonId).map((sheet) => sheet.id);
    for (const id of ids) if (id != null) await this.run(SHEETS, 'readwrite', (store) => store.delete(id));
  }

  public async saveDraft(draft: SheetDraft): Promise<void> {
    await this.run(DRAFTS, 'readwrite', (store) => store.put(draft));
  }

  public async loadDraft(lessonId: string): Promise<SheetDraft | null> {
    return (await this.run<SheetDraft | undefined>(DRAFTS, 'readonly', (store) => store.get(lessonId))) ?? null;
  }

  public async deleteDraft(lessonId: string): Promise<void> {
    await this.run(DRAFTS, 'readwrite', (store) => store.delete(lessonId));
  }

  public async clearAll(): Promise<void> {
    await this.run(SHEETS, 'readwrite', (store) => store.clear());
    await this.run(DRAFTS, 'readwrite', (store) => store.clear());
  }

  /** Al pasar el tope se borran las más viejas, pero la primera de cada lección se conserva. */
  private async prune(): Promise<void> {
    const sheets = await this.listSheets();
    if (sheets.length <= MAX_SHEETS) return;
    const first = new Map<string, number>();
    for (const sheet of sheets) first.set(sheet.lessonId, sheet.id ?? -1);
    const keep = new Set(first.values());
    let excess = sheets.length - MAX_SHEETS;
    for (let i = sheets.length - 1; i >= 0 && excess > 0; i--) {
      const id = sheets[i].id;
      if (id == null || keep.has(id)) continue;
      await this.run(SHEETS, 'readwrite', (store) => store.delete(id));
      excess -= 1;
    }
  }
}
