import { JAPANESE_GROUPS, PALMER_GROUPS } from '../../data/groups';
import { Lesson } from '../../types/ink';
import { KeyValueStore, readJSON, writeJSON } from '../storage/safeStorage';

const STORAGE_KEY = 'calligraphy-progress';
const SCHEMA_VERSION = 2;
const SCORE_HISTORY = 12;
const DAY_MS = 86_400_000;

/** Nota a partir de la cual una lección se da por aprobada. Única fuente de este umbral. */
export const PASSING_SCORE = 70;

export interface ScoreEntry {
  at: number;
  score: number;
}

export interface LessonProgress {
  practiced: boolean;
  stepsDone: number;
  stepsTotal: number;
  /** Se aprobó al menos una vez. El repaso lo decide `dueAt`. */
  complete: boolean;
  bestScore: number | null;
  lastScore: number | null;
  scores: ScoreEntry[];
  /** Repasos aprobados seguidos. */
  reps: number;
  intervalDays: number;
  dueAt: number | null;
  updatedAt: number;
}

export interface ProgressUpdate {
  practiced?: boolean;
  stepsDone?: number;
  stepsTotal?: number;
  complete?: boolean;
}

export interface DayLog {
  /** Tiempo con el lápiz en marcha, en milisegundos. */
  ms: number;
  strokes: number;
  lessons: string[];
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
  streak: number;
  todayMs: number;
  totalMs: number;
  dueCount: number;
  days: { key: string; ms: number }[];
  sections: { title: string; groups: GroupStat[] }[];
  recent: { lesson: Lesson; record: LessonProgress }[];
}

interface ProgressState {
  version: number;
  lessons: Record<string, LessonProgress>;
  days: Record<string, DayLog>;
}

export interface ImportResult {
  ok: boolean;
  lessons: number;
  days: number;
}

/** Día local en formato AAAA-MM-DD. */
export function dayKey(time: number): string {
  const date = new Date(time);
  const month = String(date.getMonth() + 1).padStart(2, '0');
  const day = String(date.getDate()).padStart(2, '0');
  return `${date.getFullYear()}-${month}-${day}`;
}

function startOfDay(time: number): number {
  const date = new Date(time);
  date.setHours(0, 0, 0, 0);
  return date.getTime();
}

/**
 * Repaso espaciado: 1 día, 3 días y luego el intervalo crece con la nota.
 * Suspender devuelve la lección a hoy.
 */
export function nextInterval(reps: number, previousDays: number, score: number): number {
  if (score < PASSING_SCORE) return 0;
  if (reps <= 1) return 1;
  if (reps === 2) return 3;
  const factor = 1.6 + ((Math.min(100, score) - PASSING_SCORE) / 30) * 0.9;
  return Math.min(180, Math.max(4, Math.round(previousDays * factor)));
}

/** 0 sin empezar · 1 en curso · 2 aprendida · 3 asentada · 4 dominada. */
export function masteryLevel(record: LessonProgress | undefined): number {
  if (!record?.practiced) return 0;
  if (!record.complete) return 1;
  if (record.intervalDays >= 21) return 4;
  if (record.intervalDays >= 3) return 3;
  return 2;
}

export const MASTERY_LABELS = ['Sin empezar', 'En curso', 'Aprendida', 'Asentada', 'Dominada'];

function emptyRecord(lesson: Lesson): LessonProgress {
  return {
    practiced: false,
    stepsDone: 0,
    stepsTotal: lesson.steps?.length ?? 0,
    complete: false,
    bestScore: null,
    lastScore: null,
    scores: [],
    reps: 0,
    intervalDays: 0,
    dueAt: null,
    updatedAt: 0
  };
}

function cleanScore(value: unknown): number | null {
  if (value == null) return null;
  const parsed = Number(value);
  return Number.isFinite(parsed) ? Math.max(0, Math.min(100, Math.round(parsed))) : null;
}

