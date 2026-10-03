import { holdDialog, prefersReducedMotion } from '../dialog';

interface FinishSummary {
  title: string;
  elapsedMs: number;
  averagePressure: number | null;
  nextTitle: string | null;
}

interface Particle {
  x: number;
  y: number;
  vx: number;
  vy: number;
  size: number;
  spin: number;
  angle: number;
  color: string;
}

function confettiColors(): string[] {
  const style = getComputedStyle(document.documentElement);
  const read = (name: string, fallback: string) => style.getPropertyValue(name).trim() || fallback;
  return [read('--accent-soft', '#e5a93c'), read('--ut', '#f4f1ea'), read('--accent-green', '#8eb4d4'), read('--accent', '#f0c36a')];
}

export class FinishOverlay {
  public onHome?: () => void;
  public onStay?: () => void;
  public onNext?: () => void;

  private readonly layer: HTMLElement;
  private readonly title: HTMLElement;
  private readonly time: HTMLElement;
  private readonly pressure: HTMLElement;
  private readonly nextButton: HTMLButtonElement;
  private readonly canvas: HTMLCanvasElement;
  private readonly ctx: CanvasRenderingContext2D;
  private particles: Particle[] = [];
  private frame = 0;
  private release: (() => void) | null = null;

  constructor(layer: HTMLElement) {
    this.layer = layer;
    this.title = layer.querySelector('#finish-title') as HTMLElement;
    this.time = layer.querySelector('#finish-time') as HTMLElement;
    this.pressure = layer.querySelector('#finish-pressure') as HTMLElement;
    this.nextButton = layer.querySelector('#finish-next') as HTMLButtonElement;
    this.canvas = layer.querySelector('#finish-confetti') as HTMLCanvasElement;
    const context = this.canvas.getContext('2d');
    if (!context) throw new Error('No se pudo crear el confeti');
    this.ctx = context;
    layer.querySelector('#finish-home')?.addEventListener('click', () => {
      this.hide();
      this.onHome?.();
    });
    layer.querySelector('#finish-stay')?.addEventListener('click', () => {
      this.hide();
      this.onStay?.();
    });
    this.nextButton.addEventListener('click', () => {
      this.hide();
      this.onNext?.();
    });
  }

  public show(summary: FinishSummary): void {
    this.title.textContent = summary.title;
    this.time.textContent = formatDuration(summary.elapsedMs);
    this.pressure.textContent =
      summary.averagePressure == null ? 'Sin medición' : `${Math.round(summary.averagePressure * 100)} %`;
    this.nextButton.hidden = !summary.nextTitle;
    this.nextButton.textContent = summary.nextTitle ? `Siguiente: ${summary.nextTitle}` : 'Siguiente';
    this.layer.hidden = false;
    this.release?.();
    this.release = holdDialog(this.layer, () => {
      this.hide();
      this.onStay?.();
    });
    if (!prefersReducedMotion()) this.burst();
  }

  public hide(): void {
    if (this.layer.hidden) return;
    this.layer.hidden = true;
    cancelAnimationFrame(this.frame);
    this.particles = [];
    this.release?.();
    this.release = null;
  }

  private burst(): void {
    const width = window.innerWidth;
    const height = window.innerHeight;
    const dpr = window.devicePixelRatio || 1;
    this.canvas.width = Math.floor(width * dpr);
    this.canvas.height = Math.floor(height * dpr);
    this.canvas.style.width = `${width}px`;
    this.canvas.style.height = `${height}px`;
    this.ctx.setTransform(dpr, 0, 0, dpr, 0, 0);
    const colors = confettiColors();
    this.particles = Array.from({ length: 90 }, () => {
      const angle = -Math.PI / 2 + (Math.random() - 0.5) * 1.4;
      const speed = 6 + Math.random() * 8;
      return {
        x: width * (0.25 + Math.random() * 0.5),
        y: height * 0.42,
        vx: Math.cos(angle) * speed,
        vy: Math.sin(angle) * speed - 2,
        size: 5 + Math.random() * 6,
        spin: (Math.random() - 0.5) * 0.3,
        angle: Math.random() * Math.PI,
        color: colors[Math.floor(Math.random() * colors.length)]
      };
    });
    const tick = () => {
      if (this.layer.hidden) return;
      this.ctx.clearRect(0, 0, width, height);
      let alive = false;
      for (const piece of this.particles) {
        piece.vy += 0.18;
        piece.x += piece.vx;
        piece.y += piece.vy;
        piece.angle += piece.spin;
        if (piece.y < height + 20) alive = true;
        this.ctx.save();
        this.ctx.translate(piece.x, piece.y);
        this.ctx.rotate(piece.angle);
        this.ctx.fillStyle = piece.color;
        this.ctx.fillRect(-piece.size / 2, -piece.size / 4, piece.size, piece.size / 2);
        this.ctx.restore();
      }
      if (alive) this.frame = requestAnimationFrame(tick);
    };
    cancelAnimationFrame(this.frame);
    this.frame = requestAnimationFrame(tick);
  }
}

export function formatDuration(ms: number): string {
  const total = Math.max(1, Math.round(ms / 1000));
  const minutes = Math.floor(total / 60);
  const seconds = total % 60;
  if (minutes === 0) return `${seconds} s`;
  return `${minutes}:${String(seconds).padStart(2, '0')}`;
}
