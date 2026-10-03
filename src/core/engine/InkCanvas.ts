import { BrushTool, GridMode, GuideLevel, Point2, Stroke, StrokePoint } from '../../types/ink';
import { PALMER_PEN_RATIO, sentenceRowGeometry } from './gridMetrics';
import { GridRenderer } from './GridRenderer';
import { InkRenderer } from './InkRenderer';
import { PalmRejection } from './PalmRejection';
import { BrushRenderer } from './BrushRenderer';
import { OneEuroFilter } from './OneEuroFilter';
import { PerformanceOverlay } from './PerformanceOverlay';

/** Cada cosa que se puede deshacer: un trazo nuevo, un borrado con la goma o un «borrar hoja». */
type HistoryOp =
  | { kind: 'add'; stroke: Stroke }
  | { kind: 'erase'; removed: { index: number; stroke: Stroke }[] }
  | { kind: 'clear'; strokes: Stroke[] };

const GUIDE_ALPHA: Record<GuideLevel, number> = { full: 1, faint: 0.38, none: 0 };
const HIGHLIGHT_COLOR = '#E0564A';
const TAP_MS = 400;
const TAP_SLOP = 14;

export class InkCanvas {
  private container: HTMLElement;

  // Capa 1 (Fondo): Cuadrícula, modelo de lección y texto guía. Solo se repinta en resize, cambio de lección o tema.
  private bgCanvas: HTMLCanvasElement;
  private bgCtx: CanvasRenderingContext2D;

  // Capa 2 (Tinta confirmada): Trazos completados consolidados. No se recalcula al escribir trazos nuevos.
  private inkCanvas: HTMLCanvasElement;
  private inkCtx: CanvasRenderingContext2D;

  // Capa 3 (Predicción): el tramo que el navegador adelanta y el cursor de la goma. Se borra en cada frame.
  private predictCanvas: HTMLCanvasElement;
  private predictCtx: CanvasRenderingContext2D;

  // Capa 4 (Trazo activo): segmentos incrementales en vivo y animación de la guía. Recibe los punteros.
  private activeCanvas: HTMLCanvasElement;
  private activeCtx: CanvasRenderingContext2D;

  private inkRenderer = new InkRenderer();
  private brushRenderer = new BrushRenderer();
  private gridRenderer = new GridRenderer();
  private palmRejection = new PalmRejection();
  private filter = new OneEuroFilter();
  public perfOverlay: PerformanceOverlay;

  private strokes: Stroke[] = [];
  private history: HistoryOp[] = [];
  private redoStack: HistoryOp[] = [];
  private highlights = new Set<number>();
  private currentStroke: Stroke | null = null;
  private erasing = false;
  private erased: { index: number; stroke: Stroke }[] = [];
  private activePointerId: number | null = null;
  private activePointerType = '';
  private ghost: Point2[][] = [];
  private ghostGlyphs: Point2[][][] = [];
  private palmerSteps: Point2[][][] | null = null;
  private palmerActive = 0;
  private sheetText: string | null = null;
  private sheetHidden = false;
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
  private predictDirty = false;

  // Toque con dos o tres dedos (deshacer / rehacer)
  private gestureTouches = new Map<number, { x: number; y: number }>();
  private gestureStart = 0;
  private gesturePeak = 0;
  private gestureMoved = false;

  public currentTool: BrushTool = 'fountain';
  public currentColor = '#1a1a1a';
  public currentBaseWidth = 4;
  public gridMode: GridMode = 'palmer';
  public guideLevel: GuideLevel = 'full';

  /** Un trazo de tinta nuevo quedó en la hoja. */
  public onStrokeComplete?: (strokes: Stroke[]) => void;
  /** La hoja cambió por deshacer, rehacer, goma o borrar. */
  public onHistoryChange?: (strokes: Stroke[]) => void;
  public onStrokeStart?: () => void;
  public onPressureUpdate?: (pressure: number) => void;
  public onResize?: () => void;
  public onPenSeen?: () => void;
  /** Toque rápido con 2 o 3 dedos. */
  public onFingerTap?: (fingers: number) => void;

