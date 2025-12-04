import { Injectable, inject, signal } from '@angular/core';

import { Auth, GoogleAuthProvider, createUserWithEmailAndPassword, signInWithEmailAndPassword, signOut, updateProfile, user, signInWithPopup, signInWithRedirect, User } from '@angular/fire/auth';
import { Observable, from, BehaviorSubject, firstValueFrom } from 'rxjs';
import { map, filter, take } from 'rxjs/operators';


import { Recruiter } from '@models/recruiter';
import { RecruiterService } from '@services/recruiter.service';
import { Router } from '@angular/router';

import { CandidateService } from '@services/candidate.service'
import { TranslocoService } from '@jsverse/transloco';



@Injectable({
  providedIn: 'root'
})
export class RecruiterAuthService {

  private firebaseAuth = inject(Auth);
  recruiterService = inject(RecruiterService)
  recruiter$ = user(this.firebaseAuth);
  currentRecruiterSig = signal<Recruiter | null | undefined>(undefined);
  router = inject(Router);

  candidateService = inject(CandidateService);

  recruiter!: Recruiter;


  // private auth = inject(Auth);
  // private firestore = inject(Firestore);

  // Signal para el estado del usuario
  currentUser = signal<Recruiter | null>(null);
  loading = signal<boolean>(false);


  // NUEVO: BehaviorSubject para manejar el estado de autenticación
  private authStateSubject = new BehaviorSubject<{ user: Recruiter | null, initialized: boolean }>({
    user: null,
    initialized: false
  });

  // Observable público para el estado de auth
  authState$ = this.authStateSubject.asObservable();


  // Observable del usuario de Firebase
  user$: Observable<User | null> = user(this.firebaseAuth);


  constructor(private translocoService: TranslocoService) {
    this.recruiter$.subscribe(async (firebaseUser) => {
      if (firebaseUser) {
        const recruiter = await this.recruiterService.getOneRecruiter(firebaseUser.uid);
        this.recruiterService.setRecruiterSig(recruiter);
        this.currentUser.set(recruiter);
        // this.currentUserSig.set(recruiter); // Opcional
      } else {
        this.recruiterService.setRecruiterSig(null);
        // this.currentUserSig.set(null); // Opcional
      }
    });
  }

  // constructor(private translocoService: TranslocoService) {
  //   this.initializeAuthState();
  // }

  // private async initializeAuthState() {
  //   this.recruiter$.subscribe(async (firebaseUser) => {
  //     try {
  //       if (firebaseUser) {
  //         const recruiter = await this.recruiterService.getOneRecruiter(firebaseUser.uid);
  //         this.recruiterService.setRecruiterSig(recruiter);
  //         this.currentUser.set(recruiter);
  //         this.authStateSubject.next({ user: recruiter, initialized: true });
  //       } else {
  //         this.recruiterService.setRecruiterSig(null);
  //         this.currentUser.set(null);
  //         this.authStateSubject.next({ user: null, initialized: true });
  //       }
  //     } catch (error) {
  //       console.error('Error initializing auth state:', error);
  //       this.authStateSubject.next({ user: null, initialized: true });
  //     }
  //   });
  // }

  // // NUEVO: Método para esperar a que el estado de auth se inicialice
  // async waitForAuthInitialization(): Promise<Recruiter | null> {
  //   const authState = await firstValueFrom(
  //     this.authState$.pipe(
  //       filter(state => state.initialized),
  //       take(1)
  //     )
  //   );
  //   return authState.user;
  // }

  // // NUEVO: Método mejorado para verificar si está logueado
  // async isUserLoggedIn(): Promise<boolean> {
  //   const user = await this.waitForAuthInitialization();
  //   return user !== null;
  // }


  register(
    email: string,
    username: string,
    password: string,
  ): Observable<void> {
    const promise = createUserWithEmailAndPassword(
      this.firebaseAuth,
      email,
      password,
    ).then((response) => {
      updateProfile(response.user, { displayName: username })
      this.addRegisterUsed(email, username, response.user.uid)
    }
    );
    return from(promise);
  };

  addRegisterUsed(email: any, username: any, userUid:any) {
    this.recruiter = {
      email: email,
      username: username,
      recruiterUID: userUid,
      subscriptionLevel: 4
    }
    this.recruiterService.addUserWithId(this.recruiter, userUid);
    this.recruiterService.setRecruiterSig(this.recruiter);
    this.addRecruiterAsCandidate(this.recruiter)
  }

