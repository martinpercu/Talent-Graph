// import { Component, OnInit } from '@angular/core';
// import { Firestore, collection, collectionData } from '@angular/fire/firestore';
// import { Observable, of } from 'rxjs';
// import { catchError, map } from 'rxjs/operators';
// import { FormsModule } from '@angular/forms';
// import { CommonModule, AsyncPipe } from '@angular/common';

// import { CourseCrudService } from '@services/course-crud.service';
// import { TeacherCrudService } from '@services/teacher-crud.service';
// import { Course } from '@models/course';
// import { Teacher } from '@models/teacher';
import { Component, OnInit } from '@angular/core';
import { Firestore, collection, collectionData } from '@angular/fire/firestore';
import { Observable, of } from 'rxjs';
import { catchError, map } from 'rxjs/operators';
import { FormsModule } from '@angular/forms';
import { CommonModule, AsyncPipe } from '@angular/common';
import { MatIconModule } from '@angular/material/icon';
import { CourseCrudService } from '@services/course-crud.service';
import { TeacherCrudService } from '@services/teacher-crud.service';
import { Course } from '@models/course';
import { Teacher } from '@models/teacher';

@Component({
  selector: 'app-course-crud',
  standalone: true,
  imports: [FormsModule, CommonModule, AsyncPipe, MatIconModule],
  templateUrl: './course-crud.component.html'
})

export class CoursesCRUDComponent implements OnInit {
  courses$!: Observable<Course[]>;
  teachers$!: Observable<Teacher[]>;
  newCourse: Partial<Course> = {
    name: '',
    title: '',
    teacherId: '',
    teacherName: '',
    enabled: true,
    startDate: undefined,
    endDate: undefined,
    description: '',
    difficulty: 2
  };
  errorMessage: string = '';
  editingCourseId: string | undefined = undefined;
  selectedCourseId: string = '';
  isSaving: boolean = false;

  constructor(
    private courseCrudService: CourseCrudService,
    private teacherCrudService: TeacherCrudService,
    private firestore: Firestore
  ) {}

  ngOnInit() {
    this.courses$ = this.courseCrudService.getCourses();
    this.teachers$ = this.teacherCrudService.getTeachers().pipe(
      catchError(error => {
        console.error('Error al cargar profesores:', error);
        this.errorMessage = 'No se pudieron cargar los profesores';
        return of([]);
      })
    );

    // Establecer teacherId inicial
    this.teachers$.subscribe(teachers => {
      if (teachers.length > 0 && !this.newCourse.teacherId) {
        this.newCourse.teacherId = teachers[0].id;
        this.newCourse.teacherName = teachers[0].name;
      }
    });
  }

  loadCourse(event: Event) {
    const selectElement = event.target as HTMLSelectElement;
    const courseId = selectElement.value;
    this.selectedCourseId = courseId;

    if (courseId) {
      this.courseCrudService.getCourseById(courseId).subscribe({
        next: (course) => {
          if (course) {
            this.newCourse = {
              name: course.name || '',
              title: course.title,
              teacherId: course.teacherId,
              teacherName: course.teacherName || '',
              enabled: course.enabled ?? true,
              startDate: course.startDate || undefined,
              endDate: course.endDate || undefined,
              description: course.description || '',
              difficulty: course.difficulty
            };
            this.editingCourseId = courseId;
            this.errorMessage = '';
          } else {
            this.errorMessage = 'Curso no encontrado';
            this.resetForm();
          }
        },
        error: (error) => {
          console.error('Error al cargar el curso:', error);
          this.errorMessage = error.message || 'Error al cargar el curso';
          this.resetForm();
        }
      });
    } else {
      this.resetForm();
    }
  }

