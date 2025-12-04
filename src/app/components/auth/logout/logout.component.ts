import { Component, inject } from '@angular/core';
import { AuthService } from '@services/auth.service';

@Component({
  selector: 'app-logout',
  imports: [],
  templateUrl: './logout.component.html'
})
export class LogoutComponent {

  authService = inject(AuthService);

  logout(){
    console.log('log peroddo');

    this.authService.logout();
  }

}
