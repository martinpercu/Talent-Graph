// import { Component, OnInit, inject } from '@angular/core';
// import { Auth, authState } from '@angular/fire/auth';
// import { Observable, of } from 'rxjs';
// import { catchError } from 'rxjs/operators';
// import { FormsModule } from '@angular/forms';
// import { CommonModule, AsyncPipe } from '@angular/common';

// import { JobCrudService } from '@services/job-crud.service';
// import { Job } from '@models/job';
// import { ExamCrudService } from '@services/exam-crud.service';
// import { Exam } from '@models/exam';
import { Component, OnInit, inject } from '@angular/core';
import { Auth, authState } from '@angular/fire/auth';
import { Observable, of } from 'rxjs';
import { catchError } from 'rxjs/operators';
import { FormsModule } from '@angular/forms';
import { CommonModule, AsyncPipe } from '@angular/common';

import { JobCrudService } from '@services/job-crud.service';
import { Job } from '@models/job';
import { ExamCrudService } from '@services/exam-crud.service';
import { Exam } from '@models/exam';
import { TranslocoPipe } from '@jsverse/transloco';

import { RecruiterService } from '@services/recruiter.service'
import { MatIconModule } from '@angular/material/icon';
import { StringTransformerService } from '@services/string-transformer.service';

// AGENTs AI
import { AgentSyncService } from '@services/agent-sync.service';



@Component({
  selector: 'app-jobs-crud',
  imports: [FormsModule, CommonModule, AsyncPipe, TranslocoPipe, MatIconModule],
  templateUrl: './jobs-crud.component.html',
})
export class JobsCrudComponent {

  // --- Inyección de Dependencias ---
  auth = inject(Auth);
  jobCrudService = inject(JobCrudService);
  examCrudService = inject(ExamCrudService);

  recruiterService = inject(RecruiterService);
  stringTransformerService = inject(StringTransformerService);
  agentSyncService = inject(AgentSyncService);

  // --- Propiedades del Componente ---
  jobs$!: Observable<Job[]>;
  exams$!: Observable<Exam[]>;

  // Modelo del formulario, ahora incluye los nuevos campos
  newJob: Partial<Job> = {
    name: '',
    description: '',
    ownerId: '',
    active: true, // Valor por defecto para nuevos trabajos
    examId: '',
    examActive: false,
    // jobId: ''
  };

  errorMessage: string = '';
  editingJobId: string | undefined = undefined;
  selectedJobId: string = '';
  isAuthenticated: boolean = false;
  private recruiterId!: string;

  showExpandForm: boolean = false;

  payView: boolean = false;
  basicDetailView: boolean =  false;

  salaryView:
    | 'hour'
    | 'week'
    | 'month'
    | 'annual'
    | '' = ''; // Default view


  showSalary: boolean = false;
  salaryWithRange: boolean = false;

  showHours: boolean = false;
  showExtras: boolean = false;
  showExam: boolean = false;
  examsListMoreThanOne: boolean = false;

  ngOnInit() {
    authState(this.auth).subscribe((user) => {
      this.isAuthenticated = !!user;
      if (user && user.uid) {
        this.recruiterId = user.uid;
      }

      if (!this.isAuthenticated) {
        this.errorMessage = 'Debes iniciar sesión para acceder a los trabajos';
        this.jobs$ = of([]);
        return;
      }

      // Cargar trabajos y exámenes del reclutador
      this.jobs$ = this.jobCrudService.getJobs(this.recruiterId).pipe(
        catchError((error) => {
          console.error('Error al cargar trabajos:', error);
          this.errorMessage = 'Error al cargar trabajos: permisos insuficientes';
          return of([]);
        })
      );

      this.exams$ = this.examCrudService.getExamsByRecruiterId(this.recruiterId).pipe(
        catchError((error) => {
            console.error('Error al cargar exámenes:', error);
            // Opcional: mostrar un mensaje si falla la carga de exámenes
            return of([]);
        })
      );

      console.log(this.exams$);
      this.exams$.subscribe(data => {
        console.log('El estado del observable es que se ha completado la emisión.');
        console.log('Los datos recibidos son:', data);
        console.log('La longitud del array es:', data.length);
        if(data.length >= 1){
          this.examsListMoreThanOne = true
        }
      })

    });
  }

