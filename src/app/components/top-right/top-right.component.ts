import { Component, inject, signal } from '@angular/core';
import { MatIconModule } from '@angular/material/icon';
import { Router } from '@angular/router';


import { LightdarkthemeService } from '@services/lightdarktheme.service';
import { AuthService } from '@services/auth.service';
import { UserService } from '@services/user.service';
import { ModalinfoService } from '@services/modalinfo.service';
import { VisualStatesService } from '@services/visual-states.service';
import { PagesService } from '@services/pages.service';

import { RegisterComponent } from '@components/auth/register/register.component';
import { LoginComponent } from '@components/auth/login/login.component';

import { LangSwitcherComponent } from '@shared/lang-switcher/lang-switcher.component';

import { TranslocoPipe } from '@jsverse/transloco';



@Component({
  selector: 'app-top-right',
  imports: [MatIconModule, RegisterComponent, LoginComponent, LangSwitcherComponent, TranslocoPipe],
  templateUrl: './top-right.component.html'
})
export class TopRightComponent {

  themeService = inject(LightdarkthemeService);
  authService = inject(AuthService);
  modalinfoService = inject(ModalinfoService);
  visualStatesService = inject(VisualStatesService);

  userService = inject(UserService);

  pagesService = inject(PagesService);

  router = inject(Router);

  showlist: boolean = false;
  // showRegisterOrLogin: boolean = false;
  showRegisterOrLogin = signal<boolean | undefined>(undefined);

  showChangeLang: boolean = false;

  switchShowList() {
    this.showlist = !this.showlist
    this.showRegisterOrLogin.set(undefined)
  }

  goToLink(url: string) {
    window.open(url, "_blank");
  };

  pdfNotAcces() {
    alert('Your mobile device cannot load the files. Please use a desktop device to access the documents')
  }

  toPdf() {
    const pdfPath = this.pagesService.docPath();
    if (pdfPath) {
      window.open(`/assets/${pdfPath}`, '_blank');
      // this.router.navigate(['/pdf-viewer']);
    } else {
      alert('No hay PDF disponible');
    }
  }

  changeTheme() {
    this.themeService.toggleDarkMode();
  }


  changeViewRegisterOrLogin() {
    this.showRegisterOrLogin.set(!this.showRegisterOrLogin());
  }

  setShowLoginAndSwitch() {
    if (this.showRegisterOrLogin()) {
      this.changeViewRegisterOrLogin();
    } else {
      this.showRegisterOrLogin.set(true);
    }
  }

  logout() {
    if (confirm('Sure to logout?')) {
      console.log('joya');
      this.authService.logout();
    } else {
      console.log('naranja');
    }
  }

  showModalInfo() {
    this.visualStatesService.showModalInfo.set(true);
    this.switchShowList();
  }

  returnMain() {
    this.router.navigate([''])
  }

  takeExam() {
    const coursePath = this.pagesService.examId();
    this.router.navigate([`/exam/${coursePath}`])
  }

  showChangeList() {
    this.showChangeLang = !this.showChangeLang
  }

}
