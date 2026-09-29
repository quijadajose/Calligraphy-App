import { BrushTool, GridMode, Point2, Stroke, StrokePoint } from '../../types/ink';
import { PALMER_PEN_RATIO, sentenceRowGeometry, setPracticeChrome } from './gridMetrics';
import { GridRenderer } from './GridRenderer';
import { InkRenderer } from './InkRenderer';
import { PalmRejection } from './PalmRejection';

type BufferCanvas = OffscreenCanvas | HTMLCanvasElement;

export class InkCanvas {
  private container: HTMLElement;
  private canvas: HTMLCanvasElement;
  private ctx: CanvasRenderingContext2D;
  private buffer: BufferCanvas | null = null;
  private bufferCtx: CanvasRenderingContext2D | null = null;
  private inkRenderer = new InkRenderer();
  private gridRenderer = new GridRenderer();
  private palmRejection = new PalmRejection();

  private strokes: Stroke[] = [];
  private currentStroke: Stroke | null = null;
  private activePointerId: number | null = null;
  private ghost: Point2[][] = [];
  private palmerSteps: Point2[][][] | null = null;
  private palmerActive = 0;
  private sheetText: string | null = null;
  private cssWidth = 0;
  private cssHeight = 0;
  private guideAnim: { strokes: Point2[][]; width: number } | null = null;
  private guideReveal = 0;
  private animToken = 0;
  private animFrame = 0;
  private animTimer = 0;

  public currentTool: BrushTool = 'fountain';
  public currentColor = '#1a1a1a';
  public currentBaseWidth = 4;
  public gridMode: GridMode = 'palmer';

  public onStrokeComplete?: (strokes: Stroke[]) => void;
  public onStrokeStart?: () => void;
  public onPressureUpdate?: (pressure: number) => void;
  public onResize?: () => void;

  constructor(container: HTMLElement) {
    this.container = container;
    this.canvas = document.createElement('canvas');
    this.canvas.className = 'ink-canvas';
    this.container.appendChild(this.canvas);

    const context = this.canvas.getContext('2d', { desynchronized: true });
    if (!context) throw new Error('No se pudo inicializar Canvas 2D');
    this.ctx = context;

    this.resizeCanvas();
    window.addEventListener('resize', () => this.resizeCanvas());
    if (typeof ResizeObserver !== 'undefined') {
      const observer = new ResizeObserver(() => this.onSurfaceChange());
      observer.observe(this.container);
      const card = document.getElementById('guide-card');
      const actions = this.container.querySelector('.ink-actions');
      if (card) observer.observe(card);
      if (actions) observer.observe(actions);
    }
    this.setupPointerListeners();
  }

  /** Si la ficha crece, el modelo baja para seguir centrado en el hueco libre. */
  private onSurfaceChange(): void {
    const rect = this.container.getBoundingClientRect();
    const sizeChanged =
      !this.buffer ||
      Math.abs(rect.width - this.cssWidth) >= 0.5 ||
      Math.abs(rect.height - this.cssHeight) >= 0.5;
    if (sizeChanged) {
      this.resizeCanvas();
      return;
    }
    if (this.measureChrome()) {
      this.redrawAll();
      this.onResize?.();
    }
  }

  private measureChrome(): boolean {
    const bounds = this.container.getBoundingClientRect();
    const zen = document.body.classList.contains('zen-mode');
    let top = 24;
    let bottom = 28;
    if (!zen) {
      const card = document.getElementById('guide-card');
      const actions = this.container.querySelector('.ink-actions');
      if (card) {
        const rect = card.getBoundingClientRect();
        if (rect.height > 0) top = rect.bottom - bounds.top + 22;
      }
      if (actions) {
        const rect = actions.getBoundingClientRect();
        if (rect.height > 0) bottom = bounds.bottom - rect.top + 16;
      }
    }
    return setPracticeChrome(top, bottom);
  }

