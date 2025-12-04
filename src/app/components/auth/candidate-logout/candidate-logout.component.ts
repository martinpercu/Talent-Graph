import { Component, inject } from '@angular/core';
import { CandidateAuthService } from '@services/candidate-auth.service';

@Component({
  selector: 'app-candidate-logout',
  imports: [],
  templateUrl: './candidate-logout.component.html'
})
export class CandidateLogoutComponent {

  candidateAuthService = inject(CandidateAuthService);

  logout(){
    this.candidateAuthService.logout();
  }

}
