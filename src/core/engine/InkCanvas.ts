import { BrushTool, GridMode, Point2, Stroke, StrokePoint } from '../../types/ink';
import { PALMER_PEN_RATIO, sentenceRowGeometry, setPracticeChrome } from './gridMetrics';
import { GridRenderer } from './GridRenderer';
import { InkRenderer } from './InkRenderer';
import { PalmRejection } from './PalmRejection';
import { BrushRenderer } from './BrushRenderer';
import { OneEuroFilter } from './OneEuroFilter';
import { PerformanceOverlay } from './PerformanceOverlay';

export class InkCanvas {
  private container: HTMLElement;

  // Capa 1 (Fondo): Cuadrícula, modelo de lección y texto guía. Solo se repinta en resize, cambio de lección o tema.
  private bgCanvas: HTMLCanvasElement;
  private bgCtx: CanvasRenderingContext2D;

  // Capa 2 (Tinta confirmada): Trazos completados consolidados. No se recalcula al escribir trazos nuevos.
  private inkCanvas: HTMLCanvasElement;
  private inkCtx: CanvasRenderingContext2D;

  // Capa 3 (Trazo activo y efímero): Dibuja segmentos incrementales en vivo y predicción de eventos sin tocar Capa 1 y 2.
  private activeCanvas: HTMLCanvasElement;
  private activeCtx: CanvasRenderingContext2D;

  private inkRenderer = new InkRenderer();
  private brushRenderer = new BrushRenderer();
  private gridRenderer = new GridRenderer();
  private palmRejection = new PalmRejection();
  private filter = new OneEuroFilter();
  public perfOverlay: PerformanceOverlay;

  private strokes: Stroke[] = [];
  private currentStroke: Stroke | null = null;
  private activePointerId: number | null = null;
  private ghost: Point2[][] = [];
  private palmerSteps: Point2[][][] | null = null;
  private palmerActive = 0;
  private sheetText: string | null = null;
  private cssWidth = 0;
  private cssHeight = 0;

  // Animación de guía
  private guideAnim: { strokes: Point2[][]; width: number } | null = null;
  private guideReveal = 0;
  private animToken = 0;
  private animFrame = 0;
  private animTimer = 0;

  // Cola y sincronización rAF
  private rawPointQueue: StrokePoint[] = [];
  private predictedPoints: StrokePoint[] = [];
  private lastRenderedPoint: StrokePoint | null = null;
  private lastRenderedWidth = 0;
  private rAFPending = false;
  private latestPressure = 0;

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

    // Crear capas de canvas
    this.bgCanvas = this.createLayer('ink-canvas-bg', 1);
    this.inkCanvas = this.createLayer('ink-canvas-ink', 2);
    this.activeCanvas = this.createLayer('ink-canvas-active', 3);

    const bgContext = this.bgCanvas.getContext('2d');
    const inkContext = this.inkCanvas.getContext('2d');
    const activeContext = this.activeCanvas.getContext('2d', { desynchronized: true });

    if (!bgContext || !inkContext || !activeContext) {
      throw new Error('No se pudo inicializar el contexto Canvas 2D');
    }

    this.bgCtx = bgContext;
    this.inkCtx = inkContext;
    this.activeCtx = activeContext;

    // Instrumentación HUD de rendimiento (Fase 0)
    this.perfOverlay = new PerformanceOverlay(this.container);

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

  private createLayer(className: string, zIndex: number): HTMLCanvasElement {
    const canvas = document.createElement('canvas');
    canvas.className = `ink-canvas ${className}`;
    canvas.style.position = 'absolute';
    canvas.style.top = '0';
    canvas.style.left = '0';
    canvas.style.width = '100%';
    canvas.style.height = '100%';
    canvas.style.zIndex = `${zIndex}`;
    canvas.style.touchAction = 'none';
    this.container.appendChild(canvas);
    return canvas;
  }

