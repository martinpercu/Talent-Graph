import { Component, Input, inject } from '@angular/core';
import { CommonModule } from '@angular/common'; // Ya lo tienes, pero es el módulo que contiene los pipes
// import { TranslocoPipe } from '@jsverse/transloco';
import { MatIconModule } from '@angular/material/icon';

import { Job } from '@models/job';
import { Candidate } from '@models/candidate';
import { Resume } from '@models/resume';
import { Exam } from '@models/exam';

import { ResumeService } from '@services/resume.service'

import { environment } from '@env/environment';

import { ResumeViewerComponent } from '@recruiter/resume-viewer/resume-viewer.component';
import { TranslocoPipe, TranslocoService } from '@jsverse/transloco';

import { StringTransformerService } from '@services/string-transformer.service';



@Component({
  selector: 'app-jobs-list',
  imports: [TranslocoPipe, MatIconModule, ResumeViewerComponent, CommonModule],
  templateUrl: './jobs-list.component.html',
  styleUrl: './jobs-list.component.css'
})
export class JobsListComponent {
  @Input() job!: Job;
  @Input() candidatesForJob!: Candidate[];
  // @Input() results!: Result[];
  @Input() candidatesForJobAndExamPassed!: Candidate[];
  @Input() resumesForJob!: Resume[];
  @Input() examForJob!: Exam | undefined;

  resumeService = inject(ResumeService);
  transformerString = inject(StringTransformerService);

  magicLink: string = 'Este es el texto super importante que ya tengo en mi variable.';
  copiedSucces: boolean = false; // Para mostrar un mensaje de éxito
  errorInCopy: boolean = false; // Para mostrar un mensaje de error

  showCandidates!: boolean;
  showCandidatesExamPassed!: boolean;
  showCandidatesThumbUp!: boolean;

  candidatesWithScores: any[] = [];
  candidatesWithThumbUp: any[] = [];

  selectedResume: Resume | null = null; // Esta variable guardará el currículum a mostrar


  constructor(private translocoService: TranslocoService){}

  // testerA: boolean = false

  async ngOnInit() {
    console.log('START OnINIT Job-List');
    // console.log(this.job);
    // console.log(this.candidatesForJob);
    // console.log(this.candidatesForJobAndExamPassed);
    this.showCandidates = false
    this.showCandidatesExamPassed = false
    const algo = btoa(this.job.jobId);
    // console.log(this.job.jobId);
    // console.log(this.job.magicId);
    // console.log(algo);
    // console.log('arriba el BTOA');


    this.magicLink = `${environment.BASEURL}/job/${this.job.magicId}`;
    console.log(this.magicLink);
    // console.log(this.resumesForJob);
    this.combineCandidateData();
    // console.log(this.candidatesWithScores);
    // console.log(this.candidatesWithThumbUp);
    this.combineCandidateForThumbUp()
    // console.log(this.candidatesWithThumbUp);
    console.log(this.examForJob + 'eeee');
    console.log('END OnINIT Job-List');
  };


  private combineCandidateData(): void {
    // 1. Mapea y combina los datos
    this.candidatesWithScores = this.candidatesForJob.map(candidate => {
      const resume = this.resumesForJob.find(
        (r) => r.candidateUID === candidate.candidateUID
      );

      // Si no se encuentra un 'resume' o 'scoreToPosition', el valor es null.
      const score = resume ? resume.scoreToPosition : null;

      return {
        ...candidate,
        scoreToPosition: score,
      };
    });

    // 2. Ordena la lista de candidatos de mayor a menor puntuación
    this.candidatesWithScores.sort((a, b) => {
      // Si la puntuación es null, la tratamos como -1 para que se vaya al final.
      const scoreA = a.scoreToPosition !== null ? a.scoreToPosition : -1;
      const scoreB = b.scoreToPosition !== null ? b.scoreToPosition : -1;

      // Ordena de forma descendente (de mayor a menor)
      return scoreB - scoreA;
    });
  }


  private combineCandidateForThumbUp(): void {
    this.candidatesWithThumbUp = this.candidatesForJob
    .map(candidate => {
      const resume = this.resumesForJob.find(
        (r) => r.candidateUID === candidate.candidateUID
      );

      // Si no se encuentra un 'resume' o 'scoreToPosition', el valor es null.
      const score = resume ? resume.scoreToPosition : null;

      return {
        ...candidate,
        scoreToPosition: score,
        thumbUp: resume ? resume.thumbUp : false, // Aseguramos que la propiedad thumbUp exista para el filtrado
      };
    })
    .filter(candidate => candidate.thumbUp === true);


    // 2. Ordena la lista de candidatos de mayor a menor puntuación
    this.candidatesWithThumbUp.sort((a, b) => {
      // Si la puntuación es null, la tratamos como -1 para que se vaya al final.
      const scoreA = a.scoreToPosition !== null ? a.scoreToPosition : -1;
      const scoreB = b.scoreToPosition !== null ? b.scoreToPosition : -1;

      // Ordena de forma descendente (de mayor a menor)
      return scoreB - scoreA;
    });
  }


