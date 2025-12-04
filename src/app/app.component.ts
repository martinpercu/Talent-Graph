import { Component, inject } from '@angular/core';
import { RouterOutlet } from '@angular/router';

import { AuthService } from '@services/auth.service';
// import { UserService } from '@services/user.service';

import { MatIconModule, MatIconRegistry } from '@angular/material/icon';

import { LangService } from '@services/lang.service';

@Component({
  selector: 'app-root',
  // standalone: true, // Indica que es un standalone component
  imports: [RouterOutlet, MatIconModule],
  templateUrl: './app.component.html',
  styleUrl: './app.component.css',
})
export class AppComponent {
  title = 'front-teacher';

  authService = inject(AuthService);
  langService = inject(LangService);

  constructor() {
    const matIconRegistry = inject(MatIconRegistry);
    matIconRegistry.setDefaultFontSetClass('material-symbols-rounded');
    this.langService.setLangStart()
  }

  ngOnInit(): void {
    this.authService.user$.subscribe((user) => {
      if (user) {
        // console.log(user);

        this.authService.currentUserSig.set({
          userUID: user.uid!,
          email: user.email!,
          username: user.displayName!,
        });
      } else {
        this.authService.currentUserSig.set(null);
      }
      // console.log(this.authService.currentUserSig());
      // console.log(user);
    });

    const savedTheme = localStorage.getItem('theme');
    if (savedTheme === 'dark') {
      document.documentElement.classList.add('dark');
    }
  }

}
