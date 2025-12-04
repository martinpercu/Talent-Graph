import { Component, inject, Input, Output, EventEmitter } from '@angular/core';
// import { TranslocoPipe } from '@jsverse/transloco';
import { CommonModule } from '@angular/common';
import { MatIconModule } from '@angular/material/icon';
import { Job } from '@models/job'

import { ResumeService } from '@services/resume.service';
import { TranslocoPipe, TranslocoService } from '@jsverse/transloco';

import { Ownresume } from '@models/ownResume';


@Component({
  selector: 'app-own-resume-viewer',
  imports: [TranslocoPipe, CommonModule, MatIconModule],
  templateUrl: './own-resume-viewer.component.html'
})
export class OwnResumeViewerComponent {
  @Input() ownResume!: Ownresume;
  // @Input() jobForResume!: Job;
  @Input() recruiterId!: any;

  // @Output() updateResumeList = new EventEmitter<void>();
  @Output() closeViewer = new EventEmitter<void>();

  resumeService = inject(ResumeService);

  showSummary: boolean = true;
  showSkills: boolean = false;
  showWorks: boolean = false;
  showEducation: boolean = false;
  showCertifications: boolean = false;
  showLanguages: boolean = false;

    // async ngOnInit() {
    //   console.log(this.ownResume);

    // }

  constructor(private translocoService: TranslocoService){

  }


  async ngOnInit() {
    console.log(this.ownResume);
    console.log("Componente hijo inicializado");
    // console.log("updateResumeList observers al init:", this.updateResumeList.observers?.length || 'no observers property');
    console.log(this.recruiterId);
  }

  // Puedes usar una función genérica o una por cada sección
  toggleSection(section: 'summary' | 'skills' | 'works' | 'education' | 'certifications' | 'languages') {
    switch(section) {
      case 'summary':
        this.showSummary = !this.showSummary;
        break;
      case 'skills':
        this.showSkills = !this.showSkills;
        break;
      case 'works':
        this.showWorks = !this.showWorks;
        break;
      case 'education':
        this.showEducation = !this.showEducation;
        break;
      case 'certifications':
        this.showCertifications = !this.showCertifications;
        break;
      case 'languages':
        this.showLanguages = !this.showLanguages;
        break;
    }
  }

  close(): void {
    this.closeViewer.emit();
    // alert('exit resume show')
    // this.thumbUpResume();
  }

  async thumbUpResume(): Promise<void> {
    console.log('THUMB THUMB !!!!!\nTHUMB UPUPUP!!');
    // this.updateResumeList.emit();
    console.log(this.ownResume);
    // Asigna el valor 'true' al campo thumbUp del objeto ownResume
    this.ownResume.thumbUp = true;
    console.log('Resume actualizado:', this.ownResume);

    try {
      // Espera a que se complete la actualización en Firestore
      await this.resumeService.updatedThisOwnResumeById(
        { thumbUp: true },
        this.ownResume.resumeId
      );
      console.log('Resume actualizado en Firestore exitosamente');
      // Ahora sí emite el evento para actualizar la lista en el padre
      // this.updateResumeList.emit();
    } catch (error) {
      console.error('Error actualizando resume:', error);
      // Opcional: podrías revertir el cambio local si falla
      // this.ownResume.thumbUp = false;
    }
  }

  async thumbUpHandleResume(data: boolean): Promise<void> {
    console.log('THUMB THUMB !!!!!\nTHUMB UPUPUP!!');
    // this.updateResumeList.emit();
    console.log(this.ownResume);
    // Asigna el valor 'false' al campo thumbUp del objeto ownResume
    this.ownResume.thumbUp = data;
    console.log(this.ownResume.thumbUp);

    console.log('Resume actualizado:', this.ownResume);

    try {
      // Espera a que se complete la actualización en Firestore
      await this.resumeService.updatedThisOwnResumeById(
        { thumbUp: data },
        this.ownResume.resumeId
      );
      console.log('Resume actualizado en Firestore exitosamente');
      // Ahora sí emite el evento para actualizar la lista en el padre
      // this.updateResumeList.emit();
    } catch (error) {
      console.error('Error actualizando resume:', error);
      // Opcional: podrías revertir el cambio local si falla
      // this.ownResume.thumbUp = false;
    }
  }

