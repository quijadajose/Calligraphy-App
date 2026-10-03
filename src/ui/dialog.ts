const FOCUSABLE = 'button:not([disabled]), [href], input:not([disabled]), select, textarea, [tabindex]:not([tabindex="-1"])';

/**
 * Hace que un cuadro de diálogo se comporte como tal: el foco entra y no sale con Tab,
 * Escape lo cierra y al cerrarlo el foco vuelve a donde estaba.
 * Devuelve la función que lo suelta.
 */
export function holdDialog(root: HTMLElement, onEscape: () => void): () => void {
  const previous = document.activeElement as HTMLElement | null;
  const focusables = () => Array.from(root.querySelectorAll<HTMLElement>(FOCUSABLE)).filter((el) => el.offsetParent !== null);
  const onKey = (event: KeyboardEvent) => {
    if (event.key === 'Escape') {
      event.preventDefault();
      onEscape();
      return;
    }
    if (event.key !== 'Tab') return;
    const items = focusables();
    if (items.length === 0) return;
    const first = items[0];
    const last = items[items.length - 1];
    if (event.shiftKey && document.activeElement === first) {
      event.preventDefault();
      last.focus();
    } else if (!event.shiftKey && document.activeElement === last) {
      event.preventDefault();
      first.focus();
    }
  };
  document.addEventListener('keydown', onKey);
  requestAnimationFrame(() => {
    const preferred = root.querySelector<HTMLElement>('[data-autofocus]') ?? focusables()[0];
    preferred?.focus();
  });
  return () => {
    document.removeEventListener('keydown', onKey);
    previous?.focus?.();
  };
}

export function prefersReducedMotion(): boolean {
  return typeof matchMedia === 'function' && matchMedia('(prefers-reduced-motion: reduce)').matches;
}