  switchShowCandidates(){
    this.showCandidates = !this.showCandidates
  };

  switchShowCandidatesExamPassed(){
    this.showCandidatesExamPassed = !this.showCandidatesExamPassed
  };

  switchShowCandidatesResumeThumbUp(){
    this.showCandidatesThumbUp = !this.showCandidatesThumbUp
  };

  async copyMagicString(): Promise<void> {
    this.copiedSucces = false;
    this.errorInCopy = false;
    // this.testerA = !this.testerA;
    // Check if API Clipboard is ready on Browser
    if (navigator.clipboard && navigator.clipboard.writeText) {
      try {
        // Intentar escribir el texto en el portapapeles
        await navigator.clipboard.writeText(this.magicLink);
        console.log('String copiado exitosamente al portapapeles:', this.magicLink);
        this.copiedSucces = true;
        // hide succes message after 2 secs.
        setTimeout(() => {
          this.copiedSucces = false;
        }, 2000);
      } catch (err) {
        // Catch error if copy problem (ej. denied permits)
        console.error('Error trying copy:', err);
        this.errorInCopy = true;
        // hide error message after 3 secs
        setTimeout(() => {
          this.errorInCopy = false;
        }, 3000);
      }
    } else {
      // Show warning if API is not available (very old browsers)
      console.warn('API Clipboard not compatible with this browser.');
      this.errorInCopy = true; // Podrías usar un mensaje diferente aquí si quieres
      // const messageBrowserNotCopy = this.translocoService.translate('recruiter.browser_not_copy');
      // alert(messageBrowserNotCopy + '\n\n' + this.magicLink);
    }
  }

  // Esta función ahora recibe un objeto Candidate
  showResume(candidate: Candidate): void {
    // 1. Busca el currículum (resume) correspondiente en la lista de resumesForJob
    const resumeToShow = this.resumesForJob.find(resume => resume.candidateUID === candidate.candidateUID);

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


  updateFromViewer() {
    console.log("updateFromViewer recibido en el padre!"); // ¿Sale este log?
    // alert("¡Llegamos al padre!");
    console.log("¡CHE, LLEGAMOS AL PADRE!");

    console.log("updateFromViewer recibido en el padre!");

    // Recalcula la lista de candidatos con thumbUp
    this.combineCandidateForThumbUp();

    // También podrías recalcular los scores por si cambió algo más
    this.combineCandidateData();

    console.log("Listas actualizadas:", this.candidatesWithThumbUp);
  }

  turnOffManualLink() {
    // this.testerA = !this.testerA
    this.errorInCopy = !this.errorInCopy
  }

}


  // private combineCandidateData(): void {
  //   this.candidatesWithScores = this.candidatesForJob.map(candidate => {
  //     // Usamos 'find' para buscar el resume correspondiente
  //     const resume = this.resumesForJob.find(
  //       (r) => r.candidateUID === candidate.candidateUID
  //     );

  //     // Devolvemos un nuevo objeto que combine ambos datos
  //     return {
  //       ...candidate, // Copia todas las propiedades del candidato
  //       scoreToPosition: resume ? resume.scoreToPosition : 'N/A', // Añade el score, o 'N/A' si no se encuentra
  //     };
  //   });
  // }

  // private combineCandidateData(): void {
  //   // 1. Mapea y combina los datos como lo estabas haciendo
  //   this.candidatesWithScores = this.candidatesForJob.map(candidate => {
  //     const resume = this.resumesForJob.find(
  //       (r) => r.candidateUID === candidate.candidateUID
  //     );
  //     return {
  //       ...candidate,
  //       scoreToPosition: resume ? resume.scoreToPosition : null, // Cambiado a `null` para facilitar el ordenamiento
  //     };
  //   });

  //   // 2. Ordena la lista de candidatos
  //   // Se ordena de mayor a menor puntuación (scoreToPosition)
  //   this.candidatesWithScores.sort((a, b) => {
  //     // Maneja los casos en que la puntuación es nula
  //     const scoreA = a.scoreToPosition || -1;
  //     const scoreB = b.scoreToPosition || -1;

  //     // Ordena de mayor a menor
  //     return scoreB - scoreA;
  //   });
  // }
