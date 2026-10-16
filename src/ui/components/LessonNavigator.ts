import { Lesson } from '../../types/ink';
import { DICTATION_LEVELS, JAPANESE_TABS, KANJI_LEVELS, LETTER_STYLES, PALMER_GROUPS } from '../../data/groups';
import { letterSvg } from '../glyphSvg';

const COPY: Record<string, { title: string; blurb: string }> = {
  Ejercicios: { title: 'Trazos de base', blurb: 'Soltura (lazos, arcos, ondas…) y trazos de base: calientan la mano antes de las letras.' },
  Imprenta: { title: 'Imprenta', blurb: 'Letra de molde: recta, sin inclinar y con cada letra separada. Primero las minúsculas, luego las mayúsculas.' },
  Ligada: { title: 'Ligada', blurb: 'La cursiva escolar: cada letra entra desde la base y sale hacia la siguiente, sin levantar el lápiz. Después de cada letra viene su plana.' },
  Itálica: { title: 'Itálica', blurb: 'Letra de pluma, estrecha y apenas inclinada: los arcos nacen del palote. Mayúsculas romanas estrechas.' },
  Copperplate: { title: 'Copperplate', blurb: 'La cursiva inglesa clásica, muy inclinada (55°): fina al subir y gruesa al bajar. Mejor con un lápiz con presión.' },
  Enlaces: { title: 'Enlaces', blurb: 'Los pares que más cuestan: br, os, ve, wr… sin levantar la pluma.' },
  Planas: { title: 'Planas', blurb: 'La misma letra muchas veces: primero se repasa el punteado y después se escribe sin guía.' },
  Palabras: { title: 'Palabras', blurb: 'Palabras cortas con las letras ya practicadas.' },
  Oraciones: { title: 'Oraciones', blurb: 'Las líneas punteadas se repasan y las de abajo van en blanco. Tus textos también aparecen aquí.' },
  Dictado: { title: 'Dictado', blurb: 'Escucha la frase y escríbela. El texto aparece al entregar.' },
  Hiragana: { title: 'Hiragana', blurb: 'Básicos, sonoros (が, ぱ), pequeños (ゃ, っ) y combinaciones (きゃ).' },
  Katakana: { title: 'Katakana', blurb: 'Los signos de los préstamos, con sonoros y pequeños.' },
  Kanji: { title: 'Kanji', blurb: 'Elige un nivel y copia el orden de cada trazo.' },
  Vocabulario: { title: 'Vocabulario', blurb: 'Palabras con kanji de N5. Un signo por cuadro.' },
  N5: { title: 'Kanji N5', blurb: 'Los primeros kanji, en orden de trazo. Significados en español.' },
  N4: { title: 'Kanji N4', blurb: 'El siguiente nivel, todavía trazo a trazo.' },
  N3: { title: 'Kanji N3', blurb: 'Más piezas. El orden sigue contando.' },
  N2: { title: 'Kanji N2', blurb: 'Formas largas. Empieza por el primer trazo.' },
  N1: { title: 'Kanji N1', blurb: 'Los más densos del curso.' },
  'Dictado Kana': { title: 'Dictado · Kana', blurb: 'Frases solo en hiragana y katakana. Escucha, escribe un signo por cuadro y entrega.' },
  'Dictado N5': { title: 'Dictado · N5', blurb: 'Frases con kanji de N5 y kana. La pista en español aclara las palabras que suenan igual.' },
  'Dictado N4': { title: 'Dictado · N4', blurb: 'Frases con kanji hasta N4.' },
  'Dictado N3': { title: 'Dictado · N3', blurb: 'Frases con kanji hasta N3.' },
  'Dictado N2': { title: 'Dictado · N2', blurb: 'Frases con kanji hasta N2.' },
  'Dictado N1': { title: 'Dictado · N1', blurb: 'Frases con cualquier kanji del curso.' }
};

const JP_DICTATION = 'Dictado';
/** Tarjetas por tanda: los grupos grandes (kanji N1, dictados N1…) se muestran de a poco. */
const PAGE_SIZE = 120;
const dictationGroup = (level: string) => `Dictado ${level}`;

/**
 * Catálogo de lecciones. Las tarjetas se construyen solo al cambiar de grupo o de búsqueda;
 * el progreso y la selección se actualizan sobre las tarjetas ya puestas.
 */
