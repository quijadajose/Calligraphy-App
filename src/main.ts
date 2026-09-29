import HanziWriter from 'hanzi-writer';
import { DictationService, suggestedSeconds } from './core/audio/DictationService';
import { loadCharRecord } from './core/evaluation/CharDataLoader';
import { SlantAnalyzer } from './core/evaluation/SlantAnalyzer';
import { guideDirection, strokeCoversGuide } from './core/evaluation/geometry';
import { StrokeEvaluator } from './core/evaluation/StrokeEvaluator';
import { baseWidthMatching } from './core/engine/BrushRenderer';
import { InkCanvas } from './core/engine/InkCanvas';
import { LESSONS } from './data/lessons';
import { CharGeometry, GridMode, Lesson } from './types/ink';
import { DictationOverlay } from './ui/components/DictationOverlay';
import { ProgressStore } from './core/progress/ProgressStore';
import { LessonNavigator } from './ui/components/LessonNavigator';
import { ProgressDashboard } from './ui/components/ProgressDashboard';
import { PalmerStrokePreview } from './ui/components/PalmerStrokePreview';
import { FinishOverlay } from './ui/components/FinishOverlay';
import { ScoreModal } from './ui/components/ScoreModal';
import { Toolbar } from './ui/components/Toolbar';
import { ScoringEngine } from './core/evaluation/ScoringEngine';

