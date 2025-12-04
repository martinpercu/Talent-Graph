import { Component, OnInit } from '@angular/core';
import { Firestore, collection, collectionData } from '@angular/fire/firestore';
import { Auth, authState } from '@angular/fire/auth';
import { Observable, of } from 'rxjs';
import { switchMap, catchError, map } from 'rxjs/operators';
import { FormsModule } from '@angular/forms';
import { CommonModule, AsyncPipe } from '@angular/common';

import { SchoolCrudService } from '@services/school-crud.service';
import { School } from '@models/school';
import { Course } from '@models/course';

@Component({
  selector: 'app-schools-crud',
  imports: [FormsModule, CommonModule, AsyncPipe],
  templateUrl: './schools-crud.component.html',
  styleUrl: './schools-crud.component.css'
})
export class SchoolsCrudComponent implements OnInit {
  schools$!: Observable<School[]>;
  courses$!: Observable<Course[]>;
  newSchool: Partial<School> = {
    name: '',
    courseIds: []
  };
  errorMessage: string = '';
  editingSchoolId: string | undefined = undefined;
  selectedSchoolId: string = '';
  isAuthenticated: boolean = false;

  constructor(
    private schoolCrudService: SchoolCrudService,
    private firestore: Firestore,
    private auth: Auth
  ) {}

  ngOnInit() {
    // Verificar autenticación
    authState(this.auth).subscribe(user => {
      this.isAuthenticated = !!user;
      if (!this.isAuthenticated) {
        this.errorMessage = 'Debes iniciar sesión para acceder a las escuelas';
        this.schools$ = of([]);
        this.courses$ = of([]);
        return;
      }

      // Cargar escuelas
      this.schools$ = this.schoolCrudService.getSchools().pipe(
        catchError(error => {
          console.error('Error al cargar escuelas:', error);
          this.errorMessage = 'Error al cargar escuelas: permisos insuficientes';
          return of([]);
        })
      );

      // Cargar cursos
      this.courses$ = collectionData(collection(this.firestore, 'courses'), { idField: 'id' }).pipe(
        map(courses => courses as Course[]),
        catchError(error => {
          console.error('Error al cargar cursos:', error);
          this.errorMessage = 'Error al cargar cursos: permisos insuficientes';
          return of([]);
        })
      );
    });
  }

  loadSchool(event: Event) {
    const selectElement = event.target as HTMLSelectElement;
    const schoolId = selectElement.value;
    this.selectedSchoolId = schoolId;

    if (schoolId) {
      this.schoolCrudService.getSchoolById(schoolId).subscribe({
        next: (school) => {
          if (school) {
            this.newSchool = {
              name: school.name,
              courseIds: school.courseIds
            };
            this.editingSchoolId = schoolId;
            this.errorMessage = '';
          } else {
            this.errorMessage = 'Escuela no encontrada';
            this.resetForm();
          }
        },
        error: (error) => {
          console.error('Error al cargar la escuela:', error);
          this.errorMessage = 'Error al cargar la escuela: permisos insuficientes';
          this.resetForm();
        }
      });
    } else {
      this.resetForm();
    }
  }

  saveSchool() {
    if (!this.isAuthenticated) {
      this.errorMessage = 'Debes iniciar sesión para realizar esta acción';
      return;
    }

    if (!this.newSchool.name?.trim()) {
      this.errorMessage = 'El nombre es requerido';
      return;
    }
    if (!Array.isArray(this.newSchool.courseIds)) {
      this.errorMessage = 'Los cursos seleccionados son inválidos';
      return;
    }

    // Verificar nombre duplicado
    this.schoolCrudService.checkSchoolNameExists(this.newSchool.name, this.editingSchoolId).subscribe({
      next: (exists) => {
        if (exists) {
          this.errorMessage = 'Ya existe una escuela con este nombre';
          return;
        }

        const schoolData: Partial<School> = {
          name: this.newSchool.name!.trim(),
          courseIds: this.newSchool.courseIds
        };

        if (this.editingSchoolId) {
          this.schoolCrudService.updateSchool(this.editingSchoolId, schoolData).subscribe({
            next: (success) => {
              if (success) {
                this.resetForm();
              } else {
                this.errorMessage = 'Error al actualizar la escuela';
              }
            },
            error: (error) => {
              console.error('Error al actualizar la escuela:', error);
              this.errorMessage = 'Error al actualizar la escuela: permisos insuficientes';
            }
          });
        } else {
          this.schoolCrudService.createSchool(schoolData).subscribe({
            next: (id) => {
              if (id) {
                this.resetForm();
              } else {
                this.errorMessage = 'Error al crear la escuela';
              }
            },
            error: (error) => {
              console.error('Error al crear la escuela:', error);
              this.errorMessage = 'Error al crear la escuela: permisos insuficientes';
            }
          });
        }
      },
      error: (error) => {
        console.error('Error al verificar el nombre:', error);
        this.errorMessage = 'Error al verificar el nombre de la escuela';
      }
    });
  }

  deleteSchool() {
    if (!this.isAuthenticated) {
      this.errorMessage = 'Debes iniciar sesión para realizar esta acción';
      return;
    }

    if (this.editingSchoolId) {
      const confirmDelete = confirm('¿Estás seguro de que quieres eliminar esta escuela?');
      if (confirmDelete) {
        this.schoolCrudService.deleteSchool(this.editingSchoolId).subscribe({
          next: (success) => {
            if (success) {
              this.resetForm();
            } else {
              this.errorMessage = 'Error al eliminar la escuela';
            }
          },
          error: (error) => {
            console.error('Error al eliminar la escuela:', error);
            this.errorMessage = 'Error al eliminar la escuela: permisos insuficientes';
          }
        });
      }
    }
  }

  resetForm() {
    this.newSchool = {
      name: '',
      courseIds: []
    };
    this.editingSchoolId = undefined;
    this.selectedSchoolId = '';
    this.errorMessage = '';
  }
}
