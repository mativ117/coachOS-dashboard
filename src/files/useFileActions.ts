import { useRef, useState } from "react";
import type { Library, Play } from "../model/types";
import {
  backupFile,
  downloadFile,
  playFile,
  safeName,
  shareOrDownload,
  textFile,
} from "./formats";
import type { ExportStage } from "./graphics";
export function useFileActions(library: Library) {
  const [error, setError] = useState("");
  const [busy, setBusy] = useState(false);
  const [progress, setProgress] = useState("");
  const [result, setResult] = useState<File | null>(null);
  const [message, setMessage] = useState("");
  const abort = useRef<AbortController | null>(null);
  function deliver(file: File) {
    setResult(file);
    downloadFile(file);
    setMessage(`${file.name} téléchargé.`);
  }
  function system(play: Play) {
    try {
      setError("");
      deliver(textFile(playFile(play), `${safeName(play.name)}.coachos`));
    } catch (e) {
      setError((e as Error).message);
    }
  }
  function backup() {
    try {
      setError("");
      deliver(
        textFile(backupFile(library), "coachos-bibliotheque.coachos-backup"),
      );
    } catch (e) {
      setError((e as Error).message);
    }
  }
  async function graphics(kind: "png" | "pdf", value: ExportStage | Play[]) {
    if (busy) return;
    setBusy(true);
    setError("");
    setProgress("Préparation du fichier…");
    abort.current = new AbortController();
    try {
      const exporter = await import("./graphics");
      const snapshot = structuredClone(library);
      const file =
        kind === "png"
          ? await exporter.exportPng(
              structuredClone(value as ExportStage),
              snapshot,
            )
          : await exporter.exportPdf(
              structuredClone(value as Play[]),
              snapshot,
              (i, n) => setProgress(`PDF : ${i} / ${n} étapes`),
              abort.current.signal,
            );
      if (!abort.current.signal.aborted) deliver(file);
    } catch (e) {
      if (e instanceof Error && e.name === "AbortError")
        setMessage("Export annulé.");
      else setError(e instanceof Error ? e.message : "Export impossible.");
    } finally {
      setBusy(false);
      setProgress("");
    }
  }
  async function share() {
    if (!result) return;
    setMessage(await shareOrDownload(result));
  }
  return {
    error,
    setError,
    busy,
    progress,
    result,
    message,
    setMessage,
    system,
    backup,
    graphics,
    share,
    download: () => result && downloadFile(result),
    cancel: () => {
      abort.current?.abort();
      setMessage("Export annulé.");
    },
  };
}