function cleanRecord(input: unknown): LessonProgress | null {
  if (!input || typeof input !== 'object') return null;
  const raw = input as Record<string, unknown>;
  const scores = Array.isArray(raw.scores)
    ? raw.scores.flatMap((entry) => {
        const item = entry as { at?: unknown; score?: unknown } | null;
        const score = cleanScore(item?.score);
        const at = Number(item?.at);
        return score != null && Number.isFinite(at) ? [{ at, score }] : [];
      })
    : [];
  const dueAt = Number(raw.dueAt);
  const updatedAt = Number(raw.updatedAt) || 0;
  const complete = Boolean(raw.complete);
  const hasDue = raw.dueAt != null && Number.isFinite(dueAt);
  // Un registro de la versión 1 aprobado no trae repaso: entra con el primero pendiente.
  const legacy = complete && !hasDue;
  return {
    practiced: Boolean(raw.practiced),
    stepsDone: Math.max(0, Number(raw.stepsDone) || 0),
    stepsTotal: Math.max(0, Number(raw.stepsTotal) || 0),
    complete,
    bestScore: cleanScore(raw.bestScore),
    lastScore: cleanScore(raw.lastScore ?? raw.bestScore),
    scores: scores.slice(-SCORE_HISTORY),
    reps: legacy ? 1 : Math.max(0, Math.round(Number(raw.reps) || 0)),
    intervalDays: legacy ? 1 : Math.max(0, Number(raw.intervalDays) || 0),
    dueAt: hasDue ? dueAt : legacy ? startOfDay(updatedAt) + DAY_MS : null,
    updatedAt
  };
}

function cleanDay(input: unknown): DayLog | null {
  if (!input || typeof input !== 'object') return null;
  const raw = input as Record<string, unknown>;
  return {
    ms: Math.max(0, Number(raw.ms) || 0),
    strokes: Math.max(0, Math.round(Number(raw.strokes) || 0)),
    lessons: Array.isArray(raw.lessons) ? raw.lessons.filter((id): id is string => typeof id === 'string') : []
  };
}

/** Lee el formato actual y el plano de la versión 1 (un registro por id, sin `version`). */
function parseState(input: unknown): ProgressState | null {
  if (!input || typeof input !== 'object' || Array.isArray(input)) return null;
  const raw = input as Record<string, unknown>;
  const versioned = typeof raw.version === 'number' && raw.lessons && typeof raw.lessons === 'object';
  const lessonSource = (versioned ? raw.lessons : raw) as Record<string, unknown>;
  const lessons: Record<string, LessonProgress> = {};
  for (const [id, record] of Object.entries(lessonSource)) {
    const clean = cleanRecord(record);
    if (clean) lessons[id] = clean;
  }
  const days: Record<string, DayLog> = {};
  if (versioned && raw.days && typeof raw.days === 'object') {
    for (const [key, log] of Object.entries(raw.days as Record<string, unknown>)) {
      const clean = cleanDay(log);
      if (clean && /^\d{4}-\d{2}-\d{2}$/.test(key)) days[key] = clean;
    }
  }
  if (!versioned && Object.keys(lessons).length === 0 && Object.keys(raw).length > 0) return null;
  return { version: SCHEMA_VERSION, lessons, days };
}

export class ProgressStore {
  private lessons = new Map<string, LessonProgress>();
  private days = new Map<string, DayLog>();
  private saveTimer: ReturnType<typeof setTimeout> | null = null;

  constructor(
    private store: KeyValueStore,
    private now: () => number = Date.now
  ) {
    this.load();
  }

  public record(lesson: Lesson, update: ProgressUpdate): void {
    const current = this.lessons.get(lesson.id) ?? emptyRecord(lesson);
    const stepsTotal = update.stepsTotal ?? current.stepsTotal;
    const stepsDone = Math.max(current.stepsDone, update.stepsDone ?? 0);
    const complete = current.complete || update.complete === true || (stepsTotal > 0 && stepsDone >= stepsTotal);
    this.lessons.set(lesson.id, {
      ...current,
      practiced: current.practiced || update.practiced === true || complete,
      stepsDone,
      stepsTotal,
      complete,
      updatedAt: this.now()
    });
    this.touchDay(lesson.id);
    this.scheduleSave();
  }

  /**
   * Cierra un repaso. `score` es la nota de «Calificar»; las lecciones por pasos
   * no tienen nota y cuentan como un repaso aprobado.
   */
  public recordReview(lesson: Lesson, score: number | null): void {
    const now = this.now();
    const current = this.lessons.get(lesson.id) ?? emptyRecord(lesson);
    const rounded = score == null ? null : Math.max(0, Math.min(100, Math.round(score)));
    const grade = rounded ?? 80;
    const passed = grade >= PASSING_SCORE;
    // Varios intentos el mismo día cuentan como un solo repaso.
    const alreadyToday = current.reps > 0 && current.dueAt != null && current.dueAt > startOfDay(now) + DAY_MS / 2;
    const reps = passed ? (alreadyToday ? current.reps : current.reps + 1) : 0;
    const intervalDays = passed && alreadyToday ? current.intervalDays : nextInterval(reps, current.intervalDays, grade);
    const scores = rounded == null ? current.scores : [...current.scores, { at: now, score: rounded }].slice(-SCORE_HISTORY);
    this.lessons.set(lesson.id, {
      ...current,
      practiced: true,
      complete: current.complete || passed,
      bestScore: rounded == null ? current.bestScore : Math.max(current.bestScore ?? 0, rounded),
      lastScore: rounded ?? current.lastScore,
      scores,
      reps,
      intervalDays,
      dueAt: startOfDay(now) + intervalDays * DAY_MS,
      updatedAt: now
    });
    this.touchDay(lesson.id);
    this.scheduleSave();
  }

