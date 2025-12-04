import { Component, inject, signal } from '@angular/core';
import { CommonModule } from '@angular/common';
import { ActivatedRoute, Router } from '@angular/router';

import { ChatComponent } from '@components/chat/chat.component';
import { LeftMenuComponent } from '@components/left-menu/left-menu.component';
import { ModalhowitworksComponent } from '@components/modalhowitworks/modalhowitworks.component';

import { AuthService } from '@services/auth.service';
import { VisualStatesService } from '@services/visual-states.service';
import { PagesService } from '@services/pages.service';
import { CourseCrudService } from '@services/course-crud.service';

import { Firestore, collection, collectionData } from '@angular/fire/firestore';
import { Observable, of } from 'rxjs';
import { catchError } from 'rxjs/operators';

import { Teacher } from '@models/teacher';
import { Course } from '@models/course';
import { Exam } from '@models/exam';

import { UserService } from '@services/user.service';
import { ExamCrudService } from '@services/exam-crud.service';



@Component({
  selector: 'app-teacher-main-page',
  imports: [CommonModule, ChatComponent, LeftMenuComponent, ModalhowitworksComponent],
  templateUrl: './teacher-main-page.component.html'
})
export class TeacherMainPageComponent {
  teachers$!: Observable<Teacher[]>;

  authService = inject(AuthService);
  visualStatesService = inject(VisualStatesService);

  pagesService = inject(PagesService);
  private route = inject(ActivatedRoute);

  userService = inject(UserService);
  courseCrudService = inject(CourseCrudService);
  examCrudService = inject(ExamCrudService);

  private firestore = inject(Firestore);

  currentUser = this.userService.userSig();

  course!: Course;
  exam!: Exam;

  async ngOnInit() {
    // Extraer el examId de la URL.. OJO esta en /teacher/:id
    const examId = this.route.snapshot.paramMap.get('id'); // Ruta /teacher/:id

    if (examId) {

      this.pagesService.setExamPath(examId);

      this.examCrudService.getExamById(examId).pipe(
        catchError(error => {
          console.error('Error fetching course:', error);
          return of(null);
        })
      ).subscribe(exam => {
        if (exam) {
          this.exam = exam;
          // Usar teacherId del curso para PagesService
          if (exam.teacherId) {
            this.pagesService.setConfiguration(exam.teacherId).catch(error => {
              console.error('Error setting configuration:', error);
            });
          } else {
            console.error('No teacherId found for exam:', examId);
          }
        } else {
          console.error('Exam not found for ID:', examId);
        }
      });
    } else {
      console.error('No exam ID provided in URL');
    }
  }

  // async ngOnInit() {
  //   // Extraer el teacherId de la URL
  //   const courseId = this.route.snapshot.paramMap.get('id'); // Asumiendo ruta /teacher/:id

  //   if (courseId) {
  //     try {
  //       // this.course = this.courseCrudService.getCourseById(courseId)
  //       this.course = this.courseCrudService.getCourseById(courseId)
  //       // Pasar el teacherId a PagesService
  //       await this.pagesService.setConfiguration(this.teacherId);
  //     } catch (error) {
  //       alert('problems setting teacher hey Martin!')
  //     }
  //   } else {
  //     alert('hey no teacher talk to Martin')
  //   }
  // }




  toggleShowLeftMenuHeader() {
    this.visualStatesService.togleShowLeftMenu()
  }


}
