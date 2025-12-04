import { Component, OnInit, inject } from '@angular/core';
import { CommonModule } from '@angular/common';

import { environment } from '@env/environment';

import { MatIconModule } from '@angular/material/icon';
import { combineLatest } from 'rxjs';

import { CourseCardComponent } from '@school/course-card/course-card.component';
import { StudentListComponent } from '@school/student-list/student-list.component';

import { CourseService } from '@services/course.service';
import { StudentService } from '@services/student.service';
import { UserService } from '@services/user.service';
import { CourseCrudService } from '@services/course-crud.service';
// import { ResultService } from '@services/result.service';
import { TeacherCrudService } from '@services/teacher-crud.service';

import { ExamCrudService } from '@services/exam-crud.service';
import { JobCrudService } from '@services/job-crud.service';

// import { Course } from '@models/course';
// import { Student } from '@models/student';
// import { User } from '@models/user';
import { Result } from '@models/result';
import { Exam } from '@models/exam';
import { Job } from '@models/job';
// import { Recruiter } from '@models/recruiter';
import { Resume } from '@models/resume';

// import { Observable } from 'rxjs';
import { ExamResultListComponent } from '@school/exam-result-list/exam-result-list.component';
// import { Teacher } from '@models/teacher';
// import { TeacherListComponent } from '@school/teacher-list/teacher-list.component';
// import { ExamsListComponent } from '@school/exams-list/exams-list.component';

import { MenuSettingsComponent } from '@recruiter/menu-settings/menu-settings.component';
import { JobsCrudComponent } from '@recruiter/jobs-crud/jobs-crud.component';
import { ExamCrudComponent } from '@superadmin/exam-crud/exam-crud.component';
import { RecruiterAuthService } from '@services/recruiter-auth.service';

import { CandidatesListComponent } from '@recruiter/candidates-list/candidates-list.component';
import { JobsListComponent } from '@recruiter/jobs-list/jobs-list.component';

// import { LoginAndRegisterComponent } from '@recruiter/login-and-register/login-and-register.component';
import { RecruiterAccountComponent } from '@recruiter/recruiter-account/recruiter-account.component';
import { OwnResumesComponent } from '@recruiter/own-resumes/own-resumes.component';
import { AgentChatComponent } from '@recruiter/agent-chat/agent-chat.component';

import { Candidate } from '@models/candidate';
import { CandidateService } from '@services/candidate.service';
import { RecruiterService } from '@services/recruiter.service';
import { AuthService } from '@services/auth.service';
import { ResultService } from '@services/result.service';
import { ResumeService } from '@services/resume.service';
import { VisualStatesService } from '@services/visual-states.service';

import { TranslocoPipe } from '@jsverse/transloco';

import { of, forkJoin, from } from 'rxjs'; // Import 'of'
import { switchMap, tap, filter, catchError, map, take } from 'rxjs/operators';
// import { LoadingBarComponent } from "@shared/loading-bar/loading-bar.component";
// import { map } from 'rxjs/operators';
import { AdminAgentComponent } from '@recruiter/admin-agent/admin-agent.component'

@Component({
  selector: 'app-recruiter-dashboard',
  imports: [
    CommonModule,
    MatIconModule,
    JobsCrudComponent,
    ExamCrudComponent,
    MenuSettingsComponent,
    TranslocoPipe,
    CandidatesListComponent,
    ExamResultListComponent,
    // StudentListComponent,
    // TeacherListComponent,
    // ExamsListComponent,
    JobsListComponent,
    // LoginAndRegisterComponent,
    // LoadingBarComponent,
    RecruiterAccountComponent,
    OwnResumesComponent,
    AgentChatComponent,
    AdminAgentComponent
],
  templateUrl: './recruiter-dashboard.component.html',
})
export class RecruiterDashboardComponent {
  authService = inject(AuthService);
  examCrudService = inject(ExamCrudService);
  recruiterAuthService = inject(RecruiterAuthService);
  candidateService = inject(CandidateService);
  recruiterService = inject(RecruiterService);
  resultService = inject(ResultService);
  jobCrudService = inject(JobCrudService);
  resumeService = inject(ResumeService);
  visualStatesService = inject(VisualStatesService);


  // exams: Exam[] = [];

  candidates: Candidate[] = [];
  results: Result[] = [];
  jobs: Job[] = [];
  jobsOrderedByCandidates: Job[] = [];
  resumes: Resume[] = [];
  exams: Exam[] = [];

