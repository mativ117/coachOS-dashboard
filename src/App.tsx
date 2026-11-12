import { useEffect, useRef, useState } from "react";
import { Arrow } from "./components/Arrow";
import { Court, type CourtKind } from "./components/Court";
import { catalog, type CatalogPlay } from "./library/catalog";

type Space = "library" | "editor" | "presentation";
const labels: Record<Space, string> = {
  library: "Bibliothèque",
  editor: "Éditeur",
  presentation: "Présentation",
};
function readRoute() {
  const [path, query = ""] = window.location.hash.slice(1).split("?");
  const space: Space =
    path === "/editor"
      ? "editor"
      : path === "/presentation"
        ? "presentation"
        : "library";
  return {
    space,
    play:
      catalog.find((p) => p.id === new URLSearchParams(query).get("play")) ??
      catalog[0],
  };
}
const href = (space: Space, play?: CatalogPlay) =>
  `#/${space}${play ? `?play=${play.id}` : ""}`;

export function App() {
  const [route, setRoute] = useState(readRoute);
  const [query, setQuery] = useState("");
  const [filter, setFilter] = useState("Tous les systèmes");
  const [court, setCourt] = useState<CourtKind>("half");
  const main = useRef<HTMLElement>(null);
  useEffect(() => {
    const onRoute = () => {
      setRoute(readRoute());
      main.current?.focus();
    };
    window.addEventListener("hashchange", onRoute);
    return () => window.removeEventListener("hashchange", onRoute);
  }, []);
  useEffect(() => {
    document.title = `CoachOS · ${labels[route.space]}`;
  }, [route.space]);
  const results = catalog.filter(
    (p) =>
      `${p.name} ${p.description}`
        .toLocaleLowerCase("fr")
        .includes(query.toLocaleLowerCase("fr")) &&
      (filter === "Tous les systèmes" ||
        (filter === "Brouillons" ? p.draft : p.category === filter)),
  );
  const presentation = route.space === "presentation";
  return (
    <div className={`app ${presentation ? "is-presenting" : ""}`}>
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
              href={href(space, route.play)}
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
            Espace personnel<small>CoachOS · Version de travail</small>
          </div>
        </div>
      </aside>
      <div className="main-wrap">
        <header className="topbar">
          <span>
            Mon espace <span className="breadcrumb-divider">/</span>{" "}
            <strong>{labels[route.space]}</strong>
          </span>
          <span className="phase-badge">Aperçu · Phase 1</span>
        </header>
        <main id="main-content" ref={main} tabIndex={-1}>
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
                <div className="heading-mark" aria-hidden="true">
                  <Arrow />
                </div>
              </div>
              <div className="notice">
                <span className="notice-icon" aria-hidden="true">
                  i
                </span>
                <p>
                  <strong>Le terrain prend forme.</strong> Cet aperçu présente
                  les espaces de CoachOS. Les cartes reprennent l’inventaire ;
                  les mouvements, l’édition et la sauvegarde arrivent aux
                  prochaines étapes.
                </p>
              </div>
              <section
                className="library-section"
                aria-labelledby="systems-heading"
              >
                <div className="section-heading">
                  <h2 id="systems-heading">
                    Mes systèmes <span className="count">{catalog.length}</span>
                  </h2>
                  <span className="section-meta">6 sources · 2 brouillons</span>
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
                  {results.map((play) => (
                    <article className="play-card" key={play.id}>
                      <div className="card-preview">
                        <Court miniature />
                        <span
                          className={`card-status ${play.draft ? "draft" : ""}`}
                        >
                          {play.draft ? "Brouillon" : "Source à migrer"}
                        </span>
                        <span className="card-index" aria-hidden="true">
                          {String(catalog.indexOf(play) + 1).padStart(2, "0")}
                        </span>
                      </div>
                      <div className="card-body">
                        <div className="card-category">{play.category}</div>
                        <h3>{play.name}</h3>
                        <p>{play.description}</p>
                        <div className="card-bottom">
                          <span>
                            {play.draft
                              ? "À définir"
                              : `${play.steps} étapes${play.id === "pin-down-iso" ? " communes" : ""}`}
                          </span>
                          <a
                            href={href("editor", play)}
                            aria-label={`Ouvrir ${play.name}`}
                          >
                            Ouvrir{" "}
                            <span aria-hidden="true">
                              <Arrow />
                            </span>
                          </a>
                        </div>
                      </div>
                      <span className="sr-only">
                        Aperçu de terrain générique, sans les mouvements de ce
                        système.
                      </span>
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
                    {presentation ? "TRANSMETTRE LE JEU" : "DESSINER LE JEU"}
                  </p>
                  <h1>{route.play.name}</h1>
                  <p className="muted">
                    {presentation
                      ? "Un terrain lisible pour toute l’équipe."
                      : "Un espace pour construire vos prochaines séquences."}
                  </p>
                </div>
                <a
                  className="button button-primary"
                  href={href(
                    presentation ? "editor" : "presentation",
                    route.play,
                  )}
                >
                  {presentation ? "Retour à l’éditeur" : "Présenter"}{" "}
                  <span aria-hidden="true">
                    <Arrow />
                  </span>
                </a>
              </div>
              <div className="notice">
                <span className="notice-icon" aria-hidden="true">
                  i
                </span>
                <p>
                  <strong>Terrain de démonstration.</strong> Les positions
                  affichées sont génériques et ne représentent pas{" "}
                  {route.play.name}.{" "}
                  {presentation
                    ? "La lecture des étapes arrivera après la migration."
                    : "Les outils de dessin et la sauvegarde ne sont pas encore disponibles."}
                </p>
              </div>
              <section
                className="court-panel"
                aria-label={
                  presentation
                    ? "Aperçu de présentation"
                    : "Aperçu de l’éditeur"
                }
              >
                <div className="court-toolbar">
                  <div>
                    <span className="status-dot" />
                    <strong>
                      {presentation ? "Présentation" : "Aperçu du terrain"}
                    </strong>
                  </div>
                  <fieldset className="segmented">
                    <legend className="sr-only">Format du terrain</legend>
                    <button
                      aria-pressed={court === "half"}
                      onClick={() => setCourt("half")}
                    >
                      Demi-terrain
                    </button>
                    <button
                      aria-pressed={court === "full"}
                      onClick={() => setCourt("full")}
                    >
                      Terrain entier
                    </button>
                  </fieldset>
                </div>
                <div
                  className={`court-stage ${court === "full" ? "full-court" : ""}`}
                >
                  <Court kind={court} players />
                </div>
                <div className="court-caption">
                  <span>Disposition de démonstration</span>
                  <span>{court === "half" ? "15 × 14 m" : "15 × 28 m"}</span>
                </div>
              </section>
              <section
                className="instruction-panel"
                aria-labelledby="instruction-heading"
              >
                <span className="step-number" aria-hidden="true">
                  01
                </span>
                <div>
                  <p className="eyebrow">
                    {presentation ? "INSTRUCTION" : "PROCHAINE ÉTAPE"}
                  </p>
                  <h2 id="instruction-heading">
                    {route.play.draft
                      ? "Un concept à préciser"
                      : "Préserver chaque intention de jeu"}
                  </h2>
                  <p>
                    {route.play.draft
                      ? "Ce brouillon attend sa définition tactique. Aucun déplacement n’a été inventé."
                      : "La migration reprendra les étapes, les notes et les lectures du système source, sans modifier leur contenu."}
                  </p>
                </div>
              </section>
            </>
          )}
          <footer className="page-footer">
            <span>CoachOS</span>
            <span>Un terrain. Des idées. Votre jeu.</span>
          </footer>
        </main>
      </div>
    </div>
  );
}
