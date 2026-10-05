import HanziWriter from 'hanzi-writer';
import { DictationService, suggestedSeconds } from '../core/audio/DictationService';
import { Metronome } from '../core/audio/Metronome';
import { loadCharRecord } from '../core/evaluation/CharDataLoader';
import { guideDirection, strokeCoversGuide } from '../core/evaluation/geometry';
import { lastBox, lastStrokeIsIncomplete } from '../core/evaluation/KanjiOrderValidator';
import { ScoringEngine } from '../core/evaluation/ScoringEngine';
import { SlantAnalyzer } from '../core/evaluation/SlantAnalyzer';
import { StrokeEvaluator } from '../core/evaluation/StrokeEvaluator';
import { baseWidthMatching } from '../core/engine/BrushRenderer';
import { InkCanvas } from '../core/engine/InkCanvas';
import { CURSIVE_SLANT_DEG, scriptSlant, setScriptSlant } from '../core/engine/gridMetrics';
import { ScriptStyle, scriptSlantFor, setSheetScript } from '../core/engine/scriptFonts';
import { Settings } from '../core/settings/SettingsStore';
import { SheetStore } from '../core/storage/SheetStore';
import { BrushTool, CharGeometry, EvaluationResult, GridMode, GuideLevel, Lesson, Stroke, glyphsOf, isSingleGlyph } from '../types/ink';
import { DictationOverlay } from '../ui/components/DictationOverlay';
import { PalmerStrokePreview } from '../ui/components/PalmerStrokePreview';
import { Toolbar } from '../ui/components/Toolbar';

/** Tiempo máximo entre dos trazos que todavía cuenta como práctica. */
const IDLE_GAP_MS = 5000;
const DOCK_WIDTHS = [2, 3, 4, 6, 8, 12];

export interface StudioElements {
  wrapper: HTMLElement;
  paper: HTMLElement;
  pressureIndicator: HTMLElement;
  pressureText: HTMLElement;
  glyphMark: HTMLElement;
  subLabel: HTMLElement;
  guideChar: HTMLElement;
  animatorBox: HTMLElement;
  markBox: HTMLElement;
  animateButton: HTMLButtonElement;
  liveTip: HTMLElement;
  liveFeedback: HTMLElement;
  tipToggle: HTMLButtonElement;
  tipClose: HTMLButtonElement;
  steps: HTMLElement;
  evaluateButton: HTMLButtonElement;
  dictationButton: HTMLButtonElement;
  metronomeButton: HTMLButtonElement;
  widthButton: HTMLButtonElement;
  widthLabel: HTMLElement;
  widthPreview: HTMLElement;
  colorPreview: HTMLElement;
  colorInput: HTMLInputElement;
  dock: HTMLElement;
  toolbar: Toolbar;
  dictation: DictationOverlay;
}

export interface CompletionInfo {
  lesson: Lesson;
  elapsedMs: number;
  averagePressure: number | null;
}

/**
 * La hoja de práctica: abre una lección, sigue los pasos, califica y avisa de lo que pasó.
 * No sabe nada de pantallas ni de almacenamiento de progreso: eso lo decide quien la usa.
 */
export class Studio {
  public readonly ink: InkCanvas;

  public onScored?: (lesson: Lesson, result: EvaluationResult, snapshot: HTMLCanvasElement) => void;
  public onStepsCompleted?: (info: CompletionInfo) => void;
  public onStepProgress?: (lesson: Lesson, done: number, total: number) => void;
  public onPracticed?: (lesson: Lesson) => void;
  public onActivity?: (lesson: Lesson, ms: number, strokes: number) => void;
  public onPenSeen?: () => void;

  private lesson: Lesson | null = null;
  private settings: Settings;
  private glyphs: Array<CharGeometry | null> = [];
  private kanjiWriter: HanziWriter | null = null;
  private palmerPreview: PalmerStrokePreview;
  private metronome = new Metronome();
  private dictationService: DictationService;
  private token = 0;
  private stepIndex = 0;
  private penMatchesModel = true;
  private retryOnNextStroke = false;
  private stepAdvanced = false;
  private celebrated = false;
  private dictating = false;
  private startedAt = performance.now();
  private pressureSum = 0;
  private pressureCount = 0;
  private strokeStart = 0;
  private lastStrokeEnd = 0;
  private dockWidthIndex = 2;
  private draftTimer = 0;

