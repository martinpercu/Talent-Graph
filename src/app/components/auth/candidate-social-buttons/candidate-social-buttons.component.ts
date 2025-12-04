import { Component, inject } from '@angular/core';
import { RecruiterAuthService } from '@services/recruiter-auth.service';
import { CandidateAuthService } from '@services/candidate-auth.service';

import { TranslocoPipe, TranslocoService } from '@jsverse/transloco';
import { Router, ActivatedRoute } from '@angular/router';

import { JobCrudService } from '@services/job-crud.service';

@Component({
  selector: 'app-candidate-social-buttons',
  imports: [TranslocoPipe],
  templateUrl: './candidate-social-buttons.component.html'
})
export class CandidateSocialButtonsComponent {
  candidateAuthService = inject(CandidateAuthService);
  router = inject(Router);

  jobCrudService = inject(JobCrudService);
  private route = inject(ActivatedRoute);

  errorMessage: string | null = null;

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
    // this.errorMessageEmailAlreadyUsed = false
  }

  async loginWithGoogle() {
    try {
      this.errorMessage = '';
      await this.candidateAuthService.loginWithGoogle(this.jobRecruiterId, this.jobId, this.resumeInDB);
      // this.router.navigateByUrl('/job')
    } catch (error: any) {
      this.errorMessage = error;
    }
  }

}
