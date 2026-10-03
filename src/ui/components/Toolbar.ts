import { BrushTool } from '../../types/ink';

/** Dock de herramientas de la hoja. */
export class Toolbar {
  public onToolChange?: (tool: BrushTool) => void;
  public onColorChange?: (color: string) => void;
  public onUndo?: () => void;
  public onRedo?: () => void;
  public onClear?: () => void;
  public onZen?: (enabled: boolean) => void;

  constructor(
    private tools: Record<BrushTool, HTMLButtonElement>,
    private colorInput: HTMLInputElement,
    private undoButton: HTMLButtonElement,
    private redoButton: HTMLButtonElement,
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
    this.undoButton.addEventListener('click', () => this.onUndo?.());
    this.redoButton.addEventListener('click', () => this.onRedo?.());
    this.clearButton.addEventListener('click', () => this.onClear?.());
    this.zenButton.addEventListener('click', () => this.setZen(true));
    this.zenExitButton.addEventListener('click', () => this.setZen(false));
  }

  public setTool(tool: BrushTool): void {
    (Object.keys(this.tools) as BrushTool[]).forEach((name) => {
      const on = name === tool;
      this.tools[name].classList.toggle('on', on);
      this.tools[name].setAttribute('aria-pressed', String(on));
    });
  }

  public setColor(color: string): void {
    this.colorInput.value = color;
  }

  public setHistory(canUndo: boolean): void {
    this.undoButton.disabled = !canUndo;
  }

  public exitZen(): void {
    if (document.body.classList.contains('zen-mode')) this.setZen(false);
  }

  private setZen(enabled: boolean): void {
    document.body.classList.toggle('zen-mode', enabled);
    this.onZen?.(enabled);
    (enabled ? this.zenExitButton : this.zenButton).focus();
  }
}