  // --- Funciones CRUD ---

  loadJob(event: Event) {
    const selectElement = event.target as HTMLSelectElement;
    const jobId = selectElement.value;
    this.selectedJobId = jobId;
    if (jobId) {
      // Usar getJobByIdRaw en lugar de getJobById para una sola consulta
      this.jobCrudService.getJobByIdRaw(jobId).then((job) => {
        if (job) {
          // Poblar el formulario con todos los datos del trabajo
          this.newJob = {
            jobId: job.jobId,
            name: job.name,
            description: job.description,
            ownerId: job.ownerId,
            active: job.active || false,
            examId: job.examId || '',
            examActive: job.examActive || false,
            showSalary: job.showSalary || false,
            showRange: job.showRange || false,
            minSalary: job.minSalary || '',
            maxSalary: job.maxSalary || '',
            fixSalary: job.fixSalary || '',
            salaryHour: job.salaryHour || false,
            salaryWeek: job.salaryWeek || false,
            salaryMonth: job.salaryMonth || false,
            salaryYear: job.salaryYear || false,
            hoursPerWeek: job.hoursPerWeek || '',
          };
          this.editingJobId = jobId;
          this.errorMessage = '';
          console.log('Job cargado (una sola vez):', this.newJob);
          this.setDisplay(this.newJob);
        } else {
          this.errorMessage = 'Trabajo no encontrado';
          this.resetForm();
        }
      }).catch((error) => {
        console.error('Error al cargar el trabajo:', error);
        this.errorMessage = 'Error al cargar el trabajo: permisos insuficientes';
        this.resetForm();
      });
    } else {
      this.resetForm();
    }

    // if (jobId) {
    //   this.jobCrudService.getJobById(jobId).subscribe({
    //     next: (job) => {
    //       if (job) {
    //         // Poblar el formulario con todos los datos del trabajo, incluyendo los nuevos
    //         this.newJob = {
    //           jobId: job.jobId,
    //           name: job.name,
    //           description: job.description,
    //           ownerId: job.ownerId, // Usar el ownerId del trabajo cargado
    //           active: job.active || false, // Fallback a false si no está definido
    //           examId: job.examId || '', // Fallback a string vacío
    //           examActive: job.examActive || false, // Fallback a false
    //           showSalary: job.showSalary || false,
    //           minSalary: job.minSalary || '',
    //           maxSalary: job.maxSalary || '',
    //           fixSalary: job.fixSalary || '',
    //           salaryHour: job.salaryHour || false,
    //           salaryWeek: job.salaryWeek || false,
    //           salaryMonth: job.salaryMonth || false,
    //           salaryYear: job.salaryYear || false,
    //           hoursPerWeek: job.hoursPerWeek || '',
    //         };
    //         this.editingJobId = jobId;
    //         this.errorMessage = '';
    //         console.log(this.newJob);
    //         this.setDisplay(this.newJob)
    //       } else {
    //         this.errorMessage = 'Trabajo no encontrado';
    //         this.resetForm();
    //       }
    //     },
    //     error: (error) => {
    //       console.error('Error al cargar el trabajo:', error);
    //       this.errorMessage = 'Error al cargar el trabajo: permisos insuficientes';
    //       this.resetForm();
    //     },
    //   });
    // } else {
    //   this.resetForm();
    // }
  }

