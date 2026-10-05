import '@fontsource/caveat/600.css';
import '@fontsource/outfit/400.css';
import '@fontsource/outfit/500.css';
import '@fontsource/outfit/600.css';
import '@fontsource/noto-serif-jp/400.css';
// Letras de las hojas de texto, una por estilo (se bajan solo al usarse). Solo latín: incluye ñ y tildes.
import '@fontsource/andika/latin-400.css';
import '@fontsource/playwrite-es/latin-400.css';
import '@fontsource/cormorant-garamond/latin-600-italic.css';
import '@fontsource/pinyon-script/latin-400.css';
import './styles/icons.css';
import './styles/main.css';
import { Studio } from './app/Studio';
import { DictationService } from './core/audio/DictationService';
import { PlanItem, buildDailyPlan, nextLesson } from './core/daily/DailyPlan';
import { Achievement, AchievementStore, evaluateAchievements } from './core/achievements/Achievements';
import { ChallengeStore, DayActivity, SyncResult } from './core/challenges/Challenges';
import { downloadOffline, offlineStatus } from './core/offline/OfflinePack';
import { MASTERY_LABELS, PASSING_SCORE, ProgressStore, dayKey, masteryLevel } from './core/progress/ProgressStore';
import { DEFAULT_SETTINGS, SettingsStore, ThemeChoice } from './core/settings/SettingsStore';
import { browserStore } from './core/storage/safeStorage';
import { SheetStore } from './core/storage/SheetStore';
import { allLessons } from './data/lessons';
import { Lesson } from './types/ink';
import { DictationOverlay } from './ui/components/DictationOverlay';
import { FinishOverlay } from './ui/components/FinishOverlay';
import { LessonNavigator } from './ui/components/LessonNavigator';
import { MedalOverlay } from './ui/components/MedalOverlay';
import { ProgressDashboard } from './ui/components/ProgressDashboard';
import { ScoreModal } from './ui/components/ScoreModal';
import { SettingsPreview } from './ui/components/SettingsPreview';
import { ScriptStyle } from './core/engine/scriptFonts';
import { LETTER_STYLES } from './data/groups';
import { SettingsPanel } from './ui/components/SettingsPanel';
import { TodayPanel } from './ui/components/TodayPanel';
import { toast } from './ui/toast';
import { Toolbar } from './ui/components/Toolbar';

const THEME_KEY = 'calligraphy-theme';
const INK_BY_THEME: Record<ThemeChoice, string> = { light: '#1a1a1a', dark: '#f3efe6' };
const PAPER_BY_THEME: Record<ThemeChoice, string> = { light: '#f4efe4', dark: '#1a1e26' };

type Screen = 'home' | 'progress' | 'settings' | 'studio';

function byId<T extends HTMLElement = HTMLElement>(id: string): T {
  const el = document.getElementById(id);
  if (!el) throw new Error(`Falta #${id} en index.html`);
  return el as T;
}

