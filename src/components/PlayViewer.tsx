import { useState } from "react";
import { sequence, type Play } from "../model/types";
import { Court, type CourtKind } from "./Court";
import { PlayDiagram } from "./PlayDiagram";

export function PlayViewer({
  play,
  court,
  onCourt,
  presentation,
  saving,
}: {
  play: Play;
  court: CourtKind;
  onCourt: (kind: CourtKind) => void;
  presentation: boolean;
  saving: boolean;
}) {
  const [branch, setBranch] = useState(play.branches[0]?.id ?? "");
  const [index, setIndex] = useState(0);
  const steps = sequence(play, branch);
  const step = steps[index] ?? steps[0];
  const report = play.metadata.report;
  return (
    <>
      <div className="notice">
        <span className="notice-icon" aria-hidden="true">
          i
        </span>
        <p>
          {play.status === "draft" ? (
            <>
              <strong>Brouillon à définir.</strong> Aucun déplacement n’est
              fourni pour ce système.
            </>
          ) : play.court.coordinateSpace === "stack-raw" ? (
            <>
              <strong>Coordonnées source Stack.</strong> Les six étapes et 24
              tracés sont conservés. Acteurs, porteur et dimensions restent à
              confirmer ; aucun terrain n’est superposé.
            </>
          ) : (
            <>
              <strong>Lecture des sources.</strong> Étapes, lectures et
              possession explicite sont conservées. Les passes dessinées restent
              des options. L’édition et l’animation arrivent aux prochaines
              phases.
            </>
          )}
        </p>
      </div>
      {play.branches.length > 0 && (
        <label className="branch-choice">
          Lecture
          <select
            aria-label="Choisir la lecture"
            value={branch}
            onChange={(e) => {
              setBranch(e.target.value);
              setIndex(0);
            }}
          >
            {play.branches.map((b) => (
              <option key={b.id} value={b.id}>
                {b.name}
              </option>
            ))}
          </select>
          <span>Tronc commun de {play.commonSteps.length} étapes</span>
        </label>
      )}
      <section
        className="court-panel"
        aria-label={
          presentation ? "Lecture en présentation" : "Lecture du système"
        }
      >
        <div className="court-toolbar">
          <div>
            <span className="status-dot" />
            <strong>
              {presentation ? "Présentation" : "Étapes du système"}
            </strong>
          </div>
          <fieldset className="segmented" disabled={saving}>
            <legend className="sr-only">Affichage du terrain</legend>
            <button
              aria-pressed={court === "half"}
              onClick={() => onCourt("half")}
            >
              Vue source
            </button>
            <button
              aria-pressed={court === "full"}
              onClick={() => onCourt("full")}
            >
              Gabarit entier
            </button>
          </fieldset>
        </div>
        {court === "full" && (
          <p className="template-notice">
            Gabarit 15 × 28 m uniquement. Les coordonnées du play ne sont pas
            converties et aucun déplacement n’est affiché ici.
          </p>
        )}
        <div className={`court-stage ${court === "full" ? "full-court" : ""}`}>
          {court === "full" ? (
            <Court kind="full" />
          ) : step ? (
            <PlayDiagram play={play} step={step} />
          ) : (
            <div className="draft-placeholder">
              <h2>Le jeu commence ici</h2>
              <p>Ce brouillon attend ses premières étapes.</p>
            </div>
          )}
        </div>
        <div className="court-caption">
          <span>
            {court === "full"
              ? "Gabarit de terrain"
              : play.court.coordinateSpace === "stack-raw"
                ? "Repère source · dimensions à confirmer"
                : "Repère historique · 750 × 655"}
          </span>
          <span>
            {step ? `${index + 1} / ${steps.length}` : "Aucune étape"}
          </span>
        </div>
      </section>
      {step && (
        <>
          <div className="step-controls">
            <button
              disabled={index === 0}
              onClick={() => setIndex((i) => i - 1)}
            >
              ← Précédente
            </button>
            <label>
              Étape
              <select
                aria-label="Choisir l’étape"
                value={index}
                onChange={(e) => setIndex(Number(e.target.value))}
              >
                {steps.map((s, i) => (
                  <option key={s.id} value={i}>
                    {i + 1}. {s.title}
                  </option>
                ))}
              </select>
            </label>
            <button
              disabled={index >= steps.length - 1}
              onClick={() => setIndex((i) => i + 1)}
            >
              Suivante →
            </button>
          </div>
          <section
            className="instruction-panel"
            aria-labelledby="instruction-heading"
          >
            <span className="step-number" aria-hidden="true">
              {String(index + 1).padStart(2, "0")}
            </span>
            <div>
              <p className="eyebrow">INSTRUCTION SOURCE</p>
              <h2 id="instruction-heading">{step.title}</h2>
              <p className="source-note">{step.note}</p>
              {step.flags.length > 0 && (
                <ul className="flags">
                  {step.flags.map((flag) => (
                    <li key={flag}>{flag}</li>
                  ))}
                </ul>
              )}
            </div>
          </section>
          {play.metadata.guidance && (
            <p className="guidance">{play.metadata.guidance}</p>
          )}
          <p className="diagram-legend">
            Bleu : déplacement · Ambre : cut · Pointillés : passe optionnelle ·
            Barre : écran
          </p>
        </>
      )}
      <details className="migration-report">
        <summary>
          Rapport de migration · {report.steps} étapes · {report.actions}{" "}
          actions
        </summary>
        <p>
          {report.branches} lecture{report.branches > 1 ? "s" : ""} alternative
          {report.branches > 1 ? "s" : ""} · Source :{" "}
          {report.source === "historical"
            ? "Playbook historique"
            : report.source === "stack"
              ? "Stack V2"
              : "Brouillon"}
        </p>
        <ul>
          {report.issues.map((issue) => (
            <li key={issue}>{issue}</li>
          ))}
        </ul>
      </details>
    </>
  );
}