  constructor(container: HTMLElement) {
    this.container = container;

    this.bgCanvas = this.createLayer('ink-canvas-bg', 1, false);
    this.inkCanvas = this.createLayer('ink-canvas-ink', 2, false);
    this.predictCanvas = this.createLayer('ink-canvas-predict', 3, false);
    this.activeCanvas = this.createLayer('ink-canvas-active', 4, true);

    const bgContext = this.bgCanvas.getContext('2d');
    const inkContext = this.inkCanvas.getContext('2d');
    const predictContext = this.predictCanvas.getContext('2d');
    const activeContext = this.activeCanvas.getContext('2d', { desynchronized: true });

    if (!bgContext || !inkContext || !predictContext || !activeContext) {
      throw new Error('No se pudo inicializar el contexto Canvas 2D');
    }

    this.bgCtx = bgContext;
    this.inkCtx = inkContext;
    this.predictCtx = predictContext;
    this.activeCtx = activeContext;

    this.perfOverlay = new PerformanceOverlay(this.container);
    this.palmRejection.onPenSeen = () => this.onPenSeen?.();

    this.resizeCanvas();
    window.addEventListener('resize', () => this.resizeCanvas());
    if (typeof ResizeObserver !== 'undefined') {
      new ResizeObserver(() => this.resizeCanvas()).observe(this.container);
    }

    this.setupPointerListeners();
  }

  private createLayer(className: string, zIndex: number, interactive: boolean): HTMLCanvasElement {
    const canvas = document.createElement('canvas');
    canvas.className = `ink-canvas ${className}`;
    canvas.style.position = 'absolute';
    canvas.style.top = '0';
    canvas.style.left = '0';
    canvas.style.width = '100%';
    canvas.style.height = '100%';
    canvas.style.zIndex = `${zIndex}`;
    canvas.style.touchAction = 'none';
    if (interactive) {
      canvas.setAttribute('role', 'img');
      canvas.setAttribute('aria-label', 'Hoja de práctica');
    } else {
      canvas.style.pointerEvents = 'none';
      canvas.setAttribute('aria-hidden', 'true');
    }
    this.container.appendChild(canvas);
    return canvas;
  }

  public resizeCanvas(): void {
    const rect = this.container.getBoundingClientRect();
    if (rect.width < 1 || rect.height < 1) return;
    if (Math.abs(rect.width - this.cssWidth) < 0.5 && Math.abs(rect.height - this.cssHeight) < 0.5) return;

    this.stopGuideAnimation(false);
    const dpr = window.devicePixelRatio || 1;
    this.cssWidth = rect.width;
    this.cssHeight = rect.height;

    const w = Math.max(1, Math.floor(rect.width * dpr));
    const h = Math.max(1, Math.floor(rect.height * dpr));

    const layers = [
      { c: this.bgCanvas, ctx: this.bgCtx },
      { c: this.inkCanvas, ctx: this.inkCtx },
      { c: this.predictCanvas, ctx: this.predictCtx },
      { c: this.activeCanvas, ctx: this.activeCtx }
    ];

    for (const { c, ctx } of layers) {
      c.width = w;
      c.height = h;
      ctx.setTransform(dpr, 0, 0, dpr, 0, 0);
    }

    this.redrawBg();
    this.redrawInk();
    this.onResize?.();
  }

  public getSize(): { width: number; height: number } {
    return { width: this.cssWidth, height: this.cssHeight };
  }

  public setAllowTouch(allow: boolean): void {
    this.palmRejection.allowTouch = allow;
  }

  public setGhost(strokes: Point2[][]): void {
    this.stopGuideAnimation();
    this.ghost = strokes;
    this.ghostGlyphs = [];
    this.palmerSteps = null;
    this.sheetText = null;
    this.redrawBg();
  }