  public resizeCanvas(): void {
    const rect = this.container.getBoundingClientRect();
    if (
      this.buffer &&
      Math.abs(rect.width - this.cssWidth) < 0.5 &&
      Math.abs(rect.height - this.cssHeight) < 0.5
    ) {
      if (this.measureChrome()) {
        this.redrawAll();
        this.onResize?.();
      }
      return;
    }
    this.measureChrome();
    this.stopGuideAnimation(false);
    const dpr = window.devicePixelRatio || 1;
    this.cssWidth = rect.width;
    this.cssHeight = rect.height;

    this.canvas.width = Math.max(1, Math.floor(rect.width * dpr));
    this.canvas.height = Math.max(1, Math.floor(rect.height * dpr));
    this.canvas.style.width = `${rect.width}px`;
    this.canvas.style.height = `${rect.height}px`;

    this.ctx.setTransform(dpr, 0, 0, dpr, 0, 0);
    this.ensureBuffer(dpr);
    this.redrawAll();
    this.onResize?.();
  }

  public getSize(): { width: number; height: number } {
    return { width: this.cssWidth, height: this.cssHeight };
  }

  public setGhost(strokes: Point2[][]): void {
    this.stopGuideAnimation(false);
    this.ghost = strokes;
    this.palmerSteps = null;
    this.sheetText = null;
    this.redrawAll();
  }

  public setPalmerGuide(steps: Point2[][][], active: number): void {
    this.stopGuideAnimation(false);
    this.ghost = [];
    this.palmerSteps = steps;
    this.palmerActive = active;
    this.sheetText = null;
    this.redrawAll();
  }

  /** Oración: primera línea punteada y el resto de la hoja en blanco. */
  public setSheet(text: string | null): void {
    this.stopGuideAnimation(false);
    this.sheetText = text;
    this.ghost = [];
    this.palmerSteps = null;
    this.redrawAll();
    if (!text || !document.fonts?.load) return;
    void document.fonts.load('600 64px Caveat').then(() => {
      if (this.sheetText === text) this.redrawAll();
    });
  }

  /** Recorre solo el paso actual, para enseñar el trazo que hay que repetir. */
  public animateCurrentStep(): void {
    if (this.gridMode === 'palmer' && this.palmerSteps?.length) {
      const layout = this.gridRenderer.layoutPalmerLesson(
        this.cssWidth,
        this.cssHeight,
        this.palmerSteps,
        this.palmerActive
      );
      const stroke = layout?.strokes[layout.arrowIndex];
      if (!layout || !stroke || stroke.length < 2) return;
      this.animToken += 1;
      cancelAnimationFrame(this.animFrame);
      window.clearTimeout(this.animTimer);
      this.guideAnim = { strokes: [stroke], width: layout.width };
      this.guideReveal = 0;
      this.playGuide(0, this.animToken);
      return;
    }
    this.animateGuide();
  }

  /** Recorre el modelo del papel, el mismo sitio donde se copia el trazo. */
  public animateGuide(): void {
    const layout = this.currentGuideLayout();
    if (!layout || layout.strokes.length === 0) return;
    this.animToken += 1;
    cancelAnimationFrame(this.animFrame);
    window.clearTimeout(this.animTimer);
    this.guideAnim = layout;
    this.playGuide(0, this.animToken);
  }

  public stopGuideAnimation(redraw = true): void {
    this.animToken += 1;
    cancelAnimationFrame(this.animFrame);
    window.clearTimeout(this.animTimer);
    const had = this.guideAnim !== null;
    this.guideAnim = null;
    if (redraw && had) this.present();
  }

  public clear(notify = true): void {
    this.strokes = [];
    this.currentStroke = null;
    this.redrawAll();
    if (notify) this.onStrokeComplete?.(this.strokes);
  }

  public undo(): void {
    if (this.strokes.length === 0) return;
    this.strokes.pop();
    this.redrawAll();
    this.onStrokeComplete?.(this.strokes);
  }

  public setGrid(mode: GridMode): void {
    this.gridMode = mode;
    this.redrawAll();
  }

  public getStrokes(): Stroke[] {
    return this.strokes;
  }

  /** Grosor del modelo que está en la hoja, en píxeles. */
  public modelStrokeWidth(): number | null {
    if (this.sheetText && this.gridMode === 'palmer') {
      return Math.max(8, sentenceRowGeometry(0, this.cssHeight).xHeight * PALMER_PEN_RATIO);
    }
    return this.currentGuideLayout()?.width ?? null;
  }