  saveCourse() {
    if (this.isSaving) return;
    this.isSaving = true;
    this.errorMessage = '';

    if (!this.newCourse.title?.trim()) {
      this.errorMessage = 'El título es requerido';
      this.isSaving = false;
      return;
    }
    if (!this.newCourse.teacherId?.trim()) {
      this.errorMessage = 'El profesor es requerido';
      this.isSaving = false;
      return;
    }
    if (this.newCourse.difficulty === undefined) {
      this.errorMessage = 'La dificultad es requerida';
      this.isSaving = false;
      return;
    }
    if (this.newCourse.difficulty < 1 || this.newCourse.difficulty > 5) {
      this.errorMessage = 'La dificultad debe estar entre 1 y 5';
      this.isSaving = false;
      return;
    }

    this.courseCrudService.checkCourseTitleExists(this.newCourse.title, this.editingCourseId).subscribe({
      next: (exists) => {
        if (exists) {
          this.errorMessage = 'Ya existe un curso con este título';
          this.isSaving = false;
          return;
        }

        const courseData: Partial<Course> = {
          name: this.newCourse.name?.trim() || undefined,
          title: this.newCourse.title!.trim(),
          teacherId: this.newCourse.teacherId,
          teacherName: this.newCourse.teacherName?.trim() || undefined,
          enabled: this.newCourse.enabled ?? true,
          startDate: this.newCourse.startDate?.trim() || undefined,
          endDate: this.newCourse.endDate?.trim() || undefined,
          description: this.newCourse.description?.trim() || undefined,
          difficulty: this.newCourse.difficulty
        };

        if (this.editingCourseId) {
          this.courseCrudService.updateCourse(this.editingCourseId, courseData).subscribe({
            next: (success) => {
              this.isSaving = false;
              if (success) {
                this.resetForm();
              } else {
                this.errorMessage = 'Error al actualizar el curso';
              }
            },
            error: (error) => {
              this.isSaving = false;
              console.error('Error al actualizar el curso:', error);
              this.errorMessage = error.message || 'Error al actualizar el curso';
            }
          });
        } else {
          this.courseCrudService.createCourse(courseData).subscribe({
            next: (id) => {
              this.isSaving = false;
              if (id) {
                this.resetForm();
              } else {
                this.errorMessage = 'Error al crear el curso';
              }
            },
            error: (error) => {
              this.isSaving = false;
              console.error('Error al crear el curso:', error);
              this.errorMessage = error.message || 'Error al crear el curso';
            }
          });
        }
      },
      error: (error) => {
        this.isSaving = false;
        console.error('Error al verificar el título:', error);
        this.errorMessage = error.message || 'Error al verificar el título del curso';
      }
    });
  }

  deleteCourse() {
    if (this.isSaving || !this.editingCourseId) return;
    this.isSaving = true;
    this.errorMessage = '';

    const confirmDelete = confirm('¿Estás seguro de que quieres eliminar este curso?');
    if (confirmDelete) {
      this.courseCrudService.deleteCourse(this.editingCourseId).subscribe({
        next: (success) => {
          this.isSaving = false;
          if (success) {
            this.resetForm();
          } else {
            this.errorMessage = 'Error al eliminar el curso';
          }
        },
        error: (error) => {
          this.isSaving = false;
          console.error('Error al eliminar el curso:', error);
          this.errorMessage = error.message || 'Error al eliminar el curso';
        }
      });
    } else {
      this.isSaving = false;
    }
  }

  updateTeacherName(event: Event) {
    const selectElement = event.target as HTMLSelectElement;
    const teacherId = selectElement.value;
    this.newCourse.teacherId = teacherId;

    if (teacherId) {
      this.teacherCrudService.getTeacherById(teacherId).subscribe({
        next: (teacher) => {
          this.newCourse.teacherName = teacher ? teacher.name : '';
          this.errorMessage = '';
        },
        error: (error) => {
          console.error('Error al obtener el profesor:', error);
          this.newCourse.teacherName = '';
          this.errorMessage = error.message || 'Error al cargar el profesor';
        }
      });
    } else {
      this.teachers$.subscribe(teachers => {
        this.newCourse.teacherId = teachers.length > 0 ? teachers[0].id : '';
        this.newCourse.teacherName = teachers.length > 0 ? teachers[0].name : '';
      });
    }
  }

