import { Component, inject } from '@angular/core';
import { RecruiterAuthService } from '@services/recruiter-auth.service';
import { Router } from '@angular/router';



@Component({
  selector: 'app-recruiter-logout',
  imports: [],
  templateUrl: './recruiter-logout.component.html'
})
export class RecruiterLogoutComponent {

  recruiterAuthService = inject(RecruiterAuthService);
  router = inject(Router);

  logout(){
    this.recruiterAuthService.logout();
  }

}
