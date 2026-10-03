import { PALMER_ASCENDER_RATIO, PALMER_SLANT_DEG, PALMER_XHEIGHT_RATIO } from '../../core/engine/gridMetrics';
import { Point2 } from '../../types/ink';

const VIEW = 72;
const BASE_Y = PALMER_ASCENDER_RATIO + PALMER_XHEIGHT_RATIO;
const SLANT = (PALMER_SLANT_DEG * Math.PI) / 180;

function themeColor(name: string, fallback: string): string {
  return getComputedStyle(document.documentElement).getPropertyValue(name).trim() || fallback;
}

/**
 * Misma idea que el animador de kanji: la letra queda en contorno gris
 * y cada parte se rellena en ámbar, en el orden de los pasos.
 */
export class PalmerStrokePreview {
  private readonly canvas: HTMLCanvasElement;
  private readonly ctx: CanvasRenderingContext2D;
  private strokes: Point2[][] = [];
  private frame = 0;
  private timer = 0;
  private token = 0;
  private dpr = 1;

  constructor(private readonly host: HTMLElement) {
    this.canvas = document.createElement('canvas');
    this.canvas.className = 'stroke-preview';
    this.canvas.setAttribute('aria-hidden', 'true');
    const ctx = this.canvas.getContext('2d');
    if (!ctx) throw new Error('No se pudo crear el lienzo de la letra');
    this.ctx = ctx;
    this.resize();
  }

  attach(): void {
    if (this.canvas.parentElement !== this.host) this.host.replaceChildren(this.canvas);
    this.resize();
  }

  stop(): void {
    this.token += 1;
    cancelAnimationFrame(this.frame);
    window.clearTimeout(this.timer);
  }

  show(strokes: Point2[][], filled: number): void {
    this.stop();
    this.strokes = strokes;
    this.resize();
    this.paint(Math.max(0, filled));
  }

  animate(): void {
    if (this.strokes.length === 0) return;
    const token = ++this.token;
    cancelAnimationFrame(this.frame);
    window.clearTimeout(this.timer);
    this.resize();
    this.paint(0);
    this.play(0, token);
  }

  private resize(): void {
    this.dpr = Math.min(2, window.devicePixelRatio || 1);
    this.canvas.width = VIEW * this.dpr;
    this.canvas.height = VIEW * this.dpr;
    this.ctx.setTransform(this.dpr, 0, 0, this.dpr, 0, 0);
  }

  private play(index: number, token: number): void {
    if (token !== this.token) return;
    if (index >= this.strokes.length) {
      this.paint(this.strokes.length);
      return;
    }
    const duration = Math.min(980, Math.max(460, this.length(this.strokes[index]) * 820));
    const started = performance.now();
    const frame = (now: number) => {
      if (token !== this.token) return;
      const t = Math.min(1, (now - started) / duration);
      const eased = t < 0.5 ? 2 * t * t : 1 - ((-2 * t + 2) ** 2) / 2;
      this.paint(index + eased);
      if (t < 1) this.frame = requestAnimationFrame(frame);
      else this.timer = window.setTimeout(() => this.play(index + 1, token), 160);
    };
    this.frame = requestAnimationFrame(frame);
  }

  private paint(revealed: number): void {
    this.ctx.setTransform(this.dpr, 0, 0, this.dpr, 0, 0);
    this.ctx.clearRect(0, 0, VIEW, VIEW);
    if (this.strokes.length === 0) return;

    const placed = this.place(this.strokes);
    const whole = Math.floor(revealed);
    const fraction = revealed - whole;
    this.ctx.lineCap = 'round';
    this.ctx.lineJoin = 'round';

    this.ctx.lineWidth = placed.width;
    this.ctx.strokeStyle = themeColor('--guide-anim', '#b45309');
    for (let i = 0; i < whole && i < placed.strokes.length; i++) this.trace(placed.strokes[i]);
    if (fraction > 0 && whole < placed.strokes.length) {
      this.trace(this.slice(placed.strokes[whole], 0, fraction));
    }

    this.ctx.lineWidth = Math.max(2.4, placed.width * 0.42);
    this.ctx.strokeStyle = themeColor('--guide-outline', '#b7c0cb');
    for (let i = whole; i < placed.strokes.length; i++) {
      const stroke = placed.strokes[i];
      if (i === whole && fraction > 0) this.trace(this.slice(stroke, fraction, 1));
      else this.trace(stroke);
    }
  }

  private place(strokes: Point2[][]): { strokes: Point2[][]; width: number } {
    const slanted = strokes.map((stroke) => stroke.map((point) => this.slant(point)));
    let minX = Infinity;
    let minY = Infinity;
    let maxX = -Infinity;
    let maxY = -Infinity;
    for (const stroke of slanted) {
      for (const point of stroke) {
        minX = Math.min(minX, point.x);
        minY = Math.min(minY, point.y);
        maxX = Math.max(maxX, point.x);
        maxY = Math.max(maxY, point.y);
      }
    }
    const pad = 10;
    const spanX = Math.max(0.04, maxX - minX);
    const spanY = Math.max(0.04, maxY - minY);
    const scale = (VIEW - pad * 2) / Math.max(spanX, spanY);
    const ox = (VIEW - spanX * scale) / 2 - minX * scale;
    const oy = (VIEW - spanY * scale) / 2 - minY * scale;
    return {
      strokes: slanted.map((stroke) => stroke.map((point) => ({ x: ox + point.x * scale, y: oy + point.y * scale }))),
      width: Math.max(6.5, Math.min(spanX, spanY) * scale * 0.16)
    };
  }

  private slant(point: Point2): Point2 {
    return { x: point.x + (BASE_Y - point.y) / Math.tan(SLANT), y: point.y };
  }

  private trace(points: Point2[]): void {
    if (points.length < 2) return;
    this.ctx.beginPath();
    points.forEach((point, index) => {
      if (index === 0) this.ctx.moveTo(point.x, point.y);
      else this.ctx.lineTo(point.x, point.y);
    });
    this.ctx.stroke();
  }

  private slice(points: Point2[], startFraction: number, endFraction: number): Point2[] {
    const total = this.length(points);
    const start = total * Math.min(1, Math.max(0, startFraction));
    const end = total * Math.min(1, Math.max(0, endFraction));
    if (end <= start) return [];
    const sliced: Point2[] = [];
    let traveled = 0;
    for (let i = 1; i < points.length; i++) {
      const from = points[i - 1];
      const to = points[i];
      const span = Math.hypot(to.x - from.x, to.y - from.y);
      if (span === 0) continue;
      const segStart = traveled;
      const segEnd = traveled + span;
      if (segEnd >= start && segStart <= end) {
        const a = Math.max(0, (start - segStart) / span);
        const b = Math.min(1, (end - segStart) / span);
        if (sliced.length === 0) sliced.push({ x: from.x + (to.x - from.x) * a, y: from.y + (to.y - from.y) * a });
        sliced.push({ x: from.x + (to.x - from.x) * b, y: from.y + (to.y - from.y) * b });
      }
      traveled = segEnd;
      if (traveled >= end) break;
    }
    return sliced;
  }

  private length(points: Point2[]): number {
    let total = 0;
    for (let i = 1; i < points.length; i++) {
      total += Math.hypot(points[i].x - points[i - 1].x, points[i].y - points[i - 1].y);
    }
    return total;
  }
}
