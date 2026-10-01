export interface PerformanceStats {
  fps: number;
  frameMs: number;
  pointCount: number;
  coalescedTotal: number;
  predictedTotal: number;
}

export class PerformanceOverlay {
  private container: HTMLElement;
  private el: HTMLElement;
  private enabled: boolean = true;
  private frameTimes: number[] = [];
  private lastTime = performance.now();
  private lastFpsUpdate = performance.now();
  private currentFps = 60;
  private currentFrameMs = 0;
  private currentPointCount = 0;
  private coalescedCount = 0;
  private predictedCount = 0;

  constructor(parent: HTMLElement) {
    this.container = parent;
    this.el = document.createElement('div');
    this.el.className = 'perf-overlay';
    this.el.innerHTML = `
      <div class="perf-metric"><span class="perf-label">FPS:</span> <span id="perf-fps" class="perf-val">60</span></div>
      <div class="perf-metric"><span class="perf-label">Frame:</span> <span id="perf-ms" class="perf-val">0.0 ms</span></div>
      <div class="perf-metric"><span class="perf-label">Puntos:</span> <span id="perf-pts" class="perf-val">0</span></div>
      <div class="perf-metric"><span class="perf-label">Coalesced:</span> <span id="perf-coalesced" class="perf-val">0</span></div>
      <div class="perf-metric"><span class="perf-label">Predicted:</span> <span id="perf-predicted" class="perf-val">0</span></div>
    `;
    this.container.appendChild(this.el);
  }

  public recordFrame(renderMs: number, pointCount: number): void {
    const now = performance.now();
    const delta = now - this.lastTime;
    this.lastTime = now;
    if (delta > 0) {
      this.frameTimes.push(1000 / delta);
      if (this.frameTimes.length > 30) this.frameTimes.shift();
    }
    this.currentFrameMs = renderMs;
    this.currentPointCount = pointCount;

    if (now - this.lastFpsUpdate >= 250) {
      const avgFps = this.frameTimes.length > 0
        ? this.frameTimes.reduce((a, b) => a + b, 0) / this.frameTimes.length
        : 60;
      this.currentFps = Math.round(avgFps);
      this.lastFpsUpdate = now;
      this.render();
    }
  }

  public recordEvents(coalesced: number, predicted: number): void {
    this.coalescedCount += coalesced;
    this.predictedCount += predicted;
  }

  public resetStrokeStats(): void {
    this.currentPointCount = 0;
    this.render();
  }

  public setVisible(visible: boolean): void {
    this.enabled = visible;
    this.el.style.display = visible ? 'flex' : 'none';
  }

  public toggle(): boolean {
    this.setVisible(!this.enabled);
    return this.enabled;
  }

  private render(): void {
    if (!this.enabled) return;
    const fpsEl = this.el.querySelector('#perf-fps');
    const msEl = this.el.querySelector('#perf-ms');
    const ptsEl = this.el.querySelector('#perf-pts');
    const coalEl = this.el.querySelector('#perf-coalesced');
    const predEl = this.el.querySelector('#perf-predicted');

    if (fpsEl) {
      fpsEl.textContent = `${this.currentFps}`;
      (fpsEl as HTMLElement).style.color = this.currentFps >= 55 ? '#4ade80' : this.currentFps >= 30 ? '#facc15' : '#f87171';
    }
    if (msEl) {
      msEl.textContent = `${this.currentFrameMs.toFixed(1)} ms`;
      (msEl as HTMLElement).style.color = this.currentFrameMs <= 8 ? '#4ade80' : this.currentFrameMs <= 16 ? '#facc15' : '#f87171';
    }
    if (ptsEl) ptsEl.textContent = `${this.currentPointCount}`;
    if (coalEl) coalEl.textContent = `${this.coalescedCount}`;
    if (predEl) predEl.textContent = `${this.predictedCount}`;
  }
}
