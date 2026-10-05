import { KeyValueStore, readJSON, writeJSON } from '../storage/safeStorage';

/**
 * Logros con niveles. Se calculan siempre a partir del progreso guardado (no hay que
 * migrar nada); solo se guarda el último nivel visto de cada uno para avisar al subir.
 */

export interface AchievementInput {
  longestStreak: number;
  strokes: number;
  minutes: number;
  highScores: number;
  challenges: number;
  medals: number;
  earlyDays: number;
  lateDays: number;
  /** Lecciones completas por grupo: Minúsculas, Hiragana, N5… */
  groups: Record<string, { complete: number; total: number }>;
}

export interface Achievement {
  id: string;
  name: string;
  icon: string;
  color: string;
  level: number;
  maxLevel: number;
  value: number;
  /** Meta del nivel siguiente; null si ya está al máximo. */
  next: number | null;
  /** Meta del nivel alcanzado (0 si ninguno). */
  reached: number;
  /** Qué pide el nivel siguiente, o qué se logró si está completo. */
  description: string;
}

interface Def {
  id: string;
  name: string;
  icon: string;
  color: string;
  thresholds: (input: AchievementInput) => number[];
  value: (input: AchievementInput) => number;
  describe: (target: number, input: AchievementInput) => string;
}

const plural = (n: number, one: string, many: string) => `${n.toLocaleString('es')} ${n === 1 ? one : many}`;

function groupDef(id: string, name: string, group: string, icon: string, color: string): Def {
  return {
    id,
    name,
    icon,
    color,
    // Cuartos del grupo: 25 %, 50 %, 75 % y completo.
    thresholds: (input) => {
      const total = input.groups[group]?.total ?? 0;
      if (total === 0) return [];
      return [...new Set([0.25, 0.5, 0.75, 1].map((part) => Math.max(1, Math.ceil(total * part))))];
    },
    value: (input) => input.groups[group]?.complete ?? 0,
    describe: (target, input) => {
      const total = input.groups[group]?.total ?? 0;
      if (target < total) return `Aprende ${target} de ${total}`;
      if (group === 'Minúsculas' || group === 'Mayúsculas') return `Aprende todas las ${group.toLowerCase()} (${total})`;
      if (group === 'Imprenta') return `Aprende todas las letras de imprenta (${total})`;
      if (group === 'Hiragana' || group === 'Katakana') return `Completa el ${group.toLowerCase()} (${total})`;
      return `Aprende todos los kanji ${group} (${total})`;
    }
  };
}

