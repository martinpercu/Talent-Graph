import { Component, inject, effect } from '@angular/core';
import { TranslocoPipe } from '@jsverse/transloco';

import { CandidateHeaderComponent } from '@candidate/candidate-header/candidate-header.component';

import { CandidateService } from '@services/candidate.service';
import { JobCrudService } from '@services/job-crud.service';
import { Job } from '@models/job';




@Component({
  selector: 'app-user-candidate-page',
  imports: [TranslocoPipe, CandidateHeaderComponent],
  templateUrl: './user-candidate-page.component.html',
  styleUrl: './user-candidate-page.component.css'
})
export class UserCandidatePageComponent {
  candidateService = inject(CandidateService);
  jobCrudService = inject(JobCrudService);

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


}
