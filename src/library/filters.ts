const key = "coachos.library.filters.v1";
export interface LibraryFilters {
  view: string;
  query: string;
  filter: string;
  collection: string;
  sort: "recent" | "name";
}
export function readFilters(view: string): LibraryFilters {
  const fallback: LibraryFilters = {
    view,
    query: "",
    filter: "Tous les systèmes",
    collection: "all",
    sort: "recent",
  };
  try {
    const value = JSON.parse(sessionStorage.getItem(key) ?? "null");
    if (!value || value.view !== view) return fallback;
    return {
      ...fallback,
      query: typeof value.query === "string" ? value.query.slice(0, 300) : "",
      filter: [
        "Tous les systèmes",
        "Demi-terrain",
        "Remise en jeu",
        "Attaque de zone",
        "Brouillons",
      ].includes(value.filter)
        ? value.filter
        : fallback.filter,
      collection:
        typeof value.collection === "string" ? value.collection : "all",
      sort: value.sort === "name" ? "name" : "recent",
    };
  } catch {
    return fallback;
  }
}
export function rememberFilters(value: LibraryFilters) {
  try {
    sessionStorage.setItem(key, JSON.stringify(value));
  } catch {
    /* Session-only UI state may be unavailable. */
  }
}
