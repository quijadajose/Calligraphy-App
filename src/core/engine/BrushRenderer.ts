import { BrushTool, Stroke, StrokePoint } from '../../types/ink';
import { StrokeSmoother } from './StrokeSmoother';

/** Grosor real del trazo a partir del grosor base, la presión y la velocidad. */
export function brushWidthAt(
  tool: BrushTool,
  baseWidth: number,
  pressure: number,
  speed = 0,
  tilt = 0
): number {
  switch (tool) {
    case 'fountain':
      return baseWidth * (0.28 + Math.pow(pressure, 1.7) * 1.7) * (1 - speed * 0.45);
    case 'fude':
      return baseWidth * (0.18 + Math.pow(pressure, 1.3) * 2.6) * (1 - speed * 0.55) * (1 + tilt * 0.35);
    case 'pencil':
    default:
      return baseWidth * (0.72 + pressure * 0.38) * (1 - speed * 0.12);
  }
}

/** Grosor base para que, con presión media y sin velocidad, el trazo mida `target`. */
export function baseWidthMatching(tool: BrushTool, target: number): number {
  const unit = brushWidthAt(tool, 1, 0.5, 0, 0);
  return target / unit;
}

export class BrushRenderer {
  public drawStroke(ctx: CanvasRenderingContext2D, stroke: Stroke): void {
    const points = stroke.points;
    if (points.length === 0) return;

    if (points.length === 1) {
      const width = this.widthAt(points[0], stroke.tool, stroke.baseWidth);
      ctx.save();
      ctx.fillStyle = stroke.color;
      ctx.beginPath();
      ctx.arc(points[0].x, points[0].y, width / 2, 0, Math.PI * 2);
      ctx.fill();
      ctx.restore();
      return;
    }

    const smooth = StrokeSmoother.smooth(points);
    const widths = this.smoothWidths(
      smooth,
      smooth.map((point) => this.widthAt(point, stroke.tool, stroke.baseWidth))
    );
    const left: { x: number; y: number }[] = [];
    const right: { x: number; y: number }[] = [];
    let tx = 1;
    let ty = 0;

    for (let i = 0; i < smooth.length; i++) {
      const prev = smooth[Math.max(0, i - 2)];
      const next = smooth[Math.min(smooth.length - 1, i + 2)];
      let dx = next.x - prev.x;
      let dy = next.y - prev.y;
      if (dx * tx + dy * ty < 0) {
        dx = -dx;
        dy = -dy;
      }
      tx = tx * 0.55 + dx * 0.45;
      ty = ty * 0.55 + dy * 0.45;
      const length = Math.hypot(tx, ty) || 1;
      tx /= length;
      ty /= length;
      const half = widths[i] / 2;
      left.push({ x: smooth[i].x - ty * half, y: smooth[i].y + tx * half });
      right.push({ x: smooth[i].x + ty * half, y: smooth[i].y - tx * half });
    }

    ctx.save();
    ctx.fillStyle = stroke.color;
    ctx.beginPath();
    this.curveThrough(ctx, left);
    this.curveThrough(ctx, right.reverse());
    ctx.closePath();
    ctx.fill();
    ctx.restore();
  }

  /** El grosor no puede saltar de muestra en muestra: eso serrucha el borde. */
  private smoothWidths(points: StrokePoint[], widths: number[]): number[] {
    const radius = 5;
    const averaged = widths.map((_, index) => {
      let sum = 0;
      let weight = 0;
      for (let offset = -radius; offset <= radius; offset++) {
        const sample = index + offset;
        if (sample < 0 || sample >= widths.length) continue;
        const influence = radius + 1 - Math.abs(offset);
        sum += widths[sample] * influence;
        weight += influence;
      }
      return sum / weight;
    });

    for (let i = 1; i < averaged.length; i++) {
      const dist = Math.hypot(points[i].x - points[i - 1].x, points[i].y - points[i - 1].y);
      const maxDelta = Math.max(0.4, dist * 0.35);
      averaged[i] = Math.max(averaged[i - 1] - maxDelta, Math.min(averaged[i - 1] + maxDelta, averaged[i]));
    }
    for (let i = averaged.length - 2; i >= 0; i--) {
      const dist = Math.hypot(points[i].x - points[i + 1].x, points[i].y - points[i + 1].y);
      const maxDelta = Math.max(0.4, dist * 0.35);
      averaged[i] = Math.max(averaged[i + 1] - maxDelta, Math.min(averaged[i + 1] + maxDelta, averaged[i]));
    }
    return averaged;
  }

  private curveThrough(ctx: CanvasRenderingContext2D, points: { x: number; y: number }[]): void {
    ctx.lineTo(points[0].x, points[0].y);
    if (points.length < 3) {
      for (let i = 1; i < points.length; i++) ctx.lineTo(points[i].x, points[i].y);
      return;
    }
    for (let i = 1; i < points.length - 1; i++) {
      const midX = (points[i].x + points[i + 1].x) / 2;
      const midY = (points[i].y + points[i + 1].y) / 2;
      ctx.quadraticCurveTo(points[i].x, points[i].y, midX, midY);
    }
    const last = points[points.length - 1];
    ctx.lineTo(last.x, last.y);
  }

  private widthAt(point: StrokePoint, tool: BrushTool, baseWidth: number): number {
    const pressure = point.pressure > 0 ? point.pressure : 0.5;
    const speed = Math.min(1, (point.velocity ?? 0) / 1.6);
    const tilt = Math.min(1, Math.abs(point.tiltX) / 60);
    return brushWidthAt(tool, baseWidth, pressure, speed, tilt);
  }
}
