import { Component } from '@angular/core';

@Component({
  selector: 'app-message-waiting',
  standalone: true,
  imports: [],
  templateUrl: './message-waiting.component.html'
})
export class MessageWaitingComponent {
  progress: number = 0;
  private intervalId: any; // Para almacenar el ID del intervalo

  ngOnInit() {
    // Inicia el temporizador cuando el componente se carga
    this.startProgress();
  }

  ngOnDestroy() {
    // Limpia el temporizador cuando el componente se destruye
    if (this.intervalId) {
      clearInterval(this.intervalId);
    }
  }

  startProgress() {
    // Incrementa el progreso cada 100ms
    this.intervalId = setInterval(() => {
      if (this.progress < 100) {
        this.progress += 1; // Incrementa un 1% cada vez (puedes ajustar el valor)
      } else {
        clearInterval(this.intervalId); // Para el temporizador al llegar al 100%
      }
    }, 100); // 100ms
  }


}
