import { Injectable, inject } from '@angular/core';
import { Firestore, collection, collectionData, doc, addDoc, updateDoc, deleteDoc, getDoc, query, where, getDocs, deleteField } from '@angular/fire/firestore';
import { Observable, from, throwError } from 'rxjs';
import { map, catchError } from 'rxjs/operators';
import { Course } from '@models/course';


@Injectable({
  providedIn: 'root'
})
export class CourseCrudService {
  private firestore = inject(Firestore);

  getCourses(): Observable<Course[]> {
    const coursesCollection = collection(this.firestore, 'courses');
    return collectionData(coursesCollection, { idField: 'id' }).pipe(
      map(courses => courses as Course[]),
      catchError(error => {
        console.error('Error al obtener cursos:', error);
        return throwError(() => new Error('No se pudieron cargar los cursos'));
      })
    );
  }

  getCourseById(courseId: string): Observable<Course | null> {
    const courseDoc = doc(this.firestore, 'courses', courseId);
    return from(getDoc(courseDoc)).pipe(
      map(docSnap => (docSnap.exists() ? { id: docSnap.id, ...docSnap.data() } as Course : null)),
      catchError(error => {
        console.error('Error al obtener el curso:', error);
        return throwError(() => new Error(`No se pudo cargar el curso con ID ${courseId}`));
      })
    );
  }

  getCoursesByTeacherId(teacherId: string): Observable<Course[]> {
    const coursesCollection = collection(this.firestore, 'courses');
    const q = query(coursesCollection, where('teacherId', '==', teacherId.trim()));
    return from(getDocs(q)).pipe(
      map(querySnapshot => querySnapshot.docs.map(doc => ({ id: doc.id, ...doc.data() } as Course))),
      catchError(error => {
        console.error('Error al obtener cursos por teacherId:', error);
        return throwError(() => new Error('No se pudieron cargar los cursos para el profesor'));
      })
    );
  }

  createCourse(course: Partial<Course>): Observable<string> {
    const validationError = this.validateCourse(course);
    if (validationError) {
      return throwError(() => new Error(validationError));
    }

    const courseData: Partial<Course> = {
      name: course.name?.trim() || undefined,
      title: course.title!.trim(),
      teacherId: course.teacherId!.trim(),
      teacherName: course.teacherName?.trim() || undefined,
      enabled: course.enabled ?? true,
      startDate: course.startDate?.trim() || undefined,
      endDate: course.endDate?.trim() || undefined,
      description: course.description?.trim() || undefined,
      difficulty: course.difficulty ?? 2
    };

    // Crear un objeto limpio sin campos undefined
    const cleanCourseData: { [key: string]: any } = {
      title: courseData.title,
      teacherId: courseData.teacherId,
      enabled: courseData.enabled,
      difficulty: courseData.difficulty
    };

    if (courseData.name !== undefined) {
      cleanCourseData['name'] = courseData.name;
    }
    if (courseData.teacherName !== undefined) {
      cleanCourseData['teacherName'] = courseData.teacherName;
    }
    if (courseData.startDate !== undefined) {
      cleanCourseData['startDate'] = courseData.startDate;
    }
    if (courseData.endDate !== undefined) {
      cleanCourseData['endDate'] = courseData.endDate;
    }
    if (courseData.description !== undefined) {
      cleanCourseData['description'] = courseData.description;
    }

    const coursesCollection = collection(this.firestore, 'courses');
    return from(addDoc(coursesCollection, cleanCourseData)).pipe(
      map(docRef => docRef.id),
      catchError(error => {
        console.error('Error al crear el curso:', error);
        return throwError(() => new Error('No se pudo crear el curso'));
      })
    );
  }

