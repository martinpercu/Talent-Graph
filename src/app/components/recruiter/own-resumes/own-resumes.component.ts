import { Component, Input, inject, signal } from '@angular/core';

import { MatIconModule } from '@angular/material/icon';

import { Ownresume } from '@models/ownResume';
import { Resume } from '@models/resume';

import { ResumeService } from '@services/resume.service';
import { Subscription } from 'rxjs';

import { TranslocoPipe } from '@jsverse/transloco';

import { CommonModule } from '@angular/common';
import { FormsModule } from '@angular/forms';

import { StorageService } from '@services/storage.service';

import { LoadingBarComponent } from '@shared/loading-bar/loading-bar.component';

import { OwnResumeViewerComponent } from '@recruiter/own-resume-viewer/own-resume-viewer.component';
import { ResumeViewerComponent } from '@recruiter/resume-viewer/resume-viewer.component';




@Component({
  selector: 'app-own-resumes',
  imports: [MatIconModule, TranslocoPipe, CommonModule, FormsModule, LoadingBarComponent, OwnResumeViewerComponent, ResumeViewerComponent],
  templateUrl: './own-resumes.component.html'
})
export class OwnResumesComponent {
  @Input() recruiterId!: any;

  resumeService = inject(ResumeService);
  storageService = inject(StorageService);

  selectedFile: File | null = null;
  fileSizeError: boolean = false; // Nueva propiedad para el mensaje de error
  readonly MAX_FILE_SIZE_MB = 2; // Tamaño máximo permitido en MB

  showLoadingBar = signal<boolean>(false);

  ownResumes: Ownresume[] = [];
  resumes: Resume[] = [];

  private ownResumeSubscription!: Subscription; // Para manejar la desuscripción
  private resumeSubscription!: Subscription; // to handle unsubscription

  showResume!: boolean;

  selectedOwnResume: Ownresume | null = null; // Esta variable guardará el currículum a mostrar
  selectedResume: Resume | null = null; // Esta variable guardará el currículum a mostrar


  showListOwnResumes: boolean = false
  showListResumes: boolean = false


  constructor() {
    console.log(this.recruiterId);

  }
  ngOnInit() {
    console.log(this.recruiterId);
    this.ownResumeSubscription = this.resumeService
      .getOwnResumesForRecruiter(this.recruiterId)
      .subscribe({
        next: (data) => {
          // Asigna los datos a la propiedad
          this.ownResumes = data;
        },
        error: (err) => {
          console.error('Error al cargar resumes:', err);
          // Manejo de errores aquí...
        }
      });

    this.resumeSubscription = this.resumeService
      .getResumesForRecruiter(this.recruiterId)
      .subscribe({
        next: (data) => {
          // Asigna los datos a la propiedad
          this.resumes = data;
        },
        error: (err) => {
          console.error('Error al cargar resumes:', err);
          // Manejo de errores aquí...
        }
      });
  }

  // **IMPORTANTE**: Desuscribirse para evitar fugas de memoria
  ngOnDestroy(): void {
    this.ownResumeSubscription.unsubscribe();
    this.resumeSubscription.unsubscribe();
  }

  onFileSelected(event: Event) {
    const input = event.target as HTMLInputElement;
    if (input.files && input.files.length > 0) {
      const file = input.files[0];
      this.fileSizeError = false; // Resetear cualquier error previo

      // Validar size of file
      if (file.size > this.MAX_FILE_SIZE_MB * 1024 * 1024) {
        this.fileSizeError = true;
        this.selectedFile = null; // Limpiar el archivo seleccionado si es demasiado grande
        input.value = ''; // Limpiar el input file para permitir al usuario seleccionar otro
        return; // Detener la ejecución si el archivo es muy grande
      }
      this.selectedFile = file;
      this.uploadResume(); // Proceder con la subida si la validación pasa
    } else {
      this.selectedFile = null;
      this.fileSizeError = false;
    }
  }


  // --- NEW METHOD: Handles only the upload to Firebase Storage ---
  async uploadResume() {
    if (this.selectedFile && this.recruiterId) {
      const path = `ownresumes/${this.recruiterId}/${Date.now()}_${this.selectedFile.name}`;
      const fileName = this.selectedFile.name;
      const fileType = this.selectedFile.type; // Keep fileType here as we need it later

      console.log('Uploading file to Firebase Storage:', path);

      this.storageService.uploadFile(this.selectedFile, path).subscribe({
        next: (url) => {
          console.log('Received URL from Firebase Storage:', url, typeof url);
          if (url && typeof url === 'string') {
            this.triggerResumeProcessing(url, this.recruiterId, fileType);
          }
          else {
            console.error('Invalid URL received from storage service after upload:', url);
            alert('Error during file upload. Invalid URL.');
          }
        },
        error: (err) => {
          console.error('Error uploading file to Firebase Storage:', err);
          alert('Error uploading resume file. Please check your connection.');
        }
      });
    } else {
      console.error('No file selected or user not authenticated for upload process.');
      alert('Please select a file and ensure you are logged in.');
    }
  }

