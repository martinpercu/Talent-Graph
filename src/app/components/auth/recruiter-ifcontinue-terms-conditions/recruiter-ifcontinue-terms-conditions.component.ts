import { Component, inject } from '@angular/core';

import { TranslocoPipe, TranslocoService } from '@jsverse/transloco';
import { environment } from '@env/environment';


@Component({
  selector: 'app-recruiter-ifcontinue-terms-conditions',
  imports: [TranslocoPipe],
  templateUrl: './recruiter-ifcontinue-terms-conditions.component.html',
  styleUrl: './recruiter-ifcontinue-terms-conditions.component.css'
})
export class RecruiterIfcontinueTermsConditionsComponent {

  private translocoService = inject(TranslocoService);


  getLang(){
    return this.translocoService.getActiveLang()
  }


  toTerms() {
    const languageNow = this.getLang();
    console.log(languageNow);
    const url = environment.BASEURL; // our baseURL
    const urlReal = `${url}/termsandprivacy/terms-${languageNow}`
    console.log(urlReal);
    window.open(urlReal, '_blank');
  }

  toPrivacy() {
    const languageNow = this.getLang();
    console.log(languageNow);
    const url = environment.BASEURL; // our baseURL
    const urlReal = `${url}/termsandprivacy/privacy-${languageNow}`
    console.log(urlReal);
    window.open(urlReal, '_blank');
  }


}