  saveJob() {
    if (!this.isAuthenticated) {
      this.errorMessage = 'Debes iniciar sesión para realizar esta acción';
      return;
    }

    if (!this.newJob.name?.trim() || !this.newJob.description?.trim()) {
      this.errorMessage = 'El nombre y la descripción son requeridos';
      return;
    }

    // El chequeo de nombre existente se mantiene igual
    this.jobCrudService.checkJobNameExists(this.newJob.name, this.editingJobId).subscribe({
      next: (exists) => {
        if (exists) {
          this.errorMessage = 'Ya existe un trabajo con este nombre';
          return;
        }


        // Construir el objeto con todos los datos del formulario
        const jobData: Partial<Job> = {
          name: this.newJob.name!.trim(),
          description: this.newJob.description!.trim(),
          active: this.newJob.active,
          examId: this.newJob.examId,
          examActive: !!this.newJob.examId && this.newJob.examActive, // examActive solo puede ser true si hay un examId
          showSalary: this.newJob.showSalary ?? false, // Asigna false si es null o undefined
          showRange: this.newJob.showRange ?? false, // Asigna false si es null o undefined
          salaryHour: this.newJob.salaryHour ?? false, // Asigna 0 si es null o undefined
          salaryWeek: this.newJob.salaryWeek ?? false,
          salaryMonth: this.newJob.salaryMonth ?? false,
          salaryYear: this.newJob.salaryYear ?? false,
          minSalary: this.newJob.minSalary ?? '',
          maxSalary: this.newJob.maxSalary ?? '',
          fixSalary: this.newJob.fixSalary ?? '',
          hoursPerWeek: this.newJob.hoursPerWeek ?? '',
        };

        if (this.editingJobId) {
          // Lógica de Actualización
          // Lógica de Actualización
          console.log(this.editingJobId);
          const idForAgent = this.editingJobId
          if (this.newJob.ownerId !== this.recruiterId) {
            this.errorMessage = 'No tienes permisos para editar este trabajo.';
            return;
          }
          this.jobCrudService.updateJob(this.editingJobId, jobData).subscribe({
            next: () => {
              // this.resetForm();
              // Reload page to show in recruiter dash OK
              console.log('Job UPDATED')
              // console.log('EEEEEEEEE');
              console.log(idForAgent);
              // alert(idForAgent);
              this.updateInAgent(idForAgent)

              // window.location.reload();
            },
            error: (err) => {
              console.error('Error al actualizar:', err);
              this.errorMessage = 'Error al actualizar el trabajo.';
            }
          });
        } else {
          // Lógica de Creación
          // Lógica de Creación
          jobData.ownerId = this.recruiterId; // Asignar propietario

          const magicStampCompressed = this.stringTransformerService.nowInBase62();
          console.log(magicStampCompressed);
          jobData.magicId = magicStampCompressed

          this.jobCrudService.createJob(jobData as Job).subscribe({
            next: (jobId: string | null) => {
              this.resetForm();
              if (jobId) {
                  // this.resetForm();


                  // Pasa el ID o el objeto completo para acciones post-creación
                  this.updateInAgent(jobId);


                  // Evita el reload total si solo estás haciendo una sincronización interna
                  // window.location.reload();
              }
              // Reload page to show in recruiter dash OK
              // window.location.reload();
            },
            error: (err) => {
                console.error('Error al crear:', err);
                this.errorMessage = 'Error al crear el trabajo.';
            }
          });
        }
      },
      error: (error) => {
        console.error('Error al verificar el nombre:', error);
        this.errorMessage = 'Error al verificar el nombre del trabajo';
      }
    });
  }

  deleteJob() {
    if (!this.isAuthenticated || !this.editingJobId) return;

    if (this.newJob.ownerId !== this.recruiterId) {
      this.errorMessage = 'No tienes permisos para eliminar este trabajo.';
      return;
    }
    const jobIdToDelete = this.editingJobId;
    // NOTA: Reemplazar confirm por un modal custom en una app real
    if (confirm('¿Estás seguro de que quieres eliminar este trabajo?')) {
      this.jobCrudService.deleteJob(this.editingJobId).subscribe({
        next: async () => {
          this.deleteJobInAgent(jobIdToDelete)

          this.resetForm();
          // Reload page to show in recruiter dash OK
          // window.location.reload();
        },
        error: (err) => {
            console.error('Error al eliminar:', err);
            this.errorMessage = 'Error al eliminar el trabajo.';
        }
      });
    }
  }

