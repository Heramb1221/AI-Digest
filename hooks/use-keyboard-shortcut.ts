"use client";
// hooks/use-keyboard-shortcut.ts
// Registers keyboard shortcuts. Used in the dashboard for:
//   j/k    — next/previous article
//   o      — open article in new tab
//   b      — toggle bookmark
//   r      — trigger refresh
//   /      — focus search (future)

import { useEffect, useCallback } from "react";

interface ShortcutMap {
  key:       string;
  meta?:     boolean;
  shift?:    boolean;
  callback:  () => void;
  enabled?:  boolean;
}

export function useKeyboardShortcuts(shortcuts: ShortcutMap[]) {
  const handler = useCallback(
    (e: KeyboardEvent) => {
      // Don't fire if user is typing in an input
      const tag = (e.target as HTMLElement).tagName;
      if (tag === "INPUT" || tag === "TEXTAREA" || (e.target as HTMLElement).isContentEditable) {
        return;
      }

      for (const shortcut of shortcuts) {
        if (shortcut.enabled === false) continue;
        const keyMatch   = e.key.toLowerCase() === shortcut.key.toLowerCase();
        const metaMatch  = !!shortcut.meta  === (e.metaKey || e.ctrlKey);
        const shiftMatch = !!shortcut.shift === e.shiftKey;

        if (keyMatch && metaMatch && shiftMatch) {
          e.preventDefault();
          shortcut.callback();
          return;
        }
      }
    },
    [shortcuts]
  );

  useEffect(() => {
    window.addEventListener("keydown", handler);
    return () => window.removeEventListener("keydown", handler);
  }, [handler]);
}