  updateCourse(courseId: string, course: Partial<Course>): Observable<boolean> {
    const validationError = this.validateCourse(course);
    if (validationError) {
      return throwError(() => new Error(validationError));
    }

    const courseData: Partial<Course> = {
      name: course.name?.trim() || undefined,
      title: course.title!.trim(),
      teacherId: course.teacherId!.trim(),
      teacherName: course.teacherName?.trim() || undefined,
      enabled: course.enabled ?? true,
      startDate: course.startDate?.trim() || undefined,
      endDate: course.endDate?.trim() || undefined,
      description: course.description?.trim() || undefined,
      difficulty: course.difficulty ?? 2
    };

    const updateData: { [key: string]: any } = {
      title: courseData.title,
      teacherId: courseData.teacherId,
      enabled: courseData.enabled,
      difficulty: courseData.difficulty
    };

    if (courseData.name !== undefined) {
      updateData['name'] = courseData.name;
    } else {
      updateData['name'] = deleteField();
    }
    if (courseData.teacherName !== undefined) {
      updateData['teacherName'] = courseData.teacherName;
    } else {
      updateData['teacherName'] = deleteField();
    }
    if (courseData.startDate !== undefined) {
      updateData['startDate'] = courseData.startDate;
    } else {
      updateData['startDate'] = deleteField();
    }
    if (courseData.endDate !== undefined) {
      updateData['endDate'] = courseData.endDate;
    } else {
      updateData['endDate'] = deleteField();
    }
    if (courseData.description !== undefined) {
      updateData['description'] = courseData.description;
    } else {
      updateData['description'] = deleteField();
    }

    const courseDoc = doc(this.firestore, 'courses', courseId);
    return from(updateDoc(courseDoc, updateData)).pipe(
      map(() => true),
      catchError(error => {
        console.error('Error al actualizar el curso:', error);
        return throwError(() => new Error(`No se pudo actualizar el curso con ID ${courseId}`));
      })
    );
  }

  deleteCourse(courseId: string): Observable<boolean> {
    const courseDoc = doc(this.firestore, 'courses', courseId);
    return from(deleteDoc(courseDoc)).pipe(
      map(() => true),
      catchError(error => {
        console.error('Error al eliminar el curso:', error);
        return throwError(() => new Error(`No se pudo eliminar el curso con ID ${courseId}`));
      })
    );
  }

  checkCourseTitleExists(title: string, excludeCourseId?: string): Observable<boolean> {
    const coursesCollection = collection(this.firestore, 'courses');
    const q = query(coursesCollection, where('title', '==', title.trim()));
    return from(getDocs(q)).pipe(
      map(querySnapshot =>
        !querySnapshot.empty &&
        !querySnapshot.docs.some(doc => doc.id === excludeCourseId)
      ),
      catchError(error => {
        console.error('Error al verificar el título del curso:', error);
        return throwError(() => new Error('No se pudo verificar el título del curso'));
      })
    );
  }

  private validateCourse(course: Partial<Course>): string | null {
    if (!course.title?.trim()) {
      return 'El título es requerido';
    }
    if (!course.teacherId?.trim()) {
      return 'El ID del profesor es requerido';
    }
    if (!course.difficulty || course.difficulty < 1 || course.difficulty > 5) {
      return 'La dificultad debe estar entre 1 y 5';
    }
    return null;
  }







  // private firestore = inject(Firestore);

  // getCourses(): Observable<Course[]> {
  //   const coursesCollection = collection(this.firestore, 'courses');
  //   return collectionData(coursesCollection, { idField: 'id' }).pipe(
  //     map(courses => courses as Course[]),
  //     catchError(error => {
  //       console.error('Error al obtener cursos:', error);
  //       return throwError(() => new Error('No se pudieron cargar los cursos'));
  //     })
  //   );
  // }

  // getCourseById(courseId: string): Observable<Course | null> {
  //   const courseDoc = doc(this.firestore, 'courses', courseId);
  //   return from(getDoc(courseDoc)).pipe(
  //     map(docSnap => (docSnap.exists() ? { id: docSnap.id, ...docSnap.data() } as Course : null)),
  //     catchError(error => {
  //       console.error('Error al obtener el curso:', error);
  //       return throwError(() => new Error(`No se pudo cargar el curso con ID ${courseId}`));
  //     })
  //   );
  // }

  // createCourse(course: Partial<Course>): Observable<string> {
  //   const validationError = this.validateCourse(course);
  //   if (validationError) {
  //     return throwError(() => new Error(validationError));
  //   }

  //   const courseData: Partial<Course> = {
  //     name: course.name?.trim() || undefined,
  //     title: course.title!.trim(),
  //     teacherId: course.teacherId!.trim(),
  //     teacherName: course.teacherName?.trim() || undefined,
  //     enabled: course.enabled ?? true,
  //     startDate: course.startDate?.trim() || undefined,
  //     endDate: course.endDate?.trim() || undefined,
  //     description: course.description?.trim() || undefined,
  //     difficulty: course.difficulty ?? 2
  //   };

