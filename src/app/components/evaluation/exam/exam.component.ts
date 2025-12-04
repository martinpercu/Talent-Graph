import { Component, OnInit, OnDestroy, inject } from '@angular/core';
import { CommonModule } from '@angular/common';
import { ActivatedRoute, Router } from '@angular/router';
import { Exam, Question, Option } from '@models/exam';
import { QuestionAndAnswer, Result } from '@models/result';
import { ExamService } from '@services/exam.service';
import { ResultService } from '@services/result.service';
import { AuthService } from '@services/auth.service';
import { MatIconModule } from '@angular/material/icon';
import { take } from 'rxjs/operators'; // Asegúrate de importar esto



@Component({
  selector: 'app-exam',
  imports: [CommonModule, MatIconModule],
  templateUrl: './exam.component.html',
  styleUrl: './exam.component.css'
})
export class ExamComponent implements OnInit, OnDestroy {
  authService = inject(AuthService);
  examService = inject(ExamService);
  route = inject(ActivatedRoute);
  resultService = inject(ResultService);
  router = inject(Router);

  exam: Exam | null = null;
  preparedQuestions: { question: Question, options: Option[] }[] = [];
  userAnswers: { [questionIndex: number]: string } = {};
  questions_limit = 20;
  false_options_count = 5;
  isOkToDoTheExam: boolean = false;
  timeRemaining: number = 0; // Para el tiempo de espera entre intentos
  showReloadButton: boolean = false;
  private timerId: any; // Para el tiempo de espera entre intentos

  lastExamPassed!: boolean;
  lastSubmittedResult!: Result;


  // --- NEW/MODIFIED STATE FOR UX REFACTOR ---
  currentQuestionIndex: number = 0;
  examViewMode: 'loading' | 'taking_question' | 'summary' | 'results' | 'editing_question_from_summary' | 'introInfoExam' = 'introInfoExam'; // To handle different views

  // For the exam timer (timeToDoTheExam)
  examTotalDurationMinutes: number = 0; // To store exam.timeToDoTheExam
  examTimeRemainingSeconds: number = 0;
  private examTimerId: any;
  isExamTimeCritical: boolean = false; // For styling the timer when time is low

  // To manage button states more easily (optional, but can be helpful)
  footerButtonText: string = '';
  footerButtonAction: (() => void) | null = null;
  isFooterButtonDisabled: boolean = false;
  // --- END OF NEW/MODIFIED STATE ---

  private currentResultId: string | null = null; // Para guardar el ID del resultado en progreso
  momentStartExam!: string; // Ya la tienes
  // doingTheExamNow: boolean = false; // Esta la manejará el documento en Firestore
  private isExamPrepared: boolean = false; // Nueva propiedad

  // examId!: string;

  // --- NUEVO PARA REANUDACIÓN ---
  private isResumingExam: boolean = false;
  private resultToResume: Result | null = null;
  // --- FIN NUEVO PARA REANUDACIÓN ---




  ngOnInit(): void {
    const examId = this.route.snapshot.paramMap.get('id');
    // this.examViewMode = 'loading'; // Initial state
    this.examViewMode = 'introInfoExam'; // Initial state
    console.log(this.examViewMode);
    if (examId) {
      // this.examId = examId
      this.loadExam(examId); // loadExam llamará a checkIfCanTakeExam indirectamente o directamente según el flujo.
    }
  }

  changeViewTo(value: 'loading' | 'taking_question' | 'summary' | 'results' | 'editing_question_from_summary' | 'introInfoExam') {
    this.examViewMode = value
    console.log(this.examViewMode);
  }


  loadExam(examId: string): void {
    this.examService.getExamById(examId).subscribe({
      next: (exam) => {
        if (exam) {
          this.exam = exam;
          console.log('Examen cargado:', this.exam);

          this.examTotalDurationMinutes = this.exam.timeToDoTheExam || 0; // Ensure it's set
          // Reset userAnswers for a fresh attempt if logic requires, or load from elsewhere if resuming
          this.userAnswers = {}; // Reset para un nuevo intento o se cargará en reanudación
          // No llamamos a checkIfCanTakeExam aquí directamente.
          // Se llamará cuando el usuario intente iniciar el examen desde la intro.
          // O si quieres verificarlo al cargar, puedes hacerlo, pero startExam() es un buen punto.
          // // this.checkIfCanTakeExam(examId); // This will eventually set examViewMode and call prepareExam
        } else {
          // ... existing error handling ...
          console.error('Examen no encontrado');
          alert('Examen no encontrado');
          // this.examViewMode = 'loading'; // Or some error state
          this.examViewMode = 'introInfoExam'; // Or some error state
          console.log(this.examViewMode);
        }
      },
      error: (err) => {
        console.error('Error al cargar el examen:', err);
        alert('Error al cargar el examen.');
        this.examViewMode = 'introInfoExam';
        console.log(this.examViewMode);
      }
    });
  }


  // --- START intro page ---

