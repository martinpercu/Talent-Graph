import { Component, OnInit, inject } from '@angular/core';
import { Auth, authState } from '@angular/fire/auth';

import { Observable, of } from 'rxjs';
import { catchError } from 'rxjs/operators';
import { FormsModule } from '@angular/forms';
import { CommonModule, AsyncPipe } from '@angular/common';

import { ExamCrudService } from '@services/exam-crud.service';
import { TeacherCrudService } from '@services/teacher-crud.service';
import { Exam, Question, Option } from '@models/exam';
import { Teacher } from '@models/teacher';

import { MatIcon } from '@angular/material/icon';

import { TranslocoPipe } from '@jsverse/transloco';


@Component({
  selector: 'app-exam-crud',
  imports: [FormsModule, CommonModule, AsyncPipe, MatIcon, TranslocoPipe],
  templateUrl: './exam-crud.component.html',
  styleUrl: './exam-crud.component.css'
})
export class ExamCrudComponent implements OnInit {

  examCrudService = inject(ExamCrudService);
  teacherCrudService = inject(TeacherCrudService);
  auth = inject(Auth);

  exams$!: Observable<Exam[]>;
  teachers$!: Observable<Teacher[]>;
  newExam: Partial<Exam> = {
    title: '',
    teacherId: '',
    teacherName: '',
    questions: [],
    passingPercentage: 70,
    timeToWait: 48,
    enable: true,
    timeToDoTheExam: 60,
    recruiterId: ''
  };
  errorMessage: string = '';
  editingExamId: string | undefined = undefined;
  selectedExamId: string = '';
  isSaving: boolean = false;

  isAuthenticated: boolean = false;
  private recruiterId!: string;


  async ngOnInit() {
    authState(this.auth).subscribe((user) => {
      this.isAuthenticated = !!user;
      console.log(user);
      if (user && user.uid) {
        this.recruiterId = user.uid;
        console.log(this.recruiterId);
      }

      if (!this.isAuthenticated) {
        this.errorMessage = 'Debes iniciar sesión para acceder a los trabajos';
        this.exams$ = of([]);
        return;
      }

      console.log(this.recruiterId);

      this.exams$ = this.examCrudService.getExamsByRecruiterId(this.recruiterId);
      console.log(this.exams$);

      this.teachers$ = this.teacherCrudService.getTeachers().pipe(
        catchError(error => {
          console.error('Error al cargar profesores:', error);
          this.errorMessage = 'No se pudieron cargar los profesores';
          return of([]);
        })
      )
    })
  }

  loadExam(event: Event) {
    const selectElement = event.target as HTMLSelectElement;
    const examId = selectElement.value;
    this.selectedExamId = examId;

    if (examId) {
      this.examCrudService.getExamById(examId).subscribe({
        next: (exam) => {
          if (exam) {
            this.newExam = {
              title: exam.title,
              teacherId: exam.teacherId,
              teacherName: exam.teacherName,
              questions: exam.questions.map(q => ({
                text: q.text,
                options: q.options.map(o => ({ text: o.text, isCorrect: o.isCorrect }))
              })),
              passingPercentage: exam.passingPercentage ?? 70,
              timeToWait: exam.timeToWait ?? 48,
              enable: exam.enable ?? true,
              timeToDoTheExam: exam.timeToDoTheExam ?? 60
            };
            this.editingExamId = examId;
            this.errorMessage = '';
          } else {
            this.errorMessage = 'Examen no encontrado';
            this.resetForm();
          }
        },
        error: (error) => {
          console.error('Error al cargar el examen:', error);
          this.errorMessage = error.message || 'Error al cargar el examen';
          this.resetForm();
        }
      });
    } else {
      this.resetForm();
    }
  }

