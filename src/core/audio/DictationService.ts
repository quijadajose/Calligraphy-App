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

import { Lesson } from '../../types/ink';
import { SpeechLang, audioPath, speechLang, spokenText } from './speech';

export type { SpeechLang };

/** Cómo sonó un dictado: audio grabado, voz del sistema o nada. */
export type PlayResult = 'audio' | 'voice' | 'none';

function appBase(): string {
  const value = import.meta.env.BASE_URL;
  return typeof value === 'string' ? value : '/';
}

/** Voz instalada para un idioma: 'yes', 'no' o 'unknown' (el navegador aún no dio la lista). */
export type VoiceAvailability = 'yes' | 'no' | 'unknown';

export class DictationService {
  private synth: SpeechSynthesis | null = null;
  private voices: SpeechSynthesisVoice[] = [];
  private audio: HTMLAudioElement | null = null;
  /** Lecciones cuyo audio no existe o no se pudo reproducir: van directo a la voz del sistema. */
  private missingAudio = new Set<string>();
  private timerId: number | null = null;
  private secondsLeft = 0;
  private startedAt = 0;

  constructor() {
    if (typeof window !== 'undefined' && 'speechSynthesis' in window) {
      this.synth = window.speechSynthesis;
      this.loadVoices();
      // Chrome entrega las voces tarde; Firefox en Linux puede no tener ninguna.
      this.synth.addEventListener?.('voiceschanged', () => this.loadVoices());
    }
  }

  private loadVoices(): void {
    try {
      this.voices = this.synth?.getVoices() ?? [];
    } catch {
      this.voices = [];
    }
  }

  /** La mejor voz para el idioma: primero las locales (funcionan sin red), luego las demás. */
  private voiceFor(lang: SpeechLang): SpeechSynthesisVoice | null {
    const prefix = lang.slice(0, 2).toLowerCase();
    const matches = this.voices.filter((voice) => voice.lang.replace('_', '-').toLowerCase().startsWith(prefix));
    if (matches.length === 0) return null;
    const exact = (voice: SpeechSynthesisVoice) => voice.lang.replace('_', '-').toLowerCase() === lang.toLowerCase();
    return matches.find((voice) => voice.localService && exact(voice))
      ?? matches.find((voice) => voice.localService)
      ?? matches.find(exact)
      ?? matches[0];
  }

  public voiceAvailability(lang: SpeechLang): VoiceAvailability {
    if (!this.synth) return 'no';
    if (this.voices.length === 0) return 'unknown';
    return this.voiceFor(lang) ? 'yes' : 'no';
  }

  public canSpeak(): boolean {
    return this.synth !== null;
  }

  /** Lee el texto. `rate` < 1 es más lento (la repetición del dictado va más pausada). */
  public speak(text: string, lang: SpeechLang = 'es-ES', rate = 0.9): void {
    if (!this.synth) return;
    this.synth.cancel();
    const utterance = new SpeechSynthesisUtterance(text);
    utterance.lang = lang;
    utterance.rate = rate;
    const voice = this.voiceFor(lang);
    if (voice) utterance.voice = voice;
    this.synth.speak(utterance);
  }

  /**
   * Lee el dictado de una lección: primero el audio grabado (public/audio, ver
   * scripts/dictation/audio.py); si no está o el navegador no lo reproduce, la voz del sistema.
   * `rate` 0.9 es la velocidad normal; menos, más lento.
   */
  public async playLesson(lesson: Lesson, rate = 0.9): Promise<PlayResult> {
    this.stopSound();
    if (typeof Audio !== 'undefined' && !this.missingAudio.has(lesson.id)) {
      const audio = new Audio(`${appBase()}${audioPath(lesson.id)}`);
      this.audio = audio;
      // El audio ya va al 90 %: las repeticiones bajan desde ahí sin cambiar el tono.
      audio.playbackRate = Math.max(0.5, rate / 0.9);
      try {
        await audio.play();
        return 'audio';
      } catch {
        if (this.audio === audio) this.audio = null;
        this.missingAudio.add(lesson.id);
      }
    }
    if (!this.synth) return 'none';
    const lang = speechLang(lesson);
    this.speak(spokenText(lesson), lang, rate);
    return this.voiceAvailability(lang) === 'no' ? 'none' : 'voice';
  }

  private stopSound(): void {
    this.audio?.pause();
    this.audio = null;
    this.synth?.cancel();
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
    this.stopSound();
    this.startedAt = 0;
  }
}