  constructor(private el: StudioElements, settings: Settings, private sheets: SheetStore, dictationService: DictationService) {
    this.settings = settings;
    this.dictationService = dictationService;
    this.ink = new InkCanvas(el.paper);
    this.palmerPreview = new PalmerStrokePreview(el.animatorBox);
    this.wireCanvas();
    this.wireToolbar();
    this.wireButtons();
  }

  public current(): Lesson | null {
    return this.lesson;
  }

  /** Ajustes nuevos: pluma, pauta, guía, dedo, HUD y dock se aplican al momento. */
  public applySettings(settings: Settings): void {
    const previous = this.settings;
    this.settings = settings;
    this.ink.setSlantLines(settings.slantLines);
    this.ink.setGuideLevel(this.resolveGuide());
    this.ink.perfOverlay.setVisible(settings.perfHud);
    this.ink.setAllowTouch(settings.touchInput === 'on' || (settings.touchInput === 'auto' && !settings.penSeen));
    this.el.wrapper.dataset.dock = settings.dockSide;
    if (this.lesson && (previous.tool !== settings.tool || previous.grid !== settings.grid)) this.applyTool(this.lesson);
    if (previous.sheetScript !== settings.sheetScript || previous.scripts.join() !== settings.scripts.join()) this.applySheetScript();
    if (this.metronome.running && previous.metronomeBpm !== settings.metronomeBpm) this.metronome.start(settings.metronomeBpm);
  }

  public setInkColor(color: string): void {
    this.ink.currentColor = color;
    this.el.toolbar.setColor(color);
    this.el.colorPreview.style.background = color;
  }

  public resize(): void {
    requestAnimationFrame(() => this.ink.resizeCanvas());
  }

  /** Sale de la hoja: guarda el borrador y para lo que esté sonando. */
  public leave(): void {
    this.flushDraft();
    this.metronome.stop();
    this.el.metronomeButton.classList.remove('on');
    this.el.metronomeButton.setAttribute('aria-pressed', 'false');
    if (this.el.dictation.isOpen()) this.el.dictation.dismiss();
    this.dictating = false;
    this.el.toolbar.exitZen();
  }

  /** Se eligió otra letra para las hojas de texto (desde la hoja o desde Ajustes). */
  public onScriptChange?: (style: ScriptStyle) => void;
  private scriptSwitch: HTMLElement | null = null;

  /** Cambia la letra de la hoja abierta sin borrar lo escrito. */
  private applySheetScript(): void {
    const lesson = this.lesson;
    this.renderScriptSwitch();
    if (!lesson || !isTextSheet(lesson)) return;
    setSheetScript(this.settings.sheetScript);
    setScriptSlant(scriptSlantFor(this.settings.sheetScript));
    this.ink.redrawAll();
    this.ink.setSheet(lesson.characterOrWord, this.dictating || !!lesson.dictation);
  }

  /** Selector de letra en la barra de la hoja: solo si se practican varios estilos. */
  private renderScriptSwitch(): void {
    if (!this.scriptSwitch) {
      const anchor = document.getElementById('stroke-steps');
      if (!anchor) return;
      this.scriptSwitch = document.createElement('div');
      this.scriptSwitch.className = 'chips-row practice-chips script-switch';
      this.scriptSwitch.setAttribute('role', 'group');
      this.scriptSwitch.setAttribute('aria-label', 'Letra de la hoja');
      anchor.after(this.scriptSwitch);
    }
    const lesson = this.lesson;
    const styles = this.settings.scripts;
    const show = !!lesson && isTextSheet(lesson) && styles.length > 1;
    this.scriptSwitch.hidden = !show;
    if (!show) return;
    this.scriptSwitch.replaceChildren(...styles.map((style) => {
      const button = document.createElement('button');
      button.type = 'button';
      const on = style === this.settings.sheetScript;
      button.className = `chip${on ? ' on' : ''}`;
      button.setAttribute('aria-pressed', String(on));
      button.textContent = style;
      button.addEventListener('click', () => { if (!on) this.onScriptChange?.(style); });
      return button;
    }));
  }