  saveExam() {
    if (this.isSaving) return;
    this.isSaving = true;
    this.errorMessage = '';

    if (!this.newExam.title?.trim()) {
      this.errorMessage = 'Exam title mandatory';
      this.isSaving = false;
      return;
    }

    // console.log(this.newExam.teacherId);
    // console.log(this.newExam.teacherName);
    // if (this.newExam.teacherId == '') {
    //   console.log('in teacher id set');
    //   this.newExam.teacherId = 's'
    // }
    // if (this.newExam.teacherName == '') {
    //   console.log('in teacher Name set');
    //   this.newExam.teacherName = 's'
    // }

    console.log(this.newExam.teacherId);
    console.log(this.newExam.teacherName);


    this.examCrudService.checkExamTitleExists(this.newExam.title, this.editingExamId).subscribe({
      next: (titleExists) => {
        if (titleExists) {
          this.errorMessage = 'Ya existe un examen con este título';
          this.isSaving = false;
          return;
        }
        console.log(this.recruiterId);

        // if (this.newExam.teacherId == undefined) {
        //   console.log('in teacher id set');
        //   this.newExam.teacherId = 's'
        // }
        // if (this.newExam.teacherName == undefined) {
        //   console.log('in teacher Name set');
        //   this.newExam.teacherName = 's'
        // }
        // console.log(this.newExam.teacherId);
        // console.log(this.newExam.teacherName);

        const examData: Partial<Exam> = {
          title: this.newExam.title!.trim(),
          teacherId: this.newExam.teacherId || "",
          teacherName: this.newExam.teacherName?.trim() || "",
          questions: this.newExam.questions,
          // courseId: this.newExam.courseId,
          passingPercentage: this.newExam.passingPercentage,
          timeToWait: this.newExam.timeToWait,
          enable: this.newExam.enable,
          timeToDoTheExam: this.newExam.timeToDoTheExam,
          recruiterId: this.recruiterId
        };
        console.log(examData);


        if (this.editingExamId) {
          this.examCrudService.updateExam(this.editingExamId, examData).subscribe({
            next: (success) => {
              this.isSaving = false;
              if (success) {
                this.resetForm();
              } else {
                this.errorMessage = 'Error al actualizar el examen';
              }
            },
            error: (error) => {
              this.isSaving = false;
              console.error('Error al actualizar el examen:', error);
              this.errorMessage = error.message || 'Error al actualizar el examen';
            }
          });
        } else {
          this.examCrudService.createExam(examData).subscribe({
            next: (id) => {
              this.isSaving = false;
              if (id) {
                this.resetForm();
              } else {
                this.errorMessage = 'Error al crear el examen';
              }
            },
            error: (error) => {
              this.isSaving = false;
              console.error('Error al crear el examen:', error);
              this.errorMessage = error.message || 'Error al crear el examen';
            }
          });
        }
      },
      error: (error) => {
        this.isSaving = false;
        console.error('Error al verificar el título:', error);
        this.errorMessage = error.message || 'Error al verificar el título del examen';
      }
    });
  }

  deleteExam() {
    if (this.isSaving || !this.editingExamId) return;
    this.isSaving = true;
    this.errorMessage = '';

    const confirmDelete = confirm('Are you sure to delete this exam?');
    if (confirmDelete) {
      this.examCrudService.deleteExam(this.editingExamId).subscribe({
        next: (success) => {
          this.isSaving = false;
          if (success) {
            this.resetForm();
          } else {
            this.errorMessage = 'Error al eliminar el examen';
          }
        },
        error: (error) => {
          this.isSaving = false;
          console.error('Error al eliminar el examen:', error);
          this.errorMessage = error.message || 'Error al eliminar el examen';
        }
      });
    } else {
      this.isSaving = false;
    }
  }

  updateTeacherName(event: Event) {
    const selectElement = event.target as HTMLSelectElement;
    const teacherId = selectElement.value;
    this.newExam.teacherId = teacherId;

    if (teacherId) {
      this.teacherCrudService.getTeacherById(teacherId).subscribe({
        next: (teacher) => {
          this.newExam.teacherName = teacher ? teacher.name : '';
          this.errorMessage = '';
        },
        error: (error) => {
          console.error('Error al obtener el profesor:', error);
          this.newExam.teacherName = '';
          this.errorMessage = error.message || 'Error al cargar el profesor';
        }
      });
    } else {
      this.newExam.teacherName = '';
      this.newExam.teacherId = '';
      this.errorMessage = '';
    }
  }

  addQuestion() {
    this.newExam.questions = this.newExam.questions || [];
    this.newExam.questions.push({
      text: '',
      options: [
        { text: '', isCorrect: true },
        { text: '', isCorrect: false }
      ]
    });
  }

  removeQuestion(index: number) {
    this.newExam.questions = this.newExam.questions?.filter((_, i) => i !== index) || [];
  }

  addOption(questionIndex: number) {
    this.newExam.questions = this.newExam.questions || [];
    const question = this.newExam.questions[questionIndex];
    if (question.options.length < 6) {
      question.options.push({ text: '', isCorrect: false });
    }
  }

  removeOption(questionIndex: number, optionIndex: number) {
    this.newExam.questions = this.newExam.questions || [];
    const question = this.newExam.questions[questionIndex];
    if (question.options.length > 2) {
      question.options = question.options.filter((_, i) => i !== optionIndex);
      if (!question.options.some(opt => opt.isCorrect)) {
        question.options[0].isCorrect = true;
      }
    }
  }

