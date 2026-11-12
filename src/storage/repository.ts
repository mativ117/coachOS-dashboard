import type { Library } from "../model/types";
import { parseBoundedJson, validateLibrary } from "../model/validate";

export class StorageConflict extends Error {
  constructor() {
    super(
      "La bibliothèque a changé dans un autre onglet. Rechargez avant de réessayer.",
    );
  }
}
export class LibraryRepository {
  private constructor(private readonly db: IDBDatabase) {}
  static open(): Promise<LibraryRepository> {
    return new Promise((resolve, reject) => {
      let request: IDBOpenDBRequest;
      try {
        request = indexedDB.open("coachos", 1);
      } catch (error) {
        reject(error);
        return;
      }
      let settled = false;
      request.onupgradeneeded = () => {
        if (!request.result.objectStoreNames.contains("library"))
          request.result.createObjectStore("library");
      };
      request.onerror = () => reject(request.error);
      request.onblocked = () => {
        settled = true;
        reject(new Error("Un autre onglet bloque l’ouverture du stockage."));
      };
      request.onsuccess = () => {
        const db = request.result;
        if (settled) {
          db.close();
          return;
        }
        db.onversionchange = () => db.close();
        resolve(new LibraryRepository(db));
      };
    });
  }
  close() {
    this.db.close();
  }
  readRaw(): Promise<unknown> {
    return new Promise((resolve, reject) => {
      const tx = this.db.transaction("library", "readonly");
      const req = tx.objectStore("library").get("current");
      tx.oncomplete = () => resolve(req.result);
      tx.onerror = () => reject(tx.error);
      tx.onabort = () => reject(tx.error ?? new Error("Lecture interrompue."));
    });
  }
  async read(): Promise<Library | undefined> {
    const raw = await this.readRaw();
    return raw === undefined
      ? undefined
      : validateLibrary(parseBoundedJson(JSON.stringify(raw)));
  }
  /** Une transaction unique et un contrôle de révision évitent remplacement partiel et écrasement inter-onglets. */
  save(library: Library, expectedRevision: number | null): Promise<void> {
    const clean = validateLibrary(parseBoundedJson(JSON.stringify(library)));
    if (
      clean.revision !== (expectedRevision === null ? 1 : expectedRevision + 1)
    )
      return Promise.reject(new Error("Révision de sauvegarde incohérente."));
    return new Promise((resolve, reject) => {
      const tx = this.db.transaction("library", "readwrite");
      const store = tx.objectStore("library");
      const read = store.get("current");
      let failure: Error | undefined;
      read.onsuccess = () => {
        let current: Library | undefined;
        try {
          current =
            read.result === undefined
              ? undefined
              : validateLibrary(read.result);
        } catch (e) {
          failure =
            e instanceof Error ? e : new Error("Données stockées invalides.");
          tx.abort();
          return;
        }
        if ((current?.revision ?? null) !== expectedRevision) {
          failure = new StorageConflict();
          tx.abort();
          return;
        }
        try {
          store.put(clean, "current");
        } catch (e) {
          failure = e instanceof Error ? e : new Error("Échec de sauvegarde.");
          tx.abort();
        }
      };
      tx.oncomplete = () => resolve();
      tx.onabort = () =>
        reject(failure ?? tx.error ?? new Error("Enregistrement interrompu."));
      tx.onerror = () => reject(tx.error ?? new Error("Échec de sauvegarde."));
    });
  }
}
