// import { Injectable, inject, signal } from '@angular/core';
// import { Firestore, collection, getDoc, deleteDoc, doc, setDoc, updateDoc } from '@angular/fire/firestore';
// import { User } from '@models/user';


import { Injectable, inject, signal } from '@angular/core';
import { Firestore, collection, collectionData, getDoc, deleteDoc, doc, setDoc, updateDoc, orderBy, query  } from '@angular/fire/firestore';
import { Observable, of } from 'rxjs';
import { map, catchError } from 'rxjs/operators';
import { User } from '@models/user';

@Injectable({
  providedIn: 'root'
})
export class UserService {

  private firestore = inject(Firestore);
  private usersCollection = collection(this.firestore, 'users');

  userSig = signal<User | null>(null);

  /**
   * Obtiene todos los usuarios de la colección 'users'
   * @returns Observable con un arreglo de usuarios
   */
  // getAllUsers(): Observable<User[]> {
  //   return collectionData(this.usersCollection, { idField: 'userUID' }).pipe(
  //     map(users => users as User[]),
  //     catchError(error => {
  //       console.error('Error al obtener usuarios:', error);
  //       return of([]);
  //     })
  //   );
  // }

  // getAllUsers(): Observable<User[]> {
  //   const clientsRef = collection(this.firestore, 'users');
  //   const clientsQuery = query(clientsRef, orderBy('email')); // Order by email attribute
  //   return collectionData(clientsQuery, { idField: 'userUID' }) as Observable<User[]>;
  // };

  getAllUsers(): Observable<User[]> {
    const usersRef = collection(this.firestore, 'users');
    const usersQuery = query(usersRef, orderBy('username'));
    return collectionData(usersQuery, { idField: 'userUID' }).pipe(
      map(users => users as User[]),
      catchError(error => {
        console.error('Error al obtener usuarios:', error);
        return of([]);
      })
    ) as Observable<User[]>;
  }

  /**
   * Agrega un usuario con un ID específico
   * @param user Datos del usuario
   * @param userId ID del usuario (generalmente el UID de Firebase Auth)
   */
  addUserWithId(user: User, userId: string): Promise<void> {
    console.log(user);
    return setDoc(doc(this.usersCollection, userId), user).catch(error => {
      console.error('Error al agregar usuario:', error);
      throw error;
    });
  }

  /**
   * Establece el usuario actual en la señal
   * @param user Usuario o null
   */
  setUserSig(user: User | null) {
    this.userSig.set(user);
    // console.log(this.userSig());
  }

  /**
   * Establece la señal del usuario como null
   */
  setUserSigNull() {
    this.userSig.set(null);
  }

  /**
   * Obtiene un usuario por su ID
   * @param userId ID del usuario
   * @returns Promesa con el usuario o null si no existe
   */
  async getOneUser(userId: string): Promise<User | null> {
    const usersRef = doc(this.usersCollection, userId);
    try {
      const user = (await getDoc(usersRef)).data();
      return user as User | null;
    } catch (error) {
      console.error('Error al obtener usuario:', error);
      return null;
    }
  }

  /**
   * Elimina un usuario por su ID
   * @param user Usuario a eliminar
   */
  deleteUser(user: User) {
    const userDocRef = doc(this.usersCollection, user.userUID);
    return deleteDoc(userDocRef);
  }

  /**
   * Actualiza un usuario por su ID
   * @param user Datos parciales del usuario
   * @param userId ID del usuario
   */
  updateOneUser(user: Partial<User>, userId: string) {
    const userDocRef = doc(this.usersCollection, userId);
    return updateDoc(userDocRef, user)
      .then(() => {
        console.log('User updated');
      })
      .catch(error => {
        console.error('Error al actualizar usuario:', error);
        throw error;
      });
  }


}
