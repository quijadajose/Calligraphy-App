import { describe, expect, it } from 'vitest';
import { MemoryStore } from '../src/core/storage/safeStorage';
import { AchievementInput, AchievementStore, evaluateAchievements } from '../src/core/achievements/Achievements';
import { ProgressStore } from '../src/core/progress/ProgressStore';
import { Lesson } from '../src/types/ink';

const base = (extra: Partial<AchievementInput> = {}): AchievementInput => ({
  longestStreak: 0,
  strokes: 0,
  minutes: 0,
  highScores: 0,
  challenges: 0,
  medals: 0,
  earlyDays: 0,
  lateDays: 0,
  groups: { Hiragana: { complete: 0, total: 71 } },
  ...extra
});

const find = (input: AchievementInput, id: string) => evaluateAchievements(input).find((a) => a.id === id)!;

describe('Logros', () => {
  it('el nivel sube al cruzar cada meta', () => {
    expect(find(base({ longestStreak: 2 }), 'streak').level).toBe(0);
    const week = find(base({ longestStreak: 7 }), 'streak');
    expect(week.level).toBe(2);
    expect(week.next).toBe(14);
    expect(week.description).toBe('Practica 14 días seguidos');
  });

  it('los grupos van por cuartos hasta completarse', () => {
    expect(find(base({ groups: { Hiragana: { complete: 18, total: 71 } } }), 'hiragana').level).toBe(1);
    const done = find(base({ groups: { Hiragana: { complete: 71, total: 71 } } }), 'hiragana');
    expect(done.level).toBe(done.maxLevel);
    expect(done.next).toBeNull();
    expect(done.description).toBe('Completa el hiragana (71)');
    // Un grupo que no existe en el curso no aparece.
    expect(evaluateAchievements(base()).some((a) => a.id === 'n1')).toBe(false);
  });

  it('avisa solo de lo nuevo, y no la primera vez', () => {
    const store = new AchievementStore(new MemoryStore());
    expect(store.update(evaluateAchievements(base({ strokes: 600 })))).toEqual([]);
    expect(store.update(evaluateAchievements(base({ strokes: 700 })))).toEqual([]);
    const up = store.update(evaluateAchievements(base({ strokes: 2500 })));
    expect(up.map((a) => a.id)).toEqual(['strokes']);
    expect(up[0].level).toBe(3);
  });

  it('la racha más larga cuenta días seguidos del calendario', () => {
    let now = new Date(2026, 9, 1, 10).getTime();
    const progress = new ProgressStore(new MemoryStore(), () => now);
    const lesson = { id: 'a', category: 'palmer', group: 'Minúsculas', title: 'a', subTitle: '', instructions: '', characterOrWord: 'a', recommendedTool: 'fountain', suggestedGrid: 'palmer' } as Lesson;
    for (const gap of [0, 1, 1, 1, 3, 1]) {
      now += gap * 86_400_000;
      progress.recordReview(lesson, 96);
    }
    const life = progress.lifetime();
    expect(life.longestStreak).toBe(4);
    expect(life.highScores).toBe(1);
  });
});
