import { useEffect, useRef, useState } from "react";
import type { Library } from "../model/types";
import { seedLibrary } from "../migration/seed";
import { LibraryRepository, StorageConflict } from "./repository";

export function useLibrary() {
  const [library, setLibrary] = useState<Library>(seedLibrary);
  const [status, setStatus] = useState<
    "loading" | "saved" | "saving" | "error"
  >("loading");
  const [error, setError] = useState("");
  const repo = useRef<LibraryRepository | null>(null);
  const current = useRef(library);
  const busy = useRef(false);
  useEffect(() => {
    let cancelled = false;
    let opened: LibraryRepository | undefined;
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
        if (!cancelled) {
          repo.current = opened;
          current.current = stored;
          setLibrary(stored);
          setStatus("saved");
        }
      } catch (e) {
        if (!cancelled) {
          setStatus("error");
          setError(e instanceof Error ? e.message : "Stockage indisponible.");
        }
      }
    })();
    return () => {
      cancelled = true;
      repo.current = null;
      opened?.close();
    };
  }, []);
  async function updatePreferences(courtPreview: "half" | "full") {
    if (!repo.current || busy.current || status === "error") return;
    busy.current = true;
    setStatus("saving");
    const next = {
      ...current.current,
      revision: current.current.revision + 1,
      preferences: { courtPreview },
    };
    try {
      await repo.current.save(next, current.current.revision);
      current.current = next;
      setLibrary(next);
      setStatus("saved");
    } catch (e) {
      setStatus("error");
      setError(e instanceof Error ? e.message : "Échec de sauvegarde.");
    } finally {
      busy.current = false;
    }
  }
  return { library, status, error, updatePreferences };
}