  async startExam() { // Convertido a async para esperar la creación/actualización inicial si es necesario
    if (!this.exam) {
      alert('El examen no se ha cargado correctamente.');
      return;
    }


    // Primero, verificar si se puede tomar/reanudar el examen.
    // checkIfCanTakeExam ahora seteará this.isResumingExam y this.isOkToDoTheExam
    await this.checkIfCanTakeExam(this.exam.id);

    if (!this.isOkToDoTheExam) {
      // checkIfCanTakeExam ya habrá mostrado alertas o iniciado el temporizador de espera.
      console.log('No se puede iniciar el examen según las condiciones.');
      return;
    }

    console.log('en startExam(), isResumingExam:', this.isResumingExam);

    if (this.isResumingExam && this.resultToResume) {
      // La configuración para reanudar ya se hizo en checkIfCanTakeExam
      // El currentResultId ya está seteado desde la carga del resultToResume.
      console.log('Resuming exam with result ID:', this.currentResultId);
      // examTimeRemainingSeconds ya fue calculado en checkIfCanTakeExam
    } else {
      // Es un nuevo intento (no reanudación)
      if (this.isExamPrepared) { // Si por alguna razón ya estaba preparado pero no es reanudación (raro)
         console.warn('The exam was marked as prepared, but it\'s not a resume scenario. Restarting preparation.');
         this.isExamPrepared = false; // Forzar repreparación
      }
      this.prepareExam(); // Prepara preguntas y crea la entrada inicial del resultado.

      if (!this.currentResultId) {
        alert('Critical error: Failed to create initial entry for the exam. Try reloading.');
        return;
      }
      // Marcamos explícitamente que se está haciendo ahora, por si createInitialResultEntry lo puso en false.
      // Aunque idealmente createInitialResultEntry ya lo pondría en true.
      try {
        await this.resultService.updateExistingResult(this.currentResultId, {
          doingTheExamNow: true,
          time: new Date().toUTCString() // Actualizar el tiempo al momento exacto de empezar
        });
        console.log('Resultado marcado como "doingTheExamNow: true" para el nuevo intento.');
      } catch (error) {
        console.error("Error al marcar el examen como 'doingTheExamNow':", error);
        alert("Error al iniciar el guardado del examen. Intenta de nuevo.");
        return;
      }
      this.examTimeRemainingSeconds = this.examTotalDurationMinutes * 60; // Tiempo completo para nuevo examen
    }

    if (this.examTimeRemainingSeconds <= 0 && this.examTotalDurationMinutes > 0) {
        console.log('El tiempo para este intento de examen ya ha expirado.');
        alert('¡Tiempo terminado! El examen se enviará automáticamente.');
        this.submitExam(); // Esto enviará el examen (posiblemente vacío si es nuevo y expiró instantáneamente)
        return;
    }

    this.startExamTimer();
    this.examViewMode = 'taking_question';
    console.log(this.examViewMode);
    this.updateFooterButtonState();

    // if(this.exam){
    //   this.checkIfCanTakeExam(this.exam.id)
    //   console.log('after checkIfCanTake Exam in if startExam()');
    // }
    // if (!this.currentResultId && this.isOkToDoTheExam) {
    //   // Si por alguna razón createInitialResultEntry no se llamó o falló
    //   // y el examen está a punto de empezar, es un problema.
    //   // Podrías intentar llamarlo aquí de nuevo o manejar el error.
    //   // Por ahora, asumimos que currentResultId ya está seteado desde prepareExam/createInitialResultEntry.
    //   console.warn('Intentando iniciar examen sin un ID de resultado en progreso.');
    //   // alert('No se pudo inicializar el guardado del examen. Intenta recargar.');
    //   // return; // Podrías detener el inicio del examen aquí.
    // }
    // console.log('en startExam() ');
    // console.log(this.exam);

    // this.startExamTimer();
    // this.examViewMode = 'taking_question';
    // // this.examViewMode = 'introInfoExam'; // Or some error state
    // this.updateFooterButtonState(); // Llama a updateResult si es necesario
  }

  // --- END intro page ---