  async triggerResumeProcessing(resumeUrl: string, recruiterId: string, fileType: string): Promise<any> {
    console.log('Sending request to Python server for resume processing...');
    this.switchBarState();
    try {
      const resumeRawJson = await this.resumeService.processOwnResumeWithPython(resumeUrl, recruiterId, fileType);
      console.log('Resume processing request sent. Response from FastAPI:', resumeRawJson);
      if(resumeRawJson){
        this.loadResumeData(resumeRawJson)
      }
      return resumeRawJson; // Devuelve la respuesta para usarla en el componente
    } catch (err) {
      console.error('Error triggering resume processing:', err);
      console.log('Error details:', JSON.stringify(err)); // Más detalles del error
      alert('An error occurred while processing your resume. Please contact support.');
      throw err; // Propaga el error para manejarlo en el llamador
    }
  }

  async loadResumeData(resumeRawJson: any) {
    console.log('In loadResumeData');
    const resumeId = await this.resumeService.saveOwnResumeDataToFirestore(
      resumeRawJson,
      this.recruiterId
    );
    this.switchBarState(); // Should always close the loadingBar
    if (resumeId) {
        console.log('Documento creado con ID:', resumeId);
        // const candidateUpdate = { resumeInDB: true };
        // await this.candidateService.updateOneUser(candidateUpdate, this.userId);
        // const cvScore = await this.resumeService.getScore(resumeRawJson, this.jobDescription);
        // if (cvScore && cvScore.compatibility_score) {
        //   console.log('Este es el SCORE del CV : \n' + cvScore.compatibility_score);
        //   const resumeUpdate = { scoreToPosition: cvScore.compatibility_score };
        //   const resumeFinished = await this.resumeService.updateOneResume(resumeUpdate, resumeId);
        //   if (resumeFinished) {
        //     // resumeFinished ahora es el objeto completo del CV actualizado
        //     console.log('Este es el documento actualizado del CV: \n', resumeFinished);
        //     // También puedes acceder a sus propiedades
        //     console.log('El nuevo score es:', resumeFinished.scoreToPosition);
        //   } else {
        //     console.log('No se pudo encontrar el documento actualizado.');
        //   }
        // }
        // Aquí puedes hacer lo que quieras con el ID, como guardarlo en la variable del componente
        // this.resumeId = resumeId;
    } else {
        console.error('Error: No se pudo obtener el ID del documento del resume.');
    }
  }

  switchBarState(){
    console.log(this.showLoadingBar());
    this.showLoadingBar.set(!this.showLoadingBar());
    console.log(this.showLoadingBar());
  }


  switchShowOwnResumes(){
    this.showListOwnResumes = !this.showListOwnResumes
  };


  switchShowResumes(){
    this.showListResumes = !this.showListResumes
  };


  // Esta función ahora recibe un objeto Candidate
  showOwnResume(ownresume: Ownresume): void {
    // 1. Busca el currículum (resume) correspondiente en la lista de resumesForJob
    // const resumeToShow = this.resumesForJob.find(resume => resume.candidateUID === candidate.candidateUID);
    const resumeToShow = ownresume;
    console.log(resumeToShow);

    // 2. Si se encontró un currículum
    if (resumeToShow) {
      // 3. Compara si el currículum encontrado es el mismo que el que se está mostrando actualmente.
      // Si son el mismo, significa que el usuario está haciendo "toggle" para ocultarlo.
      if (this.selectedOwnResume === resumeToShow) {
        this.selectedOwnResume = null; // Oculta el componente.
      } else {
        // Si es diferente, lo asigna para que se muestre.
        this.selectedOwnResume = resumeToShow;
      }
    } else {
      // En caso de que no haya un currículum para el candidato, lo ocultamos por si acaso.
      this.selectedOwnResume = null;
    }
  }

  // Esta función ahora recibe un objeto Candidate
  showCandidateResume(resume: Resume): void {
    // 1. Busca el currículum (resume) correspondiente en la lista de resumesForJob
    // const resumeToShow = this.resumesForJob.find(resume => resume.candidateUID === candidate.candidateUID);
    const resumeToShow = resume;
    console.log(resumeToShow);

    // 2. Si se encontró un currículum
    if (resumeToShow) {
      // 3. Compara si el currículum encontrado es el mismo que el que se está mostrando actualmente.
      // Si son el mismo, significa que el usuario está haciendo "toggle" para ocultarlo.
      if (this.selectedResume === resumeToShow) {
        this.selectedResume = null; // Oculta el componente.
      } else {
        // Si es diferente, lo asigna para que se muestre.
        this.selectedResume = resumeToShow;
      }
    } else {
      // En caso de que no haya un currículum para el candidato, lo ocultamos por si acaso.
      this.selectedResume = null;
    }
  }



}
