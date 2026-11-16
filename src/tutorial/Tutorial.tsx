import { t } from "../i18n";
import { useRef } from "react";
import { PracticeBoard } from "./PracticeBoard";

export function Tutorial({ returnHref }: { returnHref: string }) {
  const sections = useRef<Record<string, HTMLElement | null>>({});
  function jump(id: string) {
    const target = sections.current[id];
    if (target instanceof HTMLDetailsElement) target.open = true;
    target?.scrollIntoView({
      block: "start",
      behavior: matchMedia("(prefers-reduced-motion: reduce)").matches
        ? "auto"
        : "smooth",
    });
    target?.focus({ preventScroll: true });
  }
  return (
    <article className="tutorial-page">
      <header className="tutorial-heading">
        <p className="eyebrow">{t("LE GUIDE COACHOS")}</p>
        <h1>{t("Prendre en main CoachOS")}</h1>
        <p>
          {t(
            "Place tes joueurs, dessine le mouvement, puis passe à l’étape suivante.",
          )}
        </p>
        <a className="button button-primary" href={returnHref}>
          {t("Revenir à mon espace")}
        </a>
      </header>
      <nav
        className="tutorial-shortcuts"
        aria-label={t("Accès rapide au tuto")}
      >
        <button onClick={() => jump("exercise")}>
          {t("Essayer les gestes")}
        </button>
        <button onClick={() => jump("ballon")}>
          {t("Déplacer le ballon")}
        </button>
        <button onClick={() => jump("dessin")}>
          {t("Dessiner un mouvement")}
        </button>
        <button onClick={() => jump("etapes")}>
          {t("Comprendre les étapes")}
        </button>
        <button onClick={() => jump("sauvegarde")}>
          {t("Sauvegarder et exporter")}
        </button>
      </nav>
      <section className="tutorial-card">
        <span className="tutorial-number" aria-hidden="true">
          {t("1")}
        </span>
        <h2>{t("Commencer par le placement")}</h2>
        <p>
          {t("Dans ")}
          <strong>{t("Bibliothèque")}</strong>
          {t(", choisis")} <strong>{t("+ Nouveau système")}</strong>
          {t(
            ", donne-lui un nom et valide. Le terrain s’ouvre avec cinq joueurs et le ballon : c’est l’étape",
          )}{" "}
          <strong>{t("Placement")}</strong>
          {t(".")}
        </p>
        <p>
          {t("Avec ")}
          <strong>{t("Déplacer")}</strong>
          {t(
            ", clique ou appuie sur un joueur, puis sur l’endroit où tu veux le placer. Tu peux aussi le faire glisser. Ce geste place le pion ; il ne dessine pas une course.",
          )}
        </p>
        <p>
          {t("Baseline et Losange sont des brouillons vides : utilise")}{" "}
          <strong>{t("Initialiser 5 joueurs")}</strong> {t("pour commencer.")}
        </p>
      </section>
      <section
        className="tutorial-card"
        ref={(node) => {
          sections.current.ballon = node;
        }}
        tabIndex={-1}
      >
        <span className="tutorial-number ball-number" aria-hidden="true">
          {t("2")}
        </span>
        <h2>{t("Donner le ballon à un autre joueur")}</h2>
        <ol className="tutorial-steps">
          <li>
            {t("Vérifie que l’outil ")}
            <strong>{t("Déplacer")}</strong> {t("est actif.")}
          </li>
          <li>
            {t("Clique ou appuie sur le ")}
            <strong>{t("petit ballon orange")}</strong>
            {t(", près de son porteur.")}
          </li>
          <li>
            {t("Clique ou appuie sur le ")}
            <strong>{t("joueur qui doit le recevoir")}</strong>
            {t(".")}
          </li>
        </ol>
        <p>
          {t(
            "Le ballon s’attache à ce joueur et suit ensuite ses déplacements. Tu peux aussi glisser le ballon directement sur lui.",
          )}
        </p>
        <p>
          {t("Pour un ")}
          <strong>{t("ballon libre")}</strong>
          {t(
            ", sélectionne le ballon puis un endroit vide du terrain, ou glisse-le à cet endroit. S’il n’y a aucun ballon, utilise ",
          )}
          <strong>{t("Ajouter le ballon")}</strong>
          {t(".")}
        </p>
        <p className="tutorial-tip">
          {t(
            "Cliquer seulement sur un joueur le sélectionne. Pour changer le porteur, commence bien par le ballon.",
          )}
        </p>
      </section>
      <section
        className="tutorial-card"
        ref={(node) => {
          sections.current.etapes = node;
        }}
        tabIndex={-1}
      >
        <span className="tutorial-number" aria-hidden="true">
          {t("3")}
        </span>
        <h2>{t("Construire une étape à la fois")}</h2>
        <p>
          {t("Quand le placement est prêt, choisis ")}
          <strong>{t("+ Étape")}</strong>
          {t(
            ". Cette nouvelle étape reprend les positions et le ballon de la précédente, avec un terrain sans nouveau tracé.",
          )}
        </p>
        <p>
          {t(
            "Dessine ce qui se passe dans cette étape, puis choisis à nouveau",
          )}{" "}
          <strong>{t("+ Étape")}</strong>{" "}
          {t(
            "pour continuer. Les positions d’arrivée deviennent les positions de départ de l’étape suivante.",
          )}
        </p>
        <p>
          {t(
            "Utilise les boutons numérotés au-dessus du terrain pour revenir à une étape. Une étape déjà créée garde ses propres actions : revenir en arrière ne l’efface pas.",
          )}
        </p>
      </section>
      <section
        className="tutorial-card"
        ref={(node) => {
          sections.current.dessin = node;
        }}
        tabIndex={-1}
      >
        <span className="tutorial-number" aria-hidden="true">
          {t("4")}
        </span>
        <h2>{t("Dessiner les mouvements et les passes")}</h2>
        <dl className="tutorial-tools">
          <div>
            <dt>{t("Tracer · un mouvement")}</dt>
            <dd>
              {t("Choisis ")}
              <strong>{t("Tracer")}</strong>
              {t(
                ", pars du joueur et dessine son trajet au doigt ou à la souris. Relâche : le trait est nettoyé. Une courbe reste courbe ; un zigzag garde ses angles. Le joueur arrive au bout du trajet.",
              )}
            </dd>
          </div>
          <div>
            <dt>{t("Passe · du passeur au receveur")}</dt>
            <dd>
              {t("Choisis ")}
              <strong>{t("Passe")}</strong>{" "}
              {t(
                "et trace du joueur qui donne le ballon vers celui qui le reçoit. Tu peux aussi appuyer sur les deux joueurs. Le trait pointillé représente la passe.",
              )}
            </dd>
          </div>
          <div>
            <dt>{t("Exécuter cette passe")}</dt>
            <dd>
              {t(
                "Une passe dessinée est d’abord une option. Dans ses réglages, coche ",
              )}
              <strong>{t("Exécuter cette passe")}</strong>{" "}
              {t(
                "pour qu’elle transfère le ballon pendant la lecture. Le passeur doit bien avoir le ballon au départ.",
              )}
            </dd>
          </div>
          <div>
            <dt>{t("Autres → Écran")}</dt>
            <dd>
              {t("Choisis ")}
              <strong>{t("Écran")}</strong> {t("dans ")}
              <strong>{t("Autres")}</strong>
              {t(
                ", puis dessine le trajet du poseur. La barre en T est ajoutée à l’arrivée.",
              )}
            </dd>
          </div>
          <div>
            <dt>{t("Autres → Annotation")}</dt>
            <dd>
              {t(
                "Saisis ton texte dans le panneau qui s’ouvre, puis appuie sur le terrain pour le placer.",
              )}
            </dd>
          </div>
        </dl>
        <p className="tutorial-tip">
          {t(
            "Déplacer le ballon change sa position ou son porteur. Pour montrer une passe dans le système, dessine-la avec l’outil Passe.",
          )}
        </p>
        <p>
          {t("Après un dessin, CoachOS revient à ")}
          <strong>{t("Déplacer")}</strong>
          {t(". Choisis à nouveau ")}
          <strong>{t("Tracer")}</strong> {t("pour ajouter un autre mouvement.")}
        </p>
        <details>
          <summary>{t("Corriger un dessin ou annuler")}</summary>
          <p>
            {t(
              "Avec Déplacer, sélectionne le tracé : ses points peuvent être déplacés directement. Ses réglages permettent aussi de le supprimer.",
            )}{" "}
            <strong>{t("Annuler")}</strong> {t("retire le dernier geste ;")}{" "}
            <strong>{t("Rétablir")}</strong>{" "}
            {t("le remet. Sur ordinateur : Ctrl/Cmd Z, puis Ctrl/Cmd Maj Z.")}
          </p>
          <p>
            {t("Pour abandonner un tracé en cours : ")}
            <strong>{t("Échap")}</strong> {t("ou le bouton ")}
            <strong>{t("Annuler le tracé")}</strong>{" "}
            {t(
              "lorsqu’il est proposé. Les extrémités d’une passe restent attachées aux joueurs.",
            )}
          </p>
        </details>
      </section>
      <details
        className="tutorial-exercise"
        ref={(node) => {
          sections.current.exercise = node;
        }}
        tabIndex={-1}
      >
        <summary>
          {t("Essayer les gestes sur un terrain d’entraînement")}
        </summary>
        <PracticeBoard />
      </details>
      <section className="tutorial-card">
        <span className="tutorial-number" aria-hidden="true">
          {t("5")}
        </span>
        <h2>{t("Relire, noter et présenter")}</h2>
        <p>
          <strong>{t("Lire l’étape")}</strong>{" "}
          {t(
            "ouvre un aperçu animé. Utilise Lire, Pause, la vitesse et les étapes pour vérifier ton système, puis",
          )}{" "}
          <strong>{t("Revenir à l’édition")}</strong> {t("pour continuer.")}
        </p>
        <p>
          {t("Le panneau ")}
          <strong>{t("Notes")}</strong>{" "}
          {t(
            "sert à nommer l’étape et écrire une consigne. Pour présenter à l’équipe, ouvre l’espace",
          )}{" "}
          <strong>{t("Présentation")}</strong>
          {t(".")}
        </p>
        <p>
          {t("Si une étape est signalée ")}
          <strong>{t("statique · à confirmer")}</strong>
          {t(
            ", les informations ne suffisent pas pour une animation fiable. Les tracés restent visibles ; vérifie le joueur associé, le ballon et les mouvements. Stack conserve ses coordonnées source tant que ses dimensions ne sont pas confirmées.",
          )}
        </p>
      </section>
      <section
        className="tutorial-card"
        ref={(node) => {
          sections.current.sauvegarde = node;
        }}
        tabIndex={-1}
      >
        <span className="tutorial-number" aria-hidden="true">
          {t("6")}
        </span>
        <h2>{t("Sauvegarder, exporter et utiliser hors ligne")}</h2>
        <p>
          {t("Attends ")}
          <strong>{t("Enregistré sur cet appareil")}</strong>{" "}
          {t(
            "avant de fermer. La sauvegarde automatique reste sur ce navigateur et cet appareil ; elle ne synchronise pas ton téléphone et ton ordinateur.",
          )}
        </p>
        <ul className="tutorial-file-list">
          <li>
            <strong>{t("Exporter")}</strong>
            {t(
              " est disponible au-dessus du terrain, dans la présentation et sur chaque carte de système.",
            )}
          </li>
          <li>
            <strong>{t("Image PNG")}</strong>
            {t(
              " crée une image de l’étape affichée. Choisis d’abord l’étape que tu veux montrer.",
            )}
          </li>
          <li>
            <strong>{t("PDF du système")}</strong>
            {t(
              " rassemble toutes les étapes, les notes et les lectures dans un seul document.",
            )}
          </li>
          <li>
            {t(
              "Retrouve le fichier dans les téléchargements du navigateur, ou utilise « Partager le fichier » pour l’envoyer.",
            )}
          </li>
        </ul>
        <details>
          <summary>{t("Copie modifiable et sauvegarde complète")}</summary>
          <p>
            {t(
              "Dans Exporter, ouvre « Garder un système modifiable dans CoachOS » pour obtenir un fichier .coachos. Dans la bibliothèque, « Sauvegarder la bibliothèque » conserve tous tes systèmes et réglages pour les réimporter sur un autre appareil.",
            )}
          </p>
          <p>
            {t(
              "Pour réunir plusieurs systèmes dans un PDF, ouvre « Exporter en PDF ou image » dans la bibliothèque, choisis les systèmes puis « PDF de la sélection ».",
            )}
          </p>
        </details>
        <p>
          {t(
            "Garde une copie externe : effacer les données du navigateur efface aussi la bibliothèque locale. Un import affiche un aperçu avant de remplacer des données.",
          )}
        </p>
        <p>
          {t("Pour le hors ligne, ouvre CoachOS avec une connexion et attends")}{" "}
          <strong>{t("Disponible hors ligne")}</strong>{" "}
          {t(
            "dans la bibliothèque. Sur iPhone : Safari → Partager → Sur l’écran d’accueil.",
          )}
        </p>
      </section>
      <details className="tutorial-card tutorial-extra">
        <summary>{t("Terrain, zoom et lectures alternatives")}</summary>
        <p>
          <strong>{t("Vue")}</strong>
          {t(
            ", sous le terrain, permet de zoomer, déplacer le cadrage ou recadrer sur les éléments. Cela ne déplace aucun joueur.",
          )}
        </p>
        <p>
          <strong>{t("Réglages")}</strong>{" "}
          {t(
            "contient le choix Demi/Complet ainsi que les lectures et timings avancés. Passer en demi-terrain peut masquer des éléments de l’autre moitié : lis l’avertissement et utilise Recadrer pour les retrouver.",
          )}
        </p>
        <p>
          {t(
            "Une lecture alternative reprend le tronc commun, puis ses propres étapes. Les positions de départ d’une nouvelle lecture viennent de son point de branchement.",
          )}
        </p>
      </details>
      <a className="button tutorial-return" href={returnHref}>
        {t("Revenir à mon espace")}
      </a>
    </article>
  );
}
