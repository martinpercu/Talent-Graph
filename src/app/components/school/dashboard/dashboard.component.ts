import { Component, OnInit, inject } from '@angular/core';
import { CommonModule} from '@angular/common';

import { environment } from '@env/environment';

import { MatIconModule } from '@angular/material/icon';
import { combineLatest } from 'rxjs';
import { map } from 'rxjs/operators';

import { CourseCardComponent } from '../course-card/course-card.component';
import { StudentListComponent } from '../student-list/student-list.component';

import { CourseService } from '@services/course.service';
import { StudentService } from '@services/student.service';
import { UserService } from '@services/user.service';
import { CourseCrudService } from '@services/course-crud.service';
import { ResultService } from '@services/result.service';
import { TeacherCrudService } from '@services/teacher-crud.service';
import { ExamCrudService } from '@services/exam-crud.service';

import { Course } from '@models/course';
import { Student } from '@models/student';
import { User } from '@models/user';
import { Result } from '@models/result';
import { Exam } from '@models/exam';

import { Observable } from 'rxjs';
import { ExamResultListComponent } from "../exam-result-list/exam-result-list.component";
import { Teacher } from '@models/teacher';
import { TeacherListComponent } from "../teacher-list/teacher-list.component";
import { ExamsListComponent } from "../exams-list/exams-list.component";


@Component({
  selector: 'app-dashboard',
  standalone: true,
  imports: [CommonModule, MatIconModule, StudentListComponent, ExamResultListComponent, TeacherListComponent, ExamsListComponent],
  templateUrl: './dashboard.component.html'
})

export class DashboardComponent implements OnInit {

  userService = inject(UserService);
  // courseService = inject(CourseService);
  studentService = inject(StudentService);
  // courseCrudService = inject(CourseCrudService);
  resultService = inject(ResultService);
  teacherCrudService = inject(TeacherCrudService);
  examCrudService = inject(ExamCrudService);

  // courses: Course[] = [];
  students: Student[] = [];
  users: User[] = [];
  results: Result[] = [];
  usersWithResults: { user: User; results: Result[] }[] = [];
  teachers: Teacher[] = [];
  exams: Exam[] = [];


  currentView: 'teachers' | 'courses' | 'students' | 'results' | 'config' | 'exams' = 'teachers'; // Default to courses

  ngOnInit() {
    // this.userService.getAllUsers().subscribe(users => {
    //   this.users = users;
    //   console.log(this.users);
    // })
    // this.courseCrudService.getCourses().subscribe(courses => {
    //   this.courses = courses;
    //   console.log(this.courses);
    // })

    this.resultService.getAllResults().subscribe(results => {
      this.results = results;
      console.log(this.results);
    })

    combineLatest([
      this.userService.getAllUsers(),
      this.resultService.getAllResults()
    ]).pipe(
      map(([users, results]) => {
        return users.map(user => ({
          user,
          results: results.filter(result => result.userUID === user.userUID)
        }));
      })
    ).subscribe(usersWithResults => {
      this.usersWithResults = usersWithResults;
    });

    this.teacherCrudService.getTeachers().subscribe(teachers => {
      this.teachers = teachers;
      console.log(this.teachers);
    })

    this.examCrudService.getExams().subscribe(exams => {
      this.exams = exams;
      console.log(this.exams);
    })
  }

  setView(view: 'teachers' | 'courses' | 'exams' | 'students' | 'results'  | 'config') {
    this.currentView = view;
  }

  goToMain() {
    // window.open("https://trainer-teacher.web.app", '_blank');
    window.open(`${environment.BASEURL}`, '_blank');
    // this.router.navigate(['/main']);
  }

}

