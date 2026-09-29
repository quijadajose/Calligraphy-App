import { suggestedSeconds, wordsPerMinute, DictationService } from '../../core/audio/DictationService';
import { Lesson } from '../../types/ink';

export interface DictationFinish {
  lesson: Lesson;
  elapsedMs: number;
  timedOut: boolean;
  wpm: number;
}

export class DictationOverlay {
  private active: Lesson | null = null;
  private finished = false;

  public onFinish?: (result: DictationFinish) => void;

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
    const lang = lesson.category === 'palmer' ? 'es-ES' : 'ja-JP';
    this.prompt.textContent = 'Escucha y escribe. El texto aparece al entregar.';
    this.root.style.display = 'flex';
    this.service.speak(lesson.characterOrWord, lang);
    this.service.startTimer(seconds, (tick) => {
      this.clock.textContent = `${tick.remaining}s`;
    }, () => this.complete(true));
  }

  public isOpen(): boolean {
    return this.root.style.display === 'flex';
  }

  public dismiss(): void {
    this.finished = true;
    this.service.stop();
    this.root.style.display = 'none';
    this.active = null;
    this.finished = false;
  }

  private replay(): void {
    if (!this.active) return;
    const lang = this.active.category === 'palmer' ? 'es-ES' : 'ja-JP';
    this.service.speak(this.active.characterOrWord, lang);
  }

  private complete(timedOut: boolean): void {
    if (!this.active || this.finished) return;
    this.finished = true;
    const lesson = this.active;
    const elapsedMs = Math.max(1, this.service.elapsedMs());
    this.service.stop();
    this.root.style.display = 'none';
    this.prompt.textContent = lesson.characterOrWord;
    this.onFinish?.({
      lesson,
      elapsedMs,
      timedOut,
      wpm: wordsPerMinute(lesson.characterOrWord, elapsedMs)
    });
    this.active = null;
  }

  private cancel(): void {
    this.finished = true;
    this.service.stop();
    this.root.style.display = 'none';
    this.active = null;
    this.finished = false;
  }
}
