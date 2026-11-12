import { AnimationPlayer } from "../animation/AnimationPlayer";
import { compileStep } from "../animation/engine";
import { useEffect, useRef, useState } from "react";
import {
  sequence,
  type Action,
  type BallState,
  type Play,
  type Point,
} from "../model/types";
import { EditorCanvas, type Selection, type Tool } from "./EditorCanvas";
import * as commands from "./commands";
import { downloadEmergency } from "../import-export/emergency";
import type { Library } from "../model/types";

const tools: { id: Tool; name: string; hint: string }[] = [
  {
    id: "select",
    name: "Sélection",
    hint: "Sélectionnez un joueur puis son arrivée, ou glissez-le. Réglez aussi les coordonnées dans Sélection.",
  },
  {
    id: "run",
    name: "Course",
    hint: "Deux appuis : joueur au départ, puis arrivée. Un tracé libre reste sans acteur.",
  },
  {
    id: "curve",
    name: "Courbe",
    hint: "Trois appuis : départ, point de courbure, arrivée.",
  },
  {
    id: "pass",
    name: "Passe",
    hint: "Appuyez sur le passeur puis le destinataire. La passe reste optionnelle jusqu’à validation.",
  },
  {
    id: "screen",
    name: "Écran",
    hint: "Deux appuis : départ du poseur, puis emplacement de l’écran. La barre T est ajoutée.",
  },
  {
    id: "screen-curve",
    name: "Écran courbe",
    hint: "Trois appuis : départ du poseur, courbure, emplacement de l’écran.",
  },
  {
    id: "erase",
    name: "Effacer",
    hint: "Appuyez sur un tracé pour l’effacer. Les positions restent conservées. Annuler rétablit le tracé.",
  },
  {
    id: "annotation",
    name: "Annotation",
    hint: "Saisissez le texte dans Sélection, puis appuyez sur le terrain.",
  },
];
const actionNames: Record<Action["kind"], string> = {
  run: "Course",
  cut: "Cut",
  pass: "Passe",
  screen: "Écran",
  annotation: "Annotation",
};
export function Editor({
  play,
  onSave,
  library,
  loading = false,
}: {
  play: Play;
  onSave: (play: Play) => void;
  library: Library;
  loading?: boolean;
}) {
  const [history, setHistory] = useState<{
    past: Play[];
    present: Play;
    future: Play[];
  }>({ past: [], present: play, future: [] });
  const hist = useRef(history);
  const [scope, setScope] = useState(play.branches[0]?.id ?? "common");
  const [stepId, setStepId] = useState(sequence(play, scope)[0]?.id ?? "");
  const [preview, setPreview] = useState(false);
  const [tool, setTool] = useState<Tool>("select");
  const [selected, setSelected] = useState<Selection>(null);
  const [error, setError] = useState("");
  const [annotation, setAnnotation] = useState("");
  const group = useRef({ key: "", at: 0 });
  const draft = history.present;
  const steps = sequence(draft, scope);
  const step = steps.find((s) => s.id === stepId) ?? steps[0];
  const index = step ? steps.indexOf(step) : 0;
  const report = draft.metadata.originalReport ?? draft.metadata.report;
  function apply(next: Play, groupKey = "") {
    const current = hist.current;
    const merge =
      !!groupKey &&
      group.current.key === groupKey &&
      Date.now() - group.current.at < 800;
    const updated = {
      past: merge
        ? current.past
        : [...current.past, current.present].slice(-50),
      present: next,
      future: [],
    };
    group.current = { key: groupKey, at: Date.now() };
    hist.current = updated;
    setHistory(updated);
    setError("");
    onSave(next);
  }
  function run(fn: () => Play, groupKey = "") {
    try {
      apply(fn(), groupKey);
    } catch (e) {
      setError(e instanceof Error ? e.message : "Modification impossible.");
    }
  }
  function travel(redo = false) {
    const h = hist.current;
    const next = redo ? h.future[0] : h.past.at(-1);
    if (!next) return;
    const updated = redo
      ? {
          past: [...h.past, h.present],
          present: next,
          future: h.future.slice(1),
        }
      : {
          past: h.past.slice(0, -1),
          present: next,
          future: [h.present, ...h.future],
        };
    hist.current = updated;
    setHistory(updated);
    group.current.key = "";
    setSelected(null);
    setError("");
    onSave(next);
  }
  useEffect(() => {
    const key = (e: KeyboardEvent) => {
      const target = e.target as HTMLElement;
      if (target.closest("input, textarea, select, [contenteditable=true]"))
        return;
      if ((e.ctrlKey || e.metaKey) && e.key.toLowerCase() === "z") {
        e.preventDefault();
        travel(e.shiftKey);
      }
    };
    addEventListener("keydown", key);
    return () => removeEventListener("keydown", key);
  });
  function draw(t: Tool, points: Point[], actor?: string, recipient?: string) {
    if (!step) return;
    try {
      const result = commands.addAction(
        draft,
        step.id,
        t === "pass" ? "pass" : t.startsWith("screen") ? "screen" : "run",
        points,
        actor,
        t === "pass" ? recipient : undefined,
        t === "curve" || t === "screen-curve",
      );
      apply(result.play);
      setSelected({
        kind: "action",
        id: result.actionId,
        point: Math.floor(points.length / 2),
      });
      setTool("select");
    } catch (e) {
      setError(e instanceof Error ? e.message : "Tracé impossible.");
    }
  }
  const action =
    selected?.kind === "action"
      ? step?.actions.find((a) => a.id === selected.id)
      : undefined;
  const position =
    selected?.kind === "player"
      ? step?.afterState.players[selected.id]
      : selected?.kind === "defender"
        ? step?.afterState.defenders?.[selected.id]
        : selected?.kind === "action"
          ? action?.geometry.points[selected.point]
          : selected?.kind === "ball" && step?.afterState.ball?.mode === "free"
            ? step.afterState.ball.position
            : undefined;
  const ballValue = (ball: BallState) =>
    ball?.mode === "attached"
      ? ball.carrierId
      : ball?.mode === "free"
        ? "free"
        : "unknown";
  const ballFrom = (value: string): BallState =>
    value === "unknown"
      ? null
      : value === "free"
        ? {
            mode: "free",
            position:
              draft.court.coordinateSpace === "stack-raw"
                ? [180, 160]
                : [375, 350],
          }
        : { mode: "attached", carrierId: value };
  const movePoint = (point: Point) => {
    if (!step || !selected) return;
    if (selected.kind === "action")
      run(() =>
        commands.editPoint(draft, step.id, selected.id, selected.point, point),
      );
    else if (selected.kind === "ball")
      run(() =>
        commands.setBall(draft, step.id, { mode: "free", position: point }),
      );
    else
      run(() =>
        commands.movePlayer(
          draft,
          step.id,
          selected.id,
          point,
          selected.kind === "defender",
        ),
      );
  };
  if (preview)
    return (
      <section className="editor editor-preview">
        <button className="return-to-edit" onClick={() => setPreview(false)}>
          Revenir à l’édition
        </button>
        <AnimationPlayer
          play={draft}
          initialBranch={scope}
          initialStepId={step?.id}
        />
      </section>
    );
  return (
    <section className="editor" aria-label="Éditeur de système">
      <div className="editor-commandbar">
        <div className="undo-group">
          <button
            disabled={!history.past.length || loading}
            onClick={() => travel()}
            title="Ctrl/Cmd Z"
          >
            ↶ Annuler
          </button>
          <button
            disabled={!history.future.length || loading}
            onClick={() => travel(true)}
            title="Ctrl/Cmd Maj Z"
          >
            ↷ Rétablir
          </button>
        </div>
        <label className="court-kind">
          Terrain
          <select
            aria-label="Format du play"
            value={draft.court.kind}
            disabled={draft.court.coordinateSpace === "stack-raw" || loading}
            onChange={(e) =>
              run(() =>
                commands.changePlay(draft, (p) => {
                  p.court.kind = e.target.value as "half" | "full";
                }),
              )
            }
          >
            <option value="half">Demi-terrain</option>
            <option value="full">Terrain entier</option>
          </select>
        </label>
        <button disabled={!step || loading} onClick={() => setPreview(true)}>
          Aperçu animé
        </button>
        <details className="editor-help">
          <summary>Aide</summary>
          <p>
            Vos modifications sont enregistrées automatiquement. Les notes et
            réglages sont repliables. Ctrl/Cmd Z annule, Ctrl/Cmd Maj Z
            rétablit. Le glisser-déposer est facultatif : sélectionnez puis
            appuyez à l’arrivée.
          </p>
          <button
            onClick={() =>
              downloadEmergency({
                ...library,
                plays: library.plays.map((p) =>
                  p.id === draft.id ? draft : p,
                ),
              })
            }
          >
            Copie de secours JSON
          </button>
        </details>
      </div>
      {error && (
        <p className="editor-error" role="alert">
          {error}
        </p>
      )}
      {!step ? (
        <div className="draft-placeholder">
          <h2>Construisez votre première étape</h2>
          <p>Ajoutez les cinq joueurs, puis placez-les à votre façon.</p>
          <button
            className="button-primary"
            disabled={loading}
            onClick={() => run(() => commands.initialize(draft))}
          >
            Initialiser 5 joueurs
          </button>
        </div>
      ) : (
        <>
          <div
            className="drawing-tools"
            role="toolbar"
            aria-label="Outils de dessin"
          >
            {tools.map((t) => (
              <button
                key={t.id}
                aria-pressed={tool === t.id}
                disabled={loading}
                onClick={() => setTool(t.id)}
              >
                {t.name}
              </button>
            ))}
          </div>
          <p className="tool-hint" role="status">
            {tools.find((t) => t.id === tool)!.hint}
          </p>
          {draft.commonSteps.some((s) => s.id === step.id) &&
            draft.branches.length > 0 && (
              <p className="shared-hint">
                Étape commune : les états hérités et les départs des lectures
                dépendantes seront mis à jour. Les destinations explicites sont
                conservées.
              </p>
            )}
          {draft.court.coordinateSpace === "stack-raw" && (
            <p className="shared-hint">
              Stack : repère source sans terrain superposé. Associez
              explicitement les acteurs dans Sélection ; les dimensions restent
              à confirmer.
            </p>
          )}
          <EditorCanvas
            key={`${step.id}:${tool}`}
            play={draft}
            step={step}
            tool={tool}
            selected={selected}
            onSelect={setSelected}
            disabled={loading}
            onMove={(id, p, defender) =>
              run(() => commands.movePlayer(draft, step.id, id, p, defender))
            }
            onPoint={(id, i, p) =>
              run(() => commands.editPoint(draft, step.id, id, i, p))
            }
            onDraw={draw}
            onErase={(id) => {
              run(() =>
                commands.changeStep(draft, step.id, (s) => {
                  s.actions = s.actions.filter((a) => a.id !== id);
                }),
              );
              setSelected(null);
            }}
            onFreeBall={(p) =>
              run(() =>
                commands.setBall(draft, step.id, { mode: "free", position: p }),
              )
            }
            onAnnotation={(p) => {
              if (!annotation.trim()) {
                setError(
                  "Saisissez un texte dans le panneau Sélection avant de le placer.",
                );
                return;
              }
              const result = commands.addAction(
                draft,
                step.id,
                "annotation",
                [p],
                undefined,
                undefined,
                false,
                annotation.trim(),
              );
              apply(result.play);
              setSelected({ kind: "action", id: result.actionId, point: 0 });
              setTool("select");
            }}
          />
          <div className="editor-timeline">
            <div className="timeline-top">
              <label>
                Lecture
                <select
                  aria-label="Choisir la lecture"
                  value={
                    draft.branches.some((b) => b.id === scope)
                      ? scope
                      : "common"
                  }
                  onChange={(e) => {
                    setScope(e.target.value);
                    setStepId(sequence(draft, e.target.value)[0]?.id ?? "");
                    setSelected(null);
                  }}
                >
                  <option value="common">Tronc commun</option>
                  {draft.branches.map((b) => (
                    <option key={b.id} value={b.id}>
                      {b.name}
                    </option>
                  ))}
                </select>
              </label>
              <button
                disabled={loading}
                onClick={() => {
                  try {
                    const result = commands.addStep(draft, scope, step.id);
                    apply(result.play);
                    setStepId(result.stepId);
                    setSelected(null);
                  } catch (e) {
                    setError((e as Error).message);
                  }
                }}
              >
                + Étape
              </button>
            </div>
            <div className="timeline-steps" aria-label="Étapes du système">
              {steps.map((s, i) => (
                <button
                  key={s.id}
                  className={s.id === step.id ? "active" : ""}
                  aria-current={s.id === step.id ? "step" : undefined}
                  onClick={() => {
                    setStepId(s.id);
                    setSelected(null);
                  }}
                >
                  <span>{i + 1}</span>
                  {s.title}
                </button>
              ))}
            </div>
            <div className="step-controls compact-step-controls">
              <button
                disabled={index === 0}
                onClick={() => {
                  setStepId(steps[index - 1].id);
                  setSelected(null);
                }}
              >
                ← Précédente
              </button>
              <label>
                <span className="sr-only">Étape</span>
                <select
                  aria-label="Choisir l’étape"
                  value={index}
                  onChange={(e) => {
                    setStepId(steps[Number(e.target.value)].id);
                    setSelected(null);
                  }}
                >
                  {steps.map((s, i) => (
                    <option key={s.id} value={i}>
                      {i + 1}. {s.title}
                    </option>
                  ))}
                </select>
              </label>
              <button
                disabled={index === steps.length - 1}
                onClick={() => {
                  setStepId(steps[index + 1].id);
                  setSelected(null);
                }}
              >
                Suivante →
              </button>
            </div>
          </div>
          <div className="editor-panels">
            <details
              className="editor-panel"
              open={!!selected || tool === "annotation"}
            >
              <summary>
                Sélection
                {selected?.kind === "player"
                  ? ` · Joueur ${selected.id}`
                  : selected?.kind === "defender"
                    ? ` · Défenseur ${selected.id}`
                    : action
                      ? ` · ${actionNames[action.kind]}`
                      : ""}
              </summary>
              <div className="panel-body">
                <label>
                  Élément
                  <select
                    aria-label="Élément sélectionné"
                    value={
                      selected?.kind === "player"
                        ? `p:${selected.id}`
                        : selected?.kind === "defender"
                          ? `d:${selected.id}`
                          : selected?.kind === "action"
                            ? `a:${selected.id}`
                            : selected?.kind === "ball"
                              ? "ball"
                              : ""
                    }
                    onChange={(e) => {
                      const v = e.target.value;
                      if (v === "ball") setSelected({ kind: "ball" });
                      else if (v.startsWith("a:"))
                        setSelected({
                          kind: "action",
                          id: v.slice(2),
                          point: 0,
                        });
                      else if (v)
                        setSelected({
                          kind: v[0] === "p" ? "player" : "defender",
                          id: v.slice(2),
                        });
                      else setSelected(null);
                    }}
                  >
                    <option value="">Choisir…</option>
                    {Object.keys(step.afterState.players).map((n) => (
                      <option key={`p${n}`} value={`p:${n}`}>
                        Joueur {n}
                      </option>
                    ))}
                    {Object.keys(step.afterState.defenders ?? {}).map((n) => (
                      <option key={`d${n}`} value={`d:${n}`}>
                        Défenseur {n}
                      </option>
                    ))}
                    <option value="ball">Ballon libre</option>
                    {step.actions.map((a, i) => (
                      <option key={a.id} value={`a:${a.id}`}>
                        {i + 1}. {actionNames[a.kind]}
                      </option>
                    ))}
                  </select>
                </label>
                {action && (
                  <>
                    <label>
                      Point du tracé
                      <select
                        aria-label="Point du tracé"
                        value={selected?.kind === "action" ? selected.point : 0}
                        onChange={(e) =>
                          setSelected({
                            kind: "action",
                            id: action.id,
                            point: Number(e.target.value),
                          })
                        }
                      >
                        {action.geometry.points.map((_, i) => (
                          <option key={i} value={i}>
                            {i + 1}
                            {i === 0
                              ? " · départ"
                              : i === action.geometry.points.length - 1
                                ? " · arrivée"
                                : " · contrôle"}
                          </option>
                        ))}
                      </select>
                    </label>
                    <label>
                      Acteur
                      <select
                        aria-label="Acteur du tracé"
                        value={action.actorId ?? ""}
                        onChange={(e) =>
                          run(() =>
                            commands.editAction(
                              draft,
                              step.id,
                              action.id,
                              (a) => {
                                if (e.target.value) {
                                  a.actorId = e.target.value;
                                  a.status =
                                    a.kind === "pass" ? "optional" : "recorded";
                                } else {
                                  delete a.actorId;
                                  a.status = "unassigned";
                                }
                                delete a.ballBeforeConfirmation;
                              },
                            ),
                          )
                        }
                      >
                        <option value="">Non associé</option>
                        {[1, 2, 3, 4, 5].map((n) => (
                          <option key={n} value={n}>
                            Joueur {n}
                          </option>
                        ))}
                      </select>
                    </label>
                    {action.kind === "pass" && (
                      <>
                        <label>
                          Destinataire
                          <select
                            aria-label="Destinataire de la passe"
                            value={action.recipientId ?? ""}
                            onChange={(e) =>
                              run(() =>
                                commands.editAction(
                                  draft,
                                  step.id,
                                  action.id,
                                  (a) => {
                                    if (e.target.value)
                                      a.recipientId = e.target.value;
                                    else delete a.recipientId;
                                    a.status =
                                      a.actorId && a.recipientId
                                        ? "optional"
                                        : "unassigned";
                                    delete a.ballBeforeConfirmation;
                                  },
                                ),
                              )
                            }
                          >
                            <option value="">Non associé</option>
                            {[1, 2, 3, 4, 5].map((n) => (
                              <option key={n} value={n}>
                                Joueur {n}
                              </option>
                            ))}
                          </select>
                        </label>
                        <label className="checkbox-label">
                          <input
                            type="checkbox"
                            checked={action.status === "confirmed"}
                            onChange={(e) =>
                              run(() =>
                                commands.confirmPass(
                                  draft,
                                  step.id,
                                  action.id,
                                  e.target.checked,
                                ),
                              )
                            }
                          />
                          Exécuter cette passe
                        </label>
                      </>
                    )}
                    {action.kind !== "annotation" && (
                      <label>
                        Épaisseur
                        <input
                          aria-label="Épaisseur du tracé"
                          type="range"
                          min="1"
                          max="8"
                          step=".5"
                          value={
                            action.width ??
                            (draft.court.coordinateSpace === "stack-raw"
                              ? 2.3
                              : 4.3)
                          }
                          onChange={(e) =>
                            run(
                              () =>
                                commands.editAction(
                                  draft,
                                  step.id,
                                  action.id,
                                  (a) => {
                                    a.width = Number(e.target.value);
                                  },
                                ),
                              `width:${action.id}`,
                            )
                          }
                        />
                      </label>
                    )}
                    {action.kind === "annotation" && (
                      <label>
                        Texte
                        <input
                          aria-label="Texte de l’annotation"
                          maxLength={300}
                          value={action.text ?? ""}
                          onChange={(e) =>
                            run(
                              () =>
                                commands.editAction(
                                  draft,
                                  step.id,
                                  action.id,
                                  (a) => {
                                    a.text = e.target.value;
                                  },
                                ),
                              `text:${action.id}`,
                            )
                          }
                        />
                      </label>
                    )}
                    <button
                      className="danger-button"
                      onClick={() => {
                        run(() =>
                          commands.changeStep(draft, step.id, (s) => {
                            s.actions = s.actions.filter(
                              (a) => a.id !== action.id,
                            );
                          }),
                        );
                        setSelected(null);
                      }}
                    >
                      Supprimer le tracé
                    </button>
                  </>
                )}
                {position && (
                  <form
                    key={`${selected?.kind}:${JSON.stringify(selected)}:${position.join()}`}
                    className="coordinate-form"
                    onSubmit={(e) => {
                      e.preventDefault();
                      const data = new FormData(e.currentTarget);
                      movePoint([Number(data.get("x")), Number(data.get("y"))]);
                    }}
                  >
                    <label>
                      X
                      <input
                        aria-label="Position X"
                        name="x"
                        type="number"
                        step=".1"
                        min="-10000"
                        max="10000"
                        required
                        defaultValue={position[0]}
                      />
                    </label>
                    <label>
                      Y
                      <input
                        aria-label="Position Y"
                        name="y"
                        type="number"
                        step=".1"
                        min="-10000"
                        max="10000"
                        required
                        defaultValue={position[1]}
                      />
                    </label>
                    <button type="submit">Appliquer la position</button>
                  </form>
                )}
                {tool === "annotation" && (
                  <label>
                    Texte à placer
                    <input
                      aria-label="Annotation à placer"
                      maxLength={300}
                      value={annotation}
                      onChange={(e) => setAnnotation(e.target.value)}
                    />
                  </label>
                )}
                <button
                  onClick={() =>
                    run(() =>
                      commands.changeStep(draft, step.id, (s) => {
                        if (Object.keys(s.afterState.defenders ?? {}).length) {
                          delete s.afterState.defenders;
                        } else
                          s.afterState.defenders = Object.fromEntries(
                            Object.entries(s.afterState.players).map(
                              ([id, p]) => [id, [p[0] + 25, p[1] + 25]],
                            ),
                          );
                      }),
                    )
                  }
                >
                  {Object.keys(step.afterState.defenders ?? {}).length
                    ? "Retirer les défenseurs"
                    : "Ajouter 5 défenseurs"}
                </button>
              </div>
            </details>
            <details className="editor-panel">
              <summary>Notes · {step.title}</summary>
              <div className="panel-body">
                <label>
                  Titre de l’étape
                  <input
                    aria-label="Titre de l’étape"
                    maxLength={300}
                    value={step.title}
                    onChange={(e) =>
                      run(
                        () =>
                          commands.changeStep(draft, step.id, (s) => {
                            s.title = e.target.value;
                          }),
                        `title:${step.id}`,
                      )
                    }
                  />
                </label>
                <label>
                  Consigne
                  <textarea
                    aria-label="Notes de l’étape"
                    rows={3}
                    maxLength={12000}
                    value={step.note}
                    onChange={(e) =>
                      run(
                        () =>
                          commands.changeStep(draft, step.id, (s) => {
                            s.note = e.target.value;
                          }),
                        `note:${step.id}`,
                      )
                    }
                  />
                </label>
                {draft.metadata.guidance && (
                  <p className="source-note">{draft.metadata.guidance}</p>
                )}
                <button
                  className="danger-button"
                  onClick={() => {
                    if (
                      confirm(
                        "Supprimer cette étape ? Annuler permet de la rétablir. Les lectures dépendantes seront raccordées à l’étape précédente si possible.",
                      )
                    )
                      run(() => commands.deleteStep(draft, step.id));
                  }}
                >
                  Supprimer l’étape
                </button>
              </div>
            </details>
            <details className="editor-panel">
              <summary>Ballon</summary>
              <div className="panel-body">
                {(["Départ", "Arrivée"] as const).map((label, i) => (
                  <label key={label}>
                    {label}
                    <select
                      aria-label={`Porteur ${i === 0 ? "au départ" : "à l’arrivée"}`}
                      value={ballValue(
                        i === 0 ? step.beforeState.ball : step.afterState.ball,
                      )}
                      onChange={(e) =>
                        run(() =>
                          commands.setBall(
                            draft,
                            step.id,
                            ballFrom(e.target.value),
                            i === 0,
                          ),
                        )
                      }
                    >
                      <option value="unknown">Non renseigné</option>
                      <option value="free">Libre</option>
                      {[1, 2, 3, 4, 5].map((n) => (
                        <option key={n} value={n}>
                          Joueur {n}
                        </option>
                      ))}
                    </select>
                  </label>
                ))}
                <button
                  disabled={step.afterState.ball?.mode !== "free"}
                  onClick={() => {
                    setSelected({ kind: "ball" });
                    setTool("select");
                  }}
                >
                  Déplacer le ballon libre
                </button>
                <p>
                  Le ballon attaché suit son porteur. Une passe optionnelle ne
                  transfère pas la possession.
                </p>
              </div>
            </details>
            <details className="editor-panel">
              <summary>Animation · ordre et durée</summary>
              <div className="panel-body">
                <label>
                  Durée de l’étape (s)
                  <input
                    aria-label="Durée de l’étape (secondes)"
                    type="number"
                    min="0.1"
                    max="30"
                    step="0.1"
                    value={step.timing ? step.timing.durationMs / 1000 : ""}
                    placeholder="1,4 par défaut"
                    onChange={(e) => {
                      const value = e.target.value;
                      run(
                        () =>
                          commands.changeStep(draft, step.id, (s) => {
                            if (value)
                              s.timing = {
                                durationMs: Math.round(Number(value) * 1000),
                              };
                            else delete s.timing;
                          }),
                        `step-duration:${step.id}`,
                      );
                    }}
                  />
                </label>
                <p>
                  Les actions d’un même groupe commencent ensemble. Les groupes
                  suivants attendent la fin du précédent. Une durée d’action
                  explicite peut allonger l’étape.
                </p>
                {step.actions
                  .filter(
                    (a) =>
                      a.kind !== "annotation" &&
                      a.geometry.kind !== "legacy-screen" &&
                      (a.kind !== "pass" || a.status === "confirmed"),
                  )
                  .map((a) => (
                    <fieldset className="action-timing" key={a.id}>
                      <legend>
                        {actionNames[a.kind]} ·{" "}
                        {a.actorId
                          ? `Joueur ${a.actorId}`
                          : "Acteur à associer"}
                      </legend>
                      <label>
                        Groupe
                        <input
                          aria-label={`Groupe ${a.id}`}
                          type="number"
                          min="0"
                          max="99"
                          step="1"
                          value={a.order ?? 0}
                          onChange={(e) =>
                            run(
                              () =>
                                commands.editAction(
                                  draft,
                                  step.id,
                                  a.id,
                                  (action) => {
                                    action.order = Number(e.target.value);
                                  },
                                ),
                              `order:${a.id}`,
                            )
                          }
                        />
                      </label>
                      <label>
                        Durée (s)
                        <input
                          aria-label={`Durée ${a.id}`}
                          type="number"
                          min="0.1"
                          max="30"
                          step="0.1"
                          value={a.durationMs ? a.durationMs / 1000 : ""}
                          placeholder="Automatique"
                          onChange={(e) => {
                            const value = e.target.value;
                            run(
                              () =>
                                commands.editAction(
                                  draft,
                                  step.id,
                                  a.id,
                                  (action) => {
                                    if (value)
                                      action.durationMs = Math.round(
                                        Number(value) * 1000,
                                      );
                                    else delete action.durationMs;
                                  },
                                ),
                              `action-duration:${a.id}`,
                            );
                          }}
                        />
                      </label>
                    </fieldset>
                  ))}
                <p>
                  Durée effective :{" "}
                  {(
                    compileStep(
                      step,
                      draft.court.coordinateSpace === "stack-raw",
                    ).duration / 1000
                  ).toFixed(1)}{" "}
                  s. Les données tactiques d’origine ne fournissent pas de
                  timings.
                </p>
                <button onClick={() => setPreview(true)}>
                  Lire cette étape
                </button>
              </div>
            </details>
            <details className="editor-panel">
              <summary>Lectures et système</summary>
              <div className="panel-body">
                <label>
                  Nom du système
                  <input
                    aria-label="Nom du système"
                    maxLength={300}
                    value={draft.name}
                    onChange={(e) =>
                      run(
                        () =>
                          commands.changePlay(draft, (p) => {
                            p.name = e.target.value;
                          }),
                        "name",
                      )
                    }
                  />
                </label>
                <form
                  onSubmit={(e) => {
                    e.preventDefault();
                    const data = new FormData(e.currentTarget);
                    try {
                      const result = commands.addBranch(
                        draft,
                        String(data.get("name")),
                        String(data.get("fork")),
                      );
                      apply(result.play);
                      setScope(result.branchId);
                      setStepId(result.stepId);
                      setSelected(null);
                      e.currentTarget.reset();
                    } catch (err) {
                      setError((err as Error).message);
                    }
                  }}
                >
                  <label>
                    Nouvelle lecture
                    <input
                      aria-label="Nom de la nouvelle lecture"
                      name="name"
                      maxLength={100}
                      required
                    />
                  </label>
                  <label>
                    Départ après
                    <select
                      aria-label="Point de branchement"
                      name="fork"
                      defaultValue={
                        draft.commonSteps.some((s) => s.id === step.id)
                          ? step.id
                          : draft.commonSteps.at(-1)?.id
                      }
                    >
                      {draft.commonSteps.map((s, i) => (
                        <option key={s.id} value={s.id}>
                          {i + 1}. {s.title}
                        </option>
                      ))}
                    </select>
                  </label>
                  <button type="submit">Créer la lecture</button>
                </form>
                <p>
                  Chaque lecture référence le tronc commun sans le dupliquer.
                </p>
              </div>
            </details>
          </div>
          <details className="editor-panel source-report">
            <summary>Source et points à confirmer</summary>
            <div className="panel-body">
              <p>
                {report.steps} étapes et {report.actions} actions dans
                l’inventaire d’origine.
              </p>
              {report.issues.map((issue) => (
                <p key={issue}>{issue}</p>
              ))}
              {step.flags.map((flag) => (
                <p key={flag}>{flag}</p>
              ))}
            </div>
          </details>
        </>
      )}
    </section>
  );
}
