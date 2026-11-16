import { setLocale, t, useLocale } from ".";
export function LanguagePicker() {
  const locale = useLocale();
  return (
    <label className="language-picker">
      <span>{t("Langue")}</span>
      <select
        aria-label={t("Langue de l’interface")}
        value={locale}
        onChange={(event) =>
          setLocale(event.target.value === "en" ? "en" : "fr")
        }
      >
        <option value="fr">Français</option>
        <option value="en">English</option>
      </select>
    </label>
  );
}
