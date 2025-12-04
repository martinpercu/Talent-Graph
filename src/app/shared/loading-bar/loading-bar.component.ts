import { Component } from '@angular/core';

@Component({
  selector: 'app-loading-bar',
  imports: [],
  templateUrl: './loading-bar.component.html',
  styleUrl: './loading-bar.component.css'
})
export class LoadingBarComponent {
  progress: number = 0;
  private intervalId: any; // Para almacenar el ID del intervalo
  private direction: 'up' | 'down' = 'up'; // Nueva variable para controlar la dirección


  ngOnInit() {
    // Inicia el temporizador cuando el componente se carga
    // this.startProgress();
  }

  ngOnDestroy() {
    // Limpia el temporizador cuando el componente se destruye
    // if (this.intervalId) {
    //   clearInterval(this.intervalId);
    // }
  }

  // startProgress() {
  //   // Incrementa el progreso cada 100ms
  //   this.intervalId = setInterval(() => {
  //     if (this.progress < 100) {
  //       this.progress += 1; // Incrementa un 1% cada vez (puedes ajustar el valor)
  //     } else {
  //       clearInterval(this.intervalId); // Para el temporizador al llegar al 100%
  //     }
  //   }, 200); // 100ms
  // }

  // startProgress() {
  //   this.intervalId = setInterval(() => {
  //     // Si estamos subiendo y el progreso es menor al 100%
  //     if (this.direction === 'up' && this.progress < 100) {
  //       this.progress += 2; // Incremento más rápido
  //     }
  //     // Si llegamos al 100%, cambiamos la dirección a 'down'
  //     else if (this.progress >= 100) {
  //       this.direction = 'down';
  //       this.progress -= 2;
  //     }
  //     // Si estamos bajando y el progreso es mayor a 0%
  //     else if (this.direction === 'down' && this.progress > 0) {
  //       this.progress -= 2;
  //     }
  //     // Si llegamos al 0%, cambiamos la dirección a 'up' de nuevo
  //     else if (this.progress <= 0) {
  //       this.direction = 'up';
  //       this.progress += 2;
  //     }
  //   }, 40); // Intervalo más rápido para una animación más fluida
  // }


}
