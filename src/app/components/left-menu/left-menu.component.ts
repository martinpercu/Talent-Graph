import { Component, inject } from '@angular/core';
import { CommonModule, KeyValuePipe } from '@angular/common';

import { PagesService } from '@services/pages.service';
import { VisualStatesService } from '@services/visual-states.service';
import { SwipeLeftCloseDirective } from '@directives/swipe-left-close.directive'; // Nueva importación

@Component({
  selector: 'app-left-menu',
  standalone: true,
  imports: [CommonModule, KeyValuePipe, SwipeLeftCloseDirective],
  templateUrl: './left-menu.component.html',
  styleUrl: './left-menu.component.css'
})
export class LeftMenuComponent {
  pagesService = inject(PagesService);
  // visualStatesService = inject(VisualStatesService);

  // bookIndex = this.pagesService.getIndexSubtext();
  // Usar la señal indexSubtext para reactividad
  bookIndex = this.pagesService.indexSubtext;
  boldKey: string | null = null;

  toggleBold(key: string, value: string) {
    this.boldKey = this.boldKey === key ? null : key;
    console.log(key);
    this.pagesService.definePages(key, value);
    console.log(this.pagesService.titleSelected());
  }

  selectAll() {
    this.pagesService.defineAll();
    console.log(this.pagesService.pagesSelected());
    this.boldKey = null;
  }


  // toggleShowLeftMenuHeader() {
  //   this.visualStatesService.togleShowLeftMenu()
  // }


}
