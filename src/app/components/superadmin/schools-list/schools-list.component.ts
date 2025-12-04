import { Component, OnInit } from '@angular/core';
import { Firestore, doc, getDoc } from '@angular/fire/firestore';
import { Observable, of, from } from 'rxjs';
import { map, switchMap, catchError } from 'rxjs/operators';
import { CommonModule, AsyncPipe } from '@angular/common';

import { Course } from '@models/course';
import { School } from '@models/school';


@Component({
  selector: 'app-schools-list',
  standalone: true,
  imports: [CommonModule, AsyncPipe],
  templateUrl: './schools-list.component.html'
})
export class SchoolsListComponent implements OnInit {
  school$!: Observable<School | null>;
  courses$!: Observable<Course[]>;

  constructor(private firestore: Firestore) {}

  ngOnInit() {
    // Asumimos que la escuela está autenticada; reemplazar con AuthService o ruta
    const schoolId = 'school456'; // TODO: Obtener dinámicamente (ej. AuthService)

    // Cargar una sola escuela
    const schoolDoc = doc(this.firestore, `schools/${schoolId}`);
    this.school$ = new Observable<School | null>(subscriber => {
      getDoc(schoolDoc).then(docSnap => {
        if (docSnap.exists()) {
          subscriber.next({ id: docSnap.id, ...docSnap.data() } as School);
        } else {
          subscriber.next(null);
        }
        subscriber.complete();
      }).catch(error => {
        console.error('Error al cargar la escuela:', error);
        subscriber.next(null);
        subscriber.complete();
      });
    });

    // Cargar cursos asignados a la escuela
    this.courses$ = this.school$.pipe(
      switchMap(school => {
        if (!school || !school.courseIds?.length) {
          return of([]);
        }
        const coursePromises: Promise<Course | null>[] = school.courseIds.map(courseId =>
          getDoc(doc(this.firestore, `courses/${courseId}`)).then(courseSnap =>
            courseSnap.exists() ? { id: courseId, ...courseSnap.data() } as Course : null
          )
        );
        return from(Promise.all(coursePromises)).pipe(
          map((courses: (Course | null)[]) => courses.filter((course: Course | null) => course !== null) as Course[])
        );
      }),
      catchError(error => {
        console.error('Error al cargar cursos:', error);
        return of([]);
      })
    );
  }
}