window.addEventListener('DOMContentLoaded', () => {
  const kv = browserStore();
  const settingsStore = new SettingsStore(kv);
  const progress = new ProgressStore(kv);
  const challenges = new ChallengeStore(kv);
  const achievementStore = new AchievementStore(kv);
  const sheets = new SheetStore();
  const dictationService = new DictationService();

  let lessons = allLessons(settingsStore.get().customTexts);
  let lessonsById = new Map(lessons.map((lesson) => [lesson.id, lesson]));
  let plan: PlanItem[] = [];
  let screen: Screen = 'home';

  // ---------------------------------------------------------------- Tema
  const themeMeta = document.getElementById('theme-color') as HTMLMetaElement | null;
  const readTheme = (): ThemeChoice => {
    const saved = kv.getItem(THEME_KEY);
    if (saved === 'light' || saved === 'dark') return saved;
    // El tema infantil se retiró: quien lo tenía pasa al claro.
    if (saved === 'kids') {
      kv.setItem(THEME_KEY, 'light');
      return 'light';
    }
    return document.documentElement.dataset.theme === 'dark' ? 'dark' : 'light';
  };
  let theme = readTheme();

  // ---------------------------------------------------------------- Componentes
  const toolbar = new Toolbar(
    {
      fountain: byId<HTMLButtonElement>('tool-fountain'),
      fude: byId<HTMLButtonElement>('tool-fude'),
      pencil: byId<HTMLButtonElement>('tool-pencil'),
      eraser: byId<HTMLButtonElement>('tool-eraser')
    },
    byId<HTMLInputElement>('ink-color'),
    byId<HTMLButtonElement>('btn-undo'),
    byId<HTMLButtonElement>('btn-redo'),
    byId<HTMLButtonElement>('btn-clear'),
    byId<HTMLButtonElement>('zen-mode-btn'),
    byId<HTMLButtonElement>('zen-exit-btn')
  );

  const dictation = new DictationOverlay(
    byId('dictation-overlay'),
    byId('dictation-prompt'),
    byId('dictation-clock'),
    byId<HTMLButtonElement>('dictation-listen'),
    byId<HTMLButtonElement>('dictation-submit'),
    byId<HTMLButtonElement>('dictation-cancel'),
    dictationService
  );

  const studio = new Studio(
    {
      wrapper: byId('canvas-wrapper'),
      paper: byId('paper-wrap'),
      pressureIndicator: byId('pressure-indicator'),
      pressureText: byId('pressure-text'),
      glyphMark: byId('practice-glyph-mark'),
      subLabel: byId('practice-sub-label'),
      guideChar: byId('guide-char'),
      animatorBox: byId('kanji-animator-box'),
      markBox: byId('character-target-container'),
      animateButton: byId<HTMLButtonElement>('btn-animate-stroke'),
      liveTip: byId('live-tip'),
      liveFeedback: byId('live-feedback'),
      tipToggle: byId<HTMLButtonElement>('btn-tip'),
      tipClose: byId<HTMLButtonElement>('tip-close'),
      steps: byId('stroke-steps'),
      evaluateButton: byId<HTMLButtonElement>('evaluate-btn'),
      dictationButton: byId<HTMLButtonElement>('dictation-btn'),
      metronomeButton: byId<HTMLButtonElement>('btn-metronome'),
      widthButton: byId<HTMLButtonElement>('btn-width-toggle'),
      widthLabel: byId('dock-width-label'),
      widthPreview: byId('dock-width-preview'),
      colorPreview: byId('dock-color-preview'),
      colorInput: byId<HTMLInputElement>('ink-color'),
      dock: byId('tool-dock'),
      toolbar,
      dictation
    },
    settingsStore.get(),
    sheets,
    dictationService
  );

  const catalog = new LessonNavigator(
    lessons,
    byId('lesson-list-container'),
    byId('lesson-tabs'),
    byId('kanji-levels'),
    byId('lesson-heading'),
    byId('lesson-blurb'),
    byId<HTMLInputElement>('lesson-search'),
    { palmer: byId<HTMLButtonElement>('filter-palmer'), kanji: byId<HTMLButtonElement>('filter-kanji') }
  );
  const today = new TodayPanel(byId('today-panel'));
  const dashboard = new ProgressDashboard(byId('progress-body'));
  const settingsPanel = new SettingsPanel(byId('settings-body'), settingsStore);
  const settingsPreview = new SettingsPreview(byId('settings-preview'));
  const scoreModal = new ScoreModal(byId('score-modal'));
  const finish = new FinishOverlay(byId('finish-layer'));
  const medalOverlay = new MedalOverlay();

  // ---------------------------------------------------------------- Progreso y plan del día
  function refreshPlan(): void {
    // Las lecciones de estilos que no se practican no entran al plan.
    const { scripts } = settingsStore.get();
    const practiced = lessons.filter((lesson) => !(LETTER_STYLES.includes(lesson.group) && !scripts.includes(lesson.group as ScriptStyle)));
    plan = buildDailyPlan(practiced, progress, settingsStore.get().lastLessonId, Date.now());
  }

  // ---------------------------------------------------------------- Desafíos
  /** Desafíos completados desde que se vio Hoy por última vez: se marcan al volver. */
  const freshQuests = new Set<string>();
  let questDay = '';

  function dayActivity(): DayActivity {
    if (plan.length === 0) refreshPlan();
    const log = progress.dayLog();
    const count = (kinds: string[]) => {
      const items = plan.filter((item) => kinds.includes(item.kind));
      return { done: items.filter((item) => item.done).length, total: items.length };
    };
    return {
      ms: log.ms,
      strokes: log.strokes,
      lessonsPracticed: log.lessons.length,
      scores: progress.scoresOn(),
      reviews: count(['review']),
      fresh: count(['new']),
      session: count(['warmup', 'review', 'new', 'sheet']),
      goalMinutes: settingsStore.get().dailyGoalMinutes
    };
  }

  function syncChallenges(announce: boolean): SyncResult {
    const day = dayKey(Date.now());
    if (day !== questDay) {
      freshQuests.clear();
      questDay = day;
    }
    const result = challenges.sync(day, dayActivity());
    for (const challenge of result.completed) {
      freshQuests.add(challenge.kind);
      if (announce) toast(`Desafío completado: ${challenge.title}`, 'success');
    }
    if (result.medalEarned) medalOverlay.show(result.month.month, result.month.count);
    return result;
  }

  function currentAchievements(view = progress.view(lessons)): Achievement[] {
    const life = progress.lifetime();
    const groups: Record<string, { complete: number; total: number }> = {};
    for (const section of view.sections) for (const group of section.groups) groups[group.id] = { complete: group.complete, total: group.total };
    return evaluateAchievements({
      longestStreak: life.longestStreak,
      strokes: life.strokes,
      minutes: Math.floor(life.ms / 60000),
      highScores: life.highScores,
      challenges: challenges.totalCompleted(),
      medals: challenges.medals().length,
      earlyDays: life.earlyDays,
      lateDays: life.lateDays,
      groups
    });
  }

  /** Avisa de los logros que subieron de nivel. */
  function checkAchievements(list = currentAchievements()): Achievement[] {
    for (const item of achievementStore.update(list)) {
      toast(item.next === null ? `¡Logro completado: ${item.name}!` : `Logro: ${item.name} · nivel ${item.level}`, 'success');
    }
    return list;
  }

  function lessonNext(lesson: Lesson): Lesson | null {
    refreshPlan();
    return nextLesson(lessons, plan, lesson, settingsStore.get().sheetScript);
  }

  function publishProgress(): void {
    if (screen === 'home') {
      const mastery = new Map(lessons.map((lesson) => [lesson.id, masteryLevel(progress.get(lesson.id))]));
      catalog.setProgress(mastery, new Set(progress.dueIds()));
      refreshPlan();
      const resumeId = settingsStore.get().lastLessonId;
      const quests = syncChallenges(false);
      checkAchievements();
      const fresh = new Set(freshQuests);
      freshQuests.clear();
      today.render({
        challenges: quests.challenges,
        month: quests.month,
        fresh,
        streak: progress.streak(),
        todayMs: progress.todayMs(),
        goalMinutes: settingsStore.get().dailyGoalMinutes,
        dueCount: progress.dueIds().filter((id) => lessonsById.has(id)).length,
        plan,
        resume: resumeId ? lessonsById.get(resumeId) ?? null : null
      });
    } else if (screen === 'progress') {
      const current = syncChallenges(false).month;
      const view = progress.view(lessons);
      dashboard.render(view, settingsStore.get().dailyGoalMinutes, lessonsById, {
        earned: new Set(challenges.medals()),
        current
      }, checkAchievements(currentAchievements(view)));
      void sheets.listSheets().then((list) => {
        if (screen === 'progress') dashboard.renderSheets(list);
      });
    }
  }

  // ---------------------------------------------------------------- Pantallas (con historial: el botón atrás funciona)
  const courseHome = byId('course-home');
  const canvasWrapper = byId('canvas-wrapper');
  const panels: Record<Exclude<Screen, 'studio'>, HTMLElement> = {
    home: byId('lessons-panel'),
    progress: byId('progress-panel'),
    settings: byId('settings-panel')
  };
  const menu: Record<Exclude<Screen, 'studio'>, HTMLButtonElement> = {
    home: byId<HTMLButtonElement>('menu-lessons'),
    progress: byId<HTMLButtonElement>('menu-progress'),
    settings: byId<HTMLButtonElement>('menu-settings')
  };

  function routeFromHash(): { screen: Screen; lesson?: Lesson } {
    const hash = decodeURIComponent(location.hash.replace(/^#\/?/, ''));
    if (hash === 'progreso') return { screen: 'progress' };
    if (hash === 'ajustes') return { screen: 'settings' };
    if (hash.startsWith('leccion/')) {
      const lesson = lessonsById.get(hash.slice('leccion/'.length));
      if (lesson) return { screen: 'studio', lesson };
    }
    return { screen: 'home' };
  }

  function go(target: Screen, lesson?: Lesson): void {
    const hash = target === 'progress' ? '#/progreso' : target === 'settings' ? '#/ajustes' : target === 'studio' && lesson ? `#/leccion/${encodeURIComponent(lesson.id)}` : '#/';
    if (location.hash === hash) applyRoute();
    else location.hash = hash;
  }

  function applyRoute(): void {
    const route = routeFromHash();
    scoreModal.hide();
    finish.hide();
    if (route.screen === 'studio' && route.lesson) {
      openStudio(route.lesson);
      return;
    }
    if (screen === 'studio') studio.leave();
    screen = route.screen;
    document.body.classList.remove('is-notebook');
    courseHome.hidden = false;
    canvasWrapper.hidden = true;
    for (const key of Object.keys(panels) as Array<keyof typeof panels>) {
      panels[key].hidden = key !== screen;
      menu[key].classList.toggle('is-open', key === screen);
      menu[key].setAttribute('aria-current', key === screen ? 'page' : 'false');
    }
    if (screen === 'settings') settingsPanel.render();
    publishProgress();
  }

  function openStudio(lesson: Lesson): void {
    screen = 'studio';
    document.body.classList.add('is-notebook');
    courseHome.hidden = true;
    canvasWrapper.hidden = false;
    for (const key of Object.keys(menu) as Array<keyof typeof menu>) {
      menu[key].classList.remove('is-open');
      menu[key].setAttribute('aria-current', 'false');
    }
    if (settingsStore.get().lastLessonId !== lesson.id) settingsStore.set({ lastLessonId: lesson.id });
    catalog.focus(lesson);
    studio.resize();
    // Abrir espera un frame para que la hoja ya tenga su tamaño real.
    requestAnimationFrame(() => void studio.open(lesson));
  }

  window.addEventListener('hashchange', applyRoute);
  menu.home.addEventListener('click', () => go('home'));
  menu.progress.addEventListener('click', () => go('progress'));
  menu.settings.addEventListener('click', () => go('settings'));
  byId('back-home').addEventListener('click', () => go('home'));

  catalog.onSelect = (lesson) => go('studio', lesson);
  today.onOpen = (lesson) => go('studio', lesson);
  dashboard.onOpenLesson = (lesson) => go('studio', lesson);
  studio.masteryOf = (lesson) => masteryLevel(progress.get(lesson.id));
  studio.onScriptChange = (sheetScript) => settingsStore.set({ sheetScript });
  dashboard.onDeleteSheets = (lessonId) => {
    void sheets.deleteLessonSheets(lessonId).then(() => sheets.listSheets()).then((list) => {
      if (screen === 'progress') dashboard.renderSheets(list);
    });
  };
  dashboard.onOpenGroup = (category, group) => {
    catalog.showGroup(category, group);
    go('home');
  };

  // ---------------------------------------------------------------- Resultados
  function reviewStatus(lesson: Lesson): string {
    const record = progress.get(lesson.id);
    const level = MASTERY_LABELS[masteryLevel(record)];
    if (!record?.dueAt) return level;
    const days = Math.round((record.dueAt - Date.now()) / 86_400_000);
    const when = days <= 0 ? 'hoy' : days === 1 ? 'mañana' : `en ${days} días`;
    return `${level} · próximo repaso ${when}`;
  }

  studio.onScored = (lesson, result, snapshot) => {
    progress.recordReview(lesson, result.score);
    refreshPlan();
    syncChallenges(true);
    checkAchievements();
    if (result.score > 0) {
      const thumb = snapshot.toDataURL('image/webp', 0.72);
      void sheets.saveSheet({ lessonId: lesson.id, title: lesson.title, at: Date.now(), score: result.score, thumb });
    }
    const next = result.score >= PASSING_SCORE ? lessonNext(lesson) : null;
    scoreModal.onNext = next ? () => go('studio', next) : undefined;
    scoreModal.show(result, reviewStatus(lesson), next?.title ?? null);
  };
  scoreModal.onDownload = () => {
    const lesson = studio.current();
    const canvas = studio.ink.snapshot(2400);
    const a = document.createElement('a');
    a.href = canvas.toDataURL('image/png');
    a.download = `calligraphy-${(lesson?.title ?? 'hoja').replace(/[^\p{L}\p{N}]+/gu, '-').slice(0, 40)}-${new Date().toISOString().slice(0, 10)}.png`;
    a.click();
  };
  scoreModal.onRetry = () => {
    const lesson = studio.current();
    if (lesson) void studio.open(lesson);
  };

  studio.onStepsCompleted = (info) => {
    progress.recordReview(info.lesson, null);
    refreshPlan();
    syncChallenges(true);
    checkAchievements();
    const next = lessonNext(info.lesson);
    finish.onNext = next ? () => go('studio', next) : undefined;
    finish.show({ title: info.lesson.title, elapsedMs: info.elapsedMs, averagePressure: info.averagePressure, nextTitle: next?.title ?? null });
  };
  finish.onHome = () => go('home');
  finish.onStay = () => undefined;

  studio.onStepProgress = (lesson, done, total) => progress.record(lesson, { practiced: true, stepsDone: done, stepsTotal: total });
  studio.onPracticed = (lesson) => {
    if (!progress.practicedToday(lesson.id) || !progress.get(lesson.id)?.practiced) progress.record(lesson, { practiced: true });
  };
  studio.onActivity = (lesson, ms, strokes) => {
    progress.addActivity(lesson.id, ms, strokes);
    syncChallenges(true);
  };
  studio.onPenSeen = () => {
    if (!settingsStore.get().penSeen) settingsStore.set({ penSeen: true });
  };

  // ---------------------------------------------------------------- Ajustes
  function applyTheme(next: ThemeChoice): void {
    const before = theme;
    theme = next;
    document.documentElement.dataset.theme = next;
    kv.setItem(THEME_KEY, next);
    if (themeMeta) themeMeta.content = PAPER_BY_THEME[next];
    const custom = settingsStore.get().inkColor;
    if (!custom) {
      studio.setInkColor(INK_BY_THEME[next]);
      studio.ink.recolor((color) => (color.toLowerCase() === INK_BY_THEME[before] ? INK_BY_THEME[next] : null));
    }
    studio.ink.redrawAll();
    settingsPreview.setInkColor(custom || INK_BY_THEME[next]);
    settingsPanel.setTheme(next);
  }

  settingsPanel.onTheme = applyTheme;
  settingsStore.onChange((settings) => {
    studio.applySettings(settings);
    settingsPreview.update(settings);
    catalog.setScripts(settings.scripts);
    const texts = settings.customTexts.join('\n');
    if (texts !== lessons.filter((lesson) => lesson.custom).map((lesson) => lesson.characterOrWord).join('\n')) {
      lessons = allLessons(settings.customTexts);
      lessonsById = new Map(lessons.map((lesson) => [lesson.id, lesson]));
      catalog.setLessons(lessons);
    }
    publishProgress();
  });
  byId<HTMLInputElement>('ink-color').addEventListener('change', (event) => {
    settingsStore.set({ inkColor: (event.target as HTMLInputElement).value });
  });

  // ---------------------------------------------------------------- Respaldo
  async function handleExport(): Promise<void> {
    const payload = {
      app: 'calligraphy',
      version: 2,
      exportedAt: new Date().toISOString(),
      progress: progress.exportData(),
      challenges: challenges.exportData(),
      settings: settingsStore.get(),
      theme,
      sheets: (await sheets.listSheets()).map(({ id: _id, ...sheet }) => sheet)
    };
    const blob = new Blob([JSON.stringify(payload, null, 1)], { type: 'application/json' });
    const url = URL.createObjectURL(blob);
    const a = document.createElement('a');
    a.href = url;
    a.download = `calligraphy-respaldo-${new Date().toISOString().slice(0, 10)}.json`;
    a.click();
    setTimeout(() => URL.revokeObjectURL(url), 1000);
  }

  function handleImport(): void {
    const input = document.createElement('input');
    input.type = 'file';
    input.accept = 'application/json,.json';
    input.onchange = async () => {
      const file = input.files?.[0];
      if (!file) return;
      let data: unknown;
      try {
        data = JSON.parse(await file.text());
      } catch {
        toast('El archivo no es un respaldo válido.', 'error');
        return;
      }
      const wrapped = data && typeof data === 'object' && (data as { app?: string }).app === 'calligraphy';
      const body = data as { progress?: unknown; settings?: unknown; theme?: unknown; sheets?: unknown; challenges?: unknown };
      const result = progress.importData(wrapped ? body.progress : data);
      if (!result.ok) {
        toast('El archivo no es un respaldo válido.', 'error');
        return;
      }
      if (wrapped && body.challenges) challenges.importData(body.challenges);
      if (wrapped && body.settings) settingsStore.replace({ ...settingsStore.get(), ...(body.settings as object), penSeen: settingsStore.get().penSeen });
      if (wrapped && (body.theme === 'light' || body.theme === 'dark')) applyTheme(body.theme);
      let sheetCount = 0;
      if (wrapped && Array.isArray(body.sheets)) {
        const known = new Set((await sheets.listSheets()).map((sheet) => `${sheet.lessonId}@${sheet.at}`));
        for (const raw of body.sheets as Array<Record<string, unknown>>) {
          const valid = typeof raw?.lessonId === 'string' && typeof raw.title === 'string' && Number.isFinite(raw.at) &&
            Number.isFinite(raw.score) && typeof raw.thumb === 'string' && raw.thumb.startsWith('data:image/');
          if (!valid || known.has(`${raw.lessonId}@${raw.at}`)) continue;
          await sheets.saveSheet({ lessonId: raw.lessonId as string, title: raw.title as string, at: raw.at as number, score: raw.score as number, thumb: raw.thumb as string });
          sheetCount += 1;
        }
      }
      toast(`Respaldo importado: ${result.lessons} lecciones, ${result.days} días y ${sheetCount} hojas.`);
      publishProgress();
    };
    input.click();
  }

  async function handleClear(): Promise<void> {
    if (!confirm('¿Borrar todo el progreso, las hojas guardadas y los ajustes de este dispositivo? No se puede deshacer.')) return;
    progress.clearAll();
    challenges.clearAll();
    achievementStore.clearAll();
    await sheets.clearAll();
    settingsStore.replace(DEFAULT_SETTINGS);
    publishProgress();
  }

  settingsPanel.onExport = () => void handleExport();
  settingsPanel.onImport = handleImport;
  settingsPanel.onClear = () => void handleClear();
  dashboard.onExport = () => void handleExport();
  dashboard.onImport = handleImport;

  settingsPanel.onOfflineStatus = offlineStatus;
  settingsPanel.onOfflineDownload = downloadOffline;

  // ---------------------------------------------------------------- Recordatorio diario
  let reminderTimer = 0;
  function scheduleReminder(time: string | null): void {
    window.clearTimeout(reminderTimer);
    if (!time) return;
    const [hours, minutes] = time.split(':').map(Number);
    const target = new Date();
    target.setHours(hours, minutes, 0, 0);
    if (target.getTime() <= Date.now()) target.setDate(target.getDate() + 1);
    reminderTimer = window.setTimeout(() => {
      if (progress.todayMs() < 60_000 && 'Notification' in window && Notification.permission === 'granted') {
        void swReady()?.then((registration) =>
          registration.active?.postMessage({ type: 'remind', body: `Racha de ${progress.streak()} días. Unos minutos bastan para no perderla.` })
        );
      }
      scheduleReminder(settingsStore.get().reminderTime);
    }, target.getTime() - Date.now());
  }
  function swReady(): Promise<ServiceWorkerRegistration> | null {
    return 'serviceWorker' in window.navigator ? window.navigator.serviceWorker.ready : null;
  }
  settingsPanel.onReminder = (time) => {
    if (time && 'Notification' in window && Notification.permission === 'default') void Notification.requestPermission();
    scheduleReminder(time);
  };

  // ---------------------------------------------------------------- Instalación
  const installButton = byId<HTMLButtonElement>('btn-install');
  let installPrompt: (Event & { prompt: () => Promise<void> }) | null = null;
  window.addEventListener('beforeinstallprompt', (event) => {
    event.preventDefault();
    installPrompt = event as Event & { prompt: () => Promise<void> };
    installButton.hidden = false;
  });
  installButton.addEventListener('click', () => {
    void installPrompt?.prompt();
    installPrompt = null;
    installButton.hidden = true;
  });

  // ---------------------------------------------------------------- Guardado al salir
  document.addEventListener('visibilitychange', () => {
    if (document.visibilityState === 'hidden') progress.flush();
    else publishProgress();
  });
  window.addEventListener('pagehide', () => progress.flush());

  // Pide al navegador que no purgue los datos de práctica cuando falte espacio.
  void window.navigator.storage?.persist?.().catch(() => false);

  if (import.meta.env.PROD && 'serviceWorker' in window.navigator) {
    window.navigator.serviceWorker.register(`${import.meta.env.BASE_URL}sw.js`).catch(() => undefined);
  }

  // ---------------------------------------------------------------- Arranque
  const initial = settingsStore.get();
  studio.applySettings(initial);
  catalog.setScripts(initial.scripts);
  settingsPreview.setInkColor(initial.inkColor || INK_BY_THEME[theme]);
  settingsPreview.update(initial);
  applyTheme(theme);
  if (initial.inkColor) studio.setInkColor(initial.inkColor);
  const last = initial.lastLessonId ? lessonsById.get(initial.lastLessonId) : undefined;
  if (last) catalog.focus(last);
  scheduleReminder(initial.reminderTime);
  applyRoute();
});
