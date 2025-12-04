import { Injectable } from '@angular/core';
import {
  Firestore,
  collection,
  collectionData,
  doc,
  getDoc,
  addDoc,
  updateDoc,
  deleteDoc,
  query,
  where,
  getDocs,
} from '@angular/fire/firestore';
import { Observable, from, of, throwError } from 'rxjs';
import { map, catchError } from 'rxjs/operators';
import { Exam, Question, Option } from '@models/exam';

@Injectable({
  providedIn: 'root',
})
export class ExamCrudService {
  private examsCollection;

  constructor(private firestore: Firestore) {
    this.examsCollection = collection(this.firestore, 'exams');
  }

  getExams(): Observable<Exam[]> {
    return collectionData(this.examsCollection, { idField: 'id' }).pipe(
      map((exams) => exams as Exam[]),
      catchError((error) => {
        console.error('Error al obtener exámenes:', error);
        return throwError(
          () => new Error('No se pudieron cargar los exámenes')
        );
      })
    );
  }

  getExamsByRecruiterId(recruiterId: string): Observable<Exam[]> {
    const queryFn = query(
      this.examsCollection,
      where('recruiterId', '==', recruiterId)
    );
    return collectionData(queryFn, { idField: 'id' }).pipe(
      map((exams) => exams as Exam[]),
      catchError((error) => {
        console.error('Error al obtener exámenes por recruiterId:', error);
        return throwError(
          () => new Error('No se pudieron cargar los exámenes')
        );
      })
    );
  }

  getExamById(examId: string): Observable<Exam | null> {
    const examDoc = doc(this.firestore, `exams/${examId}`);
    return from(getDoc(examDoc)).pipe(
      map((docSnap) =>
        docSnap.exists()
          ? ({ id: docSnap.id, ...docSnap.data() } as Exam)
          : null
      ),
      catchError((error) => {
        console.error('Error al obtener el examen:', error);
        return throwError(
          () => new Error(`No se pudo cargar el examen con ID ${examId}`)
        );
      })
    );
  }

  getExamByTeacherId(teacherId: string): Observable<Exam | null> {
    const q = query(this.examsCollection, where('teacherId', '==', teacherId));
    return from(getDocs(q)).pipe(
      map((querySnapshot) => {
        if (!querySnapshot.empty) {
          const doc = querySnapshot.docs[0];
          return { id: doc.id, ...doc.data() } as Exam;
        }
        return null;
      }),
      catchError((error) => {
        console.error('Error al obtener el examen por teacherId:', error);
        return throwError(
          () =>
            new Error(
              `No se pudo cargar el examen para el profesor ${teacherId}`
            )
        );
      })
    );
  }

  createExam(exam: Partial<Exam>): Observable<string> {
    const validationError = this.validateExam(exam);
    if (validationError) {
      return throwError(() => new Error(validationError));
    }

    const examData: Partial<Exam> = {
      title: exam.title!.trim(),
      // teacherId: exam.teacherId!,
      // teacherName: exam.teacherName?.trim() || undefined,
      questions: exam.questions!,
      // courseId: exam.courseId,
      passingPercentage: exam.passingPercentage,
      timeToWait: exam.timeToWait,
      enable: exam.enable ?? true, // Valor predeterminado: habilitado
      timeToDoTheExam: exam.timeToDoTheExam ?? 60, // Valor predeterminado: 60 minutos
      recruiterId: exam.recruiterId,
    };

    return from(addDoc(this.examsCollection, examData)).pipe(
      map((docRef) => docRef.id),
      catchError((error) => {
        console.error('Error al crear el examen:', error);
        return throwError(() => new Error('No se pudo crear el examen'));
      })
    );
  }

  updateExam(examId: string, exam: Partial<Exam>): Observable<boolean> {
    const validationError = this.validateExam(exam);
    if (validationError) {
      return throwError(() => new Error(validationError));
    }

    const examDoc = doc(this.firestore, `exams/${examId}`);
    const examData: Partial<Exam> = {
      title: exam.title!.trim(),
      teacherId: exam.teacherId!,
      teacherName: exam.teacherName?.trim() || "",
      questions: exam.questions!,
      // courseId: exam.courseId,
      passingPercentage: exam.passingPercentage,
      timeToWait: exam.timeToWait,
      enable: exam.enable ?? true,
      timeToDoTheExam: exam.timeToDoTheExam ?? 60,
      recruiterId: exam.recruiterId,
    };

    return from(updateDoc(examDoc, examData)).pipe(
      map(() => true),
      catchError((error) => {
        console.error('Error al actualizar el examen:', error);
        return throwError(
          () => new Error(`No se pudo actualizar el examen con ID ${examId}`)
        );
      })
    );
  }

