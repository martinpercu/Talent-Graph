import { Injectable, inject, signal } from '@angular/core';

import {
  Auth,
  createUserWithEmailAndPassword,
  signInWithEmailAndPassword,
  signOut,
  updateProfile,
  user,
} from '@angular/fire/auth';
import { Observable, from } from 'rxjs';

import { User } from '@models/user';
import { UserService } from '@services/user.service';
import { CandidateService } from '@services/candidate.service';
import { RecruiterService } from '@services/recruiter.service';
import { Candidate } from '@models/candidate';

@Injectable({
  providedIn: 'root',
})
export class AuthService {
  firebaseAuth = inject(Auth);
  userService = inject(UserService);
  candidateService = inject(CandidateService);
  recruiterService = inject(RecruiterService);

  // user$ = user(this.firebaseAuth);
  public user$ = user(this.firebaseAuth);
  currentUserSig = signal<User | null | undefined>(undefined);

  user!: User;
  candidateCurrent = signal<Candidate | null | undefined>(undefined);

  constructor() {
    this.user$.subscribe(async (firebaseUser) => {
      if (firebaseUser) {
        const user = await this.userService.getOneUser(firebaseUser.uid);
        this.userService.setUserSig(user);
        this.currentUserSig.set(user); // Opcional
        console.log('in get one User');
        // console.log(user);
        if (!user) {
          console.log('no hay User ==> HABRÁ Recruiter???');
          const user = await this.recruiterService.getOneRecruiter(
            firebaseUser.uid
          );
          this.recruiterService.setRecruiterSig(user);
          // this.currentUserSig.set(user); // Opcional
          console.log('in get one Recruiter');
          // console.log(user);
          if (!user) {
            console.log('no hay user ==> HABRÁ candidate ???');
            const user = await this.candidateService.getOneCandidate(
              firebaseUser.uid
            );
            this.candidateService.setUserSig(user);
            // this.currentUserSig.set(user); // Opcional
            console.log('in get one Candidate');
            // console.log(user);
          }
        }
      } else {
        console.log('There is none authenticated');
        this.userService.setUserSig(null);
        // this.currentUserSig.set(null); // Opcional
      }
    });
  }

  ifAuthenticatedSomeone() {
    if(this.currentUserSig()){
      return true
    }
    else {
      return false
    }
  }

  // constructor() {
  //   this.user$.subscribe(async (firebaseUser) => {
  //     if (firebaseUser) {
  //       const user = await this.userService.getOneUser(firebaseUser.uid);
  //       this.userService.setUserSig(user);
  //       // this.currentUserSig.set(user); // Opcional
  //       console.log('in get one User');
  //       console.log(user);
  //       if (!user) {
  //         console.log('no hay user ==> HABRÁ candidate ???');
  //         const user = await this.candidateService.getOneCandidate(
  //           firebaseUser.uid
  //         );
  //         this.candidateService.setUserSig(user);
  //         // this.currentUserSig.set(user); // Opcional
  //         console.log('in get one Candidate');
  //         console.log(user);
  //         if (!user) {
  //           console.log('no hay Candidate');
  //           const user = await this.recruiterService.getOneRecruiter(
  //             firebaseUser.uid
  //           );
  //           this.recruiterService.setRecruiterSig(user);
  //           // this.currentUserSig.set(user); // Opcional
  //           console.log('in get one Recruiter');
  //           console.log(user);
  //         }
  //       }
  //     } else {
  //       console.log('There is none authenticated');
  //       this.userService.setUserSig(null);
  //       // this.currentUserSig.set(null); // Opcional
  //     }
  //   });
  // }

  register(
    email: string,
    username: string,
    password: string
  ): Observable<void> {
    const promise = createUserWithEmailAndPassword(
      this.firebaseAuth,
      email,
      password
    ).then((response) => {
      updateProfile(response.user, { displayName: username });
      this.addRegisterUsed(email, username, response.user.uid);
    });
    return from(promise);
  }

  addRegisterUsed(email: string, username: string, userUid: any) {
    this.user = {
      email: email,
      username: username,
      userUID: userUid,
    };
    this.userService.addUserWithId(this.user, userUid);
    this.userService.setUserSig(this.user);
  }

  // login(email: string, password: string) {
  //   const promise = signInWithEmailAndPassword(
  //     this.firebaseAuth,
  //     email,
  //     password
  //   ).then(() => {

  //   });

  //   return from(promise)
  // }

  login(email: string, password: string): Observable<void> {
    const promise = signInWithEmailAndPassword(
      this.firebaseAuth,
      email,
      password
    )
      .then(async (response) => {
        const user = await this.userService.getOneUser(response.user.uid);
        this.userService.setUserSig(user); // Actualiza el signal en UserService
        // this.currentUserSig.set(user); // Opcional, si querés mantenerlo aquí también
      })
      .catch((error) => {
        console.error('Error en login:', error);
        throw error; // Propaga el error al observable
      });
    return from(promise);
  }

  logout(): Observable<void> {
    this.userService.setUserSigNull();
    const promise = signOut(this.firebaseAuth);
    return from(promise);
  }

  getCurrentUserId(): string | null {
    return this.firebaseAuth.currentUser?.uid || null;
  }
}
