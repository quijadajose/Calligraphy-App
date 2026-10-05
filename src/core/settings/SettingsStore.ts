import { BrushTool, GridMode, GuideSetting } from '../../types/ink';
import { SCRIPT_STYLES, ScriptStyle, isScriptStyle } from '../engine/scriptFonts';
import { KeyValueStore, readJSON, writeJSON } from '../storage/safeStorage';

const STORAGE_KEY = 'calligraphy-settings';

export type PenChoice = Exclude<BrushTool, 'eraser'> | 'auto';
export type GridChoice = GridMode | 'auto';
export type TouchChoice = 'auto' | 'on' | 'off';
export type ThemeChoice = 'light' | 'dark';

export interface Settings {
  /** 'auto' deja la pluma que recomienda cada lección. */
  tool: PenChoice;
  grid: GridChoice;
  slantLines: boolean;
  inkColor: string | null;
  /** 'auto': el dedo escribe hasta que aparece un lápiz. */
  touchInput: TouchChoice;
  penSeen: boolean;
  /** Kanji: un trazo a medias se deshace solo. */
  strictStrokes: boolean;
  dockSide: 'left' | 'right';
  dailyGoalMinutes: number;
  perfHud: boolean;
  metronomeBpm: number;
  guideLevel: GuideSetting;
  /** Estilos de letra del español que se practican: solo esas pestañas se muestran. */
  scripts: ScriptStyle[];
  /** Letra de planas, palabras, oraciones y dictado (una de `scripts`). */
  sheetScript: ScriptStyle;
  lastLessonId: string | null;
  customTexts: string[];
  /** Aviso del sistema a esta hora (HH:MM) si hoy no se practicó. null = sin recordatorio. */
  reminderTime: string | null;
}

export const DEFAULT_SETTINGS: Settings = {
  tool: 'auto',
  grid: 'auto',
  slantLines: true,
  inkColor: null,
  touchInput: 'auto',
  penSeen: false,
  strictStrokes: true,
  dockSide: 'left',
  dailyGoalMinutes: 10,
  perfHud: false,
  metronomeBpm: 60,
  guideLevel: 'auto',
  scripts: ['Imprenta'],
  sheetScript: 'Imprenta',
  lastLessonId: null,
  customTexts: [],
  reminderTime: null
};

const PENS: PenChoice[] = ['auto', 'fountain', 'fude', 'pencil'];
const GRIDS: GridChoice[] = ['auto', 'palmer', 'genkouyoushi', 'none'];
const TOUCH: TouchChoice[] = ['auto', 'on', 'off'];
const GUIDES: GuideSetting[] = ['auto', 'full', 'faint', 'none'];

function pick<T>(value: unknown, allowed: T[], fallback: T): T {
  return allowed.includes(value as T) ? (value as T) : fallback;
}

function numberIn(value: unknown, min: number, max: number, fallback: number): number {
  const parsed = Number(value);
  return Number.isFinite(parsed) ? Math.max(min, Math.min(max, parsed)) : fallback;
}

/** Acepta cualquier cosa (respaldo viejo, JSON editado a mano) y devuelve ajustes válidos. */
export function sanitizeSettings(input: unknown): Settings {
  const raw = (input && typeof input === 'object' ? input : {}) as Record<string, unknown>;
  const d = DEFAULT_SETTINGS;
  // En el orden de las pestañas, sin repetir; nunca vacío.
  const chosen = Array.isArray(raw.scripts) ? SCRIPT_STYLES.filter((style) => (raw.scripts as unknown[]).includes(style)) : [];
  const scripts: ScriptStyle[] = chosen.length > 0 ? chosen : [...d.scripts];
  const sheetScript = isScriptStyle(raw.sheetScript) && scripts.includes(raw.sheetScript) ? raw.sheetScript : scripts[0];
  return {
    tool: pick(raw.tool, PENS, d.tool),
    grid: pick(raw.grid, GRIDS, d.grid),
    slantLines: typeof raw.slantLines === 'boolean' ? raw.slantLines : d.slantLines,
    inkColor: typeof raw.inkColor === 'string' && /^#[0-9a-f]{6}$/i.test(raw.inkColor) ? raw.inkColor : null,
    touchInput: pick(raw.touchInput, TOUCH, d.touchInput),
    penSeen: raw.penSeen === true,
    strictStrokes: typeof raw.strictStrokes === 'boolean' ? raw.strictStrokes : d.strictStrokes,
    dockSide: raw.dockSide === 'right' ? 'right' : 'left',
    dailyGoalMinutes: Math.round(numberIn(raw.dailyGoalMinutes, 1, 120, d.dailyGoalMinutes)),
    perfHud: raw.perfHud === true,
    metronomeBpm: Math.round(numberIn(raw.metronomeBpm, 30, 200, d.metronomeBpm)),
    guideLevel: pick(raw.guideLevel, GUIDES, d.guideLevel),
    scripts,
    sheetScript,
    lastLessonId: typeof raw.lastLessonId === 'string' ? raw.lastLessonId : null,
    customTexts: Array.isArray(raw.customTexts)
      ? raw.customTexts.filter((text): text is string => typeof text === 'string' && text.trim().length > 0).slice(0, 40)
      : [],
    reminderTime: typeof raw.reminderTime === 'string' && /^([01]\d|2[0-3]):[0-5]\d$/.test(raw.reminderTime) ? raw.reminderTime : null
  };
}

export class SettingsStore {
  private current: Settings;
  private listeners: Array<(settings: Settings) => void> = [];

  constructor(private store: KeyValueStore) {
    this.current = sanitizeSettings(readJSON(store, STORAGE_KEY));
  }

  public get(): Settings {
    return this.current;
  }

  public set(patch: Partial<Settings>): void {
    this.current = sanitizeSettings({ ...this.current, ...patch });
    writeJSON(this.store, STORAGE_KEY, this.current);
    for (const listener of this.listeners) listener(this.current);
  }

  public replace(input: unknown): void {
    this.set(sanitizeSettings(input));
  }

  public onChange(listener: (settings: Settings) => void): void {
    this.listeners.push(listener);
  }
}
