import { useState } from "react";
import {
  EditorCanvas,
  type Selection,
  type Tool,
} from "../editor/EditorCanvas";
import * as commands from "../editor/commands";

function exercise() {
  const p = commands.initialize(
    commands.createPlay("Terrain d’entraînement"),
    true,
  );
  return commands.addStep(p, "common", p.commonSteps[0].id).play;
}
/** Ce terrain reste en mémoire : aucune écriture dans la bibliothèque. */
export function PracticeBoard() {
  const [play, setPlay] = useState(exercise);
  const [tool, setTool] = useState<Tool>("select");
  const [selected, setSelected] = useState<Selection>(null);
  const [message, setMessage] = useState(
    "Essaie de déplacer un joueur ou de donner le ballon au joueur 2.",
  );
  const step = play.commonSteps[1];
  return (
    <section className="tutorial-practice" aria-label="Terrain d’entraînement">
      <p>
        Essaie ici : ce terrain ne change aucun de tes systèmes. Il repart à
        zéro quand tu quittes le tuto.
      </p>
      <div
        className="practice-tools"
        role="toolbar"
        aria-label="Outils du terrain d’entraînement"
      >
        <button
          aria-pressed={tool === "select"}
          onClick={() => setTool("select")}
        >
          Déplacer
        </button>
        <button aria-pressed={tool === "run"} onClick={() => setTool("run")}>
          Tracer
        </button>
        <button
          onClick={() => {
            setPlay(exercise());
            setSelected(null);
            setTool("select");
            setMessage("Terrain remis à zéro.");
          }}
        >
          Recommencer
        </button>
      </div>
      <p role="status" className="practice-message">
        {message}
      </p>
      <EditorCanvas
        key={play.id}
        play={play}
        step={step}
        tool={tool}
        selected={selected}
        onSelect={setSelected}
        onMove={(id, p, defender) => {
          setPlay(commands.movePlayer(play, step.id, id, p, defender));
          setMessage(`Joueur ${id} déplacé. Le ballon suit son porteur.`);
        }}
        onPoint={(id, index, p) =>
          setPlay(commands.editPoint(play, step.id, id, index, p))
        }
        onBallDrop={(p, carrier) => {
          setPlay(
            commands.setBall(
              play,
              step.id,
              carrier
                ? { mode: "attached", carrierId: carrier }
                : { mode: "free", position: p },
            ),
          );
          setSelected(null);
          setMessage(
            carrier
              ? `Le joueur ${carrier} porte maintenant le ballon.`
              : "Le ballon est libre sur le terrain.",
          );
        }}
        onDraw={(kind, points, actor, _, shape) => {
          setPlay(
            commands.addAction(
              play,
              step.id,
              "run",
              points,
              actor,
              undefined,
              kind === "curve",
              undefined,
              shape,
            ).play,
          );
          setTool("select");
          setSelected(null);
          setMessage(
            "Mouvement dessiné et nettoyé. Choisis Tracer pour en ajouter un autre.",
          );
        }}
        onErase={(id) =>
          setPlay(
            commands.changeStep(play, step.id, (s) => {
              s.actions = s.actions.filter((a) => a.id !== id);
            }),
          )
        }
        onAnnotation={() => {}}
      />
    </section>
  );
}
