import { t } from "../i18n";
import { ExportControl } from "./ExportControl";
import { downloadEmergency } from "../import-export/emergency";
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
  const [deleted, setDeleted] = useState<{
    name: string;
    revision: number;
  } | null>(null);
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
  async function deletePlay(id: string, name: string) {
    if (
      !writable ||
      io.busy ||
      !confirm(
        t(
          "Supprimer le play « {0} » avec toutes ses étapes et lectures ? Il sera aussi retiré des collections.",
          name,
        ),
      )
    )
      return;
    try {
      io.setError("");
      io.setMessage("");
      const next = validateLibrary({
        ...library,
        plays: library.plays.filter((p) => p.id !== id),
        collections: library.collections.map((c) => ({
          ...c,
          playIds: c.playIds.filter((playId) => playId !== id),
        })),
      });
      await commit(next, library.revision, true);
      setDeleted({ name, revision: library.revision + 1 });
    } catch (e) {
      io.setError(e instanceof Error ? e.message : t("Opération impossible."));
    }
  }
  async function undoDelete() {
    if (
      !deleted ||
      deleted.revision !== library.revision ||
      !writable ||
      io.busy
    )
      return;
    try {
      io.setError("");
      const previous = await readRecovery();
      if (!previous) throw new Error(t("Aucun état précédent disponible."));
      await commit(previous, deleted.revision, false);
      setDeleted(null);
      io.setMessage(t("Suppression annulée."));
    } catch (e) {
      io.setError(e instanceof Error ? e.message : t("Opération impossible."));
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
      aria-label={t("Bibliothèque et fichiers")}
    >
      <div className="library-filebar">
        <button
          onClick={() => setShowFiles((v) => !v)}
          aria-expanded={showFiles}
        >
          {t("Exporter en PDF ou image")}
        </button>
        <details className="library-more">
          <summary>{t("Importer et sauvegarder")}</summary>
          <div className="library-more-actions">
            {" "}
            <button
              disabled={!writable || io.busy}
              onClick={() => fileInput.current?.click()}
            >
              {reading ? t("Lecture du fichier…") : t("Importer un fichier")}
            </button>
            <button onClick={io.backup}>
              {t("Sauvegarder la bibliothèque")}
            </button>
          </div>
        </details>
        <input
          ref={fileInput}
          aria-label={t("Fichier CoachOS à importer")}
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
            <strong>{t("PDF")}</strong>
            <p>
              {
                selected.filter((id) => library.plays.some((p) => p.id === id))
                  .length
              }{" "}
              {t("systèmes sélectionnés sur les cartes.")}
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
              {t("PDF de la sélection")}
            </button>
            <button
              disabled={io.busy || !selected.length}
              onClick={() => {
                void io.graphics(
                  "images",
                  library.plays.filter((p) => selected.includes(p.id)),
                );
              }}
            >
              {t("Tous les PNG de la sélection (.zip)")}
            </button>
            <button onClick={() => setSelected(filtered.map((p) => p.id))}>
              {t("Sélectionner les résultats (")}
              {filtered.length}
              {t(")")}
            </button>
            <button onClick={() => setSelected(library.plays.map((p) => p.id))}>
              {t("Toute la bibliothèque (")}
              {library.plays.length}
              {t(")")}
            </button>
            <button onClick={() => setSelected([])}>
              {t("Désélectionner")}
            </button>
          </div>
          <details className="png-export">
            <summary>{t("Une seule étape (PNG)")}</summary>
            <label>
              {t("Système")}
              <select
                aria-label={t("Système à exporter en PNG")}
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
              {t("Étape")}
              <select
                aria-label={t("Étape à exporter en PNG")}
                value={chosenStage?.step.id ?? ""}
                onChange={(e) => setPngStep(e.target.value)}
              >
                {entries.map((e) => (
                  <option key={e.step.id} value={e.step.id}>
                    {t(e.label)} {t("· ")}
                    {e.step.title}
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
              {t("Exporter le PNG")}
            </button>
          </details>
          <button
            disabled={!writable || io.busy}
            onClick={() => {
              void recover();
            }}
          >
            {t("Récupérer l’état précédent")}
          </button>
          <details>
            <summary>{t("Données et copie de secours")}</summary>
            <button onClick={() => downloadEmergency(library)}>
              {t("Exporter les données affichées (JSON)")}
            </button>
            <p>
              {t(
                "Pour récupérer les données affichées si une copie habituelle ne suffit pas.",
              )}
            </p>
          </details>
          <p className="file-help">
            {t(
              "Une copie complète conserve systèmes, collections, profil et préférences. Un fichier .coachos conserve un système éditable. PNG et PDF servent à présenter, pas à rééditer.",
            )}
          </p>
        </div>
      )}
      {io.busy && (
        <div className="file-progress" role="status">
          {t(io.progress)}
          <button onClick={io.cancel}>{t("Annuler l’export")}</button>
        </div>
      )}
      {io.error && (
        <p className="editor-error" role="alert">
          {t(io.error)}
        </p>
      )}
      {io.message && (
        <p className="file-message" role="status">
          {t(io.message)}
        </p>
      )}
      {deleted?.revision === library.revision && (
        <div className="delete-feedback" role="status">
          <span>{t("Play « {0} » supprimé.", deleted.name)}</span>
          <button
            autoFocus
            disabled={!writable || io.busy}
            onClick={() => {
              void undoDelete();
            }}
          >
            {t("Annuler la suppression de {0}", deleted.name)}
          </button>
        </div>
      )}
      {io.result && (
        <div className="last-file">
          <span>
            {t("Fichier prêt : ")}
            {io.result.name}
          </span>
          <button onClick={io.download}>{t("Télécharger à nouveau")}</button>
          <button
            onClick={() => {
              void io.share();
            }}
          >
            {t("Partager le fichier")}
          </button>
        </div>
      )}
      <div className="filters">
        <label className="search">
          <span aria-hidden="true">{t("⌕")}</span>
          <span className="sr-only">{t("Rechercher un système")}</span>
          <input
            type="search"
            placeholder={t("Rechercher un système…")}
            value={query}
            onChange={(e) => setQuery(e.target.value)}
          />
        </label>
        <label className="filter">
          <span className="sr-only">{t("Filtrer les collections")}</span>
          <select
            value={collection}
            onChange={(e) => setCollection(e.target.value)}
          >
            <option value="all">{t("Toutes les collections")}</option>
            {library.collections.map((c) => (
              <option key={c.id} value={c.id}>
                {c.name}
              </option>
            ))}
          </select>
        </label>
        <label className="filter">
          <span className="sr-only">{t("Filtrer les systèmes")}</span>
          <select value={filter} onChange={(e) => setFilter(e.target.value)}>
            {[
              "Tous les systèmes",
              "Demi-terrain",
              "Remise en jeu",
              "Attaque de zone",
              "Brouillons",
            ].map((v) => (
              <option key={v} value={v}>
                {t(v)}
              </option>
            ))}
          </select>
        </label>
      </div>
      <div className="section-heading">
        <h2>
          {t("Mes systèmes ")}
          <span className="count">{library.plays.length}</span>
        </h2>
        <span className="section-meta">
          {filtered.length} {t("affichés")}
        </span>
      </div>
      <p className="sr-only" role="status">
        {filtered.length} {t("systèmes affichés")}
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
                  ? t("Brouillon")
                  : p.status === "needs-review"
                    ? t("À confirmer")
                    : p.status === "edited"
                      ? t("Modifié")
                      : t("Importé")}
              </span>
            </div>
            <div className="card-body">
              <div className="card-category">{t(p.metadata.category)}</div>
              <h3>{p.name}</h3>
              <p>{p.metadata.description}</p>
              <div className="card-bottom">
                <ExportControl
                  library={library}
                  play={p}
                  step={p.commonSteps[0]}
                  label={t("Exporter {0}", p.name)}
                />

                <a
                  href={`#/editor?play=${encodeURIComponent(p.id)}`}
                  aria-label={t("Ouvrir {0}", p.name)}
                >
                  {t("Ouvrir ")}
                  <Arrow />
                </a>
                {showFiles && (
                  <label className="card-select">
                    <input
                      type="checkbox"
                      aria-label={t("Sélectionner {0}", p.name)}
                      checked={selected.includes(p.id)}
                      onChange={(e) =>
                        setSelected((s) =>
                          e.target.checked
                            ? [...s, p.id]
                            : s.filter((id) => id !== p.id),
                        )
                      }
                    />
                    {t("Choisir pour le PDF")}
                  </label>
                )}
              </div>
              <details className="card-menu">
                <summary>{t("Options du système")}</summary>
                <div>
                  <button onClick={() => io.system(p)}>
                    {t("Exporter .coachos")}
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
                    {t("Dupliquer")}
                  </button>
                  <button
                    className="danger-button"
                    disabled={!writable || io.busy}
                    onClick={() => {
                      void deletePlay(p.id, p.name);
                    }}
                  >
                    {t("Supprimer le play")}
                  </button>
                  <fieldset>
                    <legend>{t("Collections")}</legend>
                    {library.collections.map((c) => (
                      <label className="checkbox-label" key={c.id}>
                        <input
                          type="checkbox"
                          aria-label={t("{0} dans {1}", p.name, c.name)}
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
          <h3>{t("Aucun système trouvé")}</h3>
          <p>{t("Créez un système ou ajustez les filtres.")}</p>
          <button
            onClick={() => {
              setQuery("");
              setFilter("Tous les systèmes");
              setCollection("all");
            }}
          >
            {t("Réinitialiser la recherche")}
          </button>
        </div>
      )}
      <div className="library-settings-grid">
        <details className="editor-panel">
          <summary>{t("Gérer les collections")}</summary>
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
                {t("Nouvelle collection")}
                <input
                  aria-label={t("Nom de la collection")}
                  value={newCollection}
                  maxLength={120}
                  onChange={(e) => setNewCollection(e.target.value)}
                  required
                />
              </label>
              <button disabled={!writable}>{t("Créer la collection")}</button>
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
                  {t("Renommer ")}
                  {c.name}
                  <input
                    name="name"
                    aria-label={t("Nom de {0}", c.name)}
                    maxLength={120}
                    defaultValue={c.name}
                    key={c.name}
                    required
                  />
                </label>
                <div className="inline-actions">
                  <button disabled={!writable}>{t("Renommer")}</button>
                  <button
                    type="button"
                    className="danger-button"
                    disabled={!writable}
                    onClick={() => {
                      if (
                        confirm(
                          t(
                            "Supprimer la collection « {0} » ? Ses systèmes sont conservés.",
                            c.name,
                          ),
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
                    {t("Supprimer la collection")}
                  </button>
                </div>
              </form>
            ))}
          </div>
        </details>
        <details className="editor-panel">
          <summary>{t("Profil et préférences d’export")}</summary>
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
              {t("Nom du coach")}
              <input
                aria-label={t("Nom du coach")}
                maxLength={120}
                value={profile.coachName}
                onChange={(e) =>
                  setProfile((p) => ({ ...p, coachName: e.target.value }))
                }
              />
            </label>
            <label>
              {t("Équipe")}
              <input
                aria-label={t("Équipe")}
                maxLength={120}
                value={profile.team}
                onChange={(e) =>
                  setProfile((p) => ({ ...p, team: e.target.value }))
                }
              />
            </label>
            <label>
              {t("Logo PNG ou JPEG")}
              <input
                aria-label={t("Logo de l’équipe")}
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
                <img src={profile.logoDataUrl} alt={t("Logo de l’équipe")} />
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
                  {t("Retirer le logo")}
                </button>
              </div>
            )}
            <label>
              {t("Orientation PDF")}
              <select
                aria-label={t("Orientation PDF")}
                value={orientation}
                onChange={(e) =>
                  setOrientation(e.target.value as typeof orientation)
                }
              >
                <option value="auto">{t("Automatique")}</option>
                <option value="portrait">{t("Portrait")}</option>
                <option value="landscape">{t("Paysage")}</option>
              </select>
            </label>
            <label className="checkbox-label">
              <input
                type="checkbox"
                checked={includeNotes}
                onChange={(e) => setIncludeNotes(e.target.checked)}
              />
              {t("Inclure les notes dans le PDF")}
            </label>
            <label>
              {t("Résolution PNG")}
              <select
                aria-label={t("Résolution PNG")}
                value={pngScale}
                onChange={(e) => setPngScale(Number(e.target.value) as 2 | 3)}
              >
                <option value="2">{t("Haute définition")}</option>
                <option value="3">{t("Très haute définition")}</option>
              </select>
            </label>
            <button disabled={!writable}>
              {t("Enregistrer les paramètres")}
            </button>
            <p>
              {t(
                "Profil facultatif et local. Le logo est normalisé en PNG ; aucun SVG actif ou lien distant n’est accepté.",
              )}
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