  addRecruiterAsCandidate(recruiter: Recruiter) {
    const recruiterCandidate = {
      candidateUID: recruiter.recruiterUID,
      email: recruiter.email,
      username: recruiter.username,
      recruiters: [""],
      jobs: [""],
      lastJobId: "",
      resumeInDB: false
    }
    console.log(recruiter);
    this.candidateService.addUserWithId(recruiterCandidate, recruiter.recruiterUID)
  }

  login(email: string, password: string): Observable<void> {
    const promise = signInWithEmailAndPassword(this.firebaseAuth, email, password)
      .then(async (response) => {
        const recruiter = await this.recruiterService.getOneRecruiter(response.user.uid);
        this.recruiterService.setRecruiterSig(recruiter); // Actualiza el signal en CandidateService
        this.currentRecruiterSig.set(recruiter); // Opcional, si querés mantenerlo aquí también
        this.authStateSubject.next({ user: recruiter, initialized: true });
        // alert('estamos logueados en auth recruiter service')
        // this.router.navigate(['']);
      })
      .catch((error) => {
        console.error('Error en login:', error);
        throw error; // Propaga el error al observable
      });
    return from(promise);
  }

  logout(): Observable<void> {
    this.recruiterService.setUserSigNull();
    const promise = signOut(this.firebaseAuth);
    this.router.navigate(['']);
    return from(promise)
  }


  // LOGIN CON GOOGLE (Popup)
  async loginWithGoogle(): Promise<void> {
    this.loading.set(true);

    try {
      const provider = new GoogleAuthProvider();
      provider.addScope('profile');
      provider.addScope('email');

      const result = await signInWithPopup(this.firebaseAuth, provider);

      if (result.user) {
        // console.log(result.user);
        const email = result.user.email;
        const username = result.user.displayName;
        const userUid = result.user.uid;

        const existingRecruiter = await this.recruiterService.getOneRecruiter(userUid);


        if (existingRecruiter) {
          // Ya existe - solo autenticar
          console.log('Recruiter ya existe, solo autenticando...');
          this.router.navigate(['recruiter'])

          // const welcomeback_message = this.translocoService.translate('candidate_resume.resume_sent_success');
          // alert('Bienvenido de vuelta!');
        } else {
          // No existe - registrar nuevo usuario
          console.log('Nuevo recruiter, registrando...');
          this.addRegisterUsed(email, username, userUid);
          const accountCreatedOk = this.translocoService.translate('auth.account_created_ok');
          alert(username + ' ' + accountCreatedOk);
          this.router.navigate(['recruiter'])
        }

      }
    } catch (error: any) {
      console.error('Error en login:', error);
      throw this.handleAuthError(error);
    } finally {
      this.loading.set(false);
    }
  }

  // // LOGIN CON GOOGLE (Redirect) - Mejor para móviles
  // async loginWithGoogleRedirect(): Promise<void> {
  //   this.loading.set(true);

  //   try {
  //     const provider = new GoogleAuthProvider();
  //     provider.addScope('profile');
  //     provider.addScope('email');

  //     await signInWithRedirect(this.firebaseAuth, provider);
  //   } catch (error: any) {
  //     console.error('Error en login redirect:', error);
  //     this.loading.set(false);
  //     throw this.handleAuthError(error);
  //   }
  // }



  // Manejo de errores de autenticación
  private handleAuthError(error: any): string {
    switch (error.code) {
      case 'auth/popup-closed-by-user':
        return 'La ventana de login fue cerrada antes de completar el proceso';
      case 'auth/popup-blocked':
        return 'El popup fue bloqueado. Por favor, permite popups para este sitio';
      case 'auth/cancelled-popup-request':
        return 'Solicitud de popup cancelada';
      case 'auth/network-request-failed':
        return 'Error de conexión. Verifica tu conexión a internet';
      case 'auth/too-many-requests':
        return 'Demasiados intentos. Intenta de nuevo más tarde';
      default:
        return 'Error de autenticación. Intenta de nuevo';
    }
  }


  // Getters útiles
  get isLoggedIn(): boolean {
    return this.currentUser() !== null;
  }

  get userDisplayName(): string {
    return this.currentUser()?.displayname || 'Usuario';
  }

  get userEmail(): string {
    return this.currentUser()?.email || '';
  }



}