  // --- Funciones Auxiliares ---

  resetForm() {
    this.newJob = {
      name: '',
      description: '',
      ownerId: '',
      active: true, // Valor por defecto
      examId: '',
      showSalary: false,
      showRange: false,
      minSalary: '',
      maxSalary: '',
      fixSalary: '',
      salaryHour: false,
      salaryWeek: false,
      salaryMonth: false,
      salaryYear: false,
      hoursPerWeek: '',
    };
    this.editingJobId = undefined;
    this.selectedJobId = '';
    this.errorMessage = '';
  }

  handleExpandForm() {
    this.showExpandForm = !this.showExpandForm
    if (this.showExpandForm == true) {
      this.basicDetailView = true
    }
  }

  setDisplay(theJob: any){
    console.log(theJob);
    this.payView = theJob.showSalary
    this.salaryWithRange = theJob.showRange

    if(theJob.salaryHour){
      this.salaryView = 'hour';
      console.log(this.newJob.salaryHour , this.newJob.salaryWeek , this.newJob.salaryMonth, this.newJob.salaryYear );
    }
    else if(theJob.salaryWeek){
      this.salaryView = 'week';
    }
    else if(theJob.salaryMonth){
      this.salaryView = 'month';
      console.log(this.newJob.salaryHour , this.newJob.salaryWeek , this.newJob.salaryMonth, this.newJob.salaryYear );
    }
    else if(theJob.salaryYear){
      this.salaryView = 'annual';
    }else{
      console.log('NARANJA FANTA chequear urs week month annual');
    }
  }

  handleShowBasicDetails() {
    this.basicDetailView = !this.basicDetailView
  }

  handleShowSalary(){
    this.showSalary = !this.showSalary
  }

  handlePayView(){
    this.payView = !this.payView;
    this.setBooleanSalaryShow();
  }

  setBooleanSalaryShow() {
    this.newJob.showSalary = this.payView
    console.log(this.newJob);
  }

  setSalaryView(view: 'hour' | 'week' | 'month' | 'annual'){
    this.salaryView = view;
    this.setBooleanOff(view)
  }

  setBooleanOff(view: 'hour' | 'week' | 'month' | 'annual') {
    this.newJob.salaryHour = false;
    this.newJob.salaryWeek = false;
    this.newJob.salaryMonth = false;
    this.newJob.salaryYear = false;
    this.setBoolenFrecuency(view)
  }

  setBoolenFrecuency(view: 'hour' | 'week' | 'month' | 'annual'){
    if(view == 'hour'){
      this.newJob.salaryHour = true;
      console.log(this.newJob.salaryHour , this.newJob.salaryWeek , this.newJob.salaryMonth, this.newJob.salaryYear );
    }
    else if(view == 'week'){
      this.newJob.salaryWeek = true;
    }
    else if(view == 'month'){
      this.newJob.salaryMonth = true;
      console.log(this.newJob.salaryHour , this.newJob.salaryWeek , this.newJob.salaryMonth, this.newJob.salaryYear );

    }
    else if(view == 'annual'){
      this.newJob.salaryYear = true;
    }else{
      console.log('ERROR check booelean hours week month annual');
    }
  }

  handleSalaryFixOrRange() {
    this.salaryWithRange = !this.salaryWithRange
    this.setBooleanRange()
  }

  setBooleanRange() {
    this.newJob.showRange = this.salaryWithRange
    console.log(this.newJob);
  }

  handleShowHours(){
    this.showHours = !this.showHours
  }

  handleShowExtras(){
    this.showExtras = !this.showExtras
  }

