import { Injectable, inject } from '@angular/core';
import { Firestore, collection, collectionData, doc, docData, query, where, limit } from '@angular/fire/firestore';
import { Observable, of } from 'rxjs';
import { catchError, map } from 'rxjs/operators';
import { Exam } from '@models/exam';

@Injectable({
  providedIn: 'root'
})

export class ExamService {
  private firestore = inject(Firestore);

  getExamById(examId: string): Observable<Exam | null> {
    const examRef = doc(this.firestore, `exams/${examId}`);
    return docData(examRef, { idField: 'id' }).pipe(
      map(data => {
        if (data && this.isValidExam(data)) {
          return data as Exam;
        }
        return null;
      }),
      catchError(error => {
        console.error('Error al cargar el examen:', error);
        return of(null);
      })
    );
  }


  /**
   * Obtiene el primer examen asociado con un teacherId
   */
  getTheFirstExamByTeacherId(teacherId: string): Observable<Exam | null> {
    const examsCollection = collection(this.firestore, 'exams');
    const examsQuery = query(examsCollection, where('teacherId', '==', teacherId), limit(1));
    return collectionData(examsQuery, { idField: 'id' }).pipe(
      map(exams => {
        const exam = exams[0];
        if (exam && this.isValidExam(exam)) {
          return exam as Exam;
        }
        return null;
      }),
      catchError(error => {
        console.error('Error al cargar el primer examen por teacherId:', error);
        return of(null);
      })
    );
  }


  /**
   * Obtiene todos los exámenes asociados con un teacherId
   */
  getExamsByTeacherId(teacherId: string): Observable<Exam[]> {
    const examsCollection = collection(this.firestore, 'exams');
    const examsQuery = query(examsCollection, where('teacherId', '==', teacherId));
    return collectionData(examsQuery, { idField: 'id' }).pipe(
      map(exams => exams.filter(exam => this.isValidExam(exam)) as Exam[]),
      catchError(error => {
        console.error('Error al cargar los exámenes por teacherId:', error);
        return of([]);
      })
    );
  }

  private isValidExam(data: any): boolean {
    return (
      data &&
      typeof data.id === 'string' &&
      typeof data.title === 'string' &&
      typeof data.teacherId === 'string' &&
      Array.isArray(data.questions) &&
      data.questions.every((q: any) =>
        typeof q.text === 'string' &&
        Array.isArray(q.options) &&
        q.options.every((o: any) =>
          typeof o.text === 'string' &&
          typeof o.isCorrect === 'boolean'
        )
      )
    );
  }
}
