import { t } from "../i18n";
import { useEffect, useId, useRef, useState } from "react";
import type { Library, Play, Step } from "../model/types";
import { useFileActions } from "./useFileActions";
import { currentStage } from "./currentStage";

export function ExportControl({
  library,
  play,
  step,
  label,
  onOpen,
}: {
  library: Library;
  play: Play;
  step?: Step;
  label?: string;
  onOpen?: () => void;
}) {
  const io = useFileActions(library),
    dialog = useRef<HTMLDialogElement>(null),
    title = useId();
  const [open, setOpen] = useState(false);
  const [snapshot, setSnapshot] = useState(() => ({
    play,
    stage: currentStage(play, step),
  }));
  useEffect(() => {
    if (open && !dialog.current?.open) dialog.current?.showModal();
  }, [open]);
  function show() {
    onOpen?.();
    setSnapshot({
      play: structuredClone(play),
      stage: currentStage(play, step)
        ? structuredClone(currentStage(play, step))
        : undefined,
    });
    io.clearResult();
    io.setError("");
    io.setMessage("");
    setOpen(true);
  }
  return (
    <>
      <button className="export-entry" aria-label={label} onClick={show}>
        {t("Exporter")}
      </button>
      {open && (
        <dialog
          ref={dialog}
          className="export-dialog"
          aria-labelledby={title}
          onClose={() => {
            if (io.busy) io.cancel();
            setOpen(false);
          }}
          onClick={(e) => {
            if (e.target === e.currentTarget) dialog.current?.close();
          }}
        >
          <div className="export-dialog-heading">
            <h2 id={title}>
              {t("Exporter ")}
              {snapshot.play.name}
            </h2>
            <button
              aria-label={t("Fermer l’export")}
              onClick={() => dialog.current?.close()}
            >
              {t("×")}
            </button>
          </div>
          <p>
            {t("Le play complet : toutes ses étapes et toutes ses lectures.")}
          </p>
          <div className="export-choices">
            <button
              disabled={io.busy}
              onClick={() => {
                void io.graphics("pdf", [snapshot.play]);
              }}
            >
              <strong>{t("PDF du système")}</strong>
              <span>
                {t(
                  "Un document avec tous les visuels et de courtes consignes.",
                )}
              </span>
            </button>
            <button
              disabled={io.busy}
              onClick={() => {
                void io.graphics("images", [snapshot.play]);
              }}
            >
              <strong>{t("Tous les visuels PNG (.zip)")}</strong>
              <span>
                {t(
                  "Une image par étape, lectures incluses, dans un seul dossier à décompresser.",
                )}
              </span>
            </button>
          </div>
          <p>
            {t(
              "{0} étapes communes · {1} lectures · {2} étapes au total",
              snapshot.play.commonSteps.length,
              snapshot.play.branches.length,
              snapshot.play.commonSteps.length +
                snapshot.play.branches.reduce((n, b) => n + b.steps.length, 0),
            )}
          </p>
          {snapshot.stage && (
            <details className="export-editable">
              <summary>{t("Seulement l’étape affichée")}</summary>
              <p>{snapshot.stage.step?.title}</p>
              <button
                disabled={io.busy}
                onClick={() => {
                  if (snapshot.stage) void io.graphics("png", snapshot.stage);
                }}
              >
                {t("Télécharger cette étape en PNG")}
              </button>
            </details>
          )}
          {io.busy && (
            <div role="status" className="file-progress">
              {t(io.progress)}
              <button onClick={io.cancel}>{t("Annuler la préparation")}</button>
            </div>
          )}
          {io.error && (
            <p role="alert" className="editor-error">
              {t(io.error)}
            </p>
          )}
          {io.message && (
            <p role="status" className="file-message">
              {t(io.message)}
            </p>
          )}
          {io.result && (
            <div className="export-ready">
              <strong>{t("Votre fichier est prêt.")}</strong>
              <p>{io.result.name}</p>
              <button disabled={io.busy} onClick={io.download}>
                {t("Télécharger à nouveau")}
              </button>
              <button
                disabled={io.busy}
                onClick={() => {
                  void io.share();
                }}
              >
                {t("Partager le fichier")}
              </button>
            </div>
          )}
          <p className="export-location">
            {t(
              "Le fichier est envoyé aux téléchargements de votre navigateur. Sur téléphone, « Partager le fichier » permet aussi de l’enregistrer ou de l’envoyer.",
            )}
          </p>
          <details className="export-editable">
            <summary>{t("Garder un système modifiable dans CoachOS")}</summary>
            <p>
              {t(
                "Le fichier .coachos permet de réimporter et modifier ce système. Une image ou un PDF sert à le montrer.",
              )}
            </p>
            <button disabled={io.busy} onClick={() => io.system(snapshot.play)}>
              {t("Télécharger le fichier modifiable")}
            </button>
          </details>
        </dialog>
      )}
    </>
  );
}