  private onSurfaceChange(): void {
    const rect = this.container.getBoundingClientRect();
    const sizeChanged =
      Math.abs(rect.width - this.cssWidth) >= 0.5 ||
      Math.abs(rect.height - this.cssHeight) >= 0.5;
    if (sizeChanged) {
      this.resizeCanvas();
      return;
    }
    if (this.measureChrome()) {
      this.redrawBg();
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
      Math.abs(rect.width - this.cssWidth) < 0.5 &&
      Math.abs(rect.height - this.cssHeight) < 0.5
    ) {
      if (this.measureChrome()) {
        this.redrawBg();
        this.onResize?.();
      }
      return;
    }

    this.measureChrome();
    this.stopGuideAnimation(false);
    const dpr = window.devicePixelRatio || 1;
    this.cssWidth = rect.width;
    this.cssHeight = rect.height;

    const w = Math.max(1, Math.floor(rect.width * dpr));
    const h = Math.max(1, Math.floor(rect.height * dpr));

    const layers = [
      { c: this.bgCanvas, ctx: this.bgCtx },
      { c: this.inkCanvas, ctx: this.inkCtx },
      { c: this.activeCanvas, ctx: this.activeCtx }
    ];

    for (const { c, ctx } of layers) {
      c.width = w;
      c.height = h;
      c.style.width = `${rect.width}px`;
      c.style.height = `${rect.height}px`;
      ctx.setTransform(dpr, 0, 0, dpr, 0, 0);
    }

    this.redrawBg();
    this.redrawInk();
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
    this.redrawBg();
  }

  public setPalmerGuide(steps: Point2[][][], active: number): void {
    this.stopGuideAnimation(false);
    this.ghost = [];
    this.palmerSteps = steps;
    this.palmerActive = active;
    this.sheetText = null;
    this.redrawBg();
  }

