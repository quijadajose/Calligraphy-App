import { Lesson } from '../../types/ink';
import { JAPANESE_TABS, KANJI_LEVELS, PALMER_GROUPS } from '../../data/groups';

const COPY: Record<string, { title: string; blurb: string }> = {
  Ejercicios: { title: 'Trazos de base', blurb: 'Óvalo, empuje y enlaces, antes de las letras.' },
  Minúsculas: { title: 'Minúsculas', blurb: 'Cada letra sola, una vez, antes de llenar la plana.' },
  Mayúsculas: { title: 'Mayúsculas', blurb: 'La mayúscula sola, antes de repetirla en varias líneas.' },
  Enlaces: { title: 'Enlaces', blurb: 'Los pares que más cuestan: br, os, ve, wr… sin levantar la pluma.' },
  Planas: { title: 'Planas', blurb: 'Varias líneas de la misma letra. La primera lleva la guía.' },
  Palabras: { title: 'Palabras', blurb: 'Palabras cortas con las letras ya practicadas.' },
  Oraciones: { title: 'Oraciones', blurb: 'La primera línea lleva la guía. Las de abajo van en blanco. Tus textos también aparecen aquí.' },
  Dictado: { title: 'Dictado', blurb: 'Escucha la frase y escríbela. El texto aparece al entregar.' },
  Hiragana: { title: 'Hiragana', blurb: 'Básicos, sonoros (が, ぱ), pequeños (ゃ, っ) y combinaciones (きゃ).' },
  Katakana: { title: 'Katakana', blurb: 'Los signos de los préstamos, con sonoros y pequeños.' },
  Kanji: { title: 'Kanji', blurb: 'Elige un nivel y copia el orden de cada trazo.' },
  Vocabulario: { title: 'Vocabulario', blurb: 'Palabras con kanji de N5. Un signo por cuadro.' },
  N5: { title: 'Kanji N5', blurb: 'Los primeros kanji, en orden de trazo. Significados en español.' },
  N4: { title: 'Kanji N4', blurb: 'El siguiente nivel, todavía trazo a trazo.' },
  N3: { title: 'Kanji N3', blurb: 'Más piezas. El orden sigue contando.' },
  N2: { title: 'Kanji N2', blurb: 'Formas largas. Empieza por el primer trazo.' },
  N1: { title: 'Kanji N1', blurb: 'Los más densos del curso.' }
};

/**
 * Catálogo de lecciones. Las tarjetas se construyen solo al cambiar de grupo o de búsqueda;
 * el progreso y la selección se actualizan sobre las tarjetas ya puestas.
 */
export class LessonNavigator {
  private category: 'palmer' | 'japanese' = 'palmer';
  private tab = 'Ejercicios';
  private level = 'N5';
  private activeId = '';
  private query = '';
  /** Kanji: por frecuencia (el orden de la fuente) o de menos a más trazos. */
  private kanjiOrder: 'frequency' | 'strokes' = 'frequency';
  private mastery = new Map<string, number>();
  private due = new Set<string>();
  private tiles = new Map<string, HTMLButtonElement>();

  public onSelect?: (lesson: Lesson) => void;

  constructor(
    private lessons: Lesson[],
    private list: HTMLElement,
    private tabs: HTMLElement,
    private levels: HTMLElement,
    private heading: HTMLElement,
    private blurb: HTMLElement,
    private search: HTMLInputElement,
    private filters: { palmer: HTMLButtonElement; kanji: HTMLButtonElement }
  ) {
    this.filters.palmer.addEventListener('click', () => this.setCategory('palmer'));
    this.filters.kanji.addEventListener('click', () => this.setCategory('japanese'));
    let timer = 0;
    this.search.addEventListener('input', () => {
      window.clearTimeout(timer);
      timer = window.setTimeout(() => {
        this.query = this.search.value.trim().toLowerCase();
        this.render();
      }, 120);
    });
    this.render();
  }

