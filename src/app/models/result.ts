import { Option } from './exam';

export interface QuestionAndAnswer {
  question: string; // Texto de la pregunta
  options: Option[]; // 6 opciones: 1 correcta, 5 incorrectas
  answer: string; // should be one of the options
  correct: boolean; // If the answer was correct
}

export interface Result {
  id?: string; // ID del documento en Firestore
  userUID: string; // Is the same a AuthID. (esto por ahora hardcodeado)
  time: string; // UTC DateStamp
  totalQuestions: number; // La cantidad total de preguntas que es lo mismo que QuestionAndAnswer Lenght
  correctAnswers: number; // Cantidad respuestas correctas.
  examTitle: string; // Título del examen, requerido
  examId: string; // Is the exame id.
  teacherId?: string; // ID del profesor, requerido
  questions: QuestionAndAnswer[]; // Lista de preguntas
  difficulty?: number; // Number 1 to 5 in relation how many false choices
  questions_answered: number; // Cantidad de preguntas con una respuesta seleccionada (answer no vacío)
  examPassed?: boolean | null; // If Exam was passed succes!.
  momentStartExam: string; // UTC DateStamp
  doingTheExamNow: boolean; // This is to know if the user is doing the exam.
}
