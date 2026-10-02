import { Lesson } from '../../types/ink';
import { PALMER_GROUPS } from '../../data/lessons';

const KANJI_LEVELS = ['N5', 'N4', 'N3', 'N2', 'N1'];
const JP_TABS = ['Hiragana', 'Katakana', 'Kanji', 'Dictado'];

const COPY: Record<string, { title: string; blurb: string }> = {
  Ejercicios: { title: 'Trazos de base', blurb: 'Óvalo, empuje y enlaces, antes de las letras.' },
  Minúsculas: { title: 'Minúsculas', blurb: 'Cada letra sola, una vez, antes de llenar la plana.' },
  Mayúsculas: { title: 'Mayúsculas', blurb: 'La mayúscula sola, antes de repetirla en varias líneas.' },
  Planas: { title: 'Planas', blurb: 'Varias líneas de la misma letra. La primera lleva la guía.' },
  Palabras: { title: 'Palabras', blurb: 'Palabras cortas con las letras ya practicadas.' },
  Oraciones: { title: 'Oraciones', blurb: 'La primera línea lleva la guía. Las de abajo van en blanco.' },
  Dictado: { title: 'Dictado', blurb: 'Escucha la frase y escríbela.' },
  Hiragana: { title: 'Hiragana', blurb: 'Los signos de las palabras japonesas.' },
  Katakana: { title: 'Katakana', blurb: 'Los signos de los préstamos.' },
  Kanji: { title: 'Kanji', blurb: 'Elige un nivel y copia el orden de cada trazo.' },
  N5: { title: 'Kanji N5', blurb: 'Los primeros kanji, en orden de trazo.' },
  N4: { title: 'Kanji N4', blurb: 'El siguiente nivel, todavía trazo a trazo.' },
  N3: { title: 'Kanji N3', blurb: 'Más piezas. El orden sigue contando.' },
  N2: { title: 'Kanji N2', blurb: 'Formas largas. Empieza por el primer trazo.' },
  N1: { title: 'Kanji N1', blurb: 'Los más densos del curso.' }
};

export class LessonNavigator {
  private category: 'palmer' | 'japanese' = 'palmer';
  private tab = 'Ejercicios';
  private level = 'N5';
  private activeId = '';
  private query = '';
  private done = new Set<string>();
  private started = new Set<string>();

  public onSelect?: (lesson: Lesson) => void;

  constructor(
    private lessons: Lesson[],
    private list: HTMLElement,
    private tabs: HTMLElement,
    private levels: HTMLElement,
    private heading: HTMLElement,
    private blurb: HTMLElement,
    private search: HTMLInputElement,
    private filters: { palmer: HTMLButtonElement; kanji: HTMLButtonElement },
    private badge: HTMLElement
  ) {
    this.filters.palmer.addEventListener('click', () => this.setCategory('palmer'));
    this.filters.kanji.addEventListener('click', () => this.setCategory('japanese'));
    this.search.addEventListener('input', () => {
      this.query = this.search.value.trim().toLowerCase();
      this.render();
    });
    this.render();
  }

  public current(): Lesson {
    return this.lessons.find((lesson) => lesson.id === this.activeId) ?? this.visible()[0] ?? this.lessons[0];
  }

  public setProgress(started: string[], done: string[]): void {
    this.started = new Set(started);
    this.done = new Set(done);
    this.render();
  }

  public showGroup(category: 'palmer' | 'japanese', group: string): void {
    this.category = category;
    this.query = '';
    this.search.value = '';
    if (category === 'japanese' && KANJI_LEVELS.includes(group)) {
      this.tab = 'Kanji';
      this.level = group;
    } else {
      this.tab = group;
    }
    this.syncChrome();
    this.render();
  }

  public select(lesson: Lesson): void {
    this.place(lesson);
    this.activeId = lesson.id;
    this.syncChrome();
    this.render();
    this.onSelect?.(lesson);
  }

  private setCategory(category: 'palmer' | 'japanese'): void {
    this.category = category;
    this.tab = category === 'palmer' ? PALMER_GROUPS[0] : 'Hiragana';
    this.query = '';
    this.search.value = '';
    this.syncChrome();
    this.render();
  }

  private place(lesson: Lesson): void {
    this.category = lesson.category;
    if (lesson.category === 'japanese' && KANJI_LEVELS.includes(lesson.group)) {
      this.tab = 'Kanji';
      this.level = lesson.group;
      return;
    }
    const tabs = lesson.category === 'palmer' ? PALMER_GROUPS : JP_TABS;
    this.tab = tabs.includes(lesson.group) ? lesson.group : tabs[0];
  }

