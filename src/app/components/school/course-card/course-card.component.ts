import { Component, Input, inject } from '@angular/core';
import { CommonModule, DatePipe } from '@angular/common';
import { MatIconModule } from '@angular/material/icon';

import { Course } from '@models/course';
import { CourseCrudService } from '@services/course-crud.service';



@Component({
  selector: 'app-course-card',
  standalone: true,
  imports: [MatIconModule, CommonModule, DatePipe],
  templateUrl: './course-card.component.html'
})
export class CourseCardComponent {
  @Input() course!: Course;
  // courseCrudService = inject(CourseCrudService);

  courses: Course[] = [];

  // ngOnInit() {
  //   this.courseCrudService.getCourses().subscribe(courses => {
  //     this.courses = courses;
  //     console.log(this.courses);
  //   })
  // }

}
