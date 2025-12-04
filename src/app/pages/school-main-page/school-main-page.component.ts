import { Component } from '@angular/core';
import { CommonModule } from '@angular/common';

import { DashboardComponent } from '@components/school/dashboard/dashboard.component';

@Component({
  selector: 'app-school-main-page',
  imports: [CommonModule, DashboardComponent],
  templateUrl: './school-main-page.component.html'
})
export class SchoolMainPageComponent {

}
