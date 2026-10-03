export interface PerformanceStats {
  fps: number;
  frameMs: number;
  pointCount: number;
  coalescedTotal: number;
  predictedTotal: number;
}

/** HUD de rendimiento. Nace oculto: solo se ve si se activa en Ajustes. */
export class PerformanceOverlay {
  private container: HTMLElement;
  private el: HTMLElement;
  private enabled = false;
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
    this.el.setAttribute('aria-hidden', 'true');
    this.el.innerHTML = `
      <div class="perf-metric"><span class="perf-label">FPS:</span> <span data-perf="fps" class="perf-val">60</span></div>
      <div class="perf-metric"><span class="perf-label">Frame:</span> <span data-perf="ms" class="perf-val">0.0 ms</span></div>
      <div class="perf-metric"><span class="perf-label">Puntos:</span> <span data-perf="pts" class="perf-val">0</span></div>
      <div class="perf-metric"><span class="perf-label">Coalesced:</span> <span data-perf="coalesced" class="perf-val">0</span></div>
      <div class="perf-metric"><span class="perf-label">Predicted:</span> <span data-perf="predicted" class="perf-val">0</span></div>
    `;
    this.el.style.display = 'none';
    this.container.appendChild(this.el);
  }

  public recordFrame(renderMs: number, pointCount: number): void {
    if (!this.enabled) return;
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
    const get = (name: string) => this.el.querySelector<HTMLElement>(`[data-perf="${name}"]`);
    const fpsEl = get('fps');
    const msEl = get('ms');
    const ptsEl = get('pts');
    const coalEl = get('coalesced');
    const predEl = get('predicted');

    if (fpsEl) {
      fpsEl.textContent = `${this.currentFps}`;
      fpsEl.dataset.level = this.currentFps >= 55 ? 'good' : this.currentFps >= 30 ? 'warn' : 'bad';
    }
    if (msEl) {
      msEl.textContent = `${this.currentFrameMs.toFixed(1)} ms`;
      msEl.dataset.level = this.currentFrameMs <= 8 ? 'good' : this.currentFrameMs <= 16 ? 'warn' : 'bad';
    }
    if (ptsEl) ptsEl.textContent = `${this.currentPointCount}`;
    if (coalEl) coalEl.textContent = `${this.coalescedCount}`;
    if (predEl) predEl.textContent = `${this.predictedCount}`;
  }
}
