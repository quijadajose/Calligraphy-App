import { MONTH_NAMES } from '../../core/challenges/Challenges';
import { holdDialog } from '../dialog';
import { medalName, medalSvg } from '../medals';

/** Aviso grande al ganar la medalla del mes. */
export class MedalOverlay {
  private layer: HTMLElement | null = null;
  private release: (() => void) | null = null;

  public show(month: number, count: number): void {
    this.hide();
    const layer = document.createElement('div');
    layer.className = 'score-modal-backdrop medal-layer';
    const box = document.createElement('div');
    box.className = 'box medal-box';
    box.setAttribute('role', 'dialog');
    box.setAttribute('aria-modal', 'true');
    box.setAttribute('aria-labelledby', 'medal-title');
    const art = document.createElement('div');
    art.className = 'medal-art';
    art.innerHTML = medalSvg(month, true, 150);
    const title = document.createElement('h2');
    title.id = 'medal-title';
    title.className = 'medal-title';
    title.textContent = `¡Medalla de ${MONTH_NAMES[month]}!`;
    const text = document.createElement('p');
    text.className = 'medal-text';
    text.textContent = `${medalName(month)}. Completaste ${count} desafíos este mes.`;
    const button = document.createElement('button');
    button.type = 'button';
    button.className = 'go';
    button.dataset.autofocus = '';
    button.textContent = 'Continuar';
    button.addEventListener('click', () => this.hide());
    box.append(art, title, text, button);
    layer.append(box);
    layer.addEventListener('click', (event) => {
      if (event.target === layer) this.hide();
    });
    document.body.append(layer);
    this.layer = layer;
    this.release = holdDialog(box, () => this.hide());
  }

  public hide(): void {
    this.release?.();
    this.release = null;
    this.layer?.remove();
    this.layer = null;
  }
}
