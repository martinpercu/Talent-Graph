import { HttpClient } from '@angular/common/http';
import { Component, inject } from '@angular/core';
import { FormBuilder, ReactiveFormsModule, Validators } from '@angular/forms';
import { Recruiter } from '@models/recruiter';
import { RecruiterAuthService } from '@services/recruiter-auth.service';
import { Router } from '@angular/router';
import { TranslocoPipe } from '@jsverse/transloco';
import { RecruiterIfcontinueTermsConditionsComponent } from '@auth/recruiter-ifcontinue-terms-conditions/recruiter-ifcontinue-terms-conditions.component';
import { RecruiterSocialButtonsComponent } from '@auth/recruiter-social-buttons/recruiter-social-buttons.component';
import { firstValueFrom } from 'rxjs';

@Component({
  selector: 'app-recruiter-login',
  imports: [ReactiveFormsModule, TranslocoPipe, RecruiterIfcontinueTermsConditionsComponent, RecruiterSocialButtonsComponent],
  templateUrl: './recruiter-login.component.html',
})
export class RecruiterLoginComponent {
  fb = inject(FormBuilder);
  http = inject(HttpClient);
  recruiterAuthService = inject(RecruiterAuthService);
  router = inject(Router);

  form = this.fb.nonNullable.group({
    email: ['', Validators.required],
    password: ['', Validators.required],
  });

  errorMessage: string | null = null;

  onSubmit(): void {
    const rawForm = this.form.getRawValue();
    this.recruiterAuthService.login(rawForm.email, rawForm.password).subscribe({
      next: () => {
        this.router.navigate(['recruiter'])
      },
      error: (err) => {
        this.errorMessage = err.code;
      },
    });
  }

  // async onSubmit(): Promise<void> {
  //   const rawForm = this.form.getRawValue();
  //   try {
  //     await firstValueFrom(this.recruiterAuthService.login(rawForm.email, rawForm.password));
  //     this.router.navigate(['recruiter']);
  //   } catch (err: any) {
  //     this.errorMessage = err.code;
  //   }
  // }

  async loginWithGoogle() {
    try {
      this.errorMessage = '';
      await this.recruiterAuthService.loginWithGoogle();
    } catch (error: any) {
      this.errorMessage = error;
    }
  }
}
