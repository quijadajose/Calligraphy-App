import { InkCanvas } from '../../core/engine/InkCanvas';
import { sentenceRowGeometry } from '../../core/engine/gridMetrics';
import { Settings } from '../../core/settings/SettingsStore';
import { scriptSlantFor, setSheetScript } from '../../core/engine/scriptFonts';
import { setScriptSlant } from '../../core/engine/gridMetrics';
import { BrushTool, GridMode, Stroke, StrokePoint } from '../../types/ink';

const SAMPLE_TEXT = 'Caligrafía';
const WIDTH_BY_TOOL: Record<Exclude<BrushTool, 'eraser'>, number> = { fountain: 4, fude: 8, pencil: 2.5 };
const TOOL_LABEL: Record<Exclude<BrushTool, 'eraser'>, string> = { fountain: 'Estilográfica', fude: 'Pincel fude', pencil: 'Portaminas' };
const GRID_LABEL: Record<GridMode, string> = { palmer: 'Renglones', genkouyoushi: 'Genkōyōshi', none: 'Libre' };
/** Inclinación Palmer: 52° sobre el renglón. */
const SLANT = 1 / Math.tan((52 * Math.PI) / 180);

/**
 * Hoja de muestra junto a Ajustes: la misma InkCanvas de la práctica, con la pluma,
 * la pauta y la ayuda elegidas. Trae una fila de lazos ya escritos y se puede rayar encima.
 */
export class SettingsPreview {
  private ink: InkCanvas;
  private caption: HTMLElement;
  private settings: Settings | null = null;
  private inkColor = '#1a1a1a';
  private scribbled = false;

  constructor(root: HTMLElement) {
    root.classList.add('settings-preview');
    const head = document.createElement('div');
    head.className = 'settings-preview-head';
    const title = document.createElement('span');
    title.className = 'settings-subtitle';
    title.textContent = 'Vista previa';
    const clear = document.createElement('button');
    clear.type = 'button';
    clear.className = 'chip';
    clear.textContent = 'Limpiar';
    clear.addEventListener('click', () => this.drawSample());
    head.append(title, clear);

    const paper = document.createElement('div');
    paper.className = 'paper-wrap settings-preview-paper';
    this.caption = document.createElement('p');
    this.caption.className = 'mu settings-hint';

    root.append(head, paper, this.caption);
    this.ink = new InkCanvas(paper);
    this.ink.setAllowTouch(true);
    this.ink.onStrokeStart = () => { this.scribbled = true; };
    // Al mostrarse el panel (o cambiar de tamaño) la muestra se vuelve a escribir a la medida.
    this.ink.onResize = () => { if (!this.scribbled) this.drawSample(); };
  }

  public setInkColor(color: string): void {
    this.inkColor = color;
    this.apply();
  }

  public update(settings: Settings): void {
    this.settings = settings;
    this.apply();
  }

  private tool(): Exclude<BrushTool, 'eraser'> {
    const tool = this.settings?.tool ?? 'auto';
    return tool === 'auto' ? 'fountain' : tool;
  }

  private grid(): GridMode {
    const grid = this.settings?.grid ?? 'auto';
    return grid === 'auto' ? 'palmer' : grid;
  }

  private apply(): void {
    const s = this.settings;
    if (!s) return;
    const tool = this.tool();
    const grid = this.grid();
    this.ink.currentTool = tool;
    this.ink.currentColor = this.inkColor;
    this.ink.currentBaseWidth = WIDTH_BY_TOOL[tool];
    // La muestra se escribe con la letra elegida para las hojas de texto.
    setSheetScript(s.sheetScript);
    setScriptSlant(scriptSlantFor(s.sheetScript));
    this.ink.setSlantLines(s.slantLines);
    this.ink.setGuideLevel(s.guideLevel === 'auto' ? 'full' : s.guideLevel);
    this.ink.setGrid(grid);
    this.ink.setSheet(grid === 'palmer' ? SAMPLE_TEXT : null);
    this.drawSample();

    const toolText = s.tool === 'auto' ? `La de cada lección (aquí, ${TOOL_LABEL[tool].toLowerCase()})` : TOOL_LABEL[tool];
    const gridText = s.grid === 'auto' ? 'la de cada lección (aquí, renglones)' : GRID_LABEL[grid].toLowerCase();
    this.caption.textContent = `${toolText} · pauta ${gridText}. Raya encima para probar la pluma.`;
  }

  /** Una fila de lazos con presión variable: más tinta al bajar, como en la escritura real. */
  private drawSample(): void {
    this.scribbled = false;
    const { width, height } = this.ink.getSize();
    if (width < 40 || height < 40) { this.ink.reset(); return; }
    const tool = this.tool();
    const grid = this.grid();

    let base: number;
    let xHeight: number;
    if (grid === 'palmer') {
      const row = sentenceRowGeometry(1, height);
      base = row.baseY;
      xHeight = row.xHeight;
    } else {
      xHeight = Math.min(70, height * 0.16);
      base = height * 0.62;
    }
    const slant = grid === 'palmer' ? SLANT : 0.25;
    const step = xHeight * 0.32;
    const swing = xHeight * 0.5;
    const loops = Math.max(2, Math.floor((width - 2 * swing - 40) / (step * 2 * Math.PI)));
    const startX = 24 + swing;
    const points: StrokePoint[] = [];
    const end = loops * 2 * Math.PI;
    let time = 0;
    for (let t = 0; t <= end; t += 0.12) {
      const rise = xHeight * (0.5 - 0.5 * Math.cos(t));
      const y = base - rise;
      // Retrocede arriba (t = π): ahí se cierra el lazo, como una «l» corta.
      const x = startX + step * t + swing * Math.sin(t) + rise * slant;
      points.push({ x, y, pressure: Math.max(0.2, Math.min(1, 0.55 - 0.35 * Math.sin(t))), tiltX: 0, tiltY: 0, time });
      time += 8;
    }
    const stroke: Stroke = { points, color: this.inkColor, baseWidth: WIDTH_BY_TOOL[tool], tool };
    this.ink.loadStrokes([stroke]);
  }
}
