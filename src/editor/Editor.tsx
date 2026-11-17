import { LanguagePicker } from "../i18n/LanguagePicker";
import { t } from "../i18n";
import { ExportControl } from "../files/ExportControl";
import { outsideHalf } from "./viewport";
import { TimingInput } from "./TimingInput";
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
    name: "Déplacer",
    hint: "Déplacez les pions ou le ballon directement sur le terrain. Un déplacement seul ne dessine pas de mouvement.",
  },
  {
    id: "run",
    name: "Tracer",
    hint: "Tracez le trajet depuis un joueur : le trait est nettoyé au relâchement.",
  },
  { id: "line", name: "Droite", hint: "Deux appuis : départ puis arrivée." },
  {
    id: "screen-static",
    name: "Écran fixe",
    hint: "Touche un joueur ou le terrain pour poser un écran sans déplacement.",
  },
  {
    id: "screen-line",
    name: "Déplacement d’écran droit",
    hint: "Deux appuis : départ du poseur puis arrivée.",
  },
  {
    id: "curve",
    name: "Courbe",
    hint: "Trois appuis : départ, point de courbure, arrivée.",
  },
  {
    id: "pass",
    name: "Passe",
    hint: "Tracez du passeur vers le destinataire. La passe reste optionnelle jusqu’à validation.",
  },
  {
    id: "screen",
    name: "Écran",
    hint: "Tracez le déplacement du poseur ; la barre de l’écran est ajoutée à l’arrivée.",
  },
  {
    id: "screen-curve",
    name: "Déplacement d’écran courbe",
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
  const [scope, setScope] = useState(() => {
    const requested = new URLSearchParams(location.hash.split("?")[1]).get(
      "branch",
    );
    return requested === "common" ||
      play.branches.some((b) => b.id === requested)
      ? requested!
      : (play.branches[0]?.id ?? "common");
  });
  const [stepId, setStepId] = useState(() => {
    const requested = new URLSearchParams(location.hash.split("?")[1]).get(
      "step",
    );
    return (
      sequence(play, scope).find((s) => s.id === requested)?.id ??
      sequence(play, scope)[0]?.id ??
      ""
    );
  });
  const [preview, setPreview] = useState(false);
  const [tool, setTool] = useState<Tool>("select");
  const [preset, setPreset] = useState<Tool>("run");
  const [selected, setSelected] = useState<Selection>(null);
  const [error, setError] = useState("");
  const [annotation, setAnnotation] = useState("");
  const group = useRef({ key: "", at: 0 });
  const draft = history.present;
  const steps = sequence(draft, scope);
  const step = steps.find((s) => s.id === stepId) ?? steps[0];
  useEffect(() => {
    if (!step) return;
    const [path, search = ""] = location.hash.split("?");
    const query = new URLSearchParams(search);
    query.set("step", step.id);
    query.set("branch", scope);
    window.history.replaceState(null, "", `${path}?${query}`);
  }, [step?.id, scope]);
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
  function draw(
    t: Tool,
    points: Point[],
    actor?: string,
    recipient?: string,
    shape?: "polyline" | "legacy-screen",
  ) {
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
        undefined,
        shape,
      );
      apply(result.play);
      setTool("select");

      setSelected(
        t === "pass" || t === "screen-static"
          ? { kind: "action", id: result.actionId, point: 0 }
          : null,
      );
    } catch (e) {
      setError(e instanceof Error ? e.message : "Tracé impossible.");
    }
  }
  const action =
    selected?.kind === "action"
      ? step?.actions.find((a) => a.id === selected.id)
      : undefined;
  const hasContextHelp =
    tool === "annotation" ||
    (tool === "select" &&
      (selected?.kind === "ball" || action?.kind === "pass"));
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
  if (preview)
    return (
      <section className="editor editor-preview">
        <button className="return-to-edit" onClick={() => setPreview(false)}>
          {t("Revenir à l’édition")}
        </button>
        <AnimationPlayer
          play={draft}
          library={library}
          initialBranch={scope}
          initialStepId={step?.id}
        />
      </section>
    );
  return (
    <section className="editor" aria-label={t("Éditeur de système")}>
      <div className="editor-commandbar">
        <div className="undo-group">
          <button
            disabled={!history.past.length || loading}
            onClick={() => travel()}
            title={t("Ctrl/Cmd Z")}
          >
            {t("↶ Annuler")}
          </button>
          {history.future.length > 0 && (
            <button
              disabled={loading}
              onClick={() => travel(true)}
              title={t("Ctrl/Cmd Maj Z")}
            >
              {t("↷ Rétablir")}
            </button>
          )}
        </div>

        <button disabled={!step || loading} onClick={() => setPreview(true)}>
          {t("Lire l’étape")}
        </button>
        <ExportControl library={library} play={draft} step={step} />
        <details className="editor-settings">
          <summary>{t("Réglages")}</summary>
          <LanguagePicker />
          <div className="editor-settings-body">
            {" "}
            <label className="court-kind">
              {t("Terrain")}
              <select
                aria-label={t("Format du play")}
                value={draft.court.kind}
                disabled={
                  draft.court.coordinateSpace === "stack-raw" || loading
                }
                onChange={(e) => {
                  const kind = e.target.value as "half" | "full";
                  if (
                    kind === "half" &&
                    outsideHalf(draft) &&
                    !confirm(
                      t(
                        "Des éléments de ce système sont hors du demi-terrain. Afficher ce cadre partiel ? Leurs positions seront conservées. Annuler garde le terrain complet.",
                      ),
                    )
                  )
                    return;
                  run(() =>
                    commands.changePlay(draft, (p) => {
                      p.court.kind = kind;
                    }),
                  );
                }}
              >
                <option value="half">{t("Demi")}</option>
                <option value="full">{t("Complet")}</option>
              </select>
            </label>
            {step && (
              <details className="advanced-editor">
                <summary>
                  {t("Réglages avancés · lectures, animation et possession")}
                </summary>
                <div className="advanced-panels">
                  <button
                    onClick={() =>
                      run(() =>
                        commands.changeStep(draft, step.id, (s) => {
                          if (
                            Object.keys(s.afterState.defenders ?? {}).length
                          ) {
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
                      ? t("Retirer les défenseurs")
                      : t("Ajouter 5 défenseurs")}
                  </button>
                  {!draft.commonSteps[0]?.purpose && (
                    <details className="editor-panel">
                      <summary>
                        {t("Ballon · correction des données existantes")}
                      </summary>
                      <div className="panel-body">
                        {([t("Départ"), t("Arrivée")] as const).map(
                          (label, i) => (
                            <label key={label}>
                              {label}
                              <select
                                aria-label={t(
                                  "Porteur {0}",
                                  i === 0 ? t("au départ") : t("à l’arrivée"),
                                )}
                                value={ballValue(
                                  i === 0
                                    ? step.beforeState.ball
                                    : step.afterState.ball,
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
                                <option value="unknown">
                                  {t("Non renseigné")}
                                </option>
                                <option value="free">{t("Libre")}</option>
                                {[1, 2, 3, 4, 5].map((n) => (
                                  <option key={n} value={n}>
                                    {t("Joueur ")}
                                    {n}
                                  </option>
                                ))}
                              </select>
                            </label>
                          ),
                        )}
                        <button
                          disabled={step.afterState.ball?.mode !== "free"}
                          onClick={() => {
                            setSelected({ kind: "ball" });
                            setTool("select");
                          }}
                        >
                          {t("Déplacer le ballon libre")}
                        </button>
                        <p>
                          {t(
                            "Le ballon attaché suit son porteur. Une passe optionnelle ne transfère pas la possession.",
                          )}
                        </p>
                      </div>
                    </details>
                  )}
                  <details className="editor-panel">
                    <summary>{t("Animation · ordre et durée")}</summary>
                    <div className="panel-body">
                      <label>
                        {t("Durée de l’étape (s)")}
                        <TimingInput
                          label={t("Durée de l’étape (secondes)")}
                          min={0.1}
                          max={30}
                          value={
                            step.timing
                              ? step.timing.durationMs / 1000
                              : undefined
                          }
                          placeholder={t("1,4 par défaut")}
                          onCommit={(value) =>
                            run(
                              () =>
                                commands.changeStep(draft, step.id, (s) => {
                                  if (value !== undefined)
                                    s.timing = {
                                      durationMs: Math.round(value * 1000),
                                    };
                                  else delete s.timing;
                                }),
                              `step-duration:${step.id}`,
                            )
                          }
                        />
                      </label>
                      <p>
                        {t(
                          "Validez un champ avec Entrée ou en le quittant. Les actions d’un même groupe commencent ensemble. Les groupes suivants attendent la fin du précédent. Une durée d’action explicite peut allonger l’étape.",
                        )}
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
                              {t(actionNames[a.kind])} {t("·")}{" "}
                              {a.actorId
                                ? t("Joueur {0}", a.actorId)
                                : t("Acteur à associer")}
                            </legend>
                            <label>
                              {t("Groupe")}
                              <TimingInput
                                label={t(
                                  "Groupe de {0} {1}",
                                  t(actionNames[a.kind]),
                                  step.actions.indexOf(a) + 1,
                                )}
                                min={0}
                                max={99}
                                integer
                                value={a.order}
                                placeholder="0"
                                onCommit={(value) =>
                                  run(
                                    () =>
                                      commands.editAction(
                                        draft,
                                        step.id,
                                        a.id,
                                        (action) => {
                                          if (value !== undefined)
                                            action.order = value;
                                          else delete action.order;
                                        },
                                      ),
                                    `order:${a.id}`,
                                  )
                                }
                              />
                            </label>
                            <label>
                              {t("Durée (s)")}
                              <TimingInput
                                label={t(
                                  "Durée de {0} {1}",
                                  t(actionNames[a.kind]),
                                  step.actions.indexOf(a) + 1,
                                )}
                                min={0.1}
                                max={30}
                                value={
                                  a.durationMs ? a.durationMs / 1000 : undefined
                                }
                                placeholder={t("Automatique")}
                                onCommit={(value) =>
                                  run(
                                    () =>
                                      commands.editAction(
                                        draft,
                                        step.id,
                                        a.id,
                                        (action) => {
                                          if (value !== undefined)
                                            action.durationMs = Math.round(
                                              value * 1000,
                                            );
                                          else delete action.durationMs;
                                        },
                                      ),
                                    `action-duration:${a.id}`,
                                  )
                                }
                              />
                            </label>
                          </fieldset>
                        ))}
                      <p>
                        {t("Durée effective :")}{" "}
                        {(
                          compileStep(
                            step,
                            draft.court.coordinateSpace === "stack-raw",
                          ).duration / 1000
                        ).toFixed(1)}{" "}
                        {t(
                          "s. Les données tactiques d’origine ne fournissent pas de timings.",
                        )}
                      </p>
                      <button onClick={() => setPreview(true)}>
                        {t("Lire cette étape")}
                      </button>
                    </div>
                  </details>
                  <details className="editor-panel">
                    <summary>{t("Lectures et système")}</summary>
                    <div className="panel-body">
                      <label>
                        {t("Nom du système")}
                        <input
                          aria-label={t("Nom du système")}
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
                        key={step.id}
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
                          {t("Nouvelle lecture")}
                          <input
                            aria-label={t("Nom de la nouvelle lecture")}
                            name="name"
                            maxLength={100}
                            required
                          />
                        </label>
                        <label>
                          {t("Départ après")}
                          <select
                            aria-label={t("Point de branchement")}
                            name="fork"
                            defaultValue={
                              draft.commonSteps.some((s) => s.id === step.id)
                                ? step.id
                                : draft.commonSteps.at(-1)?.id
                            }
                          >
                            {draft.commonSteps.map((s, i) => (
                              <option key={s.id} value={s.id}>
                                {i + 1}
                                {t(". ")}
                                {s.title}
                              </option>
                            ))}
                          </select>
                        </label>
                        <button type="submit">{t("Créer la lecture")}</button>
                      </form>
                      <p>
                        {t(
                          "Chaque lecture référence le tronc commun sans le dupliquer.",
                        )}
                      </p>
                    </div>
                  </details>
                </div>
              </details>
            )}{" "}
            {step && (
              <details className="editor-panel source-report">
                <summary>{t("Source et points à confirmer")}</summary>
                <div className="panel-body">
                  <p>
                    {report.steps} {t("étapes et ")}
                    {report.actions} {t("actions dans l’inventaire d’origine.")}
                  </p>
                  {report.issues.map((issue) => (
                    <p key={issue}>{t(issue)}</p>
                  ))}
                  {step.flags.map((flag) => (
                    <p key={flag}>{t(flag)}</p>
                  ))}
                </div>
              </details>
            )}{" "}
            <details className="editor-help">
              <summary>{t("Aide")}</summary>
              <p>
                {t(
                  "Vos modifications sont enregistrées automatiquement. Les notes et réglages sont repliables. Ctrl/Cmd Z annule, Ctrl/Cmd Maj Z rétablit. Le glisser-déposer est facultatif : sélectionnez puis appuyez à l’arrivée.",
                )}
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
                {t("Copie de secours JSON")}
              </button>
            </details>
          </div>
        </details>
      </div>
      {error && (
        <p className="editor-error" role="alert">
          {t(error)}
        </p>
      )}
      {!step ? (
        <div className="draft-placeholder">
          <h2>{t("Construisez votre première étape")}</h2>
          <p>{t("Ajoutez les cinq joueurs, puis placez-les à votre façon.")}</p>
          <button
            className="button-primary"
            disabled={loading}
            onClick={() => run(() => commands.initialize(draft, true))}
          >
            {t("Initialiser 5 joueurs")}
          </button>
        </div>
      ) : (
        <>
          <div className="editor-timeline">
            <div className="timeline-top">
              <div
                className="step-navigation"
                aria-label={t("Parcourir les étapes")}
              >
                <button
                  aria-label={t("Étape précédente")}
                  title={t("Étape précédente")}
                  disabled={steps.indexOf(step) === 0}
                  onClick={() => {
                    setStepId(steps[steps.indexOf(step) - 1].id);
                    setSelected(null);
                  }}
                >
                  ←
                </button>
                <span>
                  {t(
                    "Étape {0} sur {1}",
                    steps.indexOf(step) + 1,
                    steps.length,
                  )}
                </span>
                <button
                  aria-label={t("Étape suivante")}
                  title={t("Étape suivante")}
                  disabled={steps.indexOf(step) === steps.length - 1}
                  onClick={() => {
                    setStepId(steps[steps.indexOf(step) + 1].id);
                    setSelected(null);
                  }}
                >
                  →
                </button>
              </div>

              {draft.branches.length > 0 && (
                <label>
                  {t("Lecture")}
                  <select
                    aria-label={t("Choisir la lecture")}
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
                    <option value="common">{t("Tronc commun")}</option>
                    {draft.branches.map((b) => (
                      <option key={b.id} value={b.id}>
                        {b.name}
                      </option>
                    ))}
                  </select>
                </label>
              )}
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
                {t("+ Étape")}
              </button>
            </div>
            <div className="timeline-steps" aria-label={t("Étapes du système")}>
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
          </div>
          {
            <div
              className="drawing-tools"
              role="toolbar"
              aria-label={t("Outils de dessin")}
            >
              {tools
                .filter((item) => ["select", "run", "pass"].includes(item.id))
                .map((item) => (
                  <button
                    key={item.id}
                    aria-pressed={
                      tool === item.id ||
                      (item.id === "run" &&
                        [
                          "line",
                          "curve",
                          "screen",
                          "screen-static",
                          "screen-line",
                          "screen-curve",
                        ].includes(tool)) ||
                      (item.id === "screen" && tool === "screen-curve")
                    }
                    disabled={loading}
                    onClick={() =>
                      setTool(item.id === "run" ? preset : item.id)
                    }
                  >
                    {t(item.name)}
                  </button>
                ))}
              {
                <details className="more-draw-tools" name="board-overlays">
                  <summary>{t("Autres")}</summary>
                  <div>
                    {tools
                      .filter((item) =>
                        ["screen", "annotation"].includes(item.id),
                      )
                      .map((item) => (
                        <button
                          key={item.id}
                          onClick={(e) => {
                            setTool(item.id);
                            if (item.id === "screen") setPreset(item.id);
                            e.currentTarget.closest("details")!.open = false;
                          }}
                        >
                          {t(item.name)}
                        </button>
                      ))}
                  </div>
                </details>
              }
            </div>
          }
          <label className="drawing-preset">
            {t("Type de tracé")}
            <select
              aria-label={t("Type de tracé")}
              value={preset}
              disabled={loading}
              onChange={(e) => {
                setPreset(e.target.value as Tool);
                setTool(e.target.value as Tool);
              }}
            >
              {tools
                .filter((item) =>
                  [
                    "run",
                    "line",
                    "curve",
                    "screen-static",
                    "screen",
                    "screen-line",
                    "screen-curve",
                  ].includes(item.id),
                )
                .map((item) => (
                  <option key={item.id} value={item.id}>
                    {t(
                      item.id === "run"
                        ? "Main levée"
                        : item.id === "screen"
                          ? "Déplacement d’écran manuel"
                          : item.name,
                    )}
                  </option>
                ))}
            </select>
          </label>
          {step.purpose && (
            <p className="setup-hint">
              {t(
                "Placez les joueurs et le ballon. Vous pouvez dessiner ici ou ajouter une étape.",
              )}
            </p>
          )}
          {!step.purpose && !hasContextHelp && (
            <p className="tool-hint" role="status">
              {t(tools.find((item) => item.id === tool)!.hint)}
            </p>
          )}
          {draft.commonSteps.some((s) => s.id === step.id) &&
            draft.branches.length > 0 && (
              <p className="shared-hint">
                {t(
                  "Étape commune : les états hérités et les départs des lectures dépendantes seront mis à jour. Les destinations explicites sont conservées.",
                )}
              </p>
            )}
          {draft.court.coordinateSpace === "stack-raw" && (
            <p className="shared-hint">
              {t(
                "Stack : repère source sans terrain superposé. Associez explicitement les acteurs dans Sélection ; les dimensions restent à confirmer.",
              )}
            </p>
          )}
          {!step.afterState.ball && (
            <button
              className="add-ball"
              onClick={() =>
                run(() =>
                  commands.setBall(draft, step.id, {
                    mode: "free",
                    position:
                      draft.court.coordinateSpace === "stack-raw"
                        ? [180, 160]
                        : [375, 350],
                  }),
                )
              }
            >
              {t("Ajouter le ballon")}
            </button>
          )}
          {draft.court.kind === "half" && outsideHalf(draft) && (
            <p className="shared-hint" role="status">
              {t(
                "Des éléments sont hors du cadre. « Recadrer » permet de les retrouver.",
              )}
            </p>
          )}
          {tool === "select" && selected?.kind === "ball" && (
            <p className="board-context" role="status">
              {t(
                "Ballon sélectionné : touche un joueur pour lui donner le ballon, ou un endroit vide pour le poser.",
              )}
            </p>
          )}
          {tool === "annotation" && (
            <label className="board-context annotation-context">
              {t("Texte à placer")}
              <input
                aria-label={t("Annotation à placer")}
                maxLength={300}
                value={annotation}
                onChange={(e) => setAnnotation(e.target.value)}
                autoFocus
              />
              <span>
                {t("Écris ici, puis touche le terrain pour placer le texte.")}
              </span>
            </label>
          )}
          {tool === "select" && action?.kind === "pass" && (
            <div className="board-context pass-context">
              <span>
                {t(
                  "Passe {0} → {1}",
                  action.actorId ?? "?",
                  action.recipientId ?? "?",
                )}
              </span>
              <label className="checkbox-label">
                <input
                  type="checkbox"
                  checked={action.status === "confirmed"}
                  disabled={loading}
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
                {t("Exécuter cette passe")}
              </label>
              <span>
                {action.status === "confirmed"
                  ? t("Le ballon sera transmis pendant la lecture.")
                  : t(
                      "Option dessinée : active-la pour transmettre le ballon pendant la lecture.",
                    )}
              </span>
            </div>
          )}
          <EditorCanvas
            key={draft.id}
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
            onBallDrop={(point, carrier) =>
              run(() =>
                commands.setBall(
                  draft,
                  step.id,
                  carrier
                    ? { mode: "attached", carrierId: carrier }
                    : { mode: "free", position: point },
                ),
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

          <div className="editor-panels">
            {action && (
              <details className="editor-panel">
                <summary>
                  {t("Sélection")}
                  {selected?.kind === "player"
                    ? t(" · Joueur {0}", selected.id)
                    : selected?.kind === "defender"
                      ? t(" · Défenseur {0}", selected.id)
                      : action
                        ? t(" · {0}", t(actionNames[action.kind]))
                        : ""}
                </summary>
                <div className="panel-body">
                  {action && (
                    <>
                      <label>
                        {t("Acteur")}
                        <select
                          aria-label={t("Acteur du tracé")}
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
                                      a.kind === "pass"
                                        ? "optional"
                                        : "recorded";
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
                          <option value="">{t("Non associé")}</option>
                          {[1, 2, 3, 4, 5].map((n) => (
                            <option key={n} value={n}>
                              {t("Joueur ")}
                              {n}
                            </option>
                          ))}
                        </select>
                      </label>
                      {action.kind === "pass" && (
                        <>
                          <label>
                            {t("Destinataire")}
                            <select
                              aria-label={t("Destinataire de la passe")}
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
                              <option value="">{t("Non associé")}</option>
                              {[1, 2, 3, 4, 5].map((n) => (
                                <option key={n} value={n}>
                                  {t("Joueur ")}
                                  {n}
                                </option>
                              ))}
                            </select>
                          </label>
                        </>
                      )}
                      {action.kind !== "annotation" && (
                        <label>
                          {t("Épaisseur")}
                          <input
                            aria-label={t("Épaisseur du tracé")}
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
                          {t("Texte")}
                          <input
                            aria-label={t("Texte de l’annotation")}
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
                        {t("Supprimer le tracé")}
                      </button>
                    </>
                  )}
                </div>
              </details>
            )}
            <details className="editor-panel">
              <summary>
                {t("Notes · ")}
                {step.title}
              </summary>
              <div className="panel-body">
                <label>
                  {t("Titre de l’étape")}
                  <input
                    aria-label={t("Titre de l’étape")}
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
                  {t("Consigne")}
                  <textarea
                    aria-label={t("Notes de l’étape")}
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
                        t(
                          "Supprimer cette étape ? Annuler permet de la rétablir. Les lectures dépendantes seront raccordées à l’étape précédente si possible.",
                        ),
                      )
                    )
                      run(() => commands.deleteStep(draft, step.id));
                  }}
                >
                  {t("Supprimer l’étape")}
                </button>
              </div>
            </details>
          </div>
        </>
      )}
    </section>
  );
}