  deleteExam(examId: string): Observable<boolean> {
    const examDoc = doc(this.firestore, `exams/${examId}`);
    return from(deleteDoc(examDoc)).pipe(
      map(() => true),
      catchError((error) => {
        console.error('Error al eliminar el examen:', error);
        return throwError(
          () => new Error(`No se pudo eliminar el examen con ID ${examId}`)
        );
      })
    );
  }

  checkExamTitleExists(
    title: string,
    excludeExamId?: string
  ): Observable<boolean> {
    const q = query(this.examsCollection, where('title', '==', title.trim()));
    return from(getDocs(q)).pipe(
      map(
        (querySnapshot) =>
          !querySnapshot.empty &&
          !querySnapshot.docs.some((doc) => doc.id === excludeExamId)
      ),
      catchError((error) => {
        console.error('Error al verificar el título del examen:', error);
        return throwError(
          () => new Error('No se pudo verificar el título del examen')
        );
      })
    );
  }

  checkExamExistsByTeacherId(
    teacherId: string,
    excludeExamId?: string
  ): Observable<boolean> {
    const q = query(this.examsCollection, where('teacherId', '==', teacherId));
    return from(getDocs(q)).pipe(
      map(
        (querySnapshot) =>
          !querySnapshot.empty &&
          !querySnapshot.docs.some((doc) => doc.id === excludeExamId)
      ),
      catchError((error) => {
        console.error('Error al verificar el examen por teacherId:', error);
        return throwError(
          () => new Error('No se pudo verificar el examen para el profesor')
        );
      })
    );
  }

  private validateExam(exam: Partial<Exam>): string | null {
    if (!exam.title?.trim()) {
      return 'Title is required';
    }
    // if (!exam.teacherId) {
    //   return 'Teacher ID is required';
    // }
    if (!exam.questions?.length) {
      return 'At least one question is required';
    }
    if (
      exam.passingPercentage == null ||
      exam.passingPercentage < 0 ||
      exam.passingPercentage > 100
    ) {
      return 'The percentage to pass must be between 0 and 100';
    }
    if (exam.timeToWait == null || exam.timeToWait < 0) {
      return 'The wait time must be a positive number';
    }
    if (exam.timeToDoTheExam != null && exam.timeToDoTheExam < 1) {
      return 'The exam time must be at least 1 minute';
    }
    const invalidQuestion = exam.questions.find(
      (q) => !this.isValidQuestion(q)
    );
    if (invalidQuestion) {
      return 'One or more questions are invalid (must have text and 2-6 options: 1 correct)';
    }
    return null;
  }

  private isValidQuestion(question: Question): boolean {
    if (!question.text?.trim()) {
      return false;
    }
    if (
      !Array.isArray(question.options) ||
      question.options.length < 2 ||
      question.options.length > 6
    ) {
      return false;
    }
    const correctCount = question.options.filter((opt) => opt.isCorrect).length;
    if (correctCount !== 1) {
      return false;
    }
    return question.options.every(
      (opt) => opt.text?.trim() && typeof opt.isCorrect === 'boolean'
    );
  }
}

//   private examsCollection;

//   constructor(private firestore: Firestore) {
//     this.examsCollection = collection(this.firestore, 'exams');
//   }

//   getExams(): Observable<Exam[]> {
//     return collectionData(this.examsCollection, { idField: 'id' }).pipe(
//       map(exams => exams as Exam[]),
//       catchError(error => {
//         console.error('Error al obtener exámenes:', error);
//         return throwError(() => new Error('No se pudieron cargar los exámenes'));
//       })
//     );
//   }

//   getExamById(examId: string): Observable<Exam | null> {
//     const examDoc = doc(this.firestore, `exams/${examId}`);
//     return from(getDoc(examDoc)).pipe(
//       map(docSnap => (docSnap.exists() ? { id: docSnap.id, ...docSnap.data() } as Exam : null)),
//       catchError(error => {
//         console.error('Error al obtener el examen:', error);
//         return throwError(() => new Error(`No se pudo cargar el examen con ID ${examId}`));
//       })
//     );
//   }

//   getExamByTeacherId(teacherId: string): Observable<Exam | null> {
//     const q = query(this.examsCollection, where('teacherId', '==', teacherId));
//     return from(getDocs(q)).pipe(
//       map(querySnapshot => {
//         if (!querySnapshot.empty) {
//           const doc = querySnapshot.docs[0];
//           return { id: doc.id, ...doc.data() } as Exam;
//         }
//         return null;
//       }),
//       catchError(error => {
//         console.error('Error al obtener el examen por teacherId:', error);
//         return throwError(() => new Error(`No se pudo cargar el examen para el profesor ${teacherId}`));
//       })
//     );
//   }

