// import { Injectable, inject } from '@angular/core';
// import { BehaviorSubject } from 'rxjs';
// import { Exam, Question } from '@models/exam';
// import { QuestionAndAnswer, Result } from '@models/result';

// @Injectable({
//   providedIn: 'root'
// })
// export class ExamStateService {
//   private examSubject = new BehaviorSubject<Exam | null>(null);
//   private answers: { [questionIndex: number]: string } = {};
//   private timeRemainingSubject = new BehaviorSubject<number>(0);

//   exam$ = this.examSubject.asObservable();
//   timeRemaining$ = this.timeRemainingSubject.asObservable();

//   setExam(exam: Exam) {
//     this.examSubject.next(exam);
//     this.timeRemainingSubject.next(exam.timeToDoTheExam * 60); // Convertir minutos a segundos
//   }

//   // Método para obtener el valor actual del examen
//   getCurrentExam(): Exam | null {
//     return this.examSubject.value;
//   }

//   getQuestion(index: number): Question | null {
//     const exam = this.examSubject.value;
//     return exam?.questions[index] || null;
//   }

//   getTotalQuestions(): number {
//     const exam = this.examSubject.value;
//     return exam?.questions.length || 0;
//   }

//   setAnswer(questionIndex: number, answer: string) {
//     this.answers[questionIndex] = answer;
//   }

//   getAnswer(questionIndex: number): string | null {
//     return this.answers[questionIndex] || null;
//   }

//   getNextUnansweredQuestion(currentIndex: number): number | null {
//     for (let i = currentIndex + 1; i < this.getTotalQuestions(); i++) {
//       if (!this.answers[i]) {
//         return i;
//       }
//     }
//     return null;
//   }

//   areAllQuestionsAnswered(): boolean {
//     return this.examSubject.value?.questions.every((_, index) => !!this.answers[index]) || false;
//   }

//   startTimer(submitCallback: () => void) {
//     const interval = setInterval(() => {
//       const currentTime = this.timeRemainingSubject.value;
//       if (currentTime > 0) {
//         this.timeRemainingSubject.next(currentTime - 1);
//       } else {
//         clearInterval(interval);
//         submitCallback();
//       }
//     }, 1000);
//   }

//   prepareResult(userUID: string): Result {
//     const exam = this.examSubject.value;
//     if (!exam) throw new Error('No hay examen cargado');

//     const questionsAndAnswers: QuestionAndAnswer[] = exam.questions.map((question, index) => {
//       const selectedAnswer = this.answers[index] || '';
//       const correctOption = question.options.find(opt => opt.isCorrect)?.text || '';
//       return {
//         question: question.text,
//         options: question.options,
//         answer: selectedAnswer,
//         correct: selectedAnswer === correctOption
//       };
//     });

//     const correctAnswers = questionsAndAnswers.filter(q => q.correct).length;
//     const questionsAnswered = questionsAndAnswers.filter(q => q.answer !== '').length;

//     return {
//       userUID,
//       time: new Date().toISOString(),
//       totalQuestions: this.getTotalQuestions(),
//       correctAnswers,
//       examTitle: exam.title,
//       examId: exam.id,
//       teacherId: exam.teacherId,
//       questions: questionsAndAnswers,
//       questions_answered: questionsAnswered,
//       examPassed: (correctAnswers / this.getTotalQuestions()) * 100 >= exam.passingPercentage
//     };
//   }
// }
