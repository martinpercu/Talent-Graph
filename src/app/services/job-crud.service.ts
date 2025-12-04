import { Injectable } from '@angular/core';
import {
  Firestore,
  collection,
  collectionData,
  getDoc,
  doc,
  docData,
  addDoc,
  updateDoc,
  deleteDoc,
  query,
  where,
  getDocs,
  setDoc
} from '@angular/fire/firestore';
import { Observable, from, of, firstValueFrom } from 'rxjs';
import { map, switchMap } from 'rxjs/operators';
import { Job } from '@models/job';


@Injectable({
  providedIn: 'root',
})
export class JobCrudService {
  private jobsCollection;

  constructor(private firestore: Firestore) {
    this.jobsCollection = collection(this.firestore, 'jobs');
  }

  // /**
  //  * Obtiene todos los trabajos.
  //  * @returns Un Observable de un array de Jobs.
  //  */
  // getJobs(): Observable<Job[]> {
  //   return collectionData(this.jobsCollection, {
  //     idField: 'jobId',
  //   }) as Observable<Job[]>;
  // }

  /**
   * Obtiene todos los trabajos.
   * @returns Un Observable de un array de Jobs.
   */
  getJobs(ownerId: string): Observable<Job[]> {
    const q = query(this.jobsCollection, where('ownerId', '==', ownerId));
    return collectionData(q, { idField: 'jobId' }) as Observable<Job[]>;
  }

  /**
   * Obtiene un trabajo por su ID.
   * @param jobId El ID del trabajo.
   * @returns Un Observable del Job o undefined si no se encuentra.
   */
  getJobById(jobId: string): Observable<Job | undefined> {
    const jobDocRef = doc(this.firestore, `jobs/${jobId}`);
    return docData(jobDocRef, { idField: 'jobId' }) as Observable<
      Job | undefined
    >;
  }

  /**
   * Obtiene un trabajo por su ID.
   * @param jobId El ID del trabajo.
   * @returns Una Promise con el Job o undefined si no se encuentra.
   */
  async getJobByIdRaw(jobId: string): Promise<Job | undefined> {
    const jobDocRef = doc(this.firestore, `jobs/${jobId}`);
    const jobSnapshot = await getDoc(jobDocRef);
    return jobSnapshot.exists()
      ? ({ jobId, ...jobSnapshot.data() } as Job)
      : undefined;
  }

  // /**
  //  * Obtiene un trabajo por su ID.
  //  * @param magicId ID especial dentro del objeto trabajo.
  //  * @returns Una Promise con el Job o undefined si no se encuentra.
  //  */
  // async getJobByMagikIdRaw(magicId: string): Promise<Job | undefined> {
  //   const jobDocRef = doc(this.firestore, `jobs/${magicId}`);
  //   const jobSnapshot = await getDoc(jobDocRef);
  //   return jobSnapshot.exists()
  //     ? ({ magicId, ...jobSnapshot.data() } as Job)
  //     : undefined;
  // }

  /**
   * Obtiene un trabajo buscando por su magicId.
   * @param magicId El ID mágico del trabajo.
   * @returns Una Promise con el Job o undefined si no se encuentra.
   */
  async getJobByMagikIdRaw(magicId: string): Promise<Job | undefined> {
    // 1. Construir la consulta: buscar documentos donde el campo 'magicId' sea igual al valor pasado
    const q = query(this.jobsCollection, where('magicId', '==', magicId));

    // 2. Ejecutar la consulta
    const querySnapshot = await getDocs(q);

    // 3. Procesar el resultado
    if (querySnapshot.empty) {
      return undefined;
    }

    const docSnapshot = querySnapshot.docs[0];
    const jobId = docSnapshot.id;

    return {
      jobId,
      ...docSnapshot.data()
    } as Job;
  }






  async getJobOwnerId(jobId: string): Promise<string | undefined> {
    const job = await firstValueFrom(this.getJobById(jobId));
    return job?.ownerId;
  }

  // /**
  //  * Crea un nuevo trabajo.
  //  * @param job El objeto Job a crear (sin jobId, pero con ownerId).
  //  * @returns Un Observable del ID del nuevo trabajo o null en caso de error.
  //  */
  // createJob(job: Partial<Job>): Observable<string | null> {
  //   // Es crucial que el ownerId ya venga en el Partial<Job> desde el componente
  //   return from(addDoc(this.jobsCollection, job)).pipe(
  //     map((docRef) => docRef.id)
  //   );
  // }

  /**
   * Crea un nuevo trabajo.
   * @param job El objeto Job a crear (sin jobId, pero con ownerId).
   * @returns Un Observable del ID del nuevo trabajo o null en caso de error.
   */
  createJob(job: Partial<Job>): Observable<string | null> {
    // Es crucial que el ownerId ya venga en el Partial<Job> desde el componente
    return from(addDoc(this.jobsCollection, { ...job, jobId: '' })).pipe(
      switchMap((docRef) =>
        from(
          setDoc(docRef, { ...job, jobId: docRef.id }, { merge: true })
        ).pipe(map(() => docRef.id))
      )
    );
  }

