import { EvaluationResult } from '../../types/ink';
import { holdDialog } from '../dialog';

/** Resultado de «Calificar»: nota, detalles y qué hacer después. */
export class ScoreModal {
  public onNext?: () => void;
  public onRetry?: () => void;
  public onDownload?: () => void;

  private release: (() => void) | null = null;
  private readonly score: HTMLElement;
  private readonly title: HTMLElement;
  private readonly feedback: HTMLElement;
  private readonly details: HTMLElement;
  private readonly arc: SVGElement | null;
  private readonly nextButton: HTMLButtonElement;
  private readonly status: HTMLElement;

  constructor(private root: HTMLElement) {
    this.score = root.querySelector('#modal-score') as HTMLElement;
    this.title = root.querySelector('#modal-feedback-title') as HTMLElement;
    this.feedback = root.querySelector('#modal-feedback') as HTMLElement;
    this.details = root.querySelector('#modal-details') as HTMLElement;
    this.arc = root.querySelector('#score-svg-arc');
    this.status = root.querySelector('#modal-status') as HTMLElement;
    this.nextButton = root.querySelector('#modal-next-btn') as HTMLButtonElement;
    root.querySelector('#modal-close-btn')?.addEventListener('click', () => this.hide());
    root.querySelector('#modal-png-btn')?.addEventListener('click', () => this.onDownload?.());
    root.querySelector('#modal-retry-btn')?.addEventListener('click', () => {
      this.hide();
      this.onRetry?.();
    });
    this.nextButton.addEventListener('click', () => {
      this.hide();
      this.onNext?.();
    });
    root.addEventListener('click', (event) => {
      if (event.target === root) this.hide();
    });
  }

  public show(result: EvaluationResult, status: string, nextTitle: string | null): void {
    this.score.textContent = `${result.score}`;
    this.feedback.textContent = result.feedback;
    this.status.textContent = status;
    this.title.textContent = result.score >= 85 ? 'Muy bien' : result.score >= 70 ? 'Aprobada' : 'Otra vez';
    if (this.arc) {
      // Perímetro del círculo r=48 es 2 * pi * 48 ≈ 301.6
      const perimeter = 301.6;
      const progress = Math.min(100, Math.max(0, result.score));
      this.arc.setAttribute('stroke-dasharray', `${((progress / 100) * perimeter).toFixed(1)} ${perimeter}`);
      this.arc.dataset.level = progress >= 75 ? 'good' : progress >= 50 ? 'mid' : 'low';
    }
    this.details.replaceChildren(
      ...(result.details ?? []).map((line) => {
        const item = document.createElement('li');
        item.textContent = line;
        return item;
      })
    );
    this.nextButton.hidden = !nextTitle;
    this.nextButton.textContent = nextTitle ? `Siguiente: ${nextTitle}` : 'Siguiente';
    this.root.hidden = false;
    this.release?.();
    this.release = holdDialog(this.root, () => this.hide());
  }

  public hide(): void {
    if (this.root.hidden) return;
    this.root.hidden = true;
    this.release?.();
    this.release = null;
  }
}
