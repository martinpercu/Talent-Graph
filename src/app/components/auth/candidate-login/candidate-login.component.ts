import { HttpClient } from '@angular/common/http';
import { Component, inject } from '@angular/core';
import { FormBuilder, ReactiveFormsModule, Validators } from '@angular/forms';
import { Candidate } from '@models/candidate';
import { CandidateAuthService } from '@services/candidate-auth.service';
import { Router, ActivatedRoute } from '@angular/router';

import { JobCrudService } from '@services/job-crud.service';
import { TranslocoPipe, TranslocoService } from '@jsverse/transloco';
// import { CandidateSocialButtonsComponent } from '@auth/candidate-social-buttons/candidate-social-buttons.component'
import { environment } from '@env/environment';

@Component({
  selector: 'app-candidate-login',
  imports: [ReactiveFormsModule, TranslocoPipe],
  templateUrl: './candidate-login.component.html',
})
export class CandidateLoginComponent {
  fb = inject(FormBuilder);
  http = inject(HttpClient);
  candidateAuthService = inject(CandidateAuthService);
  router = inject(Router);
  private translocoService = inject(TranslocoService);

  private route = inject(ActivatedRoute);
  jobCrudService = inject(JobCrudService);

  form = this.fb.nonNullable.group({
    email: ['', Validators.required],
    password: ['', Validators.required],
  });

  errorMessage: string | null = null;

  jobRecruiterId: string = '';
  jobId: string = '';

  async ngOnInit() {
    // Extraer el jobPositionId
    const jobPositionId = this.route.snapshot.paramMap.get('jobId'); // Ruta /job/:jobId
    if (jobPositionId) {
      this.jobId = jobPositionId;
      const ownerId: string | undefined =
        await this.jobCrudService.getJobOwnerId(jobPositionId);
      if (ownerId) {
        console.log(ownerId); // "I8oITrIOHDX2rkMvJmtU6iUHqkn1"
        // Use ownerId as a string
        this.jobRecruiterId = ownerId;
        console.log(this.jobRecruiterId, this.jobId); // "I8oITrIOHDX2rkMvJmtU6iUHqkn1"
      } else {
        console.log('no Recuiter for this Job');
      }
    }
  }

  onSubmit(): void {
    const rawForm = this.form.getRawValue();
    this.candidateAuthService.login(rawForm.email, rawForm.password, this.jobId, this.jobRecruiterId).subscribe({
      next: () => {
        this.router.navigateByUrl(`/job/${this.jobId}`);
      },
      error: (err) => {
        this.errorMessage = err.code;
      },
    });
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

}