  /** Nivel de maestría de una lección (0 sin empezar … 4 dominada). Lo da main. */
  public masteryOf?: (lesson: Lesson) => number;

  /**
   * Guía de la hoja. En automático se apaga sola, como en un cuaderno: con guía completa
   * mientras se aprende, tenue cuando la lección está «Asentada» y sin guía al dominarla.
   */
  private resolveGuide(): GuideLevel {
    const setting = this.settings.guideLevel;
    if (setting !== 'auto') return setting;
    const level = this.lesson ? this.masteryOf?.(this.lesson) ?? 0 : 0;
    return level >= 4 ? 'none' : level >= 3 ? 'faint' : 'full';
  }

  public async open(lesson: Lesson): Promise<void> {
    this.flushDraft();
    const token = ++this.token;
    this.lesson = lesson;
    this.ink.setGuideLevel(this.resolveGuide());
    this.stepIndex = 0;
    this.penMatchesModel = true;
    this.retryOnNextStroke = false;
    this.celebrated = false;
    this.dictating = false;
    this.startedAt = performance.now();
    this.pressureSum = 0;
    this.pressureCount = 0;
    this.lastStrokeEnd = 0;
    this.glyphs = [];
    this.kanjiWriter = null;
    this.palmerPreview.stop();
    // Cada estilo tiene su inclinación (imprenta vertical, copperplate 55°…). Va antes de dibujar la pauta y el modelo.
    if (isTextSheet(lesson)) {
      // Planas, palabras, oraciones y dictado: con la letra elegida en Ajustes.
      setSheetScript(this.settings.sheetScript);
      setScriptSlant(scriptSlantFor(this.settings.sheetScript));
    } else {
      setScriptSlant(lesson.slant ?? (lesson.upright ? 90 : CURSIVE_SLANT_DEG));
    }
    this.renderScriptSwitch();
    this.ink.redrawAll();
    if (this.el.dictation.isOpen()) this.el.dictation.dismiss();
    this.showGuide(lesson);
    this.applyTool(lesson);
    this.ink.reset();
    this.ink.setGhost([]);

    if (lesson.category === 'japanese') {
      await this.openJapanese(lesson, token);
    } else if (lesson.steps?.length) {
      this.applyPalmerStep(lesson);
    } else if (lesson.sheet) {
      this.ink.setSheet(lesson.characterOrWord, !!lesson.dictation, lesson.pattern ?? null);
      if (this.penMatchesModel) this.applyModelPen();
      if (lesson.dictation) this.say('Pulsa «Dictado» para escuchar la frase. El texto aparece al entregar.');
    } else if (lesson.idealStrokes?.length) {
      this.ink.setGhost(lesson.idealStrokes.map((stroke) => stroke.points));
      if (this.penMatchesModel) this.applyModelPen();
    }
    if (token !== this.token) return;
    await this.restoreDraft(lesson, token);
  }

  public evaluate(): void {
    const lesson = this.lesson;
    if (!lesson) return;
    const size = this.ink.getSize();
    const result = StrokeEvaluator.evaluateSession({
      strokes: this.ink.getStrokes(),
      lesson: this.lessonForScore(lesson),
      width: size.width,
      height: size.height,
      glyphs: this.glyphs
    });
    this.finishScoring(lesson, result);
  }

  /** Lo que se tarda en promedio y la presión, para el cierre de una lección por pasos. */
  private completion(lesson: Lesson): CompletionInfo {
    return {
      lesson,
      elapsedMs: performance.now() - this.startedAt,
      averagePressure: this.pressureCount > 0 ? this.pressureSum / this.pressureCount : null
    };
  }

  private finishScoring(lesson: Lesson, result: EvaluationResult): void {
    // La miniatura se toma antes de marcar en rojo los trazos que fallaron.
    const snapshot = this.ink.snapshot(360);
    if (this.ink.getStrokes().length > 0) this.ink.setHighlights(result.badStrokes ?? []);
    this.onScored?.(lesson, result, snapshot);
    if (this.ink.getStrokes().length > 0) void this.sheets.deleteDraft(lesson.id);
  }