  // Convertir a async para poder usar await dentro para la lógica de reanudación
  async checkIfCanTakeExam(examId: string): Promise<void> {
    console.log('checkIfCanTakeExam llamado con examId:', examId);
    this.isOkToDoTheExam = false; // Resetear estado
    this.isResumingExam = false;
    this.resultToResume = null;

    const currentUser = this.authService.currentUserSig();
    if (!currentUser) {
      alert('To take the exam requires you to be logged in.');
      this.router.navigate([`/teacher/${examId}`])
      return;
    }

    try {
      const lastResult = await new Promise<Result | null>((resolve, reject) => {
        this.resultService.getLastResultByUserAndExam(currentUser.userUID, examId)
          .pipe(take(1))
          .subscribe({
            next: resolve,
            error: reject
          });
      });

      console.log('Last result obtained:', lastResult);

      if (!lastResult) {
        this.isOkToDoTheExam = true;
        // No llamamos a prepareExam() aquí directamente, se llamará desde startExam() si es un nuevo intento.
        return;
      }

      if(lastResult.id){
        this.currentResultId = lastResult.id; // Guardamos el ID por si lo necesitamos
      }

      if (lastResult.examPassed === true) {
        alert('You \'ve already passed this exam.');
        this.router.navigate(['/']);
        return;
      }

      if (lastResult.doingTheExamNow === true) {
        console.log('An exam in progress was found (doingTheExamNow: true).');
        this.isResumingExam = true;
        this.resultToResume = lastResult;
        this.momentStartExam = lastResult.momentStartExam; // Crucial para calcular tiempo restante

        if (!this.exam) { // Asegurarse que this.exam esté cargado
            console.error("El objeto examen (this.exam) no está cargado. No se puede reanudar.");
            alert("Error loading exam data to resume. Try reloading.");
            return;
        }

        // Calcular tiempo restante para el examen en curso
        const startTime = new Date(lastResult.momentStartExam).getTime();
        const now = new Date().getTime();
        const elapsedSeconds = Math.floor((now - startTime) / 1000);
        const totalDurationSeconds = this.exam.timeToDoTheExam * 60;

        if (totalDurationSeconds - elapsedSeconds <= 0 && totalDurationSeconds > 0) {
          console.log('The time for this exam attempt has expired.');
          alert('The time for this exam attempt has expired. It will be submitted as is.');
          // this.isOkToDoTheExam = false; // No puede continuar
          // Llamar a submitExam() usando los datos de lastResult
          await this.submitExam(true); // true indica que es un submit por expiración de reanudación
          return;
        }

        this.examTimeRemainingSeconds = totalDurationSeconds - elapsedSeconds;

        // Cargar el estado del examen desde resultToResume
        // Las preguntas y opciones ya están como se le mostraron al usuario
        this.preparedQuestions = this.resultToResume.questions.map(q_a => {
            // Necesitamos encontrar la Question original para tener el objeto Question completo,
            // no solo el texto. Asumimos que this.exam.questions está disponible.
            const originalQuestionData = this.exam?.questions.find(q => q.text === q_a.question);
            return {
                question: originalQuestionData || { id: '', text: q_a.question, options: q_a.options.map(opt => ({text: opt.text, isCorrect: opt.isCorrect})) }, // Fallback si no se encuentra
                options: q_a.options // Estas son las opciones que el usuario vio
            };
        });

        this.userAnswers = {};
        this.resultToResume.questions.forEach((q_a, index) => {
          if (q_a.answer) {
            this.userAnswers[index] = q_a.answer;
          }
        });

        // Determinar currentQuestionIndex (ej: la primera no respondida, o 0)
        let firstUnanswered = -1;
        for(let i=0; i < this.preparedQuestions.length; i++) {
            if(!this.userAnswers[i]) {
                firstUnanswered = i;
                break;
            }
        }
        this.currentQuestionIndex = firstUnanswered !== -1 ? firstUnanswered : (this.preparedQuestions.length > 0 ? this.preparedQuestions.length -1 : 0) ;


        this.isExamPrepared = true; // El examen está "preparado" porque hemos cargado su estado.
        this.isOkToDoTheExam = true; // Sí puede tomar el examen (continuarlo).
        console.log('Resume state loaded. Questions:', this.preparedQuestions.length, 'Answers:', Object.keys(this.userAnswers).length);
        return;
      }

      // Si no está `doingTheExamNow`, verificar el tiempo de espera
      const lastAttemptTime = new Date(lastResult.time);
      const now = new Date();
      const diffMinutes = (now.getTime() - lastAttemptTime.getTime()) / (1000 * 60);

      console.log('Checking time to wait.');

      if (diffMinutes >= this.exam!.timeToWait) {
        this.isOkToDoTheExam = true;
        // No se llama prepareExam aquí. startExam() lo hará.
      } else {
        this.isOkToDoTheExam = false;
        this.timeRemaining = this.exam!.timeToWait - diffMinutes;
        this.startWaitTimer(); // Renombrado para claridad
        alert(`You must wait ${Math.ceil(this.timeRemaining)} minutes before trying again.`);
      }

    } catch (error) {
      console.error('Error to verify last error:', error);
      alert('Failed to verify if you can take the exam. Please try reloading.');
      this.isOkToDoTheExam = false;
    }


    // this.resultService.getLastResultByUserAndExam(currentUser.userUID, examId)
    //   .pipe(take(1)) // Solo toma la primera emisión y completa la suscripción
    //   .subscribe({
    //     next: (lastResult) => {
    //       console.log('Último resultado obtenido:', lastResult);
    //       if (!lastResult) {
    //         this.isOkToDoTheExam = true;
    //         this.prepareExam();
    //         return;
    //       }
    //       console.log(lastResult);


    //       if (lastResult.examPassed == true) {
    //         alert('You alredy passed the exam');
    //         this.router.navigate(['/']);
    //         return
    //       }

    //       if (lastResult.doingTheExamNow === true) {
    //         console.log('Doing the Exam now TRUE');
    //         this.isExamPrepared = true
    //         this.prepareExam();
    //         return;
    //       }
    //       const lastAttemptTime = new Date(lastResult.time);
    //       const now = new Date();
    //       const diffMinutes = (now.getTime() - lastAttemptTime.getTime()) / (1000 * 60);

    //       console.log('Si doing the exam now es FALSE llegamos acá');

    //       if (diffMinutes >= this.exam!.timeToWait) {
    //         this.isOkToDoTheExam = true;
    //         this.prepareExam();
    //       } else {
    //         this.isOkToDoTheExam = false;
    //         this.timeRemaining = this.exam!.timeToWait - diffMinutes;
    //         this.startTimer();
    //       }
    //     },
    //     error: (error) => {
    //       console.error('Error al verificar el último resultado:', error);
    //       alert('Error al verificar si puedes tomar el examen');
    //     }
    //   });
    // // // If this.isOkToDoTheExam becomes true:
    // // this.prepareExam(); // This will be called
    // // this.examViewMode = 'taking_question'; // Set after preparation
    // // this.startExamTimer(); // Start the main exam timer
    // // this.updateFooterButtonState(); // Initialize button

    // // // If not ok to do exam (e.g., waiting period):
    // // this.examViewMode = 'loading'; // Or a specific 'waiting' view if you create one
    // // this.startTimer(); // This is the existing timer for timeToWait

  }

