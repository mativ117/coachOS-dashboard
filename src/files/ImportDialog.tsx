import { t } from "../i18n";
import { useEffect, useRef, useState } from "react";
import type { Library } from "../model/types";
import type { Incoming } from "./formats";
import { buildImport, importRows, type Choice } from "./import-plan";
export type CommitLibrary = (
  next: Library,
  revision: number,
  preservePrevious?: boolean,
) => Promise<void>;
export function ImportDialog({
  library,
  incoming,
  onCommit,
  onClose,
  recovery = false,
}: {
  library: Library;
  incoming: Incoming;
  onCommit: CommitLibrary;
  onClose: () => void;
  recovery?: boolean;
}) {
  const dialog = useRef<HTMLDialogElement>(null);
  const base = useRef(structuredClone(library));
  const [choices, setChoices] = useState<Record<string, Choice>>({});
  const [mode, setMode] = useState<"merge" | "restore">(
    recovery ? "restore" : "merge",
  );
  const [settings, setSettings] = useState(false);
  const [confirmed, setConfirmed] = useState(false);
  const [busy, setBusy] = useState(false);
  const [error, setError] = useState("");
  useEffect(() => {
    dialog.current?.showModal();
    return () => dialog.current?.close();
  }, []);
  const rows = importRows(base.current, incoming);
  const source = incoming.kind === "backup" ? incoming.library : undefined;
  const conflicts = rows.some(
    (r) =>
      r.status === "conflict" &&
      (!choices[r.play.id] || choices[r.play.id] === "cancel"),
  );
  const unchanged = incoming.kind === "play" && rows[0].status === "identical";
  const allowed = mode === "restore" ? confirmed : !conflicts && !unchanged;
  async function apply() {
    setBusy(true);
    setError("");
    try {
      const next = buildImport(base.current, incoming, choices, mode, settings);
      await onCommit(next, base.current.revision, true);
      onClose();
    } catch (e) {
      setError(e instanceof Error ? e.message : "Import impossible.");
    } finally {
      setBusy(false);
    }
  }
  return (
    <dialog
      className="import-dialog"
      ref={dialog}
      aria-labelledby="import-title"
      onCancel={(e) => {
        e.preventDefault();
        if (!busy) onClose();
      }}
    >
      <div className="import-dialog-content">
        <h2 id="import-title">
          {recovery
            ? t("Récupérer l’état précédent")
            : t("Aperçu avant importation")}
        </h2>
        <p>
          {t(
            "Aucune donnée n’est modifiée avant confirmation. Un état précédent est conservé lors de l’opération.",
          )}
        </p>
        {incoming.legacy && (
          <p className="notice">
            {t("Ancien fichier JSON reconnu et validé.")}
          </p>
        )}
        {source && (
          <label>
            {t("Opération")}
            <select
              aria-label={t("Mode d’importation")}
              disabled={busy}
              value={mode}
              onChange={(e) => {
                setMode(e.target.value as "merge" | "restore");
                setConfirmed(false);
              }}
            >
              <option value="merge">
                {t("Fusionner avec ma bibliothèque")}
              </option>
              <option value="restore">
                {t("Restaurer toute la bibliothèque")}
              </option>
            </select>
          </label>
        )}
        {mode === "restore" && source ? (
          <div className="restore-summary">
            <p>
              <strong>
                {base.current.plays.length} {t("systèmes actuels →")}{" "}
                {source.plays.length} {t("systèmes du fichier.")}
              </strong>
            </p>
            <p>
              {source.collections.length} {t("collections ; profil :")}{" "}
              {source.profile?.team || source.profile?.coachName || t("absent")}{" "}
              {t("; préférences d’export restaurées.")}
            </p>
            <p>
              {
                base.current.plays.filter(
                  (p) => !source.plays.some((s) => s.id === p.id),
                ).length
              }{" "}
              {t(
                "systèmes actuels seront retirés. L’ensemble sera remplaçable par l’état précédent.",
              )}
            </p>
            <label className="checkbox-label">
              <input
                type="checkbox"
                checked={confirmed}
                disabled={busy}
                onChange={(e) => setConfirmed(e.target.checked)}
              />
              {t("J’ai vérifié l’aperçu : remplacer toute la bibliothèque.")}
            </label>
          </div>
        ) : (
          <>
            <ul className="import-rows">
              {rows.map((row) => (
                <li key={row.play.id}>
                  <div>
                    <strong>{row.play.name}</strong>
                    <small>
                      {t("Fichier : révision ")}
                      {row.play.revision}
                      {t(",")}{" "}
                      {new Date(row.play.updatedAt).toLocaleDateString(t("fr"))}{" "}
                      {t("· schéma ")}
                      {row.play.schemaVersion}
                      {row.existing
                        ? t(" / actuel : révision {0}", row.existing.revision)
                        : ""}
                    </small>
                    <span>
                      {row.status === "new"
                        ? t("Nouveau système")
                        : row.status === "identical"
                          ? t("Déjà identique : aucun remplacement")
                          : t("Conflit à résoudre")}
                    </span>
                    {row.internalCollision && (
                      <span>
                        {t(
                          "Identifiants internes déjà utilisés : une copie est nécessaire.",
                        )}
                      </span>
                    )}
                    {row.existing &&
                      row.play.revision < row.existing.revision && (
                        <span>
                          {t(
                            "Attention : la révision du fichier est antérieure à la version actuelle.",
                          )}
                        </span>
                      )}
                  </div>
                  {row.status === "conflict" && (
                    <label>
                      {t("Décision")}
                      <select
                        aria-label={t("Décision pour {0}", row.play.name)}
                        disabled={busy}
                        value={choices[row.play.id] ?? "cancel"}
                        onChange={(e) =>
                          setChoices((c) => ({
                            ...c,
                            [row.play.id]: e.target.value as Choice,
                          }))
                        }
                      >
                        <option value="cancel">
                          {t("Annuler / ne pas confirmer")}
                        </option>
                        <option
                          value="replace"
                          disabled={row.internalCollision}
                        >
                          {t("Remplacer")}
                        </option>
                        <option value="copy">{t("Conserver les deux")}</option>
                      </select>
                    </label>
                  )}
                </li>
              ))}
            </ul>
            {source && (
              <>
                <p>
                  {source.collections.length}{" "}
                  {t(
                    "collections seront ajoutées ou complétées par références, sans dupliquer les systèmes.",
                  )}
                </p>
                <label className="checkbox-label">
                  <input
                    type="checkbox"
                    checked={settings}
                    disabled={busy}
                    onChange={(e) => setSettings(e.target.checked)}
                  />
                  {t(
                    "Importer aussi le profil présent et les préférences du fichier",
                  )}
                </label>
              </>
            )}
          </>
        )}
        {error && (
          <p role="alert" className="editor-error">
            {t(error)}
          </p>
        )}
        <div className="dialog-actions">
          <button disabled={busy} onClick={onClose}>
            {t("Annuler")}
          </button>
          <button
            className="button-primary"
            disabled={!allowed || busy}
            onClick={() => {
              void apply();
            }}
          >
            {busy
              ? t("Enregistrement…")
              : mode === "restore"
                ? t("Restaurer cette sauvegarde")
                : t("Confirmer l’importation")}
          </button>
        </div>
      </div>
    </dialog>
  );
}