  /** Palabra japonesa: un fantasma por cuadro, en orden. */
  public setGhostGlyphs(glyphs: Point2[][][]): void {
    this.stopGuideAnimation();
    this.ghost = glyphs[0] ?? [];
    this.ghostGlyphs = glyphs;
    this.palmerSteps = null;
    this.sheetText = null;
    this.redrawBg();
  }

  public setPalmerGuide(steps: Point2[][][], active: number): void {
    this.stopGuideAnimation();
    this.ghost = [];
    this.ghostGlyphs = [];
    this.palmerSteps = steps;
    this.palmerActive = active;
    this.sheetText = null;
    this.redrawBg();
  }

  /** Hoja de varias líneas. Con `hidden` (dictado) el texto no se muestra en ninguna. */
  public setSheet(text: string | null, hidden = false): void {
    this.stopGuideAnimation();
    this.sheetText = text;
    this.sheetHidden = hidden;
    this.ghost = [];
    this.ghostGlyphs = [];
    this.palmerSteps = null;
    this.redrawBg();
    if (!text || !document.fonts?.load) return;
    void document.fonts.load('600 64px Caveat').then(() => {
      if (this.sheetText === text) this.redrawBg();
    });
  }

  /** El texto de la hoja ya no se oculta (al entregar un dictado). */
  public revealSheet(): void {
    if (!this.sheetHidden) return;
    this.sheetHidden = false;
    this.redrawBg();
  }

  public setGuideLevel(level: GuideLevel): void {
    this.guideLevel = level;
    this.redrawBg();
  }

  public setSlantLines(show: boolean): void {
    this.gridRenderer.showSlant = show;
    this.redrawBg();
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
    if (redraw && had) this.clearLayer(this.activeCanvas, this.activeCtx);
  }

  /** Hoja en blanco y sin historial: cambio de lección o de paso. No avisa a nadie. */
  public reset(): void {
    this.abandonStroke();
    this.strokes = [];
    this.history = [];
    this.redoStack = [];
    this.highlights.clear();
    this.redrawInk();
  }

  /** «Borrar hoja»: se puede deshacer. */
  public clearSheet(): void {
    this.abandonStroke();
    if (this.strokes.length === 0) return;
    this.history.push({ kind: 'clear', strokes: this.strokes });
    this.redoStack = [];
    this.strokes = [];
    this.afterHistoryChange();
  }

  public undo(): void {
    const op = this.history.pop();
    if (!op) return;
    if (op.kind === 'add') {
      const index = this.strokes.lastIndexOf(op.stroke);
      if (index >= 0) this.strokes.splice(index, 1);
    } else if (op.kind === 'erase') {
      for (let i = op.removed.length - 1; i >= 0; i--) {
        this.strokes.splice(Math.min(op.removed[i].index, this.strokes.length), 0, op.removed[i].stroke);
      }
    } else {
      this.strokes = op.strokes;
    }
    this.redoStack.push(op);
    this.afterHistoryChange();
  }

  public redo(): void {
    const op = this.redoStack.pop();
    if (!op) return;
    if (op.kind === 'add') this.strokes.push(op.stroke);
    else if (op.kind === 'erase') {
      for (const item of op.removed) {
        const index = this.strokes.indexOf(item.stroke);
        if (index >= 0) this.strokes.splice(index, 1);
      }
    } else {
      this.strokes = [];
    }
    this.history.push(op);
    this.afterHistoryChange();
  }

  /** Quita el último trazo sin dejar rastro: un intento fallido que no merece «rehacer». */
  public removeLastStroke(): void {
    const stroke = this.strokes.pop();
    if (!stroke) return;
    this.history = this.history.filter((op) => !(op.kind === 'add' && op.stroke === stroke));
    this.highlights.clear();
    this.redrawInk();
  }

  public canUndo(): boolean {
    return this.history.length > 0;
  }

  public setGrid(mode: GridMode): void {
    this.gridMode = mode;
    this.redrawBg();
  }

  public getStrokes(): Stroke[] {
    return this.strokes;
  }