  handleShowExam(){
    this.showExam = !this.showExam
  }

  async updateInAgent(jobId: any) {
    // Usamos 'await' para esperar que la Promise se resuelva y obtener el valor directo
    console.log(this.recruiterService.currentRecruitersubcriptionLevel());
    const subscriptionLevel = await this.recruiterService.currentRecruitersubcriptionLevel();
    console.log(subscriptionLevel); // Esto imprimirá directamente '5' (o undefined)

    if(subscriptionLevel && subscriptionLevel >= 5){
      console.log('chabon con Subrscriot alta');
      const theJob = await this.jobCrudService.getJobByIdRaw(jobId)
      console.log(theJob);

      const result = await this.agentSyncService.syncAllJobs([theJob]);
      console.log(result);
      }
  }

  async deleteJobInAgent(jobId: any) {
    try {
        // Usamos await porque deleteJobFromAgent devuelve una Promise (por .toPromise())
        await this.agentSyncService.deleteJobFromAgent(jobId);
        console.log('✅ Job eliminado del Agente AI exitosamente.');
        // alert('✅ Job eliminado del Agente AI exitosamente.');

    } catch (error) {
        // Si el Agente AI no lo encuentra o falla por otra razón,
        // registramos el error pero no bloqueamos el flujo, pues ya se eliminó de la fuente principal.
        console.error('⚠️ Error al eliminar job en Agente AI:', error);
    }
  }

}


//   auth = inject(Auth);
//   jobCrudService = inject(JobCrudService);
//   examCrudService = inject(ExamCrudService);

//   jobs$!: Observable<Job[]>;
//   newJob: Partial<Job> = {
//     name: '',
//     description: '',
//     ownerId: '', // <-- Inicializa ownerId
//   };
//   exams$!: Observable<Exam[]>;
//   errorMessage: string = '';
//   editingJobId: string | undefined = undefined;
//   selectedJobId: string = '';
//   isAuthenticated: boolean = false;
//   private recruiterId!: string;

//   async ngOnInit() {
//     authState(this.auth).subscribe((user) => {
//       this.isAuthenticated = !!user;
//       console.log(user);
//       if (user && user.uid) {
//         this.recruiterId = user.uid;
//         console.log(this.recruiterId);
//       }

//       if (!this.isAuthenticated) {
//         this.errorMessage = 'Debes iniciar sesión para acceder a los trabajos';
//         this.jobs$ = of([]);
//         return;
//       }

//       this.jobs$ = this.jobCrudService.getJobs(this.recruiterId).pipe(
//         // <-- Usa el servicio para obtener trabajos
//         catchError((error) => {
//           console.error('Error al cargar trabajos:', error);
//           this.errorMessage =
//             'Error al cargar trabajos: permisos insuficientes';
//           return of([]);
//         })
//       );

//       console.log(this.jobs$);

//       console.log(this.recruiterId);

//       this.exams$ = this.examCrudService.getExamsByRecruiterId(this.recruiterId);
//       console.log(this.exams$);
//     });
//   }

//   // --- Funciones CRUD ---

//   loadJob(event: Event) {
//     const selectElement = event.target as HTMLSelectElement;
//     const jobId = selectElement.value;
//     this.selectedJobId = jobId;

//     if (jobId) {
//       this.jobCrudService.getJobById(jobId).subscribe({
//         // <-- Usa el servicio para cargar un trabajo
//         next: (job) => {
//           if (job) {
//             this.newJob = {
//               name: job.name,
//               description: job.description,
//               ownerId: this.recruiterId
//             };
//             this.editingJobId = jobId;
//             this.errorMessage = '';
//           } else {
//             this.errorMessage = 'Trabajo no encontrado';
//             this.resetForm();
//           }
//         },
//         error: (error) => {
//           console.error('Error al cargar el trabajo:', error);
//           this.errorMessage =
//             'Error al cargar el trabajo: permisos insuficientes';
//           this.resetForm();
//         },
//       });
//     } else {
//       this.resetForm();
//     }
//   }



