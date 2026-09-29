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
