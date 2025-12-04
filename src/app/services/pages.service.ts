import { Injectable, signal } from '@angular/core';
import { Firestore, doc, getDoc } from '@angular/fire/firestore';

import { Teacher } from '@models/teacher';

@Injectable({
  providedIn: 'root'
})

export class PagesService {
  pagesSelected = signal<number[]>([]);
  sectionSelected = signal<string>('');
  titleSelected = signal<string>('');
  indexSubtext = signal<Record<string, string>>({});
  defaultTitle = signal<string>('');
  docPath = signal<string>('');
  examId = signal<string>('');

  private currentTeacher: Teacher | null = null;
  private currentConfig: string | null = null;
  private isLoadingDefault = false; // Evitar bucles


  hardTest = signal<string>('');
  shortTest = signal<string>('');
  startLesson = signal<string>('');
  startLessonFull = signal<string>('');

  // hardTest: string = 'Just ask me 2 serious questions. Try to force me to answer this questions very precise if I do not well; please help me and let me know about the answers';
  // shortTest: string = 'Please, just ask me 1 easy question to test my knowledge';
  // startLesson: string = `In the docs you will find one starting with ${this.pagesService.titleSelected()} this is the subject of this lesson. Please order the others docs and find the best way to teach me this info. Please start with no more than 110 words to explain me and then just ask me if I want to continue the lesson or if I need you to explain me again the same.`
  // // startLessonFull: string = 'Can you explain "Ethics Management for Supervisors" to me using the documents you have? Please give me a general overview of what the course is about, starting with no more than 110 words. After that, just ask me if I’d like to continue the lesson or if I want you to repeat the same explanation. Try to teach me in the most helpful way.'
  // startLessonFull: string = `Can you explain "${this.pagesService.defaultTitle()}" to me using the documents you have? Please give me a general overview of what the course is about, starting with no more than 110 words. After that, just ask me if I’d like to continue the lesson or if I want you to repeat the same explanation. Try to teach me in the most helpful way.`


  constructor(private firestore: Firestore) {}

  // Método para inicializar el servicio
  async initialize() {
    if (!this.currentConfig) {
      await this.setConfiguration('supervisors');
    }
  }

  async setExamPath(examId: string) {
    this.examId.set(examId);
  }

  async setConfiguration(type: string) {
    this.currentConfig = type;
    await this.loadTeacherData(type);
    this.defineAll();
  }

  private async loadTeacherData(teacherId: string) {
    if (this.isLoadingDefault) {
      return; // Evitar recursión infinita
    }

    try {
      const teacherDoc = doc(this.firestore, `teachers/${teacherId}`);
      const docSnap = await getDoc(teacherDoc);

      if (docSnap.exists()) {
        this.currentTeacher = { id: teacherId, ...docSnap.data() } as Teacher;
        this.updateSignals();
      } else {
        console.warn(`Teacher ${teacherId} no encontrado.`);
        if (teacherId === 'supervisors' && !this.isLoadingDefault) {
          this.isLoadingDefault = true;
          console.warn('No hay teachers disponibles. Estableciendo estado por defecto.');
          this.currentTeacher = null;
          this.currentConfig = null;
          this.updateSignals();
          this.isLoadingDefault = false;
        } else {
          this.currentTeacher = null;
          this.currentConfig = null;
          this.updateSignals();
        }
      }
    } catch (error) {
      console.error('Error al cargar datos de Firestore:', error);
      this.currentTeacher = null;
      this.currentConfig = null;
      this.updateSignals();
      throw error; // Propagar error para el componente
    }
  }

  definePages(section: string, title: string) {
    if (this.currentTeacher && this.currentTeacher.pageMap && this.currentTeacher.pageMap[section]) {
      const pages = this.currentTeacher.pageMap[section];
      this.pagesSelected.set(pages);
      this.sectionSelected.set(section);
      this.titleSelected.set(title);
      this.startLesson.set(`In the docs you will find one starting with ${this.titleSelected()} this is the subject of this lesson. Please order the others docs and find the best way to teach me this info. Please start with no more than 110 words to explain me and then just ask me if I want to continue the lesson or if I need you to explain me again the same.`);
      this.hardTest.set(`Just ask me 2 serious questions about ${this.titleSelected()}. Try to force me to answer this questions very precise if I do not well; please help me and let me know about the answers`);
      this.shortTest.set(`Please, just ask me 1 easy question to test my knowledge about ${this.titleSelected()}.`);
    } else {
      console.warn(`Sección ${section} no encontrada en teacher ${this.currentConfig}.`);
      this.pagesSelected.set([]);
      this.sectionSelected.set('');
      this.titleSelected.set('');
    }
  }

  defineAll() {
    if (this.currentTeacher && this.currentTeacher.pageMap) {
      const allPages = Object.values(this.currentTeacher.pageMap).flat();
      this.pagesSelected.set([...new Set(allPages)].sort((a, b) => a - b));
      this.sectionSelected.set('All');
      this.titleSelected.set(this.currentTeacher.defaultTitle || '');
      this.startLessonFull.set(`Can you explain "${this.defaultTitle()}" to me using the documents you have? Please give me a general overview of what the course is about, starting with no more than 110 words. After that, just ask me if I’d like to continue the lesson or if I want you to repeat the same explanation. Try to teach me in the most helpful way.`)
      this.startLesson.set(`In the docs you will find one starting with ${this.titleSelected()} this is the subject of this lesson. Please order the others docs and find the best way to teach me this info. Please start with no more than 110 words to explain me and then just ask me if I want to continue the lesson or if I need you to explain me again the same.`);
      this.hardTest.set(`Just ask me 2 serious questions about ${this.titleSelected()}. Try to force me to answer this questions very precise if I do not well; please help me and let me know about the answers`);
      this.shortTest.set(`Please, just ask me 1 easy question to test my knowledge about ${this.titleSelected()}.`);
    } else {
      console.warn(`No hay pageMap disponible para el teacher ${this.currentConfig}.`);
      this.pagesSelected.set([]);
      this.sectionSelected.set('');
      this.titleSelected.set('');
    }
  }

  getSubtext(section: string): string {
    return this.currentTeacher?.indexSubtext?.[section] || 'Sin subtítulo';
  }

  getIndexSubtext(): Record<string, string> {
    return this.currentTeacher?.indexSubtext || {};
  }

  getFirstSection(): string {
    return this.currentTeacher?.indexSubtext?.["Section 0"] || 'Sin subtítulo';
  }

  private updateSignals() {
    if (this.currentTeacher) {
      this.indexSubtext.set(this.currentTeacher.indexSubtext || {});
      this.defaultTitle.set(this.currentTeacher.defaultTitle || '');
      this.docPath.set(this.currentTeacher.doc_path || '');
      this.startLessonFull.set(`Can you explain "${this.defaultTitle()}" to me using the documents you have? Please give me a general overview of what the course is about, starting with no more than 110 words. After that, just ask me if I’d like to continue the lesson or if I want you to repeat the same explanation. Try to teach me in the most helpful way.`)
    } else {
      this.indexSubtext.set({});
      this.defaultTitle.set('');
      this.docPath.set('');
    }
  }


}
