import { describe, expect, it } from 'vitest';
import { MemoryStore } from '../src/core/storage/safeStorage';
import { PASSING_SCORE, ProgressStore, masteryLevel, nextInterval } from '../src/core/progress/ProgressStore';
import { buildDailyPlan, nextLesson, planaFor } from '../src/core/daily/DailyPlan';
import { sanitizeSettings } from '../src/core/settings/SettingsStore';
import { LESSONS } from '../src/data/lessons';
import { Lesson } from '../src/types/ink';

const DAY = 86_400_000;
const lesson = (id: string, extra: Partial<Lesson> = {}): Lesson => ({
  id,
  category: 'palmer',
  group: 'Minúsculas',
  title: id,
  subTitle: '',
  instructions: '',
  characterOrWord: id,
  recommendedTool: 'fountain',
  suggestedGrid: 'palmer',
  ...extra
});

function clock(start = new Date(2026, 9, 1, 10).getTime()) {
  let now = start;
  return { now: () => now, advance: (days: number) => (now += days * DAY) };
}

describe('ProgressStore', () => {
  it('aprobar no es para siempre: el repaso vuelve con el tiempo', () => {
    const time = clock();
    const store = new ProgressStore(new MemoryStore(), time.now);
    const a = lesson('a');
    store.recordReview(a, 90);
    expect(store.get('a')?.complete).toBe(true);
    expect(store.dueIds()).toEqual([]);
    time.advance(1);
    expect(store.dueIds()).toEqual(['a']);
    store.recordReview(a, 40);
    expect(store.get('a')?.reps).toBe(0);
    expect(store.dueIds()).toEqual(['a']);
  });

  it('el intervalo crece con repasos aprobados y la nota', () => {
    expect(nextInterval(1, 0, 80)).toBe(1);
    expect(nextInterval(2, 1, 80)).toBe(3);
    expect(nextInterval(3, 3, 100)).toBeGreaterThan(nextInterval(3, 3, PASSING_SCORE));
    expect(nextInterval(5, 10, 50)).toBe(0);
  });

  it('varios intentos el mismo día cuentan como un repaso', () => {
    const time = clock();
    const store = new ProgressStore(new MemoryStore(), time.now);
    const a = lesson('a');
    store.recordReview(a, 90);
    store.recordReview(a, 95);
    expect(store.get('a')?.reps).toBe(1);
    expect(store.get('a')?.scores.map((s) => s.score)).toEqual([90, 95]);
  });

  it('la racha cuenta días seguidos y sobrevive si hoy aún no hay práctica', () => {
    const time = clock();
    const store = new ProgressStore(new MemoryStore(), time.now);
    store.record(lesson('a'), { practiced: true });
    time.advance(1);
    store.record(lesson('b'), { practiced: true });
    expect(store.streak()).toBe(2);
    time.advance(1);
    expect(store.streak()).toBe(2);
    time.advance(1);
    expect(store.streak()).toBe(0);
  });

  it('lee el formato plano de la versión 1 y programa el primer repaso', () => {
    const kv = new MemoryStore();
    kv.setItem('calligraphy-progress', JSON.stringify({ a: { practiced: true, complete: true, bestScore: 88, updatedAt: 1000 } }));
    const store = new ProgressStore(kv);
    const record = store.get('a');
    expect(record?.reps).toBe(1);
    expect(record?.dueAt).not.toBeNull();
    expect(masteryLevel(record)).toBe(2);
  });

  it('importar mezcla y conserva el registro más reciente', () => {
    const time = clock();
    const store = new ProgressStore(new MemoryStore(), time.now);
    store.recordReview(lesson('a'), 75);
    const backup = store.exportData();
    const other = new ProgressStore(new MemoryStore(), time.now);
    time.advance(1);
    other.recordReview(lesson('a'), 95);
    const result = other.importData(backup);
    expect(result.ok).toBe(true);
    expect(other.get('a')?.lastScore).toBe(95);
    expect(other.importData('basura').ok).toBe(false);
  });

  it('suma tiempo de práctica al día', () => {
    const store = new ProgressStore(new MemoryStore());
    store.addActivity('a', 1500, 1);
    store.addActivity('a', 500, 1);
    expect(store.todayMs()).toBe(2000);
  });
});

