import { GridMode, Point2 } from '../../types/ink';
import {
  PALMER_PEN_RATIO,
  scriptSlant,
  exampleBox,
  genkouyoushiLayout,
  mapPalmerPoint,
  palmerCellWidth,
  palmerRowCount,
  palmerRowGeometry,
  sentenceFrame,
  sentenceRowGeometry
} from './gridMetrics';
import { SHEET_TEXT_X, sentenceFont, sentenceFontSize, sentenceSkew } from './sentenceLayout';

export class GridRenderer {
  private sheetCache: { key: string; canvas: HTMLCanvasElement } | null = null;

  /** Líneas de inclinación a 52° en la pauta Palmer. */
  public showSlant = true;

  public drawGrid(ctx: CanvasRenderingContext2D, width: number, height: number, mode: GridMode): void {
    if (mode === 'none') return;
    ctx.save();
    if (mode === 'palmer') this.drawPalmerLines(ctx, width, height);
    else if (mode === 'genkouyoushi') this.drawGenkouyoushiGrid(ctx, width, height);
    ctx.restore();
  }

  public drawGhost(
    ctx: CanvasRenderingContext2D,
    width: number,
    height: number,
    mode: GridMode,
    strokes: Point2[][]
  ): void {
    if (strokes.length === 0) return;
    ctx.save();
    ctx.lineCap = 'round';
    ctx.lineJoin = 'round';
    ctx.strokeStyle = this.ghostColor(mode);
    ctx.lineWidth = mode === 'genkouyoushi'
      ? Math.max(8, exampleBox(genkouyoushiLayout(width, height)).size * 0.07)
      : 2.4;

    for (const stroke of strokes) {
      if (stroke.length === 0) continue;
      ctx.beginPath();
      stroke.forEach((point, index) => {
        const mapped = this.mapGuidePoint(point, width, height, mode);
        if (index === 0) ctx.moveTo(mapped.x, mapped.y);
        else ctx.lineTo(mapped.x, mapped.y);
      });
      ctx.stroke();
    }
    ctx.restore();
  }

  /** Palabra japonesa: cada signo en su cuadro, desde el primero. Los siguientes quedan para copiar. */
  public drawGhostGlyphs(ctx: CanvasRenderingContext2D, width: number, height: number, glyphs: Point2[][][]): void {
    const layout = genkouyoushiLayout(width, height);
    ctx.save();
    ctx.lineCap = 'round';
    ctx.lineJoin = 'round';
    ctx.strokeStyle = this.ghostColor('genkouyoushi');
    glyphs.forEach((strokes, index) => {
      const box = layout.boxes[index];
      if (!box) return;
      ctx.lineWidth = Math.max(8, box.size * 0.07);
      for (const stroke of strokes) {
        if (stroke.length === 0) continue;
        ctx.beginPath();
        stroke.forEach((point, i) => {
          const x = box.x + point.x * box.size;
          const y = box.y + point.y * box.size;
          if (i === 0) ctx.moveTo(x, y);
          else ctx.lineTo(x, y);
        });
        ctx.stroke();
      }
    });
    ctx.restore();
  }

  /**
   * Un solo modelo grande: la letra completa en gris y el paso actual
   * como trazo discontinuo con flecha y número.
   */
  public drawPalmerLesson(
    ctx: CanvasRenderingContext2D,
    width: number,
    height: number,
    steps: Point2[][][],
    active: number
  ): void {
    const layout = this.layoutPalmerLesson(width, height, steps, active);
    if (!layout) return;
    const row = palmerRowGeometry(this.modelRowIndex(height), height);
    ctx.save();
    ctx.lineCap = 'round';
    ctx.lineJoin = 'round';
    const mood = this.paperMood();
    ctx.strokeStyle = mood === 'dark'
      ? 'rgba(168, 186, 204, 0.78)'
      : 'rgba(120, 126, 136, 0.92)';
    ctx.lineWidth = layout.width;
    ctx.setLineDash([]);
    for (const stroke of layout.strokes) this.strokePolyline(ctx, stroke);

    const current = layout.strokes[layout.arrowIndex];
    if (current && current.length > 1) this.drawTraceArrow(ctx, current, row.xHeight);
    ctx.restore();
  }

