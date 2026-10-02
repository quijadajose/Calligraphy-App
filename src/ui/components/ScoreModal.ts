import { EvaluationResult } from '../../types/ink';

export class ScoreModal {
  constructor(
    private root: HTMLElement,
    private score: HTMLElement,
    private feedback: HTMLElement,
    private details: HTMLElement,
    private closeButton: HTMLButtonElement
  ) {
    this.closeButton.addEventListener('click', () => this.hide());
  }

  public show(result: EvaluationResult): void {
    this.score.textContent = `${result.score}`;
    this.feedback.textContent = result.feedback;
    const arc = this.root.querySelector('#score-svg-arc') as SVGElement | null;
    if (arc) {
      // Perímetro del círculo r=48 es 2 * pi * 48 ≈ 301.6
      const perimeter = 301.6;
      const progress = Math.min(100, Math.max(0, result.score));
      const dash = (progress / 100) * perimeter;
      arc.setAttribute('stroke-dasharray', `${dash.toFixed(1)} ${perimeter}`);
      arc.setAttribute('stroke', progress >= 75 ? '#6FA97B' : progress >= 50 ? '#C9694A' : '#E08A78');
    }

    this.details.innerHTML = '';
    for (const line of result.details ?? []) {
      const item = document.createElement('li');
      item.textContent = line;
      this.details.appendChild(item);
    }
    this.root.style.display = 'flex';
  }

  public hide(): void {
    this.root.style.display = 'none';
  }
}