describe('Plan del día', () => {
  it('trae calentamiento, repasos pendientes, dos nuevas y una plana', () => {
    const time = clock();
    const store = new ProgressStore(new MemoryStore(), time.now);
    const reviewed = LESSONS.find((l) => l.group === 'Ligada')!;
    store.recordReview(reviewed, 90);
    time.advance(2);
    const plan = buildDailyPlan(LESSONS, store, reviewed.id, time.now());
    const kinds = plan.map((item) => item.kind);
    expect(kinds[0]).toBe('warmup');
    expect(plan.some((item) => item.kind === 'review' && item.lesson.id === reviewed.id)).toBe(true);
    expect(kinds.filter((kind) => kind === 'new').length).toBe(2);
    expect(kinds).toContain('sheet');
    expect(nextLesson(LESSONS, plan, plan[0].lesson)?.id).toBe(plan[1].lesson.id);
  });
});

describe('Ajustes', () => {
  it('corrige valores fuera de rango', () => {
    const s = sanitizeSettings({ tool: 'láser', dailyGoalMinutes: 999, reminderTime: '25:00', dockSide: 'right', customTexts: ['hola', '', 3] });
    expect(s.tool).toBe('auto');
    expect(s.dailyGoalMinutes).toBe(120);
    expect(s.reminderTime).toBeNull();
    expect(s.dockSide).toBe('right');
    expect(s.customTexts).toEqual(['hola']);
  });
});

describe('Datos', () => {
  it('los ids de lección son únicos', () => {
    const ids = LESSONS.map((l) => l.id);
    expect(new Set(ids).size).toBe(ids.length);
  });

  it('cada grupo del catálogo tiene lecciones', () => {
    const groups = new Set(LESSONS.map((l) => l.group));
    for (const name of ['Enlaces', 'Vocabulario', 'Hiragana', 'Katakana', 'N5']) expect(groups.has(name)).toBe(true);
  });
});

describe('Planas de la ligada', () => {
  const byId = (id: string) => LESSONS.find((lesson) => lesson.id === id) as Lesson;

  it('cada letra tiene su plana', () => {
    expect(planaFor(LESSONS, byId('ligada-minus-a'))?.id).toBe('plana-a');
    expect(planaFor(LESSONS, byId('ligada-mayus-B'))?.id).toBe('plana-B');
    expect(planaFor(LESSONS, byId('imprenta-minus-a'))).toBeUndefined();
  });

  it('letra → su plana → siguiente letra', () => {
    expect(nextLesson(LESSONS, [], byId('ligada-minus-a'))?.id).toBe('plana-a');
    expect(nextLesson(LESSONS, [], byId('plana-a'))?.id).toBe('ligada-minus-b');
    expect(nextLesson(LESSONS, [], byId('imprenta-minus-a'))?.id).toBe('imprenta-minus-b');
  });

  it('una letra nueva en la sesión trae su plana justo detrás', () => {
    const time = clock();
    const store = new ProgressStore(new MemoryStore(), time.now);
    const plan = buildDailyPlan(LESSONS, store, 'ligada-minus-a', time.now());
    const index = plan.findIndex((item) => item.kind === 'new' && item.lesson.id === 'ligada-minus-a');
    expect(index).toBeGreaterThan(-1);
    expect(plan[index + 1]?.lesson.id).toBe('plana-a');
  });
});


describe('Imprenta', () => {
  const print = LESSONS.filter((lesson) => lesson.group === 'Imprenta');

  it('tiene minúsculas y mayúsculas rectas, con ids únicos', () => {
    expect(print.length).toBe(54);
    for (const style of ['Ligada', 'Itálica', 'Copperplate']) {
      const letters = LESSONS.filter((lesson) => lesson.group === style);
      expect(letters.length).toBe(54);
      expect(letters.every((lesson) => (lesson.slant ?? 0) > 0 && lesson.slant! < 90)).toBe(true);
    }
    expect(print.every((lesson) => lesson.upright && (lesson.steps?.length ?? 0) > 0)).toBe(true);
    expect(new Set(LESSONS.map((lesson) => lesson.id)).size).toBe(LESSONS.length);
  });

  it('la inclinación de imprenta es vertical y la cursiva vuelve a inclinarse', async () => {
    const { mapPalmerPoint, palmerRowGeometry, setScriptSlant, CURSIVE_SLANT_DEG } = await import('../src/core/engine/gridMetrics');
    const row = palmerRowGeometry(0, 800);
    setScriptSlant(90);
    const top = mapPalmerPoint({ x: 0.5, y: 0.1 }, 0, row);
    const bottom = mapPalmerPoint({ x: 0.5, y: 0.7 }, 0, row);
    expect(top.x).toBeCloseTo(bottom.x);
    setScriptSlant(CURSIVE_SLANT_DEG);
    expect(mapPalmerPoint({ x: 0.5, y: 0.1 }, 0, row).x).toBeGreaterThan(mapPalmerPoint({ x: 0.5, y: 0.7 }, 0, row).x);
  });
});
