import { SavedSheet } from '../../core/storage/SheetStore';
import { GroupStat, LessonProgress, MASTERY_LABELS, ProgressView, masteryLevel } from '../../core/progress/ProgressStore';
import { Lesson } from '../../types/ink';
import { MONTH_NAMES, MonthStatus } from '../../core/challenges/Challenges';
import { medalName, medalSvg } from '../medals';
import { Achievement } from '../../core/achievements/Achievements';

function formatMinutes(ms: number): string {
  const minutes = Math.round(ms / 60000);
  if (minutes < 60) return `${minutes} min`;
  return `${Math.floor(minutes / 60)} h ${minutes % 60} min`;
}

export class ProgressDashboard {
  public onOpenGroup?: (category: 'palmer' | 'japanese', group: string) => void;
  public onOpenLesson?: (lesson: Lesson) => void;
  public onDeleteSheets?: (lessonId: string) => void;
  public onExport?: () => void;
  public onImport?: () => void;

  private gallery: HTMLElement | null = null;

  constructor(private root: HTMLElement) {}

  public render(
    view: ProgressView,
    goalMinutes: number,
    lessonsById: Map<string, Lesson>,
    medals?: { earned: Set<string>; current: MonthStatus },
    achievements?: Achievement[]
  ): void {
    this.root.replaceChildren();
    this.root.append(this.summary(view));
    if (medals) this.root.append(this.medalShelf(medals.earned, medals.current));
    if (achievements?.length) this.root.append(this.achievementGrid(achievements));
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

  private achievementGrid(list: Achievement[]): HTMLElement {
    const section = document.createElement('section');
    section.className = 'progress-section';
    const heading = document.createElement('h3');
    const levels = list.reduce((sum, item) => sum + item.level, 0);
    const max = list.reduce((sum, item) => sum + item.maxLevel, 0);
    heading.textContent = `Logros · ${levels} de ${max} niveles`;
    const grid = document.createElement('ul');
    grid.className = 'ach-grid';
    // Primero los que ya tienen algún nivel; dentro, el orden de siempre.
    const ordered = [...list].sort((a, b) => Number(b.level > 0) - Number(a.level > 0));
    for (const item of ordered) {
      const card = document.createElement('li');
      card.className = `ach-card${item.level === 0 ? ' is-locked' : ''}${item.next === null ? ' is-max' : ''}`;
      card.style.setProperty('--ach', item.color);
      const badge = document.createElement('span');
      badge.className = 'ach-badge';
      badge.setAttribute('aria-hidden', 'true');
      badge.innerHTML = `<svg viewBox="0 0 64 64"><path class="ach-hex" d="M32 3 L57 17.5 V46.5 L32 61 L7 46.5 V17.5 Z"/><path class="ach-hex-in" d="M32 10 L51 21 V43 L32 54 L13 43 V21 Z"/></svg><i class="ti ${item.icon}"></i>`;
      const level = document.createElement('span');
      level.className = 'ach-level';
      level.textContent = item.next === null ? '★' : String(item.level);
      badge.append(level);
      const body = document.createElement('div');
      body.className = 'ach-body';
      const name = document.createElement('span');
      name.className = 'ach-name';
      name.textContent = item.name;
      const meta = document.createElement('span');
      meta.className = 'ach-meta';
      meta.textContent = item.next === null ? `Nivel máximo (${item.maxLevel})` : `Nivel ${item.level} de ${item.maxLevel}`;
      const text = document.createElement('span');
      text.className = 'ach-text';
      text.textContent = item.description;
      body.append(name, meta, text);
      if (item.next !== null) {
        const bar = document.createElement('span');
        bar.className = 'ach-bar';
        const fill = document.createElement('span');
        const from = item.reached;
        const ratio = (item.value - from) / Math.max(1, item.next - from);
        fill.style.width = `${Math.round(Math.max(0, Math.min(1, ratio)) * 100)}%`;
        const count = document.createElement('span');
        count.className = 'ach-count';
        count.textContent = `${item.value.toLocaleString('es')} / ${item.next.toLocaleString('es')}`;
        bar.append(fill);
        body.append(bar, count);
      }
      card.append(badge, body);
      card.setAttribute('aria-label', `${item.name}: ${meta.textContent}. ${item.description}${item.next !== null ? `, ${item.value} de ${item.next}` : ''}`);
      grid.append(card);
    }
    section.append(heading, grid);
    return section;
  }

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
      const card = document.createElement('div');
      card.className = 'sheet-card';
      const head = document.createElement('div');
      head.className = 'sheet-card-head';
      const title = document.createElement('button');
      title.type = 'button';
      title.className = 'sheet-card-title';
      title.textContent = `${newest.title} · ${list.length} ${list.length === 1 ? 'hoja' : 'hojas'}`;
      const remove = document.createElement('button');
      remove.type = 'button';
      remove.className = 'ib danger sheet-card-delete';
      remove.setAttribute('aria-label', `Borrar las hojas de ${newest.title}`);
      remove.title = 'Borrar estas hojas';
      remove.innerHTML = '<i class="ti ti-trash" aria-hidden="true"></i>';
      remove.addEventListener('click', () => {
        const what = list.length === 1 ? 'la hoja guardada' : `las ${list.length} hojas guardadas`;
        if (!confirm(`¿Borrar ${what} de «${newest.title}»? El progreso de la lección no cambia.`)) return;
        card.remove();
        this.onDeleteSheets?.(lessonId);
      });
      head.append(title, remove);
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
      card.append(head, pair);
      const lesson = this.lessonsById.get(lessonId);
      if (lesson) {
        title.addEventListener('click', () => this.onOpenLesson?.(lesson));
        pair.addEventListener('click', () => this.onOpenLesson?.(lesson));
      }
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

  /** Mapa de calor del último año, como el de GitHub: columnas por semana, filas de lunes a domingo. */
  private calendar(days: { key: string; ms: number }[], goalMinutes: number): HTMLElement {
    const section = document.createElement('section');
    section.className = 'progress-section';
    const heading = document.createElement('h3');
    heading.textContent = 'Último año';
    const scroller = document.createElement('div');
    scroller.className = 'heatmap-scroll';
    const grid = document.createElement('div');
    grid.className = 'heatmap';
    grid.setAttribute('role', 'img');
    const active = days.filter((day) => day.ms > 0).length;
    grid.setAttribute('aria-label', `${active} días con práctica en el último año`);
    const first = new Date(`${days[0]?.key ?? ''}T12:00:00`);
    const offset = Number.isNaN(first.getTime()) ? 0 : (first.getDay() + 6) % 7;
    const weeks = Math.ceil((days.length + offset) / 7);
    grid.style.setProperty('--weeks', String(weeks));

    for (const [row, label] of [[0, 'L'], [2, 'X'], [4, 'V']] as const) {
      const name = document.createElement('span');
      name.className = 'heat-day';
      name.textContent = label;
      name.style.gridRow = String(row + 2);
      grid.append(name);
    }

    let lastMonth = -1;
    days.forEach((day, index) => {
      const slot = index + offset;
      const week = Math.floor(slot / 7);
      const date = new Date(`${day.key}T12:00:00`);
      const month = date.getMonth();
      // El nombre del mes va sobre la primera semana que empieza en él.
      if (slot % 7 === 0 && month !== lastMonth) {
        if (lastMonth !== -1 || date.getDate() <= 7) {
          const label = document.createElement('span');
          label.className = 'heat-month';
          label.textContent = MONTH_NAMES[month].slice(0, 3);
          label.style.gridColumn = `${week + 2} / span 4`;
          grid.append(label);
        }
        lastMonth = month;
      }
      const cell = document.createElement('span');
      const level = day.ms <= 0 ? 0 : Math.min(4, 1 + Math.floor((day.ms / (goalMinutes * 60000)) * 3));
      cell.className = 'heat-cell';
      cell.dataset.level = String(level);
      cell.style.gridColumn = String(week + 2);
      cell.style.gridRow = String((slot % 7) + 2);
      cell.title = `${date.toLocaleDateString()}: ${formatMinutes(day.ms)}`;
      grid.append(cell);
    });

    scroller.append(grid);
    section.append(heading, scroller);
    // En pantallas angostas se ve primero lo más reciente.
    requestAnimationFrame(() => { scroller.scrollLeft = scroller.scrollWidth; });
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
