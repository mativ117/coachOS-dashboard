import { useEffect, useRef, useState } from "react";
import { OfflineStatus } from "./pwa/OfflineStatus";
import { Editor } from "./editor/Editor";
import { createPlay } from "./editor/commands";
import { Arrow } from "./components/Arrow";
import { LibraryWorkspace } from "./files/LibraryWorkspace";
import { PlayViewer } from "./components/PlayViewer";
import type { Play } from "./model/types";
import { useLibrary } from "./storage/useLibrary";
import { downloadEmergency } from "./import-export/emergency";

type Space = "library" | "editor" | "presentation";
const labels: Record<Space, string> = {
  library: "Bibliothèque",
  editor: "Éditeur",
  presentation: "Présentation",
};
function readRoute() {
  const [path, query = ""] = location.hash.slice(1).split("?");
  const space: Space =
    path === "/editor"
      ? "editor"
      : path === "/presentation"
        ? "presentation"
        : "library";
  return {
    space,
    playId: new URLSearchParams(query).get("play") ?? "princeton",
  };
}
const href = (space: Space, play?: Play) =>
  `#/${space}${play ? `?play=${encodeURIComponent(play.id)}` : ""}`;
export function App() {
  const {
    library,
    status,
    error,
    savePlay,
    retry,
    canRetry,
    commitLibrary,
    readRecovery,
    atomicBusy,
  } = useLibrary();
  const [newPlay, setNewPlay] = useState(false);
  const [createError, setCreateError] = useState("");
  const [route, setRoute] = useState(readRoute);
  const main = useRef<HTMLElement>(null);
  const play =
    library.plays.find((p) => p.id === route.playId) ?? library.plays[0];
  useEffect(() => {
    const change = () => {
      setRoute(readRoute());
      main.current?.focus();
    };
    addEventListener("hashchange", change);
    return () => removeEventListener("hashchange", change);
  }, []);
  useEffect(() => {
    document.title = `CoachOS · ${labels[route.space]}`;
  }, [route.space]);
  const presentation = route.space === "presentation";
  return (
    <div
      className={`app ${presentation ? "is-presenting" : route.space === "editor" ? "is-editing" : ""}`}
    >
      <a
        href="#main-content"
        className="skip-link"
        onClick={(e) => {
          e.preventDefault();
          main.current?.focus();
        }}
      >
        Aller au contenu
      </a>
      <aside
        inert={atomicBusy}
        className="sidebar"
        aria-label="Navigation principale"
      >
        <a className="brand" href={href("library")} title="Accueil CoachOS">
          <span className="brand-icon" aria-hidden="true">
            C<span>·</span>
          </span>
          <span>CoachOS</span>
        </a>
        <div className="workspace-label">MON ESPACE COACH</div>
        <nav>
          {(Object.keys(labels) as Space[]).map((space, i) => (
            <a
              key={space}
              href={href(space, play)}
              aria-current={space === route.space ? "page" : undefined}
            >
              <span className="nav-symbol" aria-hidden="true">
                {["▦", "⌁", "▷"][i]}
              </span>
              {labels[space]}
            </a>
          ))}
        </nav>
        <div className="sidebar-note">
          <span className="status-dot" />
          Votre tableau de jeu<div>Concevoir. Transmettre. Jouer.</div>
        </div>
        <div className="sidebar-footer">
          <span className="avatar" aria-hidden="true">
            C
          </span>
          <div>
            Playbook OWLS<small>CoachOS · Espace personnel</small>
          </div>
        </div>
      </aside>
      <div className="main-wrap">
        <header className="topbar">
          <span>
            Mon espace <span className="breadcrumb-divider">/</span>
            <strong>{labels[route.space]}</strong>
          </span>
          <span className="phase-badge">CoachOS · PWA</span>
        </header>
        <main inert={atomicBusy} id="main-content" ref={main} tabIndex={-1}>
          <OfflineStatus />
          <div className="storage-line" role="status">
            {status === "loading"
              ? "Ouverture du stockage local…"
              : status === "saving"
                ? "Enregistrement…"
                : status === "saved"
                  ? "Enregistré sur cet appareil"
                  : "Stockage indisponible"}
            {status === "saved" && <span> · Pensez à une copie externe.</span>}
          </div>
          {status === "error" && (
            <div className="storage-error" role="alert">
              <strong>La sauvegarde locale n’est pas disponible.</strong>
              <p>
                {error} Les données existantes ne sont pas remplacées. L’export
                contient les données de travail affichées, y compris les
                modifications non enregistrées ; il ne restaure pas un stockage
                illisible.
              </p>
              <button onClick={() => downloadEmergency(library)}>
                Exporter les données affichées (JSON)
              </button>
              {canRetry && (
                <button
                  onClick={() => {
                    void retry();
                  }}
                >
                  Réessayer la sauvegarde
                </button>
              )}
            </div>
          )}
          {route.space === "library" ? (
            <>
              <div className="page-heading">
                <div>
                  <p className="eyebrow">VOTRE JEU, AU MÊME ENDROIT</p>
                  <h1>La bibliothèque</h1>
                  <p className="muted">
                    Retrouvez vos systèmes. Préparez votre prochaine séance.
                  </p>
                </div>
                <button
                  className="button button-primary"
                  onClick={() => downloadEmergency(library)}
                >
                  Copie de secours JSON <Arrow />
                </button>
              </div>
              <button
                className="new-play-button"
                disabled={status === "loading"}
                onClick={() => setNewPlay((v) => !v)}
              >
                + Nouveau système
              </button>
              {newPlay && (
                <form
                  className="new-play-form"
                  onSubmit={(e) => {
                    e.preventDefault();
                    try {
                      const p = createPlay(
                        String(new FormData(e.currentTarget).get("name")),
                      );
                      savePlay(p);
                      setNewPlay(false);
                      setCreateError("");
                      location.hash = href("editor", p).slice(1);
                    } catch (error) {
                      setCreateError((error as Error).message);
                    }
                  }}
                >
                  <label>
                    Nom du nouveau système
                    <input name="name" maxLength={100} required autoFocus />
                  </label>
                  <button type="submit">Créer le système</button>
                  {createError && <p role="alert">{createError}</p>}
                </form>
              )}
              <div className="notice">
                <span className="notice-icon" aria-hidden="true">
                  i
                </span>
                <p>
                  <strong>Votre playbook prend vie.</strong> Les cinq systèmes
                  OWLS et Stack sont disponibles en lecture et en édition. Les
                  données sont locales à ce navigateur. Stack reste à confirmer
                  ; Baseline et Losange attendent leurs premières étapes.
                </p>
              </div>
              <LibraryWorkspace
                library={library}
                status={status}
                commit={commitLibrary}
                readRecovery={readRecovery}
              />
            </>
          ) : !play ? (
            <div className="empty-state">
              <h1>Aucun système disponible</h1>
              <a className="button" href="#/library">
                Revenir à la bibliothèque
              </a>
            </div>
          ) : (
            <>
              <div className="page-heading workspace-heading">
                <div>
                  <p className="eyebrow">
                    {presentation ? "TRANSMETTRE LE JEU" : "OBSERVER LE JEU"}
                  </p>
                  <h1>{play.name}</h1>
                  <p className="muted">
                    {presentation
                      ? "Chaque étape, lisible pour toute l’équipe."
                      : "Les intentions d’origine, étape par étape."}
                  </p>
                </div>
                <a
                  className="button button-primary"
                  href={href(presentation ? "editor" : "presentation", play)}
                >
                  {presentation ? "Retour à l’éditeur" : "Présenter"}
                  <Arrow />
                </a>
              </div>
              {route.space === "editor" ? (
                status === "loading" ? (
                  <p>Ouverture de l’éditeur…</p>
                ) : (
                  <Editor
                    key={play.id}
                    play={play}
                    library={library}
                    onSave={savePlay}
                  />
                )
              ) : (
                <PlayViewer key={play.id} play={play} />
              )}
            </>
          )}
          <footer className="page-footer">
            <span>CoachOS · OWLS</span>
            <span>Un terrain. Des idées. Votre jeu.</span>
          </footer>
        </main>
      </div>
    </div>
  );
}
