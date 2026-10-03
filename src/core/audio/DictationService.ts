export interface DictationTick {
  remaining: number;
  elapsedMs: number;
}

export function countWords(text: string): number {
  const parts = text.trim().split(/\s+/).filter(Boolean);
  return Math.max(1, parts.length);
}

export function wordsPerMinute(text: string, elapsedMs: number): number {
  const minutes = Math.max(elapsedMs, 1000) / 60000;
  return Math.round((countWords(text) / minutes) * 10) / 10;
}

export function suggestedSeconds(text: string): number {
  return Math.max(12, countWords(text) * 8);
}

export class DictationService {
  private synth: SpeechSynthesis | null = null;
  private timerId: number | null = null;
  private secondsLeft = 0;
  private startedAt = 0;

  constructor() {
    if (typeof window !== 'undefined' && 'speechSynthesis' in window) {
      this.synth = window.speechSynthesis;
    }
  }

  public canSpeak(): boolean {
    return this.synth !== null;
  }

  public speak(text: string, lang: 'es-ES' | 'ja-JP' = 'es-ES'): void {
    if (!this.synth) return;
    this.synth.cancel();
    const utterance = new SpeechSynthesisUtterance(text);
    utterance.lang = lang;
    utterance.rate = 0.9;
    this.synth.speak(utterance);
  }

  public startTimer(
    durationSeconds: number,
    onTick: (tick: DictationTick) => void,
    onTimeUp: () => void
  ): void {
    this.stopTimer();
    this.secondsLeft = durationSeconds;
    this.startedAt = performance.now();
    onTick({ remaining: this.secondsLeft, elapsedMs: 0 });

    this.timerId = window.setInterval(() => {
      this.secondsLeft -= 1;
      onTick({ remaining: this.secondsLeft, elapsedMs: this.elapsedMs() });
      if (this.secondsLeft <= 0) {
        this.stopTimer();
        onTimeUp();
      }
    }, 1000);
  }

  public elapsedMs(): number {
    if (this.startedAt === 0) return 0;
    return performance.now() - this.startedAt;
  }

  public stopTimer(): void {
    if (this.timerId !== null) {
      clearInterval(this.timerId);
      this.timerId = null;
    }
  }

  public stop(): void {
    this.stopTimer();
    this.synth?.cancel();
    this.startedAt = 0;
  }
}
