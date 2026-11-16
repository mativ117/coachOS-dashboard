import { t } from "../i18n";
import type { Library, Play } from "../model/types";
import {
  parseBoundedJson,
  record,
  validateLibrary,
  validatePlay,
} from "../model/validate";
export type Incoming =
  | { kind: "play"; play: Play; legacy: boolean }
  | { kind: "backup"; library: Library; legacy: boolean };
export const MAX_FILE_SIZE = 4_000_000;
function date(value: unknown) {
  if (
    typeof value !== "string" ||
    !/^\d{4}-\d\d-\d\dT\d\d:\d\d:\d\d\.\d{3}Z$/.test(value) ||
    !Number.isFinite(Date.parse(value))
  )
    throw new Error("Date de fichier invalide.");
}
export function parseFile(raw: string): Incoming {
  const data = parseBoundedJson(raw);
  if (!data || typeof data !== "object" || Array.isArray(data))
    throw new Error("Fichier CoachOS attendu.");
  const obj = data as Record<string, unknown>;
  if (obj.format === "coachos-play") {
    record(obj, ["format", "fileSchemaVersion", "exportedAt", "play"]);
    if (obj.fileSchemaVersion !== 1)
      throw new Error(t("Version de fichier système inconnue."));
    date(obj.exportedAt);
    return { kind: "play", play: validatePlay(obj.play), legacy: false };
  }
  if (obj.format === "coachos-library") {
    record(obj, ["format", "backupSchemaVersion", "exportedAt", "library"]);
    if (obj.backupSchemaVersion !== 1)
      throw new Error("Version de sauvegarde inconnue.");
    date(obj.exportedAt);
    return {
      kind: "backup",
      library: validateLibrary(obj.library),
      legacy: false,
    };
  }
  if (obj.librarySchemaVersion !== undefined)
    return { kind: "backup", library: validateLibrary(obj), legacy: true };
  if (obj.schemaVersion !== undefined)
    return { kind: "play", play: validatePlay(obj), legacy: true };
  throw new Error(
    "Format non reconnu. Choisissez un fichier .coachos ou une sauvegarde CoachOS.",
  );
}
export function playFile(play: Play): string {
  const raw = JSON.stringify(
    {
      format: "coachos-play",
      fileSchemaVersion: 1,
      exportedAt: new Date().toISOString(),
      play: validatePlay(play),
    },
    null,
    2,
  );
  parseFile(raw);
  return raw;
}
export function backupFile(library: Library): string {
  const raw = JSON.stringify(
    {
      format: "coachos-library",
      backupSchemaVersion: 1,
      exportedAt: new Date().toISOString(),
      library: validateLibrary(library),
    },
    null,
    2,
  );
  parseFile(raw);
  return raw;
}
export const safeName = (name: string) =>
  name
    .normalize("NFKD")
    .replace(/[\u0300-\u036f]/g, "")
    .replace(/[^a-zA-Z0-9_-]+/g, "-")
    .replace(/^-+|-+$/g, "")
    .slice(0, 80) || "coachos";
export function textFile(raw: string, name: string): File {
  return new File([raw], name, { type: "application/json" });
}
export function downloadFile(file: File) {
  const url = URL.createObjectURL(file);
  const a = document.createElement("a");
  a.href = url;
  a.download = file.name;
  document.body.append(a);
  a.click();
  a.remove();
  setTimeout(() => URL.revokeObjectURL(url), 1000);
}
export async function shareOrDownload(file: File): Promise<string> {
  if (navigator.share && navigator.canShare?.({ files: [file] })) {
    try {
      await navigator.share({ files: [file], title: file.name });
      return t("Partage ouvert.");
    } catch (e) {
      if (e instanceof DOMException && e.name === "AbortError")
        return t("Partage annulé.");
    }
  }
  downloadFile(file);
  return t("Fichier téléchargé : partagez-le depuis vos fichiers.");
}