  /** Misma posición que el modelo grande, para animar el trazo encima. */
  public layoutPalmerLesson(
    width: number,
    height: number,
    steps: Point2[][][],
    active: number
  ): { strokes: Point2[][]; width: number; arrowIndex: number } | null {
    if (steps.length === 0) return null;
    const row = palmerRowGeometry(this.modelRowIndex(height), height);
    const focus = Math.max(0, Math.min(steps.length - 1, active));
    const cumulative = steps.every((step, index) => step.length === index + 1);
    const form = (cumulative ? steps[steps.length - 1] : steps[focus]) ?? [];
    const arrowIndex = cumulative ? focus : Math.max(0, form.length - 1);
    const mapped = form.map((stroke) => stroke.map((point) => mapPalmerPoint(point, 0, row)));

    let minX = Infinity;
    let maxX = -Infinity;
    for (const stroke of mapped) {
      for (const point of stroke) {
        minX = Math.min(minX, point.x);
        maxX = Math.max(maxX, point.x);
      }
    }
    if (!Number.isFinite(minX)) return null;
    const shift = width / 2 - (minX + maxX) / 2;
    return {
      strokes: mapped.map((stroke) => stroke.map((point) => ({ x: point.x + shift, y: point.y }))),
      width: Math.max(8, row.xHeight * PALMER_PEN_RATIO),
      arrowIndex
    };
  }

  public layoutGhost(
    width: number,
    height: number,
    mode: GridMode,
    strokes: Point2[][]
  ): { strokes: Point2[][]; width: number } | null {
    if (strokes.length === 0) return null;
    const mapped = strokes.map((stroke) => stroke.map((point) => this.mapGuidePoint(point, width, height, mode)));
    let lineWidth = 10;
    if (mode === 'genkouyoushi') {
      const box = exampleBox(genkouyoushiLayout(width, height));
      lineWidth = Math.max(8, box.size * 0.07);
    } else {
      const row = palmerRowGeometry(this.modelRowIndex(height), height);
      lineWidth = Math.max(8, row.xHeight * PALMER_PEN_RATIO);
    }
    return { strokes: mapped, width: lineWidth };
  }

  /** Dibuja los trazos ya hechos y la fracción del trazo en curso. */
  public drawRevealedStrokes(
    ctx: CanvasRenderingContext2D,
    strokes: Point2[][],
    lineWidth: number,
    revealed: number
  ): void {
    if (strokes.length === 0 || revealed <= 0) return;
    const whole = Math.floor(revealed);
    const fraction = revealed - whole;
    ctx.save();
    ctx.lineCap = 'round';
    ctx.lineJoin = 'round';
    ctx.strokeStyle = this.token('--guide-anim', '#b45309');
    ctx.lineWidth = lineWidth;
    ctx.setLineDash([]);
    for (let i = 0; i < whole && i < strokes.length; i++) this.strokePolyline(ctx, strokes[i]);
    if (fraction > 0 && whole < strokes.length) {
      const stroke = strokes[whole];
      const distance = this.polylineLength(stroke) * fraction;
      this.strokePolyline(ctx, this.slicePolyline(stroke, 0, distance));
    }
    ctx.restore();
  }

  private ghostColor(mode: GridMode): string {
    const mood = this.paperMood();
    return mode === 'genkouyoushi'
      ? (mood === 'dark' ? 'rgba(220, 150, 130, 0.7)' : 'rgba(180, 80, 60, 0.45)')
      : (mood === 'dark' ? 'rgba(168, 186, 204, 0.62)' : 'rgba(70, 90, 120, 0.4)');
  }

  /** Color de un token CSS del tema, con respaldo si el documento no lo define. */
  private token(name: string, fallback: string): string {
    if (typeof document === 'undefined') return fallback;
    const value = getComputedStyle(document.documentElement).getPropertyValue(name).trim();
    return value || fallback;
  }

