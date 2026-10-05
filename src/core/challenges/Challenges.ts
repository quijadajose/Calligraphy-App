import { KeyValueStore, readJSON, writeJSON } from '../storage/safeStorage';

/**
 * Desafíos del día y del mes.
 *
 * Cada día salen tres: uno de constancia (tiempo o trazos), uno de calidad (notas) y uno
 * de contenido (repasos, algo nuevo, la sesión o variedad). Se eligen la primera vez que
 * se abren ese día y quedan fijos hasta medianoche. Completar desafíos suma para la
 * medalla del mes.
 */

export type ChallengeKind = 'minutes' | 'strokes' | 'scores80' | 'score90' | 'lessons' | 'reviews' | 'fresh' | 'session';

export interface ChallengePick {
  kind: ChallengeKind;
  target: number;
}

export interface Challenge extends ChallengePick {
  title: string;
  icon: string;
  progress: number;
  done: boolean;
}

/** Lo que pasó hoy, tal como lo cuentan el progreso y la sesión del día. */
export interface DayActivity {
  ms: number;
  strokes: number;
  lessonsPracticed: number;
  scores: number[];
  reviews: { done: number; total: number };
  fresh: { done: number; total: number };
  session: { done: number; total: number };
  goalMinutes: number;
}

export interface MonthStatus {
  /** AAAA-MM */
  key: string;
  month: number;
  year: number;
  count: number;
  target: number;
  earned: boolean;
  daysLeft: number;
}

export interface SyncResult {
  challenges: Challenge[];
  /** Desafíos que se completaron con esta actualización. */
  completed: Challenge[];
  month: MonthStatus;
  /** La medalla del mes se acaba de ganar. */
  medalEarned: boolean;
}

interface DayRecord {
  picked: ChallengePick[];
  done: ChallengeKind[];
}

interface ChallengeState {
  version: 1;
  days: Record<string, DayRecord>;
  /** Medallas ganadas: AAAA-MM → momento en que se ganó. */
  medals: Record<string, number>;
}

const STORAGE_KEY = 'calligraphy-challenges';
const KINDS: ChallengeKind[] = ['minutes', 'strokes', 'scores80', 'score90', 'lessons', 'reviews', 'fresh', 'session'];

export const MONTH_NAMES = [
  'enero', 'febrero', 'marzo', 'abril', 'mayo', 'junio',
  'julio', 'agosto', 'septiembre', 'octubre', 'noviembre', 'diciembre'
];

const ICONS: Record<ChallengeKind, string> = {
  minutes: 'ti-clock-hour-4',
  strokes: 'ti-writing',
  scores80: 'ti-target-arrow',
  score90: 'ti-star',
  lessons: 'ti-books',
  reviews: 'ti-refresh',
  fresh: 'ti-sparkles',
  session: 'ti-list-check'
};

export function challengeTitle(pick: ChallengePick): string {
  const n = pick.target;
  switch (pick.kind) {
    case 'minutes': return `Practica ${n} minutos`;
    case 'strokes': return `Escribe ${n} trazos`;
    case 'scores80': return `Saca 80 % o más en ${n} ${n === 1 ? 'calificación' : 'calificaciones'}`;
    case 'score90': return n === 1 ? 'Consigue un 90 % o más' : `Consigue 90 % o más ${n} veces`;
    case 'lessons': return `Practica ${n} lecciones distintas`;
    case 'reviews': return n === 1 ? 'Haz tu repaso de hoy' : `Haz tus ${n} repasos de hoy`;
    case 'fresh': return n === 1 ? 'Empieza una lección nueva' : `Empieza ${n} lecciones nuevas`;
    case 'session': return 'Completa la sesión de hoy';
  }
}

/** Número estable a partir del día: el mismo día siempre da los mismos desafíos. */
function seedOf(key: string): number {
  let hash = 2166136261;
  for (let i = 0; i < key.length; i++) {
    hash ^= key.charCodeAt(i);
    hash = Math.imul(hash, 16777619);
  }
  return hash >>> 0;
}

export function pickChallenges(key: string, activity: DayActivity): ChallengePick[] {
  const seed = seedOf(key);
  const goal = Math.max(1, Math.round(activity.goalMinutes));
  const volume: ChallengePick =
    seed % 2 === 0
      ? { kind: 'minutes', target: goal }
      : { kind: 'strokes', target: [80, 120, 160][(seed >>> 3) % 3] };
  const quality: ChallengePick =
    (seed >>> 5) % 3 === 0 ? { kind: 'score90', target: 1 } : { kind: 'scores80', target: 2 + ((seed >>> 7) % 2) };
  const content: ChallengePick[] = [{ kind: 'lessons', target: 3 + ((seed >>> 9) % 2) }];
  if (activity.reviews.total > 0) content.push({ kind: 'reviews', target: activity.reviews.total });
  if (activity.fresh.total > 0) content.push({ kind: 'fresh', target: 1 });
  if (activity.session.total > 0) content.push({ kind: 'session', target: activity.session.total });
  return [volume, quality, content[(seed >>> 11) % content.length]];
}

export function measure(kind: ChallengeKind, activity: DayActivity): number {
  switch (kind) {
    case 'minutes': return Math.floor(activity.ms / 60000);
    case 'strokes': return activity.strokes;
    case 'scores80': return activity.scores.filter((score) => score >= 80).length;
    case 'score90': return activity.scores.filter((score) => score >= 90).length;
    case 'lessons': return activity.lessonsPracticed;
    case 'reviews': return activity.reviews.done;
    case 'fresh': return activity.fresh.done;
    case 'session': return activity.session.done;
  }
}