  /** Trazo del paso actual, ya colocado donde se ve el modelo. */
  public guideStroke(stepIndex: number): { points: Point2[]; width: number } | null {
    if (this.gridMode !== 'palmer' || !this.palmerSteps?.length) return null;
    const layout = this.gridRenderer.layoutPalmerLesson(this.cssWidth, this.cssHeight, this.palmerSteps, stepIndex);
    const points = layout?.strokes[layout.arrowIndex];
    if (!layout || !points || points.length < 2) return null;
    return { points, width: layout.width };
  }

  private ensureBuffer(dpr: number): void {
    const width = this.canvas.width;
    const height = this.canvas.height;
    if (typeof OffscreenCanvas !== 'undefined') {
      this.buffer = new OffscreenCanvas(width, height);
    } else {
      const canvas = document.createElement('canvas');
      canvas.width = width;
      canvas.height = height;
      this.buffer = canvas;
    }
    const context = this.buffer.getContext('2d');
    if (!context) throw new Error('No se pudo crear el buffer de tinta');
    this.bufferCtx = context as CanvasRenderingContext2D;
    this.bufferCtx.setTransform(dpr, 0, 0, dpr, 0, 0);
  }

  private setupPointerListeners(): void {
    this.canvas.style.touchAction = 'none';
    this.canvas.addEventListener('pointerdown', (event) => this.handlePointerDown(event));
    this.canvas.addEventListener('pointermove', (event) => this.handlePointerMove(event));
    this.canvas.addEventListener('pointerup', (event) => this.handlePointerUp(event));
    this.canvas.addEventListener('pointercancel', (event) => this.handlePointerUp(event));
  }

  private getPointFromEvent(event: PointerEvent): StrokePoint {
    const rect = this.canvas.getBoundingClientRect();
    return {
      x: event.clientX - rect.left,
      y: event.clientY - rect.top,
      pressure: event.pressure,
      tiltX: event.tiltX || 0,
      tiltY: event.tiltY || 0,
      time: performance.now()
    };
  }

  private stampVelocity(point: StrokePoint, previous: StrokePoint | undefined): void {
    if (!previous) {
      point.velocity = 0;
      return;
    }
    const dt = Math.max(0.5, point.time - previous.time);
    point.velocity = Math.hypot(point.x - previous.x, point.y - previous.y) / dt;
  }

  private handlePointerDown(event: PointerEvent): void {
    if (!this.palmRejection.acceptDown(event)) return;
    this.stopGuideAnimation(false);
    this.onStrokeStart?.();
    this.activePointerId = event.pointerId;
    try {
      this.canvas.setPointerCapture(event.pointerId);
    } catch {
      // Algunos eventos sintéticos no admiten captura y aun así deben pintar.
    }

    const point = this.getPointFromEvent(event);
    this.stampVelocity(point, undefined);
    this.onPressureUpdate?.(point.pressure);

    this.currentStroke = {
      points: [point],
      color: this.currentColor,
      baseWidth: this.currentBaseWidth,
      tool: this.currentTool
    };
    this.present();
  }

  private handlePointerMove(event: PointerEvent): void {
    if (!this.currentStroke || event.pointerId !== this.activePointerId) {
      if (event.pointerType === 'pen') this.onPressureUpdate?.(0);
      return;
    }
    if (!this.palmRejection.owns(event)) return;

    const coalesced = typeof event.getCoalescedEvents === 'function' ? event.getCoalescedEvents() : [];
    const events = coalesced.length > 0 ? coalesced : [event];
    for (const sample of events) {
      const point = this.getPointFromEvent(sample);
      const last = this.currentStroke.points[this.currentStroke.points.length - 1];
      this.stampVelocity(point, last);
      this.currentStroke.points.push(point);
      this.onPressureUpdate?.(point.pressure);
    }
    this.present();
  }

  private handlePointerUp(event: PointerEvent): void {
    if (event.pointerId !== this.activePointerId) return;
    this.activePointerId = null;
    this.palmRejection.release(event);
    try {
      if (this.canvas.hasPointerCapture(event.pointerId)) {
        this.canvas.releasePointerCapture(event.pointerId);
      }
    } catch {
      // La captura ya no existe.
    }

    if (this.currentStroke && this.currentStroke.points.length > 0) {
      this.strokes.push(this.currentStroke);
      this.currentStroke = null;
      this.onStrokeComplete?.(this.strokes);
    }
    this.onPressureUpdate?.(0);
    this.redrawAll();
  }