  /** Suma tiempo de escritura al día de hoy. */
  public addActivity(lessonId: string, ms: number, strokes: number): void {
    const log = this.touchDay(lessonId);
    log.ms += Math.max(0, ms);
    log.strokes += Math.max(0, strokes);
    this.scheduleSave();
  }

  public get(id: string): LessonProgress | undefined {
    return this.lessons.get(id);
  }

  public completedIds(): string[] {
    return [...this.lessons.entries()].filter(([, record]) => record.complete).map(([id]) => id);
  }

  public startedIds(): string[] {
    return [...this.lessons.entries()]
      .filter(([, record]) => record.practiced && !record.complete)
      .map(([id]) => id);
  }

  /** Lecciones aprobadas cuyo repaso ya toca, de la más atrasada a la más reciente. */
  public dueIds(): string[] {
    const limit = startOfDay(this.now());
    return [...this.lessons.entries()]
      .filter(([, record]) => record.dueAt != null && record.dueAt <= limit && (record.complete || record.lastScore != null))
      .sort((a, b) => (a[1].dueAt ?? 0) - (b[1].dueAt ?? 0))
      .map(([id]) => id);
  }

  public practicedToday(id: string): boolean {
    return this.days.get(dayKey(this.now()))?.lessons.includes(id) ?? false;
  }

  /** Lo registrado un día: tiempo, trazos y lecciones tocadas. */
  public dayLog(key: string = dayKey(this.now())): DayLog {
    const log = this.days.get(key);
    return log ? { ms: log.ms, strokes: log.strokes, lessons: [...log.lessons] } : { ms: 0, strokes: 0, lessons: [] };
  }

  /** Notas de «Calificar» puestas un día, de cualquier lección. */
  public scoresOn(key: string = dayKey(this.now())): number[] {
    const result: number[] = [];
    for (const record of this.lessons.values()) {
      for (const entry of record.scores) if (dayKey(entry.at) === key) result.push(entry.score);
    }
    return result;
  }

  /** Cifras de toda la historia, para los logros. */
  public lifetime(): {
    longestStreak: number;
    strokes: number;
    ms: number;
    highScores: number;
    earlyDays: number;
    lateDays: number;
  } {
    let strokes = 0;
    let ms = 0;
    for (const log of this.days.values()) {
      strokes += log.strokes;
      ms += log.ms;
    }
    // Racha más larga: días activos seguidos en el calendario.
    const active = [...this.days.keys()].filter((key) => this.activeDay(key)).sort();
    let longestStreak = 0;
    let run = 0;
    let previous = Number.NaN;
    for (const key of active) {
      const [y, m, d] = key.split('-').map(Number);
      const day = Math.round(Date.UTC(y, m - 1, d) / DAY_MS);
      run = day === previous + 1 ? run + 1 : 1;
      previous = day;
      longestStreak = Math.max(longestStreak, run);
    }
    // Madrugador / noctámbulo: días con alguna calificación antes de las 8 o desde las 22.
    const early = new Set<string>();
    const late = new Set<string>();
    let highScores = 0;
    for (const record of this.lessons.values()) {
      if ((record.bestScore ?? 0) >= 95) highScores += 1;
      for (const entry of record.scores) {
        const hour = new Date(entry.at).getHours();
        if (hour < 8 && hour >= 4) early.add(dayKey(entry.at));
        if (hour >= 22 || hour < 4) late.add(dayKey(entry.at));
      }
    }
    return { longestStreak, strokes, ms, highScores, earlyDays: early.size, lateDays: late.size };
  }

  public todayMs(): number {
    return this.days.get(dayKey(this.now()))?.ms ?? 0;
  }

  /** Días seguidos con práctica. Si hoy aún no hay, la racha de ayer sigue viva. */
  public streak(): number {
    let cursor = startOfDay(this.now());
    if (!this.activeDay(dayKey(cursor))) cursor -= DAY_MS;
    let count = 0;
    while (this.activeDay(dayKey(cursor + DAY_MS / 2))) {
      count += 1;
      cursor -= DAY_MS;
    }
    return count;
  }

