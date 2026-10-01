import { StrokePoint } from '../../types/ink';

/**
 * Filtro 1€ (One Euro Filter) para posición y presión.
 * Es un filtro causal de retardo casi nulo que adapta su frecuencia de corte
 * dinámicamente según la velocidad: a baja velocidad suaviza el temblor (jitter),
 * y a alta velocidad reduce el desfase (lag) para mantener precisión.
 */
class LowPassFilter {
  private y: number | null = null;
  private s: number | null = null;

  public filter(val: number, alpha: number): number {
    if (this.y === null) {
      this.s = val;
      this.y = val;
      return val;
    }
    this.y = alpha * val + (1.0 - alpha) * (this.s as number);
    this.s = this.y;
    return this.y;
  }

  public last(): number | null {
    return this.y;
  }

  public reset(): void {
    this.y = null;
    this.s = null;
  }
}

export class OneEuroFilter {
  private minCutoff: number;
  private beta: number;
  private dCutoff: number;
  private xFilter = new LowPassFilter();
  private dxFilter = new LowPassFilter();
  private yFilter = new LowPassFilter();
  private dyFilter = new LowPassFilter();
  private pFilter = new LowPassFilter();
  private lastTime: number | null = null;

  constructor(minCutoff = 1.2, beta = 0.05, dCutoff = 1.0) {
    this.minCutoff = minCutoff;
    this.beta = beta;
    this.dCutoff = dCutoff;
  }

  private alpha(rate: number, cutoff: number): number {
    const tau = 1.0 / (2 * Math.PI * cutoff);
    const te = 1.0 / rate;
    return 1.0 / (1.0 + tau / te);
  }

  public reset(): void {
    this.xFilter.reset();
    this.dxFilter.reset();
    this.yFilter.reset();
    this.dyFilter.reset();
    this.pFilter.reset();
    this.lastTime = null;
  }

  public filter(raw: StrokePoint): StrokePoint {
    const time = raw.time;
    if (this.lastTime === null) {
      this.lastTime = time;
      return {
        ...raw,
        x: this.xFilter.filter(raw.x, 1.0),
        y: this.yFilter.filter(raw.y, 1.0),
        pressure: this.pFilter.filter(raw.pressure, 1.0)
      };
    }

    const dt = Math.max(0.001, (time - this.lastTime) / 1000.0);
    this.lastTime = time;
    const rate = 1.0 / dt;

    // Derivada de X e Y para adaptar corte
    const prevX = this.xFilter.last() ?? raw.x;
    const prevY = this.yFilter.last() ?? raw.y;
    const dx = (raw.x - prevX) * rate;
    const dy = (raw.y - prevY) * rate;

    const edx = this.dxFilter.filter(dx, this.alpha(rate, this.dCutoff));
    const edy = this.dyFilter.filter(dy, this.alpha(rate, this.dCutoff));
    const speed = Math.hypot(edx, edy);

    const cutoff = this.minCutoff + this.beta * speed;
    const a = this.alpha(rate, cutoff);
    const filteredX = this.xFilter.filter(raw.x, a);
    const filteredY = this.yFilter.filter(raw.y, a);
    const filteredPressure = this.pFilter.filter(raw.pressure, Math.min(1.0, a * 1.2));

    return {
      x: filteredX,
      y: filteredY,
      pressure: filteredPressure,
      tiltX: raw.tiltX,
      tiltY: raw.tiltY,
      time: raw.time,
      velocity: speed / 1000 // px / ms
    };
  }
}