  resetForm() {
    this.teachers$.subscribe(teachers => {
      this.newCourse = {
        name: '',
        title: '',
        teacherId: teachers.length > 0 ? teachers[0].id : '',
        teacherName: teachers.length > 0 ? teachers[0].name : '',
        enabled: true,
        startDate: undefined,
        endDate: undefined,
        description: '',
        difficulty: 2
      };
      this.editingCourseId = undefined;
      this.selectedCourseId = '';
      this.errorMessage = '';
    });
  }

  clearStartDate() {
    this.newCourse.startDate = undefined;
  }

  clearEndDate() {
    this.newCourse.endDate = undefined;
  }

  getDifficultyLabel(difficulty: number): string {
    switch (difficulty) {
      case 1: return 'Easy';
      case 2: return 'Moderate';
      case 3: return 'Challenging';
      case 4: return 'Hard';
      case 5: return 'Very Difficult';
      default: return 'Moderate';
    }
  }









  // courses$!: Observable<Course[]>;
  // teachers$!: Observable<Teacher[]>;
  // newCourse: Partial<Course> = {
  //   name: '',
  //   title: '',
  //   teacherId: '',
  //   teacherName: '',
  //   enabled: true,
  //   startDate: undefined,
  //   endDate: undefined,
  //   description: '',
  //   difficulty: 2
  // };
  // errorMessage: string = '';
  // editingCourseId: string | undefined = undefined;
  // selectedCourseId: string = '';
  // isSaving: boolean = false;

  // constructor(
  //   private courseCrudService: CourseCrudService,
  //   private teacherCrudService: TeacherCrudService,
  //   private firestore: Firestore
  // ) {}

  // ngOnInit() {
  //   this.courses$ = this.courseCrudService.getCourses();
  //   this.teachers$ = this.teacherCrudService.getTeachers().pipe(
  //     catchError(error => {
  //       console.error('Error al cargar profesores:', error);
  //       this.errorMessage = 'No se pudieron cargar los profesores';
  //       return of([]);
  //     })
  //   );
  // }

  // loadCourse(event: Event) {
  //   const selectElement = event.target as HTMLSelectElement;
  //   const courseId = selectElement.value;
  //   this.selectedCourseId = courseId;

  //   if (courseId) {
  //     this.courseCrudService.getCourseById(courseId).subscribe({
  //       next: (course) => {
  //         if (course) {
  //           this.newCourse = {
  //             name: course.name || '',
  //             title: course.title,
  //             teacherId: course.teacherId || '',
  //             teacherName: course.teacherName || '',
  //             enabled: course.enabled ?? true,
  //             startDate: course.startDate || undefined,
  //             endDate: course.endDate || undefined,
  //             description: course.description || '',
  //             difficulty: course.difficulty ?? 2
  //           };
  //           this.editingCourseId = courseId;
  //           this.errorMessage = '';
  //         } else {
  //           this.errorMessage = 'Curso no encontrado';
  //           this.resetForm();
  //         }
  //       },
  //       error: (error) => {
  //         console.error('Error al cargar el curso:', error);
  //         this.errorMessage = error.message || 'Error al cargar el curso';
  //         this.resetForm();
  //       }
  //     });
  //   } else {
  //     this.resetForm();
  //   }
  // }

  // saveCourse() {
  //   if (this.isSaving) return;
  //   this.isSaving = true;
  //   this.errorMessage = '';

  //   if (!this.newCourse.title?.trim()) {
  //     this.errorMessage = 'El título es requerido';
  //     this.isSaving = false;
  //     return;
  //   }

  //   this.courseCrudService.checkCourseTitleExists(this.newCourse.title, this.editingCourseId).subscribe({
  //     next: (exists) => {
  //       if (exists) {
  //         this.errorMessage = 'Ya existe un curso con este título';
  //         this.isSaving = false;
  //         return;
  //       }