  //   const coursesCollection = collection(this.firestore, 'courses');
  //   return from(addDoc(coursesCollection, courseData)).pipe(
  //     map(docRef => docRef.id),
  //     catchError(error => {
  //       console.error('Error al crear el curso:', error);
  //       return throwError(() => new Error('No se pudo crear el curso'));
  //     })
  //   );
  // }

  // updateCourse(courseId: string, course: Partial<Course>): Observable<boolean> {
  //   const validationError = this.validateCourse(course);
  //   if (validationError) {
  //     return throwError(() => new Error(validationError));
  //   }

  //   const courseData: Partial<Course> = {
  //     name: course.name?.trim() || undefined,
  //     title: course.title!.trim(),
  //     teacherId: course.teacherId!.trim(),
  //     teacherName: course.teacherName?.trim() || undefined,
  //     enabled: course.enabled ?? true,
  //     startDate: course.startDate?.trim() || undefined,
  //     endDate: course.endDate?.trim() || undefined,
  //     description: course.description?.trim() || undefined,
  //     difficulty: course.difficulty ?? 2
  //   };

  //   const updateData: { [key: string]: any } = {
  //     title: courseData.title,
  //     teacherId: courseData.teacherId,
  //     enabled: courseData.enabled,
  //     difficulty: courseData.difficulty
  //   };

  //   if (courseData.name !== undefined) {
  //     updateData['name'] = courseData.name;
  //   } else {
  //     updateData['name'] = deleteField();
  //   }
  //   if (courseData.teacherName !== undefined) {
  //     updateData['teacherName'] = courseData.teacherName;
  //   } else {
  //     updateData['teacherName'] = deleteField();
  //   }
  //   if (courseData.startDate !== undefined) {
  //     updateData['startDate'] = courseData.startDate;
  //   } else {
  //     updateData['startDate'] = deleteField();
  //   }
  //   if (courseData.endDate !== undefined) {
  //     updateData['endDate'] = courseData.endDate;
  //   } else {
  //     updateData['endDate'] = deleteField();
  //   }
  //   if (courseData.description !== undefined) {
  //     updateData['description'] = courseData.description;
  //   } else {
  //     updateData['description'] = deleteField();
  //   }

  //   const courseDoc = doc(this.firestore, 'courses', courseId);
  //   return from(updateDoc(courseDoc, updateData)).pipe(
  //     map(() => true),
  //     catchError(error => {
  //       console.error('Error al actualizar el curso:', error);
  //       return throwError(() => new Error(`No se pudo actualizar el curso con ID ${courseId}`));
  //     })
  //   );
  // }

  // deleteCourse(courseId: string): Observable<boolean> {
  //   const courseDoc = doc(this.firestore, 'courses', courseId);
  //   return from(deleteDoc(courseDoc)).pipe(
  //     map(() => true),
  //     catchError(error => {
  //       console.error('Error al eliminar el curso:', error);
  //       return throwError(() => new Error(`No se pudo eliminar el curso con ID ${courseId}`));
  //     })
  //   );
  // }

  // checkCourseTitleExists(title: string, excludeCourseId?: string): Observable<boolean> {
  //   const coursesCollection = collection(this.firestore, 'courses');
  //   const q = query(coursesCollection, where('title', '==', title.trim()));
  //   return from(getDocs(q)).pipe(
  //     map(querySnapshot =>
  //       !querySnapshot.empty &&
  //       !querySnapshot.docs.some(doc => doc.id === excludeCourseId)
  //     ),
  //     catchError(error => {
  //       console.error('Error al verificar el título del curso:', error);
  //       return throwError(() => new Error('No se pudo verificar el título del curso'));
  //     })
  //   );
  // }

  // private validateCourse(course: Partial<Course>): string | null {
  //   if (!course.title?.trim()) {
  //     return 'El título es requerido';
  //   }
  //   if (!course.teacherId?.trim()) {
  //     return 'El ID del profesor es requerido';
  //   }
  //   if (!course.difficulty || course.difficulty < 1 || course.difficulty > 5) {
  //     return 'La dificultad debe estar entre 1 y 5';
  //   }
  //   return null;
  // }




  // private firestore = inject(Firestore);

  // /**
  //  * Obtiene todos los cursos como un Observable
  //  */
  // getCourses(): Observable<Course[]> {
  //   const coursesCollection = collection(this.firestore, 'courses');
  //   return collectionData(coursesCollection, { idField: 'id' }).pipe(
  //     map(courses => courses as Course[]),
  //     catchError(error => {
  //       console.error('Error al obtener cursos:', error);
  //       return of([]);
  //     })
  //   );
  // }

