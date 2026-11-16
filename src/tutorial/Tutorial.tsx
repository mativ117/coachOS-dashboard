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
        <p className="eyebrow">LE GUIDE COACHOS</p>
        <h1>Prendre en main CoachOS</h1>
        <p>
          Place tes joueurs, dessine le mouvement, puis passe à l’étape
          suivante.
        </p>
        <a className="button button-primary" href={returnHref}>
          Revenir à mon espace
        </a>
      </header>
      <nav className="tutorial-shortcuts" aria-label="Accès rapide au tuto">
        <button onClick={() => jump("exercise")}>Essayer les gestes</button>
        <button onClick={() => jump("ballon")}>Déplacer le ballon</button>
        <button onClick={() => jump("dessin")}>Dessiner un mouvement</button>
        <button onClick={() => jump("etapes")}>Comprendre les étapes</button>
        <button onClick={() => jump("sauvegarde")}>
          Sauvegarder et exporter
        </button>
      </nav>
      <section className="tutorial-card">
        <span className="tutorial-number" aria-hidden="true">
          1
        </span>
        <h2>Commencer par le placement</h2>
        <p>
          Dans <strong>Bibliothèque</strong>, choisis{" "}
          <strong>+ Nouveau système</strong>, donne-lui un nom et valide. Le
          terrain s’ouvre avec cinq joueurs et le ballon : c’est l’étape{" "}
          <strong>Placement</strong>.
        </p>
        <p>
          Avec <strong>Déplacer</strong>, clique ou appuie sur un joueur, puis
          sur l’endroit où tu veux le placer. Tu peux aussi le faire glisser. Ce
          geste place le pion ; il ne dessine pas une course.
        </p>
        <p>
          Baseline et Losange sont des brouillons vides : utilise{" "}
          <strong>Initialiser 5 joueurs</strong> pour commencer.
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
          2
        </span>
        <h2>Donner le ballon à un autre joueur</h2>
        <ol className="tutorial-steps">
          <li>
            Vérifie que l’outil <strong>Déplacer</strong> est actif.
          </li>
          <li>
            Clique ou appuie sur le <strong>petit ballon orange</strong>, près
            de son porteur.
          </li>
          <li>
            Clique ou appuie sur le <strong>joueur qui doit le recevoir</strong>
            .
          </li>
        </ol>
        <p>
          Le ballon s’attache à ce joueur et suit ensuite ses déplacements. Tu
          peux aussi glisser le ballon directement sur lui.
        </p>
        <p>
          Pour un <strong>ballon libre</strong>, sélectionne le ballon puis un
          endroit vide du terrain, ou glisse-le à cet endroit. S’il n’y a aucun
          ballon, utilise <strong>Ajouter le ballon</strong>.
        </p>
        <p className="tutorial-tip">
          Cliquer seulement sur un joueur le sélectionne. Pour changer le
          porteur, commence bien par le ballon.
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
          3
        </span>
        <h2>Construire une étape à la fois</h2>
        <p>
          Quand le placement est prêt, choisis <strong>+ Étape</strong>. Cette
          nouvelle étape reprend les positions et le ballon de la précédente,
          avec un terrain sans nouveau tracé.
        </p>
        <p>
          Dessine ce qui se passe dans cette étape, puis choisis à nouveau{" "}
          <strong>+ Étape</strong> pour continuer. Les positions d’arrivée
          deviennent les positions de départ de l’étape suivante.
        </p>
        <p>
          Utilise les boutons numérotés au-dessus du terrain pour revenir à une
          étape. Une étape déjà créée garde ses propres actions : revenir en
          arrière ne l’efface pas.
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
          4
        </span>
        <h2>Dessiner les mouvements et les passes</h2>
        <dl className="tutorial-tools">
          <div>
            <dt>Tracer · un mouvement</dt>
            <dd>
              Choisis <strong>Tracer</strong>, pars du joueur et dessine son
              trajet au doigt ou à la souris. Relâche : le trait est nettoyé.
              Une courbe reste courbe ; un zigzag garde ses angles. Le joueur
              arrive au bout du trajet.
            </dd>
          </div>
          <div>
            <dt>Passe · du passeur au receveur</dt>
            <dd>
              Choisis <strong>Passe</strong> et trace du joueur qui donne le
              ballon vers celui qui le reçoit. Tu peux aussi appuyer sur les
              deux joueurs. Le trait pointillé représente la passe.
            </dd>
          </div>
          <div>
            <dt>Exécuter cette passe</dt>
            <dd>
              Une passe dessinée est d’abord une option. Dans ses réglages,
              coche <strong>Exécuter cette passe</strong> pour qu’elle transfère
              le ballon pendant la lecture. Le passeur doit bien avoir le ballon
              au départ.
            </dd>
          </div>
          <div>
            <dt>Autres → Écran</dt>
            <dd>
              Choisis <strong>Écran</strong> dans <strong>Autres</strong>, puis
              dessine le trajet du poseur. La barre en T est ajoutée à
              l’arrivée.
            </dd>
          </div>
          <div>
            <dt>Autres → Annotation</dt>
            <dd>
              Saisis ton texte dans le panneau qui s’ouvre, puis appuie sur le
              terrain pour le placer.
            </dd>
          </div>
        </dl>
        <p className="tutorial-tip">
          Déplacer le ballon change sa position ou son porteur. Pour montrer une
          passe dans le système, dessine-la avec l’outil Passe.
        </p>
        <p>
          Après un dessin, CoachOS revient à <strong>Déplacer</strong>. Choisis
          à nouveau <strong>Tracer</strong> pour ajouter un autre mouvement.
        </p>
        <details>
          <summary>Corriger un dessin ou annuler</summary>
          <p>
            Avec Déplacer, sélectionne le tracé : ses points peuvent être
            déplacés directement. Ses réglages permettent aussi de le supprimer.{" "}
            <strong>Annuler</strong> retire le dernier geste ;{" "}
            <strong>Rétablir</strong> le remet. Sur ordinateur : Ctrl/Cmd Z,
            puis Ctrl/Cmd Maj Z.
          </p>
          <p>
            Pour abandonner un tracé en cours : <strong>Échap</strong> ou le
            bouton <strong>Annuler le tracé</strong> lorsqu’il est proposé. Les
            extrémités d’une passe restent attachées aux joueurs.
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
        <summary>Essayer les gestes sur un terrain d’entraînement</summary>
        <PracticeBoard />
      </details>
      <section className="tutorial-card">
        <span className="tutorial-number" aria-hidden="true">
          5
        </span>
        <h2>Relire, noter et présenter</h2>
        <p>
          <strong>Lire l’étape</strong> ouvre un aperçu animé. Utilise Lire,
          Pause, la vitesse et les étapes pour vérifier ton système, puis{" "}
          <strong>Revenir à l’édition</strong> pour continuer.
        </p>
        <p>
          Le panneau <strong>Notes</strong> sert à nommer l’étape et écrire une
          consigne. Pour présenter à l’équipe, ouvre l’espace{" "}
          <strong>Présentation</strong>.
        </p>
        <p>
          Si une étape est signalée <strong>statique · à confirmer</strong>, les
          informations ne suffisent pas pour une animation fiable. Les tracés
          restent visibles ; vérifie le joueur associé, le ballon et les
          mouvements. Stack conserve ses coordonnées source tant que ses
          dimensions ne sont pas confirmées.
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
          6
        </span>
        <h2>Sauvegarder, exporter et utiliser hors ligne</h2>
        <p>
          Attends <strong>Enregistré sur cet appareil</strong> avant de fermer.
          La sauvegarde automatique reste sur ce navigateur et cet appareil ;
          elle ne synchronise pas ton téléphone et ton ordinateur.
        </p>
        <ul className="tutorial-file-list">
          <li>
            <strong>Sauvegarder la bibliothèque</strong> garde une copie
            complète, à importer sur un autre appareil si besoin.
          </li>
          <li>
            <strong>Exporter .coachos</strong>, dans Options du système,
            conserve un système modifiable.
          </li>
          <li>
            <strong>Fichiers et exports</strong> permet un PNG d’une étape ou un
            PDF des systèmes sélectionnés sur les cartes.
          </li>
        </ul>
        <p>
          Garde une copie externe : effacer les données du navigateur efface
          aussi la bibliothèque locale. Un import affiche un aperçu avant de
          remplacer des données.
        </p>
        <p>
          Pour le hors ligne, ouvre CoachOS avec une connexion et attends{" "}
          <strong>Disponible hors ligne</strong> dans la bibliothèque. Sur
          iPhone : Safari → Partager → Sur l’écran d’accueil.
        </p>
      </section>
      <details className="tutorial-card tutorial-extra">
        <summary>Terrain, zoom et lectures alternatives</summary>
        <p>
          <strong>Vue</strong>, sous le terrain, permet de zoomer, déplacer le
          cadrage ou recadrer sur les éléments. Cela ne déplace aucun joueur.
        </p>
        <p>
          <strong>Réglages</strong> contient le choix Demi/Complet ainsi que les
          lectures et timings avancés. Passer en demi-terrain peut masquer des
          éléments de l’autre moitié : lis l’avertissement et utilise Recadrer
          pour les retrouver.
        </p>
        <p>
          Une lecture alternative reprend le tronc commun, puis ses propres
          étapes. Les positions de départ d’une nouvelle lecture viennent de son
          point de branchement.
        </p>
      </details>
      <a className="button tutorial-return" href={returnHref}>
        Revenir à mon espace
      </a>
    </article>
  );
}
