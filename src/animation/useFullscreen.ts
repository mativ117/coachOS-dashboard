import { useEffect, useRef, useState, type RefObject } from "react";
export function useFullscreen(root: RefObject<HTMLElement | null>) {
  const [mode, setMode] = useState<"none" | "native" | "fallback">("none");
  const previousFocus = useRef<HTMLElement | null>(null);
  const change = (next: typeof mode) => setMode(next);
  useEffect(() => {
    const listener = () => {
      if (document.fullscreenElement === root.current) change("native");
      else setMode((m) => (m === "native" ? "none" : m));
    };
    document.addEventListener("fullscreenchange", listener);
    return () => document.removeEventListener("fullscreenchange", listener);
  }, [root]);
  useEffect(() => {
    if (mode === "none") {
      previousFocus.current?.focus();
      return;
    }
    const node = root.current;
    if (!node) return;
    const siblings: { node: HTMLElement; inert: boolean }[] = [];
    if (mode === "fallback") {
      let child: HTMLElement = node,
        parent = node.parentElement;
      while (parent && parent !== document.documentElement) {
        for (const sibling of parent.children)
          if (sibling !== child && sibling instanceof HTMLElement) {
            siblings.push({ node: sibling, inert: sibling.inert });
            sibling.inert = true;
          }
        child = parent;
        parent = parent.parentElement;
      }
    }
    const key = (e: KeyboardEvent) => {
      if (e.key === "Escape" && mode === "fallback") {
        e.preventDefault();
        setMode("none");
      }
      if (e.key === "Tab" && mode === "fallback") {
        const focusable = Array.from(
          node.querySelectorAll<HTMLElement>(
            'button:not(:disabled), select:not(:disabled), input:not(:disabled), summary, a[href], [tabindex="0"]',
          ),
        ).filter((el) => el.getClientRects().length);
        const first = focusable[0],
          last = focusable.at(-1);
        if (
          e.shiftKey &&
          (document.activeElement === first || document.activeElement === node)
        ) {
          e.preventDefault();
          last?.focus();
        } else if (!e.shiftKey && document.activeElement === last) {
          e.preventDefault();
          first?.focus();
        }
      }
    };
    document.addEventListener("keydown", key);
    node.focus();
    return () => {
      document.removeEventListener("keydown", key);
      siblings.forEach(({ node, inert }) => {
        node.inert = inert;
      });
    };
  }, [mode, root]);
  async function toggle() {
    if (mode === "native") {
      await document.exitFullscreen();
      return;
    }
    if (mode === "fallback") {
      change("none");
      return;
    }
    previousFocus.current = document.activeElement as HTMLElement;
    if (root.current?.requestFullscreen && document.fullscreenEnabled) {
      try {
        await root.current.requestFullscreen();
        change("native");
        return;
      } catch {
        /* Mode agrandi avec clavier et arrière-plan inerte. */
      }
    }
    change("fallback");
  }
  return { mode, expanded: mode !== "none", toggle };
}
