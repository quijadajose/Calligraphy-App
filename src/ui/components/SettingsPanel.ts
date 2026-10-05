import { OfflineStatus, formatBytes } from '../../core/offline/OfflinePack';
import { SCRIPT_STYLES, ScriptStyle } from '../../core/engine/scriptFonts';
import { Settings, SettingsStore, ThemeChoice } from '../../core/settings/SettingsStore';

type Option<T> = { value: T; label: string };

/** Pantalla de Ajustes: cada control escribe directamente en SettingsStore. */
export class SettingsPanel {
  public onTheme?: (theme: ThemeChoice) => void;
  public onExport?: () => void;
  public onImport?: () => void;
  public onClear?: () => void;
  /** Estado de la descarga sin conexión: lo pide el panel al dibujarse. */
  public onOfflineStatus?: () => Promise<OfflineStatus>;
  /** Baja todo; informa avance y devuelve cuántos archivos fallaron. */
  public onOfflineDownload?: (progress: (done: number, total: number) => void) => Promise<number>;
  private offlineBusy = false;
  public onReminder?: (time: string | null) => void;

  private theme: ThemeChoice = 'light';

  constructor(private root: HTMLElement, private store: SettingsStore) {
    store.onChange(() => this.render());
  }

  public setTheme(theme: ThemeChoice): void {
    this.theme = theme;
    this.render();
  }

  public render(): void {
    const s = this.store.get();
    const active = document.activeElement as HTMLElement | null;
    const focusKey = active?.dataset.key;
    this.root.replaceChildren(
      this.section('Tema', this.segment<ThemeChoice>('theme', [
        { value: 'light', label: 'Claro' },
        { value: 'dark', label: 'Oscuro' }
      ], this.theme, (value) => this.onTheme?.(value))),
      this.section('Letra (español)', this.scripts(s),
        this.hint('Elige los estilos que practicas: solo esos aparecen como pestañas. Planas, palabras, oraciones y dictado se escriben con la letra marcada; si eliges varias, cambias de una a otra en la misma hoja.')),
      this.section('Pluma', this.segment('tool', [
        { value: 'auto', label: 'La de cada lección' },
        { value: 'fountain', label: 'Estilográfica' },
        { value: 'fude', label: 'Pincel fude' },
        { value: 'pencil', label: 'Portaminas' }
      ], s.tool, (tool) => this.store.set({ tool }))),
      this.section('Pauta', this.segment('grid', [
        { value: 'auto', label: 'La de cada lección' },
        { value: 'palmer', label: 'Renglones' },
        { value: 'genkouyoushi', label: 'Genkōyōshi' },
        { value: 'none', label: 'Libre' }
      ], s.grid, (grid) => this.store.set({ grid })),
      this.toggle('slantLines', 'Líneas de inclinación a 52°', s.slantLines, (slantLines) => this.store.set({ slantLines })),
      this.hint('Kana y kanji siempre usan genkōyōshi: la calificación mide sobre sus cuadros.')),
      this.section('Ayuda en la hoja', this.segment('guideLevel', [
        { value: 'auto', label: 'Automática' },
        { value: 'full', label: 'Guía completa' },
        { value: 'faint', label: 'Guía tenue' },
        { value: 'none', label: 'Sin guía (de memoria)' }
      ], s.guideLevel, (guideLevel) => this.store.set({ guideLevel })),
      this.hint('Automática: dos líneas punteadas para repasar mientras aprendes, una tenue cuando la lección está «Asentada» y ninguna al dominarla.')),
      this.section('Escritura', this.segment('touchInput', [
        { value: 'auto', label: 'Dedo hasta que aparezca un lápiz' },
        { value: 'on', label: 'Dedo siempre' },
        { value: 'off', label: 'Solo lápiz' }
      ], s.touchInput, (touchInput) => this.store.set({ touchInput })),
      this.toggle('strictStrokes', 'Kanji: un trazo a medias se borra solo', s.strictStrokes, (strictStrokes) => this.store.set({ strictStrokes })),
      this.segment('dockSide', [
        { value: 'left', label: 'Herramientas a la izquierda' },
        { value: 'right', label: 'Herramientas a la derecha (zurdos)' }
      ], s.dockSide, (dockSide) => this.store.set({ dockSide })),
      this.hint('El botón lateral del lápiz o su goma borran sin cambiar de herramienta. Dos dedos deshacen; tres, rehacen.')),
      this.section('Práctica diaria',
        this.number('dailyGoalMinutes', 'Meta diaria (minutos)', s.dailyGoalMinutes, 1, 120, (dailyGoalMinutes) => this.store.set({ dailyGoalMinutes })),
        this.number('metronomeBpm', 'Metrónomo (pulsos por minuto)', s.metronomeBpm, 30, 200, (metronomeBpm) => this.store.set({ metronomeBpm })),
        this.reminder(s)),
      this.section('Mis textos', ...this.customTexts(s)),
      this.section('Sin conexión', this.offline()),
      this.section('Avanzado', this.toggle('perfHud', 'Mostrar medidor de rendimiento (FPS)', s.perfHud, (perfHud) => this.store.set({ perfHud }))),
      this.section('Datos', this.dataButtons())
    );
    if (focusKey) this.root.querySelector<HTMLElement>(`[data-key="${focusKey}"]`)?.focus();
  }