  private say(text: string): void {
    this.el.liveFeedback.textContent = text;
    this.el.liveTip.hidden = false;
    this.el.tipToggle.setAttribute('aria-expanded', 'true');
  }

  private wireCanvas(): void {
    const ink = this.ink;
    ink.onPressureUpdate = (pressure) => {
      const pct = Math.round(pressure * 100);
      this.el.pressureIndicator.style.height = `${pct}%`;
      this.el.pressureText.textContent = `${pct}%`;
      if (pressure > 0.02) {
        this.pressureSum += pressure;
        this.pressureCount += 1;
      }
    };
    ink.onPenSeen = () => this.onPenSeen?.();
    ink.onFingerTap = (fingers) => {
      if (fingers === 2) this.undo();
      else if (fingers >= 3) this.redo();
    };
    ink.onStrokeStart = () => {
      this.strokeStart = performance.now();
      if (!this.retryOnNextStroke) return;
      // Solo se quita el trazo que no siguió la guía; lo bien hecho se queda en la hoja.
      this.retryOnNextStroke = false;
      ink.removeLastStroke();
    };
    ink.onHistoryChange = () => {
      this.el.toolbar.setHistory(ink.canUndo());
      this.scheduleDraft();
    };
    ink.onResize = () => {
      if (this.penMatchesModel) this.applyModelPen();
    };
    ink.onStrokeComplete = (strokes) => this.afterStroke(strokes);
  }

  private afterStroke(strokes: Stroke[]): void {
    const lesson = this.lesson;
    if (!lesson) return;
    const now = performance.now();
    const gap = this.lastStrokeEnd > 0 ? Math.min(IDLE_GAP_MS, Math.max(0, this.strokeStart - this.lastStrokeEnd)) : 0;
    this.onActivity?.(lesson, now - this.strokeStart + gap, 1);
    this.lastStrokeEnd = now;
    this.el.toolbar.setHistory(this.ink.canUndo());
    this.scheduleDraft();

    if (strokes.length === 0) {
      this.retryOnNextStroke = false;
      return;
    }
    if (lesson.category === 'japanese') {
      const size = this.ink.getSize();
      if (this.settings.strictStrokes && !this.dictating) {
        const current = lastBox(strokes, size.width, size.height);
        const geometry = current ? this.glyphs[current.box % Math.max(1, this.glyphs.length)] ?? null : null;
        if (current && lastStrokeIsIncomplete(current.strokes, geometry, size.width, size.height)) {
          this.ink.removeLastStroke();
          this.say('Ese trazo quedó a medias. Se borró: hazlo de principio a fin.');
          return;
        }
      }
      if (!this.dictating) this.say(StrokeEvaluator.liveKanjiMessage(strokes, this.glyphs, size.width, size.height));
      this.onPracticed?.(lesson);
      return;
    }
    this.onPracticed?.(lesson);
    const progress = this.syncPalmerProgress();
    if (progress) {
      this.say(progress);
      return;
    }
    if (!this.dictating) {
      const slant = SlantAnalyzer.analyze(strokes);
      const target = scriptSlant();
      const goal = target >= 89.9 ? 'objetivo: vertical (90°)' : `objetivo ${target}°`;
      this.say(slant.samples > 0 ? `Inclinación ${slant.avgAngle}° · ${goal}` : 'Sigue escribiendo: los trazos que bajan marcan la inclinación.');
    }
  }

  private wireToolbar(): void {
    const toolbar = this.el.toolbar;
    toolbar.onToolChange = (tool) => {
      this.ink.currentTool = tool;
      if (this.penMatchesModel) this.applyModelPen();
    };
    toolbar.onColorChange = (color) => {
      this.ink.currentColor = color;
      this.el.colorPreview.style.background = color;
    };
    toolbar.onUndo = () => this.undo();
    toolbar.onRedo = () => this.redo();
    toolbar.onClear = () => {
      this.retryOnNextStroke = false;
      this.ink.clearSheet();
      this.say('Hoja borrada. «Deshacer» la recupera.');
    };
    toolbar.onZen = () => this.resize();
  }

