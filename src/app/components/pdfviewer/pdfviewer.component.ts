import { Component, inject } from '@angular/core';
import { PagesService } from '@services/pages.service'; // Asegúrate de ajustar la ruta al servicio
import { DomSanitizer, SafeResourceUrl } from '@angular/platform-browser';


@Component({
  selector: 'app-pdfviewer',
  imports: [],
  templateUrl: './pdfviewer.component.html'
})
export class PdfviewerComponent {
  private pagesService = inject(PagesService);
  private sanitizer = inject(DomSanitizer);

  get safePdfUrl(): SafeResourceUrl | null {
    const path = this.pagesService.docPath(); // Obtiene el path como 'pdfs/ethics-supervisors.pdf'
    if (path) {
      const fullPath = `/assets/${path}`; // Construye la URL completa
      return this.sanitizer.bypassSecurityTrustResourceUrl(fullPath);
    }
    return null;
  }

}
