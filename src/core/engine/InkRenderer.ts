import { Stroke } from '../../types/ink';
import { BrushRenderer } from './BrushRenderer';

export class InkRenderer {
  private brush = new BrushRenderer();

  public renderStrokes(ctx: CanvasRenderingContext2D, strokes: Stroke[]): void {
    for (const stroke of strokes) this.brush.drawStroke(ctx, stroke);
  }

  public drawStroke(ctx: CanvasRenderingContext2D, stroke: Stroke): void {
    this.brush.drawStroke(ctx, stroke);
  }
}
