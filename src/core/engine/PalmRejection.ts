/**
 * Rechaza el dedo y la palma. El lápiz óptico siempre entra.
 * El ratón sigue disponible en escritorio mientras no haya un lápiz activo.
 */
export class PalmRejection {
  private activePenId: number | null = null;

  public acceptDown(event: PointerEvent): boolean {
    if (event.pointerType === 'touch') return false;
    if (event.pointerType === 'pen') {
      this.activePenId = event.pointerId;
      return true;
    }
    if (event.pointerType === 'mouse') return this.activePenId === null;
    return false;
  }

  public owns(event: PointerEvent): boolean {
    if (event.pointerType === 'touch') return false;
    if (this.activePenId !== null && event.pointerType !== 'pen') return false;
    return true;
  }

  public release(event: PointerEvent): void {
    if (event.pointerId === this.activePenId) this.activePenId = null;
  }
}
