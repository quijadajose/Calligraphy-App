import { describe, expect, it } from 'vitest';
import { MemoryStore } from '../src/core/storage/safeStorage';
import { ChallengeStore, DayActivity, monthTarget, pickChallenges } from '../src/core/challenges/Challenges';

const idle = (extra: Partial<DayActivity> = {}): DayActivity => ({
  ms: 0,
  strokes: 0,
  lessonsPracticed: 0,
  scores: [],
  reviews: { done: 0, total: 3 },
  fresh: { done: 0, total: 2 },
  session: { done: 0, total: 6 },
  goalMinutes: 10,
  ...extra
});

const busy = (): DayActivity =>
  idle({
    ms: 3_600_000,
    strokes: 500,
    lessonsPracticed: 8,
    scores: [95, 92, 88, 85],
    reviews: { done: 3, total: 3 },
    fresh: { done: 2, total: 2 },
    session: { done: 6, total: 6 }
  });

describe('Desafíos', () => {
  it('cada día da tres desafíos: constancia, calidad y contenido', () => {
    const picks = pickChallenges('2026-10-04', idle());
    expect(picks).toHaveLength(3);
    expect(['minutes', 'strokes']).toContain(picks[0].kind);
    expect(['scores80', 'score90']).toContain(picks[1].kind);
    expect(['lessons', 'reviews', 'fresh', 'session']).toContain(picks[2].kind);
    expect(pickChallenges('2026-10-04', idle())).toEqual(picks);
  });

  it('los desafíos del día no cambian aunque cambie el plan', () => {
    const store = new ChallengeStore(new MemoryStore());
    const first = store.sync('2026-10-04', idle()).challenges.map((c) => c.kind);
    const later = store.sync('2026-10-04', idle({ reviews: { done: 0, total: 0 } })).challenges.map((c) => c.kind);
    expect(later).toEqual(first);
  });

  it('avisa una sola vez al completar y lo recuerda', () => {
    const kv = new MemoryStore();
    const store = new ChallengeStore(kv);
    expect(store.sync('2026-10-04', idle()).completed).toHaveLength(0);
    const result = store.sync('2026-10-04', busy());
    expect(result.completed).toHaveLength(3);
    expect(result.challenges.every((c) => c.done)).toBe(true);
    expect(store.sync('2026-10-04', busy()).completed).toHaveLength(0);
    // Otro arranque de la app lee lo guardado.
    const again = new ChallengeStore(kv);
    expect(again.sync('2026-10-04', idle()).challenges.every((c) => c.done)).toBe(true);
  });

  it('la medalla del mes llega al alcanzar la meta', () => {
    const store = new ChallengeStore(new MemoryStore());
    const target = monthTarget(2026, 9);
    expect(target).toBe(47);
    let earned = 0;
    for (let day = 1; day <= 16; day++) {
      const key = `2026-10-${String(day).padStart(2, '0')}`;
      const result = store.sync(key, busy());
      if (result.medalEarned) earned += 1;
    }
    const status = store.monthStatus('2026-10-16');
    expect(status.count).toBe(48);
    expect(status.earned).toBe(true);
    expect(earned).toBe(1);
    expect(store.medals()).toEqual(['2026-10']);
    expect(store.monthStatus('2026-11-01').count).toBe(0);
  });

  it('importar un respaldo suma lo completado sin duplicar', () => {
    const a = new ChallengeStore(new MemoryStore());
    a.sync('2026-10-04', busy());
    const b = new ChallengeStore(new MemoryStore());
    b.importData(a.exportData());
    b.importData(a.exportData());
    expect(b.monthStatus('2026-10-04').count).toBe(3);
    b.importData({ days: { basura: 1, '2026-10-05': { picked: 'x', done: ['nada'] } } });
    expect(b.monthStatus('2026-10-05').count).toBe(3);
  });
});