  public redrawAll(): void {
    this.paintCompleted();
    this.present();
  }

  private paintCompleted(): void {
    if (!this.bufferCtx) return;
    const dpr = window.devicePixelRatio || 1;
    this.bufferCtx.setTransform(1, 0, 0, 1, 0, 0);
    this.bufferCtx.clearRect(0, 0, this.canvas.width, this.canvas.height);
    this.bufferCtx.setTransform(dpr, 0, 0, dpr, 0, 0);
    if (this.gridMode === 'palmer' && this.sheetText) {
      this.gridRenderer.drawSentenceSheet(this.bufferCtx, this.cssWidth, this.cssHeight, this.sheetText);
    } else {
      this.gridRenderer.drawGrid(this.bufferCtx, this.cssWidth, this.cssHeight, this.gridMode);
    }
    if (this.gridMode === 'palmer' && this.palmerSteps?.length) {
      this.gridRenderer.drawPalmerLesson(
        this.bufferCtx,
        this.cssWidth,
        this.cssHeight,
        this.palmerSteps,
        this.palmerActive
      );
    } else {
      this.gridRenderer.drawGhost(this.bufferCtx, this.cssWidth, this.cssHeight, this.gridMode, this.ghost);
    }
    this.inkRenderer.renderStrokes(this.bufferCtx, this.strokes);
  }

  private present(): void {
    if (!this.buffer) return;
    const dpr = window.devicePixelRatio || 1;
    this.ctx.setTransform(1, 0, 0, 1, 0, 0);
    this.ctx.clearRect(0, 0, this.canvas.width, this.canvas.height);
    this.ctx.drawImage(this.buffer, 0, 0);
    this.ctx.setTransform(dpr, 0, 0, dpr, 0, 0);
    if (this.guideAnim) {
      this.gridRenderer.drawRevealedStrokes(
        this.ctx,
        this.guideAnim.strokes,
        this.guideAnim.width,
        this.guideReveal
      );
    }
    if (this.currentStroke) this.inkRenderer.drawStroke(this.ctx, this.currentStroke);
  }

  private currentGuideLayout(): { strokes: Point2[][]; width: number } | null {
    if (this.gridMode === 'palmer' && this.palmerSteps?.length) {
      const layout = this.gridRenderer.layoutPalmerLesson(
        this.cssWidth,
        this.cssHeight,
        this.palmerSteps,
        this.palmerActive
      );
      return layout ? { strokes: layout.strokes, width: layout.width } : null;
    }
    if (this.ghost.length === 0) return null;
    return this.gridRenderer.layoutGhost(this.cssWidth, this.cssHeight, this.gridMode, this.ghost);
  }

  private playGuide(index: number, token: number): void {
    if (token !== this.animToken || !this.guideAnim) return;
    if (index >= this.guideAnim.strokes.length) {
      this.guideReveal = this.guideAnim.strokes.length;
      this.present();
      this.animTimer = window.setTimeout(() => {
        if (token !== this.animToken) return;
        this.guideAnim = null;
        this.present();
      }, 700);
      return;
    }
    const length = this.polylineLength(this.guideAnim.strokes[index]);
    const duration = Math.min(1400, Math.max(520, length * 1.1));
    const started = performance.now();
    const frame = (now: number) => {
      if (token !== this.animToken || !this.guideAnim) return;
      const t = Math.min(1, (now - started) / duration);
      const eased = t < 0.5 ? 2 * t * t : 1 - ((-2 * t + 2) ** 2) / 2;
      this.guideReveal = index + eased;
      this.present();
      if (t < 1) this.animFrame = requestAnimationFrame(frame);
      else this.animTimer = window.setTimeout(() => this.playGuide(index + 1, token), 160);
    };
    this.animFrame = requestAnimationFrame(frame);
  }

  private polylineLength(points: Point2[]): number {
    let total = 0;
    for (let i = 1; i < points.length; i++) {
      total += Math.hypot(points[i].x - points[i - 1].x, points[i].y - points[i - 1].y);
    }
    return total;
  }
}
