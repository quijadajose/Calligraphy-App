/** Aviso breve en la parte baja de la pantalla. Sustituye a alert(). */
export function toast(message: string, kind: 'info' | 'error' = 'info'): void {
  let host = document.getElementById('toast-host');
  if (!host) {
    host = document.createElement('div');
    host.id = 'toast-host';
    host.className = 'toast-host';
    host.setAttribute('role', 'status');
    host.setAttribute('aria-live', 'polite');
    document.body.append(host);
  }
  const item = document.createElement('div');
  item.className = `toast toast-${kind}`;
  item.textContent = message;
  host.append(item);
  window.setTimeout(() => item.remove(), 4200);
}
