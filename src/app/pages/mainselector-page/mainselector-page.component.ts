import { Component, inject } from '@angular/core';

import { environment } from '@env/environment';

import { MatIconModule } from '@angular/material/icon';
import { Router } from '@angular/router';
import { TranslocoPipe } from '@jsverse/transloco';

@Component({
  selector: 'app-mainselector-page',
  imports: [MatIconModule, TranslocoPipe],
  templateUrl: './mainselector-page.component.html',
})
export class MainselectorPageComponent {
  router = inject(Router);

  goToLink(url: string) {
    // window.open(url, "_blank");
    this.router.navigate([`/teacher/${url}`]);
  }

  goToAdmin() {
    // window.open("https://trainer-teacher.web.app/main", '_blank');
    window.open(`${environment.BASEURL}/main`, '_blank');
    // this.router.navigate(['/main']);
  }
}
