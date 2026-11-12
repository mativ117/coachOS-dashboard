import { useMemo, useRef, useState } from "react";
import { sequence, type Play } from "../model/types";
import { PlayDiagram } from "../components/PlayDiagram";
import { usePlayback } from "./usePlayback";
import { useFullscreen } from "./useFullscreen";
export function AnimationPlayer({
  play,
  initialBranch,
  initialStepId,
}: {
  play: Play;
  initialBranch?: string;
  initialStepId?: string;
}) {
  const [branch, setBranch] = useState(
    initialBranch ?? play.branches[0]?.id ?? "common",
  );
  const steps = useMemo(() => sequence(play, branch), [play, branch]);
  const player = usePlayback(
    steps,
    play.court.coordinateSpace === "stack-raw",
    initialStepId,
  );
  const root = useRef<HTMLElement | null>(null);
  const fullscreen = useFullscreen(root);
  const plan = player.plan,
    step = plan?.step;
  const mode = player.reduced
    ? "motion-reduced"
    : !player.engaged
      ? "idle"
      : plan?.animated
        ? "animated"
        : plan?.issues.length
          ? "static-review"
          : "static";
  return (
    <section
      ref={root}
      className={`animation-player ${fullscreen.expanded ? "player-expanded" : ""} ${fullscreen.mode === "fallback" ? "player-fallback" : ""}`}
      role={fullscreen.mode === "fallback" ? "dialog" : "region"}
      aria-modal={fullscreen.mode === "fallback" ? true : undefined}
      aria-label={`Lecture de ${play.name}`}
      tabIndex={0}
      onKeyDown={(e) => {
        if (e.target !== e.currentTarget) return;
        if (e.key === " ") {
          e.preventDefault();
          player.toggle();
        }
        if (e.key === "ArrowRight") player.select(player.index + 1);
        if (e.key === "ArrowLeft") player.select(player.index - 1);
      }}
    >
      <div className="player-header">
        <h2 className={fullscreen.expanded ? "" : "sr-only"}>{play.name}</h2>
        <label>
          Lecture
          <select
            aria-label="Choisir la lecture"
            value={branch}
            onChange={(e) => {
              player.select(0);
              setBranch(e.target.value);
            }}
          >
            <option value="common">Tronc commun</option>
            {play.branches.map((b) => (
              <option key={b.id} value={b.id}>
                {b.name}
              </option>
            ))}
          </select>
        </label>
        <button
          className="fullscreen-toggle"
          onClick={() => {
            void fullscreen.toggle();
          }}
        >
          {fullscreen.expanded ? "Quitter le plein écran" : "Plein écran"}
        </button>
      </div>
      {!step ? (
        <div className="draft-placeholder">
          <h2>Aucune étape à présenter</h2>
          <p>Initialisez ce système dans l’éditeur.</p>
        </div>
      ) : (
        <>
          <div className="player-body">
            <div
              className="playback-court"
              data-playback-mode={mode}
              data-progress={player.time}
            >
              <PlayDiagram play={play} step={step} state={player.state} />
            </div>
            <section
              className="player-notes"
              aria-labelledby="player-instruction"
            >
              <p className="eyebrow">
                ÉTAPE {player.index + 1} / {steps.length}
              </p>
              <h2 id="player-instruction">{step.title}</h2>
              <p className="source-note">
                {step.note || "Aucune consigne pour cette étape."}
              </p>
              {player.reduced ? (
                <p className="playback-notice" role="status">
                  Mouvements réduits : navigation manuelle, sans animation.
                </p>
              ) : plan.issues.length ? (
                <details className="playback-review">
                  <summary>Étape statique · à confirmer</summary>
                  <ul>
                    {plan.issues.map((issue) => (
                      <li key={issue}>{issue}</li>
                    ))}
                  </ul>
                  <p>
                    Les positions et les tracés restent ceux de l’étape.
                    L’éditeur permet de préciser les acteurs, la possession et
                    l’ordre.
                  </p>
                </details>
              ) : (
                <p className="playback-status" role="status">
                  {player.playing
                    ? "Lecture en cours"
                    : player.engaged
                      ? "En pause"
                      : "Prêt à lire"}{" "}
                  · {plan.animated ? "Trajets renseignés" : "Pose statique"}
                </p>
              )}
              <p className="playback-tempo">
                {step.timing ? "Durée réglée" : "Tempo de démonstration"} ·{" "}
                {(plan.duration / 1000).toFixed(1)} s à vitesse normale
              </p>
            </section>
          </div>
          <div className="playback-controls" aria-label="Commandes de lecture">
            <button
              disabled={player.index === 0}
              onClick={() => player.select(player.index - 1)}
            >
              ← Précédente
            </button>
            <button
              className="button-primary play-toggle"
              disabled={player.reduced}
              onClick={player.toggle}
            >
              {player.playing ? "Pause" : "Lire"}
            </button>
            <button
              disabled={player.index === steps.length - 1}
              onClick={() => player.select(player.index + 1)}
            >
              Suivante →
            </button>
            <button onClick={player.restart}>Recommencer</button>
            <label>
              Vitesse
              <select
                aria-label="Vitesse de lecture"
                value={player.speed}
                onChange={(e) => player.setSpeed(Number(e.target.value))}
              >
                {[0.25, 0.5, 1, 1.5, 2, 3].map((speed) => (
                  <option key={speed} value={speed}>
                    ×{speed}
                  </option>
                ))}
              </select>
            </label>
          </div>
          <div className="playback-seek">
            <label className="player-step-select">
              <span className="sr-only">Étape</span>
              <select
                aria-label="Choisir l’étape"
                value={player.index}
                onChange={(e) => player.select(Number(e.target.value))}
              >
                {steps.map((s, i) => (
                  <option key={s.id} value={i}>
                    {i + 1}. {s.title}
                  </option>
                ))}
              </select>
            </label>
            <label className="player-progress">
              <span className="sr-only">Progression de l’étape</span>
              <input
                aria-label="Progression de l’étape"
                type="range"
                min="0"
                max={plan.duration}
                step="1"
                value={Math.min(player.time, plan.duration)}
                disabled={player.reduced}
                onChange={(e) => player.scrub(Number(e.target.value))}
              />
            </label>
          </div>
          <details className="player-help">
            <summary>Repères de lecture</summary>
            <p>
              Les passes dessinées restent optionnelles. Seule une passe validée
              transfère le ballon pendant l’animation. Une étape ambiguë est
              affichée statiquement. Les durées par défaut sont un tempo de
              démonstration, réglable dans l’éditeur. Espace pour lire ou mettre
              en pause, flèches pour changer d’étape quand le lecteur a le
              focus. Changer d’onglet met la lecture en pause.
            </p>
            {play.metadata.guidance && (
              <p className="source-note">{play.metadata.guidance}</p>
            )}
          </details>
        </>
      )}
    </section>
  );
}