  // startTimer(): void {
  //   this.timerId = setInterval(() => {
  //     this.timeRemaining -= 1 / 60; // Decrementa cada segundo (1/60 minutos)
  //     if (this.timeRemaining <= 0) {
  //       clearInterval(this.timerId);
  //       this.showReloadButton = true;
  //     }
  //   }, 1000);
  // }

  startWaitTimer(): void { // Renombrado de startTimer a startWaitTimer
    if (this.timerId) clearInterval(this.timerId); // Limpiar timer anterior si existe
    this.showReloadButton = false;
    this.timerId = setInterval(() => {
      this.timeRemaining -= 1 / 60;
      if (this.timeRemaining <= 0) {
        clearInterval(this.timerId);
        this.timeRemaining = 0;
        this.showReloadButton = true;
        alert('You can now retake the exam. Reload the page or click the button.');
      }
    }, 1000);
  }

  prepareExam(): void {
    if (this.isExamPrepared) { // Si ya está preparado (ej. en reanudación), no hacer nada.
      console.log('Exam already prepared, avoiding duplication');
      return;
    }
    console.log('prepareExam == Call for a new attempt.');
    if (!this.exam || !this.exam.questions) {
        console.error("prepareExam: Exam or questions not available.");
        return;
    }

    // this.isExamPrepared = true; // Marcamos como preparado

    // Shuffle y selección de preguntas
    const shuffledQuestions = this.shuffleArray([...this.exam.questions]);
    const selectedQuestions = shuffledQuestions.slice(0, Math.min(this.questions_limit, this.exam.questions.length));

    this.preparedQuestions = selectedQuestions.map(question => {
      const correctOption = question.options.find(opt => opt.isCorrect)!;
      const falseOptions = this.shuffleArray(question.options.filter(opt => !opt.isCorrect))
        .slice(0, this.false_options_count);
      const options = this.shuffleArray([correctOption, ...falseOptions]);
      return { question, options };
    });

    this.currentQuestionIndex = 0; // Start with the first question
    this.userAnswers = {}; // Limpiar respuestas para el nuevo intento

    // this.examViewMode = 'taking_question';
    // this.examViewMode = 'introInfoExam'; // Or some error state
    // this.startExamTimer();
    // this.updateFooterButtonState();
    const nowStartExam = new Date()
    this.momentStartExam = nowStartExam.toUTCString();

    // Crear la entrada inicial del resultado.
    // createInitialResultEntry es async, pero prepareExam no lo es.
    // Esto puede ser un problema si necesitamos el ID inmediatamente.
    // Hacemos que prepareExam no llame directamente a createInitialResultEntry.
    // startExam se encargará de llamar a createInitialResultEntry.
    this.createInitialResultEntry(); // Esta función ahora es síncrona o maneja su propia asincronía para setear currentResultId
                                    // Idealmente, createInitialResultEntry debería ser llamada con await en un método async.
                                    // Por ahora, dejaremos que setee this.currentResultId de forma asíncrona.
                                    // startExam() necesitará verificar que this.currentResultId esté seteado.

    this.isExamPrepared = true; // Marcamos como preparado DESPUÉS de la lógica.
    console.log('Examen preparado con nuevas preguntas.');
  }

  // Modificar createInitialResultEntry para que sea llamada por startExam y sea async
  // Esta función ahora debería ser llamada con await desde startExam
  async createInitialResultEntry(): Promise<void> {
    console.log('createInitialResultEntry llamado');
    const currentUser = this.authService.currentUserSig();
    if (!this.exam || !currentUser) {
      console.error("Examen o usuario no disponible para el guardado inicial.");
      // alert("Falta información del examen o usuario para iniciar."); // Podría ser útil
      throw new Error("Examen o usuario no disponible para el guardado inicial."); // Lanzar error para que startExam lo maneje
    }

    const initialQuestionsAndAnswers: QuestionAndAnswer[] = this.preparedQuestions.map(pq => ({
      question: pq.question.text,
      options: pq.options, // Guardamos las opciones que se le mostrarán
      answer: '', // Respuesta vacía inicialmente
      correct: false // No evaluada inicialmente
    }));

    const initialResult: Omit<Result, 'id'> = {
      userUID: currentUser.userUID,
      examId: this.exam.id,
      examTitle: this.exam.title,
      teacherId: this.exam.teacherId,
      momentStartExam: this.momentStartExam,
      time: this.momentStartExam, // 'time' podría ser la hora de inicio o la última actualización
      doingTheExamNow: true, // **IMPORTANTE: Marcar como true desde el inicio del intento**
      totalQuestions: this.preparedQuestions.length,
      questions: initialQuestionsAndAnswers,
      difficulty: this.false_options_count,
      questions_answered: 0,
      correctAnswers: 0,
      examPassed: null // Aún no se sabe
    };

    try {
      this.currentResultId = await this.resultService.createInitialResult(initialResult);
      console.log('Resultado inicial en progreso guardado con ID:', this.currentResultId);
    } catch (error) {
      console.error('Error al guardar el resultado inicial en progreso:', error);
      this.currentResultId = null; // Asegurar que no quede un ID inválido
      throw error; // Re-lanzar para que startExam lo maneje
    }
  }

  shuffleArray<T>(array: T[]): T[] {
    for (let i = array.length - 1; i > 0; i--) {
      const j = Math.floor(Math.random() * (i + 1));
      [array[i], array[j]] = [array[j], array[i]];
    }
    return array;
  }