  public setLessons(lessons: Lesson[]): void {
    this.lessons = lessons;
    this.render();
  }

  /** Nivel de dominio por lección (0–4) y las que tienen repaso pendiente. */
  public setProgress(mastery: Map<string, number>, due: Set<string>): void {
    this.mastery = mastery;
    this.due = due;
    for (const [id, tile] of this.tiles) this.paintState(tile, id);
  }

  public showGroup(category: 'palmer' | 'japanese', group: string): void {
    this.category = category;
    this.clearQuery();
    if (category === 'japanese' && KANJI_LEVELS.includes(group)) {
      this.tab = 'Kanji';
      this.level = group;
    } else {
      this.tab = group;
    }
    this.render();
  }

  /** Marca la lección como activa y muestra su grupo, sin abrirla. */
  public focus(lesson: Lesson): void {
    this.place(lesson);
    this.activeId = lesson.id;
    this.render();
  }

  public select(lesson: Lesson): void {
    this.focus(lesson);
    this.onSelect?.(lesson);
  }

  private clearQuery(): void {
    this.query = '';
    this.search.value = '';
  }

  private setCategory(category: 'palmer' | 'japanese'): void {
    this.category = category;
    this.tab = category === 'palmer' ? PALMER_GROUPS[0] : JAPANESE_TABS[0];
    this.clearQuery();
    this.render();
  }

  private place(lesson: Lesson): void {
    this.category = lesson.category;
    if (lesson.category === 'japanese' && KANJI_LEVELS.includes(lesson.group)) {
      this.tab = 'Kanji';
      this.level = lesson.group;
      return;
    }
    const tabs = lesson.category === 'palmer' ? PALMER_GROUPS : JAPANESE_TABS;
    this.tab = tabs.includes(lesson.group) ? lesson.group : tabs[0];
  }

  private currentGroup(): string {
    if (this.category === 'japanese' && this.tab === 'Kanji') return this.level;
    return this.tab;
  }

  private visible(): Lesson[] {
    const list = this.lessons.filter((lesson) => {
      if (lesson.category !== this.category) return false;
      if (!this.query) return lesson.group === this.currentGroup();
      const haystack = `${lesson.title} ${lesson.subTitle} ${lesson.characterOrWord} ${lesson.meaning ?? ''}`.toLowerCase();
      return haystack.includes(this.query);
    });
    if (this.kanjiOrder === 'strokes' && this.tab === 'Kanji' && !this.query) {
      return list.map((lesson, index) => ({ lesson, index }))
        .sort((a, b) => (a.lesson.strokesExpected ?? 0) - (b.lesson.strokesExpected ?? 0) || a.index - b.index)
        .map((entry) => entry.lesson);
    }
    return list;
  }

  private render(): void {
    this.filters.palmer.classList.toggle('active', this.category === 'palmer');
    this.filters.kanji.classList.toggle('active', this.category === 'japanese');
    this.filters.palmer.setAttribute('aria-pressed', String(this.category === 'palmer'));
    this.filters.kanji.setAttribute('aria-pressed', String(this.category === 'japanese'));
    this.renderTabs();
    this.renderLevels();
    this.renderCopy();
    const lessons = this.visible();
    this.tiles.clear();
    const fragment = document.createDocumentFragment();
    for (const lesson of lessons) fragment.appendChild(this.tile(lesson));
    this.list.replaceChildren(fragment);
  }

  private renderTabs(): void {
    const names = this.category === 'palmer' ? PALMER_GROUPS : JAPANESE_TABS;
    this.tabs.replaceChildren(
      ...names.map((name) => {
        const button = document.createElement('button');
        button.type = 'button';
        button.className = `board-tab${name === this.tab ? ' active' : ''}`;
        button.setAttribute('role', 'tab');
        button.setAttribute('aria-selected', String(name === this.tab));
        button.textContent = name;
        button.addEventListener('click', () => {
          this.tab = name;
          this.clearQuery();
          this.render();
        });
        return button;
      })
    );
  }

