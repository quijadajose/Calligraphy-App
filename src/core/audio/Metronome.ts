/** Clic suave a ritmo fijo, para que el trazo de Palmer lleve compás. Usa Web Audio, sin archivos. */
export class Metronome {
  private ctx: AudioContext | null = null;
  private timer: number | null = null;
  private beat = 0;

  public get running(): boolean {
    return this.timer !== null;
  }

  public start(bpm: number): void {
    this.stop();
    const Ctor = window.AudioContext ?? (window as unknown as { webkitAudioContext?: typeof AudioContext }).webkitAudioContext;
    if (!Ctor) return;
    this.ctx ??= new Ctor();
    void this.ctx.resume();
    this.beat = 0;
    const interval = 60000 / Math.max(30, Math.min(200, bpm));
    this.tick();
    this.timer = window.setInterval(() => this.tick(), interval);
  }

  public stop(): void {
    if (this.timer !== null) window.clearInterval(this.timer);
    this.timer = null;
  }

  private tick(): void {
    const ctx = this.ctx;
    if (!ctx) return;
    const accent = this.beat % 4 === 0;
    this.beat += 1;
    const osc = ctx.createOscillator();
    const gain = ctx.createGain();
    osc.frequency.value = accent ? 1320 : 880;
    gain.gain.setValueAtTime(0.0001, ctx.currentTime);
    gain.gain.exponentialRampToValueAtTime(accent ? 0.22 : 0.14, ctx.currentTime + 0.005);
    gain.gain.exponentialRampToValueAtTime(0.0001, ctx.currentTime + 0.07);
    osc.connect(gain).connect(ctx.destination);
    osc.start();
    osc.stop(ctx.currentTime + 0.08);
  }
}
