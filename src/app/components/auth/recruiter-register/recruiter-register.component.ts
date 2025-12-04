import { HttpClient } from '@angular/common/http';
import { Component, inject } from '@angular/core';
import { FormBuilder, ReactiveFormsModule, Validators } from '@angular/forms';
import { Recruiter } from '@models/recruiter';
import { RecruiterAuthService } from '@services/recruiter-auth.service';
import { Router } from '@angular/router';
import { TranslocoPipe, TranslocoService } from '@jsverse/transloco';
import { environment } from '@env/environment';
import { RecruiterSocialButtonsComponent } from '@auth/recruiter-social-buttons/recruiter-social-buttons.component';

@Component({
  selector: 'app-recruiter-register',
  imports: [ReactiveFormsModule, TranslocoPipe, RecruiterSocialButtonsComponent],
  templateUrl: './recruiter-register.component.html'
})
export class RecruiterRegisterComponent {
  fb = inject(FormBuilder);
  http = inject(HttpClient);
  recruiterAuthService = inject(RecruiterAuthService);
  router = inject(Router);
  private translocoService = inject(TranslocoService);

  form = this.fb.nonNullable.group({
    username: ['', Validators.required],
    email: ['', Validators.required],
    password: ['', Validators.required],
  });
  errorMessage: string | null = null;

  onSubmit(): void {
    const rawForm = this.form.getRawValue()
    this.recruiterAuthService.register(rawForm.email, rawForm.username, rawForm.password)
      .subscribe({
        next: () => {
        this.router.navigateByUrl('/recruiter')
        },
        error: (err) => {
          this.errorMessage = err.code;
        }
    })
  }

  getLang(){
    return this.translocoService.getActiveLang()
  }

  toTerms() {
    const languageNow = this.getLang();
    console.log(languageNow);
    const url = environment.BASEURL; // our baseURL
    const urlReal = `${url}/termsandprivacy/terms-${languageNow}`
    console.log(urlReal);
    window.open(urlReal, '_blank');
  }

  toPrivacy() {
    const languageNow = this.getLang();
    console.log(languageNow);
    const url = environment.BASEURL; // our baseURL
    const urlReal = `${url}/termsandprivacy/privacy-${languageNow}`
    console.log(urlReal);
    window.open(urlReal, '_blank');
  }

  async loginWithGoogle() {
    try {
      this.errorMessage = '';
      await this.recruiterAuthService.loginWithGoogle();
    } catch (error: any) {
      this.errorMessage = error;
    }
  }

}
