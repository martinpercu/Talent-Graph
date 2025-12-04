import { Injectable, inject } from '@angular/core';

import {
  TranslocoDirective,
  TranslocoPipe,
  TranslocoService,
} from '@jsverse/transloco';

@Injectable({
  providedIn: 'root',
})
export class LangService {
  translocoService = inject(TranslocoService);

  browserLanguageShort: string | undefined;

  constructor() {}

  setLangStart() {
    const savedLang = localStorage.getItem('lang');
    console.log(savedLang);

    if (savedLang === 'es' || savedLang === 'en' || savedLang === 'fr') {
      // If someone change manually the manipulate the localstorage hahaha
      this.translocoService.setActiveLang(savedLang);
    } else {
      if (typeof window !== 'undefined' && window.navigator) {
        const fullBrowserLanguage = window.navigator.language;
        if (fullBrowserLanguage) {
          this.browserLanguageShort = fullBrowserLanguage.split('-')[0];
          console.log(this.browserLanguageShort);
          this.translocoService.setActiveLang(this.browserLanguageShort);
          localStorage.setItem('lang', this.browserLanguageShort);
        }
        // this.setLanguage(this.browserLanguage);
      } else {
        console.warn(
          'El objeto window o navigator no está disponible (posiblemente SSR).'
        );
      }
    }
    // this.translocoService.setActiveLang(lang);
    // localStorage.setItem('lang', lang);
  }

  getLang() {
    return this.translocoService.getActiveLang();
  }

  setLang(lang: string) {
    this.translocoService.setActiveLang(lang);
    localStorage.setItem('lang', lang);
  }

  traductor(key: string) {
    return this.translocoService.translate(key);
  }
}