  /** Varios estilos a la vez; siempre queda al menos uno. */
  private scripts(s: Settings): HTMLElement {
    const row = document.createElement('div');
    row.className = 'chips-row';
    row.setAttribute('role', 'group');
    row.setAttribute('aria-label', 'Estilos de letra');
    for (const style of SCRIPT_STYLES) {
      const on = s.scripts.includes(style);
      const button = document.createElement('button');
      button.type = 'button';
      button.className = `chip${on ? ' on' : ''}`;
      button.dataset.key = `script-${style}`;
      button.setAttribute('aria-pressed', String(on));
      button.innerHTML = on ? '<i class="ti ti-check" aria-hidden="true"></i> ' : '';
      button.append(document.createTextNode(style));
      button.disabled = on && s.scripts.length === 1;
      if (button.disabled) button.title = 'Deja al menos un estilo';
      button.addEventListener('click', () => {
        const next: ScriptStyle[] = on ? s.scripts.filter((item) => item !== style) : [...s.scripts, style];
        // Al sumar un estilo, ese pasa a ser la letra de las hojas.
        this.store.set({ scripts: next, sheetScript: on ? s.sheetScript : style });
      });
      row.append(button);
    }
    return row;
  }

  private section(title: string, ...children: HTMLElement[]): HTMLElement {
    const section = document.createElement('section');
    section.className = 'settings-section';
    const heading = document.createElement('h3');
    heading.className = 'settings-subtitle';
    heading.textContent = title;
    section.append(heading, ...children);
    return section;
  }

  private hint(text: string): HTMLElement {
    const p = document.createElement('p');
    p.className = 'mu settings-hint';
    p.textContent = text;
    return p;
  }

  private segment<T extends string>(key: string, options: Option<T>[], current: T, onPick: (value: T) => void): HTMLElement {
    const row = document.createElement('div');
    row.className = 'chips-row';
    row.setAttribute('role', 'group');
    for (const option of options) {
      const button = document.createElement('button');
      button.type = 'button';
      button.className = `chip${option.value === current ? ' on' : ''}`;
      button.dataset.key = `${key}-${option.value}`;
      button.setAttribute('aria-pressed', String(option.value === current));
      button.textContent = option.label;
      button.addEventListener('click', () => onPick(option.value));
      row.append(button);
    }
    return row;
  }

  private toggle(key: string, label: string, value: boolean, onChange: (value: boolean) => void): HTMLElement {
    const wrap = document.createElement('label');
    wrap.className = 'switch-row';
    const input = document.createElement('input');
    input.type = 'checkbox';
    input.checked = value;
    input.dataset.key = key;
    input.addEventListener('change', () => onChange(input.checked));
    const text = document.createElement('span');
    text.textContent = label;
    wrap.append(input, text);
    return wrap;
  }

  private number(key: string, label: string, value: number, min: number, max: number, onChange: (value: number) => void): HTMLElement {
    const wrap = document.createElement('label');
    wrap.className = 'field-row';
    const text = document.createElement('span');
    text.textContent = label;
    const input = document.createElement('input');
    input.type = 'number';
    input.min = String(min);
    input.max = String(max);
    input.value = String(value);
    input.dataset.key = key;
    input.addEventListener('change', () => onChange(Number(input.value)));
    wrap.append(text, input);
    return wrap;
  }

  private reminder(s: Settings): HTMLElement {
    const wrap = document.createElement('div');
    wrap.className = 'field-row';
    const label = document.createElement('label');
    label.className = 'switch-row';
    const enabled = document.createElement('input');
    enabled.type = 'checkbox';
    enabled.checked = s.reminderTime !== null;
    enabled.dataset.key = 'reminderOn';
    const text = document.createElement('span');
    text.textContent = 'Recordarme si no he practicado a las';
    label.append(enabled, text);
    const time = document.createElement('input');
    time.type = 'time';
    time.value = s.reminderTime ?? '19:00';
    time.dataset.key = 'reminderTime';
    time.setAttribute('aria-label', 'Hora del recordatorio');
    const apply = () => {
      const value = enabled.checked ? time.value || '19:00' : null;
      this.store.set({ reminderTime: value });
      this.onReminder?.(value);
    };
    enabled.addEventListener('change', apply);
    time.addEventListener('change', () => {
      if (enabled.checked) apply();
    });
    wrap.append(label, time);
    return wrap;
  }