  // Another  --- NEW TIMER FOR timeToDoTheExam ---
  startExamTimer(): void {
    if (this.examTimerId) clearInterval(this.examTimerId); // Limpiar timer anterior

    // examTimeRemainingSeconds ya debe estar seteado correctamente por startExam()
    // tanto para exámenes nuevos como para reanudados.
    if (this.examTimeRemainingSeconds <= 0 && this.examTotalDurationMinutes > 0) {
        // Si el tiempo ya es cero o menos (y el examen tiene duración)
        console.log('startExamTimer: Tiempo ya expirado, enviando examen.');
        this.submitExam(this.isResumingExam); // Pasar bandera si es relevante para submitExam
        return;
    }
    if (this.examTotalDurationMinutes <=0) { // Si el examen no tiene límite de tiempo
        console.log('Examen sin límite de tiempo.')
        return;
    }


    this.isExamTimeCritical = false; // Resetear

    console.log(`Iniciando temporizador del examen. Tiempo total asignado en segundos: ${this.examTotalDurationMinutes * 60}, Tiempo restante actual: ${this.examTimeRemainingSeconds}`);

    this.examTimerId = setInterval(() => {
      this.examTimeRemainingSeconds--;

      const criticalThreshold = Math.min(5 * 60, this.examTotalDurationMinutes * 60 * 0.10); // 10% o 5 minutos

      if (this.examTimeRemainingSeconds <= criticalThreshold && !this.isExamTimeCritical) {
        this.isExamTimeCritical = true;
      }

      if (this.examTimeRemainingSeconds <= 0) {
        clearInterval(this.examTimerId);
        this.examTimeRemainingSeconds = 0;
        this.isExamTimeCritical = false;
        alert('¡Tiempo terminado! El examen se enviará automáticamente.');
        this.submitExam(this.isResumingExam); // Pasar la bandera por si submit necesita diferenciar
      }
    }, 1000);
  }

  formatTimeRemaining(): string {
    if (this.examTimeRemainingSeconds < 0) this.examTimeRemainingSeconds = 0; // Asegurar que no sea negativo
    const minutes = Math.floor(this.examTimeRemainingSeconds / 60);
    const seconds = Math.floor(this.examTimeRemainingSeconds % 60);
    return `${minutes.toString().padStart(1, '0')}:${seconds.toString().padStart(2, '0')}`;
  }
  // --- END OF Another NEW TIMER ---


  // // --- NEW TIMER FOR timeToDoTheExam ---
  // startExamTimer(): void {
  //   if (this.examTotalDurationMinutes <= 0) return; // No timer if duration is 0 or not set

  //   this.examTimeRemainingSeconds = this.examTotalDurationMinutes * 60;
  //   this.isExamTimeCritical = false;

  //   if (this.examTimerId) {
  //     clearInterval(this.examTimerId);
  //   }

  //   this.examTimerId = setInterval(() => {
  //     this.examTimeRemainingSeconds--;

  //     // Check for critical time (e.g., last 5 minutes, or 50% of total time)
  //     const criticalThreshold = Math.min(5 * 60, this.examTotalDurationMinutes * 60 * 0.5,); // e.g. 50% or 5 mins
  //     // const criticalThreshold = 117

  //     if (this.examTimeRemainingSeconds <= criticalThreshold && !this.isExamTimeCritical) {
  //       this.isExamTimeCritical = true;
  //     }

  //     if (this.examTimeRemainingSeconds <= 0) {
  //       clearInterval(this.examTimerId);
  //       this.examTimeRemainingSeconds = 0;
  //       this.isExamTimeCritical = false;
  //       // this.examViewMode = 'results';
  //       // alert('¡Tiempo terminado! El examen se enviará automáticamente.'); // Optional alert
  //       this.submitExam();
  //     }
  //   }, 1000);
  // }

  // formatTimeRemaining(): string {
  //   if (this.examTimeRemainingSeconds <= 0) return '0:00';
  //   const minutes = Math.floor(this.examTimeRemainingSeconds / 60); // Truncar a la parte entera
  //   const seconds = Math.floor(this.examTimeRemainingSeconds % 60); // Truncar segundos si es necesario
  //   return `${minutes.toString().padStart(1, '0')}:${seconds.toString().padStart(2, '0')}`;
  // }
  //  // --- END OF NEW TIMER ---



  // selectAnswer(questionIndex: number, answer: string): void {
  //   this.userAnswers[questionIndex] = answer;
  // }
  selectAnswer(questionIndex: number, answerText: string): void {
    // Ensure we are setting the answer for the currently viewed question
    if (questionIndex !== this.currentQuestionIndex) {
      console.warn('Attempting to set answer for a non-current question.');
      return;
    }
    this.userAnswers[this.currentQuestionIndex] = answerText;
    this.updateFooterButtonState(); // Esto llamará a updateCurrentResultInDB // Update button text/action
  }


