import { Component, inject } from '@angular/core';
// import { ActivatedRoute, Router } from '@angular/router';

import { RecruiterLoginComponent } from '@components/auth/recruiter-login/recruiter-login.component';
import { RecruiterLogoutComponent } from '@components/auth/recruiter-logout/recruiter-logout.component';
import { RecruiterRegisterComponent } from '@components/auth/recruiter-register/recruiter-register.component';
import { RecruiterService } from '@services/recruiter.service'



@Component({
  selector: 'app-recruiter-page',
  imports: [RecruiterLoginComponent, RecruiterLogoutComponent, RecruiterRegisterComponent],
  templateUrl: './recruiter-page.component.html'
})
export class RecruiterPageComponent {

  // private route = inject(ActivatedRoute);
  recruiterService = inject(RecruiterService);

  alreadyAccount: boolean = false;

  async ngOnInit() {
  }

}