  private customTexts(s: Settings): HTMLElement[] {
    const hint = this.hint('Frases propias para practicar: aparecen en Palmer › Oraciones y entran en el repaso.');
    const form = document.createElement('form');
    form.className = 'custom-form';
    const input = document.createElement('input');
    input.type = 'text';
    input.maxLength = 80;
    input.placeholder = 'Escribe una frase';
    input.dataset.key = 'customInput';
    input.setAttribute('aria-label', 'Nueva frase');
    const add = document.createElement('button');
    add.type = 'submit';
    add.className = 'b2';
    add.textContent = 'Añadir';
    form.append(input, add);
    form.addEventListener('submit', (event) => {
      event.preventDefault();
      const text = input.value.trim();
      if (!text || s.customTexts.includes(text)) return;
      this.store.set({ customTexts: [...s.customTexts, text] });
    });
    const list = document.createElement('ul');
    list.className = 'custom-list';
    for (const text of s.customTexts) {
      const item = document.createElement('li');
      const label = document.createElement('span');
      label.textContent = text;
      const remove = document.createElement('button');
      remove.type = 'button';
      remove.className = 'ib';
      remove.setAttribute('aria-label', `Quitar «${text}»`);
      remove.innerHTML = '<i class="ti ti-x" aria-hidden="true"></i>';
      remove.addEventListener('click', () => this.store.set({ customTexts: s.customTexts.filter((entry) => entry !== text) }));
      item.append(label, remove);
      list.append(item);
    }
    return [hint, form, list];
  }

  private offline(): HTMLElement {
    const wrap = document.createElement('div');
    wrap.className = 'offline-row';
    const status = document.createElement('p');
    status.className = 'mu offline-status';
    status.setAttribute('aria-live', 'polite');
    status.textContent = 'Comprobando…';
    const bar = document.createElement('div');
    bar.className = 'offline-bar';
    bar.hidden = true;
    const fill = document.createElement('span');
    bar.append(fill);
    const button = document.createElement('button');
    button.type = 'button';
    button.className = 'go';
    button.hidden = true;
    button.dataset.key = 'offline';
    wrap.append(status, bar, button);

    const show = (state: OfflineStatus) => {
      if (!state.available) {
        status.textContent = 'La app y lo que ya abriste funcionan sin red. La descarga completa está disponible en la app publicada.';
        button.hidden = true;
        return;
      }
      const ready = state.have >= state.total;
      bar.hidden = ready;
      fill.style.width = `${state.total ? Math.round((state.have / state.total) * 100) : 100}%`;
      if (ready) {
        status.innerHTML = '<i class="ti ti-circle-check" aria-hidden="true"></i> ';
        status.append(document.createTextNode(`Todo descargado (${formatBytes(state.bytes)}): la app funciona entera sin internet, con todos los kanji y la fuente japonesa.`));
        button.hidden = true;
        return;
      }
      status.textContent = state.have > 0
        ? `La app, kana, kanji N5 y vocabulario ya funcionan sin red. Falta parte de los kanji N4–N1 y de la fuente japonesa.`
        : 'La app, kana, kanji N5 y vocabulario ya funcionan sin red. Para tener también los kanji N4 a N1 y la fuente japonesa completa, descárgalos una vez.';
      button.hidden = false;
      button.disabled = this.offlineBusy;
      button.textContent = `Descargar todo (${formatBytes(state.missingBytes)})`;
    };

    button.addEventListener('click', () => {
      if (!this.onOfflineDownload || this.offlineBusy) return;
      this.offlineBusy = true;
      button.disabled = true;
      bar.hidden = false;
      void this.onOfflineDownload((done, total) => {
        fill.style.width = `${total ? Math.round((done / total) * 100) : 100}%`;
        status.textContent = `Descargando… ${done} de ${total}`;
      })
        .then((failed) => {
          this.offlineBusy = false;
          if (failed > 0) status.textContent = `Faltaron ${failed} archivos. Revisa la conexión e inténtalo otra vez.`;
          return this.onOfflineStatus?.();
        })
        .then((state) => {
          if (state && state.have >= state.total) show(state);
          else button.disabled = false;
        })
        .catch(() => {
          this.offlineBusy = false;
          button.disabled = false;
          status.textContent = 'No se pudo descargar. Revisa la conexión e inténtalo otra vez.';
        });
    });

    if (this.onOfflineStatus) void this.onOfflineStatus().then(show).catch(() => show({ available: false, have: 0, total: 0, bytes: 0, missingBytes: 0 }));
    else show({ available: false, have: 0, total: 0, bytes: 0, missingBytes: 0 });
    return wrap;
  }

  private dataButtons(): HTMLElement {
    const row = document.createElement('div');
    row.className = 'chips-row';
    const make = (label: string, className: string, handler: () => void) => {
      const button = document.createElement('button');
      button.type = 'button';
      button.className = className;
      button.textContent = label;
      button.addEventListener('click', handler);
      return button;
    };
    row.append(
      make('Exportar respaldo', 'go', () => this.onExport?.()),
      make('Importar', 'b2', () => this.onImport?.()),
      make('Borrar todo', 'b2 danger', () => this.onClear?.())
    );
    return row;
  }
}