  // emailToCandidate() {
  //   alert("email ?")
  // }
  // smsToCandidate() {
  //   alert("SMS ?")
  // }
  // callToCandidate() {
  //   alert("llamamos ?")
  // }
  emailToCandidate() {
    const emailTranslation = this.translocoService.translate('candidate_profile.send_email');
    const yesSend = confirm(emailTranslation + this.ownResume.name +"?");
    if (yesSend) {
      this.sendEmailToCandidate()
    } else {
    }
  }

  sendEmailToCandidate() {
    const name = this.ownResume.name;
    const emailAddress = this.ownResume.email;
    const subjetFromTranlation_A = this.translocoService.translate('candidate_profile.send_email_subjet_A');
    const subjetFromTranlation_B = this.translocoService.translate('candidate_profile.send_email_subjet_B');
    const bodyFromTranlation = this.translocoService.translate('candidate_profile.send_email_body');

    // Si quieres usarla en la lógica de envío de email:
    const subject = `${subjetFromTranlation_A}`; // Usando la traducción en el asunto
    const body = `${bodyFromTranlation} ${name},`; // Usando la traducción en el cuerpo

    const encodedSubject = encodeURIComponent(subject);
    const encodedBody = encodeURIComponent(body);

    console.log(emailAddress + '\n\n' + encodedSubject + '\n\n' + encodedBody);

    window.location.href = `mailto:${emailAddress}?subject=${encodedSubject}&body=${encodedBody}`;
  }


  smsToCandidate() {
    const smsTranslation = this.translocoService.translate('candidate_profile.send_sms');
    const yesSend = confirm(smsTranslation + this.ownResume.name +"?");
    if (yesSend) {
      this.sendSmsToCandidate()
    } else {
      // alert('ok perfect no hace naranja');
    }
  }
  normalizePhoneNumber(number: string | undefined): string {
    // Keep only numbers and '+'
    if(number) {
      let numberClean = number.replace(/[^\d+]/g, '');
      return numberClean
    }
    return '';
  }
  sendSmsToCandidate() {
    const phoneNumber = this.normalizePhoneNumber(this.ownResume.phone)
    console.log(phoneNumber);
    window.location.href = `sms:${phoneNumber}`;
  }


  callToCandidate() {
    const smsTranslation = this.translocoService.translate('candidate_profile.call_to');
    const yesSend = confirm(smsTranslation + this.ownResume.name +"?");
    if (yesSend) {
      this.sendCallToCandidate()
    } else {
      // alert('ok perfect no hace naranja');
    }
  }
  sendCallToCandidate() {
    // Definimos el número de teléfono
    const phoneNumber = this.normalizePhoneNumber(this.ownResume.phone)

    // Obtenemos la traducción del texto del botón o mensaje, si es necesario.
    // Aunque para esta función solo necesitas el número.
    // const callTranslation = this.translocoService.translate('candidate_profile.send_sms');

    // La parte clave: usar window.location.href con el esquema tel:
    window.location.href = `tel:${phoneNumber}`;

    // // Opcionalmente, puedes mostrar una alerta con la traducción
    // alert(callTranslation + ` al ${phoneNumber}?`);
  }




  // thumbUpResume(): void {
  //   console.log(("befare call"));
  //   this.updateResumeList.emit();
  // }

//   thumbUpResume(): void {
//   console.log("thumbUpResume ejecutándose...");
//   console.log("Número de observers:", this.updateResumeList.observers.length);
//   this.updateResumeList.emit();
//   console.log("updateResumeList emitido");
// }


}