export class LessonNavigator {
  private category: 'palmer' | 'japanese' = 'palmer';
  private tab = 'Ejercicios';
  private level = 'N5';
  /** Nivel elegido en la pestaña Dictado de japonés. */
  private dictationLevel = 'Kana';
  private activeId = '';
  private query = '';
  /** Kanji: por frecuencia (el orden de la fuente) o de menos a más trazos. */
  private kanjiOrder: 'frequency' | 'strokes' = 'frequency';
  private mastery = new Map<string, number>();
  private due = new Set<string>();
  private tiles = new Map<string, HTMLButtonElement>();
  /** Cuántas tarjetas del grupo actual están puestas, y de qué grupo (para volver a la primera tanda). */
  private shown = PAGE_SIZE;
  private shownKey = '';

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
    } else if (category === 'japanese' && group.startsWith(`${JP_DICTATION} `)) {
      this.tab = JP_DICTATION;
      this.dictationLevel = group.slice(JP_DICTATION.length + 1);
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

  /** Estilos de letra elegidos en Ajustes: las demás pestañas de estilo se esconden. */
  private scripts: string[] = [...LETTER_STYLES];

  public setScripts(scripts: string[]): void {
    this.scripts = scripts;
    if (this.category === 'palmer' && !this.palmerTabs().includes(this.tab)) this.tab = this.palmerTabs()[0];
    this.render();
  }

  private palmerTabs(): string[] {
    return PALMER_GROUPS.filter((name) => !LETTER_STYLES.includes(name) || this.scripts.includes(name));
  }

  private hiddenStyle(group: string): boolean {
    return LETTER_STYLES.includes(group) && !this.scripts.includes(group);
  }

  private setCategory(category: 'palmer' | 'japanese'): void {
    this.category = category;
    this.tab = category === 'palmer' ? this.palmerTabs()[0] : JAPANESE_TABS[0];
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
    if (lesson.category === 'japanese' && lesson.group.startsWith(`${JP_DICTATION} `)) {
      this.tab = JP_DICTATION;
      this.dictationLevel = lesson.group.slice(JP_DICTATION.length + 1);
      return;
    }
    const tabs = lesson.category === 'palmer' ? PALMER_GROUPS : JAPANESE_TABS;
    // Una lección de un estilo escondido (desde Hoy o un repaso) igual muestra su pestaña.
    this.tab = tabs.includes(lesson.group) ? lesson.group : tabs[0];
  }

  private currentGroup(): string {
    if (this.category === 'japanese' && this.tab === 'Kanji') return this.level;
    if (this.category === 'japanese' && this.tab === JP_DICTATION) return dictationGroup(this.dictationLevel);
    return this.tab;
  }

  private visible(): Lesson[] {
    const list = this.lessons.filter((lesson) => {
      if (lesson.category !== this.category) return false;
      if (this.hiddenStyle(lesson.group) && lesson.group !== this.tab) return false;
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
    const key = `${this.category}|${this.currentGroup()}|${this.query}|${this.kanjiOrder}`;
    if (key !== this.shownKey) {
      this.shownKey = key;
      this.shown = PAGE_SIZE;
    }
    // La lección activa siempre queda a la vista, aunque esté al final de un grupo grande.
    const active = lessons.findIndex((lesson) => lesson.id === this.activeId);
    if (active >= this.shown) this.shown = Math.ceil((active + 1) / PAGE_SIZE) * PAGE_SIZE;
    this.tiles.clear();
    const fragment = document.createDocumentFragment();
    for (const lesson of lessons.slice(0, this.shown)) fragment.appendChild(this.tile(lesson));
    this.list.replaceChildren(fragment);
    this.renderMore(lessons);
  }

  /** Botón al final de la lista para poner la siguiente tanda de tarjetas. */
  private renderMore(lessons: Lesson[]): void {
    const left = lessons.length - this.shown;
    if (left <= 0) return;
    const more = document.createElement('button');
    more.type = 'button';
    more.className = 'lesson-more';
    more.textContent = `Mostrar ${Math.min(PAGE_SIZE, left)} más (quedan ${left})`;
    more.addEventListener('click', () => {
      const from = this.shown;
      this.shown += PAGE_SIZE;
      more.remove();
      const fragment = document.createDocumentFragment();
      for (const lesson of lessons.slice(from, this.shown)) fragment.appendChild(this.tile(lesson));
      this.list.append(fragment);
      this.renderMore(lessons);
    });
    this.list.append(more);
  }

  private renderTabs(): void {
    const base = this.category === 'palmer' ? this.palmerTabs() : JAPANESE_TABS;
    // Si se llegó a una lección de un estilo escondido, su pestaña se ve mientras tanto.
    const names = this.category === 'palmer' && !base.includes(this.tab) ? PALMER_GROUPS.filter((name) => base.includes(name) || name === this.tab) : base;
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
    if (this.category === 'japanese' && this.tab === JP_DICTATION && !this.query) {
      this.renderDictationLevels();
      return;
    }
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

  /** Niveles del dictado japonés, con cuántas frases tiene cada uno. */
  private renderDictationLevels(): void {
    this.levels.hidden = false;
    const counts = new Map<string, number>();
    for (const lesson of this.lessons) {
      if (lesson.category === 'japanese' && lesson.dictation) counts.set(lesson.group, (counts.get(lesson.group) ?? 0) + 1);
    }
    this.levels.replaceChildren(
      ...DICTATION_LEVELS.map((level) => {
        const button = document.createElement('button');
        button.type = 'button';
        const active = level === this.dictationLevel;
        const count = counts.get(dictationGroup(level)) ?? 0;
        button.className = `board-level${active ? ' active' : ''}`;
        button.setAttribute('aria-pressed', String(active));
        button.textContent = count > 0 ? `${level} · ${count}` : level;
        button.addEventListener('click', () => {
          this.dictationLevel = level;
          this.render();
        });
        return button;
      })
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
    const empty = this.category === 'japanese' && this.tab === JP_DICTATION && this.visible().length === 0;
    this.blurb.textContent = empty ? 'Todavía no hay dictados de este nivel. Se generan con «npm run dictation».' : copy.blurb;
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
    card.dataset.script = lesson.upright ? 'print' : lesson.category;
    card.dataset.label = `${lesson.title} ${lesson.subTitle}`.trim();

    const glyph = document.createElement('span');
    glyph.className = 'glyph-tile-char';
    // Las letras de estilo se dibujan con sus propios trazos: así se ve el estilo real.
    const model = lesson.slant != null ? lesson.steps?.[lesson.steps.length - 1]?.strokes : undefined;
    if (model?.length) {
      glyph.classList.add('is-drawn');
      glyph.innerHTML = letterSvg(model.map((stroke) => stroke.points), lesson.slant ?? 90);
    } else {
      glyph.textContent = face.glyph;
    }
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
    // Dictado japonés: la tarjeta muestra la pista en español, nunca el texto. Todas del mismo ancho.
    if (lesson.category === 'japanese' && lesson.dictation) {
      return { glyph: lesson.title, caption: lesson.subTitle, span: ' glyph-tile-wide' };
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
