import { Injectable, inject } from '@angular/core';
import { Firestore, collection, collectionData, addDoc, query, where, doc, setDoc } from '@angular/fire/firestore';
import { Observable, of } from 'rxjs';
import { map, catchError } from 'rxjs/operators';
import { Result } from '@models/result';

@Injectable({
  providedIn: 'root'
})
export class ResultService {
  private firestore = inject(Firestore);
  private resultsCollectionPath = 'examsresults'; // Define la ruta para reutilizar

  /**
 * Crea un nuevo documento de resultado en Firestore.
 * Usado para el guardado inicial del examen en progreso.
 * @param result Datos iniciales del resultado (sin ID).
 * @returns Promise con el ID del nuevo documento.
 */
  async createInitialResult(result: Omit<Result, 'id'>): Promise<string> {
    const resultsCollection = collection(this.firestore, this.resultsCollectionPath);
    return addDoc(resultsCollection, result).then(docRef => docRef.id);
  }


  /**
   * Actualiza un documento de resultado existente en Firestore.
   * @param resultId El ID del documento a actualizar.
   * @param updates Un objeto con los campos a actualizar.
   * @returns Promise que se resuelve cuando la actualización se completa.
   */
  updateExistingResult(resultId: string, updates: Partial<Result>): Promise<void> {
    const resultDocRef = doc(this.firestore, this.resultsCollectionPath, resultId);
    // setDoc con merge:true actualiza los campos o los crea si no existen, sin borrar los demás.
    // updateDoc solo actualiza campos existentes y falla si un campo no existe.
    // Para esta lógica, setDoc con merge es más robusto.
    return setDoc(resultDocRef, updates, { merge: true });
  }


  /**
   * Guarda el resultado final de un examen.
   * Si ya existe un ID de resultado (examen en progreso), lo actualiza.
   * Si no, crea un nuevo resultado (como fallback).
   * @param result El objeto Result completo (puede incluir el ID).
   * @returns Promise con el ID del resultado guardado/actualizado.
   */
  async saveFinalResult(result: Result): Promise<string> {
    const resultsCollection = collection(this.firestore, this.resultsCollectionPath);
    if (result.id) {
      const resultDocRef = doc(this.firestore, this.resultsCollectionPath, result.id);
      // eslint-disable-next-line @typescript-eslint/no-unused-vars
      const { id, ...dataToSave } = result; // Excluimos el 'id' del objeto a guardar
      await setDoc(resultDocRef, dataToSave); // setDoc sobrescribe, así que pasamos todos los datos finales
      return result.id;
    } else {
      // Fallback si no había un ID (no debería pasar en el flujo normal)
      // eslint-disable-next-line @typescript-eslint/no-unused-vars
      const { id, ...dataToSave } = result;
      const docRef = await addDoc(resultsCollection, dataToSave);
      return docRef.id;
    }
  }


  saveResult(result: Omit<Result, 'id'>): Promise<string> {
    const resultsCollection = collection(this.firestore, 'examsresults');
    return addDoc(resultsCollection, result).then(docRef => docRef.id);
  }

  getAllResults(): Observable<Result[]> {
    const resultsCollection = collection(this.firestore, 'examsresults');
    return collectionData(resultsCollection, { idField: 'id' }).pipe(
      map(results => results as Result[]),
      catchError(error => {
        console.error('Error al obtener resultados:', error);
        return of([]);
      })
    );
  }

  getResultsByUserId(userId: string): Observable<Result[]> {
    const resultsCollection = collection(this.firestore, 'examsresults');
    const resultsQuery = query(resultsCollection, where('userUID', '==', userId));
    return collectionData(resultsQuery, { idField: 'id' }).pipe(
      map(results => results as Result[]),
      catchError(error => {
        console.error('Error al obtener resultados del usuario:', error);
        return of([]);
      })
    );
  }


  /**
   * Obtiene resultados de exámenes filtrados por una lista de userUIDs.
   * @param userUIDs Un array de UIDs de usuarios (candidates) para filtrar los resultados.
   * @returns Un Observable de un array de objetos Result.
   */
  getResultsByUserUIDs(userUIDs: string[]): Observable<Result[]> {
    if (!userUIDs || userUIDs.length === 0) {
      console.warn('No userUIDs provided for filtering results.');
      return of([]); // Retorna un Observable vacío si no hay UIDs
    }

    const resultsCollection = collection(this.firestore, 'examsresults');
    // Crea una consulta para buscar documentos donde 'userUID' esté en el array 'userUIDs'
    // Firestore permite hasta 10 cláusulas 'in' en una sola consulta. Si esperas más de 10 candidates,
    // necesitarás dividir la consulta o reestructurar cómo obtienes los resultados.
    const q = query(resultsCollection, where('userUID', 'in', userUIDs));

    return collectionData(q, { idField: 'id' }).pipe(
      map((results) => results as Result[]),
      catchError((error) => {
        console.error('Error al obtener resultados por userUIDs:', error);
        return of([]);
      })
    );
  }


  getLastResultByUserAndExam(userId: string, examId: string): Observable<Result | null> {
    const resultsCollection = collection(this.firestore, 'examsresults');
    const resultsQuery = query(
      resultsCollection,
      where('userUID', '==', userId),
      where('examId', '==', examId)
    );
    return collectionData(resultsQuery, { idField: 'id' }).pipe(
      map((results: any[]) => {
        if (results.length === 0) return null;
        // Ordenar por 'time' descendente en el cliente
        const sortedResults = (results as Result[]).sort((a, b) => {
          const dateA = new Date(a.time).getTime();
          const dateB = new Date(b.time).getTime();
          return dateB - dateA; // Más reciente primero
        });
        return sortedResults[0];
      }),
      catchError(error => {
        console.error('Error al obtener el último resultado:', error);
        return of(null);
      })
    );
  }





  // saveResult(result: Omit<Result, 'id'>): Promise<string> {
  //   const resultsCollection = collection(this.firestore, 'examsresults');
  //   return addDoc(resultsCollection, result).then(docRef => docRef.id);
  // }

  // /**
  //  * Obtiene todos los resultados de la colección 'examsresults'
  //  * @returns Observable con un arreglo de resultados
  //  */
  // getAllResults(): Observable<Result[]> {
  //   const resultsCollection = collection(this.firestore, 'examsresults');
  //   return collectionData(resultsCollection, { idField: 'id' }).pipe(
  //     map(results => results as Result[]),
  //     catchError(error => {
  //       console.error('Error al obtener resultados:', error);
  //       return of([]);
  //     })
  //   );
  // }

  // /**
  //  * Obtiene los resultados de un usuario específico por su userUID
  //  * @param userId ID del usuario (userUID)
  //  * @returns Observable con un arreglo de resultados del usuario
  //  */
  // getResultsByUserId(userId: string): Observable<Result[]> {
  //   const resultsCollection = collection(this.firestore, 'examsresults');
  //   const resultsQuery = query(resultsCollection, where('userUID', '==', userId));
  //   return collectionData(resultsQuery, { idField: 'id' }).pipe(
  //     map(results => results as Result[]),
  //     catchError(error => {
  //       console.error('Error al obtener resultados del usuario:', error);
  //       return of([]);
  //     })
  //   );
  // }



}
