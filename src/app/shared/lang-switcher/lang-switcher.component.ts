import { Component, inject } from '@angular/core';
import { LangService } from '@services/lang.service';

@Component({
  selector: 'app-lang-switcher',
  imports: [],
  templateUrl: './lang-switcher.component.html'
})
export class LangSwitcherComponent {
  langService = inject(LangService);

  currentLang!: string;

  constructor() {
    this.currentLang = this.langService.getLang();
    console.log(this.currentLang);
  }

  changeLang(lang: string) {
    this.langService.setLang(lang);
    this.currentLang = lang
  }

  action() {
    const caca = this.langService.traductor('welcome');
    console.log(caca);
  }
}
