import { Component, Input, inject } from '@angular/core';
import { CommonModule, DatePipe, DecimalPipe } from '@angular/common';

// import { Student } from '@models/student';
import { MatIconModule } from '@angular/material/icon';

import { User } from '@models/user';
import { Result } from '@models/result';

import { ResultService } from '@services/result.service';

@Component({
  selector: 'app-student-list',
  standalone: true,
  imports: [MatIconModule, CommonModule, MatIconModule, DatePipe, DecimalPipe],
  templateUrl: './student-list.component.html'
})
export class StudentListComponent {
  // @Input() students!: Student[];
  @Input() user!: User;
  // @Input() result!: Result;
  @Input() results: Result[] = [];


  // userService = inject(UserService);
  // users: User[] = [];
  // userResurl!: Result;
  showExamsResult: boolean = false;
  showDetails: boolean = false;
  showExtraExamDetails: boolean = false;

  ngOnInit() {
    console.log(this.user);
  }

  switchShowExamsResults() {
    this.showExamsResult = !this.showExamsResult
  }

  switchShowDetails() {
    this.showDetails = !this.showDetails
  }

  // getUserResult(userId) {
  //   this.resultService.getResultsByUserId(userId).subscribe(results => {
  //     this.results = results;
  //     console.log(this.results);
  //   })
  // }

}
