import { Injectable } from '@angular/core';
import { Student } from '@models/student';
import { CourseService } from './course.service';

@Injectable({
  providedIn: 'root'
})
export class StudentService {
  private students: Student[];

  constructor(private courseService: CourseService) {
    const courses = this.courseService.getCourses();
    this.students = [
      {
        id: '1',
        name: 'Ana López',
        email: 'ana.lopez@example.com',
        enrolledCourses: [courses[0], courses[1]]
      },
      {
        id: '2',
        name: 'Juan Pérez',
        email: 'juan.perez@example.com',
        enrolledCourses: [courses[1], courses[2]]
      },
      {
        id: '3',
        name: 'María Gómez',
        email: 'maria.gomez@example.com',
        enrolledCourses: [courses[0], courses[2]]
      }
    ];
  }

  getStudents(): Student[] {
    return this.students;
  }
}