  private undo(): void {
    const before = this.ink.getStrokes().length;
    this.stepAdvanced = false;
    this.retryOnNextStroke = false;
    this.ink.undo();
    if (this.stepAdvanced || before === 0) return;
    const steps = this.lesson?.steps;
    if (this.ink.getStrokes().length === 0) this.el.liveFeedback.textContent = '';
    else if (steps?.length) this.el.liveFeedback.textContent = `Sigue con ${steps[this.stepIndex].title}.`;
  }

  private redo(): void {
    this.stepAdvanced = false;
    this.retryOnNextStroke = false;
    this.ink.redo();
  }

  /** Atajos de teclado mientras la hoja está abierta: Ctrl+Z, Ctrl+Y / Ctrl+Mayús+Z y Ctrl+Intro para calificar. */
  private wireKeyboard(): void {
    document.addEventListener('keydown', (event) => {
      if (this.el.wrapper.hidden || !this.lesson) return;
      const target = event.target as HTMLElement | null;
      if (target && (target.tagName === 'INPUT' || target.tagName === 'TEXTAREA')) return;
      if (document.querySelector('.score-modal-backdrop:not([hidden])')) return;
      const mod = event.ctrlKey || event.metaKey;
      const key = event.key.toLowerCase();
      if (mod && key === 'z' && !event.shiftKey) {
        event.preventDefault();
        this.undo();
      } else if (mod && (key === 'y' || (key === 'z' && event.shiftKey))) {
        event.preventDefault();
        this.redo();
      } else if (mod && key === 'enter') {
        event.preventDefault();
        this.evaluate();
      }
    });
  }

  private wireButtons(): void {
    this.wireKeyboard();
    const el = this.el;
    el.animateButton.addEventListener('click', () => {
      const lesson = this.lesson;
      if (lesson && this.isPalmerGlyph(lesson)) this.palmerPreview.animate();
      else this.kanjiWriter?.animateCharacter();
      this.ink.animateGuide();
    });
    el.evaluateButton.addEventListener('click', () => this.evaluate());
    el.dictationButton.addEventListener('click', () => this.startDictation());
    el.metronomeButton.addEventListener('click', () => {
      if (this.metronome.running) this.metronome.stop();
      else this.metronome.start(this.settings.metronomeBpm);
      el.metronomeButton.classList.toggle('on', this.metronome.running);
      el.metronomeButton.setAttribute('aria-pressed', String(this.metronome.running));
    });
    el.tipClose.addEventListener('click', () => {
      el.liveTip.hidden = true;
      el.tipToggle.setAttribute('aria-expanded', 'false');
    });
    el.tipToggle.addEventListener('click', () => {
      el.liveTip.hidden = !el.liveTip.hidden;
      el.tipToggle.setAttribute('aria-expanded', String(!el.liveTip.hidden));
    });
    el.widthButton.addEventListener('click', () => {
      this.dockWidthIndex = (this.dockWidthIndex + 1) % DOCK_WIDTHS.length;
      this.setWidth(DOCK_WIDTHS[this.dockWidthIndex]);
      this.penMatchesModel = false;
    });
    el.dictation.onFinish = (finish) => {
      this.dictating = false;
      const lesson = finish.lesson;
      this.ink.revealSheet();
      if (lesson.category === 'japanese') this.showJapaneseGhost();
      const size = this.ink.getSize();
      const base = StrokeEvaluator.evaluateSession({
        strokes: this.ink.getStrokes(),
        lesson: { ...this.lessonForScore(lesson), dictation: true },
        width: size.width,
        height: size.height,
        glyphs: this.glyphs
      });
      const result = ScoringEngine.applyDictation(base, finish.timedOut, finish.wpm);
      result.details = [`Texto: ${lesson.characterOrWord}`, ...(result.details ?? [])];
      this.finishScoring(lesson, result);
    };
    el.dictation.onCancel = () => {
      this.dictating = false;
      this.ink.revealSheet();
      if (this.lesson?.category === 'japanese') this.showJapaneseGhost();
    };
  }

