import { Injectable, inject, signal } from '@angular/core';
import { Firestore, collection, collectionData, getDoc, deleteDoc, doc, setDoc, updateDoc, orderBy, query  } from '@angular/fire/firestore';
import { Observable, of } from 'rxjs';
import { map, catchError } from 'rxjs/operators';
import { Recruiter } from '@models/recruiter';

@Injectable({
  providedIn: 'root'
})
export class RecruiterService {

  private firestore = inject(Firestore);
  private recruitersCollection = collection(this.firestore, 'recruiters');

  recruiterSig = signal<Recruiter | null>(null);

  /**
   * Obtiene todos los usuarios de la colección 'recruiters'
   * @returns Observable con un arreglo de usuarios
   */
  getAllUsers(): Observable<Recruiter[]> {
    const usersRef = collection(this.firestore, 'recruiters');
    const usersQuery = query(usersRef, orderBy('username'));
    return collectionData(usersQuery, { idField: 'userUID' }).pipe(
      map(recruiters => recruiters as Recruiter[]),
      catchError(error => {
        console.error('Error al obtener usuarios:', error);
        return of([]);
      })
    ) as Observable<Recruiter[]>;
  }

  /**
   * Agrega un usuario con un ID específico
   * @param user Datos del usuario
   * @param userId ID del usuario (generalmente el UID de Firebase Auth)
   */
  addUserWithId(user: Recruiter, userId: string): Promise<void> {
    console.log(user);
    return setDoc(doc(this.recruitersCollection, userId), user).catch(error => {
      console.error('Error al agregar usuario:', error);
      throw error;
    });
  }

  /**
   * Establece el usuario actual en la señal
   * @param user Usuario o null
   */
  setRecruiterSig(user: Recruiter | null) {
    this.recruiterSig.set(user);
    // console.log(this.recruiterSig());
  }

  updateRecruiterSig(user: Recruiter | null) {
  // Si user no es null, actualiza el signal
  if (user) {
    this.recruiterSig.update(currentRecruiter => ({
      // Copia todas las propiedades del objeto actual
      ...currentRecruiter,
      // Sobrescribe o añade las propiedades del nuevo objeto 'user'
      ...user
    }));
  } else {
    // Si user es null, puedes decidir si quieres limpiar el signal
    // En este caso, lo establecemos en null
    this.recruiterSig.set(null);
  }
  console.log(this.recruiterSig());
}

  /**
   * Regresa el  el usuario actual en la señal
   */
  async currentRecruiter() {
    // return this.recruiterSig()
    return Promise.resolve(this.recruiterSig()); // Convierte la señal en promesa
  }

  /**
   * Establece la señal del usuario como null
   */
  setUserSigNull() {
    this.recruiterSig.set(null);
  }

  /**
   * Obtiene un usuario por su ID
   * @param userId ID del usuario
   * @returns Promesa con el usuario o null si no existe
   */
  async getOneRecruiter(userId: string): Promise<Recruiter | null> {
    const usersRef = doc(this.recruitersCollection, userId);
    try {
      const user = (await getDoc(usersRef)).data();
      return user as Recruiter | null;
    } catch (error) {
      console.error('Error al obtener usuario:', error);
      return null;
    }
  }

  async getThisRecruiter(userId: string) {
    // const clientDocRef = doc(this.firestore, `users/${clientId}`);
    const userDocRef = doc(this.firestore, 'recruiters', userId);
    console.log(userDocRef);
    const recruiter = (await getDoc(userDocRef)).data();
    console.log(recruiter);
    return recruiter as Recruiter;
  }



  /**
   * Elimina un usuario por su ID
   * @param user Recruiter a eliminar
   */
  deleteRecruiter(user: Recruiter) {
    const userDocRef = doc(this.recruitersCollection, user.recruiterUID);
    return deleteDoc(userDocRef);
  }

  /**
   * Actualiza un usuario por su ID
   * @param user Datos parciales del usuario
   * @param userId ID del usuario
   */
  async updateOneRecruiter(user: Partial<Recruiter>, userId: string) {
    const userDocRef = doc(this.recruitersCollection, userId);
    return updateDoc(userDocRef, user)
      .then(() => {
        console.log('Recruiter updated');
      })
      .catch(error => {
        console.error('Error al actualizar usuario:', error);
        throw error;
      });
  }

  /**
   * Regresa subscriptionLevel del Recruiter
   */
  async currentRecruitersubcriptionLevel(): Promise<number | undefined> {
    const subscriptionLevel = this.recruiterSig()?.subscriptionLevel;
    return subscriptionLevel; // TypeScript/JS lo envolverá automáticamente en una Promise
}

    // async updateOneUser(user: Partial<Candidate>, userId: string) {
    // const userDocRef = doc(this.candidatesCollection, userId);
    // return updateDoc(userDocRef, user)
    //   .then(() => {
    //     console.log('Candidate updated');
    //     // Merge partial updates with current signal value
    //     const currentCandidate = this.candidateSig();
    //     if (currentCandidate) {
    //       const updatedCandidate = { ...currentCandidate, ...user };
    //       this.setUserSig(updatedCandidate);
    //     } else {
    //       console.warn('No current candidate in signal');
    //       this.setUserSig(null);
    //     }
    //   })
    //   .catch((error) => {
    //     console.error('Error al actualizar usuario:', error);
    //     throw error;
    //   });
    // }

}