  // --- NAVIGATION AND BUTTON LOGIC ---
  updateFooterButtonState(): void {
    // const currentQ = this.preparedQuestions[this.currentQuestionIndex];
    const isCurrentQuestionAnswered = !!this.userAnswers[this.currentQuestionIndex];
    const allQuestionsAnswered = this.areAllQuestionsAnswered();

    if (this.examViewMode === 'taking_question') {
      if (allQuestionsAnswered) {
        this.footerButtonText = 'Show Questions Answered';
        this.footerButtonAction = this.goToSummary;
        this.isFooterButtonDisabled = false;
      } else {
        // Check if this is the last unanswered question
        if (!isCurrentQuestionAnswered && this.isThisTheOnlyUnansweredQuestion()) {
          this.footerButtonText = 'This is the last Question';
          this.footerButtonAction = () => { }; // No action
          // this.isFooterButtonDisabled = true; // Or style differently
          this.isFooterButtonDisabled = !isCurrentQuestionAnswered; // Deshabilitado si no está respondida
          // this.updateResult()
          this.updateCurrentResultInDB(); // Llamada aquí
        } else if (isCurrentQuestionAnswered) {
          this.footerButtonText = 'Next Question';
          this.footerButtonAction = this.goToNextUnansweredOrSummary;
          this.isFooterButtonDisabled = false;
          // this.updateResult()
          this.updateCurrentResultInDB(); // Llamada aquí
        } else {
          this.footerButtonText = 'Skip question';
          this.footerButtonAction = this.goToNextUnansweredOrSummary;
          this.isFooterButtonDisabled = false;
        }
      }
      // En cualquier caso, si estamos en "taking_question", actualizamos DB si hay un ID
      if (this.currentResultId) this.updateCurrentResultInDB();

    } else if (this.examViewMode === 'summary') {
      this.footerButtonText = 'Send Exam';
      this.footerButtonAction = () => this.submitExam(); // Llama a submitExam sin argumentos
      this.isFooterButtonDisabled = false;
      // this.updateCurrentResultInDB(); // Llamada aquí
      if (this.currentResultId) this.updateCurrentResultInDB(); // Guardar estado actual antes de posible envío
    } else if (this.examViewMode === 'editing_question_from_summary') { // New mode for clarity
      this.footerButtonText = 'Return to Questions Answered';
      this.footerButtonAction = this.goToSummary;
      // this.isFooterButtonDisabled = false;
      this.isFooterButtonDisabled = !isCurrentQuestionAnswered; // Solo puede volver si respondió o la deja como estaba
      if (this.currentResultId && isCurrentQuestionAnswered) this.updateCurrentResultInDB(); // Guardar si cambió la respuesta
      // this.updateCurrentResultInDB(); // Llamada aquí
    } else {
      this.footerButtonText = '';
      this.footerButtonAction = null;
      this.isFooterButtonDisabled = true;
    }
  }

  // updateResult() {
  //   if (this.examViewMode === 'taking_question') {
  //     console.log('UPDATING RESULTS');
  //   }
  // }

  async updateCurrentResultInDB(): Promise<void> {
    if (!this.currentResultId || !this.exam) {
      console.warn('updateCurrentResultInDB: No hay ID de resultado actual o examen no cargado.');
      return;
    }

    console.log('UPDATING RESULTS en DB para el ID:', this.currentResultId);
    console.log(this.exam);


    const questionsAndAnswers: QuestionAndAnswer[] = this.preparedQuestions.map((pq, index) => {
      const userAnswer = this.userAnswers[index] || '';
      // La propiedad 'correct' podría recalcularse aquí o solo al final.
      // Por simplicidad, la recalculamos aquí, pero para performance podrías omitirla
      // en actualizaciones intermedias si solo importa al final.
      const correctOption = pq.options.find(opt => opt.isCorrect)!;
      return {
        question: pq.question.text,
        options: pq.options,
        answer: userAnswer,
        correct: userAnswer === correctOption.text
      };
    });

    const questionsAnswered = Object.keys(this.userAnswers).length;
    const correctAnswers = questionsAndAnswers.filter(q => q.correct).length; // Recalcular

    const updates: Partial<Result> = {
      questions: questionsAndAnswers,
      questions_answered: questionsAnswered,
      correctAnswers: correctAnswers, // Actualizar respuestas correctas parciales
      time: new Date().toUTCString(), // Actualizar el timestamp de la última modificación
      doingTheExamNow: true // Sigue en progreso
    };

    try {
      await this.resultService.updateExistingResult(this.currentResultId, updates);
      console.log('Resultado en progreso actualizado en DB.');
    } catch (error) {
      console.error('Error al actualizar el resultado en progreso en DB:', error);
    }
  }

  areAllQuestionsAnswered(): boolean {
    if (this.preparedQuestions.length === 0) return true; // Si no hay preguntas, todas están "respondidas"
    return this.preparedQuestions.length === Object.values(this.userAnswers).filter(ans => ans !== '').length;
  // return this.preparedQuestions.length === Object.keys(this.userAnswers).length;
  }

  isThisTheOnlyUnansweredQuestion(): boolean {
    let unansweredCount = 0;
    for (let i = 0; i < this.preparedQuestions.length; i++) {
      if (!this.userAnswers[i]) {
        unansweredCount++;
      }
    }
    return unansweredCount === 1 && !this.userAnswers[this.currentQuestionIndex];
  }