  /** Dictado de cualquier lección con texto: la guía se oculta y se escribe de oído. */
  private startDictation(): void {
    const lesson = this.lesson;
    if (!lesson) return;
    this.ink.reset();
    this.dictating = true;
    if (lesson.sheet) this.ink.setSheet(lesson.characterOrWord, true, lesson.pattern ?? null);
    else if (lesson.category === 'japanese') this.ink.setGhost([]);
    this.el.liveTip.hidden = true;
    this.el.dictation.start({
      ...lesson,
      dictation: true,
      dictationSeconds: lesson.dictationSeconds ?? suggestedSeconds(lesson.characterOrWord)
    });
  }

  private canDictate(lesson: Lesson): boolean {
    if (!this.dictationService.canSpeak()) return false;
    if (lesson.pattern) return false;
    return !!lesson.dictation || !!lesson.sheet || (lesson.category === 'japanese' && glyphsOf(lesson.characterOrWord).length > 1);
  }

  private setWidth(width: number): void {
    this.ink.currentBaseWidth = width;
    this.el.widthLabel.textContent = width.toFixed(1);
    this.el.widthPreview.style.height = `${Math.min(10, Math.max(2, width))}px`;
  }

  private applyTool(lesson: Lesson): void {
    const tool: BrushTool = this.settings.tool === 'auto' ? lesson.recommendedTool : this.settings.tool;
    this.ink.currentTool = tool;
    this.el.toolbar.setTool(tool);
    // Kana y kanji se califican sobre los cuadros del genkōyōshi: con otra pauta la guía
    // y la medición no coincidirían (y los trazos bien hechos se tomarían por incompletos).
    const grid: GridMode = lesson.category === 'japanese'
      ? 'genkouyoushi'
      : this.settings.grid === 'auto' ? lesson.suggestedGrid : this.settings.grid;
    this.ink.setGrid(grid);
    if (this.penMatchesModel) this.applyModelPen();
  }

  private applyModelPen(): void {
    const model = this.ink.modelStrokeWidth();
    if (model == null) return;
    const width = Math.max(1.5, Math.round(baseWidthMatching(this.ink.currentTool, model) * 2) / 2);
    this.setWidth(width);
  }

  private isPalmerGlyph(lesson: Lesson): boolean {
    return lesson.category === 'palmer' && isSingleGlyph(lesson.characterOrWord) && (lesson.steps?.length ?? 0) > 0;
  }

  private showGuide(lesson: Lesson): void {
    const el = this.el;
    const singleJp = lesson.category === 'japanese' && isSingleGlyph(lesson.characterOrWord);
    const palmerGlyph = this.isPalmerGlyph(lesson);
    el.markBox.hidden = !(singleJp || palmerGlyph);
    el.guideChar.textContent = '';
    el.guideChar.hidden = true;
    el.animatorBox.hidden = !palmerGlyph;
    if (!palmerGlyph) el.animatorBox.replaceChildren();
    el.animateButton.hidden = !(singleJp || palmerGlyph || (lesson.category === 'japanese' && !lesson.dictation));
    el.dictationButton.hidden = !this.canDictate(lesson);
    el.glyphMark.textContent = lesson.dictation ? 'Dictado' : lesson.title;
    el.glyphMark.classList.toggle('is-print', lesson.slant != null);
    el.subLabel.textContent = lesson.category === 'palmer'
      ? (lesson.slant != null ? lesson.subTitle : `Español · ${lesson.group}`)
      : [lesson.group, lesson.reading, lesson.meaning].filter(Boolean).join(' · ');
    this.say(singleJp ? 'Cargando orden de trazos…' : lesson.instructions || 'Sigue la guía y escribe.');
    if (!lesson.steps?.length) {
      el.steps.hidden = true;
      el.steps.replaceChildren();
    }
  }