  updateOptionCorrectness(questionIndex: number, optionIndex: number) {
    const question = this.newExam.questions![questionIndex];
    question.options = question.options.map((opt, i) => ({
      ...opt,
      isCorrect: i === optionIndex
    }));
  }

  resetForm() {
    this.newExam = {
      title: '',
      teacherId: '',
      teacherName: '',
      questions: [],
      // courseId: '',
      passingPercentage: 70,
      timeToWait: 48,
      enable: true,
      timeToDoTheExam: 60
    };
    this.editingExamId = undefined;
    this.selectedExamId = '';
    this.errorMessage = '';
  }

  private isValidQuestion(question: Question): boolean {
    if (!question.text?.trim()) {
      return false;
    }
    if (!Array.isArray(question.options) || question.options.length < 2 || question.options.length > 6) {
      return false;
    }
    const correctCount = question.options.filter(opt => opt.isCorrect).length;
    if (correctCount !== 1) {
      return false;
    }
    return question.options.every(opt => opt.text?.trim() && typeof opt.isCorrect === 'boolean');
  }

}




//   examCrudService = inject(ExamCrudService);
//   teacherCrudService = inject(TeacherCrudService);

//   exams$!: Observable<Exam[]>;
//   teachers$!: Observable<Teacher[]>;
//   newExam: Partial<Exam> = {
//     title: '',
//     teacherId: '',
//     teacherName: '',
//     questions: [],
//     passingPercentage: 70,
//     timeToWait: 48
//   };
//   errorMessage: string = '';
//   editingExamId: string | undefined = undefined;
//   selectedExamId: string = '';
//   isSaving: boolean = false;


//   ngOnInit() {
//     this.exams$ = this.examCrudService.getExams();
//     this.teachers$ = this.teacherCrudService.getTeachers().pipe(
//       catchError(error => {
//         console.error('Error al cargar profesores:', error);
//         this.errorMessage = 'No se pudieron cargar los profesores';
//         return of([]);
//       })
//     );
//   }

//   loadExam(event: Event) {
//     const selectElement = event.target as HTMLSelectElement;
//     const examId = selectElement.value;
//     this.selectedExamId = examId;

//     if (examId) {
//       this.examCrudService.getExamById(examId).subscribe({
//         next: (exam) => {
//           if (exam) {
//             this.newExam = {
//               title: exam.title,
//               teacherId: exam.teacherId,
//               teacherName: exam.teacherName || '',
//               questions: exam.questions.map(q => ({
//                 text: q.text,
//                 options: q.options.map(o => ({ text: o.text, isCorrect: o.isCorrect }))
//               })),
//               passingPercentage: exam.passingPercentage ?? 70,
//               timeToWait: exam.timeToWait ?? 48
//             };
//             this.editingExamId = examId;
//             this.errorMessage = '';
//           } else {
//             this.errorMessage = 'Examen no encontrado';
//             this.resetForm();
//           }
//         },
//         error: (error) => {
//           console.error('Error al cargar el examen:', error);
//           this.errorMessage = error.message || 'Error al cargar el examen';
//           this.resetForm();
//         }
//       });
//     } else {
//       this.resetForm();
//     }
//   }

//   saveExam() {
//     if (this.isSaving) return;
//     this.isSaving = true;
//     this.errorMessage = '';

//     if (!this.newExam.title?.trim()) {
//       this.errorMessage = 'Exam title mandatory';
//       this.isSaving = false;
//       return;
//     }

//     this.examCrudService.checkExamTitleExists(this.newExam.title, this.editingExamId).subscribe({
//       next: (titleExists) => {
//         if (titleExists) {
//           this.errorMessage = 'Ya existe un examen con este título';
//           this.isSaving = false;
//           return;
//         }

//         const examData: Partial<Exam> = {
//           title: this.newExam.title!.trim(),
//           teacherId: this.newExam.teacherId,
//           teacherName: this.newExam.teacherName?.trim() || undefined,
//           questions: this.newExam.questions,
//           // courseId: this.newExam.courseId,
//           passingPercentage: this.newExam.passingPercentage,
//           timeToWait: this.newExam.timeToWait
//         };

