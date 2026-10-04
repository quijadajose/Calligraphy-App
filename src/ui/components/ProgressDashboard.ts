import { SavedSheet } from '../../core/storage/SheetStore';
import { GroupStat, LessonProgress, MASTERY_LABELS, ProgressView, masteryLevel } from '../../core/progress/ProgressStore';
import { Lesson } from '../../types/ink';
import { MONTH_NAMES, MonthStatus } from '../../core/challenges/Challenges';
import { medalName, medalSvg } from '../medals';

function formatMinutes(ms: number): string {
  const minutes = Math.round(ms / 60000);
  if (minutes < 60) return `${minutes} min`;
  return `${Math.floor(minutes / 60)} h ${minutes % 60} min`;
}

export class ProgressDashboard {
  public onOpenGroup?: (category: 'palmer' | 'japanese', group: string) => void;
  public onOpenLesson?: (lesson: Lesson) => void;
  public onExport?: () => void;
  public onImport?: () => void;

  private gallery: HTMLElement | null = null;

  constructor(private root: HTMLElement) {}

  public render(
    view: ProgressView,
    goalMinutes: number,
    lessonsById: Map<string, Lesson>,
    medals?: { earned: Set<string>; current: MonthStatus }
  ): void {
    this.root.replaceChildren();
    this.root.append(this.summary(view));
    if (medals) this.root.append(this.medalShelf(medals.earned, medals.current));
    this.root.append(this.calendar(view.days, goalMinutes));
    if (view.complete === 0 && view.started === 0) {
      const empty = document.createElement('p');
      empty.className = 'progress-empty';
      empty.textContent = 'Todavía no hay práctica guardada. El avance aparece al terminar un paso, calificar o entregar un dictado.';
      this.root.append(empty);
    }
    if (view.recent.length > 0) this.root.append(this.recentList(view.recent));

    this.gallery = document.createElement('section');
    this.gallery.className = 'progress-section';
    const galleryTitle = document.createElement('h3');
    galleryTitle.textContent = 'Hojas guardadas';
    const galleryBody = document.createElement('div');
    galleryBody.className = 'sheet-gallery';
    galleryBody.textContent = 'Cargando…';
    this.gallery.append(galleryTitle, galleryBody);
    this.gallery.dataset.lessons = '';
    this.root.append(this.gallery);
    this.lessonsById = lessonsById;

    for (const section of view.sections) {
      const block = document.createElement('section');
      block.className = 'progress-section';
      const heading = document.createElement('h3');
      heading.textContent = section.title;
      block.append(heading);
      for (const group of section.groups) if (group.total > 0) block.append(this.groupRow(group));
      this.root.append(block);
    }

    const backupCard = document.createElement('div');
    backupCard.className = 'card backup-card';
    backupCard.innerHTML = `
      <i class="ti ti-database" aria-hidden="true"></i>
      <div class="backup-text">
        <div class="backup-title">Tus datos viven en este dispositivo</div>
        <div class="mu">Guarda una copia por si borras los datos del navegador.</div>
      </div>`;
    const importButton = document.createElement('button');
    importButton.type = 'button';
    importButton.className = 'b2';
    importButton.textContent = 'Importar';
    importButton.addEventListener('click', () => this.onImport?.());
    const exportButton = document.createElement('button');
    exportButton.type = 'button';
    exportButton.className = 'go';
    exportButton.textContent = 'Exportar respaldo';
    exportButton.addEventListener('click', () => this.onExport?.());
    backupCard.append(importButton, exportButton);
    this.root.append(backupCard);
  }

  private lessonsById = new Map<string, Lesson>();