  private async openJapanese(lesson: Lesson, token: number): Promise<void> {
    const chars = glyphsOf(lesson.characterOrWord);
    if (!lesson.dictation) this.say('Cargando orden de trazos…');
    const records = await Promise.all(chars.map((char) => loadCharRecord(char)));
    if (token !== this.token) return;
    this.glyphs = records.map((record) => record.geometry);
    const loaded = this.glyphs.filter(Boolean).length;
    if (chars.length === 1 && records[0].raw) this.mountWriter(chars[0], records[0].raw);
    else if (chars.length === 1) {
      this.el.guideChar.hidden = false;
      this.el.guideChar.textContent = chars[0];
    }
    if (lesson.dictation) {
      this.say('Pulsa «Dictado» para escuchar. Escribe un signo por cuadro; el texto aparece al entregar.');
      return;
    }
    this.showJapaneseGhost();
    if (this.penMatchesModel) this.applyModelPen();
    if (chars.length === 1 && this.glyphs[0]) this.ink.animateGuide();
    if (loaded === 0) {
      this.say('No hay datos de trazo para este carácter sin conexión. Conéctate una vez, o usa «Descargar todo» en Ajustes para tener todos los kanji.');
    } else if (chars.length === 1) {
      this.say(`${this.glyphs[0]?.strokes.length ?? 0} trazos. El ejemplo está arriba; copia el signo en los demás cuadrados. Cada copia se califica.`);
    } else {
      this.say(`Los primeros ${chars.length} cuadrados muestran «${lesson.characterOrWord}». Cópialo en los siguientes, un signo por cuadro.`);
    }
  }

  private showJapaneseGhost(): void {
    if (this.glyphs.length === 1) this.ink.setGhost(this.glyphs[0]?.strokes ?? []);
    else this.ink.setGhostGlyphs(this.glyphs.map((glyph) => glyph?.strokes ?? []));
  }

  private mountWriter(char: string, raw: unknown): void {
    const box = this.el.animatorBox;
    box.replaceChildren();
    box.hidden = false;
    const style = getComputedStyle(document.documentElement);
    const color = (name: string, fallback: string) => style.getPropertyValue(name).trim() || fallback;
    this.kanjiWriter = HanziWriter.create(box, char, {
      width: 72,
      height: 72,
      padding: 5,
      strokeAnimationSpeed: 1.2,
      delayBetweenStrokes: 180,
      strokeColor: color('--guide-anim', '#b45309'),
      radicalColor: color('--accent-soft', '#e5a93c'),
      showOutline: true,
      outlineColor: color('--guide-outline', '#cbd5e1'),
      charDataLoader: (_character, onComplete) => {
        onComplete(raw as never);
      }
    });
    if (!window.matchMedia?.('(prefers-reduced-motion: reduce)').matches) this.kanjiWriter.animateCharacter();
  }

  private renderStepButtons(lesson: Lesson): void {
    const steps = lesson.steps ?? [];
    const el = this.el.steps;
    if (steps.length === 0) {
      el.hidden = true;
      el.replaceChildren();
      return;
    }
    el.hidden = false;
    el.replaceChildren(
      ...steps.map((step, index) => {
        const button = document.createElement('button');
        button.type = 'button';
        const isCurrent = index === this.stepIndex;
        const isDone = index < this.stepIndex;
        button.className = `chip${isCurrent ? ' on' : isDone ? ' done' : ''}`;
        button.setAttribute('aria-current', isCurrent ? 'step' : 'false');
        button.textContent = `${index + 1} ${step.title}`;
        button.addEventListener('click', () => {
          this.stepIndex = index;
          this.retryOnNextStroke = false;
          this.ink.reset();
          this.applyPalmerStep(lesson);
          this.el.liveFeedback.textContent = step.hint;
        });
        return button;
      })
    );
  }

  private applyPalmerStep(lesson: Lesson): void {
    const steps = lesson.steps;
    if (!steps?.length) return;
    this.stepIndex = Math.max(0, Math.min(steps.length - 1, this.stepIndex));
    this.say(steps[this.stepIndex].hint);
    this.renderStepButtons(lesson);
    if (this.isPalmerGlyph(lesson)) {
      this.palmerPreview.attach();
      this.palmerPreview.show((lesson.idealStrokes ?? []).map((stroke) => stroke.points), this.stepIndex + 1);
    }
    this.ink.setPalmerGuide(
      steps.map((step) => step.strokes.map((stroke) => stroke.points)),
      this.stepIndex
    );
    if (this.penMatchesModel) this.applyModelPen();
    if (this.isPalmerGlyph(lesson)) this.palmerPreview.animate();
    this.ink.animateCurrentStep();
  }

