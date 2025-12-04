import { Component, inject, effect } from '@angular/core';
import { ActivatedRoute, Router } from '@angular/router';

import { TranslocoPipe } from '@jsverse/transloco';

import { CandidateLoginComponent } from '@components/auth/candidate-login/candidate-login.component';
import { CandidateLogoutComponent } from '@components/auth/candidate-logout/candidate-logout.component';
import { CandidateRegisterComponent } from '@components/auth/candidate-register/candidate-register.component';
import { CandidateService } from '@services/candidate.service';
import { JobCrudService } from '@services/job-crud.service';
import { CandidateAuthService } from '@services/candidate-auth.service';
import { CandidateVisualService } from '@services/candidate-visual.service';

import { CandidateEditComponent } from '@candidate/candidate-edit/candidate-edit.component';
import { CandidateHeaderComponent } from '@candidate/candidate-header/candidate-header.component';
import { CandidateResumeEditComponent } from '@candidate/candidate-resume-edit/candidate-resume-edit.component';
import { CandidateResumeBasicConfirmationComponent } from '@candidate/candidate-resume-basic-confirmation/candidate-resume-basic-confirmation.component';

import { UploadComponent } from '@components/candidate/upload/upload.component';

import { Job } from '@models/job';
import { Candidate } from '@models/candidate';
import { CandidateSocialButtonsComponent } from '@auth/candidate-social-buttons/candidate-social-buttons.component'



@Component({
  selector: 'app-candidate-page',
  imports: [TranslocoPipe, CandidateLoginComponent, CandidateLogoutComponent, CandidateRegisterComponent, CandidateEditComponent, UploadComponent, CandidateHeaderComponent, CandidateResumeEditComponent, CandidateResumeBasicConfirmationComponent, CandidateSocialButtonsComponent],
  templateUrl: './candidate-page.component.html'
})
export class CandidatePageComponent {
  private route = inject(ActivatedRoute);
  private router = inject(Router);
  candidateService = inject(CandidateService);
  jobCrudService = inject(JobCrudService);
  candidateAuthService = inject(CandidateAuthService);
  candidateVisualService = inject(CandidateVisualService);

  alreadyAccount: boolean = false;
  withJobId: boolean = false;

  job!: Job;
  showRegister: boolean = true;
  showLogin: boolean = false;
  recruiterId!: string;

  lastCandidateJob!: Job | undefined;

  // candidate!: Candidate;
  constructor() {
    effect(() => {
      console.log('estoy aca EFFECT no hay JOB position');
      // 1. Obtenemos el UID del Signal.
      const candidateUID = this.candidateService.candidateSig()?.candidateUID;
      // 2. Si el UID existe, llamamos a la función asíncrona.
      if (candidateUID) {
        // Usamos .then() para manejar la promesa, ya que `effect` no es `async`.
        this.candidateService.getThisCandidate(candidateUID).then(candidate => {
          // Aquí puedes hacer algo con el objeto 'candidate'
          console.log('Candidato cargado:', candidate);
          // Verificamos si `jobs` existe y si tiene al menos un elemento.
        if (candidate && candidate.jobs && candidate.jobs.length > 0) {
            const firstJobId = candidate.jobs[0];

            // Encadenamos otra promesa para obtener el trabajo
            this.jobCrudService.getJobByIdRaw(firstJobId).then(theJob => {
              // Ahora 'job' es el objeto de tipo Job o undefined
              this.lastCandidateJob = theJob;
              console.log('Último trabajo del candidato:', this.lastCandidateJob);
            });
          } else {
            console.log('El candidato no tiene trabajos o el arreglo está vacío.');
          }
        });

      }
    });
  }

  async ngOnInit() {

    // Extraer el jobPositionId
    const jobMagicPositionId = this.route.snapshot.paramMap.get('jobId'); // Ruta /job/:jobId
    if (jobMagicPositionId) {
      console.log(jobMagicPositionId);
      this.withJobId = true
      // const thisJob: any = await this.jobCrudService.getJobByIdRaw(jobPositionId);
      const theJob: any = await this.jobCrudService.getJobByMagikIdRaw(jobMagicPositionId);
      const jobPositionId = theJob.jobId
      const ownerId: string | undefined =
      await this.jobCrudService.getJobOwnerId(jobPositionId);
        if(ownerId && theJob && this.candidateService.candidateSig()) {
          // alert('hay de SUPER TODOOOOO todooooooo')
          console.log(this.candidateService.candidateSig()?.candidateUID);
          const candidateUID = this.candidateService.candidateSig()?.candidateUID
          console.log(ownerId);
          this.recruiterId = ownerId
          console.log(jobPositionId);
          if(candidateUID){
            const tipoUpdateado = await this.candidateService.updateCandidateIfNeeded(
              candidateUID,
              jobPositionId,
              ownerId
            );
            console.log(tipoUpdateado);
          }
        }
      // if(ownerId && thisJob) {
      //   alert('hay de todooooooo')
      // }
      if(ownerId) {
        console.log('hay OWNER ! ! ! \n\n' + ownerId);
        this.recruiterId = ownerId
      }
      if(theJob) {
        // alert(thisJob)
        console.log('hay job job job');
        this.job = theJob
      }
      else {
        console.log(' NO JOB redirecciona a /job sin ID');
        this.router.navigateByUrl(`/job`);
      }
    }
    // else {
    //   console.log('estoy aca no hay JOB position');
    //   const candidateUID = this.candidateService.candidateSig()?.candidateUID;
    //   if (candidateUID) {
    //     const candidate = await this.candidateService.getThisCandidate(candidateUID);

    //     // Aquí puedes hacer algo con el objeto 'candidate'
    //     console.log(candidate);
    //     alert("eeeee")
    //   }

    // }
      // `effect` se ejecutará cada vez que candidateSig() cambie.

  }

  switchLoginRegister() {
    this.showLogin = !this.showLogin;
    this.showRegister = !this.showRegister;
  }

  async testeo() {
    console.log(this.candidateService.candidateSig());

    // const resumeUrl = "https://firebasestorage.googleapis.com/v0/b/trainer-teacher.firebasestorage.app/o/resumes%2Fy5qcLmxLWEfPoq6gV39UNUrketA3%2F1753979962452_Resume-SUMsmall-skil6.pdf?alt=media&token=d5157d1a-cc5d-489d-a9f6-5cd1921fa022";
    // const userId = "IoUuFFIjqK8cv8lR1vQR";
    // const fileType = "application/pdf";
    // const texho = await this.candidateService.processResumeWithPythonTest(resumeUrl, userId, fileType)
    // console.log(texho);
  }

}