  private strokePolyline(ctx: CanvasRenderingContext2D, points: Point2[]): void {
    if (points.length < 2) return;
    ctx.beginPath();
    points.forEach((point, index) => {
      if (index === 0) ctx.moveTo(point.x, point.y);
      else ctx.lineTo(point.x, point.y);
    });
    ctx.stroke();
  }

  private drawTraceArrow(ctx: CanvasRenderingContext2D, points: Point2[], xHeight: number): void {
    const length = this.polylineLength(points);
    if (length < 8) return;
    const mood = this.paperMood();
    const ink = mood === 'dark' ? '#f4f7fb' : '#2a3140';
    const ring = Math.max(5.5, xHeight * 0.055);
    const mark = Math.max(9, xHeight * 0.13);
    const start = points[0];

    ctx.save();
    ctx.strokeStyle = ink;
    ctx.lineWidth = Math.max(1.8, xHeight * 0.02);
    ctx.lineCap = 'round';
    ctx.lineJoin = 'round';
    ctx.setLineDash([]);
    ctx.beginPath();
    ctx.arc(start.x, start.y, ring, 0, Math.PI * 2);
    ctx.stroke();

    const spots = length < xHeight * 1.6 ? [0.62] : [0.36, 0.68];
    for (const t of spots) {
      const distance = length * t;
      const at = this.pointAt(points, distance);
      if (!at) continue;
      this.drawChevron(ctx, at, this.headingAt(points, Math.max(0, distance - 6)), mark);
    }
    ctx.restore();
  }

  private drawChevron(ctx: CanvasRenderingContext2D, at: Point2, angle: number, size: number): void {
    ctx.save();
    ctx.translate(at.x, at.y);
    ctx.rotate(angle);
    ctx.beginPath();
    ctx.moveTo(-size * 0.55, -size * 0.4);
    ctx.lineTo(size * 0.32, 0);
    ctx.lineTo(-size * 0.55, size * 0.4);
    ctx.stroke();
    ctx.restore();
  }

  private pointAt(points: Point2[], distance: number): Point2 | null {
    const sample = this.slicePolyline(points, distance, distance + 1);
    return sample[0] ?? null;
  }

  private headingAt(points: Point2[], distance: number): number {
    const sample = this.slicePolyline(points, distance, distance + 6);
    const from = sample[0] ?? points[0];
    const to = sample[sample.length - 1] ?? points[Math.min(1, points.length - 1)];
    return Math.atan2(to.y - from.y, to.x - from.x);
  }

  private polylineLength(points: Point2[]): number {
    let length = 0;
    for (let i = 1; i < points.length; i++) length += Math.hypot(points[i].x - points[i - 1].x, points[i].y - points[i - 1].y);
    return length;
  }

  private slicePolyline(points: Point2[], startDist: number, endDist: number): Point2[] {
    if (points.length < 2 || endDist <= startDist) return [];
    const sliced: Point2[] = [];
    let traveled = 0;
    for (let i = 1; i < points.length; i++) {
      const from = points[i - 1];
      const to = points[i];
      const span = Math.hypot(to.x - from.x, to.y - from.y);
      if (span === 0) continue;
      const segStart = traveled;
      const segEnd = traveled + span;
      if (segEnd >= startDist && segStart <= endDist) {
        const a = Math.max(0, (startDist - segStart) / span);
        const b = Math.min(1, (endDist - segStart) / span);
        if (sliced.length === 0) sliced.push({ x: from.x + (to.x - from.x) * a, y: from.y + (to.y - from.y) * a });
        sliced.push({ x: from.x + (to.x - from.x) * b, y: from.y + (to.y - from.y) * b });
      }
      traveled = segEnd;
      if (traveled >= endDist) break;
    }
    return sliced;
  }