  //       const courseData: Partial<Course> = {
  //         name: this.newCourse.name?.trim() || undefined,
  //         title: this.newCourse.title!.trim(),
  //         teacherId: this.newCourse.teacherId || undefined,
  //         teacherName: this.newCourse.teacherName || undefined,
  //         enabled: this.newCourse.enabled ?? true,
  //         startDate: this.newCourse.startDate?.trim() || undefined,
  //         endDate: this.newCourse.endDate?.trim() || undefined,
  //         description: this.newCourse.description?.trim() || undefined,
  //         difficulty: this.newCourse.difficulty ?? 2
  //       };

  //       if (this.editingCourseId) {
  //         this.courseCrudService.updateCourse(this.editingCourseId, courseData).subscribe({
  //           next: (success) => {
  //             this.isSaving = false;
  //             if (success) {
  //               this.resetForm();
  //             } else {
  //               this.errorMessage = 'Error al actualizar el curso';
  //             }
  //           },
  //           error: (error) => {
  //             this.isSaving = false;
  //             console.error('Error al actualizar el curso:', error);
  //             this.errorMessage = error.message || 'Error al actualizar el curso';
  //           }
  //         });
  //       } else {
  //         this.courseCrudService.createCourse(courseData).subscribe({
  //           next: (id) => {
  //             this.isSaving = false;
  //             if (id) {
  //               this.resetForm();
  //             } else {
  //               this.errorMessage = 'Error al crear el curso';
  //             }
  //           },
  //           error: (error) => {
  //             this.isSaving = false;
  //             console.error('Error al crear el curso:', error);
  //             this.errorMessage = error.message || 'Error al crear el curso';
  //           }
  //         });
  //       }
  //     },
  //     error: (error) => {
  //       this.isSaving = false;
  //       console.error('Error al verificar el título:', error);
  //       this.errorMessage = error.message || 'Error al verificar el título del curso';
  //     }
  //   });
  // }

  // deleteCourse() {
  //   if (this.isSaving || !this.editingCourseId) return;
  //   this.isSaving = true;
  //   this.errorMessage = '';

  //   const confirmDelete = confirm('¿Estás seguro de que quieres eliminar este curso?');
  //   if (confirmDelete) {
  //     this.courseCrudService.deleteCourse(this.editingCourseId).subscribe({
  //       next: (success) => {
  //         this.isSaving = false;
  //         if (success) {
  //           this.resetForm();
  //         } else {
  //           this.errorMessage = 'Error al eliminar el curso';
  //         }
  //       },
  //       error: (error) => {
  //         this.isSaving = false;
  //         console.error('Error al eliminar el curso:', error);
  //         this.errorMessage = error.message || 'Error al eliminar el curso';
  //       }
  //     });
  //   } else {
  //     this.isSaving = false;
  //   }
  // }

  // updateTeacherName(event: Event) {
  //   const selectElement = event.target as HTMLSelectElement;
  //   const teacherId = selectElement.value;
  //   this.newCourse.teacherId = teacherId;

  //   if (teacherId) {
  //     this.teacherCrudService.getTeacherById(teacherId).subscribe({
  //       next: (teacher) => {
  //         this.newCourse.teacherName = teacher ? teacher.name : '';
  //         this.errorMessage = '';
  //       },
  //       error: (error) => {
  //         console.error('Error al obtener el profesor:', error);
  //         this.newCourse.teacherName = '';
  //         this.errorMessage = error.message || 'Error al cargar el profesor';
  //       }
  //     });
  //   } else {
  //     this.newCourse.teacherName = '';
  //     this.newCourse.teacherId = '';
  //     this.errorMessage = '';
  //   }
  // }

