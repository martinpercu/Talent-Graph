import { Injectable, signal } from '@angular/core';
import { Firestore, doc, getDoc } from '@angular/fire/firestore';

import { Teacher } from '@models/teacher';

// interface Teacher {
//   id: string;
//   name: string;
//   pageMap: { [key: string]: number[] };
//   indexSubtext: { [key: string]: string };
//   defaultTitle: string;
//   doc_path: string;
// }

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

  private currentTeacher: Teacher | null = null;
  private currentConfig: string | null = null;
  private isLoadingDefault = false; // Evitar bucles

  constructor(private firestore: Firestore) {
    // No llamamos loadTeacherData aquí para evitar problemas de contexto
  }

  // Método para inicializar el servicio
  async initialize() {
    if (!this.currentConfig) {
      await this.setConfiguration('supervisors');
    }
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
        this.currentTeacher = docSnap.data() as Teacher;
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
        }
      }
    } catch (error) {
      console.error('Error al cargar datos de Firestore:', error);
      this.currentTeacher = null;
      this.currentConfig = null;
      this.updateSignals();
    }
  }

  definePages(section: string, title: string) {
    if (this.currentTeacher && this.currentTeacher.pageMap && this.currentTeacher.pageMap[section]) {
      const pages = this.currentTeacher.pageMap[section];
      this.pagesSelected.set(pages);
      this.sectionSelected.set(section);
      this.titleSelected.set(title);
    } else {
      console.warn(`Sección ${section} no encontrada en teacher ${this.currentConfig}.`);
    }
  }

  defineAll() {
    if (this.currentTeacher && this.currentTeacher.pageMap) {
      const allPages = Object.values(this.currentTeacher.pageMap).flat();
      this.pagesSelected.set([...new Set(allPages)].sort((a, b) => a - b));
      this.sectionSelected.set('All');
      this.titleSelected.set(this.currentTeacher.defaultTitle);
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
    } else {
      this.indexSubtext.set({});
      this.defaultTitle.set('');
      this.docPath.set('');
    }
  }
}
