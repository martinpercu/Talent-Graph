import { Component, Input } from '@angular/core';
import { CommonModule, DatePipe, DecimalPipe } from '@angular/common';

import { MatIconModule } from '@angular/material/icon';
import { Result } from '@models/result';


@Component({
  selector: 'app-exam-result-list',
  imports: [MatIconModule, CommonModule, DatePipe, DecimalPipe],
  templateUrl: './exam-result-list.component.html',
  styleUrl: './exam-result-list.component.css'
})
export class ExamResultListComponent {
  @Input() result!: Result;


}