  // resetForm() {
  //   this.newCourse = {
  //     name: '',
  //     title: '',
  //     teacherId: '',
  //     teacherName: '',
  //     enabled: true,
  //     startDate: undefined,
  //     endDate: undefined,
  //     description: '',
  //     difficulty: 2
  //   };
  //   this.editingCourseId = undefined;
  //   this.selectedCourseId = '';
  //   this.errorMessage = '';
  // }

  // clearStartDate() {
  //   this.newCourse.startDate = undefined;
  // }

  // clearEndDate() {
  //   this.newCourse.endDate = undefined;
  // }

  // getDifficultyLabel(difficulty: number | undefined): string {
  //   switch (difficulty) {
  //     case 1: return 'Easy';
  //     case 2: return 'Moderate';
  //     case 3: return 'Challenging';
  //     case 4: return 'Hard';
  //     case 5: return 'Very Difficult';
  //     default: return 'Moderate';
  //   }
  // }









  // courses$!: Observable<Course[]>;
  // teachers$!: Observable<Teacher[]>;
  // newCourse: Partial<Course> = {
  //   name: '',
  //   title: '',
  //   teacherId: '',
  //   teacherName: '',
  //   enabled: true,
  //   startDate: undefined, // Inicialmente undefined
  //   endDate: undefined, // Inicialmente undefined
  //   description: '',
  //   difficulty: 2 // Valor por defecto
  // };
  // errorMessage: string = '';
  // editingCourseId: string | undefined = undefined;
  // selectedCourseId: string = '';

  // constructor(
  //   private courseCrudService: CourseCrudService,
  //   private firestore: Firestore
  // ) {}

  // ngOnInit() {
  //   this.courses$ = this.courseCrudService.getCourses();
  //   this.teachers$ = collectionData(collection(this.firestore, 'teachers'), { idField: 'id' }).pipe(
  //     map(teachers => teachers as Teacher[]),
  //     catchError(error => {
  //       console.error('Error al cargar profesores:', error);
  //       return of([]);
  //     })
  //   );
  // }

  // loadCourse(event: Event) {
  //   const selectElement = event.target as HTMLSelectElement;
  //   const courseId = selectElement.value;
  //   this.selectedCourseId = courseId;

  //   if (courseId) {
  //     this.courseCrudService.getCourseById(courseId).subscribe({
  //       next: (course) => {
  //         if (course) {
  //           this.newCourse = {
  //             name: course.name || '',
  //             title: course.title,
  //             teacherId: course.teacherId || '',
  //             teacherName: course.teacherName || '',
  //             enabled: course.enabled ?? true,
  //             startDate: course.startDate || undefined, // Mantener undefined si no hay valor
  //             endDate: course.endDate || undefined, // Mantener undefined si no hay valor
  //             description: course.description || '',
  //             difficulty: course.difficulty ?? 2 // Por defecto 2 si no está definido
  //           };
  //           this.editingCourseId = courseId;
  //           this.errorMessage = '';
  //         } else {
  //           this.errorMessage = 'Curso no encontrado';
  //           this.resetForm();
  //         }
  //       },
  //       error: (error) => {
  //         console.error('Error al cargar el curso:', error);
  //         this.errorMessage = 'Error al cargar el curso';
  //         this.resetForm();
  //       }
  //     });
  //   } else {
  //     this.resetForm();
  //   }
  // }

  // saveCourse() {
  //   if (!this.newCourse.title?.trim()) {
  //     this.errorMessage = 'El título es requerido';
  //     return;
  //   }

  //   // Verificar título duplicado
  //   this.courseCrudService.checkCourseTitleExists(this.newCourse.title, this.editingCourseId).subscribe({
  //     next: (exists) => {
  //       if (exists) {
  //         this.errorMessage = 'Ya existe un curso con este título';
  //         return;
  //       }

