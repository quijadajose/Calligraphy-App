import { PLAN_LABELS, PlanItem } from '../../core/daily/DailyPlan';
import { Lesson } from '../../types/ink';

export interface TodayState {
  streak: number;
  todayMs: number;
  goalMinutes: number;
  dueCount: number;
  plan: PlanItem[];
  resume: Lesson | null;
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

    const list = document.createElement('ol');
    list.className = 'today-plan';
    for (const item of state.plan) {
      const entry = document.createElement('li');
      const button = document.createElement('button');
      button.type = 'button';
      button.className = `today-item${item.done ? ' is-done' : ''}`;
      button.dataset.kind = item.kind;
      const kind = document.createElement('span');
      kind.className = 'today-kind';
      const label = item.kind === 'sheet' && item.lesson.dictation ? 'Dictado' : PLAN_LABELS[item.kind];
      kind.textContent = label;
      const title = document.createElement('span');
      title.className = 'today-lesson';
      title.textContent = item.lesson.title;
      const mark = document.createElement('i');
      mark.className = `ti ${item.done ? 'ti-circle-check' : 'ti-chevron-right'}`;
      mark.setAttribute('aria-hidden', 'true');
      button.append(kind, title, mark);
      button.setAttribute('aria-label', `${label}: ${item.lesson.title}${item.done ? ', hecho' : ''}`);
      button.addEventListener('click', () => this.onOpen?.(item.lesson));
      entry.append(button);
      list.append(entry);
    }

    this.root.replaceChildren(head, planTitle, list);
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