  currentView:
    | 'teachers'
    | 'students'
    | 'results'
    | 'config'
    | 'exams'
    | 'jobs'
    | 'jobs_edit'
    | 'own_resumes'
    | 'candidates'
    | 'agent_chat'
    | 'admin_agent'
    | ''
    // = 'jobs'; // Default to courses
    = 'candidates'; // Default to courses

  showSettingMenu: boolean = false;

  allowedExamsShow: boolean = true;



  async ngOnInit() {
    this.authService.user$
      .pipe(
        // 1. Aseguramos que el usuario esté autenticado
        filter((user) => !!user),
        // 2. `switchMap` para obtener el UID del reclutador y luego los datos relacionados
        switchMap((user) => {
          // console.log(user);

          const recruiterUid = user!.uid; // Obtenemos el UID del reclutador aquí
          // console.log('Recruiter UID:', recruiterUid);

          // `forkJoin` para buscar candidatos y trabajos en paralelo
          return forkJoin({
            candidates: this.candidateService.getCandidatesByRecruiter(recruiterUid).pipe(
              take(1),
              tap((candidates) => {
                this.candidates = candidates; // Asignamos los candidatos a la propiedad del componente
                // console.log('Retrieved candidates (inside forkJoin):', this.candidates);
              }),
              map((candidates) => candidates.map((c) => c.candidateUID)), // Extraemos los UIDs para buscar resultados
              catchError((error) => {
                console.error('Error fetching candidates (inside forkJoin):', error);
                return of([]); // Retornar un array vacío en caso de error
              })
            ),
            jobs: this.jobCrudService.getJobs(recruiterUid).pipe( // Buscamos los trabajos del reclutador
              take(1),
              tap((jobs) => {
                this.jobs = jobs; // Asignamos los trabajos a la propiedad del componente
                // console.log('Retrieved jobs (inside forkJoin):', this.jobs);
              }),
              catchError((error) => {
                // console.error('Error fetching jobs (inside forkJoin):', error);
                return of([]); // Retornar un array vacío en caso de error
              })
            ),
            // ✅ AÑADIMOS LA CARGA DE RESUMES AQUÍ
            resumes: from(this.resumeService.getResumesForRecruiter(recruiterUid)).pipe(
              take(1),
              tap((resumes) => {
                this.resumes = resumes; // Asignamos los resumes a la propiedad del componente
                // console.log('Retrieved resumes (inside forkJoin):', this.resumes);
              }),
              catchError((error) => {
                console.error('Error fetching resumes (inside forkJoin):', error);
                return of([]);
              })
            ),
            // ✅ AÑADIMOS LA CARGA DE RESUMES AQUÍ
            exams: from(this.examCrudService.getExamsByRecruiterId(recruiterUid)).pipe(
              take(1),
              tap((exams) => {
                this.exams = exams; // Asignamos los exams a la propiedad del componente
                // console.log('Retrieved exams (inside forkJoin):', this.exams);
              }),
              catchError((error) => {
                console.error('Error fetching resumes (inside forkJoin):', error);
                return of([]);
              })
            ),
            // Pasamos el `recruiterUid` directamente en el `forkJoin` para que esté disponible en el siguiente `switchMap`
            recruiterUid: of(recruiterUid)
          }).pipe(
            // tap(forkJoinResults =>
            //   console.log('forkJoin emitted:', forkJoinResults))
          );
        }),
        // 3. `switchMap` para procesar los resultados de `forkJoin` (candidatesUIDs, jobs y recruiterUid)
        switchMap(({ candidates, jobs, resumes, recruiterUid }) => {

          // Si no hay candidatos, retornamos observables vacíos para `results`
          if (candidates.length === 0) {
            console.log('No candidate UIDs to fetch results for.');
            return of({ results: [], jobs: jobs, resumes: resumes, recruiterUid: recruiterUid });
          }
          // Llamamos al servicio para obtener los resultados de TODOS los UIDs de candidatos (sin filtrar aún por `examId`)
          return this.resultService.getResultsByUserUIDs(candidates).pipe(
            map(results => ({ results, jobs, resumes: resumes, recruiterUid: recruiterUid })) // Combinamos con `jobs` y `recruiterUid`
          );

        })
      )
      .subscribe({
        next: ({ resumes, results: fetchedResults, jobs, recruiterUid }) => {
          this.jobs = jobs; // Asignamos los trabajos al componente
          // console.log('Jobs for recruiter:', this.jobs);

          // if(this.jobs.length == 0){
          //   this.setView('jobs_edit')
          //   // this.allowedExamsShow = false
          // }

          this.resumes = resumes;
          // console.log('Resumes for recruiter:', this.resumes);

          // 1. **Filtro Crucial:** Obtener los `examId` de los trabajos creados por el reclutador actual
          const recruiterExamIds = new Set(
            this.jobs
              .filter(job => job.ownerId === recruiterUid) // Filtra los trabajos que son propiedad del reclutador actual
              .map(job => job.examId)                      // Extrae los `examId` de esos trabajos
              .filter((examId): examId is string => !!examId) // Asegura que `examId` no sea `undefined` o `null`
          );

          // 2. **Asignación y Filtrado de Resultados:**
          // `fetchedResults` contiene los resultados de *todos* los candidatos gestionados por el reclutador.
          // Aquí, filtramos `fetchedResults` para que `this.results` solo contenga aquellos `Result`s
          // cuyo `examId` corresponda a un examen creado por el reclutador actual.
          this.results = fetchedResults.filter(result =>
            recruiterExamIds.has(result.examId)
          );

          // console.log('Results (filtered by candidate UIDs AND recruiter\'s exam IDs):', this.results);

          // Llama a la función para ordenar los trabajos una vez que los datos estén cargados
          this.orderJobsByCandidateCount();

          if(this.jobs.length == 0){
            this.setView('jobs_edit')
          }
          if(this.jobs.length >= 1){
            this.setView('jobs')
          }
          if(this.jobs.length >= 1){
            this.setView('agent_chat')
          }

        },
        error: (error) => {
          console.error('Error in main subscription:', error);
        },
        complete: () => {
          console.log('All data subscriptions completed.');
        },
      });
      console.log('esto se ejecuta de toque arranca el NgOninit');

  }