  private mapGuidePoint(point: Point2, width: number, height: number, mode: GridMode): Point2 {
    if (mode === 'genkouyoushi') {
      const box = exampleBox(genkouyoushiLayout(width, height));
      return { x: box.x + point.x * box.size, y: box.y + point.y * box.size };
    }

    const row = palmerRowGeometry(this.modelRowIndex(height), height);
    return mapPalmerPoint(point, Math.max(16, (width - palmerCellWidth(row)) / 2), row);
  }

  private paperMood(): 'dark' | 'day' {
    const theme = document.documentElement.dataset.theme;
    if (theme === 'dark') return 'dark';
    return 'day';
  }

  /** La fila modelo queda debajo de la tarjeta de la lección. */
  private modelRowIndex(height: number): number {
    const rows = palmerRowCount(height);
    return rows > 1 ? 1 : 0;
  }

  /** La primera línea lleva la oración punteada. Las demás quedan en blanco. */
  public drawSentenceSheet(
    ctx: CanvasRenderingContext2D,
    width: number,
    height: number,
    text: string,
    guideAlpha = 1
  ): void {
    this.drawPalmerLines(ctx, width, height, 'sentence');
    this.drawSheetLabels(ctx, height, guideAlpha > 0);
    if (guideAlpha <= 0) return;
    ctx.save();
    ctx.globalAlpha = guideAlpha;
    this.drawDottedSentence(ctx, width, height, text);
    ctx.restore();
  }

  private drawSheetLabels(ctx: CanvasRenderingContext2D, height: number, guided: boolean): void {
    const { rows } = sentenceFrame(height);
    ctx.save();
    ctx.font = '600 11px Outfit, sans-serif';
    const mood = this.paperMood();
    ctx.fillStyle = mood === 'dark'
      ? 'rgba(196, 190, 180, 0.82)'
      : 'rgba(70, 64, 56, 0.72)';
    ctx.textBaseline = 'middle';
    for (let rowIndex = 0; rowIndex < rows; rowIndex++) {
      const row = sentenceRowGeometry(rowIndex, height);
      ctx.fillText(rowIndex === 0 && guided ? 'Con guías' : 'Sin guías', 14, (row.waistY + row.baseY) / 2);
    }
    ctx.restore();
  }

  private drawDottedSentence(ctx: CanvasRenderingContext2D, width: number, height: number, text: string): void {
    if (width < 8 || height < 8 || !text) return;
    const mood = this.paperMood();
    const dpr = window.devicePixelRatio || 1;
    const ready = typeof document !== 'undefined' && document.fonts?.check('600 16px Caveat') ? 1 : 0;
    const key = `${Math.round(width)}x${Math.round(height)}@${dpr}:${mood}:${ready}:${text}`;
    if (!this.sheetCache || this.sheetCache.key !== key) {
      const canvas = document.createElement('canvas');
      canvas.width = Math.ceil(width * dpr);
      canvas.height = Math.ceil(height * dpr);
      const off = canvas.getContext('2d');
      if (!off) return;
      off.setTransform(dpr, 0, 0, dpr, 0, 0);
      const row = sentenceRowGeometry(0, height);
      const color = mood === 'dark'
        ? 'rgba(214, 218, 224, 0.95)'
        : 'rgba(62, 68, 80, 0.9)';
      const size = sentenceFontSize(off, text, row.xHeight, width);
      const gap = Math.max(3.4, row.xHeight * 0.07);
      const radius = Math.max(0.9, gap * 0.34);
      const tile = document.createElement('canvas');
      const tileSize = Math.max(2, Math.round(gap));
      tile.width = tileSize;
      tile.height = tileSize;
      const dots = tile.getContext('2d');
      if (dots) {
        dots.fillStyle = color;
        dots.beginPath();
        dots.arc(tileSize / 2, tileSize / 2, radius, 0, Math.PI * 2);
        dots.fill();
      }
      off.clearRect(0, 0, width, height);
      off.font = sentenceFont(size);
      off.fillStyle = dots ? off.createPattern(tile, 'repeat') ?? color : color;
      off.textBaseline = 'alphabetic';
      off.translate(SHEET_TEXT_X, row.baseY);
      off.transform(1, 0, sentenceSkew(), 1, 0, 0);
      off.fillText(text, 0, 0);
      this.sheetCache = { key, canvas };
    }
    ctx.drawImage(this.sheetCache.canvas, 0, 0, width, height);
  }

