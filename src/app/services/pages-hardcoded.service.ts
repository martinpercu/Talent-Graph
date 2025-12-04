import { Injectable, signal } from '@angular/core';

@Injectable({
  providedIn: 'root'
})
export class PagesService {
  pagesSelected = signal<number[]>([0, 1]);
  sectionSelected = signal<string>('');
  titleSelected = signal<string>('');
  indexSubtext = signal<Record<string, string>>({});
  defaultTitle = signal<string>('');
  // Nueva señal para doc_path
  docPath = signal<string>('');

  private configurations: {
    [key: string]: {
      pageMap: { [key: string]: number[] };
      indexSubtext: { [key: string]: string };
      defaultTitle: string;
      doc_path: string;
    }
  } = {
    supervisors: {
      pageMap: {
        "Section 0": [0, 1],
        "Section 1": [2, 3, 4, 5, 6, 7, 8],
        "Section 2": [9, 10, 11, 12, 13, 14, 15, 16, 17, 18],
        "Section 3": [19, 20, 21, 22, 23, 24, 25, 26],
        "Section 4": [27, 28, 29, 30, 31, 32, 33],
        "Section 5": [34, 35, 36, 37, 38, 39, 40, 41],
        "Section 6": [42, 43, 44, 45, 46, 47, 48, 49, 50],
      },
      indexSubtext: {
        "Section 0": "Main intro",
        "Section 1": "Defining Business Ethics",
        "Section 2": "Factors that Influence Ethical Behavior",
        "Section 3": "Ethical & Unethical Practices",
        "Section 4": "Recognizing Unethical Behavior",
        "Section 5": "Ethical Decision Making",
        "Section 6": "Ethical Best Practices"
      },
      defaultTitle: "Ethics Management for Supervisors",
      doc_path: "pdfs/ethics-supervisors.pdf"
    },
    employee: {
      pageMap: {
        "Section 0": [0, 1, 2],
        "Section 1": [3, 4, 5, 6, 7, 8, 9, 10, 11],
        "Section 2": [12, 13, 14, 15, 16, 17, 18, 19, 20],
        "Section 3": [21, 22, 23, 24, 25, 26, 27],
        "Section 4": [28, 29, 30, 31, 32, 33, 34],
        "Section 5": [35, 36, 37, 38, 39, 40, 41, 42, 43]
      },
      indexSubtext: {
        "Section 0": "Contents & Objectives",
        "Section 1": "Defining Business Ethics",
        "Section 2": "Factors that Influence Ethical Behavior",
        "Section 3": "Ethical & Unethical Practices",
        "Section 4": "Recognizing Unethical Behavior",
        "Section 5": "Best Practices for Ethical Decision Making",
      },
      defaultTitle: "Ethics Management for Employees",
      doc_path: "pdfs/ethics-employees.pdf"
    }
  };

  private currentConfig: string = 'supervisors';

  constructor() {
    this.defineAll();
    this.updateSignals();
  }

  setConfiguration(type: string) {
    if (this.configurations[type]) {
      this.currentConfig = type;
      this.defineAll();
      this.updateSignals();
    } else {
      console.warn(`Configuración ${type} no encontrada. Usando por defecto: supervisors.`);
      this.currentConfig = 'supervisors';
      this.defineAll();
      this.updateSignals();
    }
  }

  definePages(section: string, title: string) {
    const pages = this.configurations[this.currentConfig].pageMap[section];
    if (pages) {
      this.pagesSelected.set(pages);
      this.sectionSelected.set(section);
      this.titleSelected.set(title);
    } else {
      console.warn(`Sección ${section} no encontrada en configuración ${this.currentConfig}.`);
    }
  }

  defineAll() {
    const config = this.configurations[this.currentConfig];
    const allPages = Object.values(config.pageMap).flat();
    this.pagesSelected.set([...new Set(allPages)].sort((a, b) => a - b));
    this.sectionSelected.set('All');
    this.titleSelected.set(config.defaultTitle);
  }

  getSubtext(section: string): string {
    return this.configurations[this.currentConfig].indexSubtext[section] || 'Sin subtítulo';
  }

  getIndexSubtext(): Record<string, string> {
    return this.configurations[this.currentConfig].indexSubtext;
  }

  private updateSignals() {
    const config = this.configurations[this.currentConfig];
    this.indexSubtext.set(config.indexSubtext);
    this.defaultTitle.set(config.defaultTitle);
    this.docPath.set(config.doc_path);
  }

  getFirstSection(): string {
    return this.configurations[this.currentConfig].indexSubtext["Section 0"] || 'Sin subtítulo';
  }

}
