/** Parseur interne limité aux littéraux du fichier historique connu. Jamais eval/Function/DOM. */
export function parseHistoricalData(html: string): unknown {
  if (html.length > 100000)
    throw new Error("Source historique trop volumineuse.");
  const start = html.indexOf("const sets=");
  const end = html.indexOf("\nlet active=", start);
  if (start < 0 || end < 0) throw new Error("Structure historique inconnue.");
  const source = html
    .slice(start + 11, end)
    .trim()
    .replace(/;$/, "");
  let i = 0;
  const ws = () => {
    while (/\s/.test(source[i] ?? "") && i < source.length) i++;
  };
  const take = (token: string) => {
    ws();
    if (source[i++] !== token) throw new Error("Syntaxe historique invalide.");
  };
  const value = (depth = 0): unknown => {
    if (depth > 25) throw new Error("Source trop imbriquée.");
    ws();
    const c = source[i];
    if (c === "'") {
      i++;
      let out = "";
      while (i < source.length) {
        const ch = source[i++];
        if (ch === "'") return out;
        if (ch === "\\") {
          const escaped = source[i++];
          if (!escaped) break;
          out +=
            ({ n: "\n", r: "\r", t: "\t" } as Record<string, string>)[
              escaped
            ] ?? escaped;
        } else out += ch;
      }
      throw new Error("Texte non terminé.");
    }
    if (c === "[") {
      i++;
      const out: unknown[] = [];
      ws();
      while (source[i] !== "]") {
        out.push(value(depth + 1));
        ws();
        if (source[i] !== ",") break;
        i++;
        ws();
      }
      take("]");
      return out;
    }
    if (c === "{") {
      i++;
      const out: Record<string, unknown> = {};
      ws();
      while (source[i] !== "}") {
        const quoted = source[i] === "'";
        const key = quoted
          ? value(depth + 1)
          : source.slice(i).match(/^(?:[A-Za-z_$][\w$]*|\d+)/)?.[0];
        if (
          typeof key !== "string" ||
          ["__proto__", "constructor", "prototype"].includes(key)
        )
          throw new Error("Clé invalide.");
        if (!quoted) i += key.length;
        // Les clés citées sont lues par value ; les sources connues utilisent des clés simples.
        take(":");
        if (Object.hasOwn(out, key)) throw new Error("Clé dupliquée.");
        out[key] = value(depth + 1);
        ws();
        if (source[i] !== ",") break;
        i++;
        ws();
      }
      take("}");
      return out;
    }
    const num = source.slice(i).match(/^-?\d+(?:\.\d+)?/);
    if (num) {
      i += num[0].length;
      return Number(num[0]);
    }
    const name = source.slice(i).match(/^[A-Za-z_$][\w$]*/)?.[0];
    if (!name || !["F", "M", "C", "P", "S"].includes(name))
      throw new Error("Expression interdite dans la source.");
    i += name.length;
    take("(");
    const args: unknown[] = [];
    ws();
    while (source[i] !== ")") {
      args.push(value(depth + 1));
      ws();
      if (source[i] !== ",") break;
      i++;
      ws();
    }
    take(")");
    if (name === "F") {
      if (args.length < 2 || args.length > 5)
        throw new Error("Étape invalide.");
      return Object.fromEntries(
        ["title", "desc", "delta", "acts", "ball"]
          .slice(0, args.length)
          .map((key, index) => [key, args[index]]),
      );
    }
    if (name === "M" || name === "C")
      return { t: name.toLowerCase(), id: args[0], via: args.slice(1) };
    if (name === "P") {
      if (args.length !== 2) throw new Error("Passe invalide.");
      return { t: "p", a: args[0], b: args[1] };
    }
    if (args.length !== 1) throw new Error("Écran invalide.");
    return { t: "s", id: args[0] };
  };
  const result = value();
  ws();
  if (i !== source.length) throw new Error("Expression restante interdite.");
  return result;
}
