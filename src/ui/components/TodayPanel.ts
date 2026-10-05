import { PLAN_LABELS, PlanItem } from '../../core/daily/DailyPlan';
import { Lesson } from '../../types/ink';
import { Challenge, MONTH_NAMES, MonthStatus } from '../../core/challenges/Challenges';
import { medalName, medalSvg } from '../medals';

export interface TodayState {
  streak: number;
  todayMs: number;
  goalMinutes: number;
  dueCount: number;
  plan: PlanItem[];
  resume: Lesson | null;
  challenges: Challenge[];
  month: MonthStatus;
  /** Desafíos recién completados: se marcan con una animación. */
  fresh?: Set<string>;
}

/** Cabecera de la pantalla de inicio: racha, meta del día, «continuar» y la sesión de hoy. */
export class TodayPanel {
  public onOpen?: (lesson: Lesson) => void;

  constructor(private root: HTMLElement) {}

  public render(state: TodayState): void {
    const minutes = Math.floor(state.todayMs / 60000);
    const ratio = Math.min(1, state.todayMs / (state.goalMinutes * 60000));
    const doneItems = state.plan.filter((item) => item.done).length;

    const head = document.createElement('div');
    head.className = 'today-head';
    head.append(
      this.stat('Racha', `${state.streak} ${state.streak === 1 ? 'día' : 'días'}`, 'ti-flame'),
      this.goal(minutes, state.goalMinutes, ratio),
      this.stat('Repasos', state.dueCount === 0 ? 'al día' : `${state.dueCount} pendientes`, 'ti-refresh')
    );
    if (state.resume) {
      const resume = document.createElement('button');
      resume.type = 'button';
      resume.className = 'go today-resume';
      resume.innerHTML = '<i class="ti ti-player-play" aria-hidden="true"></i>';
      resume.append(document.createTextNode(` Continuar: ${state.resume.title}`));
      const lesson = state.resume;
      resume.addEventListener('click', () => this.onOpen?.(lesson));
      head.append(resume);
    }

    const planTitle = document.createElement('h2');
    planTitle.className = 'today-title';
    planTitle.textContent = `Sesión de hoy · ${doneItems}/${state.plan.length}`;

    // Los repasos se agrupan en una sola tarjeta: abre el primero pendiente.
    const reviews = state.plan.filter((item) => item.kind === 'review');
    const list = document.createElement('ol');
    list.className = 'today-plan';
    let reviewsPlaced = false;
    for (const item of state.plan) {
      if (item.kind === 'review') {
        if (reviewsPlaced) continue;
        reviewsPlaced = true;
        list.append(this.reviewEntry(reviews));
        continue;
      }
      list.append(this.entry(item));
    }

    const session = document.createElement('section');
    session.className = 'today-session';
    session.append(planTitle, list);

    const grid = document.createElement('div');
    grid.className = 'today-grid';
    grid.append(session, this.quests(state));
    this.root.replaceChildren(head, grid);
  }

  private quests(state: TodayState): HTMLElement {
    const card = document.createElement('section');
    card.className = 'quest-card';
    card.setAttribute('aria-labelledby', 'quest-title');

    const header = document.createElement('div');
    header.className = 'quest-head';
    const title = document.createElement('h2');
    title.id = 'quest-title';
    title.className = 'today-title';
    title.textContent = 'Desafíos del día';
    const timer = document.createElement('span');
    timer.className = 'quest-timer';
    timer.innerHTML = '<i class="ti ti-hourglass" aria-hidden="true"></i>';
    timer.append(document.createTextNode(` ${untilMidnight()}`));
    timer.title = 'Tiempo hasta que cambian los desafíos';
    header.append(title, timer);

    const list = document.createElement('ul');
    list.className = 'quest-list';
    for (const challenge of state.challenges) {
      const item = document.createElement('li');
      item.className = `quest${challenge.done ? ' is-done' : ''}${state.fresh?.has(challenge.kind) ? ' is-fresh' : ''}`;
      item.dataset.kind = challenge.kind;
      const icon = document.createElement('span');
      icon.className = 'quest-icon';
      icon.innerHTML = `<i class="ti ${challenge.done ? 'ti-check' : challenge.icon}" aria-hidden="true"></i>`;
      const body = document.createElement('div');
      body.className = 'quest-body';
      const name = document.createElement('span');
      name.className = 'quest-name';
      name.textContent = challenge.title;
      body.append(name, this.bar(challenge.progress, challenge.target, `${challenge.progress} / ${challenge.target}`));
      item.append(icon, body);
      item.setAttribute('aria-label', `${challenge.title}: ${challenge.done ? 'completado' : `${challenge.progress} de ${challenge.target}`}`);
      list.append(item);
    }

    const month = state.month;
    const monthRow = document.createElement('div');
    monthRow.className = `quest-month${month.earned ? ' is-earned' : ''}`;
    const medal = document.createElement('span');
    medal.className = 'quest-medal';
    medal.innerHTML = medalSvg(month.month, month.earned || 'pending', 52);
    const monthBody = document.createElement('div');
    monthBody.className = 'quest-body';
    const monthName = document.createElement('span');
    monthName.className = 'quest-name';
    monthName.textContent = `Desafío de ${MONTH_NAMES[month.month]}`;
    const monthNote = document.createElement('span');
    monthNote.className = 'quest-note';
    monthNote.textContent = month.earned
      ? `Medalla ganada: ${medalName(month.month)}`
      : `Completa ${month.target} desafíos este mes · ${month.daysLeft === 0 ? 'último día' : `quedan ${month.daysLeft} días`}`;
    monthBody.append(monthName, this.bar(month.count, month.target, `${Math.min(month.count, month.target)} / ${month.target}`), monthNote);
    monthRow.append(medal, monthBody);
    monthRow.setAttribute('aria-label', `Desafío de ${MONTH_NAMES[month.month]}: ${month.count} de ${month.target} desafíos${month.earned ? ', medalla ganada' : ''}`);

    card.append(header, list, monthRow);
    return card;
  }

