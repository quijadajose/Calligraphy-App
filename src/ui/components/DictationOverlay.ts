import { suggestedSeconds, wordsPerMinute, DictationService, PlayResult } from '../../core/audio/DictationService';
import { Lesson } from '../../types/ink';

export interface DictationFinish {
  lesson: Lesson;
  elapsedMs: number;
  timedOut: boolean;
  wpm: number;
}

/** Barra de dictado: lee la frase, cuenta el tiempo y entrega. No tapa la hoja. */
export class DictationOverlay {
  private active: Lesson | null = null;
  private finished = false;
  private replays = 0;

  public onFinish?: (result: DictationFinish) => void;
  public onCancel?: () => void;

  constructor(
    private root: HTMLElement,
    private prompt: HTMLElement,
    private clock: HTMLElement,
    private listenButton: HTMLButtonElement,
    private submitButton: HTMLButtonElement,
    private cancelButton: HTMLButtonElement,
    private service: DictationService
  ) {
    this.listenButton.addEventListener('click', () => this.replay());
    this.submitButton.addEventListener('click', () => this.complete(false));
    this.cancelButton.addEventListener('click', () => this.cancel());
  }

  public start(lesson: Lesson): void {
    this.active = lesson;
    this.finished = false;
    const seconds = lesson.dictationSeconds ?? suggestedSeconds(lesson.characterOrWord);
    this.replays = 0;
    this.prompt.textContent = this.message(lesson, 'audio');
    this.root.hidden = false;
    void this.play(lesson, 0.9);
    this.service.startTimer(seconds, (tick) => {
      this.clock.textContent = `${tick.remaining} s`;
    }, () => this.complete(true));
    this.submitButton.focus();
  }

  public isOpen(): boolean {
    return !this.root.hidden;
  }

  public dismiss(): void {
    this.service.stop();
    this.root.hidden = true;
    this.active = null;
    this.finished = false;
  }

  /** Cada repetición va más lenta, como cuando el profesor repite la frase. */
  private replay(): void {
    if (!this.active) return;
    this.replays += 1;
    void this.play(this.active, this.replays === 1 ? 0.75 : 0.6);
  }

  private async play(lesson: Lesson, rate: number): Promise<void> {
    const result = await this.service.playLesson(lesson, rate);
    if (this.active === lesson && result === 'none') this.prompt.textContent = this.message(lesson, result);
  }

  private message(lesson: Lesson, result: PlayResult): string {
    const hint = lesson.category === 'japanese' && lesson.meaning ? ` Pista: «${lesson.meaning}».` : '';
    if (result === 'none') {
      const name = lesson.category === 'palmer' ? 'español' : 'japonés';
      return `Esta frase no tiene audio grabado y no hay una voz en ${name} en este dispositivo. Pide a alguien que te la dicte, o instala una voz de ${name} en el sistema.${hint}`;
    }
    return `Escucha y escribe. «Repetir» la lee más lento. El texto aparece al entregar.${hint}`;
  }

  private complete(timedOut: boolean): void {
    if (!this.active || this.finished) return;
    this.finished = true;
    const lesson = this.active;
    const elapsedMs = Math.max(1, this.service.elapsedMs());
    this.service.stop();
    this.root.hidden = true;
    this.onFinish?.({
      lesson,
      elapsedMs,
      timedOut,
      wpm: wordsPerMinute(lesson.characterOrWord, elapsedMs)
    });
    this.active = null;
  }

  private cancel(): void {
    this.dismiss();
    this.onCancel?.();
  }
}