//   createExam(exam: Partial<Exam>): Observable<string> {
//     const validationError = this.validateExam(exam);
//     if (validationError) {
//       return throwError(() => new Error(validationError));
//     }

//     const examData: Partial<Exam> = {
//       title: exam.title!.trim(),
//       teacherId: exam.teacherId!,
//       teacherName: exam.teacherName?.trim() || undefined,
//       questions: exam.questions!,
//       // courseId: exam.courseId,
//       passingPercentage: exam.passingPercentage,
//       timeToWait: exam.timeToWait
//     };

//     return from(addDoc(this.examsCollection, examData)).pipe(
//       map(docRef => docRef.id),
//       catchError(error => {
//         console.error('Error al crear el examen:', error);
//         return throwError(() => new Error('No se pudo crear el examen'));
//       })
//     );
//   }

//   updateExam(examId: string, exam: Partial<Exam>): Observable<boolean> {
//     const validationError = this.validateExam(exam);
//     if (validationError) {
//       return throwError(() => new Error(validationError));
//     }

//     const examDoc = doc(this.firestore, `exams/${examId}`);
//     const examData: Partial<Exam> = {
//       title: exam.title!.trim(),
//       teacherId: exam.teacherId!,
//       teacherName: exam.teacherName?.trim() || undefined,
//       questions: exam.questions!,
//       // courseId: exam.courseId,
//       passingPercentage: exam.passingPercentage,
//       timeToWait: exam.timeToWait
//     };

//     return from(updateDoc(examDoc, examData)).pipe(
//       map(() => true),
//       catchError(error => {
//         console.error('Error al actualizar el examen:', error);
//         return throwError(() => new Error(`No se pudo actualizar el examen con ID ${examId}`));
//       })
//     );
//   }

//   deleteExam(examId: string): Observable<boolean> {
//     const examDoc = doc(this.firestore, `exams/${examId}`);
//     return from(deleteDoc(examDoc)).pipe(
//       map(() => true),
//       catchError(error => {
//         console.error('Error al eliminar el examen:', error);
//         return throwError(() => new Error(`No se pudo eliminar el examen con ID ${examId}`));
//       })
//     );
//   }

//   checkExamTitleExists(title: string, excludeExamId?: string): Observable<boolean> {
//     const q = query(this.examsCollection, where('title', '==', title.trim()));
//     return from(getDocs(q)).pipe(
//       map(querySnapshot =>
//         !querySnapshot.empty &&
//         !querySnapshot.docs.some(doc => doc.id === excludeExamId)
//       ),
//       catchError(error => {
//         console.error('Error al verificar el título del examen:', error);
//         return throwError(() => new Error('No se pudo verificar el título del examen'));
//       })
//     );
//   }

//   checkExamExistsByTeacherId(teacherId: string, excludeExamId?: string): Observable<boolean> {
//     const q = query(this.examsCollection, where('teacherId', '==', teacherId));
//     return from(getDocs(q)).pipe(
//       map(querySnapshot =>
//         !querySnapshot.empty &&
//         !querySnapshot.docs.some(doc => doc.id === excludeExamId)
//       ),
//       catchError(error => {
//         console.error('Error al verificar el examen por teacherId:', error);
//         return throwError(() => new Error('No se pudo verificar el examen para el profesor'));
//       })
//     );
//   }

//   private validateExam(exam: Partial<Exam>): string | null {
//     if (!exam.title?.trim()) {
//       return 'Title is required';
//     }
//     if (!exam.teacherId) {
//       return 'Teacher ID is required';
//     }
//     if (!exam.questions?.length) {
//       return 'At least one question is required';
//     }
//     if (exam.passingPercentage == null || exam.passingPercentage < 0 || exam.passingPercentage > 100) {
//       return 'The percentage to pass must be between 0 and 100';
//     }
//     if (exam.timeToWait == null || exam.timeToWait < 0) {
//       return 'The wait time must be a positive number';
//     }
//     const invalidQuestion = exam.questions.find(q => !this.isValidQuestion(q));
//     if (invalidQuestion) {
//       return 'One or more questions are invalid (must have text and 2-6 options: 1 correct)';
//     }
//     return null;
//   }

//   private isValidQuestion(question: Question): boolean {
//     if (!question.text?.trim()) {
//       return false;
//     }
//     if (!Array.isArray(question.options) || question.options.length < 2 || question.options.length > 6) {
//       return false;
//     }
//     const correctCount = question.options.filter(opt => opt.isCorrect).length;
//     if (correctCount !== 1) {
//       return false;
//     }
//     return question.options.every(opt => opt.text?.trim() && typeof opt.isCorrect === 'boolean');
//   }

// }
