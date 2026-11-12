import { useEffect, useRef, useState } from "react";
import { Editor } from "./editor/Editor";
import { createPlay } from "./editor/commands";
import { Arrow } from "./components/Arrow";
import { Court } from "./components/Court";
import { PlayDiagram } from "./components/PlayDiagram";
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
    updatePreferences,
    savePlay,
    retry,
    canRetry,
  } = useLibrary();
  const [newPlay, setNewPlay] = useState(false);
  const [createError, setCreateError] = useState("");
  const [route, setRoute] = useState(readRoute);
  const [query, setQuery] = useState("");
  const [filter, setFilter] = useState("Tous les systèmes");
  const [collection, setCollection] = useState("all");
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
  const results = library.plays.filter(
    (p) =>
      `${p.name} ${p.metadata.description}`
        .toLocaleLowerCase("fr")
        .includes(query.toLocaleLowerCase("fr")) &&
      (filter === "Tous les systèmes" ||
        (filter === "Brouillons"
          ? p.status === "draft"
          : p.metadata.category === filter)) &&
      (collection === "all" ||
        library.collections
          .find((c) => c.id === collection)
          ?.playIds.includes(p.id)),
  );
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
      <aside className="sidebar" aria-label="Navigation principale">
        <a
          className="brand"
          href={href("library")}
          aria-label="CoachOS — accueil"
        >
          <span className="brand-icon" aria-hidden="true">
            C<span>·</span>
          </span>
          <span>
            Coach<span className="brand-light">OS</span>
          </span>
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
          <span className="phase-badge">Éditeur · Phase 3</span>
        </header>
        <main id="main-content" ref={main} tabIndex={-1}>
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
              <section
                className="library-section"
                aria-labelledby="systems-heading"
              >
                <div className="section-heading">
                  <h2 id="systems-heading">
                    Mes systèmes{" "}
                    <span className="count">{library.plays.length}</span>
                  </h2>
                  <span className="section-meta">
                    {library.plays.filter((p) => p.status !== "draft").length}{" "}
                    systèmes ·{" "}
                    {library.plays.filter((p) => p.status === "draft").length}{" "}
                    brouillons
                  </span>
                </div>
                <div className="filters">
                  <label className="search">
                    <span aria-hidden="true">⌕</span>
                    <span className="sr-only">Rechercher un système</span>
                    <input
                      type="search"
                      placeholder="Rechercher un système…"
                      value={query}
                      onChange={(e) => setQuery(e.target.value)}
                    />
                  </label>
                  <label className="filter">
                    <span className="sr-only">Filtrer les collections</span>
                    <select
                      value={collection}
                      onChange={(e) => setCollection(e.target.value)}
                    >
                      <option value="all">Toutes les collections</option>
                      {library.collections.map((c) => (
                        <option key={c.id} value={c.id}>
                          {c.name}
                        </option>
                      ))}
                    </select>
                  </label>
                  <label className="filter">
                    <span className="sr-only">Filtrer les systèmes</span>
                    <select
                      value={filter}
                      onChange={(e) => setFilter(e.target.value)}
                    >
                      {[
                        "Tous les systèmes",
                        "Demi-terrain",
                        "Remise en jeu",
                        "Attaque de zone",
                        "Brouillons",
                      ].map((v) => (
                        <option key={v}>{v}</option>
                      ))}
                    </select>
                  </label>
                </div>
                <p role="status" className="sr-only">
                  {results.length} système{results.length > 1 ? "s" : ""}
                </p>
                <div className="play-grid">
                  {results.map((p) => (
                    <article className="play-card" key={p.id}>
                      <div className="card-preview">
                        {p.commonSteps[0] ? (
                          <PlayDiagram
                            play={p}
                            step={p.commonSteps[0]}
                            miniature
                          />
                        ) : (
                          <Court miniature />
                        )}
                        <span
                          className={`card-status ${p.status === "draft" || p.status === "needs-review" ? "draft" : ""}`}
                        >
                          {p.status === "draft"
                            ? "Brouillon"
                            : p.status === "needs-review"
                              ? "À confirmer"
                              : p.status === "edited"
                                ? "Modifié"
                                : "Importé"}
                        </span>
                        <span className="card-index" aria-hidden="true">
                          {String(library.plays.indexOf(p) + 1).padStart(
                            2,
                            "0",
                          )}
                        </span>
                      </div>
                      <div className="card-body">
                        <div className="card-category">
                          {p.metadata.category}
                        </div>
                        <h3>{p.name}</h3>
                        <p>{p.metadata.description}</p>
                        <div className="card-bottom">
                          <span>
                            {p.status === "draft"
                              ? "À définir"
                              : `${p.commonSteps.length} étapes${p.branches.length ? " communes" : ""}`}
                          </span>
                          <a
                            href={href("editor", p)}
                            aria-label={`Ouvrir ${p.name}`}
                          >
                            Ouvrir <Arrow />
                          </a>
                        </div>
                      </div>
                    </article>
                  ))}
                </div>
                {results.length === 0 && (
                  <div className="empty-state">
                    <h3>Aucun système trouvé</h3>
                    <p>Essayez un autre nom ou un autre filtre.</p>
                    <button
                      onClick={() => {
                        setQuery("");
                        setFilter("Tous les systèmes");
                        setCollection("all");
                      }}
                    >
                      Réinitialiser la recherche
                    </button>
                  </div>
                )}
              </section>
            </>
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
                <PlayViewer
                  key={play.id}
                  play={play}
                  presentation={presentation}
                  court={library.preferences.courtPreview}
                  onCourt={(kind) => {
                    void updatePreferences(kind);
                  }}
                  saving={
                    status === "loading" ||
                    status === "saving" ||
                    status === "error"
                  }
                />
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