  // /**
  //  * Obtiene un curso específico por su ID
  //  */
  // getCourseById(courseId: string): Observable<Course | null> {
  //   const courseDoc = doc(this.firestore, 'courses', courseId);
  //   return from(getDoc(courseDoc)).pipe(
  //     map(docSnap => (docSnap.exists() ? { id: docSnap.id, ...docSnap.data() } as Course : null)),
  //     catchError(error => {
  //       console.error('Error al obtener el curso:', error);
  //       return of(null);
  //     })
  //   );
  // }


  // /**
  //  * Crea un nuevo curso
  //  */
  // createCourse(course: Partial<Course>): Observable<string | null> {
  //   if (!course.title?.trim()) {
  //     console.error('El título es requerido');
  //     return of(null);
  //   }

  //   const courseData: { [key: string]: any } = {
  //     title: course.title.trim(),
  //     enabled: course.enabled ?? false,
  //     difficulty: course.difficulty ?? 2
  //   };

  //   // Only include optional fields if they have valid values
  //   if (course.name?.trim()) courseData['name'] = course.name.trim();
  //   if (course.teacherId?.trim()) courseData['teacherId'] = course.teacherId.trim();
  //   if (course.teacherName?.trim()) courseData['teacherName'] = course.teacherName.trim();
  //   if (course.startDate?.trim()) courseData['startDate'] = course.startDate.trim();
  //   if (course.endDate?.trim()) courseData['endDate'] = course.endDate.trim();
  //   if (course.description?.trim()) courseData['description'] = course.description.trim();

  //   const coursesCollection = collection(this.firestore, 'courses');
  //   const newDocRef = doc(coursesCollection);
  //   courseData['id'] = newDocRef.id;

  //   return from(setDoc(newDocRef, courseData)).pipe(
  //     map(() => newDocRef.id),
  //     catchError(error => {
  //       console.error('Error al crear el curso:', error);
  //       return of(null);
  //     })
  //   );
  // }

  // /**
  //  * Actualiza un curso existente
  //  */
  // updateCourse(courseId: string, course: Partial<Course>): Observable<boolean> {
  //   if (!course.title?.trim()) {
  //     console.error('El título es requerido');
  //     return of(false);
  //   }

  //   const courseDoc = doc(this.firestore, 'courses', courseId);
  //   const courseData: { [key: string]: any } = {
  //     name: course.name?.trim() || deleteField(),
  //     title: course.title.trim(),
  //     teacherId: course.teacherId || deleteField(),
  //     teacherName: course.teacherName || deleteField(),
  //     enabled: course.enabled ?? false,
  //     startDate: course.startDate?.trim() || deleteField(),
  //     endDate: course.endDate?.trim() || deleteField(),
  //     description: course.description?.trim() || deleteField(),
  //     difficulty: course.difficulty ?? 2
  //   };

  //   return from(updateDoc(courseDoc, courseData)).pipe(
  //     map(() => true),
  //     catchError(error => {
  //       console.error('Error al actualizar el curso:', error);
  //       return of(false);
  //     })
  //   );
  // }

  // /**
  //  * Elimina un curso
  //  */
  // deleteCourse(courseId: string): Observable<boolean> {
  //   const courseDoc = doc(this.firestore, 'courses', courseId);
  //   return from(deleteDoc(courseDoc)).pipe(
  //     map(() => true),
  //     catchError(error => {
  //       console.error('Error al eliminar el curso:', error);
  //       return of(false);
  //     })
  //   );
  // }

  // /**
  //  * Verifica si un curso con el mismo título ya existe
  //  */
  // checkCourseTitleExists(title: string, excludeCourseId?: string): Observable<boolean> {
  //   const coursesCollection = collection(this.firestore, 'courses');
  //   const q = query(coursesCollection, where('title', '==', title.trim()));
  //   return from(getDocs(q)).pipe(
  //     map(querySnapshot =>
  //       !querySnapshot.empty &&
  //       !querySnapshot.docs.some(doc => doc.id === excludeCourseId)
  //     ),
  //     catchError(error => {
  //       console.error('Error al verificar el título del curso:', error);
  //       return of(false);
  //     })
  //   );
  // }


}
