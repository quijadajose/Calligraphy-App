import { GroupStat, LessonProgress, ProgressView } from '../../core/progress/ProgressStore';
import { Lesson } from '../../types/ink';

export class ProgressDashboard {
  public onOpenGroup?: (category: 'palmer' | 'japanese', group: string) => void;
  public onOpenLesson?: (lesson: Lesson) => void;

  constructor(private root: HTMLElement) {}

  public render(view: ProgressView): void {
    this.root.replaceChildren();
    this.root.append(this.summary(view));
    if (view.complete === 0 && view.started === 0) {
      const empty = document.createElement('p');
      empty.className = 'progress-empty';
      empty.textContent = 'Todavía no hay práctica guardada. El avance aparece al terminar un paso, calificar o entregar un dictado.';
      this.root.append(empty);
    }
    for (const section of view.sections) {
      const block = document.createElement('section');
      block.className = 'progress-section';
      const heading = document.createElement('h3');
      heading.textContent = section.title;
      block.append(heading);
      for (const group of section.groups) block.append(this.groupRow(group));
      this.root.append(block);
    }
    if (view.recent.length > 0) this.root.append(this.recentList(view.recent));
  }

  private summary(view: ProgressView): HTMLElement {
    const wrap = document.createElement('div');
    wrap.className = 'progress-summary';
    const percent = view.total === 0 ? 0 : Math.round((view.complete / view.total) * 100);
    wrap.append(this.stat('Completas', `${view.complete}/${view.total}`));
    wrap.append(this.stat('En curso', String(view.started)));
    wrap.append(this.stat('Nota media', view.averageScore == null ? '—' : String(view.averageScore)));
    const bar = document.createElement('div');
    bar.className = 'progress-meter';
    bar.setAttribute('role', 'meter');
    bar.setAttribute('aria-valuemin', '0');
    bar.setAttribute('aria-valuemax', String(view.total));
    bar.setAttribute('aria-valuenow', String(view.complete));
    bar.setAttribute('aria-label', 'Lecciones completas');
    const fill = document.createElement('span');
    fill.style.width = `${percent}%`;
    bar.append(fill);
    wrap.append(bar);
    return wrap;
  }

  private stat(label: string, value: string): HTMLElement {
    const card = document.createElement('div');
    card.className = 'progress-stat';
    const number = document.createElement('strong');
    number.textContent = value;
    const caption = document.createElement('span');
    caption.textContent = label;
    card.append(number, caption);
    return card;
  }

  private groupRow(group: GroupStat): HTMLButtonElement {
    const button = document.createElement('button');
    button.type = 'button';
    button.className = 'progress-row';
    const percent = group.total === 0 ? 0 : Math.round((group.complete / group.total) * 100);
    const name = document.createElement('span');
    name.className = 'progress-row-name';
    name.textContent = group.label;
    const track = document.createElement('span');
    track.className = 'progress-row-track';
    const fill = document.createElement('span');
    fill.style.width = `${percent}%`;
    track.append(fill);
    const count = document.createElement('span');
    count.className = 'progress-row-count';
    const extra = group.started > 0 ? ` · ${group.started} en curso` : '';
    count.textContent = `${group.complete}/${group.total}${extra}`;
    button.append(name, track, count);
    button.addEventListener('click', () => this.onOpenGroup?.(group.category, group.id));
    return button;
  }

  private recentList(items: { lesson: Lesson; record: LessonProgress }[]): HTMLElement {
    const section = document.createElement('section');
    section.className = 'progress-section';
    const heading = document.createElement('h3');
    heading.textContent = 'Recientes';
    const list = document.createElement('div');
    list.className = 'progress-recent';
    for (const item of items) {
      const button = document.createElement('button');
      button.type = 'button';
      button.className = 'progress-recent-item';
      const title = document.createElement('span');
      title.textContent = item.lesson.title;
      const meta = document.createElement('span');
      meta.textContent = this.statusLine(item.lesson, item.record);
      button.append(title, meta);
      button.addEventListener('click', () => this.onOpenLesson?.(item.lesson));
      list.append(button);
    }
    section.append(heading, list);
    return section;
  }

  private statusLine(lesson: Lesson, record: LessonProgress): string {
    const score = record.bestScore == null ? '' : ` · nota ${record.bestScore}`;
    if (record.complete) return `${lesson.group} · completa${score}`;
    if (record.stepsTotal > 0) return `${lesson.group} · ${record.stepsDone}/${record.stepsTotal} pasos${score}`;
    return `${lesson.group} · en curso${score}`;
  }
}
