import { Component, Input } from '@angular/core';
import { MatIconModule } from '@angular/material/icon';
import { Router } from '@angular/router'

import { Teacher } from '@models/teacher';


@Component({
  selector: 'app-teacher-list',
  imports: [MatIconModule],
  templateUrl: './teacher-list.component.html'
})
export class TeacherListComponent {
  @Input() teacher!: Teacher;


  toPdf() {
    const pdfPath = this.teacher.doc_path
    if (pdfPath) {
      window.open(`/assets/${pdfPath}`, '_blank');
      // this.router.navigate(['/pdf-viewer']);
    } else {
      alert('No hay PDF disponible');
    }
  }

}