export function monthKeyOf(day: string): string {
  return day.slice(0, 7);
}

/** Meta del mes: un desafío y medio por día del mes (45 en uno de 30 días). */
export function monthTarget(year: number, month: number): number {
  const days = new Date(year, month + 1, 0).getDate();
  return Math.round(days * 1.5);
}

function cleanState(raw: unknown): ChallengeState {
  const state: ChallengeState = { version: 1, days: {}, medals: {} };
  if (!raw || typeof raw !== 'object') return state;
  const input = raw as { days?: unknown; medals?: unknown };
  if (input.days && typeof input.days === 'object') {
    for (const [key, value] of Object.entries(input.days as Record<string, unknown>)) {
      if (!/^\d{4}-\d{2}-\d{2}$/.test(key) || !value || typeof value !== 'object') continue;
      const record = value as { picked?: unknown; done?: unknown };
      const picked = Array.isArray(record.picked)
        ? record.picked.flatMap((item) => {
            const pick = item as { kind?: unknown; target?: unknown };
            const target = Number(pick?.target);
            return KINDS.includes(pick?.kind as ChallengeKind) && Number.isFinite(target) && target > 0
              ? [{ kind: pick.kind as ChallengeKind, target: Math.round(target) }]
              : [];
          })
        : [];
      const done = Array.isArray(record.done)
        ? record.done.filter((kind): kind is ChallengeKind => KINDS.includes(kind as ChallengeKind))
        : [];
      state.days[key] = { picked, done: [...new Set(done)] };
    }
  }
  if (input.medals && typeof input.medals === 'object') {
    for (const [key, value] of Object.entries(input.medals as Record<string, unknown>)) {
      const at = Number(value);
      if (/^\d{4}-\d{2}$/.test(key) && Number.isFinite(at)) state.medals[key] = at;
    }
  }
  return state;
}

export class ChallengeStore {
  private state: ChallengeState;

  constructor(private store: KeyValueStore) {
    this.state = cleanState(readJSON<unknown>(store, STORAGE_KEY));
  }

  /**
   * Calcula los desafíos de `day` con la actividad de hoy, guarda los recién completados
   * y avisa si con ellos se gana la medalla del mes.
   */
  public sync(day: string, activity: DayActivity): SyncResult {
    let record = this.state.days[day];
    let dirty = false;
    if (!record || record.picked.length === 0) {
      record = { picked: pickChallenges(day, activity), done: record?.done ?? [] };
      this.state.days[day] = record;
      dirty = true;
    }

    const completed: Challenge[] = [];
    const challenges = record.picked.map((pick) => {
      const progress = Math.min(pick.target, measure(pick.kind, activity));
      const already = record.done.includes(pick.kind);
      const done = already || progress >= pick.target;
      const challenge: Challenge = {
        ...pick,
        title: challengeTitle(pick),
        icon: ICONS[pick.kind],
        progress: done ? pick.target : progress,
        done
      };
      if (done && !already) {
        record.done.push(pick.kind);
        completed.push(challenge);
        dirty = true;
      }
      return challenge;
    });

    const monthKey = monthKeyOf(day);
    let medalEarned = false;
    const before = this.monthStatus(day);
    if (!before.earned && before.count >= before.target) {
      this.state.medals[monthKey] = Date.now();
      medalEarned = true;
      dirty = true;
    }
    if (dirty) this.save();
    return { challenges, completed, month: this.monthStatus(day), medalEarned };
  }

  public monthStatus(day: string): MonthStatus {
    const key = monthKeyOf(day);
    const year = Number(day.slice(0, 4));
    const month = Number(day.slice(5, 7)) - 1;
    let count = 0;
    for (const [dayKey, record] of Object.entries(this.state.days)) {
      if (dayKey.startsWith(key)) count += record.done.length;
    }
    const lastDay = new Date(year, month + 1, 0).getDate();
    return {
      key,
      month,
      year,
      count,
      target: monthTarget(year, month),
      earned: key in this.state.medals,
      daysLeft: Math.max(0, lastDay - Number(day.slice(8, 10)))
    };
  }

  /** Desafíos completados en total. */
  public totalCompleted(): number {
    let count = 0;
    for (const record of Object.values(this.state.days)) count += record.done.length;
    return count;
  }

  /** Meses con medalla ganada, AAAA-MM. */
  public medals(): string[] {
    return Object.keys(this.state.medals).sort();
  }

  public exportData(): ChallengeState {
    return this.state;
  }

  /** Mezcla un respaldo: de cada día se quedan los desafíos completados de ambos lados. */
  public importData(input: unknown): void {
    const incoming = cleanState(input);
    for (const [key, record] of Object.entries(incoming.days)) {
      const current = this.state.days[key];
      if (!current) this.state.days[key] = record;
      else current.done = [...new Set([...current.done, ...record.done])];
    }
    for (const [key, at] of Object.entries(incoming.medals)) {
      if (!(key in this.state.medals)) this.state.medals[key] = at;
    }
    this.save();
  }

  public clearAll(): void {
    this.state = { version: 1, days: {}, medals: {} };
    this.save();
  }

  private save(): void {
    writeJSON(this.store, STORAGE_KEY, this.state);
  }
}