//   saveJob() {
//     if (!this.isAuthenticated) {
//       this.errorMessage = 'Debes iniciar sesión para realizar esta acción';
//       return;
//     }

//     if (!this.newJob.name?.trim()) {
//       this.errorMessage = 'El nombre es requerido';
//       return;
//     }
//     if (!this.newJob.description?.trim()) {
//       this.errorMessage = 'La descripción es requerida';
//       return;
//     }

//     this.jobCrudService.checkJobNameExists(this.newJob.name, this.editingJobId).subscribe({
//       next: (exists) => {
//         if (exists) {
//           this.errorMessage = 'Ya existe un trabajo con este nombre';
//           return;
//         }

//         const jobData: Partial<Job> = {
//           name: this.newJob.name!.trim(),
//           description: this.newJob.description!.trim()
//         };

//         if (this.editingJobId) {
//           // Si estamos editando, verifica que el usuario actual sea el propietario
//           if (this.newJob.ownerId !== this.recruiterId) {
//             this.errorMessage = 'No tienes permisos para editar este trabajo.';
//             return;
//           }
//           this.jobCrudService.updateJob(this.editingJobId, jobData).subscribe({
//             next: (success) => {
//               if (success) {
//                 this.resetForm();
//               } else {
//                 this.errorMessage = 'Error al actualizar el trabajo';
//               }
//             },
//             error: (error) => {
//               console.error('Error al actualizar el trabajo:', error);
//               this.errorMessage = 'Error al actualizar el trabajo: permisos insuficientes';
//             }
//           });
//         } else {
//           // Al crear, asigna el ownerId del usuario actual
//           jobData.ownerId = this.recruiterId;
//           this.jobCrudService.createJob(jobData).subscribe({
//             next: (id) => {
//               if (id) {
//                 this.resetForm();
//               } else {
//                 this.errorMessage = 'Error al crear el trabajo';
//               }
//             },
//             error: (error) => {
//               console.error('Error al crear el trabajo:', error);
//               this.errorMessage = 'Error al crear el trabajo: permisos insuficientes';
//             }
//           });
//         }
//       },
//       error: (error) => {
//         console.error('Error al verificar el nombre:', error);
//         this.errorMessage = 'Error al verificar el nombre del trabajo';
//       }
//     });
//   }

//   deleteJob() {
//     if (!this.isAuthenticated) {
//       this.errorMessage = 'Debes iniciar sesión para realizar esta acción';
//       return;
//     }

//     if (this.editingJobId) {
//       // Verifica que el usuario actual sea el propietario antes de intentar eliminar
//       if (this.newJob.ownerId !== this.recruiterId) {
//         this.errorMessage = 'No tienes permisos para eliminar este trabajo.';
//         return;
//       }

//       const confirmDelete = confirm('¿Estás seguro de que quieres eliminar este trabajo?');
//       if (confirmDelete) {
//         this.jobCrudService.deleteJob(this.editingJobId).subscribe({
//           next: (success) => {
//             if (success) {
//               this.resetForm();
//             } else {
//               this.errorMessage = 'Error al eliminar el trabajo';
//             }
//           },
//           error: (error) => {
//             console.error('Error al eliminar el trabajo:', error);
//             this.errorMessage = 'Error al eliminar el trabajo: permisos insuficientes';
//           }
//         });
//       }
//     }
//   }

//   // --- Funciones Auxiliares ---

//   resetForm() {
//     this.newJob = {
//       name: '',
//       description: '',
//       ownerId: '' // Limpia el ownerId al resetear
//     };
//     this.editingJobId = undefined;
//     this.selectedJobId = '';
//     this.errorMessage = '';
//   }

//   // Helper para deshabilitar botones si el usuario no es el propietario
//   isOwner(): boolean {
//     return this.isAuthenticated && this.recruiterId === this.newJob.ownerId;
//   }
// }