  /**
   * Actualiza un trabajo existente.
   * @param jobId El ID del trabajo a actualizar.
   * @param jobData Los datos a actualizar del trabajo.
   * @returns Un Observable booleano indicando si la actualización fue exitosa.
   */
  updateJob(jobId: string, jobData: Partial<Job>): Observable<boolean> {
    const jobDocRef = doc(this.firestore, `jobs/${jobId}`);
    return from(updateDoc(jobDocRef, jobData)).pipe(map(() => true));
  }

  /**
   * Elimina un trabajo.
   * @param jobId El ID del trabajo a eliminar.
   * @returns Un Observable booleano indicando si la eliminación fue exitosa.
   */
  deleteJob(jobId: string): Observable<boolean> {
    const jobDocRef = doc(this.firestore, `jobs/${jobId}`);
    return from(deleteDoc(jobDocRef)).pipe(map(() => true));
  }

  /**
   * Verifica si ya existe un trabajo con un nombre dado.
   * @param name El nombre a verificar.
   * @param excludeId (Opcional) Un ID de trabajo a excluir de la verificación (útil para actualizaciones).
   * @returns Un Observable booleano indicando si el nombre ya existe.
   */
  checkJobNameExists(
    name: string | undefined,
    excludeId: string | undefined
  ): Observable<boolean> {
    if (!name) {
      return of(false); // Usamos 'of' directamente desde rxjs
    }

    const normalizedName = name.trim().toLowerCase();
    const q = query(this.jobsCollection, where('name', '==', normalizedName));

    return from(getDocs(q)).pipe(
      map((snapshot) => {
        return snapshot.docs.some((doc) => doc.id !== excludeId);
      })
    );
  }
}

//   /**
//    * Obtiene todos los trabajos.
//    * @returns Un Observable de un array de Jobs.
//    */
//   getJobs(): Observable<Job[]> {
//     return collectionData(this.jobsCollection, { idField: 'jobId' }) as Observable<Job[]>;
//   }

//   /**
//    * Obtiene un trabajo por su ID.
//    * @param jobId El ID del trabajo.
//    * @returns Un Observable del Job o undefined si no se encuentra.
//    */
//   getJobById(jobId: string): Observable<Job | undefined> {
//     const jobDocRef = doc(this.firestore, `jobs/${jobId}`);
//     return collectionData(this.jobsCollection, { idField: 'jobId' }).pipe(
//       map(jobs => (jobs as Job[]).find(job => job.jobId === jobId))
//     );
//   }

//   /**
//    * Crea un nuevo trabajo.
//    * @param job El objeto Job a crear (sin jobId).
//    * @returns Un Observable del ID del nuevo trabajo o null en caso de error.
//    */
//   createJob(job: Partial<Job>): Observable<string | null> {
//     return from(addDoc(this.jobsCollection, job)).pipe(
//       map(docRef => docRef.id),
//       map(id => id) // Retorna el ID generado por Firebase
//     );
//   }

//   /**
//    * Actualiza un trabajo existente.
//    * @param jobId El ID del trabajo a actualizar.
//    * @param jobData Los datos a actualizar del trabajo.
//    * @returns Un Observable booleano indicando si la actualización fue exitosa.
//    */
//   updateJob(jobId: string, jobData: Partial<Job>): Observable<boolean> {
//     const jobDocRef = doc(this.firestore, `jobs/${jobId}`);
//     return from(updateDoc(jobDocRef, jobData)).pipe(
//       map(() => true), // Si la promesa se resuelve, es exitoso
//       map(() => true)
//     );
//   }

//   /**
//    * Elimina un trabajo.
//    * @param jobId El ID del trabajo a eliminar.
//    * @returns Un Observable booleano indicando si la eliminación fue exitosa.
//    */
//   deleteJob(jobId: string): Observable<boolean> {
//     const jobDocRef = doc(this.firestore, `jobs/${jobId}`);
//     return from(deleteDoc(jobDocRef)).pipe(
//       map(() => true), // Si la promesa se resuelve, es exitoso
//       map(() => true)
//     );
//   }

//   /**
//    * Verifica si ya existe un trabajo con un nombre dado.
//    * @param name El nombre a verificar.
//    * @param excludeId (Opcional) Un ID de trabajo a excluir de la verificación (útil para actualizaciones).
//    * @returns Un Observable booleano indicando si el nombre ya existe.
//    */
//   checkJobNameExists(name: string | undefined, excludeId: string | undefined): Observable<boolean> {
//     if (!name) {
//       return from(Promise.resolve(false));
//     }

//     const normalizedName = name.trim().toLowerCase();
//     const q = query(this.jobsCollection, where('name', '==', normalizedName));

//     return from(getDocs(q)).pipe(
//       map(snapshot => {
//         return snapshot.docs.some(doc => doc.id !== excludeId);
//       })
//     );
//   }
// }
