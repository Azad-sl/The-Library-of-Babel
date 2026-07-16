/**
 * Tiny pub/sub for opening the Shortcuts Help dialog from anywhere
 * (e.g. from the Command Palette entry "快捷键索引").
 *
 * Kept framework-agnostic and Zustand-independent so any component
 * can emit `emitShortcutsHelpOpen()` without prop drilling.
 */
type Listener = () => void;

let listeners: Listener[] = [];

export function subscribeShortcutsHelpOpen(listener: Listener): () => void {
  listeners.push(listener);
  return () => {
    listeners = listeners.filter((x) => x !== listener);
  };
}

export function emitShortcutsHelpOpen(): void {
  listeners.forEach((l) => l());
}
