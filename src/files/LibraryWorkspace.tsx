import { useEffect, useRef, useState } from "react";
import type { Library, Profile } from "../model/types";
import { validateLibrary } from "../model/validate";
import { Court } from "../components/Court";
import { PlayDiagram } from "../components/PlayDiagram";
import { Arrow } from "../components/Arrow";
import { useFileActions } from "./useFileActions";
import { decodedLogo, readLogo } from "./logo";
import { MAX_FILE_SIZE, parseFile, type Incoming } from "./formats";
import { duplicateInLibrary } from "./import-plan";
import { ImportDialog, type CommitLibrary } from "./ImportDialog";
interface Props {
  library: Library;
  status: string;
  commit: CommitLibrary;
  readRecovery: () => Promise<Library | undefined>;
}
export function LibraryWorkspace({
  library,
  status,
  commit,
  readRecovery,
}: Props) {
  const io = useFileActions(library);
  const [query, setQuery] = useState(""),
    [filter, setFilter] = useState("Tous les systèmes"),
    [collection, setCollection] = useState("all");
  const [selected, setSelected] = useState<string[]>([]);
  const [incoming, setIncoming] = useState<{
    data: Incoming;
    recovery?: boolean;
  } | null>(null);
  const [reading, setReading] = useState(false);
  const [showFiles, setShowFiles] = useState(false);
  const fileInput = useRef<HTMLInputElement>(null);
  const [pngPlay, setPngPlay] = useState(library.plays[0]?.id ?? "");
  const [pngStep, setPngStep] = useState("");
  const [profile, setProfile] = useState<Profile>(
    library.profile ?? { coachName: "", team: "" },
  );
  const [orientation, setOrientation] = useState(
      library.preferences.exportOrientation ?? "auto",
    ),
    [includeNotes, setIncludeNotes] = useState(
      library.preferences.includeNotes !== false,
    ),
    [pngScale, setPngScale] = useState<2 | 3>(
      library.preferences.pngScale ?? 2,
    );
  const [settingsBusy, setSettingsBusy] = useState(false);
  const [newCollection, setNewCollection] = useState("");
  const idsKey = library.plays.map((p) => p.id).join(",");
  const collectionsKey = library.collections.map((c) => c.id).join(",");
  useEffect(() => {
    setSelected((s) =>
      s.filter((id) => library.plays.some((p) => p.id === id)),
    );
  }, [idsKey]);
  useEffect(() => {
    if (
      collection !== "all" &&
      !library.collections.some((c) => c.id === collection)
    )
      setCollection("all");
  }, [collectionsKey]);
  const settingsKey = JSON.stringify([library.profile, library.preferences]);
  useEffect(() => {
    setProfile(library.profile ?? { coachName: "", team: "" });
    setOrientation(library.preferences.exportOrientation ?? "auto");
    setIncludeNotes(library.preferences.includeNotes !== false);
    setPngScale(library.preferences.pngScale ?? 2);
  }, [settingsKey]);
  const writable = status === "saved" && !reading && !settingsBusy;
  const filtered = library.plays.filter(
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
  const chosenPlay =
    library.plays.find((p) => p.id === pngPlay) ?? library.plays[0];
  const entries = chosenPlay
    ? [
        ...chosenPlay.commonSteps.map((step, i) => ({
          play: chosenPlay,
          step,
          label: `Tronc commun · Étape ${i + 1}`,
          first: i === 0,
        })),
        ...chosenPlay.branches.flatMap((b) =>
          b.steps.map((step, i) => ({
            play: chosenPlay,
            step,
            label: `Lecture « ${b.name} » · Étape ${i + 1}`,
            first: false,
          })),
        ),
      ]
    : [];
  const chosenStage = entries.find((e) => e.step.id === pngStep) ?? entries[0];
  async function operation(next: Library, preserve = false) {
    try {
      io.setError("");
      await commit(validateLibrary(next), library.revision, preserve);
    } catch (e) {
      io.setError(e instanceof Error ? e.message : "Opération impossible.");
    }
  }
  async function read(file: File) {
    setReading(true);
    io.setError("");
    try {
      if (file.size > MAX_FILE_SIZE)
        throw new Error("Fichier trop volumineux : maximum 4 Mo.");
      const raw = new TextDecoder("utf-8", { fatal: true }).decode(
        await file.arrayBuffer(),
      );
      const source = parseFile(raw);
      if (source.kind === "backup" && source.library.profile?.logoDataUrl)
        await decodedLogo(source.library.profile.logoDataUrl);
      setIncoming({ data: source });
    } catch (e) {
      io.setError(e instanceof Error ? e.message : "Fichier illisible.");
    } finally {
      setReading(false);
    }
  }
  async function recover() {
    try {
      io.setError("");
      const previous = await readRecovery();
      if (!previous) {
        io.setMessage("Aucun état précédent disponible.");
        return;
      }
      setIncoming({
        data: { kind: "backup", library: previous, legacy: false },
        recovery: true,
      });
    } catch (e) {
      io.setError((e as Error).message);
    }
  }
  return (
    <section
      className="library-workspace"
      aria-label="Bibliothèque et fichiers"
    >
      <div className="library-filebar">
        <button
          onClick={() => setShowFiles((v) => !v)}
          aria-expanded={showFiles}
        >
          Fichiers et exports
        </button>
        <button
          disabled={!writable || io.busy}
          onClick={() => fileInput.current?.click()}
        >
          {reading ? "Lecture du fichier…" : "Importer un fichier"}
        </button>
        <button onClick={io.backup}>Sauvegarder la bibliothèque</button>
        <input
          ref={fileInput}
          aria-label="Fichier CoachOS à importer"
          type="file"
          accept=".coachos,.coachos-backup,.json,application/json"
          hidden
          onChange={(e) => {
            const file = e.currentTarget.files?.[0];
            e.currentTarget.value = "";
            if (file) void read(file);
          }}
        />
      </div>
      {showFiles && (
        <div className="file-panel">
          <div className="export-selection">
            <strong>PDF</strong>
            <p>
              {
                selected.filter((id) => library.plays.some((p) => p.id === id))
                  .length
              }{" "}
              systèmes sélectionnés sur les cartes.
            </p>
            <button
              disabled={io.busy || !selected.length}
              onClick={() => {
                void io.graphics(
                  "pdf",
                  library.plays.filter((p) => selected.includes(p.id)),
                );
              }}
            >
              PDF de la sélection
            </button>
            <button onClick={() => setSelected(library.plays.map((p) => p.id))}>
              Tout sélectionner
            </button>
            <button onClick={() => setSelected([])}>Désélectionner</button>
          </div>
          <div className="png-export">
            <strong>PNG d’une étape</strong>
            <label>
              Système
              <select
                aria-label="Système à exporter en PNG"
                value={chosenPlay?.id ?? ""}
                onChange={(e) => {
                  setPngPlay(e.target.value);
                  setPngStep("");
                }}
              >
                {library.plays.map((p) => (
                  <option key={p.id} value={p.id}>
                    {p.name}
                  </option>
                ))}
              </select>
            </label>
            <label>
              Étape
              <select
                aria-label="Étape à exporter en PNG"
                value={chosenStage?.step.id ?? ""}
                onChange={(e) => setPngStep(e.target.value)}
              >
                {entries.map((e) => (
                  <option key={e.step.id} value={e.step.id}>
                    {e.label} · {e.step.title}
                  </option>
                ))}
              </select>
            </label>
            <button
              disabled={io.busy || !chosenStage}
              onClick={() => {
                if (chosenStage) void io.graphics("png", chosenStage);
              }}
            >
              Exporter le PNG
            </button>
          </div>
          <button
            disabled={!writable || io.busy}
            onClick={() => {
              void recover();
            }}
          >
            Récupérer l’état précédent
          </button>
          <p className="file-help">
            Une copie complète conserve systèmes, collections, profil et
            préférences. Un fichier .coachos conserve un système éditable. PNG
            et PDF servent à présenter, pas à rééditer.
          </p>
        </div>
      )}
      {io.busy && (
        <div className="file-progress" role="status">
          {io.progress}
          <button onClick={io.cancel}>Annuler l’export</button>
        </div>
      )}
      {io.error && (
        <p className="editor-error" role="alert">
          {io.error}
        </p>
      )}
      {io.message && (
        <p className="file-message" role="status">
          {io.message}
        </p>
      )}
      {io.result && (
        <div className="last-file">
          <span>Fichier prêt : {io.result.name}</span>
          <button onClick={io.download}>Télécharger à nouveau</button>
          <button
            onClick={() => {
              void io.share();
            }}
          >
            Partager le fichier
          </button>
        </div>
      )}
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
          <select value={filter} onChange={(e) => setFilter(e.target.value)}>
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
      <div className="section-heading">
        <h2>
          Mes systèmes <span className="count">{library.plays.length}</span>
        </h2>
        <span className="section-meta">{filtered.length} affichés</span>
      </div>
      <p className="sr-only" role="status">
        {filtered.length} systèmes affichés
      </p>
      <div className="play-grid">
        {filtered.map((p) => (
          <article className="play-card" key={p.id}>
            <div className="card-preview">
              {p.commonSteps[0] ? (
                <PlayDiagram play={p} step={p.commonSteps[0]} miniature />
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
            </div>
            <div className="card-body">
              <div className="card-category">{p.metadata.category}</div>
              <h3>{p.name}</h3>
              <p>{p.metadata.description}</p>
              <div className="card-bottom">
                <label className="card-select">
                  <input
                    type="checkbox"
                    aria-label={`Sélectionner ${p.name}`}
                    checked={selected.includes(p.id)}
                    onChange={(e) =>
                      setSelected((s) =>
                        e.target.checked
                          ? [...s, p.id]
                          : s.filter((id) => id !== p.id),
                      )
                    }
                  />
                  PDF
                </label>
                <a
                  href={`#/editor?play=${encodeURIComponent(p.id)}`}
                  aria-label={`Ouvrir ${p.name}`}
                >
                  Ouvrir <Arrow />
                </a>
              </div>
              <details className="card-menu">
                <summary>Options du système</summary>
                <div>
                  <button onClick={() => io.system(p)}>
                    Exporter .coachos
                  </button>
                  <button
                    disabled={io.busy}
                    onClick={() => {
                      void io.graphics("pdf", [p]);
                    }}
                  >
                    PDF du système
                  </button>
                  <button
                    disabled={!writable}
                    onClick={() => {
                      try {
                        void operation(duplicateInLibrary(library, p.id));
                      } catch (e) {
                        io.setError((e as Error).message);
                      }
                    }}
                  >
                    Dupliquer
                  </button>
                  <fieldset>
                    <legend>Collections</legend>
                    {library.collections.map((c) => (
                      <label className="checkbox-label" key={c.id}>
                        <input
                          type="checkbox"
                          aria-label={`${p.name} dans ${c.name}`}
                          checked={c.playIds.includes(p.id)}
                          disabled={!writable}
                          onChange={(e) => {
                            const checked = e.target.checked;
                            void operation({
                              ...library,
                              collections: library.collections.map((other) =>
                                other.id === c.id
                                  ? {
                                      ...other,
                                      playIds: checked
                                        ? [...new Set([...other.playIds, p.id])]
                                        : other.playIds.filter(
                                            (id) => id !== p.id,
                                          ),
                                    }
                                  : other,
                              ),
                            });
                          }}
                        />
                        {c.name}
                      </label>
                    ))}
                  </fieldset>
                </div>
              </details>
            </div>
          </article>
        ))}
      </div>
      {!filtered.length && (
        <div className="empty-state">
          <h3>Aucun système trouvé</h3>
          <p>Créez un système ou ajustez les filtres.</p>
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
      <div className="library-settings-grid">
        <details className="editor-panel">
          <summary>Gérer les collections</summary>
          <div className="panel-body">
            <form
              onSubmit={(e) => {
                e.preventDefault();
                if (newCollection.trim()) {
                  void operation({
                    ...library,
                    collections: [
                      ...library.collections,
                      {
                        id: `collection-${crypto.randomUUID()}`,
                        name: newCollection.trim(),
                        playIds: [],
                      },
                    ],
                  }).then(() => setNewCollection(""));
                }
              }}
            >
              <label>
                Nouvelle collection
                <input
                  aria-label="Nom de la collection"
                  value={newCollection}
                  maxLength={120}
                  onChange={(e) => setNewCollection(e.target.value)}
                  required
                />
              </label>
              <button disabled={!writable}>Créer la collection</button>
            </form>
            {library.collections.map((c) => (
              <form
                key={c.id}
                onSubmit={(e) => {
                  e.preventDefault();
                  const name = String(
                    new FormData(e.currentTarget).get("name"),
                  ).trim();
                  if (name)
                    void operation({
                      ...library,
                      collections: library.collections.map((other) =>
                        other.id === c.id ? { ...other, name } : other,
                      ),
                    });
                }}
              >
                <label>
                  Renommer {c.name}
                  <input
                    name="name"
                    aria-label={`Nom de ${c.name}`}
                    maxLength={120}
                    defaultValue={c.name}
                    key={c.name}
                    required
                  />
                </label>
                <div className="inline-actions">
                  <button disabled={!writable}>Renommer</button>
                  <button
                    type="button"
                    className="danger-button"
                    disabled={!writable}
                    onClick={() => {
                      if (
                        confirm(
                          `Supprimer la collection « ${c.name} » ? Ses systèmes sont conservés.`,
                        )
                      ) {
                        void operation(
                          {
                            ...library,
                            collections: library.collections.filter(
                              (other) => other.id !== c.id,
                            ),
                          },
                          true,
                        );
                        if (collection === c.id) setCollection("all");
                      }
                    }}
                  >
                    Supprimer la collection
                  </button>
                </div>
              </form>
            ))}
          </div>
        </details>
        <details className="editor-panel">
          <summary>Profil et préférences d’export</summary>
          <form
            className="panel-body"
            onSubmit={(e) => {
              e.preventDefault();
              void operation({
                ...library,
                librarySchemaVersion: 2,
                profile,
                preferences: {
                  ...library.preferences,
                  exportOrientation: orientation,
                  includeNotes,
                  pngScale,
                },
              });
            }}
          >
            <label>
              Nom du coach
              <input
                aria-label="Nom du coach"
                maxLength={120}
                value={profile.coachName}
                onChange={(e) =>
                  setProfile((p) => ({ ...p, coachName: e.target.value }))
                }
              />
            </label>
            <label>
              Équipe
              <input
                aria-label="Équipe"
                maxLength={120}
                value={profile.team}
                onChange={(e) =>
                  setProfile((p) => ({ ...p, team: e.target.value }))
                }
              />
            </label>
            <label>
              Logo PNG ou JPEG
              <input
                aria-label="Logo de l’équipe"
                type="file"
                accept="image/png,image/jpeg"
                onChange={async (e) => {
                  const file = e.currentTarget.files?.[0];
                  e.currentTarget.value = "";
                  if (!file) return;
                  setSettingsBusy(true);
                  try {
                    const logo = await readLogo(file);
                    setProfile((p) => ({ ...p, logoDataUrl: logo }));
                    io.setError("");
                  } catch (err) {
                    io.setError((err as Error).message);
                  } finally {
                    setSettingsBusy(false);
                  }
                }}
              />
            </label>
            {profile.logoDataUrl && (
              <div className="profile-logo">
                <img src={profile.logoDataUrl} alt="Logo de l’équipe" />
                <button
                  type="button"
                  onClick={() =>
                    setProfile((p) => {
                      const next = { ...p };
                      delete next.logoDataUrl;
                      return next;
                    })
                  }
                >
                  Retirer le logo
                </button>
              </div>
            )}
            <label>
              Orientation PDF
              <select
                aria-label="Orientation PDF"
                value={orientation}
                onChange={(e) =>
                  setOrientation(e.target.value as typeof orientation)
                }
              >
                <option value="auto">Automatique</option>
                <option value="portrait">Portrait</option>
                <option value="landscape">Paysage</option>
              </select>
            </label>
            <label className="checkbox-label">
              <input
                type="checkbox"
                checked={includeNotes}
                onChange={(e) => setIncludeNotes(e.target.checked)}
              />
              Inclure les notes dans le PDF
            </label>
            <label>
              Résolution PNG
              <select
                aria-label="Résolution PNG"
                value={pngScale}
                onChange={(e) => setPngScale(Number(e.target.value) as 2 | 3)}
              >
                <option value="2">Haute définition</option>
                <option value="3">Très haute définition</option>
              </select>
            </label>
            <button disabled={!writable}>Enregistrer les paramètres</button>
            <p>
              Profil facultatif et local. Le logo est normalisé en PNG ; aucun
              SVG actif ou lien distant n’est accepté.
            </p>
          </form>
        </details>
      </div>
      {incoming && (
        <ImportDialog
          library={library}
          incoming={incoming.data}
          recovery={incoming.recovery}
          onCommit={commit}
          onClose={() => {
            setIncoming(null);
            io.setMessage(
              "Aperçu fermé. La bibliothèque ne change que si une importation a été confirmée.",
            );
          }}
        />
      )}
    </section>
  );
}