// {
//   "uid": "wGCuyGO3XSYcCZ6QPRQ41P761Kv2",
//   "email": "percumartin@gmail.com",
//   "emailVerified": true,
//   "displayName": "Martin Percusion",
//   "isAnonymous": false,
//   "photoURL": "https://lh3.googleusercontent.com/a/ACg8ocJb_tnTfLUdVhPJq_i5k4DU5t34AYazzbfvIKZDOJvbkXI2HA=s96-c",
//   "providerData": [
//     {
//       "providerId": "google.com",
//       "uid": "106482362421530761757",
//       "displayName": "Martin Percusion",
//       "email": "percumartin@gmail.com",
//       "phoneNumber": null,
//       "photoURL": "https://lh3.googleusercontent.com/a/ACg8ocJb_tnTfLUdVhPJq_i5k4DU5t34AYazzbfvIKZDOJvbkXI2HA=s96-c"
//     }
//   ],
//   "stsTokenManager": {
//     "refreshToken": "AMf-vBx3YxUqjT5tlaGxoJh2b5K2aVS0eJ0rEy4EnEMCmVBJISyUQV-b8C4Gkmx4XfOy9SJk0PpCFY1QXU4ktxgeRbDBVxbhqaP2o7GMUAibOIwmiANCZYgWTL79xCjB1OeAHh8R7UiVa24oy_vxjm1KEJwaKEcqHjzYjyZcNBX2135aSDrGKz0fb8ofMLexWaKInvMaALOuE_oXED1EypnkCPq_qHMb_LLGtOkru_B-6tvgKrxzuxhSUPRFYEdjylTDRsP94oAb-eyXYEHFQrZ6eU1VN3dcZ5OlcLRxXEMAzq2SPB-w2BLhu0rRocIX3PqNbP2cEa7hFtWUKa3izCdS8taN2Jw1AhbzlbnJdSoUC5F_Kh4g8suY_D60MLiWxd6KszRGpg1D_scbWoC8wz5QV80YbcqIDNTxkxAFSoqcu2Aqw8_DzYk",
//     "accessToken": "eyJhbGciOiJSUzI1NiIsImtpZCI6IjA1NTc3MjZmYWIxMjMxZmEyZGNjNTcyMWExMDgzZGE2ODBjNGE3M2YiLCJ0eXAiOiJKV1QifQ.eyJuYW1lIjoiTWFydGluIFBlcmN1c2lvbiIsInBpY3R1cmUiOiJodHRwczovL2xoMy5nb29nbGV1c2VyY29udGVudC5jb20vYS9BQ2c4b2NKYl90blRmTFVkVmhQSnFfaTVrNERVNXQzNEFZYXp6YmZ2SUtaRE9KdmJrWEkySEE9czk2LWMiLCJpc3MiOiJodHRwczovL3NlY3VyZXRva2VuLmdvb2dsZS5jb20vY2VudHJhbC1hdHMiLCJhdWQiOiJjZW50cmFsLWF0cyIsImF1dGhfdGltZSI6MTc1ODY2MzIwMywidXNlcl9pZCI6IndHQ3V5R08zWFNZY0NaNlFQUlE0MVA3NjFLdjIiLCJzdWIiOiJ3R0N1eUdPM1hTWWNDWjZRUFJRNDFQNzYxS3YyIiwiaWF0IjoxNzU4NjYzMjAzLCJleHAiOjE3NTg2NjY4MDMsImVtYWlsIjoicGVyY3VtYXJ0aW5AZ21haWwuY29tIiwiZW1haWxfdmVyaWZpZWQiOnRydWUsImZpcmViYXNlIjp7ImlkZW50aXRpZXMiOnsiZ29vZ2xlLmNvbSI6WyIxMDY0ODIzNjI0MjE1MzA3NjE3NTciXSwiZW1haWwiOlsicGVyY3VtYXJ0aW5AZ21haWwuY29tIl19LCJzaWduX2luX3Byb3ZpZGVyIjoiZ29vZ2xlLmNvbSJ9fQ.dKghiatCuepYA0zKpA2nhNOjQhYFM3LvmaOOe_7aQF0RjhkqPmZmL2pj3recimW1xh42SJF3GXLI_bcXaz7RZ2I2GK9qhDjlGb04jKm6EEK1SwfbHHQWCeVwfsyOQSII9TehRox8GiuoJpEyOwa2tpfCTCAn9iwMYJmTrUrWatl14QZXnY01-kAIhVDRg2hfuHViFjapkIwqyuV5E0DcdfC3G1i_h4kt-QdybbaZ6eqd9BZF5bqwPT3tMjGK8gYld0h8VKpcYiTaKUiMxFnVaGkSbfwAEiLBYcB8ibOR_6n4epS7z_ylEFDwUN_k7-dfWMIFwGq7tHprdUAfgqwLAQ",
//     "expirationTime": 1758666803481
//   },
//   "createdAt": "1758663202917",
//   "lastLoginAt": "1758663202918",
//   "apiKey": "AIzaSyB6ut1VfFxLp8HTIO_k7gKeQ37D9zBRNsA",
//   "appName": "[DEFAULT]"
// }
