import { Directive, ElementRef, inject, signal } from '@angular/core';
import { VisualStatesService } from '@services/visual-states.service';

@Directive({
  selector: '[appSwipeLeftClose]'
})
export class SwipeLeftCloseDirective {
  private el = inject(ElementRef);
  private visualStatesService = inject(VisualStatesService);

  // Señales para estado reactivo
  private isSwiping = signal(false);
  private startX = signal(0);
  private currentX = signal(0);
  private threshold = 100; // Umbral para considerar el swipe completo

  constructor() {
    // Añadir listeners para eventos táctiles
    this.el.nativeElement.addEventListener('touchstart', this.onTouchStart.bind(this));
    this.el.nativeElement.addEventListener('touchmove', this.onTouchMove.bind(this));
    this.el.nativeElement.addEventListener('touchend', this.onTouchEnd.bind(this));
  }

  private onTouchStart(event: TouchEvent): void {
    this.isSwiping.set(true);
    this.startX.set(event.touches[0].clientX);
    this.currentX.set(this.startX());
  }

  private onTouchMove(event: TouchEvent): void {
    if (!this.isSwiping()) return;
    this.currentX.set(event.touches[0].clientX);

    // Feedback visual: mover el panel con el dedo
    const deltaX = this.currentX() - this.startX();
    // Limitar el movimiento a la izquierda (deltaX <= 0)
    this.el.nativeElement.style.transform = `translateX(${Math.min(0, deltaX)}px)`;
  }

  private onTouchEnd(): void {
    if (!this.isSwiping()) return;
    this.isSwiping.set(false);

    // Calcular distancia deslizada
    const deltaX = this.currentX() - this.startX();

    // Si el swipe es a la izquierda y supera el umbral, toguear el panel
    if (deltaX < -this.threshold) {
      this.visualStatesService.togleShowLeftMenu();
    }

    // Resetear posición visual
    this.el.nativeElement.style.transform = 'translateX(0)';
  }
}