  public recentDays(count: number): { key: string; ms: number }[] {
    const today = startOfDay(this.now());
    const result: { key: string; ms: number }[] = [];
    for (let offset = count - 1; offset >= 0; offset--) {
      const key = dayKey(today - offset * DAY_MS + DAY_MS / 2);
      result.push({ key, ms: this.days.get(key)?.ms ?? 0 });
    }
    return result;
  }

  public view(lessons: Lesson[]): ProgressView {
    const byId = new Map(lessons.map((lesson) => [lesson.id, lesson]));
    const sections = [
      { title: 'Palmer', groups: this.groups(lessons, 'palmer', PALMER_GROUPS) },
      { title: 'Japonés', groups: this.groups(lessons, 'japanese', JAPANESE_GROUPS) }
    ];
    const scored = [...this.lessons.values()].filter((record) => record.lastScore != null);
    const averageScore = scored.length
      ? Math.round(scored.reduce((sum, record) => sum + (record.lastScore ?? 0), 0) / scored.length)
      : null;
    const recent = [...this.lessons.entries()]
      .filter(([, record]) => record.practiced)
      .sort((a, b) => b[1].updatedAt - a[1].updatedAt)
      .flatMap(([id, record]) => {
        const lesson = byId.get(id);
        return lesson ? [{ lesson, record }] : [];
      })
      .slice(0, 8);
    let totalMs = 0;
    for (const log of this.days.values()) totalMs += log.ms;
    return {
      total: lessons.length,
      complete: lessons.filter((lesson) => this.lessons.get(lesson.id)?.complete).length,
      started: lessons.filter((lesson) => {
        const record = this.lessons.get(lesson.id);
        return record?.practiced && !record.complete;
      }).length,
      averageScore,
      streak: this.streak(),
      todayMs: this.todayMs(),
      totalMs,
      dueCount: this.dueIds().filter((id) => byId.has(id)).length,
      days: this.recentDays(84),
      sections,
      recent
    };
  }

  public exportData(): ProgressState {
    return {
      version: SCHEMA_VERSION,
      lessons: Object.fromEntries(this.lessons),
      days: Object.fromEntries(this.days)
    };
  }

  /** Mezcla un respaldo con lo que hay: de cada lección gana el registro más reciente. */
  public importData(input: unknown): ImportResult {
    const state = parseState(input);
    if (!state) return { ok: false, lessons: 0, days: 0 };
    let lessons = 0;
    for (const [id, record] of Object.entries(state.lessons)) {
      const current = this.lessons.get(id);
      if (!current || record.updatedAt >= current.updatedAt) {
        this.lessons.set(id, record);
        lessons += 1;
      }
    }
    let days = 0;
    for (const [key, log] of Object.entries(state.days)) {
      const current = this.days.get(key);
      if (!current || log.ms > current.ms) {
        this.days.set(key, log);
        days += 1;
      }
    }
    this.flush();
    return { ok: true, lessons, days };
  }

  public clearAll(): void {
    this.lessons.clear();
    this.days.clear();
    this.flush();
  }

  /** Escribe ya. Se llama al ocultar la página para no perder lo último. */
  public flush(): void {
    if (this.saveTimer !== null) {
      clearTimeout(this.saveTimer);
      this.saveTimer = null;
    }
    writeJSON(this.store, STORAGE_KEY, this.exportData());
  }

  private activeDay(key: string): boolean {
    const log = this.days.get(key);
    return !!log && (log.ms >= 30_000 || log.lessons.length > 0);
  }

  private touchDay(lessonId: string): DayLog {
    const key = dayKey(this.now());
    let log = this.days.get(key);
    if (!log) {
      log = { ms: 0, strokes: 0, lessons: [] };
      this.days.set(key, log);
    }
    if (!log.lessons.includes(lessonId)) log.lessons.push(lessonId);
    return log;
  }

  private scheduleSave(): void {
    if (this.saveTimer !== null) return;
    this.saveTimer = setTimeout(() => {
      this.saveTimer = null;
      this.flush();
    }, 600);
  }

  private groups(lessons: Lesson[], category: 'palmer' | 'japanese', order: string[]): GroupStat[] {
    return order.map((id) => {
      const members = lessons.filter((lesson) => lesson.category === category && lesson.group === id);
      let complete = 0;
      let started = 0;
      for (const lesson of members) {
        const record = this.lessons.get(lesson.id);
        if (record?.complete) complete += 1;
        else if (record?.practiced) started += 1;
      }
      return { id, label: id, category, total: members.length, complete, started };
    });
  }

  private load(): void {
    const state = parseState(readJSON<unknown>(this.store, STORAGE_KEY));
    if (!state) return;
    this.lessons = new Map(Object.entries(state.lessons));
    this.days = new Map(Object.entries(state.days));
  }
}
