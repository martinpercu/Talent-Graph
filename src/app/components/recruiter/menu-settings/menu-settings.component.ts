import { Component, inject, signal } from '@angular/core';
import { MatIconModule } from '@angular/material/icon';
// import { Router } from '@angular/router';


import { LightdarkthemeService } from '@services/lightdarktheme.service';
// import { AuthService } from '@services/auth.service';
// import { UserService } from '@services/user.service';
import { ModalinfoService } from '@services/modalinfo.service';
import { VisualStatesService } from '@services/visual-states.service';
// import { PagesService } from '@services/pages.service';

// import { RegisterComponent } from '@components/auth/register/register.component';
// import { LoginComponent } from '@components/auth/login/login.component';

import { LangSwitcherComponent } from '@shared/lang-switcher/lang-switcher.component';

import { TranslocoPipe } from '@jsverse/transloco';

import { RecruiterLoginComponent } from '@components/auth/recruiter-login/recruiter-login.component';
import { RecruiterRegisterComponent } from '@components/auth/recruiter-register/recruiter-register.component';
import { RecruiterAuthService } from '@services/recruiter-auth.service';
import { RecruiterService } from '@services/recruiter.service';


@Component({
  selector: 'app-menu-settings',
  imports: [MatIconModule, LangSwitcherComponent, TranslocoPipe, RecruiterLoginComponent, RecruiterRegisterComponent],
  templateUrl: './menu-settings.component.html'
})
export class MenuSettingsComponent {

  themeService = inject(LightdarkthemeService);
  recruiterAuthService = inject(RecruiterAuthService);
  // modalinfoService = inject(ModalinfoService);
  visualStatesService = inject(VisualStatesService);

  recruiterService = inject(RecruiterService);

  expand: boolean = false;
  showRegisterOrLogin = signal<boolean | undefined>(undefined);

  showChangeLang: boolean = false;

  switchExpand() {
    this.expand = !this.expand
    this.showRegisterOrLogin.set(undefined)
  }

  goToLink(url: string) {
    window.open(url, "_blank");
  };

  pdfNotAcces() {
    alert('Your mobile device cannot load the files. Please use a desktop device to access the documents')
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
      this.recruiterAuthService.logout();
    } else {
      console.log('naranja');
    }
  }

  // showModalInfo() {
  //   this.visualStatesService.showModalInfo.set(true);
  //   this.switchShowList();
  // }


  showChangeList() {
    this.showChangeLang = !this.showChangeLang
  }

}