  setView(
    view:
      | 'teachers'
      | 'students'
      | 'results'
      | 'config'
      | 'exams'
      | 'jobs'
      | 'jobs_edit'
      | 'candidates'
      | 'own_resumes'
      | 'agent_chat'
      | 'admin_agent'
  ) {
    this.currentView = view;
  }

  switchExpand() {
    this.showSettingMenu = !this.showSettingMenu;
  }

  goToMain() {
    alert('Gracias totales \nNo va a nngun lado');
    // window.open("https://trainer-teacher.web.app", '_blank');
    // window.open(`${environment.BASEURL}`, '_blank');
    // this.router.navigate(['/main']);
  }

  /**
   * Filters the 'results' array to return only those belonging to a specific candidate.
   * @param candidateUID The UID of the candidate to filter results for.
   * @returns An array of Result objects for the given candidate.
   */
  getResultsForCandidate(candidateUID: string): Result[] {
    return this.results.filter((result) => result.userUID === candidateUID);
  }


  /**
   * Retorna los candidatos asociados a un trabajo específico.
   * @param jobId El ID del trabajo.
   * @returns Un array de objetos Candidate.
   */
  getCandidatesForJob(jobId: string): Candidate[] {
    return this.candidates.filter(
      (candidate) => candidate.jobs && candidate.jobs.includes(jobId)
    );
  }

  /**
   * Retorna los resultados de examen asociados a los candidatos de un trabajo específico.
   * Nota: Estos resultados ya están pre-filtrados en `ngOnInit` para ser solo de los exámenes del reclutador actual.
   * @param jobId El ID del trabajo.
   * @returns Un array de objetos Result.
   */
  getResultsForJobCandidates(jobId: string): Result[] {
    const candidatesForThisJob = this.getCandidatesForJob(jobId);
    const candidateUIDsForJob = candidatesForThisJob.map(
      (candidate) => candidate.candidateUID
    );
    // Filtra el array 'this.results' (que ya contiene solo los resultados de exámenes del reclutador actual)
    // para obtener aquellos que pertenecen a los candidatos de este 'jobId'.
    return this.results.filter((result) =>
      candidateUIDsForJob.includes(result.userUID)
    );
  }

