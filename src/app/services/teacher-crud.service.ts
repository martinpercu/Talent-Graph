import { Injectable } from '@angular/core';
import { Firestore, collection, collectionData, doc, getDoc, addDoc, updateDoc, deleteDoc, query, where, getDocs } from '@angular/fire/firestore';
import { Observable, from, of } from 'rxjs';
import { map, catchError } from 'rxjs/operators';
import { Teacher } from '@models/teacher';
import { Section } from '@models/section';

@Injectable({
  providedIn: 'root'
})
export class TeacherCrudService {
  private teachersCollection;

  constructor(private firestore: Firestore) {
    this.teachersCollection = collection(this.firestore, 'teachers');
  }

  /**
   * Obtiene todos los profesores
   */
  getTeachers(): Observable<Teacher[]> {
    return collectionData(this.teachersCollection, { idField: 'id' }).pipe(
      map(teachers => teachers as Teacher[]),
      catchError(error => {
        console.error('Error al obtener profesores:', error);
        return of([]);
      })
    );
  }

  /**
   * Obtiene un profesor por ID
   */
  getTeacherById(teacherId: string): Observable<Teacher | null> {
    const teacherDoc = doc(this.firestore, `teachers/${teacherId}`);
    return from(getDoc(teacherDoc)).pipe(
      map(docSnap => (docSnap.exists() ? { id: docSnap.id, ...docSnap.data() } as Teacher : null)),
      catchError(error => {
        console.error('Error al obtener el profesor:', error);
        return of(null);
      })
    );
  }

  /**
   * Crea un nuevo profesor
   */
  createTeacher(teacher: Partial<Teacher>, sections: Section[]): Observable<string | null> {
    if (!teacher.name?.trim() || !teacher.defaultTitle?.trim() || !teacher.doc_path?.trim()) {
      console.error('El nombre, título por defecto y doc_path son requeridos');
      return of(null);
    }

    // Validar secciones
    const validationResult = this.validateSections(sections);
    if (!validationResult.valid) {
      console.error(validationResult.error);
      return of(null);
    }

    // Verificar nombre duplicado
    return from(this.checkTeacherNameExists(teacher.name.trim())).pipe(
      catchError(error => {
        console.error('Error al verificar el nombre:', error);
        return of(true); // Asumir que existe para evitar creación
      }),
      map(exists => {
        if (exists) {
          console.error('Ya existe un profesor con este nombre');
          return null;
        }

        const teacherData: Partial<Teacher> = {
          name: teacher.name!.trim(),
          defaultTitle: teacher.defaultTitle!.trim(),
          doc_path: teacher.doc_path!.trim(),
          pageMap: validationResult.pageMap,
          indexSubtext: validationResult.indexSubtext
        };

        return from(addDoc(this.teachersCollection, teacherData)).pipe(
          map(docRef => {
            updateDoc(doc(this.firestore, `teachers/${docRef.id}`), { id: docRef.id });
            return docRef.id;
          }),
          catchError(error => {
            console.error('Error al crear el profesor:', error);
            return of(null);
          })
        );
      }),
      catchError(error => {
        console.error('Error en el proceso de creación:', error);
        return of(null);
      })
    ).pipe(
      map(result => result as string | null)
    );
  }

  /**
   * Actualiza un profesor existente
   */
  updateTeacher(teacherId: string, teacher: Partial<Teacher>, sections: Section[]): Observable<boolean> {
    if (!teacher.name?.trim() || !teacher.defaultTitle?.trim() || !teacher.doc_path?.trim()) {
      console.error('El nombre, título por defecto y doc_path son requeridos');
      return of(false);
    }

    // Validar secciones
    const validationResult = this.validateSections(sections);
    if (!validationResult.valid) {
      console.error(validationResult.error);
      return of(false);
    }

    // Verificar nombre duplicado
    return from(this.checkTeacherNameExists(teacher.name.trim(), teacherId)).pipe(
      catchError(error => {
        console.error('Error al verificar el nombre:', error);
        return of(true); // Asumir que existe para evitar actualización
      }),
      map(exists => {
        if (exists) {
          console.error('Ya existe un profesor con este nombre');
          return false;
        }

        const teacherDoc = doc(this.firestore, `teachers/${teacherId}`);
        const teacherData: Partial<Teacher> = {
          name: teacher.name!.trim(),
          defaultTitle: teacher.defaultTitle!.trim(),
          doc_path: teacher.doc_path!.trim(),
          pageMap: validationResult.pageMap,
          indexSubtext: validationResult.indexSubtext
        };

        return from(updateDoc(teacherDoc, teacherData)).pipe(
          map(() => true),
          catchError(error => {
            console.error('Error al actualizar el profesor:', error);
            return of(false);
          })
        );
      }),
      catchError(error => {
        console.error('Error en el proceso de actualización:', error);
        return of(false);
      })
    ).pipe(
      map(result => result as boolean)
    );
  }

  /**
   * Elimina un profesor
   */
  deleteTeacher(teacherId: string): Observable<boolean> {
    const teacherDoc = doc(this.firestore, `teachers/${teacherId}`);
    return from(deleteDoc(teacherDoc)).pipe(
      map(() => true),
      catchError(error => {
        console.error('Error al eliminar el profesor:', error);
        return of(false);
      })
    );
  }

  /**
   * Verifica si un profesor con el mismo nombre ya existe
   */
  checkTeacherNameExists(name: string, excludeTeacherId?: string): Observable<boolean> {
    const q = query(this.teachersCollection, where('name', '==', name.trim()));
    return from(getDocs(q)).pipe(
      map(querySnapshot =>
        !querySnapshot.empty &&
        !querySnapshot.docs.some(doc => doc.id === excludeTeacherId)
      ),
      catchError(error => {
        console.error('Error al verificar el nombre del profesor:', error);
        return of(false);
      })
    );
  }

  /**
   * Valida y convierte secciones en pageMap e indexSubtext
   */
  private validateSections(sections: Section[]): {
    valid: boolean;
    error?: string;
    pageMap?: { [key: string]: number[] };
    indexSubtext?: { [key: string]: string };
  } {
    const pageMap: { [key: string]: number[] } = {};
    const indexSubtext: { [key: string]: string } = {};

    for (const section of sections) {
      if (!section.name?.trim() || !section.subtext?.trim() || !section.pages?.trim()) {
        return { valid: false, error: 'Todas las secciones deben tener nombre, subtítulo y páginas' };
      }
      const pages = section.pages
        .split(',')
        .map(page => parseInt(page.trim()))
        .filter(page => !isNaN(page));
      if (pages.length === 0) {
        return { valid: false, error: `Páginas inválidas en la sección ${section.name}` };
      }
      pageMap[section.name.trim()] = pages;
      indexSubtext[section.name.trim()] = section.subtext.trim();
    }

    return { valid: true, pageMap, indexSubtext };
  }
}