  public setSheet(text: string | null): void {
    this.stopGuideAnimation(false);
    this.sheetText = text;
    this.ghost = [];
    this.palmerSteps = null;
    this.redrawBg();
    if (!text || !document.fonts?.load) return;
    void document.fonts.load('600 64px Caveat').then(() => {
      if (this.sheetText === text) this.redrawBg();
    });
  }

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
    if (redraw && had) {
      this.clearActiveLayer();
      this.redrawBg();
    }
  }

  public clear(notify = true): void {
    this.strokes = [];
    this.currentStroke = null;
    this.rawPointQueue = [];
    this.clearActiveLayer();
    this.redrawInk();
    if (notify) this.onStrokeComplete?.(this.strokes);
  }

  public undo(): void {
    if (this.strokes.length === 0) return;
    this.strokes.pop();
    this.clearActiveLayer();
    this.redrawInk();
    this.onStrokeComplete?.(this.strokes);
  }

  public setGrid(mode: GridMode): void {
    this.gridMode = mode;
    this.redrawBg();
  }

  public getStrokes(): Stroke[] {
    return this.strokes;
  }

  public modelStrokeWidth(): number | null {
    if (this.sheetText && this.gridMode === 'palmer') {
      return Math.max(8, sentenceRowGeometry(0, this.cssHeight).xHeight * PALMER_PEN_RATIO);
    }
    return this.currentGuideLayout()?.width ?? null;
  }

  public guideStroke(stepIndex: number): { points: Point2[]; width: number } | null {
    if (this.gridMode !== 'palmer' || !this.palmerSteps?.length) return null;
    const layout = this.gridRenderer.layoutPalmerLesson(this.cssWidth, this.cssHeight, this.palmerSteps, stepIndex);
    const points = layout?.strokes[layout.arrowIndex];
    if (!layout || !points || points.length < 2) return null;
    return { points, width: layout.width };
  }

  public redrawAll(): void {
    this.redrawBg();
    this.redrawInk();
  }

  private redrawBg(): void {
    const dpr = window.devicePixelRatio || 1;
    this.bgCtx.setTransform(1, 0, 0, 1, 0, 0);
    this.bgCtx.clearRect(0, 0, this.bgCanvas.width, this.bgCanvas.height);
    this.bgCtx.setTransform(dpr, 0, 0, dpr, 0, 0);

    if (this.gridMode === 'palmer' && this.sheetText) {
      this.gridRenderer.drawSentenceSheet(this.bgCtx, this.cssWidth, this.cssHeight, this.sheetText);
    } else {
      this.gridRenderer.drawGrid(this.bgCtx, this.cssWidth, this.cssHeight, this.gridMode);
    }

    if (this.gridMode === 'palmer' && this.palmerSteps?.length) {
      this.gridRenderer.drawPalmerLesson(
        this.bgCtx,
        this.cssWidth,
        this.cssHeight,
        this.palmerSteps,
        this.palmerActive
      );
    } else {
      this.gridRenderer.drawGhost(this.bgCtx, this.cssWidth, this.cssHeight, this.gridMode, this.ghost);
    }
  }

  private redrawInk(): void {
    const dpr = window.devicePixelRatio || 1;
    this.inkCtx.setTransform(1, 0, 0, 1, 0, 0);
    this.inkCtx.clearRect(0, 0, this.inkCanvas.width, this.inkCanvas.height);
    this.inkCtx.setTransform(dpr, 0, 0, dpr, 0, 0);
    this.inkRenderer.renderStrokes(this.inkCtx, this.strokes);
  }

  private clearActiveLayer(): void {
    const dpr = window.devicePixelRatio || 1;
    this.activeCtx.setTransform(1, 0, 0, 1, 0, 0);
    this.activeCtx.clearRect(0, 0, this.activeCanvas.width, this.activeCanvas.height);
    this.activeCtx.setTransform(dpr, 0, 0, dpr, 0, 0);
  }

  private setupPointerListeners(): void {
    this.activeCanvas.addEventListener('pointerdown', (e) => this.handlePointerDown(e));
    this.activeCanvas.addEventListener('pointermove', (e) => this.handlePointerMove(e));
    this.activeCanvas.addEventListener('pointerup', (e) => this.handlePointerUp(e));
    this.activeCanvas.addEventListener('pointercancel', (e) => this.handlePointerUp(e));
    this.activeCanvas.addEventListener('contextmenu', (e) => e.preventDefault());
  }

  private getPointFromEvent(event: PointerEvent): StrokePoint {
    const rect = this.activeCanvas.getBoundingClientRect();
    const time = event.timeStamp && event.timeStamp > 0 ? event.timeStamp : performance.now();
    return {
      x: event.clientX - rect.left,
      y: event.clientY - rect.top,
      pressure: event.pressure,
      tiltX: event.tiltX || 0,
      tiltY: event.tiltY || 0,
      time
    };
  }

  private handlePointerDown(event: PointerEvent): void {
    if (!this.palmRejection.acceptDown(event)) return;
    this.stopGuideAnimation(false);
    this.onStrokeStart?.();
    this.activePointerId = event.pointerId;

    try {
      this.activeCanvas.setPointerCapture(event.pointerId);
    } catch {
      // Captura no disponible
    }

    this.filter.reset();
    this.rawPointQueue = [];
    this.predictedPoints = [];

    const raw = this.getPointFromEvent(event);
    const filtered = this.filter.filter(raw);

    this.currentStroke = {
      points: [filtered],
      color: this.currentColor,
      baseWidth: this.currentBaseWidth,
      tool: this.currentTool
    };

    this.lastRenderedPoint = filtered;
    this.lastRenderedWidth = this.brushRenderer.widthAt(filtered, this.currentTool, this.currentBaseWidth);

    // Dibujar punto inicial
    this.brushRenderer.drawSegment(
      this.activeCtx,
      filtered,
      filtered,
      this.lastRenderedWidth,
      this.lastRenderedWidth,
      this.currentColor
    );

    this.latestPressure = filtered.pressure;
    this.scheduleFrame();
  }

  private handlePointerMove(event: PointerEvent): void {
    if (!this.currentStroke || event.pointerId !== this.activePointerId) {
      if (event.pointerType === 'pen') this.onPressureUpdate?.(0);
      return;
    }
    if (!this.palmRejection.owns(event)) return;

    // Extraer eventos coalescidos
    const coalesced = typeof event.getCoalescedEvents === 'function' ? event.getCoalescedEvents() : [];
    const samples = coalesced.length > 0 ? coalesced : [event];

    for (const sample of samples) {
      this.rawPointQueue.push(this.getPointFromEvent(sample));
    }

    // Extraer eventos predichos (Chrome/Android S Pen)
    const predicted = typeof event.getPredictedEvents === 'function' ? event.getPredictedEvents() : [];
    if (predicted.length > 0) {
      this.predictedPoints = predicted.map((p) => this.getPointFromEvent(p));
    } else {
      this.predictedPoints = [];
    }

    this.perfOverlay.recordEvents(samples.length, predicted.length);

    if (this.rawPointQueue.length > 0) {
      this.latestPressure = this.rawPointQueue[this.rawPointQueue.length - 1].pressure;
    }

    this.scheduleFrame();
  }

  private scheduleFrame(): void {
    if (this.rAFPending) return;
    this.rAFPending = true;
    requestAnimationFrame(() => this.renderFrame());
  }

  private renderFrame(): void {
    this.rAFPending = false;
    const startRender = performance.now();

    if (!this.currentStroke) {
      this.perfOverlay.recordFrame(performance.now() - startRender, 0);
      return;
    }

    // 1. Procesar puntos encolados con One Euro Filter
    while (this.rawPointQueue.length > 0) {
      const raw = this.rawPointQueue.shift()!;
      const filtered = this.filter.filter(raw);
      this.currentStroke.points.push(filtered);

      if (this.lastRenderedPoint) {
        const nextWidth = this.brushRenderer.widthAt(filtered, this.currentStroke.tool, this.currentStroke.baseWidth);
        this.brushRenderer.drawSegment(
          this.activeCtx,
          this.lastRenderedPoint,
          filtered,
          this.lastRenderedWidth,
          nextWidth,
          this.currentStroke.color
        );
        this.lastRenderedPoint = filtered;
        this.lastRenderedWidth = nextWidth;
      } else {
        this.lastRenderedPoint = filtered;
        this.lastRenderedWidth = this.brushRenderer.widthAt(filtered, this.currentStroke.tool, this.currentStroke.baseWidth);
      }
    }

    // 2. Throttled DOM update sincronizado con frame
    this.onPressureUpdate?.(this.latestPressure);
    if (this.predictedPoints.length > 0) {
      // Los puntos predichos se descartan tras el tick
      this.predictedPoints = [];
    }

    const renderMs = performance.now() - startRender;
    this.perfOverlay.recordFrame(renderMs, this.currentStroke.points.length);
  }

  private handlePointerUp(event: PointerEvent): void {
    if (event.pointerId !== this.activePointerId) return;
    this.activePointerId = null;
    this.palmRejection.release(event);

    try {
      if (this.activeCanvas.hasPointerCapture(event.pointerId)) {
        this.activeCanvas.releasePointerCapture(event.pointerId);
      }
    } catch {
      // Captura ya liberada
    }

    // Vaciar los puntos restantes de la cola
    while (this.rawPointQueue.length > 0) {
      const raw = this.rawPointQueue.shift()!;
      const filtered = this.filter.filter(raw);
      if (this.currentStroke) {
        this.currentStroke.points.push(filtered);
      }
    }

    if (this.currentStroke && this.currentStroke.points.length > 0) {
      this.strokes.push(this.currentStroke);
      // Transferir el trazo completado al lienzo de tinta definitivo
      this.inkRenderer.drawStroke(this.inkCtx, this.currentStroke);
      this.currentStroke = null;
      this.onStrokeComplete?.(this.strokes);
    }

    this.clearActiveLayer();
    this.lastRenderedPoint = null;
    this.lastRenderedWidth = 0;
    this.onPressureUpdate?.(0);
    this.perfOverlay.resetStrokeStats();
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
      this.presentGuideAnim();
      this.animTimer = window.setTimeout(() => {
        if (token !== this.animToken) return;
        this.guideAnim = null;
        this.clearActiveLayer();
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
      this.presentGuideAnim();
      if (t < 1) this.animFrame = requestAnimationFrame(frame);
      else this.animTimer = window.setTimeout(() => this.playGuide(index + 1, token), 160);
    };
    this.animFrame = requestAnimationFrame(frame);
  }

  private presentGuideAnim(): void {
    this.clearActiveLayer();
    if (!this.guideAnim) return;
    this.gridRenderer.drawRevealedStrokes(
      this.activeCtx,
      this.guideAnim.strokes,
      this.guideAnim.width,
      this.guideReveal
    );
  }

  private polylineLength(points: Point2[]): number {
    let total = 0;
    for (let i = 1; i < points.length; i++) {
      total += Math.hypot(points[i].x - points[i - 1].x, points[i].y - points[i - 1].y);
    }
    return total;
  }
}
