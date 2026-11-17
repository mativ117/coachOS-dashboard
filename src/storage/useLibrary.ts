import { classifyLibrary } from "../library/ownership";
import { useEffect, useRef, useState } from "react";
import type { Library, Play } from "../model/types";
import { seedLibrary } from "../migration/seed";
import { LibraryRepository, StorageConflict } from "./repository";

export function useLibrary() {
  const [library, setLibrary] = useState<Library>(seedLibrary);
  const [status, setStatus] = useState<
    "loading" | "saved" | "saving" | "error"
  >("loading");
  const [error, setError] = useState("");
  const [atomicBusy, setAtomicBusy] = useState(false);
  const repo = useRef<LibraryRepository | null>(null);
  const persisted = useRef(library),
    visible = useRef(library);
  const queue = useRef<Promise<void>>(Promise.resolve());
  const pending = useRef(0);
  const blocked = useRef(false);
  const dirty = useRef(false);
  const alive = useRef(true);
  useEffect(() => {
    let cancelled = false;
    let opened: LibraryRepository | undefined;
    alive.current = true;
    (async () => {
      try {
        opened = await LibraryRepository.open();
        if (cancelled) {
          opened.close();
          return;
        }
        let stored = await opened.read();
        if (!stored) {
          const initial = seedLibrary();
          try {
            await opened.save(initial, null);
            stored = initial;
          } catch (e) {
            if (e instanceof StorageConflict) stored = await opened.read();
            else throw e;
          }
        }
        if (!stored) throw new Error("Bibliothèque introuvable.");
        if (stored.librarySchemaVersion !== 3) {
          const upgraded = {
            ...classifyLibrary(stored, seedLibrary().plays),
            revision: stored.revision + 1,
          };
          try {
            await opened.save(upgraded, stored.revision, true);
            stored = upgraded;
          } catch (e) {
            if (!(e instanceof StorageConflict)) throw e;
            const latest = await opened.read();
            if (!latest || latest.librarySchemaVersion !== 3) throw e;
            stored = latest;
          }
        }
        if (!cancelled) {
          repo.current = opened;
          persisted.current = stored;
          visible.current = stored;
          setLibrary(stored);
          setStatus("saved");
        }
      } catch (e) {
        if (!cancelled) {
          blocked.current = true;
          setStatus("error");
          setError(e instanceof Error ? e.message : "Stockage indisponible.");
        }
      }
    })();
    const beforeClose = (event: BeforeUnloadEvent) => {
      if (pending.current || (blocked.current && dirty.current)) {
        event.preventDefault();
        event.returnValue = "";
      }
    };
    addEventListener("beforeunload", beforeClose);
    return () => {
      removeEventListener("beforeunload", beforeClose);
      cancelled = true;
      alive.current = false;
      repo.current = null;
      opened?.close();
    };
  }, []);
  function enqueue(transform: (library: Library) => Library) {
    dirty.current = true;
    const optimistic = transform(visible.current);
    visible.current = optimistic;
    setLibrary(optimistic);
    if (blocked.current || !repo.current) {
      setStatus("error");
      return;
    }
    pending.current++;
    setStatus("saving");
    queue.current = queue.current.then(async () => {
      try {
        if (blocked.current) return;
        const next = transform(persisted.current);
        await repo.current!.save(next, persisted.current.revision);
        persisted.current = next;
      } catch (e) {
        blocked.current = true;
        if (alive.current) {
          setError(e instanceof Error ? e.message : "Échec de sauvegarde.");
          setStatus("error");
        }
      } finally {
        pending.current--;
        if (alive.current && pending.current === 0 && !blocked.current) {
          visible.current = persisted.current;
          dirty.current = false;
          setLibrary(persisted.current);
          setStatus("saved");
        }
      }
    });
  }
  function savePlay(play: Play) {
    enqueue((base) => ({
      ...base,
      revision: base.revision + 1,
      plays: base.plays.some((p) => p.id === play.id)
        ? base.plays.map((p) =>
            p.id === play.id
              ? {
                  ...play,
                  revision: p.revision + 1,
                  updatedAt: new Date().toISOString(),
                }
              : p,
          )
        : [...base.plays, play],
      ...(base.examplePlayIds
        ? { examplePlayIds: base.examplePlayIds.filter((id) => id !== play.id) }
        : {}),
    }));
  }
  function updatePreferences(courtPreview: "half" | "full") {
    enqueue((base) => ({
      ...base,
      revision: base.revision + 1,
      preferences: { ...base.preferences, courtPreview },
    }));
  }
  async function retry() {
    if (pending.current || !repo.current) return;
    setStatus("saving");
    try {
      const next = {
        ...visible.current,
        revision: persisted.current.revision + 1,
      };
      await repo.current.save(next, persisted.current.revision);
      persisted.current = next;
      visible.current = next;
      blocked.current = false;
      dirty.current = false;
      setLibrary(next);
      setStatus("saved");
      setError("");
    } catch (e) {
      setStatus("error");
      setError(e instanceof Error ? e.message : "Stockage indisponible.");
    }
  }
  async function commitLibrary(
    candidate: Library,
    expectedRevision: number,
    preservePrevious = true,
  ) {
    if (
      pending.current ||
      blocked.current ||
      !repo.current ||
      persisted.current.revision !== expectedRevision
    )
      throw new Error(
        "La bibliothèque a changé ou le stockage n’est pas prêt. Rechargez l’aperçu avant de confirmer.",
      );
    pending.current++;
    setAtomicBusy(true);
    setStatus("saving");
    try {
      const next = {
        ...classifyLibrary(candidate, seedLibrary().plays),
        revision: expectedRevision + 1,
      };
      await repo.current.save(next, expectedRevision, preservePrevious);
      persisted.current = next;
      visible.current = next;
      setLibrary(next);
      setStatus("saved");
    } catch (e) {
      setStatus("saved");
      throw e;
    } finally {
      pending.current--;
      setAtomicBusy(false);
    }
  }
  async function readRecovery() {
    if (!repo.current) throw new Error("Stockage indisponible.");
    return repo.current.readRecovery();
  }
  return {
    commitLibrary,
    readRecovery,
    atomicBusy,
    library,
    status,
    error,
    updatePreferences,
    savePlay,
    retry,
    canRetry: !!repo.current,
  };
}
