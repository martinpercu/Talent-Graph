import { Component, inject } from '@angular/core';
import { Router, ActivatedRoute } from '@angular/router';
import { DomSanitizer, SafeResourceUrl } from '@angular/platform-browser'; // Importa DomSanitizer y SafeResourceUrl

@Component({
  selector: 'app-pdf-show',
  imports: [],
  templateUrl: './pdf-show.component.html',
  styleUrl: './pdf-show.component.css'
})
export class PdfShowComponent {
  router = inject(Router);
  private route = inject(ActivatedRoute);
  private sanitizer = inject(DomSanitizer); // Inyecta DomSanitizer

  pdfName!: string;
  pdfUrl!: SafeResourceUrl; // Agrega una propiedad para la URL sanitizada


  async ngOnInit() {
    console.log('here');

    // Extraer el certificationName
    const pdfName = this.route.snapshot.paramMap.get('pdfname');
    if (pdfName) {
      this.pdfName = pdfName;
      console.log(this.pdfName);

      // Sanitiza la URL antes de asignarla
      this.pdfUrl = this.sanitizer.bypassSecurityTrustResourceUrl('/assets/pdfs/' + this.pdfName + '.pdf');
    }
  }

}