  private bar(value: number, max: number, label: string): HTMLElement {
    const bar = document.createElement('span');
    bar.className = 'quest-bar';
    bar.setAttribute('aria-hidden', 'true');
    const fill = document.createElement('span');
    fill.className = 'quest-fill';
    fill.style.width = `${Math.round(Math.min(1, value / Math.max(1, max)) * 100)}%`;
    const text = document.createElement('span');
    text.className = 'quest-count';
    text.textContent = label;
    bar.append(fill, text);
    return bar;
  }

  private entry(item: PlanItem): HTMLLIElement {
    const entry = document.createElement('li');
    const button = document.createElement('button');
    button.type = 'button';
    button.className = `today-item${item.done ? ' is-done' : ''}`;
    button.dataset.kind = item.kind;
    const label = item.kind === 'sheet' && item.lesson.dictation ? 'Dictado' : PLAN_LABELS[item.kind];
    const kind = document.createElement('span');
    kind.className = 'today-kind';
    kind.textContent = label;
    const title = document.createElement('span');
    title.className = 'today-lesson';
    title.textContent = item.lesson.dictation ? 'Escucha y escribe' : item.lesson.title;
    title.title = item.lesson.title;
    button.append(kind, title, this.mark(item.done));
    button.setAttribute('aria-label', `${label}: ${item.lesson.title}${item.done ? ', hecho' : ''}`);
    button.addEventListener('click', () => this.onOpen?.(item.lesson));
    entry.append(button);
    return entry;
  }

  private reviewEntry(items: PlanItem[]): HTMLLIElement {
    const entry = document.createElement('li');
    const button = document.createElement('button');
    button.type = 'button';
    const pending = items.filter((item) => !item.done);
    const allDone = pending.length === 0;
    button.className = `today-item${allDone ? ' is-done' : ''}`;
    button.dataset.kind = 'review';
    const kind = document.createElement('span');
    kind.className = 'today-kind';
    kind.textContent = `Repaso · ${items.length - pending.length}/${items.length}`;
    const letters = document.createElement('span');
    letters.className = 'today-lesson today-letters';
    for (const item of items) {
      const chip = document.createElement('span');
      chip.className = `today-letter${item.done ? ' is-done' : ''}`;
      chip.textContent = item.lesson.title;
      letters.append(chip);
    }
    button.append(kind, letters, this.mark(allDone));
    const names = items.map((item) => item.lesson.title).join(', ');
    button.setAttribute('aria-label', `Repaso: ${names}. ${pending.length} pendientes`);
    const target = (pending[0] ?? items[0]).lesson;
    button.addEventListener('click', () => this.onOpen?.(target));
    entry.append(button);
    return entry;
  }

  private mark(done: boolean): HTMLElement {
    const mark = document.createElement('i');
    mark.className = `ti ${done ? 'ti-circle-check' : 'ti-chevron-right'}`;
    mark.setAttribute('aria-hidden', 'true');
    return mark;
  }

  private stat(label: string, value: string, icon: string): HTMLElement {
    const card = document.createElement('div');
    card.className = 'today-stat';
    card.innerHTML = `<i class="ti ${icon}" aria-hidden="true"></i>`;
    const text = document.createElement('div');
    const strong = document.createElement('strong');
    strong.textContent = value;
    const caption = document.createElement('span');
    caption.textContent = label;
    text.append(strong, caption);
    card.append(text);
    return card;
  }

  private goal(minutes: number, goal: number, ratio: number): HTMLElement {
    const card = document.createElement('div');
    card.className = 'today-stat today-goal';
    card.setAttribute('role', 'meter');
    card.setAttribute('aria-valuemin', '0');
    card.setAttribute('aria-valuemax', String(goal));
    card.setAttribute('aria-valuenow', String(Math.min(goal, minutes)));
    card.setAttribute('aria-label', 'Meta diaria en minutos');
    const r = 15;
    const perimeter = 2 * Math.PI * r;
    card.innerHTML = `<svg width="38" height="38" viewBox="0 0 38 38" aria-hidden="true"><circle cx="19" cy="19" r="${r}" class="ring-track"/><circle cx="19" cy="19" r="${r}" class="ring-fill"${ratio <= 0 ? ' opacity="0"' : ''} stroke-dasharray="${(ratio * perimeter).toFixed(1)} ${perimeter.toFixed(1)}" transform="rotate(-90 19 19)"/></svg>`;
    const text = document.createElement('div');
    const strong = document.createElement('strong');
    strong.textContent = ratio >= 1 ? 'Meta cumplida' : `${minutes} / ${goal} min`;
    const caption = document.createElement('span');
    caption.textContent = 'Hoy';
    text.append(strong, caption);
    card.append(text);
    return card;
  }
}

function untilMidnight(now = new Date()): string {
  const end = new Date(now);
  end.setHours(24, 0, 0, 0);
  const minutes = Math.max(1, Math.round((end.getTime() - now.getTime()) / 60000));
  if (minutes < 60) return `${minutes} min`;
  return `${Math.floor(minutes / 60)} h`;
}
