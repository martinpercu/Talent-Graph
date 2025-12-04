import { Injectable, inject, signal } from '@angular/core';

import { CandidateService } from '@services/candidate.service'

@Injectable({
  providedIn: 'root'
})
export class CandidateVisualService {
  candidateService = inject(CandidateService);

  candiHasRecruiter = signal<boolean>(false);
  candiHasThisJob = signal<boolean>(false);

  constructor() { }

}
