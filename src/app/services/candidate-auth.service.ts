import { Injectable, inject, signal } from '@angular/core';

import { Auth, GoogleAuthProvider, createUserWithEmailAndPassword, signInWithEmailAndPassword, signOut, updateProfile, user, signInWithPopup, signInWithRedirect, User } from '@angular/fire/auth';

import { Observable, from } from 'rxjs';

import { Candidate } from '@models/candidate';
import { CandidateService } from '@services/candidate.service';
import { TranslocoService } from '@jsverse/transloco';


@Injectable({
  providedIn: 'root'
})
export class CandidateAuthService {

  firebaseAuth = inject(Auth);
  candidateService = inject(CandidateService)
  candidate$ = user(this.firebaseAuth);
  currentCandidateSig = signal<Candidate | null | undefined>(undefined);

  candidate!: Candidate;

  currentUser = signal<Candidate | null>(null);
  loading = signal<boolean>(false);

  constructor(private translocoService: TranslocoService) {
    this.candidate$.subscribe(async (firebaseUser) => {
      if (firebaseUser) {
        const candidate = await this.candidateService.getOneCandidate(firebaseUser.uid);
        this.candidateService.setUserSig(candidate);
        // this.currentUserSig.set(candidate); // Opcional
      } else {
        this.candidateService.setUserSig(null);
        // this.currentUserSig.set(null); // Opcional
      }
    });
  }

  register(
    email: string,
    username: string,
    password: string,
    jobRecruiterId: string,
    jobId: string,
    resumeInDB: boolean
  ): Observable<void> {
    const promise = createUserWithEmailAndPassword(
      this.firebaseAuth,
      email,
      password,
    ).then((response) => {
      updateProfile(response.user, { displayName: username })
      this.addRegisterUsed(email, username, response.user.uid, jobRecruiterId, jobId, resumeInDB)
    }
    );
    return from(promise);
  };

  addRegisterUsed(email: string, username: string, userUid:any, jobRecruiterId: string, jobId: string, resumeInDB: boolean) {
    this.candidate = {
      email: email,
      username: username,
      candidateUID: userUid,
      recruiters: [jobRecruiterId],
      jobs: [jobId],
      lastJobId: jobId,
      resumeInDB: resumeInDB
    }
    this.candidateService.addUserWithId(this.candidate, userUid);
    this.candidateService.setUserSig(this.candidate);
  }

  login(email: string, password: string, jobId: string, jobRecruiterId: string): Observable<void> {
    const promise = signInWithEmailAndPassword(this.firebaseAuth, email, password)
      .then(async (response) => {
        const candidate = await this.candidateService.getThisCandidate(response.user.uid);
        this.candidateService.setUserSig(candidate); // Actualiza el signal en CandidateService
        // this.currentUserSig.set(candidate); // Opcional, si querés mantenerlo aquí también
        this.candidateService.updateCandidateIfNeeded(response.user.uid, jobId, jobRecruiterId)
      })
      .catch((error) => {
        console.error('Error en login:', error);
        throw error; // Propaga el error al observable
      });
    return from(promise);
  }

  logout(): Observable<void> {
    this.candidateService.setUserSigNull();
    const promise = signOut(this.firebaseAuth);
    return from(promise)
  }

  // LOGIN CON GOOGLE (Popup)
  async loginWithGoogle(jobRecruiterId: string, jobId: string, resumeInDB: boolean): Promise<void> {
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

        // Validación temprana - Google siempre debe proporcionar email
        if (!email || !username) {
          throw new Error('No se pudo obtener la información necesaria de Google');
        }

        const existingCandidate = await this.candidateService.getThisCandidate(userUid);
        console.log('existing Candidate ==>  ' + existingCandidate);

        this.candidateService.setUserSig(existingCandidate); // Actualiza el signal en CandidateService

        if (existingCandidate) {
          // Ya existe - solo autenticar
          console.log('Candidate ya existe, solo autenticando...');
          // this.router.navigate(['recruiter'])

          // const welcomeback_message = this.translocoService.translate('candidate_resume.resume_sent_success');
          // alert('Bienvenido de vuelta!');
        } else {
          // No existe - registrar nuevo usuario
          console.log('Nuevo recruiter, registrando...');
          this.addRegisterUsed(email, username, userUid, jobRecruiterId, jobId, resumeInDB);
          const accountCreatedOk = this.translocoService.translate('auth.account_created_ok');
          alert(username + ' ' + accountCreatedOk);
          // this.router.navigate(['recruiter'])
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