  goToNextUnansweredOrSummary(): void {
    if (this.areAllQuestionsAnswered()) {
      this.goToSummary();
      return;
    }

    let nextIndex = -1;
    // Start searching from the question after the current one
    for (let i = 1; i < this.preparedQuestions.length; i++) {
      const potentialNextIndex = (this.currentQuestionIndex + i) % this.preparedQuestions.length;
      if (!this.userAnswers[potentialNextIndex]) {
        nextIndex = potentialNextIndex;
        break;
      }
    }

    if (nextIndex !== -1) {
      this.currentQuestionIndex = nextIndex;
    } else if (this.areAllQuestionsAnswered()) { // Fallback si todas están respondidas
        this.goToSummary();
    } else {
      // Debería encontrar una no respondida si no todas lo están.
      // Si llega aquí, podría ser un problema lógico o estar en la última sin responder.
      // Forzamos la búsqueda de la primera sin responder desde el inicio.
      const firstEverUnanswered = this.preparedQuestions.findIndex((_,idx) => !this.userAnswers[idx] || this.userAnswers[idx] === '');
      if(firstEverUnanswered !== -1) this.currentQuestionIndex = firstEverUnanswered;
      else this.goToSummary(); // Si realmente todas están respondidas
    }
    // } else {
    //   // This case should ideally be handled by areAllQuestionsAnswered,
    //   // but as a fallback, if no unanswered found (shouldn't happen if not all answered)
    //   // or if the current one is the only one left.
    //   if (this.areAllQuestionsAnswered()) {
    //     this.goToSummary();
    //   } else {
    //     // Stay on current or re-evaluate. This indicates a potential logic flaw
    //     // if this branch is reached without all questions being answered.
    //     console.warn("Could not find next unanswered question, but not all are answered.");
    //   }
    // }
    this.updateFooterButtonState();
  }

  goToSummary = (): void => { // Use arrow function for correct `this`
    this.examViewMode = 'summary';
    console.log(this.examViewMode);
    this.updateFooterButtonState();
  }

  editQuestionFromSummary(questionIndex: number): void {
    this.currentQuestionIndex = questionIndex;
    this.examViewMode = 'editing_question_from_summary'; // Change mode
    console.log(this.examViewMode);
    this.updateFooterButtonState();
  }
  // --- END OF NAVIGATION AND BUTTON LOGIC ---