  private currentGroup(): string {
    if (this.category === 'japanese' && this.tab === 'Kanji') return this.level;
    return this.tab;
  }

  private syncChrome(): void {
    this.badge.textContent = this.category === 'palmer' ? 'Palmer Cursiva' : 'Kanji / Kana';
    this.filters.palmer.classList.toggle('active', this.category === 'palmer');
    this.filters.kanji.classList.toggle('active', this.category === 'japanese');
  }

  private visible(): Lesson[] {
    return this.lessons.filter((lesson) => {
      if (lesson.category !== this.category) return false;
      if (!this.query) return lesson.group === this.currentGroup();
      const haystack = `${lesson.title} ${lesson.subTitle} ${lesson.characterOrWord}`.toLowerCase();
      return haystack.includes(this.query);
    });
  }

  private render(): void {
    this.renderTabs();
    this.renderLevels();
    this.renderCopy();
    const lessons = this.visible();
    this.list.innerHTML = '';
    for (const lesson of lessons) {
      this.list.appendChild(this.tile(lesson));
    }
  }

  private renderTabs(): void {
    const names = this.category === 'palmer' ? PALMER_GROUPS : JP_TABS;
    this.tabs.innerHTML = '';
    for (const name of names) {
      const button = document.createElement('button');
      button.type = 'button';
      button.className = `board-tab${name === this.tab ? ' active' : ''}`;
      button.setAttribute('role', 'tab');
      button.setAttribute('aria-selected', String(name === this.tab));
      button.textContent = name;
      button.addEventListener('click', () => {
        this.tab = name;
        this.query = '';
        this.search.value = '';
        this.render();
      });
      this.tabs.appendChild(button);
    }
  }

  private renderLevels(): void {
    const show = this.category === 'japanese' && this.tab === 'Kanji' && !this.query;
    this.levels.hidden = !show;
    this.levels.innerHTML = '';
    if (!show) return;
    for (const level of KANJI_LEVELS) {
      const button = document.createElement('button');
      button.type = 'button';
      button.className = `board-level${level === this.level ? ' active' : ''}`;
      button.textContent = level;
      button.addEventListener('click', () => {
        this.level = level;
        this.render();
      });
      this.levels.appendChild(button);
    }
  }

  private renderCopy(): void {
    if (this.query) {
      this.heading.textContent = 'Resultados';
      this.blurb.textContent = `${this.visible().length} coincidencias`;
      return;
    }
    const key = this.currentGroup();
    const copy = COPY[key] ?? COPY[this.tab] ?? { title: key, blurb: '' };
    this.heading.textContent = copy.title;
    this.blurb.textContent = copy.blurb;
  }

  private tile(lesson: Lesson): HTMLButtonElement {
    const face = this.face(lesson);
    const card = document.createElement('button');
    card.type = 'button';
    const state = this.done.has(lesson.id) ? ' is-done' : this.started.has(lesson.id) ? ' is-started' : '';
    card.className = `lesson-card glyph-tile${face.span}${lesson.id === this.activeId ? ' active' : ''}${state}`;
    card.dataset.script = lesson.category;

    const glyph = document.createElement('span');
    glyph.className = 'glyph-tile-char';
    glyph.textContent = face.glyph;

    const caption = document.createElement('span');
    caption.className = 'glyph-tile-read';
    caption.textContent = face.caption;

    const bar = document.createElement('span');
    bar.className = 'glyph-tile-bar';
    bar.setAttribute('aria-hidden', 'true');

    card.append(glyph, caption, bar);
    if (this.done.has(lesson.id)) {
      const check = document.createElement('i');
      check.className = 'ti ti-circle-check tile-check-icon';
      card.append(check);
    }
    card.addEventListener('click', () => {
      this.place(lesson);
      this.activeId = lesson.id;
      this.syncChrome();
      this.render();
      this.onSelect?.(lesson);
    });
    return card;
  }

  private face(lesson: Lesson): { glyph: string; caption: string; span: string } {
    const text = lesson.characterOrWord.trim();
    const single = Array.from(text).length === 1;
    const reading = lesson.title.includes('  ') ? lesson.title.split('  ').slice(1).join(' ').trim() : '';
    if (single && lesson.group !== 'Ejercicios') {
      const steps = lesson.steps?.length ?? 0;
      return { glyph: text, caption: reading || (steps ? `${steps} pasos` : ''), span: '' };
    }
    const titleChars = Array.from(lesson.title);
    if (titleChars.length === 1) {
      return { glyph: lesson.title, caption: lesson.subTitle, span: '' };
    }
    return {
      glyph: lesson.title,
      caption: lesson.subTitle,
      span: titleChars.length > 18 ? ' glyph-tile-full' : ' glyph-tile-wide'
    };
  }
}