  private syncPalmerProgress(): string | null {
    this.stepAdvanced = false;
    const lesson = this.lesson;
    const steps = lesson?.steps;
    if (!lesson || !steps?.length || lesson.category !== 'palmer') return null;
    const guide = this.ink.guideStroke(this.stepIndex);
    if (!guide) return null;
    let covered = false;
    let reversed = false;
    let ambiguous = false;
    for (const stroke of this.ink.getStrokes()) {
      const drawn = stroke.points.map((point) => ({ x: point.x, y: point.y }));
      if (!strokeCoversGuide(drawn, guide.points, guide.width * 1.5)) continue;
      const direction = guideDirection(drawn, guide.points);
      if (direction === 'reverse') {
        reversed = true;
        continue;
      }
      if (direction !== 'forward') {
        ambiguous = true;
        continue;
      }
      covered = true;
      break;
    }
    if (!covered) {
      this.retryOnNextStroke = true;
      this.ink.animateCurrentStep();
      if (reversed) return 'El trazo va al revés. Mira la flecha y toca la hoja para intentarlo de nuevo.';
      if (ambiguous) return 'No se distingue el sentido. Sigue la flecha y toca la hoja para intentarlo de nuevo.';
      return 'Ese trazo no sigue la guía. Mira cómo va y toca la hoja para intentarlo de nuevo.';
    }
    this.retryOnNextStroke = false;
    const doneTitle = steps[this.stepIndex].title;
    if (this.stepIndex >= steps.length - 1) {
      this.onStepProgress?.(lesson, steps.length, steps.length);
      if (!this.celebrated) {
        this.celebrated = true;
        this.onStepsCompleted?.(this.completion(lesson));
      }
      return `${doneTitle} listo. La letra está completa.`;
    }
    this.stepIndex += 1;
    this.stepAdvanced = true;
    this.ink.reset();
    this.applyPalmerStep(lesson);
    this.onStepProgress?.(lesson, this.stepIndex, steps.length);
    return `${doneTitle} listo. Sigue con ${steps[this.stepIndex].title}.`;
  }

  private lessonForScore(lesson: Lesson): Lesson {
    if (lesson.sheet) return { ...lesson, guidedRows: this.ink.sheetGuidedRows() };
    const step = lesson.steps?.[this.stepIndex];
    if (!step) return lesson;
    return {
      ...lesson,
      idealStrokes: step.strokes,
      idealMode: step.mode,
      strokesExpected: step.strokes.length
    };
  }

  private scheduleDraft(): void {
    window.clearTimeout(this.draftTimer);
    this.draftTimer = window.setTimeout(() => this.flushDraft(), 1200);
  }

  /** La hoja a medio escribir se guarda sola; al volver a la lección se recupera. */
  private flushDraft(): void {
    window.clearTimeout(this.draftTimer);
    const lesson = this.lesson;
    if (!lesson || lesson.steps?.length || this.dictating) return;
    const strokes = this.ink.getStrokes();
    if (strokes.length === 0) {
      void this.sheets.deleteDraft(lesson.id);
      return;
    }
    const size = this.ink.getSize();
    void this.sheets.saveDraft({ lessonId: lesson.id, at: Date.now(), width: size.width, height: size.height, strokes: [...strokes] });
  }

  private async restoreDraft(lesson: Lesson, token: number): Promise<void> {
    if (lesson.steps?.length || lesson.dictation) return;
    const draft = await this.sheets.loadDraft(lesson.id);
    if (!draft || token !== this.token || draft.strokes.length === 0) return;
    const strokes = draft.strokes.map((stroke) => ({
      ...stroke,
      points: stroke.points.map((point) => ({ ...point }))
    }));
    this.ink.loadStrokes(strokes, { width: draft.width, height: draft.height });
    this.el.toolbar.setHistory(true);
    this.say('Se recuperó la hoja que dejaste a medias. «Borrar hoja» empieza de cero.');
  }
}

/** Hoja de texto en español (no la de soltura): se escribe con la letra elegida. */
function isTextSheet(lesson: Lesson): boolean {
  return lesson.category === 'palmer' && !!lesson.sheet && !lesson.pattern;
}