  private drawPalmerLines(
    ctx: CanvasRenderingContext2D,
    width: number,
    height: number,
    staff: 'practice' | 'sentence' = 'practice'
  ): void {
    const numRows = staff === 'sentence' ? sentenceFrame(height).rows : palmerRowCount(height);
    const slantDeg = scriptSlant();
    const slantAngleRad = (slantDeg * Math.PI) / 180;

    for (let r = 0; r < numRows; r++) {
      const { ascenderY, waistY, baseY, descenderY } =
        staff === 'sentence' ? sentenceRowGeometry(r, height) : palmerRowGeometry(r, height);

      const mood = this.paperMood();
      ctx.strokeStyle = mood === 'dark'
        ? 'rgba(176, 198, 214, 0.42)'
        : 'rgba(70, 130, 180, 0.45)';
      ctx.lineWidth = 1.5;
      ctx.setLineDash([]);
      ctx.beginPath();
      ctx.moveTo(0, baseY);
      ctx.lineTo(width, baseY);
      ctx.stroke();

      ctx.strokeStyle = mood === 'dark'
        ? 'rgba(176, 198, 214, 0.28)'
        : 'rgba(70, 130, 180, 0.25)';
      ctx.setLineDash([4, 4]);
      ctx.lineWidth = 1;
      ctx.beginPath();
      ctx.moveTo(0, waistY);
      ctx.lineTo(width, waistY);
      ctx.stroke();

      ctx.setLineDash([2, 4]);
      ctx.strokeStyle = mood === 'dark'
        ? 'rgba(176, 198, 214, 0.16)'
        : 'rgba(70, 130, 180, 0.15)';
      ctx.beginPath();
      ctx.moveTo(0, ascenderY);
      ctx.lineTo(width, ascenderY);
      ctx.moveTo(0, descenderY);
      ctx.lineTo(width, descenderY);
      ctx.stroke();
      ctx.setLineDash([]);

      ctx.strokeStyle = mood === 'dark'
        ? 'rgba(214, 176, 122, 0.14)'
        : 'rgba(230, 126, 34, 0.18)';
      // La imprenta es vertical: sin líneas de inclinación.
      if (!this.showSlant || slantDeg >= 89.9) continue;
      ctx.lineWidth = 0.8;
      const spacing = 50;
      const deltaX = (descenderY - ascenderY) / Math.tan(slantAngleRad);

      for (let x = -width; x < width * 2; x += spacing) {
        ctx.beginPath();
        ctx.moveTo(x + deltaX, ascenderY);
        ctx.lineTo(x, descenderY);
        ctx.stroke();
      }
    }
  }

  private drawGenkouyoushiGrid(ctx: CanvasRenderingContext2D, width: number, height: number): void {
    const layout = genkouyoushiLayout(width, height);

    for (const box of layout.boxes) {
      const mood = this.paperMood();
      ctx.strokeStyle = mood === 'dark'
        ? 'rgba(220, 150, 130, 0.55)'
        : 'rgba(180, 80, 60, 0.35)';
      ctx.lineWidth = 2;
      ctx.setLineDash([]);
      ctx.strokeRect(box.x, box.y, box.size, box.size);

      ctx.strokeStyle = mood === 'dark'
        ? 'rgba(220, 150, 130, 0.35)'
        : 'rgba(180, 80, 60, 0.2)';
      ctx.lineWidth = 1;
      ctx.setLineDash([5, 5]);
      ctx.beginPath();
      ctx.moveTo(box.x + box.size / 2, box.y);
      ctx.lineTo(box.x + box.size / 2, box.y + box.size);
      ctx.moveTo(box.x, box.y + box.size / 2);
      ctx.lineTo(box.x + box.size, box.y + box.size / 2);
      ctx.stroke();
      ctx.setLineDash([]);
    }
  }
}
