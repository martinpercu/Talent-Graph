import { Component, inject } from '@angular/core';
import { RecruiterAuthService } from '@services/recruiter-auth.service';

import { TranslocoPipe, TranslocoService } from '@jsverse/transloco';
import { Router } from '@angular/router';

@Component({
  selector: 'app-recruiter-social-buttons',
  imports: [TranslocoPipe],
  templateUrl: './recruiter-social-buttons.component.html'
})
export class RecruiterSocialButtonsComponent {
  recruiterAuthService = inject(RecruiterAuthService);
  router = inject(Router);

  errorMessage: string | null = null;

  async loginWithGoogle() {
    try {
      this.errorMessage = '';
      await this.recruiterAuthService.loginWithGoogle();
      this.router.navigateByUrl('/recruiter')
    } catch (error: any) {
      this.errorMessage = error;
    }
  }

}
