import { BrushTool, GridMode } from '../../types/ink';

export class Toolbar {
  public onToolChange?: (tool: BrushTool) => void;
  public onColorChange?: (color: string) => void;
  public onWidthChange?: (width: number) => void;
  public onGridCycle?: () => void;
  public onUndo?: () => void;
  public onClear?: () => void;
  public onZen?: (enabled: boolean) => void;

  constructor(
    private tools: Record<BrushTool, HTMLButtonElement>,
    private colorInput: HTMLInputElement,
    private widthInput: HTMLInputElement,
    private gridButton: HTMLButtonElement,
    private undoButton: HTMLButtonElement,
    private clearButton: HTMLButtonElement,
    private zenButton: HTMLButtonElement,
    private zenExitButton: HTMLButtonElement
  ) {
    (Object.keys(this.tools) as BrushTool[]).forEach((tool) => {
      this.tools[tool].addEventListener('click', () => {
        this.setTool(tool);
        this.onToolChange?.(tool);
      });
    });
    this.colorInput.addEventListener('input', () => this.onColorChange?.(this.colorInput.value));
    this.widthInput.addEventListener('input', () => this.onWidthChange?.(Number(this.widthInput.value)));
    this.gridButton.addEventListener('click', (event) => {
      event.stopPropagation();
      this.onGridCycle?.();
    });
    this.undoButton.addEventListener('click', (event) => {
      event.stopPropagation();
      this.onUndo?.();
    });
    this.clearButton.addEventListener('click', (event) => {
      event.stopPropagation();
      this.onClear?.();
    });
    this.zenButton.addEventListener('click', () => this.setZen(true));
    this.zenExitButton.addEventListener('click', () => this.setZen(false));
  }

  public setTool(tool: BrushTool): void {
    (Object.keys(this.tools) as BrushTool[]).forEach((name) => {
      this.tools[name].classList.toggle('active', name === tool);
    });
  }

  public setWidth(width: number): void {
    if (width > Number(this.widthInput.max)) this.widthInput.max = String(Math.ceil(width));
    this.widthInput.value = String(width);
  }

  public setGridLabel(mode: GridMode): void {
    const labels: Record<GridMode, string> = {
      palmer: '📐 Palmer',
      genkouyoushi: '📐 Genkou',
      none: '📐 Sin pauta'
    };
    this.gridButton.textContent = labels[mode];
  }

  private setZen(enabled: boolean): void {
    document.body.classList.toggle('zen-mode', enabled);
    this.zenExitButton.style.display = enabled ? 'block' : 'none';
    this.onZen?.(enabled);
  }
}