window.addEventListener('DOMContentLoaded', () => {
  const canvasWrapper = document.getElementById('canvas-wrapper') as HTMLElement;
  const inkCanvas = new InkCanvas(canvasWrapper);
  const dictationService = new DictationService();

  const pressureIndicator = document.getElementById('pressure-indicator') as HTMLElement;
  const pressureText = document.getElementById('pressure-text') as HTMLElement;
  const guideChar = document.getElementById('guide-char') as HTMLElement;
  const kanjiAnimatorBox = document.getElementById('kanji-animator-box') as HTMLElement;
  const btnAnimateStroke = document.getElementById('btn-animate-stroke') as HTMLButtonElement;
  const guideTitle = document.getElementById('guide-title') as HTMLElement;
  const guideInstructions = document.getElementById('guide-instructions') as HTMLElement;
  const liveFeedback = document.getElementById('live-feedback') as HTMLElement;

  const strokeSteps = document.getElementById('stroke-steps') as HTMLElement;

  const palmerPreview = new PalmerStrokePreview(kanjiAnimatorBox);
  let kanjiWriter: HanziWriter | null = null;
  let activeGeometry: CharGeometry | null = null;
  let lessonToken = 0;
  let stepIndex = 0;
  let activeLesson: Lesson = LESSONS[0];
  let penMatchesModel = true;
  let stepAdvanced = false;

  const gridCycle: GridMode[] = ['palmer', 'genkouyoushi', 'none'];

  const toolbar = new Toolbar(
    {
      fountain: document.getElementById('tool-fountain') as HTMLButtonElement,
      fude: document.getElementById('tool-fude') as HTMLButtonElement,
      pencil: document.getElementById('tool-pencil') as HTMLButtonElement
    },
    document.getElementById('ink-color') as HTMLInputElement,
    document.getElementById('ink-width') as HTMLInputElement,
    document.getElementById('btn-grid-toggle') as HTMLButtonElement,
    document.getElementById('btn-undo') as HTMLButtonElement,
    document.getElementById('btn-clear') as HTMLButtonElement,
    document.getElementById('zen-mode-btn') as HTMLButtonElement,
    document.getElementById('zen-exit-btn') as HTMLButtonElement
  );

  const lessonsNav = new LessonNavigator(
    LESSONS,
    document.getElementById('lesson-list-container') as HTMLElement,
    document.getElementById('lesson-tabs') as HTMLElement,
    document.getElementById('kanji-levels') as HTMLElement,
    document.getElementById('lesson-heading') as HTMLElement,
    document.getElementById('lesson-blurb') as HTMLElement,
    document.getElementById('lesson-search') as HTMLInputElement,
    {
      palmer: document.getElementById('filter-palmer') as HTMLButtonElement,
      kanji: document.getElementById('filter-kanji') as HTMLButtonElement
    },
    document.getElementById('current-category-badge') as HTMLElement
  );

  const scoreModal = new ScoreModal(
    document.getElementById('score-modal') as HTMLElement,
    document.getElementById('modal-score') as HTMLElement,
    document.getElementById('modal-feedback') as HTMLElement,
    document.getElementById('modal-details') as HTMLElement,
    document.getElementById('modal-close-btn') as HTMLButtonElement
  );

  const dictation = new DictationOverlay(
    document.getElementById('dictation-overlay') as HTMLElement,
    document.getElementById('dictation-prompt') as HTMLElement,
    document.getElementById('dictation-clock') as HTMLElement,
    document.getElementById('dictation-listen') as HTMLButtonElement,
    document.getElementById('dictation-submit') as HTMLButtonElement,
    document.getElementById('dictation-cancel') as HTMLButtonElement,
    dictationService
  );

  inkCanvas.onPressureUpdate = (pressure) => {
    const pct = Math.round(pressure * 100);
    pressureIndicator.style.width = `${pct}%`;
    pressureText.textContent = `${pct}%`;
    if (pressure > 0.02) {
      pressureSum += pressure;
      pressureCount += 1;
    }
  };

  let retryOnNextStroke = false;
  let practiceStartedAt = performance.now();
  let pressureSum = 0;
  let pressureCount = 0;
  let celebrated = false;
  const finish = new FinishOverlay(document.getElementById('finish-layer') as HTMLElement);

  inkCanvas.onStrokeStart = () => {
    if (!retryOnNextStroke) return;
    retryOnNextStroke = false;
    inkCanvas.clear(false);
  };

  inkCanvas.onStrokeComplete = (strokes) => {
    if (strokes.length === 0) {
      retryOnNextStroke = false;
      liveFeedback.textContent = '';
      return;
    }
    if (activeLesson.category === 'japanese' && activeLesson.characterOrWord.length === 1) {
      liveFeedback.textContent = StrokeEvaluator.liveKanjiMessage(
        strokes,
        activeGeometry,
        inkCanvas.getSize().width,
        inkCanvas.getSize().height
      );
      noteLesson({ practiced: true });
      return;
    }
    if (activeLesson.category === 'palmer') {
      noteLesson({ practiced: true });
      const progress = syncPalmerProgress();
      if (progress) {
        liveFeedback.textContent = progress;
        return;
      }
      const slant = SlantAnalyzer.analyze(strokes);
      liveFeedback.textContent = `Inclinación ${slant.avgAngle}° · nota parcial ${slant.slantScore}`;
    }
  };

  toolbar.onToolChange = (tool) => {
    inkCanvas.currentTool = tool;
    if (penMatchesModel) applyModelPen();
  };
  toolbar.onColorChange = (color) => {
    inkCanvas.currentColor = color;
  };
  const themeChoices = Array.from(document.querySelectorAll<HTMLButtonElement>('[data-theme-choice]'));
  const inkColorInput = document.getElementById('ink-color') as HTMLInputElement;
  const themeMeta = document.getElementById('theme-color') as HTMLMetaElement | null;
  const dayInk = '#1a1a1a';
  const nightInk = '#f3efe6';
  const kidsInk = '#24356b';
  const inkDefaults = [dayInk, nightInk, kidsInk, '#000000'];
  const applyTheme = (theme: 'light' | 'dark' | 'kids'): void => {
    document.documentElement.dataset.theme = theme;
    localStorage.setItem('calligraphy-theme', theme);
    themeChoices.forEach((button) => {
      const selected = button.dataset.themeChoice === theme;
      button.classList.toggle('active', selected);
      button.setAttribute('aria-pressed', String(selected));
    });
    if (themeMeta) {
      themeMeta.content = theme === 'dark' ? '#1a1e26' : theme === 'kids' ? '#8fd4ff' : '#f4efe4';
    }
    const current = inkCanvas.currentColor.toLowerCase();
    const nextInk = theme === 'dark' ? nightInk : theme === 'kids' ? kidsInk : dayInk;
    if (inkDefaults.includes(current) && current !== nextInk) {
      inkCanvas.currentColor = nextInk;
      inkColorInput.value = nextInk;
    }
    inkCanvas.redrawAll();
  };
  themeChoices.forEach((button) => {
    button.addEventListener('click', (event) => {
      event.stopPropagation();
      const choice = button.dataset.themeChoice;
      if (choice === 'light' || choice === 'dark' || choice === 'kids') applyTheme(choice);
    });
  });
  const initialTheme = document.documentElement.dataset.theme;
  applyTheme(initialTheme === 'dark' || initialTheme === 'kids' ? initialTheme : 'light');
  toolbar.onWidthChange = (width) => {
    penMatchesModel = false;
    inkCanvas.currentBaseWidth = width;
  };
  toolbar.onUndo = () => {
    const before = inkCanvas.getStrokes().length;
    stepAdvanced = false;
    retryOnNextStroke = false;
    inkCanvas.undo();
    if (stepAdvanced || before === 0) return;
    if (inkCanvas.getStrokes().length === 0) liveFeedback.textContent = '';
    else if (activeLesson.steps?.length) liveFeedback.textContent = `Sigue con ${activeLesson.steps[stepIndex].title}.`;
  };
  toolbar.onClear = () => {
    retryOnNextStroke = false;
    inkCanvas.clear();
  };
  inkCanvas.onResize = () => {
    if (penMatchesModel) applyModelPen();
  };
  toolbar.onGridCycle = () => {
    const next = (gridCycle.indexOf(inkCanvas.gridMode) + 1) % gridCycle.length;
    inkCanvas.setGrid(gridCycle[next]);
    toolbar.setGridLabel(inkCanvas.gridMode);
    if (penMatchesModel) applyModelPen();
  };
  const courseHome = document.getElementById('course-home') as HTMLElement;
  const lessonsPanel = document.getElementById('lessons-panel') as HTMLElement;
  const progressPanel = document.getElementById('progress-panel') as HTMLElement;
  const backHome = document.getElementById('back-home') as HTMLButtonElement;
  const penMenu = document.getElementById('pen-menu') as HTMLElement;
  const sessionMenu = document.getElementById('session-menu') as HTMLElement;
  const progressStore = new ProgressStore();
  const dashboard = new ProgressDashboard(document.getElementById('progress-body') as HTMLElement);
  const menuButtons = {
    lessons: document.getElementById('menu-lessons') as HTMLButtonElement,
    progress: document.getElementById('menu-progress') as HTMLButtonElement,
    pen: document.getElementById('menu-pen') as HTMLButtonElement,
    session: document.getElementById('menu-session') as HTMLButtonElement
  };
  let screen: 'lessons' | 'progress' | 'studio' = 'lessons';
  let studioReady = false;

  function publishProgress(): void {
    if (screen === 'lessons') lessonsNav.setProgress(progressStore.startedIds(), progressStore.completedIds());
    if (screen === 'progress') dashboard.render(progressStore.view(LESSONS));
  }

  function noteLesson(update: Parameters<ProgressStore['record']>[1]): void {
    progressStore.record(activeLesson, update);
    publishProgress();
  }

  function noteScore(score: number): void {
    noteLesson({ practiced: true, bestScore: score, complete: score >= 70 });
  }

  function closePopovers(): void {
    penMenu.hidden = true;
    sessionMenu.hidden = true;
    menuButtons.pen.setAttribute('aria-expanded', 'false');
    menuButtons.session.setAttribute('aria-expanded', 'false');
    menuButtons.pen.classList.remove('is-open');
    menuButtons.session.classList.remove('is-open');
  }

  function showDashboard(which: 'lessons' | 'progress'): void {
    screen = which;
    document.body.classList.remove('is-notebook');
    courseHome.hidden = false;
    canvasWrapper.hidden = true;
    lessonsPanel.hidden = which !== 'lessons';
    progressPanel.hidden = which !== 'progress';
    closePopovers();
    menuButtons.lessons.setAttribute('aria-expanded', String(which === 'lessons'));
    menuButtons.progress.setAttribute('aria-expanded', String(which === 'progress'));
    menuButtons.lessons.classList.toggle('is-open', which === 'lessons');
    menuButtons.progress.classList.toggle('is-open', which === 'progress');
    if (which === 'lessons') lessonsNav.setProgress(progressStore.startedIds(), progressStore.completedIds());
    else dashboard.render(progressStore.view(LESSONS));
    finish.hide();
  }

  finish.onHome = () => showDashboard('lessons');

  function enterStudio(): void {
    screen = 'studio';
    document.body.classList.add('is-notebook');
    courseHome.hidden = true;
    canvasWrapper.hidden = false;
    closePopovers();
    menuButtons.lessons.setAttribute('aria-expanded', 'false');
    menuButtons.progress.setAttribute('aria-expanded', 'false');
    menuButtons.lessons.classList.remove('is-open');
    menuButtons.progress.classList.remove('is-open');
    inkCanvas.resizeCanvas();
    [50, 120, 240].forEach((ms) => setTimeout(() => inkCanvas.resizeCanvas(), ms));
    studioReady = true;
  }

  function ensureStudio(): void {
    if (studioReady) return;
    enterStudio();
    void openLesson(activeLesson);
  }

  menuButtons.lessons.addEventListener('click', (event) => {
    event.stopPropagation();
    showDashboard('lessons');
  });
  menuButtons.progress.addEventListener('click', (event) => {
    event.stopPropagation();
    showDashboard('progress');
  });
  backHome.addEventListener('click', (event) => {
    event.stopPropagation();
    showDashboard('lessons');
  });
  menuButtons.pen.addEventListener('click', (event) => {
    event.stopPropagation();
    const open = penMenu.hidden;
    closePopovers();
    if (open) {
      penMenu.hidden = false;
      menuButtons.pen.setAttribute('aria-expanded', 'true');
      menuButtons.pen.classList.add('is-open');
    }
  });
  menuButtons.session.addEventListener('click', (event) => {
    event.stopPropagation();
    const open = sessionMenu.hidden;
    closePopovers();
    if (open) {
      sessionMenu.hidden = false;
      menuButtons.session.setAttribute('aria-expanded', 'true');
      menuButtons.session.classList.add('is-open');
    }
  });
  document.addEventListener('click', (event) => {
    const target = event.target as HTMLElement | null;
    if (target?.closest('[data-menu], .menu-trigger')) return;
    closePopovers();
  });
  dashboard.onOpenGroup = (category, group) => {
    lessonsNav.showGroup(category, group);
    showDashboard('lessons');
  };
  dashboard.onOpenLesson = (lesson) => {
    lessonsNav.select(lesson);
  };

  toolbar.onZen = (enabled) => {
    if (enabled) ensureStudio();
    inkCanvas.resizeCanvas();
    [50, 100, 200, 320].forEach((ms) => setTimeout(() => inkCanvas.resizeCanvas(), ms));
  };

  function applyTool(lesson: Lesson): void {
    inkCanvas.currentTool = lesson.recommendedTool;
    toolbar.setTool(lesson.recommendedTool);
    inkCanvas.setGrid(lesson.suggestedGrid);
    toolbar.setGridLabel(lesson.suggestedGrid);
  }

  function renderStepButtons(lesson: Lesson): void {
    const steps = lesson.steps ?? [];
    strokeSteps.innerHTML = '';
    if (steps.length === 0) {
      strokeSteps.hidden = true;
      return;
    }
    strokeSteps.hidden = false;
    steps.forEach((step, index) => {
      const button = document.createElement('button');
      button.type = 'button';
      button.className = `stroke-step-btn${index === stepIndex ? ' active' : ''}`;
      button.textContent = `${index + 1}. ${step.title}`;
      button.addEventListener('click', (event) => {
        event.stopPropagation();
        stepIndex = index;
        retryOnNextStroke = false;
        inkCanvas.clear(false);
        applyPalmerStep(lesson);
        liveFeedback.textContent = '';
      });
      strokeSteps.appendChild(button);
    });
  }

  function applyModelPen(): void {
    const model = inkCanvas.modelStrokeWidth();
    if (model == null) return;
    const width = Math.max(1.5, Math.round(baseWidthMatching(inkCanvas.currentTool, model) * 2) / 2);
    inkCanvas.currentBaseWidth = width;
    toolbar.setWidth(width);
  }

  function syncPalmerProgress(): string | null {
    stepAdvanced = false;
    const steps = activeLesson.steps;
    if (!steps?.length || activeLesson.category !== 'palmer') return null;
    const guide = inkCanvas.guideStroke(stepIndex);
    if (!guide) return null;
    let covered = false;
    let reversed = false;
    let ambiguous = false;
    for (const stroke of inkCanvas.getStrokes()) {
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
      retryOnNextStroke = true;
      inkCanvas.animateCurrentStep();
      if (reversed) return 'El trazo va al revés. Mira la flecha y toca la hoja para intentarlo de nuevo.';
      if (ambiguous) return 'No se distingue el sentido. Sigue la flecha y toca la hoja para intentarlo de nuevo.';
      return 'Ese trazo no sigue la guía. Mira cómo va y toca la hoja para intentarlo de nuevo.';
    }
    retryOnNextStroke = false;
    const doneTitle = steps[stepIndex].title;
    if (stepIndex >= steps.length - 1) {
      noteLesson({ practiced: true, stepsDone: steps.length, stepsTotal: steps.length, complete: true });
      if (!celebrated) {
        celebrated = true;
        finish.show({
          title: activeLesson.title,
          elapsedMs: performance.now() - practiceStartedAt,
          averagePressure: pressureCount > 0 ? pressureSum / pressureCount : null
        });
      }
      return `${doneTitle} listo. La letra está completa.`;
    }
    stepIndex += 1;
    stepAdvanced = true;
    inkCanvas.clear(false);
    applyPalmerStep(activeLesson);
    noteLesson({ practiced: true, stepsDone: stepIndex, stepsTotal: steps.length });
    return `${doneTitle} listo. Sigue con ${steps[stepIndex].title}.`;
  }

  function applyPalmerStep(lesson: Lesson): void {
    const steps = lesson.steps;
    if (!steps?.length) {
      inkCanvas.setGhost(lesson.idealStrokes?.map((stroke) => stroke.points) ?? []);
      return;
    }
    stepIndex = Math.max(0, Math.min(steps.length - 1, stepIndex));
    guideInstructions.textContent = steps[stepIndex].hint;
    renderStepButtons(lesson);
    if (isPalmerGlyph(lesson)) {
      palmerPreview.attach();
      palmerPreview.show(
        (lesson.idealStrokes ?? []).map((stroke) => stroke.points),
        stepIndex + 1
      );
    }
    inkCanvas.setPalmerGuide(
      steps.map((step) => step.strokes.map((stroke) => stroke.points)),
      stepIndex
    );
    if (penMatchesModel) applyModelPen();
  }

  function lessonForScore(lesson: Lesson): Lesson {
    const step = lesson.steps?.[stepIndex];
    if (!step) return lesson;
    return {
      ...lesson,
      idealStrokes: step.strokes,
      idealMode: step.mode,
      strokesExpected: step.strokes.length
    };
  }

  function showGuide(lesson: Lesson): void {
    guideTitle.textContent = lesson.title;
    guideInstructions.textContent = lesson.instructions;
    const singleJp = lesson.category === 'japanese' && lesson.characterOrWord.length === 1;
    const palmerGlyph = isPalmerGlyph(lesson);
    const animated = singleJp || palmerGlyph;
    const mark = lesson.dictation ? '' : lesson.characterOrWord.trim();
    const showMark = !animated && !lesson.sheet && Array.from(mark).length === 1;
    const markBox = document.getElementById('character-target-container') as HTMLElement;
    markBox.hidden = !animated && !showMark;
    guideChar.style.display = showMark ? 'block' : 'none';
    kanjiAnimatorBox.style.display = animated ? 'block' : 'none';
    btnAnimateStroke.style.display = animated ? 'inline-flex' : 'none';
    guideChar.textContent = showMark ? mark : '';
    liveFeedback.textContent = singleJp ? 'Cargando orden de trazos…' : '';
    if (!lesson.steps?.length) {
      strokeSteps.hidden = true;
      strokeSteps.innerHTML = '';
    }
  }

  function mountWriter(char: string, raw: unknown): void {
    kanjiAnimatorBox.innerHTML = '';
    kanjiWriter = HanziWriter.create(kanjiAnimatorBox, char, {
      width: 72,
      height: 72,
      padding: 5,
      strokeAnimationSpeed: 1.2,
      delayBetweenStrokes: 180,
      strokeColor: '#b45309',
      radicalColor: '#e5a93c',
      showOutline: true,
      outlineColor: '#cbd5e1',
      charDataLoader: (_character, onComplete) => {
        if (raw) onComplete(raw as never);
      }
    });
  }

  async function openLesson(lesson: Lesson): Promise<void> {
    const token = ++lessonToken;
    activeLesson = lesson;
    stepIndex = 0;
    penMatchesModel = true;
    practiceStartedAt = performance.now();
    pressureSum = 0;
    pressureCount = 0;
    celebrated = false;
    finish.hide();
    activeGeometry = null;
    palmerPreview.stop();
    if (!isPalmerGlyph(lesson)) kanjiAnimatorBox.replaceChildren();
    if (dictation.isOpen()) dictation.dismiss();
    showGuide(lesson);
    applyTool(lesson);
    inkCanvas.clear();
    inkCanvas.setGhost([]);

    if (lesson.category === 'japanese' && lesson.characterOrWord.length === 1) {
      liveFeedback.textContent = 'Cargando orden de trazos…';
      const record = await loadCharRecord(lesson.characterOrWord);
      if (token !== lessonToken) return;
      activeGeometry = record.geometry;
      if (record.raw) {
        mountWriter(lesson.characterOrWord, record.raw);
        kanjiAnimatorBox.style.display = 'block';
        btnAnimateStroke.style.display = 'inline-flex';
        guideChar.style.display = 'none';
      } else {
        kanjiAnimatorBox.style.display = 'none';
        btnAnimateStroke.style.display = 'none';
        guideChar.style.display = 'block';
        guideChar.textContent = lesson.characterOrWord;
      }
      inkCanvas.setGhost(record.geometry?.strokes ?? []);
      if (penMatchesModel) applyModelPen();
      liveFeedback.textContent = record.geometry
        ? `${record.geometry.strokes.length} trazos. Empieza por el primero.`
        : 'No hay datos de trazo para este carácter.';
      return;
    }

    if (lesson.steps?.length) {
      applyPalmerStep(lesson);
      return;
    }

    if (lesson.sheet) {
      inkCanvas.setSheet(lesson.characterOrWord);
      if (penMatchesModel) applyModelPen();
      return;
    }

    if (lesson.idealStrokes?.length) {
      inkCanvas.setGhost(lesson.idealStrokes.map((stroke) => stroke.points));
      if (penMatchesModel) applyModelPen();
    }
  }

  lessonsNav.onSelect = (lesson) => {
    enterStudio();
    void openLesson(lesson);
  };

  btnAnimateStroke.addEventListener('click', (event) => {
    event.stopPropagation();
    if (isPalmerGlyph(activeLesson)) palmerPreview.animate();
    else kanjiWriter?.animateCharacter();
    inkCanvas.animateGuide();
  });

  function isPalmerGlyph(lesson: Lesson): boolean {
    return lesson.category === 'palmer' && lesson.characterOrWord.length === 1 && (lesson.steps?.length ?? 0) > 0;
  }

  document.getElementById('evaluate-btn')?.addEventListener('click', () => {
    closePopovers();
    ensureStudio();
    const size = inkCanvas.getSize();
    const result = StrokeEvaluator.evaluateSession({
      strokes: inkCanvas.getStrokes(),
      lesson: lessonForScore(activeLesson),
      width: size.width,
      height: size.height,
      charGeometry: activeGeometry
    });
    noteScore(result.score);
    scoreModal.show(result);
  });

  dictation.onFinish = (finish) => {
    const size = inkCanvas.getSize();
    const base = StrokeEvaluator.evaluateSession({
      strokes: inkCanvas.getStrokes(),
      lesson: lessonForScore(finish.lesson),
      width: size.width,
      height: size.height,
      charGeometry: activeGeometry
    });
    const result = ScoringEngine.applyDictation(base, finish.timedOut, finish.wpm);
    result.details = [`Texto: ${finish.lesson.characterOrWord}`, ...(result.details ?? [])];
    noteScore(result.score);
    scoreModal.show(result);
  };

  document.getElementById('dictation-btn')?.addEventListener('click', () => {
    closePopovers();
    ensureStudio();
    const lesson = activeLesson.dictation
      ? activeLesson
      : {
          ...activeLesson,
          dictation: true,
          dictationSeconds: activeLesson.dictationSeconds ?? suggestedSeconds(activeLesson.characterOrWord)
        };
    dictation.start(lesson);
  });

  if (import.meta.env.PROD && 'serviceWorker' in window.navigator) {
    window.navigator.serviceWorker.register('/sw.js').catch(() => undefined);
  }

  showDashboard('lessons');
  publishProgress();
});
