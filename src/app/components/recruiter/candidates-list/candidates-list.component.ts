import { Component, Input, inject } from '@angular/core';
import { CommonModule, DatePipe, DecimalPipe } from '@angular/common';
import { Router } from '@angular/router';
import { TranslocoPipe } from '@jsverse/transloco';


// import { Student } from '@models/student';
import { MatIconModule } from '@angular/material/icon';

import { Candidate } from '@models/candidate';
import { Result } from '@models/result';

import { ResultService } from '@services/result.service';

@Component({
  selector: 'app-candidates-list',
  imports: [MatIconModule, CommonModule, MatIconModule, DatePipe, DecimalPipe, TranslocoPipe],
  templateUrl: './candidates-list.component.html',
})
export class CandidatesListComponent {
  // @Input() students!: Student[];
  @Input() candidate!: Candidate;
  // @Input() result!: Result;
  @Input() results: Result[] = [];

  router = inject(Router);
  // users: User[] = [];
  // userResurl!: Result;
  showExamsResult: boolean = false;
  showDetails: boolean = false;
  showExtraExamDetails: boolean = false;

  ngOnInit() {
    console.log(this.candidate);
  }

  switchShowExamsResults() {
    this.showExamsResult = !this.showExamsResult;
  }

  switchShowDetails() {
    this.showDetails = !this.showDetails;
  }

  getResume() {
    // this.router.nav;
    window.open(`${this.candidate.resumePath}`, '_blank');
  }
}