  /** Las doce medallas del año: ganadas en color, el mes en curso con su avance. */
  private medalShelf(earned: Set<string>, current: MonthStatus): HTMLElement {
    const section = document.createElement('section');
    section.className = 'progress-section';
    const heading = document.createElement('h3');
    heading.textContent = `Medallas de ${current.year}`;
    const shelf = document.createElement('ul');
    shelf.className = 'medal-shelf';
    for (let month = 0; month < 12; month++) {
      const key = `${current.year}-${String(month + 1).padStart(2, '0')}`;
      const won = earned.has(key);
      const item = document.createElement('li');
      item.className = `medal-slot${won ? ' is-earned' : ''}${month === current.month ? ' is-current' : ''}`;
      const caption = document.createElement('span');
      caption.className = 'medal-slot-name';
      caption.textContent = MONTH_NAMES[month];
      const note = document.createElement('span');
      note.className = 'medal-slot-note';
      note.textContent = won
        ? medalName(month)
        : month === current.month
          ? `${current.count} / ${current.target}`
          : '';
      item.innerHTML = medalSvg(month, won || (month === current.month ? 'pending' : false), 64);
      item.append(caption, note);
      item.setAttribute('aria-label', `${MONTH_NAMES[month]}: ${won ? `medalla ganada, ${medalName(month)}` : note.textContent || 'por llegar'}`);
      shelf.append(item);
    }
    section.append(heading, shelf);
    return section;
  }

  /** Galería de hojas: por lección, la primera y la última lado a lado. */
  public renderSheets(sheets: SavedSheet[]): void {
    const body = this.gallery?.querySelector('.sheet-gallery');
    if (!body) return;
    body.replaceChildren();
    if (sheets.length === 0) {
      body.textContent = 'Cada vez que calificas, la hoja se guarda aquí para comparar con el tiempo.';
      return;
    }
    const byLesson = new Map<string, SavedSheet[]>();
    for (const sheet of sheets) {
      const list = byLesson.get(sheet.lessonId) ?? [];
      list.push(sheet);
      byLesson.set(sheet.lessonId, list);
    }
    for (const [lessonId, list] of [...byLesson.entries()].slice(0, 12)) {
      const newest = list[0];
      const oldest = list[list.length - 1];
      const card = document.createElement('button');
      card.type = 'button';
      card.className = 'sheet-card';
      const title = document.createElement('span');
      title.className = 'sheet-card-title';
      title.textContent = `${newest.title} · ${list.length} ${list.length === 1 ? 'hoja' : 'hojas'}`;
      const pair = document.createElement('span');
      pair.className = 'sheet-pair';
      const shots = list.length > 1 ? [oldest, newest] : [newest];
      for (const sheet of shots) {
        const figure = document.createElement('span');
        figure.className = 'sheet-shot';
        const image = document.createElement('img');
        image.src = sheet.thumb;
        image.alt = `${sheet.title}, ${new Date(sheet.at).toLocaleDateString()}, nota ${sheet.score}`;
        image.loading = 'lazy';
        const caption = document.createElement('span');
        caption.textContent = `${sheet === oldest && list.length > 1 ? 'Antes' : 'Ahora'} · ${sheet.score} · ${new Date(sheet.at).toLocaleDateString()}`;
        figure.append(image, caption);
        pair.append(figure);
      }
      card.append(title, pair);
      const lesson = this.lessonsById.get(lessonId);
      if (lesson) card.addEventListener('click', () => this.onOpenLesson?.(lesson));
      body.append(card);
    }
  }

  private summary(view: ProgressView): HTMLElement {
    const wrap = document.createElement('div');
    wrap.className = 'progress-summary';
    const percent = view.total === 0 ? 0 : Math.round((view.complete / view.total) * 100);
    wrap.append(this.stat('Racha', `${view.streak} ${view.streak === 1 ? 'día' : 'días'}`));
    wrap.append(this.stat('Hoy', formatMinutes(view.todayMs)));
    wrap.append(this.stat('Total practicado', formatMinutes(view.totalMs)));
    wrap.append(this.stat('Aprendidas', `${view.complete}/${view.total}`));
    wrap.append(this.stat('Repasos pendientes', String(view.dueCount)));
    wrap.append(this.stat('Nota media', view.averageScore == null ? '—' : String(view.averageScore)));
    const bar = document.createElement('div');
    bar.className = 'progress-meter';
    bar.setAttribute('role', 'meter');
    bar.setAttribute('aria-valuemin', '0');
    bar.setAttribute('aria-valuemax', String(view.total));
    bar.setAttribute('aria-valuenow', String(view.complete));
    bar.setAttribute('aria-label', 'Lecciones aprendidas');
    const fill = document.createElement('span');
    fill.style.width = `${percent}%`;
    bar.append(fill);
    wrap.append(bar);
    return wrap;
  }

