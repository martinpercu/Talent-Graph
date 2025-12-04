import { Component, Input, inject } from '@angular/core';
import { CommonModule, DatePipe } from '@angular/common';
import { MatIconModule } from '@angular/material/icon';

import { Exam } from '@models/exam'

@Component({
  selector: 'app-exams-list',
  imports: [CommonModule, MatIconModule],
  templateUrl: './exams-list.component.html',
  styleUrl: './exams-list.component.css'
})
export class ExamsListComponent {
  @Input() exam!: Exam;

  exams: Exam[] = [];

  showQuestions: boolean = false;
  showOptions: boolean[] = [];

  ngOnInit() {
    this.showOptions = this.exam.questions.map(() => false);
    console.log(this.exam);

  }

  switchShowQuestions() {
    this.showQuestions = !this.showQuestions;
  }

  toggleOptions(index: number) {
    this.showOptions[index] = !this.showOptions[index];
  }



}
