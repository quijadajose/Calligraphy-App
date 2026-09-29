interface FinishSummary {
  title: string;
  elapsedMs: number;
  averagePressure: number | null;
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

const COLORS = ['#e5a93c', '#f4f1ea', '#8eb4d4', '#d6dde8', '#f0c36a'];

export class FinishOverlay {
  public onHome?: () => void;
  public onStay?: () => void;

  private readonly layer: HTMLElement;
  private readonly title: HTMLElement;
  private readonly time: HTMLElement;
  private readonly pressure: HTMLElement;
  private readonly canvas: HTMLCanvasElement;
  private readonly ctx: CanvasRenderingContext2D;
  private particles: Particle[] = [];
  private frame = 0;

  constructor(layer: HTMLElement) {
    this.layer = layer;
    this.title = layer.querySelector('#finish-title') as HTMLElement;
    this.time = layer.querySelector('#finish-time') as HTMLElement;
    this.pressure = layer.querySelector('#finish-pressure') as HTMLElement;
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
  }

  public show(summary: FinishSummary): void {
    this.title.textContent = summary.title;
    this.time.textContent = formatDuration(summary.elapsedMs);
    this.pressure.textContent =
      summary.averagePressure == null ? 'Sin medición' : `${Math.round(summary.averagePressure * 100)} %`;
    this.layer.hidden = false;
    this.burst();
  }

  public hide(): void {
    this.layer.hidden = true;
    cancelAnimationFrame(this.frame);
    this.particles = [];
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
        color: COLORS[Math.floor(Math.random() * COLORS.length)]
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

function formatDuration(ms: number): string {
  const total = Math.max(1, Math.round(ms / 1000));
  const minutes = Math.floor(total / 60);
  const seconds = total % 60;
  if (minutes === 0) return `${seconds} s`;
  return `${minutes}:${String(seconds).padStart(2, '0')}`;
}
