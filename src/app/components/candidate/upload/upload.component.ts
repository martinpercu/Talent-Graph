import { Component, inject, Input, signal } from '@angular/core';
import { CommonModule } from '@angular/common';
import { FormsModule } from '@angular/forms';

import { TranslocoPipe } from '@jsverse/transloco';
import { StorageService } from '@services/storage.service';
import { CandidateService } from '@services/candidate.service';
import { AuthService } from '@services/auth.service';
import { ResumeService } from '@services/resume.service';

import { LoadingBarComponent } from '@shared/loading-bar/loading-bar.component';

import { Resume } from '@models/resume'


@Component({
  selector: 'app-upload',
  imports: [TranslocoPipe, CommonModule, FormsModule, LoadingBarComponent],
  templateUrl: './upload.component.html',
})
export class UploadComponent {
  @Input() jobId!: string;
  @Input() jobDescription!: string;
  @Input() recruiterId!: string;
  authService = inject(AuthService);
  storageService = inject(StorageService);
  candidateService = inject(CandidateService);
  resumeService = inject(ResumeService);

  selectedFile: File | null = null;
  fileSizeError: boolean = false; // Nueva propiedad para el mensaje de error
  readonly MAX_FILE_SIZE_MB = 2; // Tamaño máximo permitido en MB

  userId!: string;

  // showLoadingBar: boolean = false;
  showLoadingBar = signal<boolean>(false);

  resume!: Resume;

  constructor() {}

  async ngOnInit() {
    this.authService.user$.subscribe((user) => {
      if (user) {
        this.userId = user.uid;
        console.log('UID:', this.userId);
      } else {
        console.error('No user authenticated');
      }
    });
    console.log(this.jobId);
    console.log(this.recruiterId);
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
    if (this.selectedFile && this.userId) {
      const path = `resumes/${this.userId}/${Date.now()}_${this.selectedFile.name}`;
      const fileName = this.selectedFile.name;
      const fileType = this.selectedFile.type; // Keep fileType here as we need it later

      console.log('Uploading file to Firebase Storage:', path);

      this.storageService.uploadFile(this.selectedFile, path).subscribe({
        next: (url) => {
          console.log('Received URL from Firebase Storage:', url, typeof url);
          if (url && typeof url === 'string') {
            // Save the Firebase Storage URL and file name to the candidate's record
            this.candidateService.updateOneUser({ resumePath: url, resumeDocName: fileName }, this.userId)
              .then(() => {
                console.log('Resume URL and name saved to candidate record in Firebase.');
                // alert('Resume uploaded successfully!');

                // --- CALL NEW METHOD TO TRIGGER PROCESSING AFTER SUCCESSFUL UPLOAD AND DB SAVE ---
                // this.triggerResumeProcessing(url, this.userId, fileType);
                // const resumeUrl = "https://firebasestorage.googleapis.com/v0/b/trainer-teacher.firebasestorage.app/o/resumes%2Fy5qcLmxLWEfPoq6gV39UNUrketA3%2F1753979962452_Resume-SUMsmall-skil6.pdf?alt=media&token=d5157d1a-cc5d-489d-a9f6-5cd1921fa022";
                // const userId = "IoUuFFIjqK8cv8lR1vQR";
                // const fileType = "application/pdf";

                this.triggerResumeProcessing(url, this.userId, fileType);

                // ----------------------------------------------------------------------------------

                // Optional: Consider if you truly need to reload the page immediately after upload
                // A better UX might be to show a "Processing..." message.
                // window.location.reload();
              })
              .catch((err) => {
                console.error('Error saving resume URL to candidate record in Firebase:', err);
                alert('Error saving resume details. Please try again.');
              });
          } else {
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

  async triggerResumeProcessing(resumeUrl: string, userId: string, fileType: string): Promise<any> {
    console.log('Sending request to Python server for resume processing...');
    this.switchBarState();
    try {
      const resumeRawJson = await this.resumeService.processResumeWithPython(resumeUrl, userId, fileType);
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
    const resumeId = await this.resumeService.saveResumeDataToFirestore(
      resumeRawJson,
      this.userId,
      this.jobId,
      this.recruiterId
    );
    this.switchBarState(); // Should always close the loadingBar
    if (resumeId) {
        console.log('Documento creado con ID:', resumeId);
        const candidateUpdate = { resumeInDB: true };
        await this.candidateService.updateOneUser(candidateUpdate, this.userId);
        const cvScore = await this.resumeService.getScore(resumeRawJson, this.jobDescription);
        if (cvScore && cvScore.compatibility_score) {
          console.log('Este es el SCORE del CV : \n' + cvScore.compatibility_score);
          const resumeUpdate = { scoreToPosition: cvScore.compatibility_score };
          const resumeFinished = await this.resumeService.updateOneResume(resumeUpdate, resumeId);
          if (resumeFinished) {
            // resumeFinished ahora es el objeto completo del CV actualizado
            console.log('Este es el documento actualizado del CV: \n', resumeFinished);
            // También puedes acceder a sus propiedades
            console.log('El nuevo score es:', resumeFinished.scoreToPosition);
          } else {
            console.log('No se pudo encontrar el documento actualizado.');
          }
        }
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



}
