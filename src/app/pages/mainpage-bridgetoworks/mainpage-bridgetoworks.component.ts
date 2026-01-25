import { Component, inject } from '@angular/core';
import { environment } from '@env/environment';

import { MatIconModule } from '@angular/material/icon';
import { Router } from '@angular/router';
import { TranslocoPipe } from '@jsverse/transloco';

// For DEMO
import { RecruiterAuthService } from '@services/recruiter-auth.service';


@Component({
  selector: 'app-mainpage-bridgetoworks',
  imports: [MatIconModule, TranslocoPipe],
  templateUrl: './mainpage-bridgetoworks.component.html',
  styleUrl: './mainpage-bridgetoworks.component.css'
})
export class MainpageBridgetoworksComponent {
  router = inject(Router);

  appName: string = environment.WEBSITE_NAME;

  // For DEMO
  demoApp: boolean = false
  recruiterAuthService = inject(RecruiterAuthService);
  errorMessage: string | null = null;

  ngOnInit() {
    console.log(this.demoApp);
    if(this.appName == "TalentGraph"){
      this.demoApp = true
    }
    console.log(this.demoApp);    

    // onSubmit(): void {
    //   const rawForm = this.form.getRawValue();
    //   this.recruiterAuthService.login(environment.DEMO_USER, environment.DEMO_USER_PASSWORD).subscribe({
    //     next: () => {
    //       this.router.navigate(['recruiter'])
    //     },
    //     error: (err) => {
    //       this.errorMessage = err.code;
    //     },
    //   });
    // }
  }


  goToRecruiter() {
    // window.open(url, "_blank");
    this.router.navigate(['recruiter']);
  }
  goToDemoRecruiter() {
    // this.router.navigate(['recruiter']);
    this.recruiterAuthService.login(environment.DEMO_USER, environment.DEMO_USER_PASSWORD).subscribe({
        next: () => {
          this.router.navigate(['recruiter'])
        },
        error: (err) => {
          this.errorMessage = err.code;
        },
      });    
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
