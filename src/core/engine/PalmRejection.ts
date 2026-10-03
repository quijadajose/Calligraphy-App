/**
 * Decide qué puntero escribe. El lápiz óptico siempre entra y, mientras está
 * apoyado, nada más pinta. El dedo solo escribe si `allowTouch` lo permite:
 * con lápiz se rechaza para que la palma no manche la hoja.
 */
export class PalmRejection {
  private activePenId: number | null = null;

  public allowTouch = false;
  public onPenSeen?: () => void;

  public acceptDown(event: PointerEvent): boolean {
    if (event.pointerType === 'pen') {
      this.activePenId = event.pointerId;
      this.onPenSeen?.();
      return true;
    }
    if (this.activePenId !== null) return false;
    if (event.pointerType === 'touch') return this.allowTouch;
    return event.pointerType === 'mouse';
  }

  public owns(event: PointerEvent): boolean {
    if (this.activePenId !== null) return event.pointerType === 'pen';
    if (event.pointerType === 'touch') return this.allowTouch;
    return true;
  }

  public release(event: PointerEvent): void {
    if (event.pointerId === this.activePenId) this.activePenId = null;
  }
}