  // Modificar submitExam para que pueda manejar la finalización de un examen reanudado y expirado
  async submitExam(isResumedAndExpired: boolean = false): Promise<void> {
    if (this.examTimerId) clearInterval(this.examTimerId); // Stop the timer

    if (!this.exam) {
        console.error("submitExam: Examen no cargado.");
        alert("No se puede enviar: el examen no está cargado.");
        return;
    }

    const currentUser = this.authService.currentUserSig();
    if (!currentUser) {
      alert('Submitting the exam requires you to be logged in.');
      // No redirigir si es un envío automático por tiempo.
      if (!isResumedAndExpired) this.router.navigate([`/teacher/${this.exam.id}`]);
      return;
    }

    // Si no hay currentResultId (ej. el usuario nunca empezó o hubo error grave al crear)
    // Y no estamos en un caso de reanudación expirada (donde resultToResume tendría los datos)
    if (!this.currentResultId && !this.resultToResume) {
        console.error("submitExam: No hay un ID de resultado actual para finalizar.");
        alert("Error: No se encontró un intento de examen para finalizar.");
        this.examViewMode = 'introInfoExam'; // Volver a la intro
        console.log(this.examViewMode);
        return;
    }

    let finalResultData: Result;

    if (isResumedAndExpired && this.resultToResume) {
        console.log("Procesando envío de examen reanudado y expirado.");
        // Usar los datos de this.resultToResume, marcándolo como no pasado si no se completó
        // y actualizando 'doingTheExamNow' a false.
        // Las respuestas y preguntas ya están en resultToResume.
        const questionsFromResumed = this.resultToResume.questions;
        const correctAnswers = questionsFromResumed.filter(q => q.correct).length;
        const questionsAnswered = questionsFromResumed.filter(q => q.answer !== '').length;
        const totalQuestions = questionsFromResumed.length;
        // No recalcular porcentaje si el tiempo expiró, a menos que esa sea la regla.
        // Aquí asumimos que se evalúa con lo que haya.
        const percentage = totalQuestions > 0 ? (correctAnswers / totalQuestions) * 100 : 0;
        const examPassed = percentage >= this.exam.passingPercentage;

        finalResultData = {
            ...this.resultToResume, // Copia todos los campos del resultado que se estaba reanudando
            id: this.resultToResume.id, // Asegurar el ID
            time: new Date().toUTCString(), // Hora de finalización (expiración)
            correctAnswers,
            questions_answered: questionsAnswered,
            examPassed,
            doingTheExamNow: false, // CRUCIAL
        };
    } else {
        // Flujo normal de envío (no expirado durante reanudación o es un examen "nuevo" finalizado)
        const questionsAndAnswers: QuestionAndAnswer[] = this.preparedQuestions.map((pq, index) => {
            const userAnswer = this.userAnswers[index] || '';
            const correctOption = pq.options.find(opt => opt.isCorrect);
            return {
            question: pq.question.text,
            options: pq.options,
            answer: userAnswer,
            correct: correctOption ? userAnswer === correctOption.text : false
            };
        });

        const correctAnswers = questionsAndAnswers.filter(q => q.correct).length;
        const questionsAnswered = questionsAndAnswers.filter(q => q.answer !== '').length;
        const totalQuestions = questionsAndAnswers.length;
        const percentage = totalQuestions > 0 ? (correctAnswers / totalQuestions) * 100 : 0;
        const examPassed = percentage >= this.exam.passingPercentage;

        finalResultData = {
            id: this.currentResultId!, // Debe existir si no es reanudado y expirado
            userUID: currentUser.userUID,
            time: new Date().toUTCString(),
            totalQuestions,
            correctAnswers,
            examTitle: this.exam.title,
            examId: this.exam.id,
            teacherId: this.exam.teacherId,
            questions: questionsAndAnswers,
            difficulty: this.false_options_count,
            questions_answered: questionsAnswered,
            examPassed,
            momentStartExam: this.momentStartExam,
            doingTheExamNow: false, // CRUCIAL
        };
    }

    try {
      // saveFinalResult se encarga de actualizar si el ID existe.
      const savedResultId = await this.resultService.saveFinalResult(finalResultData);
      this.lastSubmittedResult = { ...finalResultData, id: savedResultId };
      this.lastExamPassed = finalResultData.examPassed ?? false; // Asumir false si es null
      this.examViewMode = 'results';
      console.log(this.examViewMode);
      this.updateFooterButtonState(); // Actualizar botones para la vista de resultados
      this.currentResultId = null; // Limpiar para el próximo intento
      this.isResumingExam = false; // Resetear estado de reanudación
      this.resultToResume = null;
      this.isExamPrepared = false; // Listo para una nueva preparación si el usuario vuelve
    } catch (err) {
      console.error('Error al guardar el resultado final:', err);
      alert('Error al guardar el resultado del examen.');
      // No cambiar de vista si falla el guardado, para que el usuario pueda reintentar o ver el problema.
    }

    // const questionsAndAnswers: QuestionAndAnswer[] = this.preparedQuestions.map((pq, index) => {
    //   const userAnswer = this.userAnswers[index] || '';
    //   const correctOption = pq.options.find(opt => opt.isCorrect)!;
    //   return {
    //     question: pq.question.text,
    //     options: pq.options,
    //     answer: userAnswer,
    //     correct: userAnswer === correctOption.text
    //   };
    // });
    // const correctAnswers = questionsAndAnswers.filter(q => q.correct).length;
    // const questionsAnswered = questionsAndAnswers.filter(q => q.answer !== '').length;
    // const totalQuestions = questionsAndAnswers.length;
    // const percentage = (correctAnswers / totalQuestions) * 100;
    // const examPassed = percentage >= this.exam.passingPercentage;


    // // Objeto Result final
    // const finalResultData: Result = {
    //   // Si currentResultId existe, lo incluimos para que saveFinalResult sepa qué actualizar
    //   id: this.currentResultId || undefined, // Firestore no guarda 'undefined'
    //   userUID: currentUser.userUID,
    //   time: new Date().toUTCString(), // Hora de finalización
    //   totalQuestions,
    //   correctAnswers,
    //   examTitle: this.exam.title,
    //   examId: this.exam.id,
    //   teacherId: this.exam.teacherId,
    //   questions: questionsAndAnswers,
    //   difficulty: this.false_options_count,
    //   questions_answered: questionsAnswered,
    //   examPassed,
    //   momentStartExam: this.momentStartExam, // El que ya tenías
    //   doingTheExamNow: false // **CRUCIAL: el examen ha terminado**
    // };

    // try {
    //   const savedResultId = await this.resultService.saveFinalResult(finalResultData);

    //   this.lastSubmittedResult = { ...finalResultData, id: savedResultId }; // Asegurar que el ID esté en el objeto local
    //   this.lastExamPassed = examPassed;
    //   this.examViewMode = 'results';
    //   this.updateFooterButtonState();
    //   this.currentResultId = null; // Limpiar el ID para la próxima vez
    // } catch (err) {
    //   console.error('Error al guardar el resultado final:', err);
    //   alert('Error to save result');
    // }

    // // const result: Omit<Result, 'id'> = {
    // //   userUID: currentUser.userUID,
    // //   time: new Date().toUTCString(),
    // //   totalQuestions,
    // //   correctAnswers,
    // //   examTitle: this.exam.title,
    // //   examId: this.exam.id,
    // //   teacherId: this.exam.teacherId,
    // //   questions: questionsAndAnswers,
    // //   difficulty: this.false_options_count,
    // //   questions_answered: questionsAnswered,
    // //   examPassed,
    // //   momentStartExam: this.momentStartExam,
    // //   doingTheExamNow: false
    // // };

    // // this.resultService.saveResult(result).then((resultId) => {
    // //   // if (examPassed) {
    // //   //   const message = `You passed the exam! You answered ${percentage.toFixed(0)}% of the questions correctly.`;
    // //   //   alert(message);
    // //   //   this.router.navigate(['/']);
    // //   // } else {
    // //   //   const message = `Sorry. You failed the exam.\nOnly ${percentage.toFixed(0)}% of your answers were correct.\nYou can try again in ${this.exam?.timeToWait} minutes.`;
    // //   //   alert(message);
    // //   //   this.router.navigate([`/teacher/${result.examId}`]);
    // //   // }

    // //   // Instead of alert and navigate, set data for results view
    // //   this.examViewMode = 'results';
    // //   // You'll need to pass the 'result' and 'examPassed' to the results view
    // //   // For example, by setting them as component properties
    // //   this.lastSubmittedResult = result;
    // //   this.lastExamPassed = examPassed;
    // //   this.updateFooterButtonState(); // Clear footer button for results page or set new one
    // // }).catch(err => {
    // //   console.error('Error to save result:', err);
    // //   alert('Error to save result');
    // // });
  }


  navigateToTeacherPage(): void {
    if (this.exam) {
      this.router.navigate([`/teacher/${this.exam.id}`]); // Or exam.id if that's what you mean
    } else {
      this.router.navigate(['/']); // Fallback
    }
  }

  reloadPage(): void {
    location.reload();
  }

  // Función para redondear al entero superior
  ceilNumber(value: number): number {
    return Math.ceil(value);
  }


  ngOnDestroy(): void {
    if (this.timerId) { // For timeToWait
      clearInterval(this.timerId);
    }
    if (this.examTimerId) { // For timeToDoTheExam
      clearInterval(this.examTimerId);
    }
  }

}