const DEFS: Def[] = [
  {
    id: 'streak',
    name: 'Racha',
    icon: 'ti-flame',
    color: '#F76707',
    thresholds: () => [3, 7, 14, 30, 60, 100, 200, 365],
    value: (i) => i.longestStreak,
    describe: (t) => `Practica ${plural(t, 'día', 'días')} seguidos`
  },
  {
    id: 'strokes',
    name: 'Mano incansable',
    icon: 'ti-writing',
    color: '#1C7ED6',
    thresholds: () => [100, 500, 2000, 5000, 10000, 25000, 50000, 100000],
    value: (i) => i.strokes,
    describe: (t) => `Escribe ${plural(t, 'trazo', 'trazos')}`
  },
  {
    id: 'minutes',
    name: 'Horas de tinta',
    icon: 'ti-clock-hour-4',
    color: '#0CA678',
    thresholds: () => [30, 120, 300, 600, 1500, 3000, 6000],
    value: (i) => i.minutes,
    describe: (t) => (t < 60 ? `Practica ${t} minutos en total` : `Practica ${plural(t / 60, 'hora', 'horas')} en total`)
  },
  {
    id: 'precision',
    name: 'Pulso firme',
    icon: 'ti-target-arrow',
    color: '#2F9E44',
    thresholds: () => [1, 5, 15, 40, 100, 250],
    value: (i) => i.highScores,
    describe: (t) => `Saca 95 % o más en ${plural(t, 'lección', 'lecciones')}`
  },
  {
    id: 'challenges',
    name: 'Desafiante',
    icon: 'ti-list-check',
    color: '#E8590C',
    thresholds: () => [10, 30, 75, 150, 300, 600, 1000],
    value: (i) => i.challenges,
    describe: (t) => `Completa ${plural(t, 'desafío', 'desafíos')} del día`
  },
  {
    id: 'medals',
    name: 'Coleccionista',
    icon: 'ti-star',
    color: '#F59F00',
    thresholds: () => [1, 3, 6, 12, 24],
    value: (i) => i.medals,
    describe: (t) => `Gana ${plural(t, 'medalla', 'medallas')} del mes`
  },
  {
    id: 'early',
    name: 'Madrugador',
    icon: 'ti-sun',
    color: '#FAB005',
    thresholds: () => [1, 5, 15, 30, 60],
    value: (i) => i.earlyDays,
    describe: (t) => `Califica antes de las 8:00 en ${plural(t, 'día', 'días')}`
  },
  {
    id: 'late',
    name: 'Noctámbulo',
    icon: 'ti-moon',
    color: '#7048E8',
    thresholds: () => [1, 5, 15, 30, 60],
    value: (i) => i.lateDays,
    describe: (t) => `Califica después de las 22:00 en ${plural(t, 'día', 'días')}`
  },
  groupDef('lower', 'Minúsculas Palmer', 'Minúsculas', 'ti-pencil', '#C2255C'),
  groupDef('upper', 'Mayúsculas Palmer', 'Mayúsculas', 'ti-pencil', '#A61E4D'),
  groupDef('print', 'Imprenta', 'Imprenta', 'ti-letter-case', '#495057'),
  groupDef('hiragana', 'Hiragana', 'Hiragana', 'ti-brush', '#D6336C'),
  groupDef('katakana', 'Katakana', 'Katakana', 'ti-brush', '#AE3EC9'),
  groupDef('n5', 'Kanji N5', 'N5', 'ti-books', '#4263EB'),
  groupDef('n4', 'Kanji N4', 'N4', 'ti-books', '#3B5BDB'),
  groupDef('n3', 'Kanji N3', 'N3', 'ti-books', '#364FC7'),
  groupDef('n2', 'Kanji N2', 'N2', 'ti-books', '#1864AB'),
  groupDef('n1', 'Kanji N1', 'N1', 'ti-books', '#0B7285')
];

export function evaluateAchievements(input: AchievementInput): Achievement[] {
  return DEFS.flatMap((def) => {
    const thresholds = def.thresholds(input);
    if (thresholds.length === 0) return [];
    const value = def.value(input);
    const level = thresholds.filter((t) => value >= t).length;
    const next = level < thresholds.length ? thresholds[level] : null;
    const reached = level > 0 ? thresholds[level - 1] : 0;
    return [{
      id: def.id,
      name: def.name,
      icon: def.icon,
      color: def.color,
      level,
      maxLevel: thresholds.length,
      value,
      next,
      reached,
      description: def.describe(next ?? reached, input)
    }];
  });
}

const STORAGE_KEY = 'calligraphy-achievements';

export class AchievementStore {
  private seen: Record<string, number>;

  constructor(private store: KeyValueStore) {
    const raw = readJSON<Record<string, unknown>>(store, STORAGE_KEY) ?? {};
    this.seen = {};
    for (const [id, level] of Object.entries(raw)) {
      const n = Number(level);
      if (Number.isFinite(n) && n >= 0) this.seen[id] = Math.floor(n);
    }
  }

  /**
   * Devuelve los logros que subieron de nivel desde la última vez y lo recuerda.
   * La primera vez (sin nada guardado) solo toma nota: no avisa de lo que ya se tenía.
   */
  public update(list: Achievement[]): Achievement[] {
    const first = Object.keys(this.seen).length === 0;
    const upgraded = list.filter((item) => item.level > (this.seen[item.id] ?? 0));
    if (upgraded.length === 0 && !first) return [];
    for (const item of list) this.seen[item.id] = Math.max(this.seen[item.id] ?? 0, item.level);
    writeJSON(this.store, STORAGE_KEY, this.seen);
    return first ? [] : upgraded;
  }

  public clearAll(): void {
    this.seen = {};
    writeJSON(this.store, STORAGE_KEY, this.seen);
  }
}
