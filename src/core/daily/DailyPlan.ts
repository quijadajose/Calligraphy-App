import { Lesson } from '../../types/ink';
import { ProgressStore } from '../progress/ProgressStore';

export type PlanKind = 'warmup' | 'review' | 'new' | 'sheet';

export interface PlanItem {
  kind: PlanKind;
  lesson: Lesson;
  done: boolean;
}

export const PLAN_LABELS: Record<PlanKind, string> = {
  warmup: 'Calentamiento',
  review: 'Repaso',
  new: 'Nuevo',
  sheet: 'Plana'
};

const MAX_REVIEWS = 5;
const NEW_PER_DAY = 2;

/** Las planas (texto cursivo) acompañan a las letras ligadas. */
const LETTER_GROUPS = ['Ligada'];

/** La plana de una letra ligada suelta («a» → «plana-a»), si existe. */
export function planaFor(lessons: Lesson[], lesson: Lesson): Lesson | undefined {
  if (lesson.category !== 'palmer' || !LETTER_GROUPS.includes(lesson.group)) return undefined;
  return lessons.find((item) => item.id === `plana-${lesson.characterOrWord.trim()}`);
}

/** La letra de la que sale una plana («plana-a» → la lección de la «a»). */
function letterForPlana(lessons: Lesson[], plana: Lesson): Lesson | undefined {
  if (!plana.id.startsWith('plana-')) return undefined;
  const char = plana.id.slice('plana-'.length);
  return lessons.find((item) => item.category === 'palmer' && LETTER_GROUPS.includes(item.group) && item.characterOrWord.trim() === char);
}

function dayNumber(time: number): number {
  const date = new Date(time);
  return Math.floor(Date.UTC(date.getFullYear(), date.getMonth(), date.getDate()) / 86_400_000);
}

/**
 * La sesión del día: un trazo de base para calentar, lo que toca repasar,
 * un par de lecciones nuevas del curso que se está siguiendo y una plana.
 */
export function buildDailyPlan(
  lessons: Lesson[],
  progress: ProgressStore,
  focusLessonId: string | null,
  now: number
): PlanItem[] {
  const byId = new Map(lessons.map((lesson) => [lesson.id, lesson]));
  const day = dayNumber(now);
  const focus = focusLessonId ? byId.get(focusLessonId) : undefined;
  const category = focus?.category ?? 'palmer';
  const chosen = new Set<string>();
  const items: PlanItem[] = [];

  const add = (kind: PlanKind, lesson: Lesson | undefined) => {
    if (!lesson || chosen.has(lesson.id)) return;
    chosen.add(lesson.id);
    items.push({ kind, lesson, done: progress.practicedToday(lesson.id) });
  };

  const drills = lessons.filter((lesson) => lesson.category === 'palmer' && lesson.group === 'Ejercicios');
  if (drills.length > 0) add('warmup', drills[day % drills.length]);

  // Lo repasado hoy deja de estar pendiente, pero sigue en la lista como hecho.
  const reviewedToday = lessons.filter((lesson) => {
    const record = progress.get(lesson.id);
    return record?.complete && record.reps >= 2 && progress.practicedToday(lesson.id);
  });
  const due = progress.dueIds().flatMap((id) => byId.get(id) ?? []);
  for (const lesson of [...due, ...reviewedToday].slice(0, MAX_REVIEWS)) add('review', lesson);

  // Las nuevas siguen el curso de la última lección abierta, desde su grupo en adelante.
  const track = lessons.filter(
    (lesson) => lesson.category === category && !lesson.dictation && !lesson.sheet && !lesson.custom
  );
  const startAt = focus ? Math.max(0, track.findIndex((lesson) => lesson.group === focus.group)) : 0;
  const ordered = [...track.slice(startAt), ...track.slice(0, startAt)];
  let fresh = 0;
  for (const lesson of ordered) {
    if (fresh >= NEW_PER_DAY) break;
    const record = progress.get(lesson.id);
    const startedToday = progress.practicedToday(lesson.id) && (record?.reps ?? 0) <= 1;
    if (record?.complete && !startedToday) continue;
    if (chosen.has(lesson.id)) continue;
    add('new', lesson);
    // Una letra nueva se aprende paso a paso y enseguida se repite en su plana.
    const plana = planaFor(lessons, lesson);
    if (plana) add('sheet', plana);
    fresh += 1;
  }

  if (!items.some((item) => item.kind === 'sheet')) {
    const sheets = lessons.filter((lesson) => lesson.category === category && (lesson.sheet || lesson.group === 'Vocabulario'));
    if (sheets.length > 0) add('sheet', sheets[day % sheets.length]);
  }

  return items;
}

/**
 * La lección que sigue. Una letra Palmer lleva a su plana, y la plana a la letra siguiente
 * (salvo que quede algo pendiente en el plan de hoy). Si no, lo que queda del plan y,
 * al final, la siguiente del grupo.
 */
export function nextLesson(lessons: Lesson[], plan: PlanItem[], current: Lesson): Lesson | null {
  // Ligada: letra paso a paso → su plana → siguiente letra.
  const plana = planaFor(lessons, current);
  if (plana) return plana;
  const inPlan = plan.findIndex((item) => item.lesson.id === current.id);
  if (inPlan >= 0) {
    const pending = [...plan.slice(inPlan + 1), ...plan.slice(0, inPlan)].find((item) => !item.done);
    if (pending) return pending.lesson;
  }
  const source = letterForPlana(lessons, current);
  if (source) {
    const group = lessons.filter((lesson) => lesson.category === 'palmer' && lesson.group === source.group);
    const following = group[group.indexOf(source) + 1];
    if (following) return following;
  }
  const index = lessons.findIndex((lesson) => lesson.id === current.id);
  if (index < 0) return null;
  const following = lessons[index + 1];
  return following && following.category === current.category ? following : null;
}