  /** Mapa de calor de las últimas 12 semanas: cada cuadro es un día, más oscuro cuanto más cerca de la meta. */
  private calendar(days: { key: string; ms: number }[], goalMinutes: number): HTMLElement {
    const section = document.createElement('section');
    section.className = 'progress-section';
    const heading = document.createElement('h3');
    heading.textContent = 'Últimas 12 semanas';
    const grid = document.createElement('div');
    grid.className = 'heatmap';
    grid.setAttribute('role', 'img');
    const active = days.filter((day) => day.ms > 0).length;
    grid.setAttribute('aria-label', `${active} días con práctica en las últimas 12 semanas`);
    const first = new Date(`${days[0]?.key ?? ''}T12:00:00`);
    const offset = Number.isNaN(first.getTime()) ? 0 : (first.getDay() + 6) % 7;
    for (let i = 0; i < offset; i++) grid.append(document.createElement('span'));
    for (const day of days) {
      const cell = document.createElement('span');
      const level = day.ms <= 0 ? 0 : Math.min(4, 1 + Math.floor((day.ms / (goalMinutes * 60000)) * 3));
      cell.className = 'heat-cell';
      cell.dataset.level = String(level);
      cell.title = `${day.key}: ${formatMinutes(day.ms)}`;
      grid.append(cell);
    }
    section.append(heading, grid);
    return section;
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
      title.className = 'recent-title';
      title.textContent = item.lesson.title;
      const meta = document.createElement('span');
      meta.className = 'recent-meta';
      meta.textContent = this.statusLine(item.lesson, item.record);
      button.append(title, meta);
      if (item.record.scores.length > 1) button.append(this.sparkline(item.record.scores.map((entry) => entry.score)));
      button.addEventListener('click', () => this.onOpenLesson?.(item.lesson));
      list.append(button);
    }
    section.append(heading, list);
    return section;
  }

  /** Evolución de la nota en los últimos intentos. */
  private sparkline(scores: number[]): SVGSVGElement {
    const width = 88;
    const height = 24;
    const svg = document.createElementNS('http://www.w3.org/2000/svg', 'svg');
    svg.setAttribute('viewBox', `0 0 ${width} ${height}`);
    svg.setAttribute('class', 'sparkline');
    svg.setAttribute('role', 'img');
    svg.setAttribute('aria-label', `Notas: ${scores.join(', ')}`);
    const points = scores.map((score, index) => {
      const x = scores.length === 1 ? width / 2 : (index / (scores.length - 1)) * (width - 4) + 2;
      const y = height - 2 - (score / 100) * (height - 4);
      return `${x.toFixed(1)},${y.toFixed(1)}`;
    });
    const line = document.createElementNS('http://www.w3.org/2000/svg', 'polyline');
    line.setAttribute('points', points.join(' '));
    const pass = document.createElementNS('http://www.w3.org/2000/svg', 'line');
    const passY = (height - 2 - 0.7 * (height - 4)).toFixed(1);
    pass.setAttribute('x1', '0');
    pass.setAttribute('x2', String(width));
    pass.setAttribute('y1', passY);
    pass.setAttribute('y2', passY);
    pass.setAttribute('class', 'spark-pass');
    svg.append(pass, line);
    return svg;
  }

  private statusLine(lesson: Lesson, record: LessonProgress): string {
    const level = MASTERY_LABELS[masteryLevel(record)];
    const score = record.lastScore == null ? '' : ` · última ${record.lastScore}`;
    const due = record.dueAt == null ? '' : record.dueAt <= Date.now() ? ' · repasar hoy' : ` · repaso ${new Date(record.dueAt).toLocaleDateString()}`;
    if (record.stepsTotal > 0 && !record.complete) return `${lesson.group} · ${record.stepsDone}/${record.stepsTotal} pasos`;
    return `${lesson.group} · ${level}${score}${due}`;
  }
}
