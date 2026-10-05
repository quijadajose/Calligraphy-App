import { holdDialog } from './dialog';

export interface ConfirmOptions {
  title: string;
  message: string;
  confirmLabel?: string;
  cancelLabel?: string;
  /** Acción que borra algo: el botón de confirmar va en rojo y el foco empieza en «Cancelar». */
  danger?: boolean;
}

/**
 * Pregunta de sí o no con el aspecto de la app (en lugar de confirm() del navegador).
 * Escape, «Cancelar» o un clic fuera responden que no.
 */
export function confirmDialog(options: ConfirmOptions): Promise<boolean> {
  return new Promise((resolve) => {
    const backdrop = document.createElement('div');
    backdrop.className = 'score-modal-backdrop confirm-backdrop';

    const box = document.createElement('div');
    box.className = 'box confirm-box';
    box.setAttribute('role', 'alertdialog');
    box.setAttribute('aria-modal', 'true');
    const titleId = `confirm-title-${Date.now()}`;
    const textId = `${titleId}-text`;
    box.setAttribute('aria-labelledby', titleId);
    box.setAttribute('aria-describedby', textId);

    if (options.danger) {
      const icon = document.createElement('div');
      icon.className = 'confirm-icon';
      icon.innerHTML = '<i class="ti ti-trash" aria-hidden="true"></i>';
      box.append(icon);
    }
    const title = document.createElement('h3');
    title.className = 'score-title';
    title.id = titleId;
    title.textContent = options.title;
    const text = document.createElement('p');
    text.className = 'mu confirm-text';
    text.id = textId;
    text.textContent = options.message;

    const actions = document.createElement('div');
    actions.className = 'modal-actions';
    const cancel = document.createElement('button');
    cancel.type = 'button';
    cancel.className = 'b2';
    cancel.textContent = options.cancelLabel ?? 'Cancelar';
    const accept = document.createElement('button');
    accept.type = 'button';
    accept.className = options.danger ? 'b2 danger confirm-danger' : 'go';
    accept.textContent = options.confirmLabel ?? 'Aceptar';
    (options.danger ? cancel : accept).dataset.autofocus = '';
    actions.append(cancel, accept);

    box.append(title, text, actions);
    backdrop.append(box);
    document.body.append(backdrop);

    let release: (() => void) | null = null;
    const close = (answer: boolean) => {
      release?.();
      release = null;
      backdrop.remove();
      resolve(answer);
    };
    cancel.addEventListener('click', () => close(false));
    accept.addEventListener('click', () => close(true));
    backdrop.addEventListener('click', (event) => { if (event.target === backdrop) close(false); });
    release = holdDialog(box, () => close(false));
  });
}
