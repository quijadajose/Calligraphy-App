import { PALMER_GROUPS } from '../../data/lessons';
import { Lesson } from '../../types/ink';

const STORAGE_KEY = 'calligraphy-progress';
const PASSING_SCORE = 70;

export interface LessonProgress {
  practiced: boolean;
  stepsDone: number;
  stepsTotal: number;
  complete: boolean;
  bestScore: number | null;
  updatedAt: number;
}

export interface ProgressUpdate {
  practiced?: boolean;
  stepsDone?: number;
  stepsTotal?: number;
  complete?: boolean;
  bestScore?: number;
}

export interface GroupStat {
  id: string;
  label: string;
  category: 'palmer' | 'japanese';
  total: number;
  complete: number;
  started: number;
}

export interface ProgressView {
  total: number;
  complete: number;
  started: number;
  averageScore: number | null;
  sections: { title: string; groups: GroupStat[] }[];
  recent: { lesson: Lesson; record: LessonProgress }[];
}

const JAPANESE_GROUPS = ['Hiragana', 'Katakana', 'N5', 'N4', 'N3', 'N2', 'N1', 'Dictado'];

export class ProgressStore {
  private records = new Map<string, LessonProgress>();

  constructor() {
    this.load();
  }

  public record(lesson: Lesson, update: ProgressUpdate): void {
    const current = this.records.get(lesson.id) ?? {
      practiced: false,
      stepsDone: 0,
      stepsTotal: lesson.steps?.length ?? 0,
      complete: false,
      bestScore: null,
      updatedAt: 0
    };
    const stepsTotal = update.stepsTotal ?? current.stepsTotal;
    const stepsDone = Math.max(current.stepsDone, update.stepsDone ?? 0);
    const bestScore =
      update.bestScore == null ? current.bestScore : Math.max(current.bestScore ?? 0, Math.round(update.bestScore));
    const complete =
      current.complete ||
      update.complete === true ||
      (stepsTotal > 0 && stepsDone >= stepsTotal) ||
      (bestScore != null && bestScore >= PASSING_SCORE);
    this.records.set(lesson.id, {
      practiced: current.practiced || update.practiced === true || complete,
      stepsDone,
      stepsTotal,
      complete,
      bestScore,
      updatedAt: Date.now()
    });
    this.save();
  }

  public get(id: string): LessonProgress | undefined {
    return this.records.get(id);
  }

  public completedIds(): string[] {
    return [...this.records.entries()].filter(([, record]) => record.complete).map(([id]) => id);
  }

  public startedIds(): string[] {
    return [...this.records.entries()]
      .filter(([, record]) => record.practiced && !record.complete)
      .map(([id]) => id);
  }

  public view(lessons: Lesson[]): ProgressView {
    const byId = new Map(lessons.map((lesson) => [lesson.id, lesson]));
    const sections = [
      { title: 'Palmer', groups: this.groups(lessons, 'palmer', PALMER_GROUPS) },
      { title: 'Japonés', groups: this.groups(lessons, 'japanese', JAPANESE_GROUPS) }
    ];
    const scored = [...this.records.values()].filter((record) => record.bestScore != null);
    const averageScore = scored.length
      ? Math.round(scored.reduce((sum, record) => sum + (record.bestScore ?? 0), 0) / scored.length)
      : null;
    const recent = [...this.records.entries()]
      .filter(([, record]) => record.practiced)
      .sort((a, b) => b[1].updatedAt - a[1].updatedAt)
      .flatMap(([id, record]) => {
        const lesson = byId.get(id);
        return lesson ? [{ lesson, record }] : [];
      })
      .slice(0, 6);
    return {
      total: lessons.length,
      complete: lessons.filter((lesson) => this.records.get(lesson.id)?.complete).length,
      started: lessons.filter((lesson) => {
        const record = this.records.get(lesson.id);
        return record?.practiced && !record.complete;
      }).length,
      averageScore,
      sections,
      recent
    };
  }

  private groups(lessons: Lesson[], category: 'palmer' | 'japanese', order: string[]): GroupStat[] {
    return order.map((id) => {
      const members = lessons.filter((lesson) => lesson.category === category && lesson.group === id);
      let complete = 0;
      let started = 0;
      for (const lesson of members) {
        const record = this.records.get(lesson.id);
        if (record?.complete) complete += 1;
        else if (record?.practiced) started += 1;
      }
      return { id, label: id, category, total: members.length, complete, started };
    });
  }

  private load(): void {
    try {
      const raw = localStorage.getItem(STORAGE_KEY);
      if (!raw) return;
      const parsed = JSON.parse(raw) as Record<string, LessonProgress>;
      for (const [id, record] of Object.entries(parsed)) {
        if (!record || typeof record !== 'object') continue;
        this.records.set(id, {
          practiced: Boolean(record.practiced),
          stepsDone: Number(record.stepsDone) || 0,
          stepsTotal: Number(record.stepsTotal) || 0,
          complete: Boolean(record.complete),
          bestScore: record.bestScore == null ? null : Number(record.bestScore),
          updatedAt: Number(record.updatedAt) || 0
        });
      }
    } catch {
      this.records.clear();
    }
  }

  private save(): void {
    const payload: Record<string, LessonProgress> = {};
    for (const [id, record] of this.records) payload[id] = record;
    localStorage.setItem(STORAGE_KEY, JSON.stringify(payload));
  }
}
