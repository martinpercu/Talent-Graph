import { Component, inject } from '@angular/core';
import { environment } from '@env/environment';

import { MatIconModule } from '@angular/material/icon';
import { Router } from '@angular/router';
import { TranslocoPipe } from '@jsverse/transloco';

@Component({
  selector: 'app-mainpage-bridgetoworks',
  imports: [MatIconModule, TranslocoPipe],
  templateUrl: './mainpage-bridgetoworks.component.html',
  styleUrl: './mainpage-bridgetoworks.component.css'
})
export class MainpageBridgetoworksComponent {
  router = inject(Router);

  appName: string = environment.WEBSITE_NAME;


  goToRecruiter() {
    // window.open(url, "_blank");
    this.router.navigate(['recruiter']);
  }

  // goToCandidate() {
  //   // window.open(url, "_blank");
  //   this.router.navigate([`/candidate`]);
  // }

  goToNotRecruiter() {
    const confirmRedirect = window.confirm('Estás a punto de ser redirigido a otra página. ¿Deseas continuar?');

    if (confirmRedirect) {
      window.location.href = 'https://blabla.com';
      window.open('https://blabla.com', '_blank');

    } else {
      // Aquí puedes poner cualquier lógica si el usuario cancela,
      // por ejemplo, mostrar un mensaje en la consola.
      console.log('Redirección cancelada por el usuario.');
    }
  }


}