  private renderLevels(): void {
    const show = this.category === 'japanese' && this.tab === 'Kanji' && !this.query;
    this.levels.hidden = !show;
    if (!show) {
      this.levels.replaceChildren();
      return;
    }
    const order = document.createElement('button');
    order.type = 'button';
    order.className = 'board-level board-order';
    order.textContent = this.kanjiOrder === 'strokes' ? 'Orden: de menos a más trazos' : 'Orden: por frecuencia';
    order.setAttribute('aria-label', `Cambiar orden. Ahora: ${order.textContent}`);
    order.addEventListener('click', () => {
      this.kanjiOrder = this.kanjiOrder === 'strokes' ? 'frequency' : 'strokes';
      this.render();
    });
    this.levels.replaceChildren(
      ...KANJI_LEVELS.map((level) => {
        const button = document.createElement('button');
        button.type = 'button';
        button.className = `board-level${level === this.level ? ' active' : ''}`;
        button.setAttribute('aria-pressed', String(level === this.level));
        button.textContent = level;
        button.addEventListener('click', () => {
          this.level = level;
          this.render();
        });
        return button;
      }),
      order
    );
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

  private paintState(card: HTMLButtonElement, id: string): void {
    const level = this.mastery.get(id) ?? 0;
    card.dataset.mastery = String(level);
    card.classList.toggle('is-done', level >= 2);
    card.classList.toggle('is-started', level === 1);
    card.classList.toggle('is-due', this.due.has(id));
    card.classList.toggle('active', id === this.activeId);
    const label = card.dataset.label ?? '';
    const state = this.due.has(id) ? ', repaso pendiente' : level >= 2 ? ', aprendida' : level === 1 ? ', en curso' : '';
    card.setAttribute('aria-label', `${label}${state}`);
  }

  private tile(lesson: Lesson): HTMLButtonElement {
    const face = this.face(lesson);
    const card = document.createElement('button');
    card.type = 'button';
    card.className = `lesson-card glyph-tile${face.span}`;
    card.dataset.script = lesson.category;
    card.dataset.label = `${lesson.title} ${lesson.subTitle}`.trim();

    const glyph = document.createElement('span');
    glyph.className = 'glyph-tile-char';
    glyph.textContent = face.glyph;
    glyph.setAttribute('aria-hidden', 'true');

    const caption = document.createElement('span');
    caption.className = 'glyph-tile-read';
    caption.textContent = face.caption;
    caption.setAttribute('aria-hidden', 'true');

    const bar = document.createElement('span');
    bar.className = 'glyph-tile-bar';
    bar.setAttribute('aria-hidden', 'true');

    card.append(glyph);
    if (face.caption) card.append(caption);
    card.append(bar);
    this.paintState(card, lesson.id);
    this.tiles.set(lesson.id, card);
    card.addEventListener('click', () => {
      const previousId = this.activeId;
      this.activeId = lesson.id;
      const previous = this.tiles.get(previousId);
      if (previous) this.paintState(previous, previousId);
      this.paintState(card, lesson.id);
      this.onSelect?.(lesson);
    });
    return card;
  }

  private face(lesson: Lesson): { glyph: string; caption: string; span: string } {
    const text = lesson.characterOrWord.trim();
    const single = Array.from(text).length === 1;
    const reading = lesson.reading ?? (lesson.title.includes('  ') ? lesson.title.split('  ').slice(1).join(' ').trim() : '');
    if (single && lesson.group !== 'Ejercicios') {
      return { glyph: text, caption: reading, span: '' };
    }
    if (lesson.category === 'japanese' && !lesson.dictation) {
      return { glyph: text, caption: [reading, lesson.meaning].filter(Boolean).join(' · '), span: Array.from(text).length > 3 ? ' glyph-tile-wide' : '' };
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