  /**
   * Ordena la lista de trabajos (`this.jobs`) para la vista de 'jobs'.
   * Primero, los trabajos `active: true` ordenados por cantidad de candidatos (descendente).
   * Luego, los trabajos `active: false` también ordenados por cantidad de candidatos (descendente).
   */
  orderJobsByCandidateCount(): void {
    const activeJobs = this.jobs.filter((job) => job.active === true);
    const inactiveJobs = this.jobs.filter((job) => job.active === false);

    // Función auxiliar para ordenar por cantidad de candidatos (descendente)
    const sortByCandidateCount = (jobsArray: Job[]): Job[] => {
      // Crea una copia para ordenar y no mutar el array original
      return [...jobsArray].sort((a, b) => {
        const candidatesA = this.getCandidatesForJob(a.jobId).length;
        const candidatesB = this.getCandidatesForJob(b.jobId).length;
        return candidatesB - candidatesA; // Orden descendente: más candidatos primero
      });
    };

    const sortedActiveJobs = sortByCandidateCount(activeJobs);
    const sortedInactiveJobs = sortByCandidateCount(inactiveJobs);

    this.jobsOrderedByCandidates = [...sortedActiveJobs, ...sortedInactiveJobs];

    // console.log(
    //   'Jobs ordered (Active first, then Inactive, both by candidate count):',
    //   this.jobsOrderedByCandidates
    // );
  }

  /**
   * Obtiene una lista de candidatos que han aprobado el examen para un trabajo específico.
   * Un candidato se considera "aprobado" si tiene un `Result` asociado a ese `jobId`
   * donde `examPassed` es `true` y el `examId` coincide con el del trabajo.
   * @param jobId El ID del trabajo.
   * @returns Un array de objetos Candidate que han aprobado el examen para el trabajo dado.
   */
  getApprovedCandidatesForJob(jobId: string): Candidate[] {
    const job = this.jobs.find((j) => j.jobId === jobId);
    // Si el trabajo no existe o no tiene un examId, no hay candidatos aprobados por examen para ese trabajo.
    if (!job || !job.examId) {
      return [];
    }

    // Obtener todos los resultados asociados a los candidatos de este trabajo
    // (Estos resultados ya están filtrados por el examId del reclutador en `ngOnInit`)
    const resultsForJobCandidates = this.getResultsForJobCandidates(jobId);

    // Filtrar los resultados para encontrar aquellos que pasaron el examen y corresponden al examId del trabajo
    const approvedResultsForThisJob = resultsForJobCandidates.filter(
      (result) => result.examPassed === true && result.examId === job.examId
    );

    // Extraer los `userUID` (IDs de candidatos) de los resultados aprobados
    const approvedCandidateUIDs = new Set(
      approvedResultsForThisJob.map((result) => result.userUID)
    );

    // Filtrar la lista global de candidatos para obtener solo los objetos Candidate completos
    // cuyos UIDs están en el Set de aprobados.
    return this.candidates.filter((candidate) =>
      approvedCandidateUIDs.has(candidate.candidateUID)
    );
  }

  /**
   * Obtiene los resultados de examen para un candidato específico,
   * asegurando que solo se incluyan los resultados de exámenes creados por el reclutador actual.
   * Esta función es para la vista donde se listan los candidatos y sus resultados asociados.
   * @param candidateUID El UID del candidato.
   * @returns Un array de objetos Result que corresponden a exámenes del reclutador.
   */
  getRecruiterSpecificResultsForCandidate(candidateUID: string): Result[] {
    // `this.results` ya está pre-filtrado en `ngOnInit` para contener solo los resultados
    // de exámenes creados por el reclutador actual Y que fueron realizados por los candidatos del reclutador.
    // Por lo tanto, solo necesitamos filtrar por `candidateUID`.
    return this.results.filter((result) => result.userUID === candidateUID);
  }

  // async getAllResumes(jobIds: any) {
  //   this.resumes = await this.resumeService.getResumesForJobs(jobIds);
  //   console.log(this.resumes);
  // }

  // Y tu función auxiliar en el padre, que ahora solo filtra el array que ya tienes.
  getResumesForJob(jobId: string): Resume[] {
    return this.resumes.filter(resume => resume.jobRelated === jobId);
  }

  getExamForJob(examId: string | undefined) {
    // Si examId es undefined o nulo, la función devuelve undefined.
    if (!examId) {
      return undefined;
    }
    // Utiliza el método .find() para buscar el primer examen que coincida con el id.
    return this.exams.find(exam => exam.id === examId);
  }


}