//         if (this.editingExamId) {
//           this.examCrudService.updateExam(this.editingExamId, examData).subscribe({
//             next: (success) => {
//               this.isSaving = false;
//               if (success) {
//                 this.resetForm();
//               } else {
//                 this.errorMessage = 'Error al actualizar el examen';
//               }
//             },
//             error: (error) => {
//               this.isSaving = false;
//               console.error('Error al actualizar el examen:', error);
//               this.errorMessage = error.message || 'Error al actualizar el examen';
//             }
//           });
//         } else {
//           this.examCrudService.createExam(examData).subscribe({
//             next: (id) => {
//               this.isSaving = false;
//               if (id) {
//                 this.resetForm();
//               } else {
//                 this.errorMessage = 'Error al crear el examen';
//               }
//             },
//             error: (error) => {
//               this.isSaving = false;
//               console.error('Error al crear el examen:', error);
//               this.errorMessage = error.message || 'Error al crear el examen';
//             }
//           });
//         }
//       },
//       error: (error) => {
//         this.isSaving = false;
//         console.error('Error al verificar el título:', error);
//         this.errorMessage = error.message || 'Error al verificar el título del examen';
//       }
//     });
//   }

//   deleteExam() {
//     if (this.isSaving || !this.editingExamId) return;
//     this.isSaving = true;
//     this.errorMessage = '';

//     const confirmDelete = confirm('Are you sure to delete this exam?');
//     if (confirmDelete) {
//       this.examCrudService.deleteExam(this.editingExamId).subscribe({
//         next: (success) => {
//           this.isSaving = false;
//           if (success) {
//             this.resetForm();
//           } else {
//             this.errorMessage = 'Error al eliminar el examen';
//           }
//         },
//         error: (error) => {
//           this.isSaving = false;
//           console.error('Error al eliminar el examen:', error);
//           this.errorMessage = error.message || 'Error al eliminar el examen';
//         }
//       });
//     } else {
//       this.isSaving = false;
//     }
//   }

//   updateTeacherName(event: Event) {
//     const selectElement = event.target as HTMLSelectElement;
//     const teacherId = selectElement.value;
//     this.newExam.teacherId = teacherId;

//     if (teacherId) {
//       this.teacherCrudService.getTeacherById(teacherId).subscribe({
//         next: (teacher) => {
//           this.newExam.teacherName = teacher ? teacher.name : '';
//           this.errorMessage = '';
//         },
//         error: (error) => {
//           console.error('Error al obtener el profesor:', error);
//           this.newExam.teacherName = '';
//           this.errorMessage = error.message || 'Error al cargar el profesor';
//         }
//       });
//     } else {
//       this.newExam.teacherName = '';
//       this.newExam.teacherId = '';
//       this.errorMessage = '';
//     }
//   }

//   addQuestion() {
//     this.newExam.questions = this.newExam.questions || [];
//     this.newExam.questions.push({
//       text: '',
//       options: [
//         { text: '', isCorrect: true },
//         { text: '', isCorrect: false }
//       ]
//     });
//   }

//   removeQuestion(index: number) {
//     this.newExam.questions = this.newExam.questions?.filter((_, i) => i !== index) || [];
//   }

//   addOption(questionIndex: number) {
//     this.newExam.questions = this.newExam.questions || [];
//     const question = this.newExam.questions[questionIndex];
//     if (question.options.length < 6) {
//       question.options.push({ text: '', isCorrect: false });
//     }
//   }

//   removeOption(questionIndex: number, optionIndex: number) {
//     this.newExam.questions = this.newExam.questions || [];
//     const question = this.newExam.questions[questionIndex];
//     if (question.options.length > 2) {
//       question.options = question.options.filter((_, i) => i !== optionIndex);
//       if (!question.options.some(opt => opt.isCorrect)) {
//         question.options[0].isCorrect = true;
//       }
//     }
//   }

//   updateOptionCorrectness(questionIndex: number, optionIndex: number) {
//     const question = this.newExam.questions![questionIndex];
//     question.options = question.options.map((opt, i) => ({
//       ...opt,
//       isCorrect: i === optionIndex
//     }));
//   }

//   resetForm() {
//     this.newExam = {
//       title: '',
//       teacherId: '',
//       teacherName: '',
//       questions: [],
//       // courseId: '',
//       passingPercentage: 70,
//       timeToWait: 48
//     };
//     this.editingExamId = undefined;
//     this.selectedExamId = '';
//     this.errorMessage = '';
//   }

//   private isValidQuestion(question: Question): boolean {
//     if (!question.text?.trim()) {
//       return false;
//     }
//     if (!Array.isArray(question.options) || question.options.length < 2 || question.options.length > 6) {
//       return false;
//     }
//     const correctCount = question.options.filter(opt => opt.isCorrect).length;
//     if (correctCount !== 1) {
//       return false;
//     }
//     return question.options.every(opt => opt.text?.trim() && typeof opt.isCorrect === 'boolean');
//   }

// }