  /** Recupera una hoja guardada. Los trazos entran como recién escritos, sin historial previo. */
  public loadStrokes(strokes: Stroke[]): void {
    this.abandonStroke();
    this.strokes = strokes;
    this.history = strokes.map((stroke) => ({ kind: 'add', stroke }));
    this.redoStack = [];
    this.highlights.clear();
    this.redrawInk();
  }

  /** Marca en rojo los trazos que la calificación señaló. Se quita al seguir escribiendo. */
  public setHighlights(indices: number[]): void {
    this.highlights = new Set(indices);
    this.redrawInk();
  }

  /** Cambia el color de los trazos ya escritos (al pasar de tema claro a oscuro). */
  public recolor(map: (color: string) => string | null): void {
    for (const stroke of this.strokes) {
      const next = map(stroke.color);
      if (next) stroke.color = next;
    }
    this.redrawInk();
  }

  /** La hoja (pauta y tinta) en una sola imagen, sobre el color del papel. */
  public snapshot(maxWidth: number): HTMLCanvasElement {
    const scale = Math.min(1, maxWidth / Math.max(1, this.cssWidth));
    const canvas = document.createElement('canvas');
    canvas.width = Math.max(1, Math.round(this.cssWidth * scale));
    canvas.height = Math.max(1, Math.round(this.cssHeight * scale));
    const ctx = canvas.getContext('2d');
    if (!ctx) return canvas;
    ctx.fillStyle = getComputedStyle(this.container).backgroundColor || '#ffffff';
    ctx.fillRect(0, 0, canvas.width, canvas.height);
    ctx.drawImage(this.bgCanvas, 0, 0, canvas.width, canvas.height);
    ctx.drawImage(this.inkCanvas, 0, 0, canvas.width, canvas.height);
    return canvas;
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

  private afterHistoryChange(): void {
    this.highlights.clear();
    this.redrawInk();
    this.onHistoryChange?.(this.strokes);
  }

  /** Suelta el trazo en curso sin guardarlo. */
  private abandonStroke(): void {
    this.currentStroke = null;
    this.erasing = false;
    this.erased = [];
    this.rawPointQueue = [];
    this.predictedPoints = [];
    this.lastRenderedPoint = null;
    this.clearLayer(this.activeCanvas, this.activeCtx);
    this.clearPrediction();
  }

  private redrawBg(): void {
    this.clearLayer(this.bgCanvas, this.bgCtx);
    const alpha = GUIDE_ALPHA[this.guideLevel];

    if (this.gridMode === 'palmer' && this.sheetText) {
      this.gridRenderer.drawSentenceSheet(
        this.bgCtx,
        this.cssWidth,
        this.cssHeight,
        this.sheetText,
        this.sheetHidden ? 0 : alpha
      );
      return;
    }
    this.gridRenderer.drawGrid(this.bgCtx, this.cssWidth, this.cssHeight, this.gridMode);
    if (alpha <= 0) return;

    this.bgCtx.save();
    this.bgCtx.globalAlpha = alpha;
    if (this.gridMode === 'palmer' && this.palmerSteps?.length) {
      this.gridRenderer.drawPalmerLesson(
        this.bgCtx,
        this.cssWidth,
        this.cssHeight,
        this.palmerSteps,
        this.palmerActive
      );
    } else if (this.gridMode === 'genkouyoushi' && this.ghostGlyphs.length > 0) {
      this.gridRenderer.drawGhostGlyphs(this.bgCtx, this.cssWidth, this.cssHeight, this.ghostGlyphs);
    } else {
      this.gridRenderer.drawGhost(this.bgCtx, this.cssWidth, this.cssHeight, this.gridMode, this.ghost);
    }
    this.bgCtx.restore();
  }

  private redrawInk(): void {
    this.clearLayer(this.inkCanvas, this.inkCtx);
    this.strokes.forEach((stroke, index) => {
      this.brushRenderer.drawStroke(this.inkCtx, stroke, this.highlights.has(index) ? HIGHLIGHT_COLOR : undefined);
    });
  }

  private clearLayer(canvas: HTMLCanvasElement, ctx: CanvasRenderingContext2D): void {
    const dpr = window.devicePixelRatio || 1;
    ctx.setTransform(1, 0, 0, 1, 0, 0);
    ctx.clearRect(0, 0, canvas.width, canvas.height);
    ctx.setTransform(dpr, 0, 0, dpr, 0, 0);
  }

  private clearPrediction(): void {
    if (!this.predictDirty) return;
    this.clearLayer(this.predictCanvas, this.predictCtx);
    this.predictDirty = false;
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

  /** El extremo de goma del lápiz o su botón lateral borran sin cambiar de herramienta. */
  private penAsksEraser(event: PointerEvent): boolean {
    if (event.pointerType !== 'pen') return false;
    return event.button === 5 || (event.buttons & 32) !== 0 || event.button === 2 || (event.buttons & 2) !== 0;
  }

  private handlePointerDown(event: PointerEvent): void {
    if (this.activePointerId !== null) {
      const penTakesOver = event.pointerType === 'pen' && this.activePointerType !== 'pen';
      const secondFinger = event.pointerType === 'touch' && this.activePointerType === 'touch';
      if (secondFinger && this.strokeIsTap()) {
        // El primer dedo no estaba escribiendo: era el inicio de un toque con dos dedos.
        this.releaseCapture(this.activePointerId);
        const first = this.currentStroke?.points[0];
        const rect = this.activeCanvas.getBoundingClientRect();
        this.gestureTouches.set(this.activePointerId, {
          x: first ? first.x + rect.left : event.clientX,
          y: first ? first.y + rect.top : event.clientY
        });
        this.gestureStart = first?.time ?? event.timeStamp;
        this.gesturePeak = 1;
        this.gestureMoved = false;
        this.activePointerId = null;
        this.abandonStroke();
        this.trackGestureTouch(event);
        return;
      }
      if (!penTakesOver) return;
      this.releaseCapture(this.activePointerId);
      this.activePointerId = null;
      this.abandonStroke();
    }

    if (event.pointerType === 'touch' && this.gestureTouches.size > 0) {
      this.trackGestureTouch(event);
      return;
    }
    if (!this.palmRejection.acceptDown(event)) {
      if (event.pointerType === 'touch') this.trackGestureTouch(event);
      return;
    }

    this.stopGuideAnimation();
    if (this.highlights.size > 0) {
      this.highlights.clear();
      this.redrawInk();
    }
    this.onStrokeStart?.();
    this.activePointerId = event.pointerId;
    this.activePointerType = event.pointerType;

    try {
      this.activeCanvas.setPointerCapture(event.pointerId);
    } catch {
      // Captura no disponible
    }

    this.filter.reset();
    this.rawPointQueue = [];
    this.predictedPoints = [];
    this.erasing = this.currentTool === 'eraser' || this.penAsksEraser(event);
    this.erased = [];

    const raw = this.getPointFromEvent(event);
    const filtered = this.filter.filter(raw);

    this.currentStroke = {
      points: [filtered],
      color: this.currentColor,
      baseWidth: this.currentBaseWidth,
      tool: this.erasing ? 'eraser' : this.currentTool
    };

    this.lastRenderedPoint = filtered;
    this.lastRenderedWidth = this.brushRenderer.widthAt(filtered, this.currentStroke.tool, this.currentBaseWidth);

    if (this.erasing) {
      this.eraseAlong(filtered, filtered);
    } else {
      this.brushRenderer.drawSegment(
        this.activeCtx,
        filtered,
        filtered,
        this.lastRenderedWidth,
        this.lastRenderedWidth,
        this.currentColor
      );
    }

    this.latestPressure = filtered.pressure;
    this.scheduleFrame();
  }

  private handlePointerMove(event: PointerEvent): void {
    const touch = this.gestureTouches.get(event.pointerId);
    if (touch) {
      if (Math.hypot(event.clientX - touch.x, event.clientY - touch.y) > TAP_SLOP) this.gestureMoved = true;
      return;
    }
    if (!this.currentStroke || event.pointerId !== this.activePointerId) {
      if (event.pointerType === 'pen') this.onPressureUpdate?.(0);
      return;
    }
    if (!this.palmRejection.owns(event)) return;

    const coalesced = typeof event.getCoalescedEvents === 'function' ? event.getCoalescedEvents() : [];
    const samples = coalesced.length > 0 ? coalesced : [event];
    for (const sample of samples) this.rawPointQueue.push(this.getPointFromEvent(sample));

    // Eventos predichos (Chrome/Android S Pen): adelantan el trazo unos milisegundos.
    const predicted = typeof event.getPredictedEvents === 'function' ? event.getPredictedEvents() : [];
    this.predictedPoints = predicted.map((p) => this.getPointFromEvent(p));

    this.perfOverlay.recordEvents(samples.length, predicted.length);
    this.latestPressure = this.rawPointQueue[this.rawPointQueue.length - 1].pressure;
    this.scheduleFrame();
  }

  private scheduleFrame(): void {
    if (this.rAFPending) return;
    this.rAFPending = true;
    requestAnimationFrame(() => this.renderFrame());
  }

  /** Pasa la cola por el filtro One Euro y la pinta (o borra) segmento a segmento. */
  private drainQueue(): void {
    const stroke = this.currentStroke;
    if (!stroke) {
      this.rawPointQueue = [];
      return;
    }
    for (const raw of this.rawPointQueue) {
      const filtered = this.filter.filter(raw);
      stroke.points.push(filtered);
      const previous = this.lastRenderedPoint;
      if (!previous) {
        this.lastRenderedPoint = filtered;
        this.lastRenderedWidth = this.brushRenderer.widthAt(filtered, stroke.tool, stroke.baseWidth);
        continue;
      }
      if (this.erasing) {
        this.eraseAlong(previous, filtered);
      } else {
        // El grosor no salta entre muestras: mismo límite que usa el trazo ya asentado.
        const target = this.brushRenderer.widthAt(filtered, stroke.tool, stroke.baseWidth);
        const maxDelta = Math.max(0.4, Math.hypot(filtered.x - previous.x, filtered.y - previous.y) * 0.35);
        const width = Math.max(this.lastRenderedWidth - maxDelta, Math.min(this.lastRenderedWidth + maxDelta, target));
        this.brushRenderer.drawSegment(this.activeCtx, previous, filtered, this.lastRenderedWidth, width, stroke.color);
        this.lastRenderedWidth = width;
      }
      this.lastRenderedPoint = filtered;
    }
    this.rawPointQueue = [];
  }

  private renderFrame(): void {
    this.rAFPending = false;
    const startRender = performance.now();

    if (!this.currentStroke) {
      this.perfOverlay.recordFrame(performance.now() - startRender, 0);
      return;
    }

    this.drainQueue();
    this.drawPrediction();
    this.onPressureUpdate?.(this.latestPressure);

    this.perfOverlay.recordFrame(performance.now() - startRender, this.currentStroke.points.length);
  }

  private drawPrediction(): void {
    this.clearPrediction();
    const from = this.lastRenderedPoint;
    if (!from || !this.currentStroke) return;
    if (this.erasing) {
      const radius = this.eraserRadius();
      this.predictCtx.save();
      this.predictCtx.strokeStyle = 'rgba(128, 128, 128, 0.9)';
      this.predictCtx.lineWidth = 1.5;
      this.predictCtx.beginPath();
      this.predictCtx.arc(from.x, from.y, radius, 0, Math.PI * 2);
      this.predictCtx.stroke();
      this.predictCtx.restore();
      this.predictDirty = true;
      return;
    }
    let previous = from;
    for (const point of this.predictedPoints) {
      this.brushRenderer.drawSegment(
        this.predictCtx,
        previous,
        point,
        this.lastRenderedWidth,
        this.lastRenderedWidth,
        this.currentStroke.color
      );
      previous = point;
      this.predictDirty = true;
    }
    this.predictedPoints = [];
  }

  private eraserRadius(): number {
    return Math.max(10, this.currentBaseWidth * 1.25);
  }

  /** Goma por trazo: quita entero cualquier trazo que toque el recorrido. */
  private eraseAlong(from: Point2, to: Point2): void {
    const radius = this.eraserRadius();
    const dx = to.x - from.x;
    const dy = to.y - from.y;
    const span = dx * dx + dy * dy;
    let removedAny = false;
    for (let i = this.strokes.length - 1; i >= 0; i--) {
      const stroke = this.strokes[i];
      const reach = radius + stroke.baseWidth / 2;
      const hit = stroke.points.some((point) => {
        const t = span === 0 ? 0 : Math.max(0, Math.min(1, ((point.x - from.x) * dx + (point.y - from.y) * dy) / span));
        return Math.hypot(point.x - (from.x + dx * t), point.y - (from.y + dy * t)) <= reach;
      });
      if (!hit) continue;
      this.strokes.splice(i, 1);
      this.erased.push({ index: i, stroke });
      removedAny = true;
    }
    if (removedAny) this.redrawInk();
  }

  private handlePointerUp(event: PointerEvent): void {
    if (this.gestureTouches.has(event.pointerId)) {
      this.gestureTouches.delete(event.pointerId);
      if (this.gestureTouches.size === 0) this.finishGesture(event);
      return;
    }
    if (event.pointerId !== this.activePointerId) return;
    this.activePointerId = null;
    this.palmRejection.release(event);
    this.releaseCapture(event.pointerId);

    this.drainQueue();
    const stroke = this.currentStroke;
    this.currentStroke = null;
    this.clearLayer(this.activeCanvas, this.activeCtx);
    this.clearPrediction();
    this.lastRenderedPoint = null;
    this.lastRenderedWidth = 0;
    this.onPressureUpdate?.(0);
    this.perfOverlay.resetStrokeStats();

    if (this.erasing) {
      this.erasing = false;
      if (this.erased.length > 0) {
        this.history.push({ kind: 'erase', removed: this.erased });
        this.redoStack = [];
        this.erased = [];
        this.afterHistoryChange();
      }
      return;
    }
    if (!stroke || stroke.points.length === 0) return;
    this.strokes.push(stroke);
    this.history.push({ kind: 'add', stroke });
    this.redoStack = [];
    this.inkRenderer.drawStroke(this.inkCtx, stroke);
    this.onStrokeComplete?.(this.strokes);
  }

  private releaseCapture(pointerId: number): void {
    try {
      if (this.activeCanvas.hasPointerCapture(pointerId)) this.activeCanvas.releasePointerCapture(pointerId);
    } catch {
      // Captura ya liberada
    }
  }

  /** El trazo en curso es tan corto y reciente que aún puede ser un toque. */
  private strokeIsTap(): boolean {
    const points = this.currentStroke?.points ?? [];
    if (points.length === 0) return true;
    const first = points[0];
    const last = points[points.length - 1];
    return last.time - first.time < TAP_MS && Math.hypot(last.x - first.x, last.y - first.y) < TAP_SLOP;
  }

  private trackGestureTouch(event: PointerEvent): void {
    if (this.gestureTouches.size === 0 && this.gesturePeak === 0) {
      this.gestureStart = event.timeStamp;
      this.gestureMoved = false;
    }
    this.gestureTouches.set(event.pointerId, { x: event.clientX, y: event.clientY });
    this.gesturePeak = Math.max(this.gesturePeak, this.gestureTouches.size);
  }

  private finishGesture(event: PointerEvent): void {
    const fingers = this.gesturePeak;
    const quick = event.timeStamp - this.gestureStart < TAP_MS;
    this.gesturePeak = 0;
    if (fingers >= 2 && quick && !this.gestureMoved && event.type !== 'pointercancel') this.onFingerTap?.(fingers);
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
        this.clearLayer(this.activeCanvas, this.activeCtx);
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
    this.clearLayer(this.activeCanvas, this.activeCtx);
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
