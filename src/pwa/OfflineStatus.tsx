import { t } from "../i18n";
import { useEffect, useState } from "react";

export function OfflineStatus() {
  const [online, setOnline] = useState(navigator.onLine);
  const [cache, setCache] = useState("Préparation du mode hors ligne…");
  const [waiting, setWaiting] = useState(false);
  const [persistent, setPersistent] = useState<boolean | null>(null);
  const [storageMessage, setStorageMessage] = useState("");
  useEffect(() => {
    let alive = true;
    const network = () => setOnline(navigator.onLine);
    addEventListener("online", network);
    addEventListener("offline", network);
    navigator.storage
      ?.persisted?.()
      .then((value) => {
        if (alive) setPersistent(value);
      })
      .catch(() => {});
    if ("serviceWorker" in navigator && import.meta.env.PROD) {
      navigator.serviceWorker
        .register(`${import.meta.env.BASE_URL}sw.js`, {
          scope: import.meta.env.BASE_URL,
          updateViaCache: "none",
        })
        .then((registration) => {
          if (!alive) return;
          const refresh = () => {
            if (!alive) return;
            setWaiting(!!registration.waiting);
            if (registration.active) setCache("Disponible hors ligne");
            else if (registration.installing?.state === "redundant")
              setCache(
                "Mode hors ligne indisponible. Réessayez en rouvrant avec une connexion.",
              );
          };
          refresh();
          registration.addEventListener("updatefound", () => {
            registration.installing?.addEventListener("statechange", refresh);
          });
          registration.installing?.addEventListener("statechange", refresh);
          navigator.serviceWorker.ready.then(() => {
            if (alive) {
              setCache("Disponible hors ligne");
              refresh();
            }
          });
        })
        .catch(() => {
          if (alive)
            setCache(
              "Mode hors ligne indisponible. Gardez une connexion pour rouvrir l’application.",
            );
        });
    } else setCache("Mode hors ligne non disponible dans ce contexte.");
    return () => {
      alive = false;
      removeEventListener("online", network);
      removeEventListener("offline", network);
    };
  }, []);
  async function protectStorage() {
    try {
      const granted = await navigator.storage.persist();
      setPersistent(granted);
      setStorageMessage(
        granted
          ? "Stockage protégé contre l’éviction automatique. Gardez une sauvegarde externe."
          : "Protection non accordée par le navigateur. Gardez une sauvegarde externe.",
      );
    } catch {
      setStorageMessage(
        "Protection indisponible dans ce navigateur. Gardez une sauvegarde externe.",
      );
    }
  }
  return (
    <details className="offline-status">
      <summary>
        <span role="status">
          {online ? t(cache) : t("Hors connexion · {0}", t(cache))}
        </span>
      </summary>
      <div>
        <p>
          {t(
            "Après préparation, lecture, édition et exports restent disponibles sans réseau. Les données restent sur cet appareil.",
          )}
        </p>
        {waiting && (
          <p role="status">
            {t(
              "Mise à jour prête : attendez la fin de l’enregistrement, puis fermez tous les onglets CoachOS et rouvrez l’application. Aucun rechargement automatique.",
            )}
          </p>
        )}
        <p>
          {t(
            "Sur iPhone : Safari → Partager → Sur l’écran d’accueil. Sur ordinateur : utilisez Installer dans le menu du navigateur si proposé.",
          )}
        </p>
        {persistent === false && (
          <button onClick={protectStorage}>
            {t("Protéger le stockage local")}
          </button>
        )}
        {persistent && (
          <p>{t("Stockage protégé contre l’éviction automatique.")}</p>
        )}
        {storageMessage && <p role="status">{t(storageMessage)}</p>}
        <p>
          {t(
            "Effacer les données du site efface aussi la bibliothèque. Une installation ou la protection du stockage ne remplace pas une sauvegarde externe.",
          )}
        </p>
      </div>
    </details>
  );
}
