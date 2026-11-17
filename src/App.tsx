import { editorHref } from "./library/resume";
import { LanguagePicker } from "./i18n/LanguagePicker";
import { t, useLocale } from "./i18n";
import { Tutorial } from "./tutorial/Tutorial";
import { useEffect, useRef, useState } from "react";
import { OfflineStatus } from "./pwa/OfflineStatus";
import { Editor } from "./editor/Editor";
import { createPlay, initialize } from "./editor/commands";
import { Arrow } from "./components/Arrow";
import { LibraryWorkspace } from "./files/LibraryWorkspace";
import { PlayViewer } from "./components/PlayViewer";
import type { Play } from "./model/types";
import { useLibrary } from "./storage/useLibrary";
import { downloadEmergency } from "./import-export/emergency";

type Space = "library" | "editor" | "presentation" | "tutorial";
const labels: Record<Space, string> = {
  library: "Bibliothèque",
  editor: "Éditeur",
  presentation: "Présentation",
  tutorial: "Tuto",
};
function readRoute() {
  const [path, query = ""] = location.hash.slice(1).split("?");
  const space: Space =
    path === "/editor"
      ? "editor"
      : path === "/presentation"
        ? "presentation"
        : path === "/tutorial"
          ? "tutorial"
          : "library";
  return {
    space,
    playId: new URLSearchParams(query).get("play") ?? "princeton",
  };
}
const href = (space: Space, play?: Play) => {
  if (space === "editor" && play) return editorHref(play);
  const query = new URLSearchParams();
  if (play) query.set("play", play.id);
  if (space === "tutorial") {
    const [path, current = ""] = location.hash.slice(1).split("?");
    query.set("from", path === "/editor" ? "editor" : "library");
    if (path === "/editor")
      for (const key of ["step", "branch"]) {
        const value = new URLSearchParams(current).get(key);
        if (value) query.set(key, value);
      }
  }
  return `#/${space}${query.size ? `?${query}` : ""}`;
};
function tutorialReturn(play?: Play) {
  const params = new URLSearchParams(location.hash.split("?")[1]);
  if (params.get("from") !== "editor" || !play) return "#/library";
  const query = new URLSearchParams({ play: play.id });
  for (const key of ["step", "branch"]) {
    const value = params.get(key);
    if (value) query.set(key, value);
  }
  return `#/editor?${query}`;
}
export function App() {
  const locale = useLocale();
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
    document.title = `CoachOS · ${t(labels[route.space])}`;
    document.documentElement.lang = locale;
  }, [route.space, locale]);
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
        {t("Aller au contenu")}
      </a>
      <aside
        inert={atomicBusy}
        className="sidebar"
        aria-label={t("Navigation principale")}
      >
        <a
          className="brand"
          href={href("library")}
          title={t("Accueil CoachOS")}
        >
          <span className="brand-icon" aria-hidden="true">
            {t("C")}
            <span>{t("·")}</span>
          </span>
          <span>{t("CoachOS")}</span>
        </a>
        <div className="workspace-label">{t("MON ESPACE COACH")}</div>
        <nav>
          {(Object.keys(labels) as Space[]).map((space, i) => (
            <a
              key={space}
              href={href(space, play)}
              onClick={
                space === "tutorial"
                  ? (e) => {
                      e.currentTarget.href = href(space, play);
                    }
                  : undefined
              }
              aria-current={space === route.space ? "page" : undefined}
            >
              <span className="nav-symbol" aria-hidden="true">
                {[t("▦"), t("⌁"), t("▷"), "?"][i]}
              </span>
              {t(labels[space])}
            </a>
          ))}
        </nav>
        <div className="sidebar-note">
          <span className="status-dot" />
          {t("Votre tableau de jeu")}
          <div>{t("Concevoir. Transmettre. Jouer.")}</div>
        </div>
        <div className="sidebar-footer">
          <span className="avatar" aria-hidden="true">
            {t("C")}
          </span>
          <div>
            {t("Playbook OWLS")}
            <small>{t("CoachOS · Espace personnel")}</small>
          </div>
        </div>
      </aside>
      <div className="main-wrap">
        <header className="topbar">
          <span>
            {t("Mon espace ")}
            <span className="breadcrumb-divider">{t("/")}</span>
            <strong>{t(labels[route.space])}</strong>
          </span>
          <LanguagePicker />
        </header>
        <main inert={atomicBusy} id="main-content" ref={main} tabIndex={-1}>
          <OfflineStatus />
          <div className="storage-line" role="status">
            {status === "loading"
              ? t("Ouverture du stockage local…")
              : status === "saving"
                ? t("Enregistrement…")
                : status === "saved"
                  ? t("Enregistré sur cet appareil")
                  : t("Stockage indisponible")}
            {status === "saved" && (
              <span> {t("· Pensez à une copie externe.")}</span>
            )}
          </div>
          {status === "error" && (
            <div className="storage-error" role="alert">
              <strong>{t("La sauvegarde locale n’est pas disponible.")}</strong>
              <p>
                {t(error)}{" "}
                {t(
                  "Les données existantes ne sont pas remplacées. L’export contient les données de travail affichées, y compris les modifications non enregistrées ; il ne restaure pas un stockage illisible.",
                )}
              </p>
              <button onClick={() => downloadEmergency(library)}>
                {t("Exporter les données affichées (JSON)")}
              </button>
              {canRetry && (
                <button
                  onClick={() => {
                    void retry();
                  }}
                >
                  {t("Réessayer la sauvegarde")}
                </button>
              )}
            </div>
          )}
          {route.space === "tutorial" ? (
            <Tutorial returnHref={tutorialReturn(play)} />
          ) : route.space === "library" ? (
            <>
              <div className="page-heading">
                <div>
                  <p className="eyebrow">{t("VOTRE JEU, AU MÊME ENDROIT")}</p>
                  <h1>{t("La bibliothèque")}</h1>
                  <p className="muted">
                    {t(
                      "Retrouvez vos systèmes. Préparez votre prochaine séance.",
                    )}
                  </p>
                </div>
              </div>
              <button
                className="new-play-button"
                disabled={status === "loading"}
                onClick={() => setNewPlay((v) => !v)}
              >
                {t("+ Nouveau système")}
              </button>
              {newPlay && (
                <form
                  className="new-play-form"
                  onSubmit={(e) => {
                    e.preventDefault();
                    try {
                      const p = initialize(
                        createPlay(
                          String(new FormData(e.currentTarget).get("name")),
                        ),
                        true,
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
                    {t("Nom du nouveau système")}
                    <input name="name" maxLength={100} required autoFocus />
                  </label>
                  <button type="submit">{t("Créer le système")}</button>
                  {createError && <p role="alert">{t(createError)}</p>}
                </form>
              )}
              <details className="notice library-intro">
                <summary>{t("À propos des systèmes de départ")}</summary>
                <span className="notice-icon" aria-hidden="true">
                  {t("i")}
                </span>
                <p>
                  <strong>{t("Votre playbook prend vie.")}</strong>{" "}
                  {t(
                    "Les cinq systèmes OWLS et Stack sont disponibles en lecture et en édition. Les données sont locales à ce navigateur. Stack reste à confirmer ; Baseline et Losange attendent leurs premières étapes.",
                  )}
                </p>
              </details>
              <LibraryWorkspace
                library={library}
                status={status}
                commit={commitLibrary}
                readRecovery={readRecovery}
              />
            </>
          ) : !play ? (
            <div className="empty-state">
              <h1>{t("Aucun système disponible")}</h1>
              <a className="button" href="#/library">
                {t("Revenir à la bibliothèque")}
              </a>
            </div>
          ) : (
            <>
              <div className="page-heading workspace-heading">
                <div>
                  <p className="eyebrow">
                    {presentation
                      ? t("TRANSMETTRE LE JEU")
                      : t("OBSERVER LE JEU")}
                  </p>
                  <h1>{play.name}</h1>
                  <p className="muted">
                    {presentation
                      ? t("Chaque étape, lisible pour toute l’équipe.")
                      : t("Les intentions d’origine, étape par étape.")}
                  </p>
                </div>
                {presentation && (
                  <a
                    className="button button-primary"
                    href={href(presentation ? "editor" : "presentation", play)}
                  >
                    {presentation ? t("Retour à l’éditeur") : t("Présenter")}
                    <Arrow />
                  </a>
                )}
              </div>
              {route.space === "editor" ? (
                status === "loading" ? (
                  <p>{t("Ouverture de l’éditeur…")}</p>
                ) : (
                  <Editor
                    key={play.id}
                    play={play}
                    library={library}
                    onSave={savePlay}
                  />
                )
              ) : (
                <PlayViewer key={play.id} play={play} library={library} />
              )}
            </>
          )}
          <footer className="page-footer">
            <span>{t("CoachOS · OWLS")}</span>
            <span>{t("Un terrain. Des idées. Votre jeu.")}</span>
          </footer>
        </main>
      </div>
    </div>
  );
}
