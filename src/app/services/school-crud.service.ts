import { Injectable } from '@angular/core';
import { Firestore, collection, collectionData, doc, getDoc, addDoc, updateDoc, deleteDoc, query, where, getDocs } from '@angular/fire/firestore';
import { Observable, from, of } from 'rxjs';
import { map, catchError } from 'rxjs/operators';
import { School } from '@models/school';

@Injectable({
  providedIn: 'root'
})
export class SchoolCrudService {
  private schoolsCollection;

  constructor(private firestore: Firestore) {
    this.schoolsCollection = collection(this.firestore, 'schools');
  }

  /**
   * Obtiene todas las escuelas como un Observable
   */
  getSchools(): Observable<School[]> {
    return collectionData(this.schoolsCollection, { idField: 'id' }).pipe(
      map(schools => schools as School[]),
      catchError(error => {
        console.error('Error al obtener escuelas:', error);
        return of([]);
      })
    );
  }

  /**
   * Obtiene una escuela específica por su ID
   */
  getSchoolById(schoolId: string): Observable<School | null> {
    const schoolDoc = doc(this.firestore, `schools/${schoolId}`);
    return from(getDoc(schoolDoc)).pipe(
      map(docSnap => (docSnap.exists() ? { id: docSnap.id, ...docSnap.data() } as School : null)),
      catchError(error => {
        console.error('Error al obtener la escuela:', error);
        return of(null);
      })
    );
  }

  /**
   * Crea una nueva escuela
   */
  createSchool(school: Partial<School>): Observable<string | null> {
    if (!school.name?.trim() || !Array.isArray(school.courseIds)) {
      console.error('Nombre y courseIds son requeridos');
      return of(null);
    }

    const schoolData: Partial<School> = {
      name: school.name.trim(),
      courseIds: school.courseIds || []
    };

    return from(addDoc(this.schoolsCollection, schoolData)).pipe(
      map(docRef => {
        // Actualizar el documento para incluir el ID
        updateDoc(doc(this.firestore, `schools/${docRef.id}`), { id: docRef.id });
        return docRef.id;
      }),
      catchError(error => {
        console.error('Error al crear la escuela:', error);
        return of(null);
      })
    );
  }

  /**
   * Actualiza una escuela existente
   */
  updateSchool(schoolId: string, school: Partial<School>): Observable<boolean> {
    if (!school.name?.trim() || !Array.isArray(school.courseIds)) {
      console.error('Nombre y courseIds son requeridos');
      return of(false);
    }

    const schoolDoc = doc(this.firestore, `schools/${schoolId}`);
    const schoolData: Partial<School> = {
      name: school.name.trim(),
      courseIds: school.courseIds
    };

    return from(updateDoc(schoolDoc, schoolData)).pipe(
      map(() => true),
      catchError(error => {
        console.error('Error al actualizar la escuela:', error);
        return of(false);
      })
    );
  }

  /**
   * Elimina una escuela
   */
  deleteSchool(schoolId: string): Observable<boolean> {
    const schoolDoc = doc(this.firestore, `schools/${schoolId}`);
    return from(deleteDoc(schoolDoc)).pipe(
      map(() => true),
      catchError(error => {
        console.error('Error al eliminar la escuela:', error);
        return of(false);
      })
    );
  }

  /**
   * Verifica si una escuela con el mismo nombre ya existe
   */
  checkSchoolNameExists(name: string, excludeSchoolId?: string): Observable<boolean> {
    const q = query(this.schoolsCollection, where('name', '==', name.trim()));
    return from(getDocs(q)).pipe(
      map(querySnapshot =>
        !querySnapshot.empty &&
        !querySnapshot.docs.some(doc => doc.id === excludeSchoolId)
      ),
      catchError(error => {
        console.error('Error al verificar el nombre de la escuela:', error);
        return of(false);
      })
    );
  }
}