  //       const courseData: Partial<Course> = {
  //         name: this.newCourse.name?.trim() || undefined,
  //         title: this.newCourse.title!.trim(),
  //         teacherId: this.newCourse.teacherId || undefined,
  //         teacherName: this.newCourse.teacherName || undefined,
  //         enabled: this.newCourse.enabled ?? true,
  //         startDate: this.newCourse.startDate?.trim() || undefined, // Convertir '' a undefined
  //         endDate: this.newCourse.endDate?.trim() || undefined, // Convertir '' a undefined
  //         description: this.newCourse.description?.trim() || undefined,
  //         difficulty: this.newCourse.difficulty ?? 2 // Incluir difficulty
  //       };

  //       if (this.editingCourseId) {
  //         this.courseCrudService.updateCourse(this.editingCourseId, courseData).subscribe({
  //           next: (success) => {
  //             if (success) {
  //               this.resetForm();
  //             } else {
  //               this.errorMessage = 'Error al actualizar el curso';
  //             }
  //           },
  //           error: (error) => {
  //             console.error('Error al actualizar el curso:', error);
  //             this.errorMessage = 'Error al actualizar el curso';
  //           }
  //         });
  //       } else {
  //         this.courseCrudService.createCourse(courseData).subscribe({
  //           next: (id) => {
  //             if (id) {
  //               this.resetForm();
  //             } else {
  //               this.errorMessage = 'Error al crear el curso';
  //             }
  //           },
  //           error: (error) => {
  //             console.error('Error al crear el curso:', error);
  //             this.errorMessage = 'Error al crear el curso';
  //           }
  //         });
  //       }
  //     },
  //     error: (error) => {
  //       console.error('Error al verificar el título:', error);
  //       this.errorMessage = 'Error al verificar el título del curso';
  //     }
  //   });
  // }

  // deleteCourse() {
  //   if (this.editingCourseId) {
  //     const confirmDelete = confirm('Are you sure you want to delete this course?');
  //     if (confirmDelete) {
  //       this.courseCrudService.deleteCourse(this.editingCourseId).subscribe({
  //         next: (success) => {
  //           if (success) {
  //             this.resetForm();
  //           } else {
  //             this.errorMessage = 'Error al eliminar el curso';
  //           }
  //         },
  //         error: (error) => {
  //           console.error('Error al eliminar el curso:', error);
  //           this.errorMessage = 'Error al eliminar el curso';
  //         }
  //       });
  //     }
  //   }
  // }

  // updateTeacherName(event: Event) {
  //   const selectElement = event.target as HTMLSelectElement;
  //   const teacherId = selectElement.value;
  //   this.newCourse.teacherId = teacherId;

  //   if (teacherId) {
  //     this.teachers$.subscribe(teachers => {
  //       const teacher = teachers.find(t => t.id === teacherId);
  //       this.newCourse.teacherName = teacher ? teacher.name : '';
  //     });
  //   } else {
  //     this.newCourse.teacherName = '';
  //   }
  // }

  // resetForm() {
  //   this.newCourse = {
  //     name: '',
  //     title: '',
  //     teacherId: '',
  //     teacherName: '',
  //     enabled: false,
  //     startDate: undefined, // No inicializar con ''
  //     endDate: undefined, // No inicializar con ''
  //     description: '',
  //     difficulty: 2 // Por defecto 2
  //   };
  //   this.editingCourseId = undefined;
  //   this.selectedCourseId = '';
  //   this.errorMessage = '';
  // }

  // // Borrar el campo startDate
  // clearStartDate() {
  //   this.newCourse.startDate = undefined;
  // }

  // // Borrar el campo endDate
  // clearEndDate() {
  //   this.newCourse.endDate = undefined;
  // }


  // // Mapear el valor de difficulty a una etiqueta legible
  // getDifficultyLabel(difficulty: number | undefined): string {
  //   switch (difficulty) {
  //     case 1: return 'Easy';
  //     case 2: return 'Moderate';
  //     case 3: return 'Challenging';
  //     case 4: return 'Hard';
  //     case 5: return 'Very Difficult';
  //     default: return 'Moderate'; // Por defecto
  //   }
  // }
}
