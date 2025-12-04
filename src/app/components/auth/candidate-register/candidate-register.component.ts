import { HttpClient } from '@angular/common/http';
import { Component, inject } from '@angular/core';
import { FormBuilder, ReactiveFormsModule, Validators } from '@angular/forms';
import { Candidate } from '@models/candidate';
import { Job } from '@models/job';
import { CandidateAuthService } from '@services/candidate-auth.service';
import { Router, ActivatedRoute } from '@angular/router';

import { JobCrudService } from '@services/job-crud.service';
import { TranslocoPipe, TranslocoService } from '@jsverse/transloco';

// import { CandidateSocialButtonsComponent } from '@auth/candidate-social-buttons/candidate-social-buttons.component'
import { environment } from '@env/environment';

// import { Translo }

@Component({
  selector: 'app-candidate-register',
  imports: [ReactiveFormsModule, TranslocoPipe],
  templateUrl: './candidate-register.component.html',
})
export class CandidateRegisterComponent {
  fb = inject(FormBuilder);
  http = inject(HttpClient);
  candidateAuthService = inject(CandidateAuthService);
  router = inject(Router);
  private translocoService = inject(TranslocoService);

  private route = inject(ActivatedRoute);
  jobCrudService = inject(JobCrudService);

  form = this.fb.nonNullable.group({
    username: ['', Validators.required],
    email: ['', Validators.required],
    password: ['', Validators.required],
  });
  errorMessage: string | null = null;
  errorMessageEmailAlreadyUsed!: boolean;

  jobRecruiterId: string = '';
  jobId: string = '';
  resumeInDB: boolean = false;

  async ngOnInit() {
    // Extraer el jobPositionId
    // const jobPositionId = this.route.snapshot.paramMap.get('jobId'); // Ruta /job/:jobId
    const jobMagicPositionId = this.route.snapshot.paramMap.get('jobId'); // Ruta /job/:jobId

    if (jobMagicPositionId) {
      // const thisJob: any = await this.jobCrudService.getJobByIdRaw(jobPositionId);
      const theJob: any = await this.jobCrudService.getJobByMagikIdRaw(jobMagicPositionId);
      const jobPositionId = theJob.jobId

      this.jobId = jobPositionId
      const ownerId: string | undefined =
        await this.jobCrudService.getJobOwnerId(jobPositionId);
      if (ownerId) {
        console.log(ownerId); // "I8oITrIOHDX2rkMvJmtU6iUHqkn1"
        // Use ownerId as a string
        this.jobRecruiterId = ownerId;
        console.log(this.jobRecruiterId, this.jobId); // "I8oITrIOHDX2rkMvJmtU6iUHqkn1"
      }else {
        console.log('no Recuiter for this Job');
      }
    }
    this.errorMessageEmailAlreadyUsed = false
  }

  onSubmit(): void {
    const rawForm = this.form.getRawValue();
    this.candidateAuthService
      .register(rawForm.email, rawForm.username, rawForm.password, this.jobRecruiterId, this.jobId, this.resumeInDB)
      .subscribe({
        next: () => {
          if(this.jobId){
          this.router.navigateByUrl(`/job/${this.jobId}`);
          }
          else {
          this.router.navigateByUrl('/job');
          }
        },
        error: (err) => {
          console.log(err.code);
          if(err.code == 'auth/email-already-in-use'){
            this.errorMessageEmailAlreadyUsed = true;
          }else {
          this.errorMessage = err.code;
          console.log('entro al else');

          }

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
